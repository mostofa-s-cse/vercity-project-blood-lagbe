import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maskPhone } from './phoneMask.ts';

test('a local Bangladesh number shows the operator prefix and the last four digits', () => {
  assert.equal(maskPhone('01752494315'), '017••••4315');
});

test('the international form keeps +880 and the operator code', () => {
  assert.equal(maskPhone('+8801752494315'), '+88017••••4315');
  assert.equal(maskPhone('8801752494315'), '+88017••••4315');
});

test('spaces and dashes do not matter', () => {
  assert.equal(maskPhone('01752-494315'), '017••••4315');
  assert.equal(maskPhone(' 017 5249 4315 '), '017••••4315');
  assert.equal(maskPhone('+880 1752 494315'), '+88017••••4315');
});

test('the masked text never contains the hidden middle digits', () => {
  for (const phone of ['01752494315', '+8801752494315', '01352494315']) {
    const masked = maskPhone(phone);
    assert.ok(masked.includes('••••'), masked);
    assert.equal(masked.includes('5249'), false, masked);
    assert.equal(masked.includes(phone), false, masked);
  }
});

test('a number of any other shape shows only its last four digits', () => {
  assert.equal(maskPhone('123456789012'), '••••9012');
  assert.equal(maskPhone('12345678'), '••••5678');
});

test('short, empty and junk input gives just dots and never throws', () => {
  for (const junk of ['', '123', '1234567', 'abc', '+', undefined, null, 42] as unknown[]) {
    assert.equal(maskPhone(junk as string), '••••', String(junk));
  }
});
