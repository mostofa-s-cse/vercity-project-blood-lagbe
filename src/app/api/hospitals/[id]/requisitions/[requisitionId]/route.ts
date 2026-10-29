import { NextResponse } from 'next/server';
import { claimsEmail, writeAuditLog } from '@/lib/auditLog';
import { toRequisitionDto } from '@/lib/dto';
import { requireHospitalManager } from '@/lib/hospitalGuard';
import { getPrisma } from '@/lib/prisma';
import { parseRequisitionStatusInput } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * Closes an `issued` requisition. `fulfilled` takes its bags out of that group's stock (409
 * `not_enough_stock` when the hospital holds fewer); `cancelled` leaves stock alone.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; requisitionId: string }> }) {
  const { id, requisitionId } = await params;
  const guard = await requireHospitalManager(id);
  if (guard.response) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = parseRequisitionStatusInput(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });

  try {
    const prisma = getPrisma();
    const row = await prisma.requisition.findFirst({ where: { id: requisitionId, hospitalId: id } });
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (row.status !== 'issued') return NextResponse.json({ error: 'already_closed' }, { status: 409 });

    const { status } = parsed.value;
    if (status === 'cancelled') {
      const updated = await prisma.requisition.update({ where: { id: requisitionId }, data: { status, closedAt: new Date() } });
      await writeAuditLog(claimsEmail(guard.claims), 'requisition.cancel', `${id} requisition ${requisitionId}`);
      return NextResponse.json({ requisition: toRequisitionDto(updated) });
    }

    // Take the bags only if the stock still covers them (the condition is part of the update, so two
    // people fulfilling at once cannot both succeed on the same bags).
    const taken = await prisma.hospitalStock.updateMany({
      where: { hospitalId: id, bloodGroup: row.bloodGroup, units: { gte: row.bags } },
      data: { units: { decrement: row.bags } },
    });
    if (taken.count === 0) return NextResponse.json({ error: 'not_enough_stock' }, { status: 409 });
    const closed = await prisma.requisition.updateMany({ where: { id: requisitionId, status: 'issued' }, data: { status, closedAt: new Date() } });
    if (closed.count === 0) {
      // Someone closed it between our read and now: give the bags back.
      await prisma.hospitalStock.updateMany({ where: { hospitalId: id, bloodGroup: row.bloodGroup }, data: { units: { increment: row.bags } } });
      return NextResponse.json({ error: 'already_closed' }, { status: 409 });
    }
    const updated = await prisma.requisition.findUniqueOrThrow({ where: { id: requisitionId } });
    await writeAuditLog(claimsEmail(guard.claims), 'requisition.fulfil', `${id} requisition ${requisitionId}, ${row.bags} bags out of stock`);
    return NextResponse.json({ requisition: toRequisitionDto(updated) });
  } catch (error) {
    console.error('Could not close requisition', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
