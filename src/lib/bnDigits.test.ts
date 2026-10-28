import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bnDigits } from './bnDigits.ts';

test('bnDigits turns 0-9 into Bengali digits and leaves everything else alone', () => {
  assert.equal(bnDigits(90), '৯০');
  assert.equal(bnDigits('26'), '২৬');
  assert.equal(bnDigits('BL-F32ZJ6'), 'BL-F৩২ZJ৬');
  assert.equal(bnDigits('O+'), 'O+');
  assert.equal(bnDigits(0), '০');
});
