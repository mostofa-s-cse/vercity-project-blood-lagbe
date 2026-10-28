import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTransientDbError, isReadOperation } from './dbRetry.ts';

test('isTransientDbError recognises dropped-connection errors only', () => {
  assert.equal(isTransientDbError(new Error('Connection terminated unexpectedly')), true);
  assert.equal(isTransientDbError(new Error('read ECONNRESET')), true);
  assert.equal(isTransientDbError({ message: 'Connection terminated due to connection timeout' }), true);
  assert.equal(isTransientDbError(new Error('Unique constraint failed')), false);
  assert.equal(isTransientDbError(null), false);
  assert.equal(isTransientDbError('nope'), false);
});

test('only reads are retried: a write could be applied twice', () => {
  for (const op of ['findMany', 'findFirst', 'findUnique', 'count', 'aggregate']) assert.equal(isReadOperation(op), true);
  for (const op of ['create', 'update', 'updateMany', 'delete', 'upsert', 'createMany']) assert.equal(isReadOperation(op), false);
});
