import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_PERMISSIONS, HOSPITAL_PERMISSIONS, type Permission } from './permissions.ts';
import {
  appMetadataFor,
  createGrantService,
  GrantError,
  type AppMetadataPatch,
  type AuthAdmin,
  type GrantRecord,
  type GrantStore,
  type RoleRecord,
} from './grantService.ts';

const NOW = new Date('2026-01-01T00:00:00Z');
const CLEARED: AppMetadataPatch = { role: null, role_id: null, role_name: null, permissions: null, hospital_id: null };

const ADMIN: RoleRecord = { id: 'r-admin', name: 'Admin', description: null, permissions: [...ADMIN_PERMISSIONS], isSystem: true, systemKey: 'admin', createdAt: NOW };
const HOSPITAL: RoleRecord = { id: 'r-hospital', name: 'Hospital staff', description: null, permissions: [...HOSPITAL_PERMISSIONS], isSystem: true, systemKey: 'hospital', createdAt: NOW };
const ALERTS: RoleRecord = { id: 'r-alerts', name: 'Alert operator', description: 'Runs alerts', permissions: ['panel.open', 'panel.alerts'], isSystem: false, systemKey: null, createdAt: NOW };
const BANK: RoleRecord = { id: 'r-bank', name: 'Blood bank manager', description: null, permissions: ['stock.all', 'camps.create'], isSystem: false, systemKey: null, createdAt: NOW };

function fakes(opts: { profiles?: Record<string, string>; withAuth?: boolean; bootstrap?: string[] } = {}) {
  const roles = new Map<string, RoleRecord>([ADMIN, HOSPITAL, ALERTS, BANK].map((r) => [r.id, { ...r }]));
  const rows = new Map<string, GrantRecord>();
  const profiles = opts.profiles ?? {}; // email -> user id
  const metaCalls: Array<{ userId: string; meta: AppMetadataPatch }> = [];
  let seq = 0;

  const store: GrantStore = {
    async listRoles() {
      return [...roles.values()].map((r) => ({ ...r, grantCount: [...rows.values()].filter((g) => g.roleId === r.id).length }));
    },
    async findRole(id) {
      return roles.get(id) ?? null;
    },
    async findRoleByName(name) {
      return [...roles.values()].find((r) => r.name.toLowerCase() === name.toLowerCase()) ?? null;
    },
    async findRoleBySystemKey(key) {
      return [...roles.values()].find((r) => r.systemKey === key) ?? null;
    },
    async createRole(r) {
      const record: RoleRecord = { id: `r${++seq}`, ...r, isSystem: false, systemKey: null, createdAt: NOW };
      roles.set(record.id, record);
      return record;
    },
    async updateRole(id, patch) {
      const next = { ...roles.get(id)!, ...patch };
      roles.set(id, next);
      return next;
    },
    async deleteRole(id) {
      roles.delete(id);
    },
    async upsertByEmail(g) {
      const existing = [...rows.values()].find((r) => r.email === g.email);
      const record: GrantRecord = existing
        ? { ...existing, roleId: g.roleId, hospitalId: g.hospitalId, grantedBy: g.grantedBy, appliedAt: null }
        : { id: `g${++seq}`, ...g, createdAt: NOW, appliedAt: null };
      rows.set(record.id, record);
      return record;
    },
    async findByEmail(email) {
      return [...rows.values()].find((r) => r.email === email) ?? null;
    },
    async findById(id) {
      return rows.get(id) ?? null;
    },
    async listByRole(roleId) {
      return [...rows.values()].filter((r) => r.roleId === roleId);
    },
    async markApplied(id, at) {
      const row = rows.get(id);
      if (row) rows.set(id, { ...row, appliedAt: at });
    },
    async remove(id) {
      rows.delete(id);
    },
    async list() {
      return [...rows.values()];
    },
    async findProfileIdByEmail(email) {
      return profiles[email] ?? null;
    },
  };
  const auth: AuthAdmin | null =
    opts.withAuth === false
      ? null
      : {
          async setAppMetadata(userId, meta) {
            metaCalls.push({ userId, meta });
          },
        };
  const service = createGrantService({ store, auth, bootstrapAdminEmails: opts.bootstrap ?? [], now: () => NOW });
  return { service, store, rows, roles, metaCalls };
}

