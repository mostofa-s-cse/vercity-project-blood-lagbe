import { NextResponse } from 'next/server';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { BLOOD_GROUP_FROM_DB } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Blood stock the hospitals have reported, as `{ hospitalId: { "O+": 12, ... } }`. Public: anyone in an
 * emergency should see it. Groups nobody has reported are missing, and the screen falls back to sample data.
 */
export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });
  try {
    const rows = await getPrisma().hospitalStock.findMany();
    const stock: Record<string, Record<string, number>> = {};
    for (const row of rows) {
      const group = BLOOD_GROUP_FROM_DB[row.bloodGroup];
      if (!group) continue;
      (stock[row.hospitalId] ??= {})[group] = row.units;
    }
    return NextResponse.json({ stock });
  } catch (error) {
    console.error('Could not load hospital stock', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
