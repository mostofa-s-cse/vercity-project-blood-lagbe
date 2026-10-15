import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageCount, pageItems, pageRange, pageSlice } from './pagination.ts';

test('pageCount rounds up and is at least 1', () => {
  assert.equal(pageCount(0, 10), 1);
  assert.equal(pageCount(10, 10), 1);
  assert.equal(pageCount(11, 10), 2);
  assert.equal(pageCount(95, 10), 10);
  assert.equal(pageCount(5, 0), 1);
});

test('pageItems shows every page when there are few', () => {
  assert.deepEqual(pageItems(1, 1), [1]);
  assert.deepEqual(pageItems(3, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(pageItems(4, 7), [1, 2, 3, 4, 5, 6, 7]);
});

test('pageItems keeps the first, last and the pages around the current one, with gaps as "gap"', () => {
  assert.deepEqual(pageItems(1, 10), [1, 2, 'gap', 10]);
  assert.deepEqual(pageItems(5, 10), [1, 'gap', 4, 5, 6, 'gap', 10]);
  assert.deepEqual(pageItems(10, 10), [1, 'gap', 9, 10]);
  assert.deepEqual(pageItems(3, 10), [1, 2, 3, 4, 'gap', 10]);
  assert.deepEqual(pageItems(8, 10), [1, 'gap', 7, 8, 9, 10]);
});

test('pageItems clamps a current page that is out of range', () => {
  assert.deepEqual(pageItems(99, 3), [1, 2, 3]);
  assert.deepEqual(pageItems(0, 3), [1, 2, 3]);
});

test('pageRange is the 1-based first and last item shown', () => {
  assert.deepEqual(pageRange(1, 10, 25), { from: 1, to: 10 });
  assert.deepEqual(pageRange(3, 10, 25), { from: 21, to: 25 });
  assert.deepEqual(pageRange(1, 10, 0), { from: 0, to: 0 });
});

test('pageSlice takes one page of a list', () => {
  const list = [1, 2, 3, 4, 5, 6, 7];
  assert.deepEqual(pageSlice(list, 1, 3), [1, 2, 3]);
  assert.deepEqual(pageSlice(list, 3, 3), [7]);
  assert.deepEqual(pageSlice(list, 9, 3), []);
});
