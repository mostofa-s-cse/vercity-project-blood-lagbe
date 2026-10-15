import type { ParseResult } from './validation.ts';

/**
 * Who actually gave blood when a request is completed, and the traceable code of each donation.
 * Pure rules only; the route and the database live in `api/requests/[id]/route.ts`.
 */

export const MAX_UNITS = 4;
const MAX_ENTRIES = 50;

/** No 0, 1, O or I: a code read aloud or copied by hand cannot be mistaken. 32 characters. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface DonationSelection {
  responseId: string;
  units: number;
}

/** The `donations` list of a completion request: [{ responseId, units? }], units 1 to MAX_UNITS (default 1). */
export function parseDonationsInput(raw: unknown): ParseResult<DonationSelection[]> {
  if (!Array.isArray(raw) || raw.length > MAX_ENTRIES) return { value: null, error: 'donations' };
  const seen = new Set<string>();
  const list: DonationSelection[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return { value: null, error: 'donations' };
    const { responseId, units = 1 } = entry as { responseId?: unknown; units?: unknown };
    if (typeof responseId !== 'string' || responseId === '' || seen.has(responseId)) return { value: null, error: 'donations' };
    if (typeof units !== 'number' || !Number.isInteger(units) || units < 1 || units > MAX_UNITS) return { value: null, error: 'donations' };
    seen.add(responseId);
    list.push({ responseId, units });
  }
  return { error: null, value: list };
}

/** `BL-` and six characters from CODE_ALPHABET. `random` returns a number in [0, 1). */
export function generateDonationCode(random: () => number = () => globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32): string {
  let code = 'BL-';
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return code;
}

export interface ResponderRow {
  id: string;
  donorId: string | null;
}

export interface DonationPlan {
  /** Every responder the requester confirmed, with their units. */
  confirmed: DonationSelection[];
  /** One per registered donor (a donor who answered twice is added up), keeping the first answer's id. */
  donations: { donorId: string; units: number; responseId: string }[];
  /** Responders without a donor profile: only the units are kept, on the answer itself. */
  unregistered: { responseId: string; units: number }[];
}

/**
 * Turns the requester's selection into what to write. `selected === null` is the older "mark completed"
 * call that names nobody: every registered responder counts, one unit each.
 */
export function planDonations(responders: ResponderRow[], selected: DonationSelection[] | null): ParseResult<DonationPlan> {
  const legacyPicks = (): DonationSelection[] => {
    const seenDonors = new Set<string>();
    return responders
      .filter((r) => r.donorId !== null && !seenDonors.has(r.donorId) && seenDonors.add(r.donorId))
      .map((r) => ({ responseId: r.id, units: 1 }));
  };
  const picks: DonationSelection[] = selected ?? legacyPicks();
  const byId = new Map(responders.map((r) => [r.id, r]));
  const perDonor = new Map<string, { donorId: string; units: number; responseId: string }>();
  const unregistered: DonationPlan['unregistered'] = [];

  for (const pick of picks) {
    const responder = byId.get(pick.responseId);
    if (!responder) return { value: null, error: 'donations' };
    if (responder.donorId === null) {
      unregistered.push({ responseId: pick.responseId, units: pick.units });
      continue;
    }
    const existing = perDonor.get(responder.donorId);
    if (existing) existing.units += pick.units;
    else perDonor.set(responder.donorId, { donorId: responder.donorId, units: pick.units, responseId: pick.responseId });
  }
  return { error: null, value: { confirmed: picks, donations: [...perDonor.values()], unregistered } };
}
