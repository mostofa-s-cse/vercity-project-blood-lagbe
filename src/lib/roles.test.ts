import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAccess, isAdminClaims, isSignedInClaims, requiredLevel } from './roles.ts';

const admin = { sub: 'u1', app_metadata: { role: 'admin' } };
const member = { sub: 'u2', app_metadata: {} };

test('only admin and passport paths are protected', () => {
  assert.equal(requiredLevel('/admin'), 'admin');
  assert.equal(requiredLevel('/command'), 'admin');
  assert.equal(requiredLevel('/passport'), 'user');
  for (const open of ['/', '/donors', '/sos', '/tracking', '/register', '/tracker', '/hospitals', '/deck', '/docs', '/no-access/admin', '/admin/x', '/constructor', '/__proto__']) {
    assert.equal(requiredLevel(open), null, open);
  }
});

test('reads the admin role only from app_metadata', () => {
  assert.equal(isAdminClaims(admin), true);
  assert.equal(isAdminClaims(member), false);
  assert.equal(isAdminClaims({ sub: 'u', user_metadata: { role: 'admin' } }), false);
  assert.equal(isAdminClaims({ sub: 'u', app_metadata: { role: 'ADMIN' } }), false);
  assert.equal(isAdminClaims({ sub: 'u', app_metadata: { role: ['admin'] } }), false);
  for (const junk of [null, undefined, 'admin', 42, [], { app_metadata: null }, { app_metadata: 'admin' }]) {
    assert.equal(isAdminClaims(junk), false, JSON.stringify(junk));
  }
});

test('signed in means a non-empty subject', () => {
  assert.equal(isSignedInClaims(member), true);
  for (const junk of [null, undefined, {}, { sub: '' }, { sub: 7 }, 'x']) {
    assert.equal(isSignedInClaims(junk), false, JSON.stringify(junk));
  }
});

test('admin area: closed by default, open only for admins or the demo switch', () => {
  const ctx = (over: object) => ({ adminOpen: false, configured: true, claims: null, ...over });
  assert.equal(canAccess('admin', ctx({ claims: admin })), true);
  assert.equal(canAccess('admin', ctx({ claims: member })), false);
  assert.equal(canAccess('admin', ctx({ claims: null })), false);
  // Without Supabase nobody can prove they are an admin, so it stays closed...
  assert.equal(canAccess('admin', ctx({ configured: false })), false);
  assert.equal(canAccess('admin', ctx({ configured: false, claims: admin })), false);
  // ...unless the demo switch is on.
  assert.equal(canAccess('admin', ctx({ configured: false, adminOpen: true })), true);
  assert.equal(canAccess('admin', ctx({ adminOpen: true, claims: null })), true);
});

test('signed-in area: open in demo mode, sign-in required once Supabase is set up', () => {
  const ctx = (over: object) => ({ adminOpen: false, configured: true, claims: null, ...over });
  assert.equal(canAccess('user', ctx({ configured: false })), true);
  assert.equal(canAccess('user', ctx({ claims: null })), false);
  assert.equal(canAccess('user', ctx({ claims: member })), true);
  assert.equal(canAccess('user', ctx({ claims: admin })), true);
  // The admin demo switch does not open the signed-in area.
  assert.equal(canAccess('user', ctx({ adminOpen: true, claims: null })), false);
});
