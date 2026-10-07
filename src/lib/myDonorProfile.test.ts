import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forgetDonor, MAX_REMEMBERED, readMyDonorProfiles, rememberDonor, tokenFor, type StorageLike } from './myDonorProfile.ts';

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
  assert.deepEqual(readMyDonorProfiles(memoryStorage()), []);
});

test('remembers a donor with its token, newest first', () => {
  const storage = memoryStorage();
  rememberDonor(storage, { id: 'a', token: 'ta' });
  rememberDonor(storage, { id: 'b', token: 'tb' });
  assert.deepEqual(readMyDonorProfiles(storage), [{ id: 'b', token: 'tb' }, { id: 'a', token: 'ta' }]);
});

test('remembering the same id again keeps one entry with the new token, moved to the front', () => {
  const storage = memoryStorage();
  rememberDonor(storage, { id: 'a', token: 'old' });
  rememberDonor(storage, { id: 'b', token: 'tb' });
  rememberDonor(storage, { id: 'a', token: 'new' });
  assert.deepEqual(readMyDonorProfiles(storage), [{ id: 'a', token: 'new' }, { id: 'b', token: 'tb' }]);
});

test('finds the token of one donor only', () => {
  const storage = memoryStorage();
  rememberDonor(storage, { id: 'a', token: 'ta' });
  assert.equal(tokenFor(storage, 'a'), 'ta');
  assert.equal(tokenFor(storage, 'b'), undefined);
  assert.equal(tokenFor(null, 'a'), undefined);
});

test('forgets a donor', () => {
  const storage = memoryStorage();
  rememberDonor(storage, { id: 'a', token: 'ta' });
  rememberDonor(storage, { id: 'b', token: 'tb' });
  forgetDonor(storage, 'a');
  assert.deepEqual(readMyDonorProfiles(storage), [{ id: 'b', token: 'tb' }]);
});

test('keeps only the most recent donors', () => {
  const storage = memoryStorage();
  for (let i = 0; i < MAX_REMEMBERED + 5; i++) rememberDonor(storage, { id: `d${i}`, token: `t${i}` });
  const mine = readMyDonorProfiles(storage);
  assert.equal(mine.length, MAX_REMEMBERED);
  assert.equal(mine[0].id, `d${MAX_REMEMBERED + 4}`);
  assert.equal(mine.some((entry) => entry.id === 'd0'), false);
});

test('damaged stored data is ignored, not thrown on', () => {
  for (const bad of ['{not json', 'null', '"text"', '{"a":1}', '[1,2]', '[{"id":5,"token":"x"}]', '[{"id":"a"}]', '[{"id":"","token":"x"}]']) {
    assert.deepEqual(readMyDonorProfiles(memoryStorage({ 'bloodlagbe.myDonorProfile': bad })), [], bad);
  }
  const mixed = memoryStorage({ 'bloodlagbe.myDonorProfile': '[{"id":"a","token":"ta"},{"id":1},"x",{"id":"b","token":"tb"}]' });
  assert.deepEqual(readMyDonorProfiles(mixed), [{ id: 'a', token: 'ta' }, { id: 'b', token: 'tb' }]);
});

test('storage that is blocked or missing never throws', () => {
  assert.deepEqual(readMyDonorProfiles(blocked), []);
  assert.doesNotThrow(() => rememberDonor(blocked, { id: 'a', token: 't' }));
  assert.doesNotThrow(() => forgetDonor(blocked, 'a'));
  assert.deepEqual(readMyDonorProfiles(null), []);
  assert.doesNotThrow(() => rememberDonor(null, { id: 'a', token: 't' }));
});