const actor = { email: 'boss@example.com' };
const staff = { email: 'staff@dmch.gov.bd', roleId: 'r-hospital', hospitalId: 'ORG-01' };

test('appMetadataFor copies the role into login data and keeps the old role name for built-in roles', () => {
  assert.deepEqual(appMetadataFor(HOSPITAL, 'ORG-01'), { role: 'hospital', role_id: 'r-hospital', role_name: 'Hospital staff', permissions: ['stock.own', 'camps.create'], hospital_id: 'ORG-01' });
  assert.deepEqual(appMetadataFor(ADMIN, 'ORG-01'), { role: 'admin', role_id: 'r-admin', role_name: 'Admin', permissions: [...ADMIN_PERMISSIONS], hospital_id: null });
  assert.deepEqual(appMetadataFor(ALERTS, null), { role: null, role_id: 'r-alerts', role_name: 'Alert operator', permissions: ['panel.open', 'panel.alerts'], hospital_id: null });
  // A hospital only matters for a role tied to one hospital.
  assert.equal(appMetadataFor(BANK, 'ORG-01').hospital_id, null);
});

test('granting to someone who already signed in applies the role right away', async () => {
  const { service, metaCalls, rows } = fakes({ profiles: { 'staff@dmch.gov.bd': 'user-1' } });
  const result = await service.grant(staff, actor);
  assert.equal(result.status, 'active');
  assert.deepEqual(metaCalls, [{ userId: 'user-1', meta: appMetadataFor(HOSPITAL, 'ORG-01') }]);
  assert.deepEqual(rows.get(result.grant.id)?.appliedAt, NOW);
  assert.equal(result.grant.grantedBy, 'boss@example.com');
});

test('a custom role is copied with its permissions and no old role name', async () => {
  const { service, metaCalls } = fakes({ profiles: { 'a@b.co': 'user-2' } });
  await service.grant({ email: 'a@b.co', roleId: 'r-alerts', hospitalId: null }, actor);
  assert.deepEqual(metaCalls[0].meta, appMetadataFor(ALERTS, null));
});

test('granting to someone who never signed in stays pending', async () => {
  const { service, metaCalls } = fakes();
  const result = await service.grant(staff, actor);
  assert.equal(result.status, 'pending');
  assert.equal(metaCalls.length, 0);
  assert.equal(result.grant.appliedAt, null);
});

test('granting again changes the role and applies it again', async () => {
  const { service, metaCalls, rows } = fakes({ profiles: { 'staff@dmch.gov.bd': 'user-1' } });
  await service.grant(staff, actor);
  await service.grant({ ...staff, roleId: 'r-alerts', hospitalId: null }, actor);
  assert.equal(rows.size, 1);
  assert.deepEqual(metaCalls[1].meta, appMetadataFor(ALERTS, null));
});

test('a role tied to one hospital needs a hospital; other roles do not', async () => {
  const { service, rows } = fakes();
  await assert.rejects(() => service.grant({ ...staff, hospitalId: null }, actor), (e) => e instanceof GrantError && e.code === 'hospital_required');
  assert.equal(rows.size, 0);
  await service.grant({ email: 'x@y.co', roleId: 'r-bank', hospitalId: null }, actor);
  assert.equal(rows.size, 1);
});

test('granting an unknown role is refused', async () => {
  const { service, rows } = fakes();
  await assert.rejects(() => service.grant({ ...staff, roleId: 'nope' }, actor), (e) => e instanceof GrantError && e.code === 'role_not_found');
  assert.equal(rows.size, 0);
});

test('granting needs the service key and writes nothing without it', async () => {
  const { service, rows } = fakes({ withAuth: false });
  await assert.rejects(() => service.grant(staff, actor), (e) => e instanceof GrantError && e.code === 'service_key_missing');
  assert.equal(rows.size, 0);
});

const user = (over: object = {}) => ({ id: 'user-1', email: 'staff@dmch.gov.bd', emailConfirmed: true, appMetadata: {}, ...over });

