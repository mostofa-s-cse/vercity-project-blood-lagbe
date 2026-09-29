import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGrantService, GrantError, type AuthAdmin, type GrantRecord, type GrantStore } from './grantService.ts';

const NOW = new Date('2026-01-01T00:00:00Z');

function fakes(opts: { profiles?: Record<string, string>; withAuth?: boolean; bootstrap?: string[] } = {}) {
  const rows = new Map<string, GrantRecord>();
  const profiles = opts.profiles ?? {}; // email -> user id
  const metaCalls: Array<{ userId: string; meta: unknown }> = [];
  let seq = 0;

  const store: GrantStore = {
    async upsertByEmail(g) {
      const existing = [...rows.values()].find((r) => r.email === g.email);
      const record: GrantRecord = existing
        ? { ...existing, role: g.role, hospitalId: g.hospitalId, grantedBy: g.grantedBy, appliedAt: null }
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
  return { service, store, rows, metaCalls };
}

const actor = { email: 'boss@example.com' };
const hospitalGrant = { email: 'staff@dmch.gov.bd', role: 'hospital' as const, hospitalId: 'ORG-01' };

test('granting to someone who already signed in applies the role right away', async () => {
  const { service, metaCalls, rows } = fakes({ profiles: { 'staff@dmch.gov.bd': 'user-1' } });
  const result = await service.grant(hospitalGrant, actor);
  assert.equal(result.status, 'active');
  assert.deepEqual(metaCalls, [{ userId: 'user-1', meta: { role: 'hospital', hospital_id: 'ORG-01' } }]);
  assert.deepEqual(rows.get(result.grant.id)?.appliedAt, NOW);
  assert.equal(result.grant.grantedBy, 'boss@example.com');
});

test('an admin grant carries no hospital id', async () => {
  const { service, metaCalls } = fakes({ profiles: { 'a@b.co': 'user-2' } });
  await service.grant({ email: 'a@b.co', role: 'admin', hospitalId: null }, actor);
  assert.deepEqual(metaCalls[0].meta, { role: 'admin', hospital_id: null });
});

test('granting to someone who never signed in stays pending', async () => {
  const { service, metaCalls } = fakes();
  const result = await service.grant(hospitalGrant, actor);
  assert.equal(result.status, 'pending');
  assert.equal(metaCalls.length, 0);
  assert.equal(result.grant.appliedAt, null);
});

test('granting again changes the role and is applied again', async () => {
  const { service, metaCalls, rows } = fakes({ profiles: { 'staff@dmch.gov.bd': 'user-1' } });
  await service.grant(hospitalGrant, actor);
  await service.grant({ ...hospitalGrant, hospitalId: 'ORG-02' }, actor);
  assert.equal(rows.size, 1);
  assert.deepEqual(metaCalls[1].meta, { role: 'hospital', hospital_id: 'ORG-02' });
});

test('granting needs the service key and writes nothing without it', async () => {
  const { service, rows } = fakes({ withAuth: false });
  await assert.rejects(() => service.grant(hospitalGrant, actor), (e) => e instanceof GrantError && e.code === 'service_key_missing');
  assert.equal(rows.size, 0);
});

const user = (over: object = {}) => ({ id: 'user-1', email: 'staff@dmch.gov.bd', emailConfirmed: true, appMetadata: {}, ...over });

test('a pending grant is applied when the person signs in', async () => {
  const { service, metaCalls, rows } = fakes();
  const { grant } = await service.grant(hospitalGrant, actor);
  assert.equal(await service.applyOnSignIn(user()), true);
  assert.deepEqual(metaCalls, [{ userId: 'user-1', meta: { role: 'hospital', hospital_id: 'ORG-01' } }]);
  assert.deepEqual(rows.get(grant.id)?.appliedAt, NOW);
});

test('sign-in matches the email ignoring case', async () => {
  const { service, metaCalls } = fakes();
  await service.grant(hospitalGrant, actor);
  await service.applyOnSignIn(user({ email: 'Staff@DMCH.gov.bd' }));
  assert.equal(metaCalls.length, 1);
});

test('sign-in does nothing for an unconfirmed email or no grant', async () => {
  const { service, metaCalls } = fakes();
  await service.grant(hospitalGrant, actor);
  assert.equal(await service.applyOnSignIn(user({ emailConfirmed: false })), false);
  assert.equal(await service.applyOnSignIn(user({ email: 'other@x.co' })), false);
  assert.equal(await service.applyOnSignIn(user({ email: null })), false);
  assert.equal(metaCalls.length, 0);
});

test('sign-in skips the call when the token already has the role, but records it as applied', async () => {
  const { service, metaCalls, rows } = fakes();
  const { grant } = await service.grant(hospitalGrant, actor);
  assert.equal(await service.applyOnSignIn(user({ appMetadata: { role: 'hospital', hospital_id: 'ORG-01' } })), false);
  assert.equal(metaCalls.length, 0);
  assert.deepEqual(rows.get(grant.id)?.appliedAt, NOW);
});

test('bootstrap admin emails become admins at first sign-in, ignoring case', async () => {
  const { service, metaCalls, rows } = fakes({ bootstrap: ['owner@example.com'] });
  await service.applyOnSignIn(user({ id: 'user-9', email: 'Owner@Example.com' }));
  assert.deepEqual(metaCalls, [{ userId: 'user-9', meta: { role: 'admin', hospital_id: null } }]);
  assert.equal([...rows.values()][0].role, 'admin');
  await service.applyOnSignIn(user({ id: 'user-8', email: 'stranger@example.com' }));
  assert.equal(metaCalls.length, 1);
});

test('the bootstrap list wins over a stored grant, so the owner can never be locked out', async () => {
  const { service, metaCalls } = fakes({ bootstrap: ['staff@dmch.gov.bd'], profiles: { 'staff@dmch.gov.bd': 'user-1' } });
  await service.grant(hospitalGrant, actor);
  metaCalls.length = 0;
  await service.applyOnSignIn(user());
  assert.deepEqual(metaCalls[0].meta, { role: 'admin', hospital_id: null });
});

test('sign-in without the service key is a quiet no-op', async () => {
  const { service } = fakes({ withAuth: false, bootstrap: ['owner@example.com'] });
  assert.equal(await service.applyOnSignIn(user({ email: 'owner@example.com' })), false);
});

test('revoking clears the role in the login data and removes the grant', async () => {
  const { service, metaCalls, rows } = fakes({ profiles: { 'staff@dmch.gov.bd': 'user-1' } });
  const { grant } = await service.grant(hospitalGrant, actor);
  metaCalls.length = 0;
  await service.revoke(grant.id, actor);
  assert.deepEqual(metaCalls, [{ userId: 'user-1', meta: { role: null, hospital_id: null } }]);
  assert.equal(rows.size, 0);
});

test('revoking a pending grant only removes it', async () => {
  const { service, metaCalls, rows } = fakes();
  const { grant } = await service.grant(hospitalGrant, actor);
  await service.revoke(grant.id, actor);
  assert.equal(metaCalls.length, 0);
  assert.equal(rows.size, 0);
});

test('nobody can revoke their own grant, and unknown ids are reported', async () => {
  const { service, rows } = fakes({ profiles: { 'boss@example.com': 'user-b' } });
  const { grant } = await service.grant({ email: 'boss@example.com', role: 'admin', hospitalId: null }, actor);
  await assert.rejects(() => service.revoke(grant.id, { email: 'BOSS@example.com' }), (e) => e instanceof GrantError && e.code === 'cannot_revoke_self');
  assert.equal(rows.size, 1);
  await assert.rejects(() => service.revoke('nope', actor), (e) => e instanceof GrantError && e.code === 'not_found');
});

test('revoking an applied grant needs the service key and changes nothing without it', async () => {
  const { service, store, rows } = fakes({ profiles: { 'staff@dmch.gov.bd': 'user-1' } });
  const { grant } = await service.grant(hospitalGrant, actor);
  const noKey = createGrantService({ store, auth: null, bootstrapAdminEmails: [], now: () => NOW });
  await assert.rejects(() => noKey.revoke(grant.id, actor), (e) => e instanceof GrantError && e.code === 'service_key_missing');
  assert.equal(rows.size, 1);
});

test('list returns every grant', async () => {
  const { service } = fakes();
  await service.grant(hospitalGrant, actor);
  await service.grant({ email: 'a@b.co', role: 'admin', hospitalId: null }, actor);
  assert.equal((await service.list()).length, 2);
});
