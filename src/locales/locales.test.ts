import { test } from 'node:test';
import assert from 'node:assert/strict';
import { en } from './en.ts';
import { bn } from './bn.ts';

type Tree = { [key: string]: unknown };

/** Flattens a translation tree to `path -> leaf`, where a leaf is a string or a function. */
function leaves(node: Tree, prefix = ''): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      Object.assign(out, leaves(value as Tree, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

const enLeaves = leaves(en as Tree);
const bnLeaves = leaves(bn as Tree);

test('en and bn have identical keys', () => {
  assert.deepEqual(Object.keys(bnLeaves).sort(), Object.keys(enLeaves).sort());
});

test('en and bn leaves have the same kind, and functions the same arity', () => {
  for (const [path, enValue] of Object.entries(enLeaves)) {
    const bnValue = bnLeaves[path];
    assert.equal(typeof bnValue, typeof enValue, path);
    if (typeof enValue === 'function') {
      assert.equal((bnValue as Function).length, enValue.length, `${path} arity`);
    }
  }
});

test('no string is empty', () => {
  for (const [path, value] of [...Object.entries(enLeaves), ...Object.entries(bnLeaves)]) {
    if (typeof value === 'string') assert.notEqual(value.trim(), '', path);
  }
});

test('function leaves return non-empty strings in both languages', () => {
  for (const [path, enValue] of Object.entries(enLeaves)) {
    if (typeof enValue !== 'function') continue;
    const args = Array.from({ length: enValue.length }, (_, i) => (i === 0 ? 3 : 'x'));
    const enOut = (enValue as (...a: unknown[]) => unknown)(...args);
    const bnOut = (bnLeaves[path] as (...a: unknown[]) => unknown)(...args);
    assert.equal(typeof enOut, 'string', `${path} en`);
    assert.equal(typeof bnOut, 'string', `${path} bn`);
    assert.notEqual((enOut as string).trim(), '', `${path} en`);
    assert.notEqual((bnOut as string).trim(), '', `${path} bn`);
  }
});
