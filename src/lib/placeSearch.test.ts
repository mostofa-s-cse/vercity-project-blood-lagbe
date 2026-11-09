import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlaceResults, placeSearchUrl, roundCoordinate } from './placeSearch.ts';

test('a place search needs at least three characters', () => {
  assert.equal(placeSearchUrl(''), null);
  assert.equal(placeSearchUrl('  ab '), null);
  assert.notEqual(placeSearchUrl('Dhanmondi'), null);
});

test('a place search is limited to Bangladesh and escapes the query', () => {
  const url = new URL(placeSearchUrl('ঢাকা মেডিকেল & কলেজ')!);
  assert.equal(url.origin + url.pathname, 'https://nominatim.openstreetmap.org/search');
  assert.equal(url.searchParams.get('countrycodes'), 'bd');
  assert.equal(url.searchParams.get('format'), 'jsonv2');
  assert.equal(url.searchParams.get('q'), 'ঢাকা মেডিকেল & কলেজ');
});

test('place results become label, latitude and longitude numbers', () => {
  const results = parsePlaceResults([
    { display_name: 'Dhaka Medical College Hospital, Shahbagh, Dhaka', lat: '23.7258', lon: '90.3976' },
    { display_name: 'Second', lat: '23.8', lon: '90.4' },
  ]);
  assert.deepEqual(results[0], { label: 'Dhaka Medical College Hospital, Shahbagh, Dhaka', lat: 23.7258, lng: 90.3976 });
  assert.equal(results.length, 2);
});

test('place results drop rows that are not a real point in Bangladesh', () => {
  const results = parsePlaceResults([
    { display_name: 'Bad lat', lat: 'x', lon: '90' },
    { display_name: 'Missing lon', lat: '23.7' },
    { display_name: 'Paris', lat: '48.85', lon: '2.35' },
    { lat: '23.7', lon: '90.4' },
    { display_name: 'Dhaka', lat: '23.7', lon: '90.4' },
    null,
    'text',
  ] as unknown[]);
  assert.deepEqual(results.map((r) => r.label), ['Dhaka']);
});

test('place results are capped and always an array', () => {
  assert.deepEqual(parsePlaceResults('nope'), []);
  assert.deepEqual(parsePlaceResults(null), []);
  const many = Array.from({ length: 20 }, (_, i) => ({ display_name: `P${i}`, lat: '23.7', lon: '90.4' }));
  assert.equal(parsePlaceResults(many).length, 6);
});

test('coordinates are rounded to six decimals', () => {
  assert.equal(roundCoordinate(23.74612345678), 23.746123);
  assert.equal(roundCoordinate(90), 90);
});
