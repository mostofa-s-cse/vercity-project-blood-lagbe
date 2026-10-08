import { NextResponse } from 'next/server';
import type { BloodGroup, Prisma, RequestStatus } from '@/generated/prisma/client';
import { toRequestDto } from '@/lib/dto';
import { boundingBox, haversineDistanceKm } from '@/lib/geo';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/supabase/server';
import { DB_BLOOD_GROUP, parseRequestQuery } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Lists blood requests. Open to everyone: requests are public calls for help.
 * Order: requests still looking for donors first (pending, then donor found), emergencies before others,
 * then the newest. `ids=a,b` shows specific requests (the ones this browser made); `mine=1` needs sign-in.
 */
export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const parsed = parseRequestQuery(new URL(request.url).searchParams);
  if (parsed.error) return NextResponse.json({ error: 'invalid_query', field: parsed.error }, { status: 400 });
  const { status, emergency, bloodGroup, ids, mine, near, page, pageSize } = parsed.value;

  let userId: string | null = null;
  if (mine) {
    userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  }

  const nearBox = near ? boundingBox({ lat: near.lat, lng: near.lng }, near.radiusKm) : null;

  const where: Prisma.SosRequestWhereInput = {
    ...(status ? { status: status as RequestStatus } : {}),
    ...(emergency ? { isCritical: true } : {}),
    ...(bloodGroup ? { bloodGroup: DB_BLOOD_GROUP[bloodGroup] as BloodGroup } : {}),
    ...(ids ? { id: { in: ids } } : {}),
    ...(userId ? { userId } : {}),
    // A cheap pre-filter; the exact Haversine cutoff and sort happen below, in application code.
    ...(nearBox
      ? { latitude: { gte: nearBox.minLat, lte: nearBox.maxLat }, longitude: { gte: nearBox.minLng, lte: nearBox.maxLng } }
      : {}),
  };

  try {
    const prisma = getPrisma();
    const include = { _count: { select: { responses: true } } } as const;

    if (near) {
      const rows = await prisma.sosRequest.findMany({ where, include });
      const withDistance = rows
        .map((row) => ({ row, distanceKm: haversineDistanceKm(near, { lat: row.latitude!, lng: row.longitude! }) }))
        .filter(({ distanceKm }) => distanceKm <= near.radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);
      const total = withDistance.length;
      const page_ = withDistance.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
      return NextResponse.json({
        requests: page_.map(({ row, distanceKm }) => toRequestDto(row, distanceKm)),
        total,
        page,
        pageSize,
      });
    }

    const [rows, total] = await Promise.all([
      prisma.sosRequest.findMany({
        where,
        // Enum order is PENDING, DONOR_FOUND, COMPLETED, CANCELLED, so open requests come first.
        orderBy: [{ status: 'asc' }, { isCritical: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include,
      }),
      prisma.sosRequest.count({ where }),
    ]);
    return NextResponse.json({ requests: rows.map((row) => toRequestDto(row)), total, page, pageSize });
  } catch (error) {
    console.error('Could not load requests', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
