import { BD_DISTRICTS, BD_DIVISIONS } from '../data/bdGeo.ts';

/**
 * The eight divisions as the header filter, SOS requests, donors and organizations name them. The canonical
 * name is the one in `bdGeo` ("Chattagram", "Barisal"); the aliases are other spellings people type or older
 * rows hold. Pure, no React and no `@/` alias, so it is unit-tested and shared by the server and the browser.
 */
export const DIVISION_NAMES: string[] = BD_DIVISIONS.map((d) => d.name);

const EXTRA_ALIASES: Record<string, string[]> = {
  Chattagram: ['chattogram', 'chittagong'],
  Barisal: ['barishal'],
};

/** Lower-cased spellings (English and Bengali) that mean this division, canonical name first. */
export function divisionAliases(name: string): string[] {
  const division = BD_DIVISIONS.find((d) => d.name === name);
  if (!division) return [];
  return [division.name.toLowerCase(), ...(EXTRA_ALIASES[name] ?? []), division.bnName];
}

/** The canonical division for a value that is exactly a division spelling, else null. */
export function parseDivision(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();
  if (!text) return null;
  return DIVISION_NAMES.find((name) => divisionAliases(name).includes(text) || divisionAliases(name).includes(value.trim())) ?? null;
}

// Well known places and hospitals that do not contain a division or district name. Dhaka only: these are
// what the SOS place list and typical areas use; anywhere else, the person picks the division on the form.
const DHAKA_HINTS = [
  'mirpur', 'uttara', 'panthapath', 'bashundhara', 'mitford', 'shahbag', 'dhanmondi', 'kurmitola', 'farmgate',
  'motijheel', 'gulshan', 'banani', 'mohakhali', 'kakrail', 'azimpur', 'malibagh', 'tejgaon', 'badda', 'rampura',
  'mohammadpur', 'khilgaon', 'jatrabari', 'bsmmu', 'bangabandhu sheikh mujib', 'nicvd', 'cardiovascular',
  'salimullah', 'মিরপুর', 'উত্তরা', 'পান্থপথ', 'বসুন্ধরা', 'শাহবাগ', 'ধানমন্ডি', 'মোহাম্মদপুর', 'গুলশান', 'বনানী',
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (text: string, word: string) => new RegExp(`(^|[^a-z])${escapeRegExp(word)}([^a-z]|$)`).test(text);

/** The division a free text (an area, a hospital, a stored "District, Division") belongs to, or null. */
export function divisionOf(text: string | null | undefined): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const name of DIVISION_NAMES) {
    if (divisionAliases(name).some((alias) => (/[a-z]/.test(alias) ? hasWord(lower, alias) : text.includes(alias)))) return name;
  }
  for (const district of BD_DISTRICTS) {
    if (hasWord(lower, district.name.toLowerCase()) || text.includes(district.bnName)) {
      return BD_DIVISIONS.find((d) => d.id === district.divisionId)?.name ?? null;
    }
  }
  if (DHAKA_HINTS.some((hint) => (/[a-z]/.test(hint) ? lower.includes(hint) : text.includes(hint)))) return 'Dhaka';
  return null;
}
