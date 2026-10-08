import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkRateLimit, clientKey } from './rateLimit.ts';

test('allows requests under the limit', () => {
  const key = `test-under-${Date.now()}`;
  const now = 1_000_000;
  for (let i = 0; i < 5; i += 1) {
    const result = checkRateLimit(key, { limit: 5, windowMs: 60_000, now });
    assert.equal(result.allowed, true, `request ${i + 1} should be allowed`);
  }
});

test('blocks requests once the limit is exceeded, within the same window', () => {
  const key = `test-over-${Date.now()}`;
  const now = 1_000_000;
  for (let i = 0; i < 5; i += 1) checkRateLimit(key, { limit: 5, windowMs: 60_000, now });
  const sixth = checkRateLimit(key, { limit: 5, windowMs: 60_000, now: now + 1000 });
  assert.equal(sixth.allowed, false);
  assert.ok(sixth.retryAfterMs > 0);
});

test('resets after the window elapses', () => {
  const key = `test-reset-${Date.now()}`;
  const now = 1_000_000;
  for (let i = 0; i < 5; i += 1) checkRateLimit(key, { limit: 5, windowMs: 60_000, now });
  const blocked = checkRateLimit(key, { limit: 5, windowMs: 60_000, now: now + 1000 });
  assert.equal(blocked.allowed, false);
  const afterWindow = checkRateLimit(key, { limit: 5, windowMs: 60_000, now: now + 60_001 });
  assert.equal(afterWindow.allowed, true);
});

test('different keys are tracked independently', () => {
  const now = 2_000_000;
  const keyA = `test-indep-a-${Date.now()}`;
  const keyB = `test-indep-b-${Date.now()}`;
  for (let i = 0; i < 5; i += 1) checkRateLimit(keyA, { limit: 5, windowMs: 60_000, now });
  const blockedA = checkRateLimit(keyA, { limit: 5, windowMs: 60_000, now });
  const allowedB = checkRateLimit(keyB, { limit: 5, windowMs: 60_000, now });
  assert.equal(blockedA.allowed, false);
  assert.equal(allowedB.allowed, true);
});

test('clientKey combines the route and the x-forwarded-for IP', () => {
  const request = new Request('https://example.com/api/sos', { headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' } });
  assert.equal(clientKey(request, 'sos'), 'sos:203.0.113.5');
});

test('clientKey falls back to a shared bucket when there is no IP header', () => {
  const request = new Request('https://example.com/api/sos');
  assert.equal(clientKey(request, 'sos'), 'sos:unknown');
});
