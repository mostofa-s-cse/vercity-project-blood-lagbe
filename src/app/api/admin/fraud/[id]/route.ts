import { NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/adminGuard';
import { claimsEmail, writeAuditLog } from '@/lib/auditLog';
import { toFraudIncidentDto } from '@/lib/dto';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { parseFraudStatusInput } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Resolves a pending fraud incident as banned or dismissed. Needs `panel.fraud` or `ops.command`.
 * Only a `pending` incident can be resolved; an already-resolved one is final (409).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAnyPermission(['panel.fraud', 'ops.command']);
  if (guard.response) return guard.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = parseFraudStatusInput(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });

  try {
    const prisma = getPrisma();
    const email = claimsEmail(guard.claims);
    const result = await prisma.fraudIncident.updateMany({
      where: { id, status: 'pending' },
      data: { status: parsed.value.status, resolvedAt: new Date(), resolvedBy: email },
    });
    if (result.count === 0) {
      const existing = await prisma.fraudIncident.findUnique({ where: { id } });
      return NextResponse.json({ error: existing ? 'already_resolved' : 'not_found' }, { status: existing ? 409 : 404 });
    }

    const row = await prisma.fraudIncident.findUniqueOrThrow({ where: { id } });
    await writeAuditLog(email, 'fraud.resolve', `${row.type} (${id}) marked ${row.status}`);
    return NextResponse.json({ incident: toFraudIncidentDto(row) });
  } catch (error) {
    console.error('Could not resolve fraud incident', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
