import { NextResponse } from 'next/server';
import type { BloodGroup } from '@/generated/prisma/client';
import { claimsEmail, writeAuditLog } from '@/lib/auditLog';
import { toStockBatchDto } from '@/lib/dto';
import { requireHospitalManager } from '@/lib/hospitalGuard';
import { getPrisma } from '@/lib/prisma';
import { DB_BLOOD_GROUP, parseBatchInput } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The batches this hospital still holds, soonest expiry first. Hospital staff and admins only. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireHospitalManager(id);
  if (guard.response) return guard.response;
  try {
    const rows = await getPrisma().stockBatch.findMany({ where: { hospitalId: id }, orderBy: [{ expiresAt: 'asc' }, { receivedAt: 'asc' }] });
    return NextResponse.json({ batches: rows.map(toStockBatchDto) });
  } catch (error) {
    console.error('Could not load stock batches', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}

/** Receives bags with an expiry date: saves the batch and adds the units to the group's stock, together. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireHospitalManager(id);
  if (guard.response) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = parseBatchInput(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });

  try {
    const { bloodGroup: group, units, expiresAt } = parsed.value;
    const bloodGroup = DB_BLOOD_GROUP[group] as BloodGroup;
    const updatedBy = typeof guard.claims.sub === 'string' ? guard.claims.sub : null;
    const [batch, stock] = await getPrisma().$transaction([
      getPrisma().stockBatch.create({ data: { hospitalId: id, bloodGroup, units, expiresAt, receivedBy: updatedBy } }),
      getPrisma().hospitalStock.upsert({
        where: { hospitalId_bloodGroup: { hospitalId: id, bloodGroup } },
        create: { hospitalId: id, bloodGroup, units, updatedBy },
        update: { units: { increment: units }, updatedBy },
      }),
    ]);
    await writeAuditLog(claimsEmail(guard.claims), 'stock.receive', `${id} received ${units} x ${group}, expires ${expiresAt}`);
    return NextResponse.json({ batch: toStockBatchDto(batch), units: stock.units }, { status: 201 });
  } catch (error) {
    console.error('Could not receive stock batch', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
