import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatBdPhoneIntl, isValidBdPhone } from './phone.ts';

test('accepts Bangladesh mobile numbers in common notations', () => {
  for (const ok of ['01752494315', '01316151118', '017-5249 4315', '+8801752494315', '8801752494315', '  01752494315  ']) {
    assert.equal(isValidBdPhone(ok), true, ok);
  }
});

test('rejects wrong length, wrong prefix and non-digits', () => {
  for (const bad of ['', '   ', '017', '0175249431', '017524943150', '02752494315', '01252494315', '+8802752494315', 'abcdefghijk', '01752-49431x', '017524943१५']) {
    assert.equal(isValidBdPhone(bad), false, bad);
  }
});

test('formats a Bangladesh mobile number in international form without the trunk 0', () => {
  assert.equal(formatBdPhoneIntl('01700000001'), '+880 1700000001');
  assert.equal(formatBdPhoneIntl(' 017-0000 0001 '), '+880 1700000001');
  assert.equal(formatBdPhoneIntl('+8801700000001'), '+880 1700000001');
  assert.equal(formatBdPhoneIntl('8801700000001'), '+880 1700000001');
  assert.equal(formatBdPhoneIntl('+880 1700000001'), '+880 1700000001');
});

test('leaves a number that is not a Bangladesh mobile as typed', () => {
  assert.equal(formatBdPhoneIntl('12345'), '12345');
});
