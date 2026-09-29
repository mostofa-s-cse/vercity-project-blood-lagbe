import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLOOD_GROUPS, DB_BLOOD_GROUP, parseDonorInput, parseSosInput } from './validation.ts';

const donor = { name: 'Tanvir Ahmed', phone: '017-5249 4315', bloodGroup: 'O+', area: 'Dhanmondi 27' };
const sos = { bloodGroup: 'AB+', bags: 1, place: 'Chander Hashi Hospital', phones: ['01752494315'], postText: 'post' };

test('every blood group has a database value', () => {
  assert.equal(BLOOD_GROUPS.length, 8);
  for (const group of BLOOD_GROUPS) assert.match(DB_BLOOD_GROUP[group], /^(A|B|AB|O)_(POS|NEG)$/);
});

test('accepts a minimal donor and fills defaults', () => {
  const result = parseDonorInput(donor);
  assert.equal(result.error, null);
  if (!result.error) {
    assert.equal(result.value.name, 'Tanvir Ahmed');
    assert.equal(result.value.phone, '01752494315');
    assert.equal(result.value.isAvailable, true);
  }
});

test('trims donor text and keeps valid optional fields', () => {
  const result = parseDonorInput({ ...donor, name: '  Tanvir  ', age: 24, gender: 'Male', weightKg: 65, lastDonationMonths: 4, email: 'a@b.co', isAvailable: false });
  assert.equal(result.error, null);
  if (!result.error) {
    assert.equal(result.value.name, 'Tanvir');
    assert.equal(result.value.age, 24);
    assert.equal(result.value.isAvailable, false);
  }
});

test('rejects bad donor input with the failing field name', () => {
  const bad = (patch: object) => {
    const result = parseDonorInput({ ...donor, ...patch });
    return result.error ?? 'ok';
  };
  assert.equal(bad({ name: 'A' }), 'name');
  assert.equal(bad({ name: 'x'.repeat(81) }), 'name');
  assert.equal(bad({ name: 42 }), 'name');
  assert.equal(bad({ phone: '12345' }), 'phone');
  assert.equal(bad({ bloodGroup: 'C+' }), 'bloodGroup');
  assert.equal(bad({ area: '' }), 'area');
  assert.equal(bad({ age: 12 }), 'age');
  assert.equal(bad({ age: 24.5 }), 'age');
  assert.equal(bad({ gender: 'Robot' }), 'gender');
  assert.equal(bad({ email: 'not-an-email' }), 'email');
  assert.equal(bad({ weightKg: 5 }), 'weightKg');
  assert.equal(bad({ lastDonationMonths: -1 }), 'lastDonationMonths');
  assert.equal(bad({ isAvailable: 'yes' }), 'isAvailable');
});

test('rejects non-object donor input', () => {
  for (const raw of [null, undefined, 'x', 42, [], true]) assert.notEqual(parseDonorInput(raw).error, null);
});

test('accepts a minimal SOS and fills defaults', () => {
  const result = parseSosInput(sos);
  assert.equal(result.error, null);
  if (!result.error) {
    assert.deepEqual(result.value.phones, ['01752494315']);
    assert.equal(result.value.isCritical, true);
    assert.equal(result.value.language, 'bn');
    assert.equal(result.value.bags, 1);
  }
});

test('normalises SOS phones and keeps two at most', () => {
  const two = parseSosInput({ ...sos, phones: ['017-5249 4315', '+8801316151118'] });
  assert.equal(two.error, null);
  if (!two.error) assert.deepEqual(two.value.phones, ['01752494315', '+8801316151118']);
  assert.notEqual(parseSosInput({ ...sos, phones: ['01752494315', '01316151118', '01912345678'] }).error, null);
});

test('rejects bad SOS input with the failing field name', () => {
  const bad = (patch: object) => {
    const result = parseSosInput({ ...sos, ...patch });
    return result.error ?? 'ok';
  };
  assert.equal(bad({ bloodGroup: 'Z' }), 'bloodGroup');
  assert.equal(bad({ bags: 0 }), 'bags');
  assert.equal(bad({ bags: 9 }), 'bags');
  assert.equal(bad({ bags: 1.5 }), 'bags');
  assert.equal(bad({ bags: '2' }), 'bags');
  assert.equal(bad({ place: ' ' }), 'place');
  assert.equal(bad({ phones: [] }), 'phones');
  assert.equal(bad({ phones: 'x' }), 'phones');
  assert.equal(bad({ phones: ['nope'] }), 'phones');
  assert.equal(bad({ postText: '' }), 'postText');
  assert.equal(bad({ postText: 'x'.repeat(1001) }), 'postText');
  assert.equal(bad({ language: 'fr' }), 'language');
  assert.equal(bad({ isCritical: 'yes' }), 'isCritical');
  assert.equal(bad({ area: 'x'.repeat(121) }), 'area');
});
