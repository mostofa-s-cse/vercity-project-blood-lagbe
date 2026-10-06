import { NextResponse } from 'next/server';
import type { BloodGroup } from '@/generated/prisma/client';
import { SAMPLE_HOSPITAL_ORGS } from '@/data/mockData';
import { claimsEmail, writeAuditLog } from '@/lib/auditLog';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { canManageHospital } from '@/lib/roles';
import { getClaims } from '@/lib/supabase/server';
import { DB_BLOOD_GROUP, parseStockInput } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * Sets how many units of one blood group a hospital holds.
 * Only an admin, or the hospital account that belongs to this hospital, may do it: checked here on the
 * server from the login token, so hiding the buttons in the screen is not the protection.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const claims = await getClaims();
  if (!claims) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const { id } = await params;
  if (!SAMPLE_HOSPITAL_ORGS.some((hospital) => hospital.id === id)) {
    return NextResponse.json({ error: 'unknown_hospital' }, { status: 404 });
  }
  if (!canManageHospital(claims, id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

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
