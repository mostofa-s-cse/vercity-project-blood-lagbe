import { NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/adminGuard';
import { toFraudIncidentDto } from '@/lib/dto';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Every fraud incident, newest first. Needs `panel.fraud` or `ops.command` (shared by both screens). */
export async function GET() {
  const guard = await requireAnyPermission(['panel.fraud', 'ops.command']);
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  try {
    const rows = await getPrisma().fraudIncident.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ incidents: rows.map(toFraudIncidentDto) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not load fraud incidents', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
