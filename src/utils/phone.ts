/** True for a Bangladesh mobile number: 01[3-9] plus 8 digits, optionally with +88 / 88 and spaces or dashes. */
export function isValidBdPhone(value: string): boolean {
  const compact = value.replace(/[\s-]/g, '');
  return /^(?:\+?88)?01[3-9][0-9]{8}$/.test(compact);
}

/** A Bangladesh mobile number in international form, "+880 1XXXXXXXXX" (the trunk 0 dropped); anything else as typed, trimmed. */
export function formatBdPhoneIntl(value: string): string {
  const trimmed = value.trim();
  if (!isValidBdPhone(trimmed)) return trimmed;
  const local = trimmed.replace(/[\s-]/g, '').replace(/^\+?88/, '');
  return `+880 ${local.slice(1)}`;
}
