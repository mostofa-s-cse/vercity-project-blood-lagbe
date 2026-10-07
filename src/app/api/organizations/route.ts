import { NextResponse } from 'next/server';
import { toOrganizationDto } from '@/lib/dto';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Every organization (approved and pending alike) — public, same exposure as the rest of the hospital directory. */
export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });
  try {
    const rows = await getPrisma().organization.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json({ organizations: rows.map(toOrganizationDto) });
  } catch (error) {
    console.error('Could not load organizations', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
