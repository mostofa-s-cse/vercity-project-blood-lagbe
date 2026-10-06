import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configureStore } from '@reduxjs/toolkit';
import { createApiSlice } from './api.ts';

function setup(reply: { status?: number; body: unknown } = { body: { donors: [], total: 0, page: 1, pageSize: 20 } }) {
  const urls: string[] = [];
  const fetchFn = async (request: Request) => {
    urls.push(new URL(request.url).pathname + new URL(request.url).search);
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  };
  const slice = createApiSlice({ baseUrl: 'http://localhost/api', fetchFn: fetchFn as typeof fetch, keepUnusedDataFor: 0 });
  const store = configureStore({
    reducer: { [slice.reducerPath]: slice.reducer },
    middleware: (getDefault) => getDefault().concat(slice.middleware),
  });
  return { slice, store, urls };
}

test('getDonors builds the query string from the filters, in a fixed order', async () => {
  const { slice, store, urls } = setup();
  const sub = store.dispatch(slice.endpoints.getDonors.initiate({ page: 2, available: true, bloodGroup: 'O+', q: 'dhanmondi' }));
  await sub;
  assert.deepEqual(urls, ['/api/donors?bloodGroup=O%2B&q=dhanmondi&available=true&page=2']);
  sub.unsubscribe();
});

test('empty filters are left out, and available=false is not sent', async () => {
  const { slice, store, urls } = setup();
  // Different arguments are different cache entries, so both are fetched; both must give the plain URL.
  await store.dispatch(slice.endpoints.getDonors.initiate({ q: '', available: false }));
  await store.dispatch(slice.endpoints.getDonors.initiate({}));
  assert.deepEqual(urls, ['/api/donors', '/api/donors']);
});

test('the same query is answered from the cache', async () => {
  const { slice, store, urls } = setup({ body: { donors: [{ id: 'd1' }], total: 1, page: 1, pageSize: 20 } });
  const first = store.dispatch(slice.endpoints.getDonors.initiate({ bloodGroup: 'A+' }));
  const result = await first;
  const second = store.dispatch(slice.endpoints.getDonors.initiate({ bloodGroup: 'A+' }));
  await second;
  assert.equal(urls.length, 1);
  assert.deepEqual((result.data as { donors: unknown[] }).donors, [{ id: 'd1' }]);
  first.unsubscribe();
  second.unsubscribe();
});

test('an error answer is returned as an error, not thrown', async () => {
  const { slice, store } = setup({ status: 503, body: { error: 'database_not_configured' } });
  const result = await store.dispatch(slice.endpoints.getDonors.initiate({}));
  assert.equal(result.isError, true);
  assert.equal((result.error as { status: number }).status, 503);
});

// ---- Endpoints added in M1 -------------------------------------------------------------------------

interface Call {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
}

/** A fake server: `answer` gets each call and returns [status, json]. */
function fakeServer(answer: (call: Call) => [number, unknown], getToken?: (id: string) => string | undefined) {
  const calls: Call[] = [];
  const fetchFn = async (request: Request) => {
    const url = new URL(request.url);
    const text = await request.clone().text();
    const call: Call = {
      method: request.method,
      path: url.pathname + url.search,
      headers: Object.fromEntries(request.headers.entries()),
      body: text ? JSON.parse(text) : undefined,
    };
    calls.push(call);
    const [status, json] = answer(call);
    return new Response(JSON.stringify(json), { status, headers: { 'Content-Type': 'application/json' } });
  };
  const slice = createApiSlice({ baseUrl: 'http://localhost/api', fetchFn: fetchFn as typeof fetch, keepUnusedDataFor: 0, getToken });
  const store = configureStore({
    reducer: { [slice.reducerPath]: slice.reducer },
    middleware: (getDefault) => getDefault().concat(slice.middleware),
  });
  return { slice, store, calls };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 60));

test('getDonorContact asks for one donor, with the id escaped', async () => {
  const { slice, store, calls } = fakeServer(() => [200, { phone: '+8801712489021' }]);
  const sub = store.dispatch(slice.endpoints.getDonorContact.initiate('d 1/x'));
  const result = await sub;
  assert.equal(calls[0].path, '/api/donors/d%201%2Fx/contact');
  assert.deepEqual(result.data, { phone: '+8801712489021' });
  sub.unsubscribe();
});

