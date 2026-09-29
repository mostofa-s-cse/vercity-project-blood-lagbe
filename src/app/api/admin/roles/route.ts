import { NextResponse } from 'next/server';
import { SAMPLE_HOSPITAL_ORGS } from '@/data/mockData';
import { requireAdmin } from '@/lib/adminGuard';
import { toGrantDto } from '@/lib/grantDto';
import { GrantError } from '@/lib/grantService';
import { getGrantService } from '@/lib/grants';
import { isDatabaseConfigured } from '@/lib/prisma';
import { isServiceKeyConfigured } from '@/lib/supabase/admin';
import { parseRoleGrantInput } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOSPITAL_IDS = SAMPLE_HOSPITAL_ORGS.map((hospital) => hospital.id);

/** Lists every role that has been given. Admins only. */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const available = { database: isDatabaseConfigured(), serviceKey: isServiceKeyConfigured() };
  if (!available.database) return NextResponse.json({ available, grants: [] });

  try {
    const grants = await getGrantService().list();
    return NextResponse.json({ available, grants: grants.map(toGrantDto) });
  } catch (error) {
    console.error('Could not list role grants', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}

/** Gives an email a role (admin, or hospital plus which hospital). Admins only. */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });
  if (!isServiceKeyConfigured()) return NextResponse.json({ error: 'service_key_missing' }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = parseRoleGrantInput(body, HOSPITAL_IDS);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });

  try {
    const email = typeof guard.claims.email === 'string' ? guard.claims.email : null;
    const { grant, status } = await getGrantService().grant(parsed.value, { email });
    return NextResponse.json({ grant: toGrantDto(grant), status });
  } catch (error) {
    if (error instanceof GrantError && error.code === 'service_key_missing') {
      return NextResponse.json({ error: 'service_key_missing' }, { status: 503 });
    }
    console.error('Could not grant role', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
