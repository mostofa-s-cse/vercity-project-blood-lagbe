import { NextResponse } from 'next/server';
import { toNotificationDto } from '@/lib/dto';
import { canManageDonor, MANAGE_TOKEN_HEADER } from '@/lib/donorAccess';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { getClaims } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A donor's compatible-request alerts, newest first. Private: only the holder of the donor's manage
 * token, the signed-in person who registered it, or an admin-panel user with `panel.donors`.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });
  const { id } = await params;

  try {
    const prisma = getPrisma();
    const donor = await prisma.donor.findUnique({ where: { id } });
    if (!donor) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (!(await canManageDonor(donor, request.headers))) {
      const hasCredentials = Boolean(request.headers.get(MANAGE_TOKEN_HEADER)) || (await getClaims()) !== null;
      return NextResponse.json({ error: hasCredentials ? 'forbidden' : 'unauthorized' }, { status: hasCredentials ? 403 : 401 });
    }

    const [rows, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { donorId: id },
        include: { request: { select: { place: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.notification.count({ where: { donorId: id, isRead: false } }),
    ]);
    return NextResponse.json(
      { notifications: rows.map(toNotificationDto), unreadCount },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Could not load notifications', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
