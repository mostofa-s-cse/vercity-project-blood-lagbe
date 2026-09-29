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
