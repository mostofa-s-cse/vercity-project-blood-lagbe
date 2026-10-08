import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isSameOrigin } from './originCheck.ts';

test('allows a request whose Origin matches its own URL', () => {
  const request = new Request('https://bloodlagbe.example/api/sos', { headers: { Origin: 'https://bloodlagbe.example' } });
  assert.equal(isSameOrigin(request), true);
});

test('blocks a request whose Origin is a different site', () => {
  const request = new Request('https://bloodlagbe.example/api/sos', { headers: { Origin: 'https://evil.example' } });
  assert.equal(isSameOrigin(request), false);
});

test('allows a request with no Origin header at all (curl, server-to-server, this app\'s own scripts)', () => {
  const request = new Request('https://bloodlagbe.example/api/sos');
  assert.equal(isSameOrigin(request), true);
});

test('is scheme/host/port sensitive, not just hostname', () => {
  const httpOrigin = new Request('https://bloodlagbe.example/api/sos', { headers: { Origin: 'http://bloodlagbe.example' } });
  assert.equal(isSameOrigin(httpOrigin), false);
  const otherPort = new Request('https://bloodlagbe.example/api/sos', { headers: { Origin: 'https://bloodlagbe.example:8443' } });
  assert.equal(isSameOrigin(otherPort), false);
});
