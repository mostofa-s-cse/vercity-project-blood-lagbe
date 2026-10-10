import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmailAccount, type EmailAuthAdmin } from './emailAuth.ts';

const fakeAdmin = (
  result: Awaited<ReturnType<EmailAuthAdmin['createUser']>>
): EmailAuthAdmin => ({
  createUser: async () => result,
});

test('createEmailAccount: success returns the new user id', async () => {
  const admin = fakeAdmin({ data: { user: { id: 'user-1' } }, error: null });
  const result = await createEmailAccount(admin, { email: 'a@example.com', password: 'x' });
  assert.deepEqual(result, { userId: 'user-1' });
});

test('createEmailAccount: an email already registered is reported distinctly', async () => {
  const admin = fakeAdmin({ data: { user: null }, error: { message: 'User already registered' } });
  const result = await createEmailAccount(admin, { email: 'a@example.com', password: 'x' });
  assert.deepEqual(result, { error: 'email_taken' });
});

test('createEmailAccount: any other failure is a generic create_failed', async () => {
  const admin = fakeAdmin({ data: { user: null }, error: { message: 'Email address is invalid' } });
  const result = await createEmailAccount(admin, { email: 'a@example.com', password: 'x' });
  assert.deepEqual(result, { error: 'create_failed' });
});

test('createEmailAccount: no error but no user either is still a failure, never silently "ok"', async () => {
  const admin = fakeAdmin({ data: { user: null }, error: null });
  const result = await createEmailAccount(admin, { email: 'a@example.com', password: 'x' });
  assert.deepEqual(result, { error: 'create_failed' });
});
