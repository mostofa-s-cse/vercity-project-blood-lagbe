import type { BloodGroupValue } from './validation.ts';

/**
 * The standard ABO/Rh compatibility chart (who may donate TO the recipient, same one taught at any
 * blood bank). Keyed by the recipient's group, listing every donor group that may give to them.
 * No plasma-only/platelet-only distinctions — this app doesn't track donation type (see WP4 plan).
 */
export const COMPATIBLE_DONORS: Record<BloodGroupValue, BloodGroupValue[]> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

/** Whether `donorGroup` may give blood to someone who needs `recipientGroup`. */
export function isCompatibleDonor(donorGroup: BloodGroupValue, recipientGroup: BloodGroupValue): boolean {
  return COMPATIBLE_DONORS[recipientGroup].includes(donorGroup);
}
