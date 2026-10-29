import { NextResponse } from 'next/server';
import { SAMPLE_HOSPITAL_ORGS } from '@/data/mockData';
import { getPrisma, isDatabaseConfigured } from './prisma';
import { canManageHospital } from './roles';
import { getClaims } from './supabase/server';

type Guard =
  | { claims: Record<string, unknown>; hospitalName: string; response: null }
  | { claims: null; hospitalName: null; response: NextResponse };

const fail = (error: string, status: number): Guard => ({
  claims: null,
  hospitalName: null,
  response: NextResponse.json({ error }, { status }),
});

/** The name of a hospital the screen can list (a sample one, or a real organization that was not rejected), else null. */
export async function findHospitalName(id: string): Promise<string | null> {
  const sample = SAMPLE_HOSPITAL_ORGS.find((hospital) => hospital.id === id);
  if (sample) return sample.name;
  const org = await getPrisma().organization.findFirst({
    where: { id, status: { not: 'rejected' } },
    select: { name: true },
  });
  return org?.name ?? null;
}

/**
 * For API routes that change one hospital's data (stock, batches, requisitions, camps). Checked on the
 * server from the login token: 503 without a database, 401 signed out, 404 unknown hospital, 403 when the
 * person is neither an admin nor tied to this hospital.
 */
export async function requireHospitalManager(id: string): Promise<Guard> {
  if (!isDatabaseConfigured()) return fail('database_not_configured', 503);
  const claims = await getClaims();
  if (!claims) return fail('sign_in_required', 401);
  const hospitalName = await findHospitalName(id);
  if (!hospitalName) return fail('unknown_hospital', 404);
  if (!canManageHospital(claims, id)) return fail('forbidden', 403);
  return { claims, hospitalName, response: null };
}
