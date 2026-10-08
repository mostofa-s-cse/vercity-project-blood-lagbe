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
  latitude?: number;
  longitude?: number;
}

export interface SosPayload {
  area?: string;
  problem?: string;
  patientName?: string;
  patientAge?: number;
  attendantName?: string;
  bloodGroup: string;
  bags: number;
  place: string;
  phones: string[];
  isCritical: boolean;
  language: 'bn' | 'en';
  postText: string;
  latitude?: number;
  longitude?: number;
}

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
