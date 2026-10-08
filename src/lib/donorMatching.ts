import { isCompatibleDonor } from './bloodCompatibility.ts';
import { isEligible } from './eligibility.ts';
import { haversineDistanceKm } from './geo.ts';
import type { BloodGroupValue } from './validation.ts';

export interface MatchDonor {
  id: string;
  bloodGroup: BloodGroupValue;
  area: string | null;
  division: string | null;
  latitude: number | null;
  longitude: number | null;
  isAvailable: boolean;
  lastDonationAt: Date | string | null;
  userId: string | null;
}

export interface MatchRequest {
  bloodGroup: BloodGroupValue;
  area: string | null;
  division: string | null;
  latitude: number | null;
  longitude: number | null;
  userId: string | null;
}

export interface MatchOptions {
  /** Same default as "near me" (WP6). */
  radiusKm?: number;
  now?: Date;
}

const DEFAULT_RADIUS_KM = 50;

const normalize = (text: string | null): string | null => {
  const trimmed = text?.trim().toLowerCase();
  return trimmed ? trimmed : null;
};

/**
 * Real coordinates on both sides → within `radiusKm`. Otherwise an exact, case-insensitive match on
 * `area` or `division`. A request with neither a coordinate nor any area/division text matches nobody
 * — a silent blast to the whole donor base is worse than notifying no one for an under-specified request.
 */
function isNearby(donor: MatchDonor, request: MatchRequest, radiusKm: number): boolean {
  if (donor.latitude != null && donor.longitude != null && request.latitude != null && request.longitude != null) {
    return (
      haversineDistanceKm({ lat: donor.latitude, lng: donor.longitude }, { lat: request.latitude, lng: request.longitude }) <=
      radiusKm
    );
  }

  const requestArea = normalize(request.area);
  const requestDivision = normalize(request.division);
  if (!requestArea && !requestDivision) return false;

  const donorArea = normalize(donor.area);
  const donorDivision = normalize(donor.division);
  if (requestArea && donorArea && requestArea === donorArea) return true;
  if (requestDivision && donorDivision && requestDivision === donorDivision) return true;
  return false;
}

/** Donors who can actually help with `request`: compatible group, available, eligible, not the requester, nearby. */
export function findMatchingDonors(
  donors: readonly MatchDonor[],
  request: MatchRequest,
  options: MatchOptions = {}
): MatchDonor[] {
  const radiusKm = options.radiusKm ?? DEFAULT_RADIUS_KM;
  const now = options.now ?? new Date();

  return donors.filter((donor) => {
    if (!isCompatibleDonor(donor.bloodGroup, request.bloodGroup)) return false;
    if (!donor.isAvailable) return false;
    if (!isEligible(donor.lastDonationAt, now)) return false;
    if (request.userId && donor.userId && request.userId === donor.userId) return false;
    if (!isNearby(donor, request, radiusKm)) return false;
    return true;
  });
}
