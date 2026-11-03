import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BD_DISTRICTS, BD_DIVISIONS } from '../data/bdGeo.ts';
import { divisionString, locationFromDivisionString, locationCoords } from './donorLocation.ts';

test('a district is stored as "District, Division" with real names', () => {
  const dhaka = BD_DISTRICTS.find((d) => d.name === 'Dhaka')!;
  assert.equal(divisionString(dhaka.id), 'Dhaka, Dhaka');
  const cumilla = BD_DISTRICTS.find((d) => d.name !== 'Dhaka' && d.divisionId === BD_DIVISIONS.find((v) => v.name === 'Chattagram')!.id)!;
  assert.equal(divisionString(cumilla.id), `${cumilla.name}, Chattagram`);
  assert.equal(divisionString('no-such-district'), '');
  assert.equal(divisionString(''), '');
});

test('every saved value reads back to the same division and district', () => {
  for (const district of BD_DISTRICTS) {
    const back = locationFromDivisionString(divisionString(district.id));
    assert.deepEqual(back, { divisionId: district.divisionId, districtId: district.id }, district.name);
  }
});

test('a value that is only a division name still fills the division', () => {
  const rajshahi = BD_DIVISIONS.find((d) => d.name === 'Rajshahi')!;
  assert.deepEqual(locationFromDivisionString('Rajshahi'), { divisionId: rajshahi.id, districtId: '' });
});

test('older free text and empty values give nothing to prefill', () => {
  assert.equal(locationFromDivisionString(null), null);
  assert.equal(locationFromDivisionString(''), null);
  assert.equal(locationFromDivisionString('Somewhere near the river'), null);
});

test('the coordinates of a picked district are its centroid, none without a district', () => {
  const dhaka = BD_DISTRICTS.find((d) => d.name === 'Dhaka')!;
  assert.deepEqual(locationCoords(dhaka.id), { latitude: dhaka.lat, longitude: dhaka.lng });
  assert.deepEqual(locationCoords(''), {});
});
