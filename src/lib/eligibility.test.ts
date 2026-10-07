import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DONATION_COOLDOWN_DAYS, isEligible } from './eligibility.ts';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-10-07T00:00:00Z');

test('never donated is always eligible', () => {
  assert.equal(isEligible(null, now), true);
});

test('exactly 90 days ago is eligible', () => {
  assert.equal(isEligible(new Date(now.getTime() - DONATION_COOLDOWN_DAYS * DAY), now), true);
});

test('89 days ago is not eligible yet', () => {
  assert.equal(isEligible(new Date(now.getTime() - 89 * DAY), now), false);
});

test('a donation today is not eligible', () => {
  assert.equal(isEligible(now, now), false);
});

test('a donation in the future (clock skew) is not eligible', () => {
  assert.equal(isEligible(new Date(now.getTime() + DAY), now), false);
});

test('an unreadable date counts as never donated', () => {
  assert.equal(isEligible(new Date('not a date'), now), true);
});
