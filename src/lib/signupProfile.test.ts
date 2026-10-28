import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSignupProfile, profileToMetadata, profileFromMetadata } from './signupProfile.ts';

const base = { name: ' Rahim Uddin ', phone: '01711-223344' };

test('parseSignupProfile: name and phone are required', () => {
  assert.equal(parseSignupProfile({ phone: '01711223344' }).error, 'name');
  assert.equal(parseSignupProfile({ name: '   ', phone: '01711223344' }).error, 'name');
  assert.equal(parseSignupProfile({ name: 'Rahim' }).error, 'phone');
  assert.equal(parseSignupProfile({ name: 'Rahim', phone: '12345' }).error, 'phone');
});

test('parseSignupProfile: trims the name and normalises the phone to 01XXXXXXXXX', () => {
  const { value, error } = parseSignupProfile({ ...base, phone: '+880 1711-223344' });
  assert.equal(error, null);
  assert.deepEqual(value, { name: 'Rahim Uddin', phone: '01711223344', bloodGroup: null, age: null, area: null });
});

test('parseSignupProfile: optional fields stay null when empty, are kept when valid', () => {
  const { value, error } = parseSignupProfile({ ...base, bloodGroup: 'O+', age: '24', area: ' Mirpur ' });
  assert.equal(error, null);
  assert.deepEqual(value, { name: 'Rahim Uddin', phone: '01711223344', bloodGroup: 'O+', age: 24, area: 'Mirpur' });
  assert.equal(parseSignupProfile({ ...base, bloodGroup: '', age: '', area: '' }).error, null);
});

test('parseSignupProfile: rejects a bad blood group or an age outside 18-65', () => {
  assert.equal(parseSignupProfile({ ...base, bloodGroup: 'Z+' }).error, 'bloodGroup');
  assert.equal(parseSignupProfile({ ...base, age: 17 }).error, 'age');
  assert.equal(parseSignupProfile({ ...base, age: 66 }).error, 'age');
  assert.equal(parseSignupProfile({ ...base, age: 'abc' }).error, 'age');
});

test('profileToMetadata / profileFromMetadata round-trip and ignore junk', () => {
  const profile = { name: 'Rahim', phone: '01711223344', bloodGroup: 'A-', age: 30, area: 'Uttara' } as const;
  assert.deepEqual(profileFromMetadata(profileToMetadata(profile)), profile);
  assert.deepEqual(profileFromMetadata({ name: 'X', age: 'nope', bloodGroup: 'Q' }), {
    name: 'X',
    phone: null,
    bloodGroup: null,
    age: null,
    area: null,
  });
  assert.deepEqual(profileFromMetadata(null), { name: null, phone: null, bloodGroup: null, age: null, area: null });
});
