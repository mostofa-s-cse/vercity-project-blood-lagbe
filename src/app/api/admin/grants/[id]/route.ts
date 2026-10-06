import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/adminGuard';
import { grantErrorResponse } from '@/lib/apiErrors';
import { writeAuditLog } from '@/lib/auditLog';
import { getGrantService } from '@/lib/grants';
import { isDatabaseConfigured } from '@/lib/prisma';

export const runtime = 'nodejs';

/** Takes a role away from someone. Nobody can remove their own. Needs `roles.manage`. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('roles.manage');
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const { id } = await params;
  try {
    const email = typeof guard.claims.email === 'string' ? guard.claims.email : null;
    await getGrantService().revoke(id, { email });
    await writeAuditLog(email, 'role.revoke', `grant ${id} revoked`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const known = grantErrorResponse(error);
    if (known) return known;
    console.error('Could not revoke role', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
