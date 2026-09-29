import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/adminGuard';
import { grantErrorResponse } from '@/lib/apiErrors';
import { toRoleDto } from '@/lib/grantDto';
import { getGrantService } from '@/lib/grants';
import { isDatabaseConfigured } from '@/lib/prisma';
import { parseRoleInput } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * Changes a role. Everyone who already has it gets the new permissions in their login data
 * (`propagated` says how many were updated or failed). The Admin role cannot be changed. Needs `roles.manage`.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  try {
    const { role, propagated } = await getGrantService().updateRole(id, parsed.value);
    return NextResponse.json({ role: toRoleDto(role), propagated });
  } catch (error) {
    const known = grantErrorResponse(error);
    if (known) return known;
    console.error('Could not update role', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}

/** Deletes a role nobody has. Built-in roles cannot be deleted. Needs `roles.manage`. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('roles.manage');
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const { id } = await params;
  try {
    await getGrantService().deleteRole(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const known = grantErrorResponse(error);
    if (known) return known;
    console.error('Could not delete role', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
