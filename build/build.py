#!/usr/bin/env python3
"""Combine raw branches + address-keyed geocode cache -> nearest-neighbor route
   per city -> branches.json + self-contained index.html."""
import json, math, datetime, re

raw = json.load(open('branches.raw.json', encoding='utf-8'))
cache = json.load(open('geocode_cache2.json', encoding='utf-8'))

def norm(s): return re.sub(r'\s+',' ',(s or '')).strip()
def key(addr,city): return f'{norm(addr)}|{norm(city)}'

def haversine(a, b):
    if None in (a.get('lat'), b.get('lat')): return None
    R=6371; toR=math.radians
    dLat=toR(b['lat']-a['lat']); dLon=toR(b['lon']-a['lon'])
    s=math.sin(dLat/2)**2+math.cos(toR(a['lat']))*math.cos(toR(b['lat']))*math.sin(dLon/2)**2
    return 2*R*math.asin(math.sqrt(s))

def nn_order(branches):
    pts=[b for b in branches if b.get('lat') is not None]
    nogeo=[b for b in branches if b.get('lat') is None]
    if len(pts)<=1: return branches[:]
    rem=pts[:]
    cur=max(range(len(rem)), key=lambda i: rem[i]['lat']); order=[rem.pop(cur)]
    while rem:
        c=order[-1]; j=min(range(len(rem)), key=lambda i: haversine(c,rem[i]))
        order.append(rem.pop(j))
    return order+nogeo

out_cities=[]; stats={}
for c in raw['cities']:
    bs=[]
    for b in c['branches']:
        g=cache.get(key(b['address'],b['city']),{})
        acc=g.get('acc','none')
        bs.append(dict(id=b['id'], name=b['name'], city=b['city'], type=b.get('type',''),
                       address=b['address'], manager=b['manager'], phone=b['phone'],
                       lat=g.get('lat'), lon=g.get('lon'), acc=acc))
        stats[acc]=stats.get(acc,0)+1
    out_cities.append(dict(city=c['city'], branches=nn_order(bs)))

out_cities.sort(key=lambda c: c['city'])
data=dict(meta=dict(source=raw['meta']['source'],
                    total_branches=raw['meta']['total_branches'],
                    total_cities=len(out_cities),
                    built=datetime.date.today().isoformat()),
          cities=out_cities)
json.dump(data, open('branches.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)

tpl=open('app.template.html',encoding='utf-8').read()
open('index.html','w',encoding='utf-8').write(tpl.replace('__DATA__', json.dumps(data, ensure_ascii=False)))
print('branches.json + index.html written')
print('accuracy:', stats, ' cities:', len(out_cities), ' branches:', data['meta']['total_branches'])
