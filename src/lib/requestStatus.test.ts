import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REQUEST_STATUSES, canTransition, remainingSeconds } from './requestStatus.ts';

test('the four statuses, in life order', () => {
  assert.deepEqual([...REQUEST_STATUSES], ['PENDING', 'DONOR_FOUND', 'COMPLETED', 'CANCELLED']);
});

test('every allowed move', () => {
  const allowed: Array<[string, string]> = [
    ['PENDING', 'DONOR_FOUND'],
    ['PENDING', 'COMPLETED'],
    ['PENDING', 'CANCELLED'],
    ['DONOR_FOUND', 'PENDING'],
    ['DONOR_FOUND', 'COMPLETED'],
    ['DONOR_FOUND', 'CANCELLED'],
  ];
  for (const [from, to] of allowed) assert.equal(canTransition(from, to), true, `${from} to ${to}`);
});

test('every refused move, including staying put and leaving a final status', () => {
  const refused: Array<[string, string]> = [
    ['PENDING', 'PENDING'],
    ['DONOR_FOUND', 'DONOR_FOUND'],
    ['COMPLETED', 'PENDING'],
    ['COMPLETED', 'DONOR_FOUND'],
    ['COMPLETED', 'CANCELLED'],
    ['COMPLETED', 'COMPLETED'],
    ['CANCELLED', 'PENDING'],
    ['CANCELLED', 'DONOR_FOUND'],
    ['CANCELLED', 'COMPLETED'],
    ['CANCELLED', 'CANCELLED'],
  ];
  for (const [from, to] of refused) assert.equal(canTransition(from, to), false, `${from} to ${to}`);
});

test('unknown or odd values are refused, never thrown on', () => {
  for (const [from, to] of [['PENDING', 'DONE'], ['NOPE', 'PENDING'], ['', ''], ['constructor', 'PENDING'], ['PENDING', '__proto__'], [undefined, 'PENDING'], ['PENDING', null]] as Array<[unknown, unknown]>) {
    assert.equal(canTransition(from as string, to as string), false, `${String(from)} to ${String(to)}`);
  }
});

const T0 = new Date('2026-01-01T00:00:00Z');
const after = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

test('a critical request has one hour, any other four', () => {
  assert.equal(remainingSeconds(T0, true, T0), 3600);
  assert.equal(remainingSeconds(T0, false, T0), 4 * 3600);
});

test('time left counts down and never goes below zero', () => {
  assert.equal(remainingSeconds(T0, true, after(30)), 1800);
  assert.equal(remainingSeconds(T0, true, after(60)), 0);
  assert.equal(remainingSeconds(T0, true, after(600)), 0);
  assert.equal(remainingSeconds(T0, false, after(60)), 3 * 3600);
});

test('a clock before the request was made does not give more than the full window', () => {
  assert.equal(remainingSeconds(after(10), true, T0), 3600);
});

test('works with ISO strings and rounds down to whole seconds', () => {
  assert.equal(remainingSeconds('2026-01-01T00:00:00.000Z', true, new Date(T0.getTime() + 1500)), 3598);
  assert.equal(remainingSeconds('not a date', true, T0), 0);
});
