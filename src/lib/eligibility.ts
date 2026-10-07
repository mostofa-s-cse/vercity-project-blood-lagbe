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
