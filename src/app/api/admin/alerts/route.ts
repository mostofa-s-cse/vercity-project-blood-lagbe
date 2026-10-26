import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/adminGuard';
import { MAX_ALERTS } from '@/lib/alertList';
import { claimsEmail, writeAuditLog } from '@/lib/auditLog';
import { toAlertDto } from '@/lib/dto';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { parseAlertInput } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Every alert, active or not, for the Admin Panel's Alerts tab. Needs `panel.alerts`. */
export async function GET() {
  const guard = await requirePermission('panel.alerts');
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });
  try {
    const rows = await getPrisma().emergencyAlert.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json({ alerts: rows.map(toAlertDto) });
  } catch (error) {
    console.error('Could not load alerts', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}

/** Adds an alert (at most `MAX_ALERTS` in all). Needs `panel.alerts`. */
export async function POST(request: Request) {
  const guard = await requirePermission('panel.alerts');
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = parseAlertInput(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });

  try {
    const prisma = getPrisma();
    if ((await prisma.emergencyAlert.count()) >= MAX_ALERTS) return NextResponse.json({ error: 'limit' }, { status: 409 });
    const actorEmail = claimsEmail(guard.claims);
    const row = await prisma.emergencyAlert.create({ data: { ...parsed.value, updatedBy: actorEmail } });
    await writeAuditLog(actorEmail, 'alert.create', `${row.hospital} (${row.id})`);
    return NextResponse.json({ alert: toAlertDto(row) }, { status: 201 });
  } catch (error) {
    console.error('Could not save alert', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
