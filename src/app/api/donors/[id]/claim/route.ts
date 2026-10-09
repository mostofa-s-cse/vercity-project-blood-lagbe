import { NextResponse } from 'next/server';
import { toDonorDto } from '@/lib/dto';
import { canClaimDonor, MANAGE_TOKEN_HEADER } from '@/lib/donorAccess';
import { isSameOrigin } from '@/lib/originCheck';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Links an anonymously-registered donor to the account its manage-token holder just signed into (or
 * created), so they can manage it from any device from then on. Needs both: the manage token (proves
 * this is really the donor who registered it) and a signed-in session (the account to link it to).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  try {
    const prisma = getPrisma();
    const donor = await prisma.donor.findUnique({ where: { id } });
    if (!donor) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (!canClaimDonor(donor, request.headers.get(MANAGE_TOKEN_HEADER))) {
      return NextResponse.json({ error: donor.userId ? 'already_linked' : 'forbidden' }, { status: 403 });
    }

    // The profile row is made at sign-in (see auth/callback); if it is somehow still missing, say so
    // rather than writing a userId with no matching profile.
    const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: 'profile_not_ready' }, { status: 409 });

    const updated = await prisma.donor.update({ where: { id }, data: { userId: profile.id } });
    return NextResponse.json({ donor: toDonorDto(updated) });
  } catch (error) {
    console.error('Could not claim donor', error);
    return NextResponse.json({ error: 'claim_failed' }, { status: 500 });
  }
}
