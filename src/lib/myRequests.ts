/**
 * The blood requests this browser made, with the one-time manage token of each, so the person can complete
 * or cancel them later without an account. Kept in the browser's local storage; the server only ever
 * stores a hash of the token. All functions take the storage as an argument (and accept null) so they can
 * be tested, and none of them throws when storage is blocked (private windows, blocked site data).
 */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface RememberedRequest {
  id: string;
  token: string;
}

const KEY = 'bloodlagbe.myRequests';
export const MAX_REMEMBERED = 50;

/** The browser's local storage, or null when it is missing or blocked. */
export function browserStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Newest first. Damaged entries are skipped. */
export function readMyRequests(storage: StorageLike | null): RememberedRequest[] {
  if (!storage) return [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is RememberedRequest =>
        typeof entry === 'object' && entry !== null && typeof entry.id === 'string' && entry.id !== '' && typeof entry.token === 'string' && entry.token !== ''
    );
  } catch {
    return [];
  }
}

function write(storage: StorageLike | null, entries: RememberedRequest[]): void {
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_REMEMBERED)));
  } catch {
    // Storage full or blocked: the request still exists, the person just cannot manage it from this browser.
  }
}

/** Adds (or refreshes) a request at the front; older ones beyond the limit are dropped. */
export function rememberRequest(storage: StorageLike | null, entry: RememberedRequest): void {
  write(storage, [entry, ...readMyRequests(storage).filter((existing) => existing.id !== entry.id)]);
}

export function forgetRequest(storage: StorageLike | null, id: string): void {
  write(storage, readMyRequests(storage).filter((entry) => entry.id !== id));
}

export function tokenFor(storage: StorageLike | null, id: string): string | undefined {
  return readMyRequests(storage).find((entry) => entry.id === id)?.token;
}
