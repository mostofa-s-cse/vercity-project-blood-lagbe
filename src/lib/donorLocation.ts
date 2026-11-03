import { BD_DISTRICTS, BD_DIVISIONS } from '../data/bdGeo.ts';

/**
 * A donor's place is picked as a district inside a division and stored as the text "District, Division"
 * with the real English names (for example "Dhaka, Dhaka"). That is what the division filter, SOS matching
 * and the directory already read. Pure, no React and no `@/` alias, so it is unit tested and shared by the
 * registration form and the "My donor profile" editor.
 */

/** "District, Division" for a picked district, or '' when none is picked. */
export function divisionString(districtId: string): string {
  const district = BD_DISTRICTS.find((d) => d.id === districtId);
  const division = district ? BD_DIVISIONS.find((d) => d.id === district.divisionId) : undefined;
  return district && division ? `${district.name}, ${division.name}` : '';
}

/**
 * Reads a saved value back into the two dropdown values. A value that is only a division name fills just the
 * division. Older free text, or nothing, gives `null` (nothing to prefill).
 */
export function locationFromDivisionString(value: string | null | undefined): { divisionId: string; districtId: string } | null {
  if (!value || !value.trim()) return null;
  const parts = value.split(',').map((part) => part.trim());
  const divisionName = parts[parts.length - 1];
  const division = BD_DIVISIONS.find((d) => d.name === divisionName);
  if (!division) return null;
  if (parts.length === 1) return { divisionId: division.id, districtId: '' };
  const district = BD_DISTRICTS.find((d) => d.divisionId === division.id && d.name === parts[0]);
  return { divisionId: division.id, districtId: district ? district.id : '' };
}

/** The picked district's centroid for "near me" and distance matching, or nothing when none is picked. */
export function locationCoords(districtId: string): { latitude?: number; longitude?: number } {
  const district = BD_DISTRICTS.find((d) => d.id === districtId);
  return district ? { latitude: district.lat, longitude: district.lng } : {};
}
