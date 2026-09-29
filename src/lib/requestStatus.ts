/** The life of a blood request, from first post to the end. */
export const REQUEST_STATUSES = ['PENDING', 'DONOR_FOUND', 'COMPLETED', 'CANCELLED'] as const;
export type RequestStatusValue = (typeof REQUEST_STATUSES)[number];
