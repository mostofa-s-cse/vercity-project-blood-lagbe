import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/adminGuard';
import { claimsEmail, writeAuditLog } from '@/lib/auditLog';
import { toAlertDto } from '@/lib/dto';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { parseAlertUpdateInput } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Changes some fields of an alert (switch on/off, edit). An empty custom message clears it. Needs `panel.alerts`. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('panel.alerts');
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = parseAlertUpdateInput(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });

  try {
    const prisma = getPrisma();
    const existing = await prisma.emergencyAlert.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const { customMessageBn, customMessageEn, ...rest } = parsed.value;
    const actorEmail = claimsEmail(guard.claims);
    const row = await prisma.emergencyAlert.update({
      where: { id },
      data: {
        ...rest,
        ...(customMessageBn !== undefined && { customMessageBn: customMessageBn || null }),
        ...(customMessageEn !== undefined && { customMessageEn: customMessageEn || null }),
        updatedBy: actorEmail,
      },
    });
    await writeAuditLog(actorEmail, 'alert.update', `${row.hospital} (${id})`);
    return NextResponse.json({ alert: toAlertDto(row) });
  } catch (error) {
    console.error('Could not update alert', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}

/** Deletes an alert for good. Needs `panel.alerts`. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('panel.alerts');
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const { id } = await params;
  try {
    const prisma = getPrisma();
    const existing = await prisma.emergencyAlert.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    await prisma.emergencyAlert.delete({ where: { id } });
    await writeAuditLog(claimsEmail(guard.claims), 'alert.delete', `${existing.hospital} (${id})`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Could not delete alert', error);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}
