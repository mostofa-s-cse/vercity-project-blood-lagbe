import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashToken, newManageToken, tokenMatches } from './manageToken.ts';

test('tokens are long, unique and URL-safe', () => {
  const tokens = new Set(Array.from({ length: 200 }, () => newManageToken()));
  assert.equal(tokens.size, 200);
  for (const token of tokens) {
    assert.ok(token.length >= 32, token);
    assert.match(token, /^[A-Za-z0-9_-]+$/);
  }
});

test('the hash is stable, differs per token and does not contain the token', () => {
  const token = newManageToken();
  assert.equal(hashToken(token), hashToken(token));
  assert.notEqual(hashToken(token), hashToken(newManageToken()));
  assert.equal(hashToken(token).includes(token), false);
  assert.match(hashToken(token), /^[0-9a-f]{64}$/);
});

test('the right token matches its stored hash', () => {
  const token = newManageToken();
  assert.equal(tokenMatches(token, hashToken(token)), true);
});

test('wrong, empty and missing tokens or hashes never match', () => {
  const token = newManageToken();
  const stored = hashToken(token);
  assert.equal(tokenMatches(newManageToken(), stored), false);
  assert.equal(tokenMatches(token + 'x', stored), false);
  assert.equal(tokenMatches('', stored), false);
  assert.equal(tokenMatches(undefined, stored), false);
  assert.equal(tokenMatches(null, stored), false);
  assert.equal(tokenMatches(token, null), false);
  assert.equal(tokenMatches(token, undefined), false);
  assert.equal(tokenMatches(token, ''), false);
  assert.equal(tokenMatches(token, 'short'), false);
  // The stored hash itself is not a valid token.
  assert.equal(tokenMatches(stored, stored), false);
});