test('a pending grant is applied when the person signs in', async () => {
  const { service, metaCalls, rows } = fakes();
  const { grant } = await service.grant(staff, actor);
  assert.equal(await service.applyOnSignIn(user()), true);
  assert.deepEqual(metaCalls, [{ userId: 'user-1', meta: appMetadataFor(HOSPITAL, 'ORG-01') }]);
  assert.deepEqual(rows.get(grant.id)?.appliedAt, NOW);
});

test('sign-in matches the email ignoring case', async () => {
  const { service, metaCalls } = fakes();
  await service.grant(staff, actor);
  await service.applyOnSignIn(user({ email: 'Staff@DMCH.gov.bd' }));
  assert.equal(metaCalls.length, 1);
});

test('sign-in does nothing for an unconfirmed email or no grant', async () => {
  const { service, metaCalls } = fakes();
  await service.grant(staff, actor);
  assert.equal(await service.applyOnSignIn(user({ emailConfirmed: false })), false);
  assert.equal(await service.applyOnSignIn(user({ email: 'other@x.co' })), false);
  assert.equal(await service.applyOnSignIn(user({ email: null })), false);
  assert.equal(metaCalls.length, 0);
});

test('sign-in skips the call when the login data already matches, but records it as applied', async () => {
  const { service, metaCalls, rows } = fakes();
  const { grant } = await service.grant(staff, actor);
  assert.equal(await service.applyOnSignIn(user({ appMetadata: { ...appMetadataFor(HOSPITAL, 'ORG-01') } })), false);
  assert.equal(metaCalls.length, 0);
  assert.deepEqual(rows.get(grant.id)?.appliedAt, NOW);
});

test('sign-in refreshes login data that is out of date (the role changed)', async () => {
  const { service, metaCalls } = fakes();
  await service.grant({ ...staff, roleId: 'r-alerts', hospitalId: null }, actor);
  const stale = { ...appMetadataFor(ALERTS, null), permissions: ['panel.open'] };
  assert.equal(await service.applyOnSignIn(user({ appMetadata: stale })), true);
  assert.deepEqual(metaCalls[0].meta.permissions, ['panel.open', 'panel.alerts']);
});

test('bootstrap admin emails become admins at first sign-in, ignoring case', async () => {
  const { service, metaCalls, rows } = fakes({ bootstrap: ['owner@example.com'] });
  await service.applyOnSignIn(user({ id: 'user-9', email: 'Owner@Example.com' }));
  assert.deepEqual(metaCalls, [{ userId: 'user-9', meta: appMetadataFor(ADMIN, null) }]);
  assert.equal([...rows.values()][0].roleId, 'r-admin');
  await service.applyOnSignIn(user({ id: 'user-8', email: 'stranger@example.com' }));
  assert.equal(metaCalls.length, 1);
});

test('the bootstrap list wins over a stored grant, so the owner can never be locked out', async () => {
  const { service, metaCalls } = fakes({ bootstrap: ['staff@dmch.gov.bd'], profiles: { 'staff@dmch.gov.bd': 'user-1' } });
  await service.grant(staff, actor);
  metaCalls.length = 0;
  await service.applyOnSignIn(user());
  assert.deepEqual(metaCalls[0].meta, appMetadataFor(ADMIN, null));
});

test('sign-in without the service key is a quiet no-op', async () => {
  const { service } = fakes({ withAuth: false, bootstrap: ['owner@example.com'] });
  assert.equal(await service.applyOnSignIn(user({ email: 'owner@example.com' })), false);
});

test('revoking clears every role field in the login data and removes the grant', async () => {
  const { service, metaCalls, rows } = fakes({ profiles: { 'staff@dmch.gov.bd': 'user-1' } });
  const { grant } = await service.grant(staff, actor);
  metaCalls.length = 0;
  await service.revoke(grant.id, actor);
  assert.deepEqual(metaCalls, [{ userId: 'user-1', meta: CLEARED }]);
  assert.equal(rows.size, 0);
});

