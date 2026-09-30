import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/adminGuard';
import { grantErrorResponse } from '@/lib/apiErrors';
import { toRoleDto } from '@/lib/grantDto';
import { getGrantService } from '@/lib/grants';
import { isDatabaseConfigured } from '@/lib/prisma';
import { isServiceKeyConfigured } from '@/lib/supabase/admin';
import { parseRoleInput } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lists every role with how many people have it. Needs `roles.manage`. */
export async function GET() {
  const guard = await requirePermission('roles.manage');
  if (guard.response) return guard.response;

  const available = { database: isDatabaseConfigured(), serviceKey: isServiceKeyConfigured() };
  if (!available.database) return NextResponse.json({ available, roles: [] });

  try {
    const roles = await getGrantService().listRoles();
    return NextResponse.json({ available, roles: roles.map(toRoleDto) });
  } catch (error) {
    console.error('Could not list roles', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}

/** Creates a role: a name and a choice of permissions. Needs `roles.manage`. */
export async function POST(request: Request) {
  const guard = await requirePermission('roles.manage');
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = parseRoleInput(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });

  try {
    const role = await getGrantService().createRole(parsed.value);
    return NextResponse.json({ role: toRoleDto(role) }, { status: 201 });
  } catch (error) {
    const known = grantErrorResponse(error);
    if (known) return known;
    console.error('Could not create role', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
