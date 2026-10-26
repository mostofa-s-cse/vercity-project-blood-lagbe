import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REOPEN_WINDOW_HOURS, REQUEST_STATUSES, canReopen, canTransition, openRequestCount, remainingSeconds } from './requestStatus.ts';

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

test('a completed request can be reopened for a limited time, so a wrong confirmation can be fixed', () => {
  const done = new Date('2026-10-15T10:00:00Z');
  const within = new Date(done.getTime() + (REOPEN_WINDOW_HOURS - 1) * 3600_000);
  const after = new Date(done.getTime() + (REOPEN_WINDOW_HOURS + 1) * 3600_000);
  assert.equal(canReopen('COMPLETED', done, within), true);
  assert.equal(canReopen('COMPLETED', done, after), false);
  assert.equal(canReopen('COMPLETED', done.toISOString(), within), true);
});

test('only a completed request with a readable date can be reopened', () => {
  const done = new Date('2026-10-15T10:00:00Z');
  for (const status of ['PENDING', 'DONOR_FOUND', 'CANCELLED', 'nope', null]) assert.equal(canReopen(status, done, done), false, String(status));
  assert.equal(canReopen('COMPLETED', null, done), false);
  assert.equal(canReopen('COMPLETED', 'not a date', done), false);
});

test('completed is still final for the normal status moves', () => {
  assert.equal(canTransition('COMPLETED', 'DONOR_FOUND'), false);
});

test('open requests are the ones still waiting or with a donor found', () => {
  assert.equal(openRequestCount({ PENDING: 0, DONOR_FOUND: 6, COMPLETED: 0, CANCELLED: 0 }), 6);
  assert.equal(openRequestCount({ PENDING: 2, DONOR_FOUND: 3, COMPLETED: 10, CANCELLED: 4 }), 5);
  assert.equal(openRequestCount({ PENDING: 0, DONOR_FOUND: 0, COMPLETED: 3, CANCELLED: 1 }), 0);
});
