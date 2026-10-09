import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhoneForAuth, createPhoneAccount, type PhoneAuthAdmin } from './phoneAuth.ts';

test('normalizePhoneForAuth: local 0-prefixed number -> 880 country code, no plus/leading zero', () => {
  assert.equal(normalizePhoneForAuth('01712345678'), '8801712345678');
});

test('normalizePhoneForAuth: +880-prefixed number -> same digits without the plus', () => {
  assert.equal(normalizePhoneForAuth('+8801712345678'), '8801712345678');
});

test('normalizePhoneForAuth: already 880-prefixed, no plus -> unchanged', () => {
  assert.equal(normalizePhoneForAuth('8801712345678'), '8801712345678');
});

test('normalizePhoneForAuth: spaces and dashes are stripped first', () => {
  assert.equal(normalizePhoneForAuth('+880 171-234-5678'), '8801712345678');
});

const fakeAdmin = (
  result: Awaited<ReturnType<PhoneAuthAdmin['createUser']>>
): PhoneAuthAdmin => ({
  createUser: async () => result,
});

test('createPhoneAccount: success returns the new user id', async () => {
  const admin = fakeAdmin({ data: { user: { id: 'user-1' } }, error: null });
  const result = await createPhoneAccount(admin, { phone: '01712345678', password: 'x' });
  assert.deepEqual(result, { userId: 'user-1' });
});

test('createPhoneAccount: a phone already registered is reported distinctly', async () => {
  const admin = fakeAdmin({ data: { user: null }, error: { message: 'Phone number already registered by another user' } });
  const result = await createPhoneAccount(admin, { phone: '01712345678', password: 'x' });
  assert.deepEqual(result, { error: 'phone_taken' });
});

test('createPhoneAccount: any other failure is a generic create_failed', async () => {
  const admin = fakeAdmin({ data: { user: null }, error: { message: 'Phone logins are disabled' } });
  const result = await createPhoneAccount(admin, { phone: '01712345678', password: 'x' });
  assert.deepEqual(result, { error: 'create_failed' });
});

test('createPhoneAccount: no error but no user either is still a failure, never silently "ok"', async () => {
  const admin = fakeAdmin({ data: { user: null }, error: null });
  const result = await createPhoneAccount(admin, { phone: '01712345678', password: 'x' });
  assert.deepEqual(result, { error: 'create_failed' });
});
