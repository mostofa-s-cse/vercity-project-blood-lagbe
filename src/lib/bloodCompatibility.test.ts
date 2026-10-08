import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BLOOD_GROUPS } from './validation.ts';
import { COMPATIBLE_DONORS, isCompatibleDonor } from './bloodCompatibility.ts';

// The standard ABO/Rh compatibility table (who may donate TO the recipient), exactly as taught at any
// blood bank. Keyed by recipient, listing every donor group that may give to them.
const EXPECTED: Record<string, string[]> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

test('every blood group has an entry, and only the 8 real groups appear anywhere', () => {
  assert.deepEqual(Object.keys(COMPATIBLE_DONORS).sort(), [...BLOOD_GROUPS].sort());
  for (const recipient of BLOOD_GROUPS) {
    for (const donor of COMPATIBLE_DONORS[recipient]) {
      assert.ok((BLOOD_GROUPS as readonly string[]).includes(donor), `${donor} is not a real blood group`);
    }
  }
});

test('the full compatibility table matches the standard ABO/Rh chart exactly', () => {
  for (const recipient of BLOOD_GROUPS) {
    assert.deepEqual(
      [...COMPATIBLE_DONORS[recipient]].sort(),
      [...EXPECTED[recipient]].sort(),
      `mismatch for recipient ${recipient}`
    );
  }
});

test('O- is the universal donor: compatible with every recipient', () => {
  for (const recipient of BLOOD_GROUPS) {
    assert.equal(isCompatibleDonor('O-', recipient), true, `O- should be able to give to ${recipient}`);
  }
});

test('AB+ is the universal recipient: compatible with every donor', () => {
  for (const donor of BLOOD_GROUPS) {
    assert.equal(isCompatibleDonor(donor, 'AB+'), true, `${donor} should be able to give to AB+`);
  }
});

test('AB- can only receive from Rh-negative donors', () => {
  for (const donor of BLOOD_GROUPS) {
    const expected = donor.endsWith('-');
    assert.equal(isCompatibleDonor(donor, 'AB-'), expected, `${donor} -> AB- should be ${expected}`);
  }
});

test('a positive donor is never compatible with a negative recipient', () => {
  for (const donor of BLOOD_GROUPS.filter((g) => g.endsWith('+'))) {
    for (const recipient of BLOOD_GROUPS.filter((g) => g.endsWith('-'))) {
      assert.equal(isCompatibleDonor(donor, recipient), false, `${donor} -> ${recipient} should be incompatible`);
    }
  }
});

test('every blood group is compatible with itself', () => {
  for (const group of BLOOD_GROUPS) assert.equal(isCompatibleDonor(group, group), true);
});
