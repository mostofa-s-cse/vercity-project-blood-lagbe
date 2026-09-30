import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forgetRequest, MAX_REMEMBERED, readMyRequests, rememberRequest, tokenFor, type StorageLike } from './myRequests.ts';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const blocked: StorageLike = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

test('starts empty', () => {
  assert.deepEqual(readMyRequests(memoryStorage()), []);
});

test('remembers a request with its token, newest first', () => {
  const storage = memoryStorage();
  rememberRequest(storage, { id: 'a', token: 'ta' });
  rememberRequest(storage, { id: 'b', token: 'tb' });
  assert.deepEqual(readMyRequests(storage), [{ id: 'b', token: 'tb' }, { id: 'a', token: 'ta' }]);
});

test('remembering the same id again keeps one entry with the new token, moved to the front', () => {
  const storage = memoryStorage();
  rememberRequest(storage, { id: 'a', token: 'old' });
  rememberRequest(storage, { id: 'b', token: 'tb' });
  rememberRequest(storage, { id: 'a', token: 'new' });
  assert.deepEqual(readMyRequests(storage), [{ id: 'a', token: 'new' }, { id: 'b', token: 'tb' }]);
});

test('finds the token of one request only', () => {
  const storage = memoryStorage();
  rememberRequest(storage, { id: 'a', token: 'ta' });
  assert.equal(tokenFor(storage, 'a'), 'ta');
  assert.equal(tokenFor(storage, 'b'), undefined);
  assert.equal(tokenFor(null, 'a'), undefined);
});

test('forgets a request', () => {
  const storage = memoryStorage();
  rememberRequest(storage, { id: 'a', token: 'ta' });
  rememberRequest(storage, { id: 'b', token: 'tb' });
  forgetRequest(storage, 'a');
  assert.deepEqual(readMyRequests(storage), [{ id: 'b', token: 'tb' }]);
});

test('keeps only the most recent requests', () => {
  const storage = memoryStorage();
  for (let i = 0; i < MAX_REMEMBERED + 5; i++) rememberRequest(storage, { id: `r${i}`, token: `t${i}` });
  const mine = readMyRequests(storage);
  assert.equal(mine.length, MAX_REMEMBERED);
  assert.equal(mine[0].id, `r${MAX_REMEMBERED + 4}`);
  assert.equal(mine.some((entry) => entry.id === 'r0'), false);
});

test('damaged stored data is ignored, not thrown on', () => {
  for (const bad of ['{not json', 'null', '"text"', '{"a":1}', '[1,2]', '[{"id":5,"token":"x"}]', '[{"id":"a"}]', '[{"id":"","token":"x"}]']) {
    assert.deepEqual(readMyRequests(memoryStorage({ 'bloodlagbe.myRequests': bad })), [], bad);
  }
  const mixed = memoryStorage({ 'bloodlagbe.myRequests': '[{"id":"a","token":"ta"},{"id":1},"x",{"id":"b","token":"tb"}]' });
  assert.deepEqual(readMyRequests(mixed), [{ id: 'a', token: 'ta' }, { id: 'b', token: 'tb' }]);
});

test('storage that is blocked or missing never throws', () => {
  assert.deepEqual(readMyRequests(blocked), []);
  assert.doesNotThrow(() => rememberRequest(blocked, { id: 'a', token: 't' }));
  assert.doesNotThrow(() => forgetRequest(blocked, 'a'));
  assert.deepEqual(readMyRequests(null), []);
  assert.doesNotThrow(() => rememberRequest(null, { id: 'a', token: 't' }));
});
