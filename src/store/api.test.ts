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
