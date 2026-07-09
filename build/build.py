#!/usr/bin/env python3
"""Combine raw branches + geocode cache -> compute nearest-neighbor route per city ->
   write branches.json and a self-contained index.html."""
import json, math, datetime

raw = json.load(open('branches.raw.json', encoding='utf-8'))
cache = json.load(open('geocode_cache.json', encoding='utf-8'))

def haversine(a, b):
    if None in (a.get('lat'), b.get('lat')): return None
    R=6371; toR=math.radians
    dLat=toR(b['lat']-a['lat']); dLon=toR(b['lon']-a['lon'])
    s=math.sin(dLat/2)**2 + math.cos(toR(a['lat']))*math.cos(toR(b['lat']))*math.sin(dLon/2)**2
    return 2*R*math.asin(math.sqrt(s))

def nn_order(branches):
    pts=[b for b in branches if b.get('lat') is not None]
    nogeo=[b for b in branches if b.get('lat') is None]
    if len(pts)<=1: return branches[:]
    rem=pts[:]
    # start from northernmost (max lat) so the sweep is stable & deterministic
    cur=max(range(len(rem)), key=lambda i: rem[i]['lat']); order=[rem.pop(cur)]
    while rem:
        c=order[-1]
        j=min(range(len(rem)), key=lambda i: haversine(c,rem[i]))
        order.append(rem.pop(j))
    return order + nogeo

out_cities=[]
stats={'address':0,'city':0,'none':0}
for c in raw['cities']:
    bs=[]
    for b in c['branches']:
        g=cache.get(b['id'],{})
        bb=dict(id=b['id'], name=b['name'], city=b['city'], address=b['address'],
                manager=b['manager'], mobile=b['mobile'], phone=b['phone'],
                lat=g.get('lat'), lon=g.get('lon'), acc=g.get('acc','none'))
        stats[bb['acc']]=stats.get(bb['acc'],0)+1
        bs.append(bb)
    out_cities.append(dict(city=c['city'], branches=nn_order(bs)))

out_cities.sort(key=lambda c: c['city'])
built = datetime.date.today().isoformat()
data = dict(meta=dict(source=raw['meta']['source'], total_branches=raw['meta']['total_branches'],
                      total_cities=len(out_cities), built=built), cities=out_cities)

json.dump(data, open('branches.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)

tpl=open('app.template.html',encoding='utf-8').read()
html=tpl.replace('__DATA__', json.dumps(data, ensure_ascii=False))
open('index.html','w',encoding='utf-8').write(html)

print('branches.json + index.html written')
print('geocoding accuracy:', stats)
print('cities:', len(out_cities), 'branches:', data['meta']['total_branches'])
