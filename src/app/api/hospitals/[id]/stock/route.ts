import { NextResponse } from 'next/server';
import type { BloodGroup } from '@/generated/prisma/client';
import { claimsEmail, writeAuditLog } from '@/lib/auditLog';
import { requireHospitalManager } from '@/lib/hospitalGuard';
import { getPrisma } from '@/lib/prisma';
import { BLOOD_GROUPS, DB_BLOOD_GROUP, parseStockInput } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * Sets how many units of one blood group a hospital holds.
 * Only an admin, or the hospital account that belongs to this hospital, may do it: checked here on the
 * server from the login token, so hiding the buttons in the screen is not the protection.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireHospitalManager(id);
  if (guard.response) return guard.response;
  const claims = guard.claims;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = parseStockInput(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });

  try {
    const bloodGroup = DB_BLOOD_GROUP[parsed.value.bloodGroup] as BloodGroup;
    const updatedBy = typeof claims.sub === 'string' ? claims.sub : null;
    await getPrisma().hospitalStock.upsert({
      where: { hospitalId_bloodGroup: { hospitalId: id, bloodGroup } },
      create: { hospitalId: id, bloodGroup, units: parsed.value.units, updatedBy },
      update: { units: parsed.value.units, updatedBy },
    });
    await writeAuditLog(claimsEmail(claims), 'stock.update', `${id} ${parsed.value.bloodGroup} set to ${parsed.value.units} units`);
    return NextResponse.json({ hospitalId: id, bloodGroup: parsed.value.bloodGroup, units: parsed.value.units });
  } catch (error) {
    console.error('Could not save hospital stock', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}

/** Removes a blood group from a hospital's stock (`?bloodGroup=O+`): the screen falls back to its default again. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireHospitalManager(id);
  if (guard.response) return guard.response;

  const group = new URL(request.url).searchParams.get('bloodGroup');
  if (!group || !(BLOOD_GROUPS as readonly string[]).includes(group)) {
    return NextResponse.json({ error: 'invalid_input', field: 'bloodGroup' }, { status: 400 });
  }
  try {
    const bloodGroup = DB_BLOOD_GROUP[group as keyof typeof DB_BLOOD_GROUP] as BloodGroup;
    await getPrisma().hospitalStock.deleteMany({ where: { hospitalId: id, bloodGroup } });
    await writeAuditLog(claimsEmail(guard.claims), 'stock.clear', `${id} ${group} removed from stock`);
    return NextResponse.json({ hospitalId: id, bloodGroup: group });
  } catch (error) {
    console.error('Could not clear hospital stock', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
