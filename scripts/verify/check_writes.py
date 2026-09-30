#!/usr/bin/env python3
"""
Checks the WRITE APIs (create SOS, manage token, status changes, respond, races) against a running server
whose database is the throwaway Postgres container named bloodlagbe-test-pg (see docs/HANDOFF.md).
It creates its own requests and inspects the database with `docker exec bloodlagbe-test-pg psql`.
Usage: python3 scripts/verify/check_writes.py     (BASE_URL overrides http://localhost:3100)
"""
import json, subprocess, threading, urllib.request, urllib.error
import os
B=os.environ.get('BASE_URL', 'http://localhost:3100')
def call(method, path, body=None, token=None):
    data=json.dumps(body).encode() if body is not None else None
    headers={'Content-Type':'application/json'}
    if token is not None: headers['X-Manage-Token']=token
    req=urllib.request.Request(B+path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as r: return r.status, json.loads(r.read().decode() or 'null'), {k.lower():v for k,v in r.headers.items()}
    except urllib.error.HTTPError as e:
        raw=e.read().decode(); 
        try: j=json.loads(raw)
        except Exception: j=raw
        return e.code, j, {k.lower():v for k,v in e.headers.items()}
ok=True
def check(name, cond, extra=''):
    global ok; ok = ok and cond; print(('PASS ' if cond else 'FAIL ')+name+('' if cond else ' -> '+str(extra)))
def sql(q): return subprocess.run(['docker','exec','bloodlagbe-test-pg','psql','-U','postgres','-tAc',q],capture_output=True,text=True).stdout.strip()
def sos(**over):
    body={'bloodGroup':'AB+','bags':2,'place':'Habiganj Sadar Hospital','phones':['01752494315'],'postText':'Emergency blood needed','area':'Habiganj','problem':'Pregnant','isCritical':True,'language':'en','patientName':'Rahima Begum','patientAge':27,'attendantName':'Karim'}
    body.update(over); return call('POST','/api/sos',body)

# 1. create
s,j,h=sos()
check('POST /api/sos 201 with id and manageToken, no-store', s==201 and j.get('id') and len(j.get('manageToken',''))>=32 and 'no-store' in h.get('cache-control',''), (s,j))
A,TA=j['id'],j['manageToken']
stored=sql(f"select manage_token_hash from sos_requests where id='{A}'")
check('only a 64-hex hash is stored, not the token', len(stored)==64 and stored!=TA and TA not in sql(f"select row_to_json(t) from sos_requests t where id='{A}'"), stored)
row=sql(f"select patient_name, patient_age, attendant_name, status from sos_requests where id='{A}'")
check('patient fields and PENDING default saved', row=='Rahima Begum|27|Karim|PENDING', row)
check('bad patient age rejected 400', sos(patientAge=200)[0]==400)

# 2. canManage
s,j,_=call('GET',f'/api/requests/{A}', token=TA); check('detail with the token: canManage true', s==200 and j['canManage'] is True, j)
s,j,_=call('GET',f'/api/requests/{A}', token='wrong'); check('detail with a wrong token: canManage false', j['canManage'] is False)
s,j,_=call('GET',f'/api/requests/{A}'); check('detail without token: canManage false', j['canManage'] is False)

# 3. auth on PATCH
s2,j2,_=sos(); B_,TB=j2['id'],j2['manageToken']
check('PATCH without credentials -> 401', call('PATCH',f'/api/requests/{A}',{'status':'CANCELLED'})[0]==401)
check('PATCH with a wrong token -> 403', call('PATCH',f'/api/requests/{A}',{'status':'CANCELLED'},token='nope')[0]==403)
check("PATCH with another request's token -> 403", call('PATCH',f'/api/requests/{A}',{'status':'CANCELLED'},token=TB)[0]==403)
check('PATCH bad status body -> 400', call('PATCH',f'/api/requests/{A}',{'status':'DONE'},token=TA)[0]==400)
check('PATCH unknown request -> 404', call('PATCH','/api/requests/nope',{'status':'CANCELLED'},token=TA)[0]==404)
check('still PENDING after all refused attempts', sql(f"select status from sos_requests where id='{A}'")=='PENDING')

# 4. transitions
s,j,_=call('PATCH',f'/api/requests/{A}',{'status':'COMPLETED'},token=TA)
check('creator completes own request: 200 COMPLETED with completedAt', s==200 and j['request']['status']=='COMPLETED' and j['request']['completedAt'], (s,j))
check('COMPLETED -> PENDING refused 409', call('PATCH',f'/api/requests/{A}',{'status':'PENDING'},token=TA)[0]==409)
check('COMPLETED -> CANCELLED refused 409', call('PATCH',f'/api/requests/{A}',{'status':'CANCELLED'},token=TA)[0]==409)
check('PENDING -> PENDING refused 409', call('PATCH',f'/api/requests/{B_}',{'status':'PENDING'},token=TB)[0]==409)

# 5. respond
s,j,_=call('POST',f'/api/requests/{B_}/respond',{'name':'Sadia Nusrat','phone':'017-1234 5678'})
check('respond 201, phone normalised, status DONOR_FOUND', s==201 and j['status']=='DONOR_FOUND' and 'phone' not in j['response'], (s,j))
check('stored phone is normalised', sql(f"select phone from request_responses where request_id='{B_}'")=='01712345678')
check('request flipped to DONOR_FOUND', sql(f"select status from sos_requests where id='{B_}'")=='DONOR_FOUND')
check('same phone answering again -> 409 already_responded', call('POST',f'/api/requests/{B_}/respond',{'name':'Other','phone':'01712345678'})[0]==409)
check('a second, different phone is fine (201)', call('POST',f'/api/requests/{B_}/respond',{'name':'Rafiq','phone':'01812345678'})[0]==201)
check('invalid phone -> 400', call('POST',f'/api/requests/{B_}/respond',{'name':'Bad','phone':'123'})[0]==400)
check('respond to unknown request -> 404', call('POST','/api/requests/nope/respond',{'name':'Sadia','phone':'01712345678'})[0]==404)
check('respond to a COMPLETED request -> 409 request_closed', call('POST',f'/api/requests/{A}/respond',{'name':'Late','phone':'01912345678'})[0]==409)
s,j,_=call('GET',f'/api/requests/{B_}'); check('outsiders see answerers without phones', all('phone' not in r for r in j['responses']) and len(j['responses'])==2)
s,j,_=call('GET',f'/api/requests/{B_}',token=TB); check('the manager sees answerer phones', all('phone' in r for r in j['responses']), j['responses'])
check('DONOR_FOUND -> PENDING allowed (200)', call('PATCH',f'/api/requests/{B_}',{'status':'PENDING'},token=TB)[0]==200)
s,j,_=call('POST',f'/api/requests/{B_}/respond',{'name':'Third','phone':'01612345678'}); check('a pending request that already has answers moves back to DONOR_FOUND on a new answer', s==201 and sql(f"select status from sos_requests where id='{B_}'")=='DONOR_FOUND')
call('PATCH',f'/api/requests/{B_}',{'status':'CANCELLED'},token=TB)
check('respond to a CANCELLED request -> 409', call('POST',f'/api/requests/{B_}/respond',{'name':'Late','phone':'01512345678'})[0]==409)

# 6. races
s,j,_=sos(); C,TC=j['id'],j['manageToken']
res={}
def patch(status): res[status]=call('PATCH',f'/api/requests/{C}',{'status':status},token=TC)[0]
t1=threading.Thread(target=patch,args=('COMPLETED',)); t2=threading.Thread(target=patch,args=('CANCELLED',)); t1.start(); t2.start(); t1.join(); t2.join()
winners=[k for k,v in res.items() if v==200]
check('two racing status changes: exactly one wins, the other is 409', len(winners)==1 and sorted(res.values())==[200,409], res)
check('final status is the winner\'s', sql(f"select status from sos_requests where id='{C}'")==winners[0])
s,j,_=sos(); D,TD=j['id'],j['manageToken']
out=[]
def answer(): out.append(call('POST',f'/api/requests/{D}/respond',{'name':'Twin','phone':'01712300000'})[0])
ts=[threading.Thread(target=answer) for _ in range(4)]
[t.start() for t in ts]; [t.join() for t in ts]
check('four simultaneous identical answers: exactly one 201, the rest 409', sorted(out)==[201,409,409,409], out)
check('only one answer row stored', sql(f"select count(*) from request_responses where request_id='{D}'")=='1')
print('ALL PASS' if ok else 'SOME FAILED')
