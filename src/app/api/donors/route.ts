import { NextResponse } from 'next/server';
import type { BloodGroup, Prisma } from '@/generated/prisma/client';
import { toDonorDto } from '@/lib/dto';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/supabase/server';
import { DB_BLOOD_GROUP, parseDonorInput, parseDonorQuery } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 20_000;

/**
 * Searches donors. Open to everyone, signed in or not. Available donors come first, then the newest.
 * Phone numbers are masked here; a single donor's full number comes from `GET /api/donors/[id]/contact`.
 */
export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const parsed = parseDonorQuery(new URL(request.url).searchParams);
  if (parsed.error) return NextResponse.json({ error: 'invalid_query', field: parsed.error }, { status: 400 });
  const { bloodGroup, q, available, page, pageSize } = parsed.value;

  const where: Prisma.DonorWhereInput = {
    ...(bloodGroup ? { bloodGroup: DB_BLOOD_GROUP[bloodGroup] as BloodGroup } : {}),
    ...(available ? { isAvailable: true } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { area: { contains: q, mode: 'insensitive' } },
            { division: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  try {
    const prisma = getPrisma();
    const [rows, total] = await Promise.all([
      prisma.donor.findMany({
        where,
        orderBy: [{ isAvailable: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.donor.count({ where }),
    ]);
    return NextResponse.json({ donors: rows.map(toDonorDto), total, page, pageSize });
  } catch (error) {
    console.error('Could not load donors', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}

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
