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

test('createEmailAccount: passes the whole metadata object to the new user', async () => {
  let seen: Record<string, unknown> | undefined;
  const admin: EmailAuthAdmin = {
    createUser: async (attrs) => {
      seen = attrs.user_metadata;
      return { data: { user: { id: 'user-2' } }, error: null };
    },
  };
  await createEmailAccount(admin, { email: 'a@example.com', password: 'x', metadata: { name: 'Rahim', phone: '01711223344' } });
  assert.deepEqual(seen, { name: 'Rahim', phone: '01711223344' });
});
