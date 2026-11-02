import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DONATION_COOLDOWN_DAYS, estimateLastDonationAt, isEligible } from './eligibility.ts';

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

test('a self-reported "N months ago" becomes an estimated donation date that drives the 90-day rule', () => {
  const at = estimateLastDonationAt(2, now);
  assert.ok(at instanceof Date);
  assert.equal(isEligible(at, now), false); // 2 months ago: still resting
  assert.equal(isEligible(estimateLastDonationAt(3, now), now), true); // 3 months (90 days): can donate again
  assert.equal(isEligible(estimateLastDonationAt(0, now), now), false); // this month
});

test('no usable self-reported months gives no estimate', () => {
  assert.equal(estimateLastDonationAt(undefined, now), null);
  assert.equal(estimateLastDonationAt(null, now), null);
  assert.equal(estimateLastDonationAt(Number.NaN, now), null);
  assert.equal(estimateLastDonationAt(-1, now), null);
});
