import { isValidBdPhone } from '../utils/phone.ts';
import { isPermission, normalizePermissions, type Permission } from './permissions.ts';
import { REQUEST_STATUSES, type RequestStatusValue } from './requestStatus.ts';

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroupValue = (typeof BLOOD_GROUPS)[number];

/** Values of the `BloodGroup` enum in `prisma/schema.prisma`. */
export const DB_BLOOD_GROUP: Record<BloodGroupValue, string> = {
  'A+': 'A_POS',
  'A-': 'A_NEG',
  'B+': 'B_POS',
  'B-': 'B_NEG',
  'AB+': 'AB_POS',
  'AB-': 'AB_NEG',
  'O+': 'O_POS',
  'O-': 'O_NEG',
};

/** `error` is null on success, otherwise the name of the first field that failed (and `value` is null). */
export type ParseResult<T> = { value: T; error: null } | { value: null; error: string };

export interface DonorInput {
  name: string;
  phone: string;
  bloodGroup: BloodGroupValue;
  area: string;
  age?: number;
  gender?: 'Male' | 'Female';
  division?: string;
  email?: string;
  weightKg?: number;
  lastDonationMonths?: number;
  vehicle?: string;
  nearestHospital?: string;
  isAvailable: boolean;
  latitude?: number;
  longitude?: number;
}

export interface SosInput {
  area?: string;
  problem?: string;
  patientName?: string;
  patientAge?: number;
  attendantName?: string;
  bloodGroup: BloodGroupValue;
  bags: number;
  place: string;
  phones: string[];
  isCritical: boolean;
  language: 'bn' | 'en';
  postText: string;
  latitude?: number;
  longitude?: number;
}

type Raw = Record<string, unknown>;

const isObject = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value);
const isBloodGroup = (value: unknown): value is BloodGroupValue => (BLOOD_GROUPS as readonly unknown[]).includes(value);
const compactPhone = (value: string) => value.replace(/[\s-]/g, '');

/** A trimmed string within [min, max] characters, or null when it is missing or out of range. */
function text(value: unknown, min: number, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length >= min && trimmed.length <= max ? trimmed : null;
}

/** undefined when the field is absent, null when present but invalid, else the trimmed text. */
function optionalText(value: unknown, max: number): string | undefined | null {
  if (value === undefined || value === null || value === '') return undefined;
  return text(value, 1, max);
}

/** A person's name, 2 to 80 characters. undefined when absent, null when present but invalid. */
function optionalPersonName(value: unknown): string | undefined | null {
  if (value === undefined || value === null || value === '') return undefined;
  return text(value, 2, 80);
}

function optionalInt(value: unknown, min: number, max: number): number | undefined | null {
  if (value === undefined || value === null) return undefined;
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : null;
}

/**
 * `latitude`/`longitude` from a POST body: both present and valid, or both absent. Never one without
 * the other (a lone coordinate isn't a usable point). `null` means invalid input, not "absent".
 */
