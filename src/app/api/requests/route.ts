import { NextResponse } from 'next/server';
import type { BloodGroup, Prisma, RequestStatus } from '@/generated/prisma/client';
import { toRequestDto } from '@/lib/dto';
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
  const { status, emergency, bloodGroup, ids, mine, page, pageSize } = parsed.value;

  let userId: string | null = null;
  if (mine) {
    userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  }

  const where: Prisma.SosRequestWhereInput = {
    ...(status ? { status: status as RequestStatus } : {}),
    ...(emergency ? { isCritical: true } : {}),
    ...(bloodGroup ? { bloodGroup: DB_BLOOD_GROUP[bloodGroup] as BloodGroup } : {}),
    ...(ids ? { id: { in: ids } } : {}),
    ...(userId ? { userId } : {}),
  };

  try {
    const prisma = getPrisma();
    const [rows, total] = await Promise.all([
      prisma.sosRequest.findMany({
        where,
        // Enum order is PENDING, DONOR_FOUND, COMPLETED, CANCELLED, so open requests come first.
        orderBy: [{ status: 'asc' }, { isCritical: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { responses: true } } },
      }),
      prisma.sosRequest.count({ where }),
    ]);
    return NextResponse.json({ requests: rows.map(toRequestDto), total, page, pageSize });
  } catch (error) {
    console.error('Could not load requests', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}
