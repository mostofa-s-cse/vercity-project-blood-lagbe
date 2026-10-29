import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSerialQueue } from './serialQueue.ts';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test('tasks with the same key run one after another, in the order they were added', async () => {
  const run = createSerialQueue();
  const order: string[] = [];
  const slow = run('a', async () => { await wait(30); order.push('first'); return 1; });
  const fast = run('a', async () => { order.push('second'); return 2; });
  assert.deepEqual(await Promise.all([slow, fast]), [1, 2]);
  assert.deepEqual(order, ['first', 'second']);
});

test('tasks with different keys do not wait for each other', async () => {
  const run = createSerialQueue();
  const order: string[] = [];
  const slow = run('a', async () => { await wait(30); order.push('a'); });
  const fast = run('b', async () => { order.push('b'); });
  await Promise.all([slow, fast]);
  assert.deepEqual(order, ['b', 'a']);
});

test('a task that throws does not block the next one, and its error reaches its own caller', async () => {
  const run = createSerialQueue();
  const failing = run('a', async () => { throw new Error('boom'); });
  const after = run('a', async () => 'ok');
  await assert.rejects(failing, /boom/);
  assert.equal(await after, 'ok');
});
