import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findMatchingDonors, type MatchDonor, type MatchRequest } from './donorMatching.ts';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

const donor = (over: Partial<MatchDonor> = {}): MatchDonor => ({
  id: 'd1',
  bloodGroup: 'O+',
  area: 'Dhanmondi',
  division: 'Dhaka',
  latitude: null,
  longitude: null,
  isAvailable: true,
  lastDonationAt: null,
  userId: null,
  ...over,
});

const request = (over: Partial<MatchRequest> = {}): MatchRequest => ({
  bloodGroup: 'O+',
  area: 'Dhanmondi',
  division: 'Dhaka',
  latitude: null,
  longitude: null,
  userId: null,
  ...over,
});

test('matches a compatible, available, eligible, same-area donor', () => {
  const result = findMatchingDonors([donor()], request(), { now: NOW });
  assert.equal(result.length, 1);
});

test('excludes a donor with the wrong blood group', () => {
  const result = findMatchingDonors([donor({ bloodGroup: 'B+' })], request({ bloodGroup: 'A+' }), { now: NOW });
  assert.equal(result.length, 0);
});

test('a universal donor (O-) matches a request of any group', () => {
  for (const group of ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const) {
    const result = findMatchingDonors([donor({ bloodGroup: 'O-' })], request({ bloodGroup: group }), { now: NOW });
    assert.equal(result.length, 1, `O- should match a ${group} request`);
  }
});

test('excludes an unavailable donor', () => {
  const result = findMatchingDonors([donor({ isAvailable: false })], request(), { now: NOW });
  assert.equal(result.length, 0);
});

test('excludes a donor still inside the 90-day cooldown', () => {
  const result = findMatchingDonors([donor({ lastDonationAt: new Date(NOW.getTime() - 30 * DAY) })], request(), { now: NOW });
  assert.equal(result.length, 0);
});

test('includes a donor past the 90-day cooldown', () => {
  const result = findMatchingDonors([donor({ lastDonationAt: new Date(NOW.getTime() - 100 * DAY) })], request(), { now: NOW });
  assert.equal(result.length, 1);
});

test('excludes the requester themself when both are signed in with the same user id', () => {
  const result = findMatchingDonors([donor({ userId: 'u1' })], request({ userId: 'u1' }), { now: NOW });
  assert.equal(result.length, 0);
});

test('a signed-out requester (no userId) never excludes anyone on that basis', () => {
  const result = findMatchingDonors([donor({ userId: 'u1' })], request({ userId: null }), { now: NOW });
  assert.equal(result.length, 1);
});

test('matches by real coordinates within the radius, ignoring area/division text', () => {
  const result = findMatchingDonors(
    [donor({ area: 'Nowhere', division: 'Nowhere', latitude: 23.81, longitude: 90.41 })],
    request({ area: 'Somewhere Else', division: 'Somewhere Else', latitude: 23.82, longitude: 90.42 }),
    { now: NOW, radiusKm: 50 }
  );
  assert.equal(result.length, 1);
});

test('excludes a donor outside the radius when both sides have coordinates', () => {
  const result = findMatchingDonors(
    [donor({ latitude: 22.335109, longitude: 91.834073 })], // Chattogram
    request({ latitude: 23.7115253, longitude: 90.4111451 }), // Dhaka
    { now: NOW, radiusKm: 50 }
  );
  assert.equal(result.length, 0);
});

test('falls back to an exact area/division text match when either side lacks a coordinate', () => {
  const sameArea = findMatchingDonors([donor({ area: 'Dhanmondi 27' })], request({ area: 'Dhanmondi 27' }), { now: NOW });
  assert.equal(sameArea.length, 1);

  const differentAreaSameDivision = findMatchingDonors(
    [donor({ area: 'Uttara', division: 'Dhaka' })],
    request({ area: 'Dhanmondi', division: 'Dhaka' }),
    { now: NOW }
  );
  assert.equal(differentAreaSameDivision.length, 1);

  const noOverlap = findMatchingDonors(
    [donor({ area: 'Uttara', division: 'Dhaka' })],
    request({ area: 'Agrabad', division: 'Chattogram' }),
    { now: NOW }
  );
  assert.equal(noOverlap.length, 0);
});

test('an under-specified request (no area, no division, no coordinate) matches nobody, not everyone', () => {
  const result = findMatchingDonors([donor()], request({ area: null, division: null }), { now: NOW });
  assert.equal(result.length, 0);
});

test('the area/division text match is case-insensitive and trims whitespace', () => {
  const result = findMatchingDonors(
    [donor({ area: '  DHANMONDI  ' })],
    request({ area: 'dhanmondi' }),
    { now: NOW }
  );
  assert.equal(result.length, 1);
});
