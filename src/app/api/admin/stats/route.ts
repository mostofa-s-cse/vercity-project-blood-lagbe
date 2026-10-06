import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/adminGuard';
import type { AdminStatsDto } from '@/lib/dtoTypes';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { REQUEST_STATUSES } from '@/lib/requestStatus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Real counts for the Admin Panel's Overview tab, one round trip. Needs `panel.open`. */
export async function GET() {
  const guard = await requirePermission('panel.open');
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  try {
    const prisma = getPrisma();
    const [totalDonors, availableDonors, requestCounts, responses] = await Promise.all([
      prisma.donor.count(),
      prisma.donor.count({ where: { isAvailable: true } }),
      prisma.sosRequest.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.requestResponse.count(),
    ]);

    const requestsByStatus = Object.fromEntries(REQUEST_STATUSES.map((status) => [status, 0])) as AdminStatsDto['requestsByStatus'];
    for (const row of requestCounts) requestsByStatus[row.status] = row._count._all;

    const stats: AdminStatsDto = { totalDonors, availableDonors, requestsByStatus, responses };
    return NextResponse.json(stats, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not load admin stats', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
