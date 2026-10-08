import type { Donor, EmergencyDemand } from '../types/blood';
import type { DonorDto, RequestDto } from './dtoTypes.ts';
import { isEligible } from './eligibility.ts';
import { maskPhone } from './phoneMask.ts';
import type { RequestStatusValue } from './requestStatus.ts';

/**
 * With no database connected, the screens show the demo data from `src/data/mockData.ts`. These functions turn
 * it into the same shapes the API sends, so a screen has one code path either way. Values the API does not
 * carry (haemoglobin, ratings, distance, ...) are dropped, never invented. Pure: the wrapper that feeds in
 * the real sample data is `src/data/sample.ts`.
 */

const compact = (phone: string) => phone.replace(/[\s-]/g, '');
const HOUR = 3_600_000;
const MINUTE = 60_000;

export function toSampleDonorDtos(donors: readonly Donor[], now: Date = new Date()): DonorDto[] {
  return donors.map((donor, index) => {
    const lastDonationAt = new Date(now.getTime() - donor.daysElapsedSinceDonation * 24 * HOUR);
    return {
      id: `sample-${donor.id}`,
      name: donor.name,
      bloodGroup: donor.bloodGroup,
      area: donor.location,
      division: donor.division,
      age: donor.age,
      gender: donor.gender,
      isAvailable: donor.isAvailable,
      lastDonationMonths: Math.round(donor.daysElapsedSinceDonation / 30),
      lastDonationAt: lastDonationAt.toISOString(),
      isEligible: isEligible(lastDonationAt, now),
      vehicle: donor.vehicle,
      nearestHospital: donor.nearestHospital,
      phoneMasked: maskPhone(donor.phone),
      createdAt: new Date(now.getTime() - (index + 1) * HOUR).toISOString(),
      distanceKm: null,
    };
  });
}

/** The full number of a sample donor, for the "call" button in demo mode. */
export function sampleDonorPhone(donors: readonly Donor[], sampleId: string): string | undefined {
  const id = sampleId.replace(/^sample-/, '');
  const donor = donors.find((candidate) => candidate.id === id);
  return donor ? compact(donor.phone) : undefined;
}

const STATUS: Record<string, RequestStatusValue> = {
  active: 'PENDING',
  'in-progress': 'DONOR_FOUND',
  fulfilled: 'COMPLETED',
};

export function toSampleRequestDtos(demands: readonly EmergencyDemand[], donors: readonly Donor[], now: Date = new Date()): RequestDto[] {
  return demands.map((demand, index) => {
    const answered = donors.slice(index, index + demand.bagsPledged).length;
    const base = STATUS[demand.status] ?? 'PENDING';
    // The same rule the API applies: a request that has been answered is "donor found".
    const status: RequestStatusValue = base === 'PENDING' && answered > 0 ? 'DONOR_FOUND' : base;
    const createdAt = new Date(now.getTime() - (index + 1) * 45 * MINUTE).toISOString();
    const phone = compact(demand.attendantPhone);
    return {
      id: `sample-${demand.id}`,
      area: demand.hospitalLocation,
      problem: demand.condition,
      patientName: demand.patientName,
      patientAge: null,
      attendantName: null,
      bloodGroup: demand.bloodGroup,
      bags: demand.bagsRequired,
      bagsPledged: demand.bagsPledged,
      place: demand.hospital,
      phones: [phone],
      isCritical: /critical|p1/i.test(`${demand.urgencyWindowText} ${demand.urgencyTag}`),
      status,
      language: 'en',
      postText: `Emergency blood needed\n🩸Blood group : ${demand.bloodGroup}\n💉Amount : ${demand.bagsRequired} bag(s)\n🏘Donation place : ${demand.hospital}\n☎Contact : ${phone}`,
      createdAt,
      updatedAt: createdAt,
      completedAt: status === 'COMPLETED' ? createdAt : null,
      responseCount: demand.bagsPledged,
      latitude: null,
      longitude: null,
      distanceKm: null,
    };
  });
}
