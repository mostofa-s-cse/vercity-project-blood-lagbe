import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BD_DISTRICTS, BD_DIVISIONS, BD_UPAZILAS, districtCoords, districtsByDivision, upazilasByDistrict } from './bdGeo.ts';

test('vendors the real Bangladesh administrative counts (8 divisions, 64 districts, 494 upazilas)', () => {
  assert.equal(BD_DIVISIONS.length, 8);
  assert.equal(BD_DISTRICTS.length, 64);
  assert.equal(BD_UPAZILAS.length, 494);
});

test('every district resolves to a real division', () => {
  const divisionIds = new Set(BD_DIVISIONS.map((d) => d.id));
  for (const district of BD_DISTRICTS) {
    assert.ok(divisionIds.has(district.divisionId), `district ${district.name} has an unknown divisionId`);
  }
});

test('every upazila resolves to a real district', () => {
  const districtIds = new Set(BD_DISTRICTS.map((d) => d.id));
  for (const upazila of BD_UPAZILAS) {
    assert.ok(districtIds.has(upazila.districtId), `upazila ${upazila.name} has an unknown districtId`);
  }
});

test('every district has a real coordinate inside Bangladesh\'s rough bounding box', () => {
  for (const district of BD_DISTRICTS) {
    assert.ok(district.lat > 20 && district.lat < 27, `${district.name} lat out of range: ${district.lat}`);
    assert.ok(district.lng > 87 && district.lng < 93, `${district.name} lng out of range: ${district.lng}`);
  }
});

test('districtsByDivision only returns districts of that division', () => {
  const dhaka = BD_DIVISIONS.find((d) => d.name === 'Dhaka')!;
  const districts = districtsByDivision(dhaka.id);
  assert.ok(districts.length > 0);
  assert.ok(districts.every((d) => d.divisionId === dhaka.id));
  assert.ok(districts.some((d) => d.name === 'Dhaka'));
});

test('upazilasByDistrict only returns upazilas of that district', () => {
  const dhakaDistrict = BD_DISTRICTS.find((d) => d.name === 'Dhaka')!;
  const upazilas = upazilasByDistrict(dhakaDistrict.id);
  assert.ok(upazilas.length > 0);
  assert.ok(upazilas.every((u) => u.districtId === dhakaDistrict.id));
});

test('districtCoords returns the real centroid, or undefined for an unknown id', () => {
  const dhakaDistrict = BD_DISTRICTS.find((d) => d.name === 'Dhaka')!;
  const coords = districtCoords(dhakaDistrict.id);
  assert.deepEqual(coords, { lat: dhakaDistrict.lat, lng: dhakaDistrict.lng });
  assert.equal(districtCoords('no-such-id'), undefined);
});
