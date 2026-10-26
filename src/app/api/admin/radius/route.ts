import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/adminGuard';
import { claimsEmail, writeAuditLog } from '@/lib/auditLog';
import { toRadiusDto } from '@/lib/dto';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { parseRadiusInput } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The saved emergency radius, or `{ radius: null }` when none was saved yet. Needs `panel.alerts`. */
export async function GET() {
  const guard = await requirePermission('panel.alerts');
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });
  try {
    const row = await getPrisma().emergencyRadius.findUnique({ where: { id: 'default' } });
    return NextResponse.json({ radius: row ? toRadiusDto(row) : null });
  } catch (error) {
    console.error('Could not load emergency radius', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}

/** Saves the emergency radius (replaces the whole setting). An empty custom text clears the saved one. Needs `panel.alerts`. */
export async function PUT(request: Request) {
  const guard = await requirePermission('panel.alerts');
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = parseRadiusInput(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });

  try {
    const { customTextBn, customTextEn, ...rest } = parsed.value;
    const actorEmail = claimsEmail(guard.claims);
    const data = { ...rest, customTextBn: customTextBn || null, customTextEn: customTextEn || null, updatedBy: actorEmail };
    const row = await getPrisma().emergencyRadius.upsert({ where: { id: 'default' }, create: { id: 'default', ...data }, update: data });
    await writeAuditLog(actorEmail, 'radius.update', `${row.zone}, ${row.radiusKm} km, ${row.isActive ? 'on' : 'off'}`);
    return NextResponse.json({ radius: toRadiusDto(row) });
  } catch (error) {
    console.error('Could not save emergency radius', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
