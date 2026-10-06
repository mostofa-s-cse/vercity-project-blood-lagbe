import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/adminGuard';
import { toAuditLogDto } from '@/lib/dto';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The latest 100 audit log lines, newest first. Needs `panel.logs`. */
export async function GET() {
  const guard = await requirePermission('panel.logs');
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  try {
    const rows = await getPrisma().auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    return NextResponse.json({ entries: rows.map(toAuditLogDto) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not load audit log', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
