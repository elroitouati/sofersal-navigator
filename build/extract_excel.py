#!/usr/bin/env python3
"""Extract Shufersal branches from the 'ארגון מרחבים' sheet of the source xlsx
   into branches.raw.json (grouped by city). Run: python3 extract_excel.py <file.xlsx>"""
import openpyxl, json, re, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else 'branches.xlsx'
SHEET = 'ארגון מרחבים  '  # note: sheet name has trailing spaces in the source file

def s(x):
    if x is None: return ''
    if isinstance(x, float) and x.is_integer(): x = int(x)
    return str(x).strip()

def norm_city(c):
    c = re.sub(r'\s+', ' ', c).strip()
    if 'תל אביב' in c:
        c = c.replace(' -', '-').replace('- ', '-')
    return c

wb = openpyxl.load_workbook(SRC, data_only=True)
ws = wb[SHEET]
region = cluster = None
branches = []
for r in ws.iter_rows(values_only=True):
    a, snif, name, role, mgr, mobile, tel, addr, city = (list(r) + [None]*9)[:9]
    a_s = s(a)
    if a_s and not isinstance(a, (int, float)):            # header row (region / cluster)
        if 'מרחב' in a_s: region = a_s
        if 'אשכול' in a_s or 'אזור' in a_s: cluster = a_s
        continue
    if isinstance(a, (int, float)) and s(name):            # branch main row
        branches.append(dict(id=s(snif), name=s(name), city=norm_city(s(city)),
                             address=s(addr), manager=s(mgr), mobile=s(mobile),
                             phone=s(tel), region=region or '', cluster=cluster or ''))

from collections import defaultdict
bycity = defaultdict(list)
for b in branches: bycity[b['city']].append(b)
data = dict(meta=dict(source=SRC.split('/')[-1], sheet=SHEET.strip(),
                      total_branches=len(branches), total_cities=len(bycity)),
            cities=[dict(city=c, branches=bycity[c]) for c in sorted(bycity)])
json.dump(data, open('branches.raw.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'extracted {len(branches)} branches / {len(bycity)} cities -> branches.raw.json')
