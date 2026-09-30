import { NextResponse } from 'next/server';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The full phone number of ONE donor, for the moment someone presses "call". Lists only carry the masked
 * number, so numbers cannot be collected in bulk from a search. Open to signed-out people because an
 * emergency must not need an account. (Rate limiting for this route is planned in WP11.)
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const { id } = await params;
  try {
    const donor = await getPrisma().donor.findUnique({ where: { id }, select: { phone: true } });
    if (!donor) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ phone: donor.phone }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not load donor contact', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
