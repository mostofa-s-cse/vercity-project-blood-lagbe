/** A donor must wait this many days between donations (DGHS guidance). */
export const DONATION_COOLDOWN_DAYS = 90;

/**
 * Whether a donor may donate again: never donated (`null`), or at least `DONATION_COOLDOWN_DAYS` have
 * passed since `lastDonationAt`. An unreadable date counts as never donated, so bad data never wrongly
 * blocks someone. A future date (clock skew) is never eligible, same as a too-recent one.
 */
export function isEligible(lastDonationAt: Date | string | null, now: Date = new Date()): boolean {
  if (lastDonationAt === null) return true;
  const last = new Date(lastDonationAt).getTime();
  if (Number.isNaN(last)) return true;
  const elapsedMs = now.getTime() - last;
  return elapsedMs >= DONATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * A donor's own "I last gave blood N months ago" answer as a date, so it feeds the same 90-day rule as a
 * recorded donation. A month counts as 30 days, so 3 months is exactly the 90-day cooldown. Not a usable
 * number (missing, NaN, negative) gives `null`. A real `Donation` row always wins over this estimate.
 */
export function estimateLastDonationAt(months: number | null | undefined, now: Date = new Date()): Date | null {
  if (typeof months !== 'number' || !Number.isFinite(months) || months < 0) return null;
  return new Date(now.getTime() - Math.floor(months) * 30 * 24 * 60 * 60 * 1000);
}
