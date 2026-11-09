import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoAccountsEnabled } from './demoAccounts.ts';

test('the demo-account panel is off unless the flag is exactly "true"', () => {
  assert.equal(demoAccountsEnabled(undefined), false);
  assert.equal(demoAccountsEnabled(''), false);
  assert.equal(demoAccountsEnabled('false'), false);
  assert.equal(demoAccountsEnabled('1'), false);
  assert.equal(demoAccountsEnabled('TRUE'), false);
  assert.equal(demoAccountsEnabled('true'), true);
});
