import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageCheck, buildCertificateHtml, donorLevel, escapeHtml, nextEligibleDate } from './passport.ts';

test('donorLevel grows with the number of recorded donations', () => {
  assert.equal(donorLevel(0), 'new');
  assert.equal(donorLevel(1), 'bronze');
  assert.equal(donorLevel(2), 'bronze');
  assert.equal(donorLevel(3), 'silver');
  assert.equal(donorLevel(4), 'silver');
  assert.equal(donorLevel(5), 'gold');
  assert.equal(donorLevel(40), 'gold');
  assert.equal(donorLevel(-3), 'new');
});

test('nextEligibleDate is the last donation plus the cooldown, or null if never donated', () => {
  const last = '2026-01-01T00:00:00.000Z';
  assert.equal(nextEligibleDate(last, 90)?.toISOString(), '2026-04-01T00:00:00.000Z');
  assert.equal(nextEligibleDate(null, 90), null);
  assert.equal(nextEligibleDate('not a date', 90), null);
});

test('ageCheck: 18 to 65 is fine, outside is not, missing is unknown', () => {
  assert.equal(ageCheck(18), 'ok');
  assert.equal(ageCheck(65), 'ok');
  assert.equal(ageCheck(17), 'under');
  assert.equal(ageCheck(66), 'over');
  assert.equal(ageCheck(null), 'unknown');
});

test('escapeHtml neutralises markup', () => {
  assert.equal(escapeHtml('<script>"a" & \'b\'</script>'), '&lt;script&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/script&gt;');
});

const labels = {
  title: 'Donation Certificate',
  intro: 'This certifies that',
  gave: (units: number, group: string) => `gave ${units} unit(s) of ${group} blood`,
  atHospital: 'at',
  onDate: 'on',
  codeLabel: 'Donation code',
  voluntary: 'Voluntary and free of charge.',
  print: 'Print / Save as PDF',
};

test('buildCertificateHtml includes the donation facts and escapes the donor-controlled ones', () => {
  const html = buildCertificateHtml(
    { donorName: '<b>Eve</b>', bloodGroup: 'O+', units: 2, hospital: 'A & B Hospital', dateText: '15 Oct 2026', code: 'BL-ABC234' },
    labels,
    'en'
  );
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('&lt;b&gt;Eve&lt;/b&gt;'));
  assert.ok(!html.includes('<b>Eve</b>'));
  assert.ok(html.includes('A &amp; B Hospital'));
  assert.ok(html.includes('BL-ABC234'));
  assert.ok(html.includes('gave 2 unit(s) of O+ blood'));
  assert.ok(html.includes('lang="en"'));
});
