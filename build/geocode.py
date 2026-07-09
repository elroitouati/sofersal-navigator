#!/usr/bin/env python3
"""One-time geocoder: address+city -> lat/lon via OpenStreetMap Nominatim (no API key).
Resumable: caches every result to geocode_cache.json keyed by branch id."""
import json, os, time, urllib.parse, urllib.request, re, sys

RAW = 'branches.raw.json'
CACHE = 'geocode_cache.json'
UA = 'shufersal-navigator/1.0 (personal route planner; contact elroitouati@gmail.com)'
BASE = 'https://nominatim.openstreetmap.org/search'

cache = {}
if os.path.exists(CACHE):
    cache = json.load(open(CACHE, encoding='utf-8'))

def clean(t):
    return re.sub(r'\s+', ' ', (t or '')).strip()

def query(q):
    params = urllib.parse.urlencode({'format':'json','limit':1,'countrycodes':'il','q':q})
    req = urllib.request.Request(f'{BASE}?{params}', headers={'User-Agent':UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    return data

def geocode(address, city):
    addr = clean(address); city = clean(city)
    attempts = []
    if addr and city:
        attempts.append((f'{addr}, {city}, ישראל', 'address'))
    if city:
        attempts.append((f'{city}, ישראל', 'city'))
    for q, acc in attempts:
        try:
            data = query(q)
        except Exception as e:
            print('  ! error', e); data = []
        time.sleep(1.1)  # Nominatim: max 1 req/sec
        if data:
            return float(data[0]['lat']), float(data[0]['lon']), acc, data[0].get('display_name','')
    return None, None, 'none', ''

raw = json.load(open(RAW, encoding='utf-8'))
branches = [b for c in raw['cities'] for b in c['branches']]
print(f'Geocoding {len(branches)} branches (cached: {len(cache)})...')

done = 0
for i, b in enumerate(branches, 1):
    bid = b['id']
    if bid in cache and cache[bid].get('acc') != 'none':
        continue
    lat, lon, acc, disp = geocode(b['address'], b['city'])
    cache[bid] = {'lat':lat,'lon':lon,'acc':acc,'disp':disp}
    done += 1
    print(f'[{i}/{len(branches)}] {bid} {b["name"][:30]:30} -> {acc} {lat},{lon}')
    if done % 10 == 0:
        json.dump(cache, open(CACHE,'w',encoding='utf-8'), ensure_ascii=False, indent=1)

json.dump(cache, open(CACHE,'w',encoding='utf-8'), ensure_ascii=False, indent=1)
from collections import Counter
acc = Counter(v['acc'] for v in cache.values())
print('DONE. accuracy breakdown:', dict(acc))
