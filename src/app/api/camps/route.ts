import { NextResponse } from 'next/server';
import { toCampDto } from '@/lib/dto';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Every scheduled donation camp, soonest first. Public: camps exist to be found. */
export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });
  try {
    const rows = await getPrisma().camp.findMany({ orderBy: [{ date: 'asc' }, { createdAt: 'asc' }], take: 200 });
    return NextResponse.json({ camps: rows.map(toCampDto) });
  } catch (error) {
    console.error('Could not load camps', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
