import { NextResponse } from 'next/server';
import type { BloodGroup, Prisma } from '@/generated/prisma/client';
import { toDonorDto } from '@/lib/dto';
import { DONATION_COOLDOWN_DAYS } from '@/lib/eligibility';
import { boundingBox, haversineDistanceKm } from '@/lib/geo';
import { hashToken, newManageToken } from '@/lib/manageToken';
import { isSameOrigin } from '@/lib/originCheck';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { checkRateLimit, clientKey } from '@/lib/rateLimit';
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
  const { bloodGroup, q, available, mine, near, page, pageSize } = parsed.value;

  let userId: string | null = null;
  if (mine) {
    userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  }

  // "Available" means both the manual switch and the automatic 90-day eligibility rule (WP5).
  const eligibleCutoff = new Date(Date.now() - DONATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  const nearBox = near ? boundingBox({ lat: near.lat, lng: near.lng }, near.radiusKm) : null;

  const where: Prisma.DonorWhereInput = {
    ...(bloodGroup ? { bloodGroup: DB_BLOOD_GROUP[bloodGroup] as BloodGroup } : {}),
    ...(available ? { isAvailable: true } : {}),
    ...(userId ? { userId } : {}),
    AND: [
      ...(available ? [{ OR: [{ lastDonationAt: null }, { lastDonationAt: { lte: eligibleCutoff } }] }] : []),
      ...(q
        ? [
            {
              OR: [
                { name: { contains: q, mode: 'insensitive' as const } },
                { area: { contains: q, mode: 'insensitive' as const } },
                { division: { contains: q, mode: 'insensitive' as const } },
              ],
            },
          ]
        : []),
      // A cheap pre-filter; the exact Haversine cutoff and sort happen below, in application code.
      ...(nearBox
        ? [{ latitude: { gte: nearBox.minLat, lte: nearBox.maxLat }, longitude: { gte: nearBox.minLng, lte: nearBox.maxLng } }]
        : []),
    ],
  };

  try {
    const prisma = getPrisma();

    if (near) {
      const rows = await prisma.donor.findMany({ where });
      const withDistance = rows
        .map((row) => ({ row, distanceKm: haversineDistanceKm(near, { lat: row.latitude!, lng: row.longitude! }) }))
        .filter(({ distanceKm }) => distanceKm <= near.radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);
      const total = withDistance.length;
      const page_ = withDistance.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
      return NextResponse.json({
        donors: page_.map(({ row, distanceKm }) => toDonorDto(row, distanceKm)),
        total,
        page,
        pageSize,
      });
    }

    const [rows, total] = await Promise.all([
      prisma.donor.findMany({
        where,
        orderBy: [{ isAvailable: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.donor.count({ where }),
    ]);
    return NextResponse.json({ donors: rows.map((row) => toDonorDto(row)), total, page, pageSize });
  } catch (error) {
    console.error('Could not load donors', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}

/**
 * Saves a donor registration. Works signed out; when signed in the donor is linked to the person's
 * profile. The answer carries a one-time `manageToken` that lets the person edit their own profile later
 * without an account; only its hash is stored.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  const rate = checkRateLimit(clientKey(request, 'donors'), { limit: 5, windowMs: 10 * 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } }
    );
  }
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

    const manageToken = newManageToken();
    const donor = await prisma.donor.create({
      data: {
        userId: profile?.id ?? null,
        manageTokenHash: hashToken(manageToken),
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
        latitude: input.latitude,
        longitude: input.longitude,
      },
      select: { id: true },
    });
    return NextResponse.json({ id: donor.id, manageToken }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not save donor', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
