import { NextResponse } from 'next/server';
import { claimsEmail, writeAuditLog } from '@/lib/auditLog';
import { toCampDto } from '@/lib/dto';
import { requireHospitalManager } from '@/lib/hospitalGuard';
import { getPrisma } from '@/lib/prisma';
import { can } from '@/lib/roles';
import { parseCampInput } from '@/lib/validation';

export const runtime = 'nodejs';

/** Schedules a donation camp for this hospital. Needs the `camps.create` permission as well as access to the hospital. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireHospitalManager(id);
  if (guard.response) return guard.response;
  if (!can(guard.claims, 'camps.create')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = parseCampInput(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });

  try {
    const { timeRange, ...rest } = parsed.value;
    const row = await getPrisma().camp.create({
      data: {
        ...rest,
        timeRange: timeRange ?? null,
        hospitalId: id,
        organizer: guard.hospitalName,
        createdBy: typeof guard.claims.sub === 'string' ? guard.claims.sub : null,
      },
    });
    await writeAuditLog(claimsEmail(guard.claims), 'camp.create', `${id} camp "${rest.title}" on ${rest.date}`);
    return NextResponse.json({ camp: toCampDto(row) }, { status: 201 });
  } catch (error) {
    console.error('Could not create camp', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
