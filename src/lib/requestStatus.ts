/** The life of a blood request, from first post to the end. */
export const REQUEST_STATUSES = ['PENDING', 'DONOR_FOUND', 'COMPLETED', 'CANCELLED'] as const;
export type RequestStatusValue = (typeof REQUEST_STATUSES)[number];

const MOVES: Record<RequestStatusValue, readonly RequestStatusValue[]> = {
  PENDING: ['DONOR_FOUND', 'COMPLETED', 'CANCELLED'],
  DONOR_FOUND: ['PENDING', 'COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

/** Whether a request may move from one status to another. Final statuses (completed, cancelled) never change. */
export function canTransition(from: unknown, to: unknown): boolean {
  if (typeof from !== 'string' || typeof to !== 'string') return false;
  if (!Object.hasOwn(MOVES, from)) return false;
  return (MOVES[from as RequestStatusValue] as readonly string[]).includes(to);
}

/** A critical request should be answered within an hour, any other within four. */
const WINDOW_SECONDS = { critical: 3600, normal: 4 * 3600 };

/** Whole seconds left in the answer window (never negative). An unreadable date counts as already over. */
export function remainingSeconds(createdAt: Date | string, isCritical: boolean, now: Date = new Date()): number {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  const windowMs = (isCritical ? WINDOW_SECONDS.critical : WINDOW_SECONDS.normal) * 1000;
  const elapsedMs = Math.max(0, now.getTime() - created);
  return Math.max(0, Math.floor((windowMs - elapsedMs) / 1000));
}
