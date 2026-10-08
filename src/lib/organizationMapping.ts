import { BLOOD_GROUPS } from './validation.ts';
import type { OrganizationDto } from './dtoTypes.ts';
import type { BloodGroup, HospitalOrganization } from '../types/blood';

const EMPTY_STOCK: Record<BloodGroup, number> = Object.fromEntries(
  BLOOD_GROUPS.map((group) => [group, 0])
) as Record<BloodGroup, number>;

const HOSPITAL_TYPES: HospitalOrganization['type'][] = [
  'government_hospital', 'private_hospital', 'volunteer_org', 'blood_bank',
];

/**
 * Real `Organization` rows, shaped like the screens' `HospitalOrganization` type. Blood stock starts at
 * zero (the caller merges real `HospitalStock` over it, same as the sample data). Cold-chain telemetry,
 * the audit date and the verification badge text have no real source yet (same rule as the dashboards
 * work), so they stay blank/placeholder rather than invented — the screens fall back to a translated
 * label when they're blank.
 */
export function toHospitalOrganizations(orgs: readonly OrganizationDto[]): HospitalOrganization[] {
  return orgs.map((org) => ({
    id: org.id,
    name: org.name,
    shortCode: org.shortCode ?? '',
    type: HOSPITAL_TYPES.includes(org.type as HospitalOrganization['type'])
      ? (org.type as HospitalOrganization['type'])
      : 'volunteer_org',
    division: org.division ?? '',
    district: org.district ?? '',
    address: org.address ?? '',
    hotline: org.hotline ?? '',
    emergencyContact: org.emergencyContact ?? '',
    directorName: org.directorName ?? '',
    licenseNumber: org.licenseNumber ?? '',
    isVerified: org.isVerified,
    verifiedBadge: '',
    totalBeds: org.totalBeds ?? 0,
    icuBeds: org.icuBeds ?? 0,
    availableBags: 0,
    bloodStock: { ...EMPTY_STOCK },
    // No real cold-chain sensor or audit-log source exists yet (same rule as the dashboards work):
    // one fixed placeholder shown for every real organization, never a per-org invented number.
    coldStorageTempC: 4.0,
    coldStorageStatus: 'optimal',
    lastAuditDate: '—',
    latitude: org.latitude,
    longitude: org.longitude,
  }));
}
