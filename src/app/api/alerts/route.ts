import { NextResponse } from 'next/server';
import { toAlertDto } from '@/lib/dto';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The alerts the header ribbon shows: active ones only, oldest first. Public, like the ribbon itself. */
export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });
  try {
    const rows = await getPrisma().emergencyAlert.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    return NextResponse.json({ alerts: rows.map(toAlertDto) });
  } catch (error) {
    console.error('Could not load alerts', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