test('revoking a pending grant only removes it', async () => {
  const { service, metaCalls, rows } = fakes();
  const { grant } = await service.grant(staff, actor);
  await service.revoke(grant.id, actor);
  assert.equal(metaCalls.length, 0);
  assert.equal(rows.size, 0);
});

test('nobody can revoke their own grant, and unknown ids are reported', async () => {
  const { service, rows } = fakes({ profiles: { 'boss@example.com': 'user-b' } });
  const { grant } = await service.grant({ email: 'boss@example.com', roleId: 'r-admin', hospitalId: null }, actor);
  await assert.rejects(() => service.revoke(grant.id, { email: 'BOSS@example.com' }), (e) => e instanceof GrantError && e.code === 'cannot_revoke_self');
  assert.equal(rows.size, 1);
  await assert.rejects(() => service.revoke('nope', actor), (e) => e instanceof GrantError && e.code === 'not_found');
});

test('revoking an applied grant needs the service key and changes nothing without it', async () => {
  const { service, store, rows } = fakes({ profiles: { 'staff@dmch.gov.bd': 'user-1' } });
  const { grant } = await service.grant(staff, actor);
  const noKey = createGrantService({ store, auth: null, bootstrapAdminEmails: [], now: () => NOW });
  await assert.rejects(() => noKey.revoke(grant.id, actor), (e) => e instanceof GrantError && e.code === 'service_key_missing');
  assert.equal(rows.size, 1);
});

test('list returns every grant', async () => {
  const { service } = fakes();
  await service.grant(staff, actor);
  await service.grant({ email: 'a@b.co', roleId: 'r-admin', hospitalId: null }, actor);
  assert.equal((await service.list()).length, 2);
});

test('createRole stores a new role with clean permissions and a trimmed name', async () => {
  const { service } = fakes();
  const role = await service.createRole({ name: '  Fraud reviewer ', description: ' checks reports ', permissions: ['panel.fraud', 'nope' as Permission] });
  assert.equal(role.name, 'Fraud reviewer');
  assert.equal(role.description, 'checks reports');
  assert.deepEqual(role.permissions, ['panel.open', 'panel.fraud']);
  assert.equal(role.isSystem, false);
  assert.equal(role.systemKey, null);
});

test('role names are unique ignoring case', async () => {
  const { service } = fakes();
  await assert.rejects(() => service.createRole({ name: 'alert OPERATOR', description: null, permissions: ['panel.open'] }), (e) => e instanceof GrantError && e.code === 'name_taken');
});

test('editing a role updates everyone who already has it, and only them', async () => {
  const { service, metaCalls, roles } = fakes({ profiles: { 'a@b.co': 'user-a' } });
  await service.grant({ email: 'a@b.co', roleId: 'r-alerts', hospitalId: null }, actor); // active
  await service.grant({ email: 'later@b.co', roleId: 'r-alerts', hospitalId: null }, actor); // pending
  metaCalls.length = 0;
  const result = await service.updateRole('r-alerts', { name: 'Alert operator', description: 'Runs alerts', permissions: ['panel.open', 'panel.alerts', 'panel.logs'] });
  assert.deepEqual(result.role.permissions, ['panel.open', 'panel.alerts', 'panel.logs']);
  assert.deepEqual(result.propagated, { updated: 1, failed: 0 });
  assert.deepEqual(metaCalls, [{ userId: 'user-a', meta: appMetadataFor(roles.get('r-alerts')!, null) }]);
  assert.deepEqual(metaCalls[0].meta.permissions, ['panel.open', 'panel.alerts', 'panel.logs']);
});

test('a failed update for one person is counted, the others still get it', async () => {
  const f = fakes({ profiles: { 'a@b.co': 'user-a', 'c@d.co': 'user-c' } });
  await f.service.grant({ email: 'a@b.co', roleId: 'r-alerts', hospitalId: null }, actor);
  await f.service.grant({ email: 'c@d.co', roleId: 'r-alerts', hospitalId: null }, actor);
  f.metaCalls.length = 0;

  const failingForA: AuthAdmin = {
    async setAppMetadata(userId, meta) {
      if (userId === 'user-a') throw new Error('boom');
      f.metaCalls.push({ userId, meta });
    },
  };
  const service = createGrantService({ store: f.store, auth: failingForA, bootstrapAdminEmails: [], now: () => NOW });
  const result = await service.updateRole('r-alerts', { name: 'Alert operator', description: null, permissions: ['panel.open'] });
  assert.deepEqual(result.propagated, { updated: 1, failed: 1 });
  assert.deepEqual(f.metaCalls.map((call) => call.userId), ['user-c']);
});

