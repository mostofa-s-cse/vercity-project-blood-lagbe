import assert from 'node:assert/strict';
import { test } from 'node:test';
import { turnstileTokenFromBody, verifyTurnstileToken } from './turnstile.ts';

test('resolves true without making a network call when no secret is configured', async () => {
  let called = false;
  const fetchFn = async () => {
    called = true;
    return new Response(JSON.stringify({ success: true }));
  };
  const result = await verifyTurnstileToken('some-token', { fetchFn: fetchFn as typeof fetch });
  assert.equal(result, true);
  assert.equal(called, false);
});

test('resolves false without a network call when configured but no token was sent', async () => {
  let called = false;
  const fetchFn = async () => {
    called = true;
    return new Response(JSON.stringify({ success: true }));
  };
  const result = await verifyTurnstileToken(null, { secret: 'test-secret', fetchFn: fetchFn as typeof fetch });
  assert.equal(result, false);
  assert.equal(called, false);
});

test('resolves true when Cloudflare reports success', async () => {
  const fetchFn = async () => new Response(JSON.stringify({ success: true }));
  const result = await verifyTurnstileToken('a-token', { secret: 'test-secret', fetchFn: fetchFn as typeof fetch });
  assert.equal(result, true);
});

test('resolves false when Cloudflare reports failure', async () => {
  const fetchFn = async () => new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }));
  const result = await verifyTurnstileToken('a-token', { secret: 'test-secret', fetchFn: fetchFn as typeof fetch });
  assert.equal(result, false);
});

test('resolves false, never throws, when the network call fails', async () => {
  const fetchFn = async () => {
    throw new Error('network down');
  };
  await assert.doesNotReject(async () => {
    const result = await verifyTurnstileToken('a-token', { secret: 'test-secret', fetchFn: fetchFn as typeof fetch });
    assert.equal(result, false);
  });
});

test('sends the secret and token as form-encoded fields', async () => {
  let sentBody: string | undefined;
  const fetchFn = async (_url: unknown, init?: RequestInit) => {
    sentBody = typeof init?.body === 'string' ? init.body : undefined;
    return new Response(JSON.stringify({ success: true }));
  };
  await verifyTurnstileToken('my-token', { secret: 'my-secret', fetchFn: fetchFn as typeof fetch });
  const params = new URLSearchParams(sentBody);
  assert.equal(params.get('secret'), 'my-secret');
  assert.equal(params.get('response'), 'my-token');
});

test('turnstileTokenFromBody reads a string token out of a parsed JSON body', () => {
  assert.equal(turnstileTokenFromBody({ turnstileToken: 'abc' }), 'abc');
  assert.equal(turnstileTokenFromBody({ turnstileToken: 42 }), null);
  assert.equal(turnstileTokenFromBody({}), null);
  assert.equal(turnstileTokenFromBody(null), null);
  assert.equal(turnstileTokenFromBody('not an object'), null);
});
