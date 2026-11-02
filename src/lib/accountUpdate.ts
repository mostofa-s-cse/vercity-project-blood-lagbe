import { isValidBdPhone } from '../utils/phone.ts';
import { normalizePhoneForAuth } from './phoneAuth.ts';
import { normalizeBdPhone } from './signupProfile.ts';

/**
 * Editing your own account: name, phone and email. Every field is optional, but one must be sent. A new
 * email or phone is trusted as typed (marked confirmed, no link or SMS), the same way sign-up works here
 * (src/lib/emailAuth.ts, src/lib/phoneAuth.ts), and it is what the person signs in with from then on.
 */
export interface AccountUpdate {
  name?: string;
  phone?: string;
  email?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** `error` is null on success, else the first field that failed ('body', 'empty', 'name', 'phone', 'email'). */
export function parseAccountUpdate(raw: unknown): { value: AccountUpdate | null; error: string | null } {
  if (!isObject(raw)) return { value: null, error: 'body' };
  const value: AccountUpdate = {};

  if (raw.name !== undefined) {
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (name.length < 2 || name.length > 80) return { value: null, error: 'name' };
    value.name = name;
  }
  if (raw.phone !== undefined) {
    if (typeof raw.phone !== 'string' || !isValidBdPhone(raw.phone)) return { value: null, error: 'phone' };
    value.phone = normalizeBdPhone(raw.phone);
  }
  if (raw.email !== undefined) {
    const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
    if (!EMAIL_RE.test(email) || email.length > 254) return { value: null, error: 'email' };
    value.email = email;
  }

  if (Object.keys(value).length === 0) return { value: null, error: 'empty' };
  return { value, error: null };
}

/** The admin API surface this needs; narrow so tests can pass a fake. */
export interface AccountAdmin {
  getUserById(id: string): Promise<{
    data: { user: { id: string; user_metadata?: Record<string, unknown> | null } | null };
    error: { message: string } | null;
  }>;
  updateUserById(
    id: string,
    attrs: {
      email?: string;
      email_confirm?: true;
      phone?: string;
      phone_confirm?: true;
      user_metadata?: Record<string, unknown>;
    }
  ): Promise<{ error: { message: string } | null }>;
}

export type AccountUpdateResult = { ok: true } | { ok: false; error: 'not_found' | 'email_taken' | 'phone_taken' | 'update_failed' };

export async function updateAccount(admin: AccountAdmin, userId: string, update: AccountUpdate): Promise<AccountUpdateResult> {
  const existing = await admin.getUserById(userId);
  if (existing.error || !existing.data.user) return { ok: false, error: existing.error ? 'update_failed' : 'not_found' };

  const attrs: Parameters<AccountAdmin['updateUserById']>[1] = {};
  if (update.email) {
    attrs.email = update.email;
    attrs.email_confirm = true;
  }
  if (update.phone) {
    attrs.phone = normalizePhoneForAuth(update.phone);
    attrs.phone_confirm = true;
  }
  if (update.name || update.phone) {
    attrs.user_metadata = {
      ...(existing.data.user.user_metadata ?? {}),
      ...(update.name ? { name: update.name } : {}),
      ...(update.phone ? { phone: update.phone } : {}),
    };
  }

  const { error } = await admin.updateUserById(userId, attrs);
  if (!error) return { ok: true };
  if (/already|registered|exists|duplicate/i.test(error.message)) {
    const phoneClash = /phone/i.test(error.message) || (update.phone !== undefined && update.email === undefined);
    return { ok: false, error: phoneClash ? 'phone_taken' : 'email_taken' };
  }
  return { ok: false, error: 'update_failed' };
}
