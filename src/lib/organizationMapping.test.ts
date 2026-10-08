import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toHospitalOrganizations } from './organizationMapping.ts';
import type { OrganizationDto } from './dtoTypes.ts';

const baseDto: OrganizationDto = {
  id: 'org-1',
  name: 'Test Hospital',
  shortCode: 'TH',
  type: 'private_hospital',
  division: 'Dhaka',
  district: 'Dhaka',
  address: '1 Test Road',
  hotline: '+880 1000-000000',
  emergencyContact: '+880 1000-000001',
  directorName: 'Dr. Test',
  licenseNumber: 'LIC-1',
  isVerified: true,
  status: 'approved',
  totalBeds: 100,
  icuBeds: 10,
  createdAt: '2026-01-15T00:00:00.000Z',
  latitude: 23.81,
  longitude: 90.41,
  distanceKm: null,
};

test('toHospitalOrganizations carries every field across and zeroes blood stock', () => {
  const [hospital] = toHospitalOrganizations([baseDto]);
  assert.equal(hospital.id, 'org-1');
  assert.equal(hospital.name, 'Test Hospital');
  assert.equal(hospital.shortCode, 'TH');
  assert.equal(hospital.type, 'private_hospital');
  assert.equal(hospital.division, 'Dhaka');
  assert.equal(hospital.district, 'Dhaka');
  assert.equal(hospital.address, '1 Test Road');
  assert.equal(hospital.hotline, '+880 1000-000000');
  assert.equal(hospital.emergencyContact, '+880 1000-000001');
  assert.equal(hospital.directorName, 'Dr. Test');
  assert.equal(hospital.licenseNumber, 'LIC-1');
  assert.equal(hospital.isVerified, true);
  assert.equal(hospital.totalBeds, 100);
  assert.equal(hospital.icuBeds, 10);
  assert.equal(hospital.availableBags, 0);
  assert.equal(hospital.latitude, 23.81);
  assert.equal(hospital.longitude, 90.41);
  assert.deepEqual(hospital.bloodStock, {
    'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0,
  });
});

test('toHospitalOrganizations fills missing optional fields with safe defaults, never invented data', () => {
  const sparse: OrganizationDto = {
    ...baseDto,
    shortCode: null,
    division: null,
    district: null,
    address: null,
    hotline: null,
    emergencyContact: null,
    directorName: null,
    licenseNumber: null,
    totalBeds: null,
    icuBeds: null,
    isVerified: false,
  };
  const [hospital] = toHospitalOrganizations([sparse]);
  assert.equal(hospital.shortCode, '');
  assert.equal(hospital.division, '');
  assert.equal(hospital.district, '');
  assert.equal(hospital.address, '');
  assert.equal(hospital.hotline, '');
  assert.equal(hospital.emergencyContact, '');
  assert.equal(hospital.directorName, '');
  assert.equal(hospital.licenseNumber, '');
  assert.equal(hospital.totalBeds, 0);
  assert.equal(hospital.icuBeds, 0);
  assert.equal(hospital.verifiedBadge, '');
});

test('toHospitalOrganizations keeps the list order and length', () => {
  const second: OrganizationDto = { ...baseDto, id: 'org-2', name: 'Second' };
  const result = toHospitalOrganizations([baseDto, second]);
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((h) => h.id), ['org-1', 'org-2']);
});
