import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNextPath } from './safeRedirect.ts';

test('keeps same-site paths, with query and hash', () => {
  assert.equal(safeNextPath('/bn/donors'), '/bn/donors');
  assert.equal(safeNextPath('/en/docs?x=1#doc-sos'), '/en/docs?x=1#doc-sos');
  assert.equal(safeNextPath('/'), '/');
});

test('falls back for anything that could leave the site', () => {
  for (const bad of ['https://evil.com', '//evil.com', '/\\evil.com', '\\\\evil.com', 'javascript:alert(1)', 'evil.com', '', ' /bn', '/bn\nSet-Cookie: x=1', '/bn\r\n', 'http:/evil.com']) {
    assert.equal(safeNextPath(bad), '/', JSON.stringify(bad));
  }
  assert.equal(safeNextPath(null), '/');
  assert.equal(safeNextPath(undefined), '/');
});

test('uses the given fallback and caps the length', () => {
  assert.equal(safeNextPath('https://evil.com', '/bn'), '/bn');
  assert.equal(safeNextPath(`/${'a'.repeat(400)}`), '/');
});
