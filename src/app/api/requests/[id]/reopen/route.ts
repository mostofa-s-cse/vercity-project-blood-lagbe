import { NextResponse } from 'next/server';
import { toRequestDto } from '@/lib/dto';
import { isSameOrigin } from '@/lib/originCheck';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { canManageRequest, MANAGE_TOKEN_HEADER } from '@/lib/requestAccess';
import { canReopen } from '@/lib/requestStatus';
import { getClaims } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Takes a completed request back so the requester can confirm who donated again (a wrong tick, a wrong
 * number of units). Only for whoever manages the request and only for a short time after completing
 * (`canReopen`). Removes this request's donations (and the donors' "confirmed" notifications with them),
 * clears the confirmed units, and puts each affected donor's last donation date back to their latest
 * remaining donation.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const { id } = await params;
  try {
    const prisma = getPrisma();
    const row = await prisma.sosRequest.findUnique({
      where: { id },
      select: { status: true, completedAt: true, manageTokenHash: true, userId: true, _count: { select: { responses: true } } },
    });
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (!(await canManageRequest(row, request.headers))) {
      const hasCredentials = Boolean(request.headers.get(MANAGE_TOKEN_HEADER)) || (await getClaims()) !== null;
      return NextResponse.json({ error: hasCredentials ? 'forbidden' : 'unauthorized' }, { status: hasCredentials ? 403 : 401 });
    }
    if (!canReopen(row.status, row.completedAt)) return NextResponse.json({ error: 'reopen_not_allowed' }, { status: 409 });

    const reopened = await prisma.$transaction(async (tx) => {
      // The old status is part of the condition, so two reopen calls cannot both win.
      const changed = await tx.sosRequest.updateMany({
        where: { id, status: 'COMPLETED' },
        data: { status: row._count.responses > 0 ? 'DONOR_FOUND' : 'PENDING', completedAt: null },
      });
      if (changed.count === 0) return false;

      const gifts = await tx.donation.findMany({ where: { requestId: id }, select: { donorId: true } });
      await tx.donation.deleteMany({ where: { requestId: id } });
      await tx.requestResponse.updateMany({ where: { requestId: id }, data: { donatedUnits: 0, donationRejected: false } });
      for (const donorId of new Set(gifts.map((gift) => gift.donorId))) {
        const latest = await tx.donation.aggregate({ where: { donorId }, _max: { donatedAt: true } });
        await tx.donor.update({ where: { id: donorId }, data: { lastDonationAt: latest._max.donatedAt } });
      }
      return true;
    });
    if (!reopened) return NextResponse.json({ error: 'reopen_not_allowed' }, { status: 409 });

    const updated = await prisma.sosRequest.findUniqueOrThrow({ where: { id }, include: { _count: { select: { responses: true } } } });
    return NextResponse.json({ request: toRequestDto(updated) });
  } catch (error) {
    console.error('Could not reopen request', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
