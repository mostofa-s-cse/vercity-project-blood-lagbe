import { NextResponse } from 'next/server';
import { BLOOD_GROUP_FROM_DB } from '@/lib/validation';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAYS = 30;

/**
 * "A donor said they can donate" alerts for the signed-in person who posted blood requests: the answers to
 * their requests from the last 30 days, newest first. Read state is kept in the browser (these rows are
 * the answers themselves, not separate notification rows).
 */
export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  try {
    const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
    const rows = await getPrisma().requestResponse.findMany({
      where: { request: { userId }, createdAt: { gte: since } },
      include: { request: { select: { place: true, bloodGroup: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(
      {
        notifications: rows.map((row) => ({
          id: `resp:${row.id}`,
          requestId: row.requestId,
          type: 'donor_responded',
          bloodGroup: BLOOD_GROUP_FROM_DB[row.request.bloodGroup],
          place: row.request.place,
          responderName: row.name,
          donationId: null,
          donationCode: null,
          donationUnits: null,
          isRead: false,
          createdAt: row.createdAt.toISOString(),
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Could not load request notifications', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
