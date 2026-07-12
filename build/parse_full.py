#!/usr/bin/env python3
"""Parse branches_full.txt (region -> city(count) -> numbered branch lines) into
   branches.raw.json, validating per-city counts and sequential numbering."""
import re, json
from collections import defaultdict

REGION_RE = re.compile(r'^##\s+(\S+)')
CITY_RE   = re.compile(r'^\*\*(.+?)\s*\((\d+)\)\*\*\s*$')
BR_RE     = re.compile(
    r"^(\d+)\.\s*(.+?)\s*\|\s*סוג:\s*(.*?)\s*\|\s*מס'\s*סניף:\s*(.*?)\s*\|\s*"
    r"כתובת:\s*(.*?)\s*\|\s*מנהל:\s*(.*?)\s*\|\s*טלפון:\s*(.*?)\s*$")

def clean_phone(t):
    t = (t or '').strip()
    if t in ('—', '-', 'זכיין', '') or t.endswith('-'):
        # strip trailing dangling prefix like "08-"
        if t.endswith('-') and len(t) > 3:
            return t  # keep partial? better drop incomplete
        return ''
    return t

def clean_mgr(m):
    m = (m or '').strip()
    return '' if m in ('—', '-') else m

region = None
cities_order = []
city_expected = {}
by_city = defaultdict(list)
seq = 0
errors = []
lines = open('branches_full.txt', encoding='utf-8').read().splitlines()
for ln in lines:
    ln = ln.rstrip()
    if not ln.strip():
        continue
    m = REGION_RE.match(ln)
    if m:
        region = m.group(1)
        continue
    m = CITY_RE.match(ln)
    if m:
        cur_city = m.group(1).strip()
        city_expected[cur_city] = int(m.group(2))
        if cur_city not in cities_order:
            cities_order.append(cur_city)
        continue
    m = BR_RE.match(ln)
    if m:
        seq += 1
        n = int(m.group(1))
        if n != seq:
            errors.append(f'seq mismatch: expected {seq} got {n} ({m.group(2)})')
        by_city[cur_city].append(dict(
            id=m.group(4).strip(), name=m.group(2).strip(),
            city=cur_city, type=m.group(3).strip(),
            address=m.group(5).strip(), manager=clean_mgr(m.group(6)),
            phone=clean_phone(m.group(7)), region=region or ''))
        continue
    errors.append(f'UNPARSED LINE: {ln!r}')

# validate per-city counts
total = sum(len(v) for v in by_city.values())
count_errs = []
for c in cities_order:
    got = len(by_city[c]); exp = city_expected[c]
    if got != exp:
        count_errs.append(f'{c}: expected {exp} got {got}')

print(f'TOTAL parsed: {total}')
print(f'cities: {len(cities_order)}')
print(f'seq/parse errors: {len(errors)}')
for e in errors[:20]: print('  ', e)
print(f'city-count mismatches: {len(count_errs)}')
for e in count_errs: print('  ', e)

# duplicate branch ids
allids = [b['id'] for v in by_city.values() for b in v]
from collections import Counter
dups = {k:n for k,n in Counter(allids).items() if n>1}
print(f'duplicate ids: {len(dups)} -> {dups}')

if not errors and not count_errs:
    data = dict(
        meta=dict(source='רשימת סניפי שופרסל', total_branches=total,
                  total_cities=len(cities_order)),
        cities=[dict(city=c, branches=by_city[c]) for c in sorted(cities_order)])
    json.dump(data, open('branches.raw.json','w',encoding='utf-8'),
              ensure_ascii=False, indent=2)
    print('\nOK -> branches.raw.json written')
else:
    print('\n!! NOT written — fix errors first')
