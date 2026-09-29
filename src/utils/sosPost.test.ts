import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSosPost, type SosPostLabels } from './sosPost.ts';

const labels: SosPostLabels = {
  title: (area) => (area ? `NEED BLOOD - ${area}` : 'NEED BLOOD'),
  problem: 'Problem',
  bloodGroup: 'Group',
  amountLabel: 'Amount',
  amount: (bags) => `${bags} bag(s)`,
  place: 'Place',
  contact: 'Contact',
};

const full = {
  area: 'Habiganj',
  problem: 'Pregnant',
  bloodGroup: 'AB+',
  bags: 1,
  place: 'Chander Hashi Hospital',
  phones: ['01752494315', '01316151118'],
};

test('builds the full post in the Facebook-style layout', () => {
  assert.equal(
    buildSosPost(full, labels),
    [
      'NEED BLOOD - Habiganj',
      '📈Problem : Pregnant',
      '🩸Group : AB+',
      '💉Amount : 1 bag(s)',
      '🏘Place : Chander Hashi Hospital',
      '☎Contact : 01752494315 - 01316151118',
    ].join('\n')
  );
});

test('leaves the area out of the title when it is blank', () => {
  assert.equal(buildSosPost({ ...full, area: '   ' }, labels).split('\n')[0], 'NEED BLOOD');
});

test('drops the problem, place and contact lines when they are empty', () => {
  const post = buildSosPost({ ...full, problem: ' ', place: '', phones: [] }, labels);
  assert.equal(post, ['NEED BLOOD - Habiganj', '🩸Group : AB+', '💉Amount : 1 bag(s)'].join('\n'));
});

test('trims phone numbers and skips blank ones', () => {
  const post = buildSosPost({ ...full, phones: [' 01752494315 ', '', '  ', '01316151118'] }, labels);
  assert.ok(post.endsWith('☎Contact : 01752494315 - 01316151118'));
  const single = buildSosPost({ ...full, phones: ['01752494315', ' '] }, labels);
  assert.ok(single.endsWith('☎Contact : 01752494315'));
});

test('keeps the number of bags at a whole number of at least one', () => {
  const bags = (n: number) => buildSosPost({ ...full, bags: n }, labels).split('\n')[3];
  assert.equal(bags(0), '💉Amount : 1 bag(s)');
  assert.equal(bags(-3), '💉Amount : 1 bag(s)');
  assert.equal(bags(2.9), '💉Amount : 2 bag(s)');
  assert.equal(bags(Number.NaN), '💉Amount : 1 bag(s)');
  assert.equal(bags(4), '💉Amount : 4 bag(s)');
});

test('trims the text fields', () => {
  const post = buildSosPost({ ...full, area: ' Habiganj ', problem: ' Pregnant ', place: ' Hospital ' }, labels);
  assert.ok(post.startsWith('NEED BLOOD - Habiganj\n'));
  assert.ok(post.includes('📈Problem : Pregnant\n'));
  assert.ok(post.includes('🏘Place : Hospital\n'));
});
