import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOSPITAL_PERMISSIONS, PERMISSIONS } from './permissions.ts';
import { can, canAccessPath, canManageHospital, hospitalIdOf, isSignedInClaims, permissionsOf, requiredAccess } from './roles.ts';

const claims = (app_metadata: unknown, sub = 'u1') => ({ sub, app_metadata });
const custom = (permissions: unknown[], hospital_id?: string) => claims({ permissions, hospital_id });

test('only the admin panel, Ops Command and the passport are protected', () => {
  assert.deepEqual(requiredAccess('/admin'), { level: 'admin', permission: 'panel.open' });
  assert.deepEqual(requiredAccess('/command'), { level: 'admin', permission: 'ops.command' });
  assert.deepEqual(requiredAccess('/passport'), { level: 'user' });
  for (const open of ['/', '/donors', '/sos', '/tracking', '/register', '/tracker', '/hospitals', '/deck', '/docs', '/no-access/admin', '/admin/x', '/constructor', '/__proto__']) {
    assert.equal(requiredAccess(open), null, open);
  }
});

test('permissions come from a permissions list in app_metadata', () => {
  assert.deepEqual([...permissionsOf(custom(['panel.open', 'panel.alerts']))], ['panel.open', 'panel.alerts']);
  assert.deepEqual([...permissionsOf(custom(['panel.open', 'not-real', 7]))], ['panel.open']);
  assert.deepEqual([...permissionsOf(custom([]))], []);
});

test('old tokens with only role admin or hospital still work', () => {
  assert.deepEqual([...permissionsOf(claims({ role: 'admin' }))].sort(), [...PERMISSIONS].sort());
  assert.deepEqual([...permissionsOf(claims({ role: 'hospital', hospital_id: 'ORG-01' }))].sort(), [...HOSPITAL_PERMISSIONS].sort());
});

test('an explicit permissions list wins over an old role name', () => {
  assert.deepEqual([...permissionsOf(claims({ role: 'admin', permissions: ['panel.open'] }))], ['panel.open']);
  assert.deepEqual([...permissionsOf(claims({ role: 'admin', permissions: [] }))], []);
});

test('only app_metadata counts, and junk gives no permissions', () => {
  assert.equal(permissionsOf({ sub: 'u', user_metadata: { permissions: ['panel.open'], role: 'admin' } }).size, 0);
  assert.equal(permissionsOf(claims({ role: 'ADMIN' })).size, 0);
  assert.equal(permissionsOf(claims({ role: ['admin'] })).size, 0);
  assert.equal(permissionsOf(claims({ permissions: 'panel.open' })).size, 0);
  for (const junk of [null, undefined, 'admin', 42, [], {}, { app_metadata: null }, { app_metadata: 'admin' }]) {
    assert.equal(permissionsOf(junk).size, 0, JSON.stringify(junk));
  }
});

test('can() checks one permission', () => {
  const alertOperator = custom(['panel.open', 'panel.alerts']);
  assert.equal(can(alertOperator, 'panel.alerts'), true);
  assert.equal(can(alertOperator, 'panel.fraud'), false);
  assert.equal(can(null, 'panel.open'), false);
});

test('signed in means a non-empty subject', () => {
  assert.equal(isSignedInClaims(claims({})), true);
  for (const junk of [null, undefined, {}, { sub: '' }, { sub: 7 }, 'x']) {
    assert.equal(isSignedInClaims(junk), false, JSON.stringify(junk));
  }
});

test('hospitalIdOf reads a non-empty hospital_id string', () => {
  assert.equal(hospitalIdOf(custom(['stock.own'], 'ORG-01')), 'ORG-01');
  assert.equal(hospitalIdOf(claims({ role: 'hospital', hospital_id: 'ORG-02' })), 'ORG-02');
  assert.equal(hospitalIdOf(custom(['stock.own'])), null);
  assert.equal(hospitalIdOf(claims({ hospital_id: 7 })), null);
  assert.equal(hospitalIdOf(claims({ hospital_id: '' })), null);
  assert.equal(hospitalIdOf(null), null);
});

test('stock.all manages every hospital, stock.own only the assigned one', () => {
  const all = custom(['stock.all']);
  const own = custom(['stock.own'], 'ORG-01');
  assert.equal(canManageHospital(all, 'ORG-01'), true);
  assert.equal(canManageHospital(all, 'ORG-99'), true);
  assert.equal(canManageHospital(own, 'ORG-01'), true);
  assert.equal(canManageHospital(own, 'ORG-02'), false);
  assert.equal(canManageHospital(own, ''), false);
  assert.equal(canManageHospital(custom(['stock.own']), 'ORG-01'), false);
  assert.equal(canManageHospital(custom(['panel.open']), 'ORG-01'), false);
  assert.equal(canManageHospital(claims({ role: 'admin' }), 'ORG-99'), true);
  assert.equal(canManageHospital(claims({ role: 'hospital', hospital_id: 'ORG-01' }), 'ORG-01'), true);
  assert.equal(canManageHospital(null, 'ORG-01'), false);
});

const ctx = (over: object) => ({ adminOpen: false, configured: true, claims: null as unknown, ...over });
const panel = { level: 'admin', permission: 'panel.open' } as const;
const ops = { level: 'admin', permission: 'ops.command' } as const;
const user = { level: 'user' } as const;

test('admin pages: closed by default, open with the exact permission or the demo switch', () => {
  const alertOperator = custom(['panel.open', 'panel.alerts']);
  assert.equal(canAccessPath(panel, ctx({ claims: alertOperator })), true);
  assert.equal(canAccessPath(ops, ctx({ claims: alertOperator })), false);
  assert.equal(canAccessPath(ops, ctx({ claims: custom(['ops.command']) })), true);
  assert.equal(canAccessPath(panel, ctx({ claims: custom(['ops.command']) })), false);
  assert.equal(canAccessPath(panel, ctx({ claims: null })), false);
  assert.equal(canAccessPath(panel, ctx({ claims: claims({ role: 'admin' }) })), true);
  // Without Supabase nobody can prove a permission, so it stays closed...
  assert.equal(canAccessPath(panel, ctx({ configured: false })), false);
  assert.equal(canAccessPath(panel, ctx({ configured: false, claims: claims({ role: 'admin' }) })), false);
  // ...unless the demo switch is on.
  assert.equal(canAccessPath(panel, ctx({ configured: false, adminOpen: true })), true);
  assert.equal(canAccessPath(ops, ctx({ adminOpen: true, claims: null })), true);
});

test('signed-in pages: open in demo mode, sign-in required once Supabase is set up', () => {
  assert.equal(canAccessPath(user, ctx({ configured: false })), true);
  assert.equal(canAccessPath(user, ctx({ claims: null })), false);
  assert.equal(canAccessPath(user, ctx({ claims: claims({}) })), true);
  // The admin demo switch does not open the signed-in area.
  assert.equal(canAccessPath(user, ctx({ adminOpen: true, claims: null })), false);
});
