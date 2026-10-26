import test from 'node:test';
import assert from 'node:assert/strict';
import { addAlert, removeAlert, updateAlert, activeAlerts, parseStoredAlerts, MAX_ALERTS } from './alertList.ts';

const base = { hospital: 'H', bed: 'B1', bloodGroup: 'O-', bags: 2, urgency: 'code_red' as const, isActive: true };

test('addAlert appends with a unique id', () => {
  const one = addAlert([], base, 'a1', '2026-01-01T00:00:00Z');
  const two = addAlert(one.value, { ...base, hospital: 'H2' }, 'a2', '2026-01-01T00:00:00Z');
  assert.equal(two.value.length, 2);
  assert.deepEqual(two.value.map((a) => a.id), ['a1', 'a2']);
});

test('addAlert refuses past the cap', () => {
  let list = [];
  for (let i = 0; i < MAX_ALERTS; i++) list = addAlert(list, base, `a${i}`, 'now').value;
  const over = addAlert(list, base, 'extra', 'now');
  assert.equal(over.error, 'limit');
  assert.equal(over.value.length, MAX_ALERTS);
});

test('updateAlert changes only the matching alert', () => {
  const list = addAlert(addAlert([], base, 'a1', 't').value, base, 'a2', 't').value;
  const next = updateAlert(list, 'a2', { bags: 5 }, 't2');
  assert.equal(next.find((a) => a.id === 'a1').bags, 2);
  assert.equal(next.find((a) => a.id === 'a2').bags, 5);
  assert.equal(next.find((a) => a.id === 'a2').updatedAt, 't2');
});

test('removeAlert deletes by id and can empty the list', () => {
  const list = addAlert(addAlert([], base, 'a1', 't').value, base, 'a2', 't').value;
  assert.deepEqual(removeAlert(list, 'a1').map((a) => a.id), ['a2']);
  assert.deepEqual(removeAlert(removeAlert(list, 'a1'), 'a2'), []);
});

test('activeAlerts keeps only active ones', () => {
  const list = addAlert(addAlert([], base, 'a1', 't').value, { ...base, isActive: false }, 'a2', 't').value;
  assert.deepEqual(activeAlerts(list).map((a) => a.id), ['a1']);
});

test('parseStoredAlerts reads a list, migrates the old single alert, ignores junk', () => {
  assert.deepEqual(parseStoredAlerts('[]', null), []);
  const migrated = parseStoredAlerts(null, JSON.stringify({ ...base, updatedAt: 't' }));
  assert.equal(migrated.length, 1);
  assert.ok(migrated[0].id);
  assert.equal(parseStoredAlerts('not json', null), null);
  assert.equal(parseStoredAlerts(null, null), null);
  assert.equal(parseStoredAlerts('{"a":1}', null), null);
});