test('getRequests builds its query string in a fixed order and joins ids', async () => {
  const { slice, store, calls } = fakeServer(() => [200, { requests: [], total: 0, page: 1, pageSize: 20 }]);
  const sub = store.dispatch(
    slice.endpoints.getRequests.initiate({ pageSize: 10, page: 2, mine: true, ids: ['a', 'b'], bloodGroup: 'AB-', emergency: true, status: 'PENDING' })
  );
  await sub;
  assert.equal(calls[0].path, '/api/requests?status=PENDING&emergency=true&bloodGroup=AB-&ids=a%2Cb&mine=true&page=2&pageSize=10');
  sub.unsubscribe();
  const plain = store.dispatch(slice.endpoints.getRequests.initiate());
  await plain;
  assert.equal(calls[1].path, '/api/requests');
  plain.unsubscribe();
});

test('getRequests leaves out an empty ids list', async () => {
  const { slice, store, calls } = fakeServer(() => [200, { requests: [], total: 0, page: 1, pageSize: 20 }]);
  await store.dispatch(slice.endpoints.getRequests.initiate({ ids: [] }));
  assert.equal(calls[0].path, '/api/requests');
});

test('the manage token is sent only for the request it belongs to', async () => {
  const { slice, store, calls } = fakeServer(() => [200, { request: { id: 'x' } }], (id) => (id === 'r1' ? 'secret-1' : undefined));
  await store.dispatch(slice.endpoints.updateRequestStatus.initiate({ id: 'r1', status: 'COMPLETED' }));
  await store.dispatch(slice.endpoints.updateRequestStatus.initiate({ id: 'r2', status: 'CANCELLED' }));
  assert.equal(calls[0].method, 'PATCH');
  assert.equal(calls[0].path, '/api/requests/r1');
  assert.deepEqual(calls[0].body, { status: 'COMPLETED' });
  assert.equal(calls[0].headers['x-manage-token'], 'secret-1');
  assert.equal(calls[1].headers['x-manage-token'], undefined);
});

test('an explicit token wins over the remembered one', async () => {
  const { slice, store, calls } = fakeServer(() => [200, { request: {} }], () => 'remembered');
  await store.dispatch(slice.endpoints.updateRequestStatus.initiate({ id: 'r1', status: 'COMPLETED', token: 'explicit' }));
  assert.equal(calls[0].headers['x-manage-token'], 'explicit');
});

test('getRequest also sends the remembered token, so the page knows whether the person can manage it', async () => {
  const { slice, store, calls } = fakeServer(() => [200, { request: {}, responses: [], canManage: true }], (id) => (id === 'r1' ? 'secret-1' : undefined));
  const sub = store.dispatch(slice.endpoints.getRequest.initiate('r1'));
  await sub;
  assert.equal(calls[0].path, '/api/requests/r1');
  assert.equal(calls[0].headers['x-manage-token'], 'secret-1');
  sub.unsubscribe();
});

test('responding posts name and phone and refreshes the request lists', async () => {
  const { slice, store, calls } = fakeServer((call) =>
    call.method === 'POST' ? [201, { response: { id: 'x', name: 'Sadia', createdAt: 'now' }, status: 'DONOR_FOUND' }] : [200, { requests: [], total: 0, page: 1, pageSize: 20 }]
  );
  const list = store.dispatch(slice.endpoints.getRequests.initiate());
  await list;
  assert.equal(calls.length, 1);
  await store.dispatch(slice.endpoints.respondToRequest.initiate({ id: 'r1', name: 'Sadia', phone: '01712345678' }));
  await settle();
  const post = calls.find((call) => call.method === 'POST')!;
  assert.equal(post.path, '/api/requests/r1/respond');
  assert.deepEqual(post.body, { name: 'Sadia', phone: '01712345678' });
  assert.equal(calls.filter((call) => call.method === 'GET').length, 2, 'the open list was fetched again');
  list.unsubscribe();
});

