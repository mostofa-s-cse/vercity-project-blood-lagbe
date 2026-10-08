import { NextResponse } from 'next/server';
import { toNotificationDto } from '@/lib/dto';
import { canManageDonor, MANAGE_TOKEN_HEADER } from '@/lib/donorAccess';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { getClaims } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Marks one notification read. Same gate as the list; 404 if it isn't this donor's. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; notificationId: string }> }
) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });
  const { id, notificationId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || (body as { isRead?: unknown }).isRead !== true) {
    return NextResponse.json({ error: 'invalid_input', field: 'isRead' }, { status: 400 });
  }

  try {
    const prisma = getPrisma();
    const donor = await prisma.donor.findUnique({ where: { id } });
    if (!donor) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (!(await canManageDonor(donor, request.headers))) {
      const hasCredentials = Boolean(request.headers.get(MANAGE_TOKEN_HEADER)) || (await getClaims()) !== null;
      return NextResponse.json({ error: hasCredentials ? 'forbidden' : 'unauthorized' }, { status: hasCredentials ? 403 : 401 });
    }

    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification || notification.donorId !== id) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
      include: { request: { select: { place: true } } },
    });
    return NextResponse.json({ notification: toNotificationDto(updated) });
  } catch (error) {
    console.error('Could not update notification', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
