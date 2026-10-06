import { NextResponse } from 'next/server';
import { SAMPLE_HOSPITAL_ORGS } from '@/data/mockData';
import { requirePermission } from '@/lib/adminGuard';
import { grantErrorResponse } from '@/lib/apiErrors';
import { writeAuditLog } from '@/lib/auditLog';
import { toGrantDto } from '@/lib/grantDto';
import { getGrantService } from '@/lib/grants';
import { isDatabaseConfigured } from '@/lib/prisma';
import { isServiceKeyConfigured } from '@/lib/supabase/admin';
import { parseGrantInput } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOSPITAL_IDS = SAMPLE_HOSPITAL_ORGS.map((hospital) => hospital.id);

/** Lists who has which role. Needs `roles.manage`. */
export async function GET() {
  const guard = await requirePermission('roles.manage');
  if (guard.response) return guard.response;

  const available = { database: isDatabaseConfigured(), serviceKey: isServiceKeyConfigured() };
  if (!available.database) return NextResponse.json({ available, grants: [] });

  try {
    const service = getGrantService();
    const [grants, roles] = await Promise.all([service.list(), service.listRoles()]);
    const names = new Map(roles.map((role) => [role.id, role.name]));
    return NextResponse.json({ available, grants: grants.map((grant) => toGrantDto(grant, names.get(grant.roleId))) });
  } catch (error) {
    console.error('Could not list grants', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}

/** Gives an email a role (and which hospital, for roles tied to one). Needs `roles.manage`. */
export async function POST(request: Request) {
  const guard = await requirePermission('roles.manage');
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });
  if (!isServiceKeyConfigured()) return NextResponse.json({ error: 'service_key_missing' }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = parseGrantInput(body, HOSPITAL_IDS);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });

  try {
    const service = getGrantService();
    const email = typeof guard.claims.email === 'string' ? guard.claims.email : null;
    const { grant, status } = await service.grant(parsed.value, { email });
    const role = (await service.listRoles()).find((r) => r.id === grant.roleId);
    await writeAuditLog(email, 'role.grant', `${grant.email} given "${role?.name ?? grant.roleId}"`);
    return NextResponse.json({ grant: toGrantDto(grant, role?.name), status });
  } catch (error) {
    const known = grantErrorResponse(error);
    if (known) return known;
    console.error('Could not grant role', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
