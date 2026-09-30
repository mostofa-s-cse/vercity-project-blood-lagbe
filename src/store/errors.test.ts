import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiErrorCode, apiStatus, isDatabaseOff } from './errors.ts';

const err = (status: unknown, data?: unknown) => ({ status, data });

test('reads the status and the error code from an API error', () => {
  assert.equal(apiStatus(err(409, { error: 'already_responded' })), 409);
  assert.equal(apiErrorCode(err(409, { error: 'already_responded' })), 'already_responded');
  assert.equal(apiErrorCode(err(500, {})), undefined);
  assert.equal(apiErrorCode(err(500, 'plain text')), undefined);
  assert.equal(apiErrorCode(err(500, null)), undefined);
  assert.equal(apiErrorCode(err(500, { error: 5 })), undefined);
});

test('a network failure or junk has no status and no code', () => {
  for (const junk of [undefined, null, 'x', 7, {}, { status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' }, { status: 'PARSING_ERROR' }]) {
    assert.equal(apiStatus(junk), undefined, JSON.stringify(junk));
    assert.equal(apiErrorCode(junk), undefined, JSON.stringify(junk));
  }
});

test('"database off" means 503 with the database_not_configured code', () => {
  assert.equal(isDatabaseOff(err(503, { error: 'database_not_configured' })), true);
  assert.equal(isDatabaseOff(err(503, { error: 'load_failed' })), false);
  assert.equal(isDatabaseOff(err(503, {})), false);
  assert.equal(isDatabaseOff(err(500, { error: 'database_not_configured' })), false);
  assert.equal(isDatabaseOff(undefined), false);
  assert.equal(isDatabaseOff({ status: 'FETCH_ERROR' }), false);
});
