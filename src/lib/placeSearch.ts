/**
 * Place search for the map location picker: builds the OpenStreetMap Nominatim search address (Bangladesh
 * only, no API key) and cleans its answer. Pure: the fetch itself lives in the component. Nominatim's usage
 * policy allows light use (one search per click, never search-as-you-type), so the picker searches on a
 * button press or Enter only.
 */
export interface PlaceResult {
  label: string;
  lat: number;
  lng: number;
}

const MAX_RESULTS = 6;
/** Generous box around Bangladesh: drops answers that are clearly somewhere else. */
const BD_BOUNDS = { minLat: 20.4, maxLat: 26.8, minLng: 87.9, maxLng: 92.9 };

export function placeSearchUrl(query: string): string | null {
  const q = query.trim();
  if (q.length < 3) return null;
  const params = new URLSearchParams({ format: 'jsonv2', limit: String(MAX_RESULTS), countrycodes: 'bd', 'accept-language': 'bn,en', q });
  return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
}

export function parsePlaceResults(raw: unknown): PlaceResult[] {
  if (!Array.isArray(raw)) return [];
  const results: PlaceResult[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const row = item as Record<string, unknown>;
    const label = typeof row.display_name === 'string' ? row.display_name.trim().slice(0, 140) : '';
    const lat = Number(row.lat);
    const lng = Number(row.lon);
    if (!label || row.lat === undefined || row.lon === undefined || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < BD_BOUNDS.minLat || lat > BD_BOUNDS.maxLat || lng < BD_BOUNDS.minLng || lng > BD_BOUNDS.maxLng) continue;
    results.push({ label, lat: roundCoordinate(lat), lng: roundCoordinate(lng) });
    if (results.length === MAX_RESULTS) break;
  }
  return results;
}

/** Six decimals is about a tenth of a metre: more is noise. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