test('createSos returns the manage token and refreshes the request lists', async () => {
  const { slice, store, calls } = fakeServer((call) =>
    call.method === 'POST' ? [201, { id: 'new1', manageToken: 'tok' }] : [200, { requests: [], total: 0, page: 1, pageSize: 20 }]
  );
  const list = store.dispatch(slice.endpoints.getRequests.initiate());
  await list;
  const result = await store.dispatch(
    slice.endpoints.createSos.initiate({ bloodGroup: 'AB+', bags: 1, place: 'H', phones: ['01712345678'], isCritical: true, language: 'en', postText: 'x' })
  );
  assert.deepEqual('data' in result ? result.data : null, { id: 'new1', manageToken: 'tok' });
  await settle();
  assert.equal(calls.find((call) => call.method === 'POST')!.path, '/api/sos');
  assert.equal(calls.filter((call) => call.method === 'GET').length, 2);
  list.unsubscribe();
});

test('registering a donor refreshes the donor list but not the request lists', async () => {
  const { slice, store, calls } = fakeServer((call) =>
    call.method === 'POST' ? [201, { id: 'd9' }] : call.path.startsWith('/api/donors') ? [200, { donors: [], total: 0, page: 1, pageSize: 20 }] : [200, { requests: [], total: 0, page: 1, pageSize: 20 }]
  );
  const donors = store.dispatch(slice.endpoints.getDonors.initiate());
  const requests = store.dispatch(slice.endpoints.getRequests.initiate());
  await donors;
  await requests;
  await store.dispatch(
    slice.endpoints.registerDonor.initiate({ name: 'Tanvir', phone: '01712345678', bloodGroup: 'O+', area: 'Dhanmondi', isAvailable: true })
  );
  await settle();
  assert.equal(calls.find((call) => call.method === 'POST')!.path, '/api/donors');
  assert.equal(calls.filter((call) => call.method === 'GET' && call.path.startsWith('/api/donors')).length, 2);
  assert.equal(calls.filter((call) => call.method === 'GET' && call.path.startsWith('/api/requests')).length, 1);
  donors.unsubscribe();
  requests.unsubscribe();
});

test('resolving a fraud incident refreshes the fraud list', async () => {
  const { slice, store, calls } = fakeServer((call) =>
    call.method === 'PATCH'
      ? [200, { incident: { id: 'f1', status: 'banned' } }]
      : [200, { incidents: [{ id: 'f1', status: 'pending' }] }]
  );
  const list = store.dispatch(slice.endpoints.getFraudIncidents.initiate());
  await list;
  await store.dispatch(slice.endpoints.resolveFraudIncident.initiate({ id: 'f1', status: 'banned' }));
  await settle();
  assert.equal(calls.find((call) => call.method === 'PATCH')!.path, '/api/admin/fraud/f1');
  assert.deepEqual(calls.find((call) => call.method === 'PATCH')!.body, { status: 'banned' });
  assert.equal(calls.filter((call) => call.method === 'GET').length, 2, 'the fraud list was fetched again');
  list.unsubscribe();
});

test('admin stats and the audit log are simple reads', async () => {
  const { slice, store, calls } = fakeServer((call) =>
    call.path === '/api/admin/stats'
      ? [200, { totalDonors: 6, availableDonors: 5, requestsByStatus: { PENDING: 2, DONOR_FOUND: 1, COMPLETED: 1, CANCELLED: 0 }, responses: 3 }]
      : [200, { entries: [{ id: 'a1', action: 'stock.update', detail: 'x', actorEmail: null, createdAt: 'now' }] }]
  );
  const stats = await store.dispatch(slice.endpoints.getAdminStats.initiate());
  const logs = await store.dispatch(slice.endpoints.getAuditLog.initiate());
  assert.equal((stats.data as { totalDonors: number }).totalDonors, 6);
  assert.equal((logs.data as { entries: unknown[] }).entries.length, 1);
  assert.deepEqual(calls.map((call) => call.path).sort(), ['/api/admin/logs', '/api/admin/stats']);
});
