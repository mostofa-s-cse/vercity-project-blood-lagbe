/**
 * Hides most of a phone number for public lists. A Bangladesh mobile number (01XXXXXXXXX, or with
 * +880 in front) keeps its operator prefix and last four digits: `017••••4315`. Any other number shows
 * only its last four digits, and anything too short to hide safely is fully hidden.
 */
export function maskPhone(phone: string): string {
  if (typeof phone !== 'string') return '••••';
  const digits = phone.replace(/\D/g, '');

  // 11 digits starting 01 (local) or 13 digits starting 8801 (international).
  const local = /^01\d{9}$/.test(digits) ? digits : /^8801\d{9}$/.test(digits) ? `0${digits.slice(3)}` : null;
  if (local) {
    const international = digits.length === 13;
    return international ? `+880${local.slice(1, 3)}••••${local.slice(-4)}` : `${local.slice(0, 3)}••••${local.slice(-4)}`;
  }
  return digits.length >= 8 ? `••••${digits.slice(-4)}` : '••••';
}
