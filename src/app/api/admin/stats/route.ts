import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/adminGuard';
import type { AdminStatsDto } from '@/lib/dtoTypes';
import { DONATION_COOLDOWN_DAYS } from '@/lib/eligibility';
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
    const eligibleCutoff = new Date(Date.now() - DONATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    const [totalDonors, availableDonors, requestCounts, responses] = await Promise.all([
      prisma.donor.count(),
      prisma.donor.count({
        where: { isAvailable: true, OR: [{ lastDonationAt: null }, { lastDonationAt: { lte: eligibleCutoff } }] },
      }),
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
