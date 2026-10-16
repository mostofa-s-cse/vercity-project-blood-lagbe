/** Pure rules for the Donor Passport: level, next eligible date, age check, and the printable certificate. */

export type DonorLevel = 'new' | 'bronze' | 'silver' | 'gold';

/** 1-2 donations bronze, 3-4 silver, 5 or more gold; none yet is a new donor. */
export function donorLevel(donations: number): DonorLevel {
  if (donations >= 5) return 'gold';
  if (donations >= 3) return 'silver';
  if (donations >= 1) return 'bronze';
  return 'new';
}

/** The day a donor may give again: the last donation plus the cooldown. `null` if they never donated or the date is unreadable. */
export function nextEligibleDate(lastDonationAt: Date | string | null, cooldownDays: number): Date | null {
  if (lastDonationAt === null) return null;
  const last = new Date(lastDonationAt).getTime();
  if (Number.isNaN(last)) return null;
  return new Date(last + cooldownDays * 24 * 60 * 60 * 1000);
}

/** Blood donors are 18 to 65. `unknown` when the donor left their age out. */
export function ageCheck(age: number | null): 'ok' | 'under' | 'over' | 'unknown' {
  if (age === null) return 'unknown';
  if (age < 18) return 'under';
  if (age > 65) return 'over';
  return 'ok';
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface CertificateData {
  donorName: string;
  bloodGroup: string;
  units: number;
  hospital: string;
  /** Already formatted for the reader. */
  dateText: string;
  code: string;
}

export interface CertificateLabels {
  title: string;
  intro: string;
  gave: (units: number, bloodGroup: string) => string;
  atHospital: string;
  onDate: string;
  codeLabel: string;
  voluntary: string;
  print: string;
}

/** A standalone page to print or save as PDF. Everything that comes from a person is escaped. */
export function buildCertificateHtml(data: CertificateData, labels: CertificateLabels, language: string): string {
  const e = escapeHtml;
  return `<!doctype html>
<html lang="${e(language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(labels.title)} ${e(data.code)}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 32px; background: #f1f5f9; color: #0f172a; }
  .cert { max-width: 720px; margin: 0 auto; background: #fff; border: 6px double #dc2626; border-radius: 16px; padding: 48px 40px; text-align: center; }
  h1 { color: #b91c1c; font-size: 28px; margin: 0 0 24px; }
  .name { font-size: 32px; font-weight: 800; margin: 12px 0; }
  .line { font-size: 18px; margin: 8px 0; }
  .code { display: inline-block; margin-top: 24px; padding: 8px 16px; border: 1px dashed #64748b; border-radius: 8px; font-family: ui-monospace, monospace; letter-spacing: 2px; }
  .note { margin-top: 24px; font-size: 13px; color: #475569; }
  button { margin: 24px auto 0; display: block; padding: 10px 20px; border: 0; border-radius: 10px; background: #dc2626; color: #fff; font-weight: 700; cursor: pointer; }
  @media print { body { background: #fff; padding: 0; } button { display: none; } }
</style>
</head>
<body>
<div class="cert">
  <h1>${e(labels.title)}</h1>
  <div class="line">${e(labels.intro)}</div>
  <div class="name">${e(data.donorName)}</div>
  <div class="line">${e(labels.gave(data.units, data.bloodGroup))}</div>
  <div class="line">${e(labels.atHospital)} ${e(data.hospital)} ${e(labels.onDate)} ${e(data.dateText)}</div>
  <div class="code">${e(labels.codeLabel)}: ${e(data.code)}</div>
  <div class="note">${e(labels.voluntary)}</div>
</div>
<button onclick="window.print()">${e(labels.print)}</button>
</body>
</html>`;
}
