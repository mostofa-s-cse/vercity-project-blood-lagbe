import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CODE_ALPHABET, MAX_UNITS, generateDonationCode, parseDonationsInput, planDonations } from './donationConfirm.ts';

test('parseDonationsInput accepts a list of responder ids with units', () => {
  const parsed = parseDonationsInput([{ responseId: 'a', units: 2 }, { responseId: 'b' }]);
  assert.equal(parsed.error, null);
  assert.deepEqual(parsed.value, [{ responseId: 'a', units: 2 }, { responseId: 'b', units: 1 }]);
});

test('an empty list is allowed (nobody confirmed)', () => {
  assert.deepEqual(parseDonationsInput([]).value, []);
});

test('parseDonationsInput rejects bad shapes', () => {
  for (const bad of ['x', {}, [1], [{ units: 1 }], [{ responseId: '' }], [{ responseId: 'a', units: 0 }], [{ responseId: 'a', units: MAX_UNITS + 1 }], [{ responseId: 'a', units: 1.5 }], [{ responseId: 'a' }, { responseId: 'a' }]]) {
    assert.notEqual(parseDonationsInput(bad).error, null, JSON.stringify(bad));
  }
  assert.notEqual(parseDonationsInput(Array.from({ length: 51 }, (_, i) => ({ responseId: `r${i}` }))).error, null);
});

test('generateDonationCode is BL- plus six unambiguous characters', () => {
  for (let i = 0; i < 50; i++) {
    const code = generateDonationCode();
    assert.match(code, /^BL-[A-Z0-9]{6}$/);
    assert.equal(/[01OI]/.test(code.slice(3)), false, code);
  }
  assert.equal(CODE_ALPHABET.length, 32);
});

test('generateDonationCode uses the random source it is given', () => {
  assert.equal(generateDonationCode(() => 0), `BL-${CODE_ALPHABET[0].repeat(6)}`);
});

const responses = [
  { id: 'r1', donorId: 'd1' },
  { id: 'r2', donorId: null },
  { id: 'r3', donorId: 'd1' },
];

test('planDonations splits registered donors from walk-in responders', () => {
  const plan = planDonations(responses, [{ responseId: 'r1', units: 2 }, { responseId: 'r2', units: 1 }]);
  assert.equal(plan.error, null);
  assert.deepEqual(plan.value.donations, [{ donorId: 'd1', units: 2, responseId: 'r1' }]);
  assert.deepEqual(plan.value.unregistered, [{ responseId: 'r2', units: 1 }]);
});

test('planDonations refuses a responder that is not on the request', () => {
  assert.notEqual(planDonations(responses, [{ responseId: 'zzz', units: 1 }]).error, null);
});

test('one donor answering twice is recorded once, with the units added up', () => {
  const plan = planDonations(responses, [{ responseId: 'r1', units: 1 }, { responseId: 'r3', units: 2 }]);
  assert.deepEqual(plan.value.donations, [{ donorId: 'd1', units: 3, responseId: 'r1' }]);
});

test('legacy completion (no list) confirms every registered responder with one unit', () => {
  const plan = planDonations(responses, null);
  assert.deepEqual(plan.value.donations, [{ donorId: 'd1', units: 1, responseId: 'r1' }]);
  assert.deepEqual(plan.value.unregistered, []);
});
