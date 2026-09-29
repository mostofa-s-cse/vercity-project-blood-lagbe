import { isValidBdPhone } from '../utils/phone.ts';

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
}

export interface SosInput {
  area?: string;
  problem?: string;
  bloodGroup: BloodGroupValue;
  bags: number;
  place: string;
  phones: string[];
  isCritical: boolean;
  language: 'bn' | 'en';
  postText: string;
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

function optionalInt(value: unknown, min: number, max: number): number | undefined | null {
  if (value === undefined || value === null) return undefined;
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : null;
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
  if (raw.isCritical !== undefined && typeof raw.isCritical !== 'boolean') return { value: null, error: 'isCritical' };
  if (raw.language !== undefined && raw.language !== 'bn' && raw.language !== 'en') return { value: null, error: 'language' };
  const postText = text(raw.postText, 1, 1000);
  if (postText === null) return { value: null, error: 'postText' };

  return {
    error: null,
    value: {
      area,
      problem,
      bloodGroup: raw.bloodGroup,
      bags: raw.bags,
      place,
      phones: (raw.phones as string[]).map(compactPhone),
      isCritical: (raw.isCritical as boolean | undefined) ?? true,
      language: (raw.language as SosInput['language'] | undefined) ?? 'bn',
      postText,
    },
  };
}
