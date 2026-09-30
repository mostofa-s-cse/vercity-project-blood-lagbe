#!/usr/bin/env python3
"""
Checks the READ APIs (donors, requests) against a running server with a freshly SEEDED database:
6 donors, 4 requests, 3 responses (npm run db:seed). Run after the write checks only on a fresh seed,
because the write checks add rows. Usage: start the app (npm run start, DATABASE_URL set), then
  python3 scripts/verify/check_reads.py
Set BASE_URL to change http://localhost:3100.
"""
import json, urllib.request, urllib.error
import os
B=os.environ.get('BASE_URL', 'http://localhost:3100')
def get(path, headers=None):
    req=urllib.request.Request(B+path, headers=headers or {})
    try:
        with urllib.request.urlopen(req) as r: return r.status, r.read().decode(), {k.lower(): v for k, v in r.headers.items()}
    except urllib.error.HTTPError as e: return e.code, e.read().decode(), {k.lower(): v for k, v in e.headers.items()}
ok=True
def check(name, cond, extra=''):
    global ok; ok = ok and cond; print(('PASS ' if cond else 'FAIL ')+name+(' '+str(extra) if not cond else ''))

s,t,_=get('/api/donors'); d=json.loads(t)
check('donors list 200, total 6', s==200 and d['total']==6 and len(d['donors'])==6, (s,d.get('total')))
check('no full donor phone anywhere in the list response', not any(x in t for x in ['1712489021','1819330192','1711209482','1914772901']), t[:200])
check('phones are masked', all('••••' in x['phoneMasked'] for x in d['donors']))
check('available donors first', [x['isAvailable'] for x in d['donors']]==sorted([x['isAvailable'] for x in d['donors']], reverse=True))
check('no raw phone / email / weight fields', all(set(x)=={'id','name','bloodGroup','area','division','age','gender','isAvailable','lastDonationMonths','vehicle','nearestHospital','phoneMasked','createdAt'} for x in d['donors']), set(d['donors'][0]))
first=d['donors'][0]['id']
s,t,_=get('/api/donors?bloodGroup=O%2B'); d2=json.loads(t)
check('filter bloodGroup=O+', s==200 and d2['total']>=1 and all(x['bloodGroup']=='O+' for x in d2['donors']))
s,t,_=get('/api/donors?available=true'); d3=json.loads(t)
check('filter available=true', all(x['isAvailable'] for x in d3['donors']))
s,t,_=get('/api/donors?q=dhanmondi'); d4=json.loads(t)
check('text search in name/area/division', s==200 and all(('dhanmondi' in (x['area']+x['name']+(x['division'] or '')).lower()) for x in d4['donors']) and d4['total']>=1, d4['total'])
s,t,_=get('/api/donors?pageSize=2&page=2'); d5=json.loads(t)
check('paging: page 2 of size 2', len(d5['donors'])==2 and d5['page']==2 and d5['pageSize']==2 and d5['total']==6 and d5['donors'][0]['id']!=d['donors'][0]['id'])
check('paging pages do not overlap', {x['id'] for x in json.loads(get('/api/donors?pageSize=3&page=1')[1])['donors']}.isdisjoint({x['id'] for x in json.loads(get('/api/donors?pageSize=3&page=2')[1])['donors']}))
check('unknown blood group 400', get('/api/donors?bloodGroup=Z%2B')[0]==400)
s,t,h=get(f'/api/donors/{first}/contact'); c=json.loads(t)
check('contact gives the full number, no-store', s==200 and c['phone'].startswith('+880') and 'no-store' in h.get('cache-control',''), (s,t,h.get('cache-control')))
check('contact for unknown donor 404', get('/api/donors/nope/contact')[0]==404)

s,t,_=get('/api/requests'); r=json.loads(t)
check('requests list 200, total 4', s==200 and r['total']==4 and len(r['requests'])==4, (s,r.get('total')))
order=[x['status'] for x in r['requests']]
check('open first: PENDING before DONOR_FOUND', order==sorted(order, key=lambda v:['PENDING','DONOR_FOUND','COMPLETED','CANCELLED'].index(v)), order)
check('bagsPledged equals response count', all(x['bagsPledged']==x['responseCount'] for x in r['requests']) and sum(x['responseCount'] for x in r['requests'])==3)
check('request phones are public (by design)', all(len(x['phones'])>=1 for x in r['requests']))
s,t,_=get('/api/requests?status=DONOR_FOUND'); r2=json.loads(t)
check('filter status', r2['total']==2 and all(x['status']=='DONOR_FOUND' for x in r2['requests']))
s,t,_=get('/api/requests?emergency=true'); r3=json.loads(t)
check('filter emergency', all(x['isCritical'] for x in r3['requests']))
ids=[x['id'] for x in r['requests'][:2]]
s,t,_=get('/api/requests?ids='+','.join(ids)+',nope'); r4=json.loads(t)
check('filter by ids', s==200 and {x['id'] for x in r4['requests']}==set(ids))
check('mine=1 needs sign-in (401)', get('/api/requests?mine=1')[0]==401)
check('unknown status 400', get('/api/requests?status=DONE')[0]==400)
check('unknown blood group 400', get('/api/requests?bloodGroup=Q')[0]==400)
answered=[x for x in r['requests'] if x['responseCount']>0][0]
s,t,h=get('/api/requests/'+answered['id']); one=json.loads(t)
check('detail 200, no-store, canManage false', s==200 and one['canManage'] is False and 'no-store' in h.get('cache-control',''))
check('answerers listed without phones for outsiders', len(one['responses'])==answered['responseCount'] and all('phone' not in x for x in one['responses']), one['responses'])
check('detail of unknown request 404', get('/api/requests/nope')[0]==404)
print('ALL PASS' if ok else 'SOME FAILED')
