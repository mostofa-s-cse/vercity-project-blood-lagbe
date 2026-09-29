import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { GrantError } from '@/lib/grantService';
import { getGrantService } from '@/lib/grants';
import { isDatabaseConfigured } from '@/lib/prisma';

export const runtime = 'nodejs';

/** Takes a role away. Admins only, and nobody can remove their own. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const { id } = await params;
  try {
    const email = typeof guard.claims.email === 'string' ? guard.claims.email : null;
    await getGrantService().revoke(id, { email });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof GrantError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'cannot_revoke_self' ? 400 : 503;
      return NextResponse.json({ error: error.code }, { status });
    }
    console.error('Could not revoke role', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