function optionalLatLng(raw: Raw): { latitude?: number; longitude?: number } | null {
  const hasLat = raw.latitude !== undefined && raw.latitude !== null;
  const hasLng = raw.longitude !== undefined && raw.longitude !== null;
  if (!hasLat && !hasLng) return {};
  if (hasLat !== hasLng) return null;
  const { latitude, longitude } = raw;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

export function parseDonorInput(raw: unknown): ParseResult<DonorInput> {
  if (!isObject(raw)) return { value: null, error: 'body' };

  const name = text(raw.name, 2, 80);
  if (name === null) return { value: null, error: 'name' };
  if (typeof raw.phone !== 'string' || !isValidBdPhone(raw.phone)) return { value: null, error: 'phone' };
  if (!isBloodGroup(raw.bloodGroup)) return { value: null, error: 'bloodGroup' };
  const area = text(raw.area, 2, 120);
  if (area === null) return { value: null, error: 'area' };

  const age = optionalInt(raw.age, 16, 80);
  if (age === null) return { value: null, error: 'age' };
  if (raw.gender !== undefined && raw.gender !== 'Male' && raw.gender !== 'Female') return { value: null, error: 'gender' };
  const division = optionalText(raw.division, 60);
  if (division === null) return { value: null, error: 'division' };
  const email = optionalText(raw.email, 120);
  if (email === null || (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return { value: null, error: 'email' };
  const weightKg = optionalInt(raw.weightKg, 30, 200);
  if (weightKg === null) return { value: null, error: 'weightKg' };
  const lastDonationMonths = optionalInt(raw.lastDonationMonths, 0, 600);
  if (lastDonationMonths === null) return { value: null, error: 'lastDonationMonths' };
  const vehicle = optionalText(raw.vehicle, 60);
  if (vehicle === null) return { value: null, error: 'vehicle' };
  const nearestHospital = optionalText(raw.nearestHospital, 120);
  if (nearestHospital === null) return { value: null, error: 'nearestHospital' };
  if (raw.isAvailable !== undefined && typeof raw.isAvailable !== 'boolean') return { value: null, error: 'isAvailable' };
  const latLng = optionalLatLng(raw);
  if (latLng === null) return { value: null, error: 'latitude' };

  return {
    error: null,
    value: {
      name,
      phone: compactPhone(raw.phone),
      bloodGroup: raw.bloodGroup,
      area,
      age,
      gender: raw.gender as DonorInput['gender'],
      division,
      email,
      weightKg,
      lastDonationMonths,
      vehicle,
      nearestHospital,
      isAvailable: (raw.isAvailable as boolean | undefined) ?? true,
      ...latLng,
    },
  };
}

export function parseSosInput(raw: unknown): ParseResult<SosInput> {
  if (!isObject(raw)) return { value: null, error: 'body' };

  if (!isBloodGroup(raw.bloodGroup)) return { value: null, error: 'bloodGroup' };
  if (typeof raw.bags !== 'number' || !Number.isInteger(raw.bags) || raw.bags < 1 || raw.bags > 8) return { value: null, error: 'bags' };
  const place = text(raw.place, 2, 160);
  if (place === null) return { value: null, error: 'place' };
  if (!Array.isArray(raw.phones) || raw.phones.length < 1 || raw.phones.length > 2) return { value: null, error: 'phones' };
  if (!raw.phones.every((phone) => typeof phone === 'string' && isValidBdPhone(phone))) return { value: null, error: 'phones' };
  const area = optionalText(raw.area, 120);
  if (area === null) return { value: null, error: 'area' };
  const problem = optionalText(raw.problem, 120);
  if (problem === null) return { value: null, error: 'problem' };
  const patientName = optionalPersonName(raw.patientName);
  if (patientName === null) return { value: null, error: 'patientName' };
  const patientAge = optionalInt(raw.patientAge, 0, 120);
  if (patientAge === null) return { value: null, error: 'patientAge' };
  const attendantName = optionalPersonName(raw.attendantName);
  if (attendantName === null) return { value: null, error: 'attendantName' };
  if (raw.isCritical !== undefined && typeof raw.isCritical !== 'boolean') return { value: null, error: 'isCritical' };
  if (raw.language !== undefined && raw.language !== 'bn' && raw.language !== 'en') return { value: null, error: 'language' };
  const postText = text(raw.postText, 1, 1000);
  if (postText === null) return { value: null, error: 'postText' };
  const latLng = optionalLatLng(raw);
  if (latLng === null) return { value: null, error: 'latitude' };

  return {
    error: null,
    value: {
      area,
      problem,
      patientName,
      patientAge,
      attendantName,
      bloodGroup: raw.bloodGroup,
      bags: raw.bags,
      place,
      phones: (raw.phones as string[]).map(compactPhone),
      isCritical: (raw.isCritical as boolean | undefined) ?? true,
      language: (raw.language as SosInput['language'] | undefined) ?? 'bn',
      postText,
      ...latLng,
    },
  };
}

export interface GrantInput {
  email: string;
  roleId: string;
  /** Only for roles tied to one hospital; whether it is needed is decided by the role, not here. */
  hospitalId: string | null;
}

/** An admin gives someone a role by email. `hospitalIds` are the hospitals that exist. */
export function parseGrantInput(raw: unknown, hospitalIds: readonly string[]): ParseResult<GrantInput> {
  if (!isObject(raw)) return { value: null, error: 'body' };

  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  if (email.length === 0 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { value: null, error: 'email' };
  }
  const roleId = text(raw.roleId, 1, 64);
  if (roleId === null) return { value: null, error: 'roleId' };

  let hospitalId: string | null = null;
  if (raw.hospitalId !== undefined && raw.hospitalId !== null && raw.hospitalId !== '') {
    if (typeof raw.hospitalId !== 'string' || !hospitalIds.includes(raw.hospitalId)) return { value: null, error: 'hospitalId' };
    hospitalId = raw.hospitalId;
  }
  return { error: null, value: { email, roleId, hospitalId } };
}

export interface RoleValue {
  name: string;
  description: string | null;
  permissions: Permission[];
}

/** A role an admin creates or edits: a name, an optional description and a choice of permissions. */
export function parseRoleInput(raw: unknown): ParseResult<RoleValue> {
  if (!isObject(raw)) return { value: null, error: 'body' };

  const name = text(raw.name, 2, 40);
  if (name === null) return { value: null, error: 'name' };
  const description = optionalText(raw.description, 200);
  if (description === null) return { value: null, error: 'description' };

  if (!Array.isArray(raw.permissions) || raw.permissions.length === 0 || !raw.permissions.every(isPermission)) {
    return { value: null, error: 'permissions' };
  }
  return { error: null, value: { name, description: description ?? null, permissions: normalizePermissions(raw.permissions) } };
}

export interface StockInput {
  bloodGroup: BloodGroupValue;
  units: number;
}

export function parseStockInput(raw: unknown): ParseResult<StockInput> {
  if (!isObject(raw)) return { value: null, error: 'body' };
  if (!isBloodGroup(raw.bloodGroup)) return { value: null, error: 'bloodGroup' };
  if (typeof raw.units !== 'number' || !Number.isInteger(raw.units) || raw.units < 0 || raw.units > 9999) {
    return { value: null, error: 'units' };
  }
  return { error: null, value: { bloodGroup: raw.bloodGroup, units: raw.units } };
}

/** The reverse of DB_BLOOD_GROUP: database enum value to the blood group shown in the app. */
export const BLOOD_GROUP_FROM_DB: Record<string, BloodGroupValue> = Object.fromEntries(
  BLOOD_GROUPS.map((group) => [DB_BLOOD_GROUP[group], group])
);

export interface RespondInput {
  name: string;
  /** Normalised: spaces and dashes removed. */
  phone: string;
}

/** Someone answers a blood request with "I can donate". */
export function parseRespondInput(raw: unknown): ParseResult<RespondInput> {
  if (!isObject(raw)) return { value: null, error: 'body' };
  const name = text(raw.name, 2, 80);
  if (name === null) return { value: null, error: 'name' };
  if (typeof raw.phone !== 'string' || !isValidBdPhone(raw.phone)) return { value: null, error: 'phone' };
  return { error: null, value: { name, phone: compactPhone(raw.phone) } };
}

/** A request's new status. Whether the move is allowed is decided by `canTransition`. */
export function parseStatusInput(raw: unknown): ParseResult<{ status: RequestStatusValue }> {
  if (!isObject(raw)) return { value: null, error: 'body' };
  if (typeof raw.status !== 'string' || !(REQUEST_STATUSES as readonly string[]).includes(raw.status)) {
    return { value: null, error: 'status' };
  }
  return { error: null, value: { status: raw.status as RequestStatusValue } };
}

export interface DonorUpdateInput {
  name?: string;
  area?: string;
  division?: string;
  age?: number;
  gender?: 'Male' | 'Female';
  vehicle?: string;
  nearestHospital?: string;
  isAvailable?: boolean;
  lastDonationMonths?: number;
  latitude?: number;
  longitude?: number;
}

/** Any subset of a donor's editable fields. Whether the caller may apply it is `donorAccess.ts`'s job. */
export function parseDonorUpdateInput(raw: unknown): ParseResult<DonorUpdateInput> {
  if (!isObject(raw)) return { value: null, error: 'body' };
  const value: DonorUpdateInput = {};

  if (raw.name !== undefined) {
    const name = text(raw.name, 2, 80);
    if (name === null) return { value: null, error: 'name' };
    value.name = name;
  }
  if (raw.area !== undefined) {
    const area = text(raw.area, 2, 120);
    if (area === null) return { value: null, error: 'area' };
    value.area = area;
  }
  if (raw.division !== undefined) {
    const division = optionalText(raw.division, 60);
    if (division === null) return { value: null, error: 'division' };
    if (division !== undefined) value.division = division;
  }
  if (raw.age !== undefined) {
    const age = optionalInt(raw.age, 16, 80);
    if (age === null) return { value: null, error: 'age' };
    if (age !== undefined) value.age = age;
  }
  if (raw.gender !== undefined) {
    if (raw.gender !== 'Male' && raw.gender !== 'Female') return { value: null, error: 'gender' };
    value.gender = raw.gender;
  }
  if (raw.vehicle !== undefined) {
    const vehicle = optionalText(raw.vehicle, 60);
    if (vehicle === null) return { value: null, error: 'vehicle' };
    if (vehicle !== undefined) value.vehicle = vehicle;
  }
  if (raw.nearestHospital !== undefined) {
    const nearestHospital = optionalText(raw.nearestHospital, 120);
    if (nearestHospital === null) return { value: null, error: 'nearestHospital' };
    if (nearestHospital !== undefined) value.nearestHospital = nearestHospital;
  }
  if (raw.isAvailable !== undefined) {
    if (typeof raw.isAvailable !== 'boolean') return { value: null, error: 'isAvailable' };
    value.isAvailable = raw.isAvailable;
  }
  if (raw.lastDonationMonths !== undefined) {
    const lastDonationMonths = optionalInt(raw.lastDonationMonths, 0, 600);
    if (lastDonationMonths === null) return { value: null, error: 'lastDonationMonths' };
    if (lastDonationMonths !== undefined) value.lastDonationMonths = lastDonationMonths;
  }
  if (raw.latitude !== undefined || raw.longitude !== undefined) {
    const latLng = optionalLatLng(raw);
    if (latLng === null) return { value: null, error: 'latitude' };
    Object.assign(value, latLng);
  }

  if (Object.keys(value).length === 0) return { value: null, error: 'body' };
  return { error: null, value };
}

const ORGANIZATION_TYPES = ['government_hospital', 'private_hospital', 'volunteer_org', 'blood_bank'] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export interface OrganizationApplyInput {
  name: string;
  type: OrganizationType;
  address: string;
  licenseNumber: string;
  division?: string;
  district?: string;
  hotline?: string;
  emergencyContact?: string;
  directorName?: string;
  totalBeds?: number;
  icuBeds?: number;
  latitude?: number;
  longitude?: number;
}

/** A new organization's public application. Starts `pending`; an admin decides (`panel.hospitals`). */
export function parseOrganizationApplyInput(raw: unknown): ParseResult<OrganizationApplyInput> {
  if (!isObject(raw)) return { value: null, error: 'body' };

  const name = text(raw.name, 2, 160);
  if (name === null) return { value: null, error: 'name' };
  if (typeof raw.type !== 'string' || !(ORGANIZATION_TYPES as readonly string[]).includes(raw.type)) {
    return { value: null, error: 'type' };
  }
  const address = text(raw.address, 5, 200);
  if (address === null) return { value: null, error: 'address' };
  const licenseNumber = text(raw.licenseNumber, 2, 80);
  if (licenseNumber === null) return { value: null, error: 'licenseNumber' };

  const value: OrganizationApplyInput = { name, type: raw.type as OrganizationType, address, licenseNumber };

  const division = optionalText(raw.division, 60);
  if (division === null) return { value: null, error: 'division' };
  if (division !== undefined) value.division = division;
  const district = optionalText(raw.district, 60);
  if (district === null) return { value: null, error: 'district' };
  if (district !== undefined) value.district = district;
  const hotline = optionalText(raw.hotline, 30);
  if (hotline === null) return { value: null, error: 'hotline' };
  if (hotline !== undefined) value.hotline = hotline;
  const emergencyContact = optionalText(raw.emergencyContact, 30);
  if (emergencyContact === null) return { value: null, error: 'emergencyContact' };
  if (emergencyContact !== undefined) value.emergencyContact = emergencyContact;
  const directorName = optionalText(raw.directorName, 80);
  if (directorName === null) return { value: null, error: 'directorName' };
  if (directorName !== undefined) value.directorName = directorName;
  const totalBeds = optionalInt(raw.totalBeds, 0, 20_000);
  if (totalBeds === null) return { value: null, error: 'totalBeds' };
  if (totalBeds !== undefined) value.totalBeds = totalBeds;
  const icuBeds = optionalInt(raw.icuBeds, 0, 5_000);
  if (icuBeds === null) return { value: null, error: 'icuBeds' };
  if (icuBeds !== undefined) value.icuBeds = icuBeds;
  const latLng = optionalLatLng(raw);
  if (latLng === null) return { value: null, error: 'latitude' };
  Object.assign(value, latLng);

  return { error: null, value };
}

const ORGANIZATION_DECISIONS = ['approve', 'reject'] as const;
export type OrganizationDecision = (typeof ORGANIZATION_DECISIONS)[number];

/** An admin's decision on a pending organization application. */
export function parseOrganizationDecisionInput(raw: unknown): ParseResult<{ decision: OrganizationDecision }> {
  if (!isObject(raw)) return { value: null, error: 'body' };
  if (typeof raw.decision !== 'string' || !(ORGANIZATION_DECISIONS as readonly string[]).includes(raw.decision)) {
    return { value: null, error: 'decision' };
  }
  return { error: null, value: { decision: raw.decision as OrganizationDecision } };
}

const FRAUD_RESOLUTIONS = ['banned', 'dismissed'] as const;
export type FraudResolution = (typeof FRAUD_RESOLUTIONS)[number];

/** How a pending fraud incident is resolved. `pending` and `throttled` are not resolutions. */
export function parseFraudStatusInput(raw: unknown): ParseResult<{ status: FraudResolution }> {
  if (!isObject(raw)) return { value: null, error: 'body' };
  if (typeof raw.status !== 'string' || !(FRAUD_RESOLUTIONS as readonly string[]).includes(raw.status)) {
    return { value: null, error: 'status' };
  }
  return { error: null, value: { status: raw.status as FraudResolution } };
}

/** Anything with `.get(name)`, such as `URLSearchParams`. */
interface Params {
  get(name: string): string | null;
}

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;

/** Page numbers and sizes are clamped rather than rejected: a bad one just gives the nearest valid page. */
function readPaging(params: Params): { page: number; pageSize: number } {
  const page = Number.parseInt(params.get('page') ?? '', 10);
  const size = Number.parseInt(params.get('pageSize') ?? '', 10);
  return {
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, 100_000) : 1,
    pageSize: Number.isFinite(size) ? Math.min(Math.max(size, 1), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE,
  };
}

const readFlag = (value: string | null): boolean => value === 'true' || value === '1';

export interface NearQuery {
  lat: number;
  lng: number;
  radiusKm: number;
}

const DEFAULT_RADIUS_KM = 50;
const MAX_RADIUS_KM = 2000;

/**
 * `lat`/`lng`/optional `radiusKm` (default 50km) for "near me" sorting. Absent entirely → no filter
 * (`undefined`, same as every list behaves today). Present but malformed → a hard error, same as
 * `bloodGroup`/`status` above, not silently clamped like paging.
 */
function readNear(params: Params): ParseResult<NearQuery | undefined> {
  const latRaw = params.get('lat');
  const lngRaw = params.get('lng');
  if (latRaw === null && lngRaw === null) return { error: null, value: undefined };

  const lat = latRaw === null ? NaN : Number.parseFloat(latRaw);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { value: null, error: 'lat' };
  const lng = lngRaw === null ? NaN : Number.parseFloat(lngRaw);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return { value: null, error: 'lng' };

  const radiusRaw = params.get('radiusKm');
  let radiusKm = DEFAULT_RADIUS_KM;
  if (radiusRaw !== null) {
    const parsed = Number.parseFloat(radiusRaw);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_RADIUS_KM) return { value: null, error: 'radiusKm' };
    radiusKm = parsed;
  }

  return { error: null, value: { lat, lng, radiusKm } };
}

export interface DonorQuery {
  bloodGroup: BloodGroupValue | undefined;
  q: string | undefined;
  available: boolean;
  /** Only the signed-in person's own donor profiles. */
  mine: boolean;
  /** "Near me": sort by distance from this point instead of newest-first. */
  near: NearQuery | undefined;
  page: number;
  pageSize: number;
}

/** `GET /api/donors` filters. */
export function parseDonorQuery(params: Params): ParseResult<DonorQuery> {
  const group = params.get('bloodGroup');
  if (group !== null && group !== '' && !isBloodGroup(group)) return { value: null, error: 'bloodGroup' };
  const q = (params.get('q') ?? '').trim().slice(0, 60);
  const near = readNear(params);
  if (near.error) return { value: null, error: near.error };
  return {
    error: null,
    value: {
      bloodGroup: group ? (group as BloodGroupValue) : undefined,
      q: q || undefined,
      available: readFlag(params.get('available')),
      mine: readFlag(params.get('mine')),
      near: near.value,
      ...readPaging(params),
    },
  };
}

export interface RequestQuery {
  status: RequestStatusValue | undefined;
  emergency: boolean;
  bloodGroup: BloodGroupValue | undefined;
  /** Request ids, for showing "my requests" from this browser. At most 50. */
  ids: string[] | undefined;
  /** Only the signed-in person's own requests. */
  mine: boolean;
  /** "Near me": sort by distance from this point instead of newest-first. */
  near: NearQuery | undefined;
  page: number;
  pageSize: number;
}

const MAX_IDS = 50;

/** `GET /api/requests` filters. */
export function parseRequestQuery(params: Params): ParseResult<RequestQuery> {
  const status = params.get('status');
  if (status !== null && status !== '' && !(REQUEST_STATUSES as readonly string[]).includes(status)) {
    return { value: null, error: 'status' };
  }
  const group = params.get('bloodGroup');
  if (group !== null && group !== '' && !isBloodGroup(group)) return { value: null, error: 'bloodGroup' };
  const near = readNear(params);
  if (near.error) return { value: null, error: near.error };

  const ids = [
    ...new Set(
      (params.get('ids') ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0 && id.length <= 64 && /^[\w-]+$/.test(id))
    ),
  ].slice(0, MAX_IDS);

  return {
    error: null,
    value: {
      status: status ? (status as RequestStatusValue) : undefined,
      emergency: readFlag(params.get('emergency')),
      bloodGroup: group ? (group as BloodGroupValue) : undefined,
      ids: ids.length > 0 ? ids : undefined,
      mine: readFlag(params.get('mine')),
      near: near.value,
      ...readPaging(params),
    },
  };
}

export interface OrganizationQuery {
  /** "Near me" / nearest-hospital: sort by distance from this point instead of the default order. */
  near: NearQuery | undefined;
}

/** `GET /api/organizations` filters. */
export function parseOrganizationQuery(params: Params): ParseResult<OrganizationQuery> {
  const near = readNear(params);
  if (near.error) return { value: null, error: near.error };
  return { error: null, value: { near: near.value } };
}
