const BN = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** Writes the digits of a number (or any text) in Bengali: 90 gives ৯০. Other characters are kept. */
export function bnDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => BN[Number(d)]);
}
