import { NextResponse } from 'next/server';
import type { BloodGroup } from '@/generated/prisma/client';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/supabase/server';
import { DB_BLOOD_GROUP, parseDonorInput } from '@/lib/validation';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 20_000;

/** Saves a donor registration. Works signed out; when signed in the donor is linked to the person's profile. */
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

  const parsed = parseDonorInput(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });
  const input = parsed.value;

  try {
    const prisma = getPrisma();
    const userId = await getCurrentUserId();
    // The profile row is made at sign-in; if it is missing, save the donor without the link rather than fail.
    const profile = userId ? await prisma.profile.findUnique({ where: { id: userId }, select: { id: true } }) : null;

    const donor = await prisma.donor.create({
      data: {
        userId: profile?.id ?? null,
        name: input.name,
        phone: input.phone,
        bloodGroup: DB_BLOOD_GROUP[input.bloodGroup] as BloodGroup,
        area: input.area,
        age: input.age,
        gender: input.gender,
        division: input.division,
        email: input.email,
        weightKg: input.weightKg,
        lastDonationMonths: input.lastDonationMonths,
        vehicle: input.vehicle,
        nearestHospital: input.nearestHospital,
        isAvailable: input.isAvailable,
      },
      select: { id: true },
    });
    return NextResponse.json({ id: donor.id }, { status: 201 });
  } catch (error) {
    console.error('Could not save donor', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
