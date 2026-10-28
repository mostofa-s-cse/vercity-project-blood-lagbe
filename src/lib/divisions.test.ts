import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIVISION_NAMES, divisionAliases, divisionOf, parseDivision } from './divisions.ts';

test('DIVISION_NAMES are the eight real divisions', () => {
  assert.equal(DIVISION_NAMES.length, 8);
  assert.ok(DIVISION_NAMES.includes('Dhaka'));
  assert.ok(DIVISION_NAMES.includes('Chattagram'));
});

test('parseDivision accepts a canonical name, a common spelling or the Bengali name, nothing else', () => {
  assert.equal(parseDivision('Dhaka'), 'Dhaka');
  assert.equal(parseDivision('chittagong'), 'Chattagram');
  assert.equal(parseDivision('Barishal'), 'Barisal');
  assert.equal(parseDivision('সিলেট'), 'Sylhet');
  assert.equal(parseDivision('Atlantis'), null);
  assert.equal(parseDivision(''), null);
  assert.equal(parseDivision(undefined), null);
});

test('divisionAliases lists the spellings a stored text may use', () => {
  assert.ok(divisionAliases('Chattagram').includes('chittagong'));
  assert.ok(divisionAliases('Dhaka').includes('ঢাকা'));
  assert.deepEqual(divisionAliases('Nowhere'), []);
});

test('divisionOf finds the division in free text: division names, districts, known places', () => {
  assert.equal(divisionOf('Dhaka, Dhaka'), 'Dhaka');
  assert.equal(divisionOf('Dhaka Central'), 'Dhaka');
  assert.equal(divisionOf('Chittagong Medical College Hospital (CMCH)'), 'Chattagram');
  assert.equal(divisionOf('Sylhet Sadar'), 'Sylhet');
  assert.equal(divisionOf('Comilla'), 'Chattagram'); // a district, not a division name
  assert.equal(divisionOf('খুলনা মেডিকেল কলেজ'), 'Khulna');
  assert.equal(divisionOf('Mirpur 10'), 'Dhaka');
  assert.equal(divisionOf('Square Hospital (Panthapath)'), 'Dhaka');
  assert.equal(divisionOf('Somewhere Unknown'), null);
  assert.equal(divisionOf(null), null);
});

test('divisionOf does not match a district name inside a longer word', () => {
  assert.equal(divisionOf('Refenies'), null); // contains "feni"
});
