import { NextResponse } from 'next/server';
import { toRequestDto, toResponseDto } from '@/lib/dto';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { canManageRequest, MANAGE_TOKEN_HEADER } from '@/lib/requestAccess';
import { canTransition } from '@/lib/requestStatus';
import { getClaims } from '@/lib/supabase/server';
import { parseStatusInput } from '@/lib/validation';
import type { RequestStatus } from '@/generated/prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Writes a real donation for every responder who is a registered donor (has a `donorId`), and moves
 * that donor's `lastDonationAt` to now. A responder who only left a name and phone (no account) gets no
 * donation row — there is no donor profile to attach it to, and inventing one would be dishonest.
 */
async function recordDonations(prisma: ReturnType<typeof getPrisma>, requestId: string, headers: Headers): Promise<void> {
  const [request, responses, claims] = await Promise.all([
    prisma.sosRequest.findUnique({ where: { id: requestId }, select: { place: true } }),
    prisma.requestResponse.findMany({ where: { requestId, donorId: { not: null } }, select: { donorId: true } }),
    getClaims(),
  ]);
  if (!request || responses.length === 0) return;

  const confirmedBy = typeof claims?.email === 'string' ? claims.email : null;
  const donorIds = [...new Set(responses.map((r) => r.donorId as string))];
  const now = new Date();

  await prisma.$transaction([
    prisma.donation.createMany({
      data: donorIds.map((donorId) => ({ donorId, requestId, hospital: request.place, donatedAt: now, confirmedBy })),
    }),
    prisma.donor.updateMany({ where: { id: { in: donorIds } }, data: { lastDonationAt: now } }),
  ]);
}

/**
 * One request with the people who answered it. Open to everyone; the answerers' phone numbers are only
 * included for whoever manages the request (`canManage`): the holder of its manage token, the signed-in
 * person who made it, or an admin-panel user with `panel.requests`.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  const { id } = await params;
  try {
    const row = await getPrisma().sosRequest.findUnique({
      where: { id },
      include: { _count: { select: { responses: true } }, responses: { orderBy: { createdAt: 'asc' } } },
    });
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const canManage = await canManageRequest(row, request.headers);
    return NextResponse.json(
      {
        request: toRequestDto(row),
        responses: row.responses.map((response) => toResponseDto(response, canManage)),
        canManage,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Could not load request', error);
    return NextResponse.json({ error: 'load_failed' }, { status: 500 });
  }
}

/**
 * Moves a request along its life: pending, donor found, completed, cancelled (see `canTransition`).
 * Allowed for the holder of its manage token, the signed-in person who made it, or an admin-panel user
 * with `panel.requests`. Completed and cancelled requests are final.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = parseStatusInput(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });
  const target = parsed.value.status;

  const { id } = await params;
  try {
    const prisma = getPrisma();
    const row = await prisma.sosRequest.findUnique({ where: { id }, select: { status: true, manageTokenHash: true, userId: true } });
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (!(await canManageRequest(row, request.headers))) {
      // No credentials at all is a 401; credentials that do not fit this request are a 403.
      const hasCredentials = Boolean(request.headers.get(MANAGE_TOKEN_HEADER)) || (await getClaims()) !== null;
      return NextResponse.json({ error: hasCredentials ? 'forbidden' : 'unauthorized' }, { status: hasCredentials ? 403 : 401 });
    }
    if (!canTransition(row.status, target)) return NextResponse.json({ error: 'invalid_transition' }, { status: 409 });

    // The old status is part of the condition, so two updates racing from the same state cannot both win.
    const changed = await prisma.sosRequest.updateMany({
      where: { id, status: row.status },
      data: { status: target as RequestStatus, ...(target === 'COMPLETED' ? { completedAt: new Date() } : {}) },
    });
    if (changed.count === 0) return NextResponse.json({ error: 'invalid_transition' }, { status: 409 });

    if (target === 'COMPLETED') await recordDonations(prisma, id, request.headers);

    const updated = await prisma.sosRequest.findUniqueOrThrow({ where: { id }, include: { _count: { select: { responses: true } } } });
    return NextResponse.json({ request: toRequestDto(updated) });
  } catch (error) {
    console.error('Could not update request', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
