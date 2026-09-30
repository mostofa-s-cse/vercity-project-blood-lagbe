import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * A person who makes a blood request without an account gets a one-time "manage token" so they can mark
 * it completed or cancel it later. Only its SHA-256 hash is stored, so a copy of the database cannot be
 * used to manage anyone's request. Server-side only (uses node:crypto).
 */

/** 256 random bits, URL-safe. */
export function newManageToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** True when `token` is the one that produced `storedHash`. Missing or malformed input never matches. */
export function tokenMatches(token: string | null | undefined, storedHash: string | null | undefined): boolean {
  if (!token || !storedHash || !/^[0-9a-f]{64}$/.test(storedHash)) return false;
  return timingSafeEqual(Buffer.from(hashToken(token), 'hex'), Buffer.from(storedHash, 'hex'));
}
