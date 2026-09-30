import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleDonorPhone, toSampleDonorDtos, toSampleRequestDtos } from './sampleMapping.ts';

const NOW = new Date('2026-01-01T12:00:00Z');

const donor = (over: object = {}) => ({
  id: 'DON-01', name: 'Tanvir Ahmed', age: 28, gender: 'Male', bloodGroup: 'O+', rhType: 'POS', location: 'Dhanmondi 27', division: 'Dhaka Central',
  distanceKm: 1.2, nearestHospital: 'DMCH', donationCount: 5, rating: 4.9, badge: 'Gold Donor', daysElapsedSinceDonation: 95, isAvailable: true, isOnDuty: true,
  isBdrcsVerified: true, hbLevel: 14.5, weightKg: 70, bloodPressure: '120/80', serologyClear: true, commuteEtaMin: 10, vehicle: 'Personal Motorcycle',
  languages: ['Bangla'], phone: '+880 1712-489021', avatarUrl: 'x', ...over,
});
const demand = (over: object = {}) => ({
  id: 'DEM-01', patientName: 'Child', condition: 'Thalassemia', bloodGroup: 'O+', bagsRequired: 2, bagsPledged: 1, hospital: 'DMCH', hospitalLocation: 'Ward 4',
  distanceKm: 1.8, urgencyWindowText: 'Urgent: Within 2 Hours', windowRemainingSec: 5880, urgencyTag: 'Urgent: Within 2 Hours', verificationBadge: 'Verified',
  attendantPhone: '01712-489021', status: 'active', ...over,
});

test('donors map to the API shape: masked phone, no medical or invented fields', () => {
  const [dto] = toSampleDonorDtos([donor()] as never, NOW);
  assert.equal(dto.id, 'sample-DON-01');
  assert.equal(dto.area, 'Dhanmondi 27');
  assert.equal(dto.lastDonationMonths, 3);
  assert.equal(dto.phoneMasked, '+88017••••9021');
  assert.equal(JSON.stringify(dto).includes('1712'), false, 'no full number');
  assert.deepEqual(Object.keys(dto).sort(), ['age', 'area', 'bloodGroup', 'createdAt', 'division', 'gender', 'id', 'isAvailable', 'lastDonationMonths', 'name', 'nearestHospital', 'phoneMasked', 'vehicle']);
});

test('sample donors keep their order through fixed, decreasing creation times', () => {
  const dtos = toSampleDonorDtos([donor({ id: 'A' }), donor({ id: 'B' })] as never, NOW);
  assert.ok(new Date(dtos[0].createdAt) > new Date(dtos[1].createdAt));
});

test('the full number of a sample donor is only available through the lookup', () => {
  assert.equal(sampleDonorPhone([donor()] as never, 'sample-DON-01'), '+8801712489021');
  assert.equal(sampleDonorPhone([donor()] as never, 'sample-NOPE'), undefined);
});

test('requests map to the API shape', () => {
  const [dto] = toSampleRequestDtos([demand()] as never, [donor()] as never, NOW);
  assert.equal(dto.id, 'sample-DEM-01');
  assert.equal(dto.problem, 'Thalassemia');
  assert.equal(dto.place, 'DMCH');
  assert.equal(dto.area, 'Ward 4');
  assert.equal(dto.bags, 2);
  assert.deepEqual(dto.phones, ['01712489021']);
  assert.equal(dto.bagsPledged, 1);
  assert.equal(dto.responseCount, 1);
  assert.equal(dto.language, 'en');
  assert.equal(dto.isCritical, false);
});

test('a request with answers is "donor found", the same rule as the API', () => {
  assert.equal(toSampleRequestDtos([demand({ bagsPledged: 1 })] as never, [donor()] as never, NOW)[0].status, 'DONOR_FOUND');
  assert.equal(toSampleRequestDtos([demand({ bagsPledged: 0 })] as never, [donor()] as never, NOW)[0].status, 'PENDING');
  assert.equal(toSampleRequestDtos([demand({ status: 'fulfilled', bagsPledged: 2 })] as never, [donor()] as never, NOW)[0].status, 'COMPLETED');
  assert.equal(toSampleRequestDtos([demand({ status: 'in-progress', bagsPledged: 0 })] as never, [donor()] as never, NOW)[0].status, 'DONOR_FOUND');
});

test('critical or P1 wording marks an emergency', () => {
  assert.equal(toSampleRequestDtos([demand({ urgencyTag: 'High Emergency P1' })] as never, [], NOW)[0].isCritical, true);
  assert.equal(toSampleRequestDtos([demand({ urgencyWindowText: 'Critical: Within 6 Hours' })] as never, [], NOW)[0].isCritical, true);
  assert.equal(toSampleRequestDtos([demand({ urgencyTag: 'Priority P2', urgencyWindowText: 'Urgent' })] as never, [], NOW)[0].isCritical, false);
});

test('sample requests get creation times that make the countdown sensible', () => {
  const dtos = toSampleRequestDtos([demand({ id: 'A' }), demand({ id: 'B' })] as never, [], NOW);
  assert.ok(new Date(dtos[0].createdAt) > new Date(dtos[1].createdAt));
  assert.ok(new Date(dtos[0].createdAt) < NOW);
});
