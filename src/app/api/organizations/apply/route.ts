import { NextResponse } from 'next/server';
import { toOrganizationDto } from '@/lib/dto';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/supabase/server';
import { parseOrganizationApplyInput } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 20_000;

/**
 * Applies to register a new organization (hospital, blood bank, voluntary org). Open to everyone, signed
 * in or not — same spirit as donor registration and SOS. Starts `pending`; an admin with `panel.hospitals`
 * decides (`PATCH /api/admin/organizations/[id]`). When signed in, the applicant's email can be granted
 * the Hospital staff role for this organization on approval.
 */
export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = parseOrganizationApplyInput(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });
  const input = parsed.value;

  try {
    const prisma = getPrisma();
    const userId = await getCurrentUserId();
    const org = await prisma.organization.create({
      data: {
        name: input.name,
        type: input.type,
        address: input.address,
        licenseNumber: input.licenseNumber,
        division: input.division,
        district: input.district,
        hotline: input.hotline,
        emergencyContact: input.emergencyContact,
        directorName: input.directorName,
        totalBeds: input.totalBeds,
        icuBeds: input.icuBeds,
        appliedBy: userId,
      },
    });
    return NextResponse.json({ organization: toOrganizationDto(org) }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not save organization application', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
