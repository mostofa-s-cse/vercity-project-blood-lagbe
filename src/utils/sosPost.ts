/** Text pieces of the shareable emergency post, one set per language (see `t.sos.post`). */
export interface SosPostLabels {
  title: (area: string) => string;
  problem: string;
  bloodGroup: string;
  amountLabel: string;
  amount: (bags: number) => string;
  place: string;
  contact: string;
  patientName: string;
  patientAge: string;
  attendantName: string;
}

export interface SosPostInput {
  area: string;
  problem: string;
  bloodGroup: string;
  bags: number;
  place: string;
  phones: string[];
  patientName?: string;
  patientAge?: number;
  attendantName?: string;
}

/**
 * Builds the short, Facebook-style emergency post people copy and share.
 * Lines whose value is empty (problem, place, contact) are left out.
 */
export function buildSosPost(input: SosPostInput, labels: SosPostLabels): string {
  const bags = Number.isFinite(input.bags) ? Math.max(1, Math.floor(input.bags)) : 1;
  const problem = input.problem.trim();
  const place = input.place.trim();
  const phones = input.phones.map((phone) => phone.trim()).filter(Boolean);

  const lines = [labels.title(input.area.trim())];
  if (problem) lines.push(`📈${labels.problem} : ${problem}`);
  const patientName = (input.patientName ?? '').trim();
  const attendantName = (input.attendantName ?? '').trim();
  if (patientName) lines.push(`🧑${labels.patientName} : ${patientName}`);
  if (typeof input.patientAge === 'number' && Number.isFinite(input.patientAge)) {
    lines.push(`🎂${labels.patientAge} : ${Math.floor(input.patientAge)}`);
  }
  if (attendantName) lines.push(`🤝${labels.attendantName} : ${attendantName}`);
  lines.push(`🩸${labels.bloodGroup} : ${input.bloodGroup}`);
  lines.push(`💉${labels.amountLabel} : ${labels.amount(bags)}`);
  if (place) lines.push(`🏘${labels.place} : ${place}`);
  if (phones.length > 0) lines.push(`☎${labels.contact} : ${phones.join(' - ')}`);
  return lines.join('\n');
}