test('a role name can be kept when editing but not taken from another role', async () => {
  const { service } = fakes();
  await service.updateRole('r-alerts', { name: 'Alert operator', description: null, permissions: ['panel.open'] });
  await assert.rejects(() => service.updateRole('r-alerts', { name: 'blood bank MANAGER', description: null, permissions: ['panel.open'] }), (e) => e instanceof GrantError && e.code === 'name_taken');
});

test('the Admin role is locked; the Hospital role keeps its name but its permissions can change', async () => {
  const { service } = fakes();
  await assert.rejects(() => service.updateRole('r-admin', { name: 'Admin', description: null, permissions: ['panel.open'] }), (e) => e instanceof GrantError && e.code === 'system_role_locked');
  await assert.rejects(() => service.updateRole('r-hospital', { name: 'Renamed', description: null, permissions: ['stock.own'] }), (e) => e instanceof GrantError && e.code === 'system_role_locked');
  const result = await service.updateRole('r-hospital', { name: 'Hospital staff', description: null, permissions: ['stock.own'] });
  assert.deepEqual(result.role.permissions, ['stock.own']);
});

test('editing an unknown role is reported', async () => {
  const { service } = fakes();
  await assert.rejects(() => service.updateRole('nope', { name: 'x', description: null, permissions: [] }), (e) => e instanceof GrantError && e.code === 'not_found');
});

test('editing a role that people already have needs the service key', async () => {
  const withKey = fakes({ profiles: { 'a@b.co': 'user-a' } });
  await withKey.service.grant({ email: 'a@b.co', roleId: 'r-alerts', hospitalId: null }, actor);
  const noKey = createGrantService({ store: withKey.store, auth: null, bootstrapAdminEmails: [], now: () => NOW });
  await assert.rejects(() => noKey.updateRole('r-alerts', { name: 'Alert operator', description: null, permissions: ['panel.open'] }), (e) => e instanceof GrantError && e.code === 'service_key_missing');
  assert.deepEqual(withKey.roles.get('r-alerts')?.permissions, ['panel.open', 'panel.alerts']);
  // A role nobody has yet can be edited without the key.
  await noKey.updateRole('r-bank', { name: 'Blood bank manager', description: null, permissions: ['stock.all'] });
});

test('deleting: built-in and in-use roles are protected', async () => {
  const { service, roles } = fakes();
  await assert.rejects(() => service.deleteRole('r-admin'), (e) => e instanceof GrantError && e.code === 'system_role_locked');
  await assert.rejects(() => service.deleteRole('r-hospital'), (e) => e instanceof GrantError && e.code === 'system_role_locked');
  await service.grant({ email: 'a@b.co', roleId: 'r-alerts', hospitalId: null }, actor);
  await assert.rejects(() => service.deleteRole('r-alerts'), (e) => e instanceof GrantError && e.code === 'role_in_use');
  await service.deleteRole('r-bank');
  assert.equal(roles.has('r-bank'), false);
  await assert.rejects(() => service.deleteRole('nope'), (e) => e instanceof GrantError && e.code === 'not_found');
});

test('listRoles includes how many people have each role', async () => {
  const { service } = fakes();
  await service.grant({ email: 'a@b.co', roleId: 'r-alerts', hospitalId: null }, actor);
  await service.grant({ email: 'b@b.co', roleId: 'r-alerts', hospitalId: null }, actor);
  const roles = await service.listRoles();
  assert.equal(roles.find((r) => r.id === 'r-alerts')?.grantCount, 2);
  assert.equal(roles.find((r) => r.id === 'r-bank')?.grantCount, 0);
});
