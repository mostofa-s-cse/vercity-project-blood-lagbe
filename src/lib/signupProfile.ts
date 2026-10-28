import { isValidBdPhone } from '../utils/phone.ts';
import { BLOOD_GROUPS, type BloodGroupValue } from './validation.ts';

/**
 * What sign-up asks for besides email and password. Name and phone are required (they pre-fill the
 * "I can donate" form and the donor registration); the rest is optional and feeds the donor profile and
 * the Passport. Stored in the Supabase user's `user_metadata`, so no database change is needed.
 */
export interface SignupProfile {
  name: string;
  phone: string;
  bloodGroup: BloodGroupValue | null;
  age: number | null;
  area: string | null;
}

/** The sign-up form's values as typed (strings); `parseSignupProfile` checks them on the server. */
export interface SignupProfileInput {
  name: string;
  phone: string;
  bloodGroup?: string;
  age?: string;
  area?: string;
}

/** The same fields as read back from `user_metadata`: any of them may be missing there. */
export interface StoredProfile {
  name: string | null;
  phone: string | null;
  bloodGroup: BloodGroupValue | null;
  age: number | null;
  area: string | null;
}

export const SIGNUP_MIN_AGE = 18;
export const SIGNUP_MAX_AGE = 65;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isBloodGroup = (value: unknown): value is BloodGroupValue => (BLOOD_GROUPS as readonly unknown[]).includes(value);

/** 01XXXXXXXXX, however it was typed (+88, 88, spaces, dashes). Call only after `isValidBdPhone`. */
export function normalizeBdPhone(value: string): string {
  return value.replace(/[\s-]/g, '').replace(/^\+?88/, '');
}

const blank = (value: unknown): boolean => value === undefined || value === null || (typeof value === 'string' && !value.trim());

/** `error` is null on success, else the first field that failed (`value` is then null). */
export function parseSignupProfile(raw: unknown): { value: SignupProfile | null; error: string | null } {
  if (!isObject(raw)) return { value: null, error: 'body' };

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (name.length < 2 || name.length > 80) return { value: null, error: 'name' };
  if (typeof raw.phone !== 'string' || !isValidBdPhone(raw.phone)) return { value: null, error: 'phone' };

  let bloodGroup: BloodGroupValue | null = null;
  if (!blank(raw.bloodGroup)) {
    if (!isBloodGroup(raw.bloodGroup)) return { value: null, error: 'bloodGroup' };
    bloodGroup = raw.bloodGroup;
  }

  let age: number | null = null;
  if (!blank(raw.age)) {
    const parsed = typeof raw.age === 'number' ? raw.age : Number(String(raw.age).trim());
    if (!Number.isInteger(parsed) || parsed < SIGNUP_MIN_AGE || parsed > SIGNUP_MAX_AGE) return { value: null, error: 'age' };
    age = parsed;
  }

  let area: string | null = null;
  if (!blank(raw.area)) {
    if (typeof raw.area !== 'string' || raw.area.trim().length > 120) return { value: null, error: 'area' };
    area = raw.area.trim();
  }

  return { value: { name, phone: normalizeBdPhone(raw.phone), bloodGroup, age, area }, error: null };
}

/** The `user_metadata` keys. `name` also feeds the existing `profiles.name` sync. */
export function profileToMetadata(profile: SignupProfile): Record<string, unknown> {
  return {
    name: profile.name,
    phone: profile.phone,
    ...(profile.bloodGroup ? { blood_group: profile.bloodGroup } : {}),
    ...(profile.age !== null ? { age: profile.age } : {}),
    ...(profile.area ? { area: profile.area } : {}),
  };
}

/** Reads the fields back from `user_metadata`, dropping anything that does not look right. */
export function profileFromMetadata(meta: Record<string, unknown> | null | undefined): StoredProfile {
  const m = meta ?? {};
  const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    name: text(m.full_name) ?? text(m.name),
    phone: text(m.phone),
    bloodGroup: isBloodGroup(m.blood_group) ? m.blood_group : null,
    age: typeof m.age === 'number' && Number.isInteger(m.age) ? m.age : null,
    area: text(m.area),
  };
}
