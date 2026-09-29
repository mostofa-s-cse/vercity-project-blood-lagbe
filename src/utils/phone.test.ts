import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidBdPhone } from './phone.ts';

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
