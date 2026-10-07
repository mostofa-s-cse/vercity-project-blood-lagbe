import { NextResponse } from 'next/server';
import { toDonationDto } from '@/lib/dto';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A donor's real donation history, newest first. Public, same exposure level as the rest of a donor's listing. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });
  const { id } = await params;
  try {
    const donor = await getPrisma().donor.findUnique({ where: { id }, select: { id: true } });
    if (!donor) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const rows = await getPrisma().donation.findMany({ where: { donorId: id }, orderBy: { donatedAt: 'desc' } });
    return NextResponse.json({ donations: rows.map(toDonationDto) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not load donation history', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
