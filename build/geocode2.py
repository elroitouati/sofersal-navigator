#!/usr/bin/env python3
"""Geocode the 434-branch list, keyed by address|city. Seeds from the old
   id-keyed cache (via the xlsx) so only new addresses hit the network.
   Resumable via geocode_cache2.json."""
import json, os, time, re, urllib.parse, urllib.request

RAW='branches.raw.json'; CACHE='geocode_cache2.json'
UA='shufersal-navigator/1.0 (personal route planner; contact elroitouati@gmail.com)'
BASE='https://nominatim.openstreetmap.org/search'

def norm(s): return re.sub(r'\s+',' ',(s or '')).strip()
def key(addr,city): return f'{norm(addr)}|{norm(city)}'

cache={}
if os.path.exists(CACHE): cache=json.load(open(CACHE,encoding='utf-8'))

# --- seed from old id-cache (build/geocode_cache.json) via xlsx id->addr,city ---
seeded=0
try:
    import openpyxl
    old=json.load(open('geocode_cache.json',encoding='utf-8'))  # id -> {lat,lon,acc}
    wb=openpyxl.load_workbook('branches.xlsx',data_only=True)
    ws=wb['ארגון מרחבים  ']
    for r in ws.iter_rows(values_only=True):
        a,snif,name,role,mgr,mob,tel,addr,city=(list(r)+[None]*9)[:9]
        if isinstance(a,(int,float)) and name:
            sid=str(int(snif)) if isinstance(snif,float) else str(snif).strip() if snif else ''
            g=old.get(sid)
            if g and g.get('acc')=='address' and addr and city:
                k=key(str(addr),str(city))
                cache.setdefault(k,{'lat':g['lat'],'lon':g['lon'],'acc':'address','seed':True})
                seeded+=1
except Exception as e:
    print('seed skipped:',e)
print('seeded from old cache:',seeded,' cache size:',len(cache))

def query(q):
    p=urllib.parse.urlencode({'format':'json','limit':1,'countrycodes':'il','q':q})
    req=urllib.request.Request(f'{BASE}?{p}',headers={'User-Agent':UA})
    with urllib.request.urlopen(req,timeout=30) as r: return json.load(r)

def geocode(addr,city):
    addr=norm(addr); city=norm(city); attempts=[]
    if addr and city: attempts.append((f'{addr}, {city}, ישראל','address'))
    if city: attempts.append((f'{city}, ישראל','city'))
    for q,acc in attempts:
        try: data=query(q)
        except Exception as e: print('  !',e); data=[]
        time.sleep(1.1)
        if data: return float(data[0]['lat']),float(data[0]['lon']),acc
    return None,None,'none'

raw=json.load(open(RAW,encoding='utf-8'))
branches=[b for c in raw['cities'] for b in c['branches']]
print(f'geocoding {len(branches)} branches...')
done=0
for i,b in enumerate(branches,1):
    k=key(b['address'],b['city'])
    if k in cache and cache[k].get('acc')!='none': continue
    lat,lon,acc=geocode(b['address'],b['city'])
    cache[k]={'lat':lat,'lon':lon,'acc':acc}
    done+=1
    print(f'[{i}/{len(branches)}] {b["id"]:>4} {b["name"][:26]:26} -> {acc}')
    if done%10==0: json.dump(cache,open(CACHE,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
json.dump(cache,open(CACHE,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
from collections import Counter
print('DONE. accuracy:',dict(Counter(v['acc'] for v in cache.values())),' new network calls done:',done)
