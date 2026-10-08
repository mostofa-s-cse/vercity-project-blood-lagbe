import { NextResponse } from 'next/server';
import { toOrganizationDto } from '@/lib/dto';
import { boundingBox, haversineDistanceKm } from '@/lib/geo';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { parseOrganizationQuery } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Every organization (approved and pending alike) — public, same exposure as the rest of the hospital
 * directory. `near=lat,lng[,radiusKm]` sorts by distance instead of creation order (nearest hospital).
 */
export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const parsed = parseOrganizationQuery(new URL(request.url).searchParams);
  if (parsed.error) return NextResponse.json({ error: 'invalid_query', field: parsed.error }, { status: 400 });
  const { near } = parsed.value;

  try {
    const prisma = getPrisma();

    if (near) {
      const box = boundingBox({ lat: near.lat, lng: near.lng }, near.radiusKm);
      const rows = await prisma.organization.findMany({
        where: { latitude: { gte: box.minLat, lte: box.maxLat }, longitude: { gte: box.minLng, lte: box.maxLng } },
      });
      const withDistance = rows
        .map((row) => ({ row, distanceKm: haversineDistanceKm(near, { lat: row.latitude!, lng: row.longitude! }) }))
        .filter(({ distanceKm }) => distanceKm <= near.radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);
      return NextResponse.json({ organizations: withDistance.map(({ row, distanceKm }) => toOrganizationDto(row, distanceKm)) });
    }

    const rows = await prisma.organization.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json({ organizations: rows.map((row) => toOrganizationDto(row)) });
  } catch (error) {
    console.error('Could not load organizations', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
