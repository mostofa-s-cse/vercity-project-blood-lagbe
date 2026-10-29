import { NextResponse } from 'next/server';
import type { BloodGroup } from '@/generated/prisma/client';
import { claimsEmail, writeAuditLog } from '@/lib/auditLog';
import { toRequisitionDto } from '@/lib/dto';
import { requireHospitalManager } from '@/lib/hospitalGuard';
import { getPrisma } from '@/lib/prisma';
import { DB_BLOOD_GROUP, parseRequisitionInput } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** This hospital's requisitions, newest first. Hospital staff and admins only (they hold patient names). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireHospitalManager(id);
  if (guard.response) return guard.response;
  try {
    const rows = await getPrisma().requisition.findMany({ where: { hospitalId: id }, orderBy: { createdAt: 'desc' }, take: 100 });
    return NextResponse.json({ requisitions: rows.map(toRequisitionDto) });
  } catch (error) {
    console.error('Could not load requisitions', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}

/** Issues a requisition (status `issued`). */
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
  const parsed = parseRequisitionInput(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });

  try {
    const { bloodGroup, ward, ...rest } = parsed.value;
    const row = await getPrisma().requisition.create({
      data: {
        ...rest,
        ward: ward ?? null,
        hospitalId: id,
        bloodGroup: DB_BLOOD_GROUP[bloodGroup] as BloodGroup,
        createdBy: typeof guard.claims.sub === 'string' ? guard.claims.sub : null,
      },
    });
    await writeAuditLog(claimsEmail(guard.claims), 'requisition.issue', `${id} ${rest.bags} x ${bloodGroup} for ${rest.patientName}`);
    return NextResponse.json({ requisition: toRequisitionDto(row) }, { status: 201 });
  } catch (error) {
    console.error('Could not issue requisition', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
