import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sendEmail, sendSms } from './notifyChannels.ts';

test('sendEmail resolves without throwing when no provider key is configured', async () => {
  delete process.env.RESEND_API_KEY;
  await assert.doesNotReject(() => sendEmail('a@b.co', 'Subject', 'Body'));
});

test('sendEmail resolves without throwing even when a provider key is set (no real provider wired yet)', async () => {
  process.env.RESEND_API_KEY = 'test-key';
  try {
    await assert.doesNotReject(() => sendEmail('a@b.co', 'Subject', 'Body'));
  } finally {
    delete process.env.RESEND_API_KEY;
  }
});

test('sendSms resolves without throwing when no provider key is configured', async () => {
  delete process.env.SMS_GATEWAY_API_KEY;
  await assert.doesNotReject(() => sendSms('01712345678', 'Body'));
});

test('sendSms resolves without throwing even when a provider key is set (no real provider wired yet)', async () => {
  process.env.SMS_GATEWAY_API_KEY = 'test-key';
  try {
    await assert.doesNotReject(() => sendSms('01712345678', 'Body'));
  } finally {
    delete process.env.SMS_GATEWAY_API_KEY;
  }
});
