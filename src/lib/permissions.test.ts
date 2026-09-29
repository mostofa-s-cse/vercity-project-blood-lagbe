import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_PERMISSIONS,
  HOSPITAL_PERMISSIONS,
  PERMISSIONS,
  PERMISSION_GROUPS,
  isPermission,
  needsHospital,
  normalizePermissions,
} from './permissions.ts';

test('the catalogue has unique ids and every one belongs to exactly one group', () => {
  assert.equal(new Set(PERMISSIONS).size, PERMISSIONS.length);
  const grouped = PERMISSION_GROUPS.flatMap((group) => group.permissions);
  assert.deepEqual([...grouped].sort(), [...PERMISSIONS].sort());
});

test('recognises only real permission ids', () => {
  for (const id of PERMISSIONS) assert.equal(isPermission(id), true, id);
  for (const bad of ['admin', 'panel', 'panel.OPEN', '', 'constructor', '__proto__', null, undefined, 3, {}]) {
    assert.equal(isPermission(bad), false, String(bad));
  }
});

test('normalising drops unknown and repeated ids and puts the rest in catalogue order', () => {
  assert.deepEqual(normalizePermissions(['stock.own', 'nope', 'panel.open', 'stock.own', 7, null]), ['panel.open', 'stock.own']);
  assert.deepEqual(normalizePermissions('panel.open'), []);
  assert.deepEqual(normalizePermissions(undefined), []);
  assert.deepEqual(normalizePermissions([]), []);
});

test('any admin-panel permission or roles.manage brings panel.open with it', () => {
  assert.deepEqual(normalizePermissions(['panel.alerts']), ['panel.open', 'panel.alerts']);
  assert.deepEqual(normalizePermissions(['roles.manage']), ['panel.open', 'roles.manage']);
  assert.deepEqual(normalizePermissions(['panel.fraud', 'panel.logs']), ['panel.open', 'panel.fraud', 'panel.logs']);
  // Permissions outside the panel do not imply it.
  assert.deepEqual(normalizePermissions(['ops.command']), ['ops.command']);
  assert.deepEqual(normalizePermissions(['stock.all', 'camps.create']), ['stock.all', 'camps.create']);
});

test('a role needs a hospital when it can change only its own hospital', () => {
  assert.equal(needsHospital(['stock.own', 'stock.all']), false);
  assert.equal(needsHospital(['stock.own']), true);
  assert.equal(needsHospital(['stock.own', 'camps.create']), true);
  assert.equal(needsHospital(['stock.all']), false);
  assert.equal(needsHospital(['panel.open']), false);
  assert.equal(needsHospital([]), false);
});

test('the built-in presets are what the names promise', () => {
  assert.deepEqual([...ADMIN_PERMISSIONS], [...PERMISSIONS]);
  assert.deepEqual([...HOSPITAL_PERMISSIONS], ['stock.own', 'camps.create']);
  assert.equal(needsHospital(HOSPITAL_PERMISSIONS), true);
  assert.equal(needsHospital(ADMIN_PERMISSIONS), false);
});
