import { NextResponse } from 'next/server';
import { canManageDonor, MANAGE_TOKEN_HEADER } from '@/lib/donorAccess';
import { isSameOrigin } from '@/lib/originCheck';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { getClaims } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * The donor says "this donation was not me" (or "I did not give blood"): removes the donation, and the
 * confirmed notification with it, marks the donor's answer on that request as disputed so the requester can
 * see it, and puts the donor's last donation date back to their latest remaining donation. Same gate as the
 * rest of a donor's private data: the holder of the donor's manage token, the account that owns it, or an
 * admin with `panel.donors`.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; donationId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });
  const { id, donationId } = await params;

  try {
    const prisma = getPrisma();
    const donor = await prisma.donor.findUnique({ where: { id } });
    if (!donor) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (!(await canManageDonor(donor, request.headers))) {
      const hasCredentials = Boolean(request.headers.get(MANAGE_TOKEN_HEADER)) || (await getClaims()) !== null;
      return NextResponse.json({ error: hasCredentials ? 'forbidden' : 'unauthorized' }, { status: hasCredentials ? 403 : 401 });
    }

    const donation = await prisma.donation.findUnique({ where: { id: donationId }, select: { donorId: true, requestId: true } });
    if (!donation || donation.donorId !== id) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.donation.delete({ where: { id: donationId } });
      if (donation.requestId) {
        await tx.requestResponse.updateMany({
          where: { requestId: donation.requestId, donorId: id },
          data: { donatedUnits: 0, donationRejected: true },
        });
      }
      const latest = await tx.donation.aggregate({ where: { donorId: id }, _max: { donatedAt: true } });
      await tx.donor.update({ where: { id }, data: { lastDonationAt: latest._max.donatedAt } });
    });
    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error('Could not remove donation', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
