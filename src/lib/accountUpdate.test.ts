import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAccountUpdate, updateAccount, type AccountAdmin } from './accountUpdate.ts';

test('every field is optional but at least one must be sent', () => {
  assert.equal(parseAccountUpdate({}).error, 'empty');
  assert.equal(parseAccountUpdate(null).error, 'body');
  assert.deepEqual(parseAccountUpdate({ name: ' Rahim Uddin ' }).value, { name: 'Rahim Uddin' });
});

test('checks each field that is sent', () => {
  assert.equal(parseAccountUpdate({ name: 'R' }).error, 'name');
  assert.equal(parseAccountUpdate({ phone: '12345' }).error, 'phone');
  assert.equal(parseAccountUpdate({ email: 'not-an-email' }).error, 'email');
  assert.equal(parseAccountUpdate({ email: '' }).error, 'email');
});

test('normalises the phone to 01XXXXXXXXX and the email to lower case', () => {
  const { value } = parseAccountUpdate({ phone: '+88 01712-345678', email: ' Rahim@Example.COM ' });
  assert.deepEqual(value, { phone: '01712345678', email: 'rahim@example.com' });
});

function fakeAdmin(opts: { metadata?: Record<string, unknown>; error?: string } = {}) {
  const calls: unknown[] = [];
  const admin: AccountAdmin = {
    async getUserById() {
      return { data: { user: { id: 'u1', user_metadata: opts.metadata ?? { name: 'Old', blood_group: 'A+' } } }, error: null };
    },
    async updateUserById(id, attrs) {
      calls.push({ id, attrs });
      return { error: opts.error ? { message: opts.error } : null };
    },
  };
  return { admin, calls };
}

test('a new email is confirmed straight away so the person signs in with it next time', async () => {
  const { admin, calls } = fakeAdmin();
  const result = await updateAccount(admin, 'u1', { email: 'new@example.com' });
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(calls, [{ id: 'u1', attrs: { email: 'new@example.com', email_confirm: true } }]);
});

test('a new phone is stored for sign-in in country-code form and shown as typed, keeping other metadata', async () => {
  const { admin, calls } = fakeAdmin();
  await updateAccount(admin, 'u1', { phone: '01712345678', name: 'New Name' });
  assert.deepEqual(calls, [
    {
      id: 'u1',
      attrs: {
        phone: '8801712345678',
        phone_confirm: true,
        user_metadata: { name: 'New Name', blood_group: 'A+', phone: '01712345678' },
      },
    },
  ]);
});

test('reports an email or phone that another account already uses', async () => {
  const email = fakeAdmin({ error: 'A user with this email address has already been registered' });
  assert.deepEqual(await updateAccount(email.admin, 'u1', { email: 'a@b.co' }), { ok: false, error: 'email_taken' });
  const phone = fakeAdmin({ error: 'Phone number already registered' });
  assert.deepEqual(await updateAccount(phone.admin, 'u1', { phone: '01712345678' }), { ok: false, error: 'phone_taken' });
});

test('any other failure is a generic update_failed', async () => {
  const { admin } = fakeAdmin({ error: 'boom' });
  assert.deepEqual(await updateAccount(admin, 'u1', { name: 'Rahim' }), { ok: false, error: 'update_failed' });
});
