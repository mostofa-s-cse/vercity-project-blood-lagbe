/** True for a Bangladesh mobile number: 01[3-9] plus 8 digits, optionally with +88 / 88 and spaces or dashes. */
export function isValidBdPhone(value: string): boolean {
  const compact = value.replace(/[\s-]/g, '');
  return /^(?:\+?88)?01[3-9][0-9]{8}$/.test(compact);
}
