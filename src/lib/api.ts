/** POSTs JSON to one of our API routes. Resolves to true on success; never throws, so the UI keeps working without a database. */
async function postJson(url: string, body: unknown): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export interface DonorPayload {
  name: string;
  phone: string;
  bloodGroup: string;
  area: string;
  age?: number;
  gender?: 'Male' | 'Female';
  division?: string;
  email?: string;
  weightKg?: number;
  lastDonationMonths?: number;
  vehicle?: string;
  nearestHospital?: string;
  isAvailable: boolean;
}

export interface SosPayload {
  area?: string;
  problem?: string;
  bloodGroup: string;
  bags: number;
  place: string;
  phones: string[];
  isCritical: boolean;
  language: 'bn' | 'en';
  postText: string;
}

/** Saves a registered donor to the database (fire and forget). */
export const saveDonor = (payload: DonorPayload) => postJson('/api/donors', payload);

/** Saves a posted SOS request to the database (fire and forget). */
export const saveSos = (payload: SosPayload) => postJson('/api/sos', payload);

/** Saved blood stock per hospital: `{ hospitalId: { "O+": units } }`, only the groups hospitals have reported. */
export type HospitalStockMap = Record<string, Record<string, number>>;

/** Loads the saved hospital stock. Never throws: resolves to null without a database or on any error. */
export async function fetchHospitalStock(): Promise<HospitalStockMap | null> {
  try {
    const response = await fetch('/api/hospitals/stock', { cache: 'no-store' });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    const stock = (data as { stock?: unknown } | null)?.stock;
    if (!stock || typeof stock !== 'object') return null;
    return stock as HospitalStockMap;
  } catch {
    return null;
  }
}

/** Saves the absolute number of units of one blood group for a hospital. Resolves to true on success; never throws. */
export async function saveHospitalStock(hospitalId: string, bloodGroup: string, units: number): Promise<boolean> {
  try {
    const response = await fetch(`/api/hospitals/${encodeURIComponent(hospitalId)}/stock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bloodGroup, units }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
