import { NextResponse } from 'next/server';
import { toRequestDto, toResponseDto } from '@/lib/dto';
import { isSameOrigin } from '@/lib/originCheck';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { canManageRequest, MANAGE_TOKEN_HEADER } from '@/lib/requestAccess';
import { canTransition } from '@/lib/requestStatus';
import { getClaims } from '@/lib/supabase/server';
import { parseStatusInput } from '@/lib/validation';
import { generateDonationCode, parseDonationsInput, planDonations, type DonationPlan, type DonationSelection } from '@/lib/donationConfirm';
import type { RequestStatus } from '@/generated/prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Writes what the requester confirmed (see `planDonations`): a donation with a traceable code for every
 * registered donor, the donor's `lastDonationAt`, and the units on each confirmed answer. A responder who
 * only left a name and phone has no donor profile to attach a donation to, so only the units are kept.
 */
async function recordDonations(prisma: ReturnType<typeof getPrisma>, requestId: string, plan: DonationPlan): Promise<void> {
  if (plan.confirmed.length === 0) return;
  const [request, claims] = await Promise.all([
    prisma.sosRequest.findUnique({ where: { id: requestId }, select: { place: true, bloodGroup: true } }),
    getClaims(),
  ]);
  if (!request) return;

  const confirmedBy = typeof claims?.email === 'string' ? claims.email : null;
  const now = new Date();
  const codes = new Set<string>();
  const nextCode = () => {
    let code = generateDonationCode();
    while (codes.has(code)) code = generateDonationCode();
    codes.add(code);
    return code;
  };

  await prisma.$transaction([
    // One donation each, with the donor's "your donation was confirmed" notification created alongside.
    ...plan.donations.map(({ donorId, units }) =>
      prisma.donation.create({
        data: {
          donorId,
          requestId,
          units,
          code: nextCode(),
          hospital: request.place,
          donatedAt: now,
          confirmedBy,
          notifications: { create: { donorId, requestId, bloodGroup: request.bloodGroup, type: 'donation_confirmed' } },
        },
      })
    ),
    prisma.donor.updateMany({ where: { id: { in: plan.donations.map((d) => d.donorId) } }, data: { lastDonationAt: now } }),
    ...plan.confirmed.map(({ responseId, units }) =>
      prisma.requestResponse.update({ where: { id: responseId }, data: { donatedUnits: units, donationRejected: false } })
    ),
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
    // The traceable code of each confirmed donation, found by the registered donor who answered.
    const gifts = row.status === 'COMPLETED' ? await getPrisma().donation.findMany({ where: { requestId: id }, select: { donorId: true, code: true } }) : [];
    const codeByDonor = new Map(gifts.map((gift) => [gift.donorId, gift.code]));
    return NextResponse.json(
      {
        request: toRequestDto(row),
        responses: row.responses.map((response) => toResponseDto(response, canManage, response.donorId ? codeByDonor.get(response.donorId) ?? null : null)),
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
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
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

  // Who actually donated. Left out entirely = the older call that names nobody (see `planDonations`).
  let selected: DonationSelection[] | null = null;
  const rawDonations = (body as { donations?: unknown }).donations;
  if (target === 'COMPLETED' && rawDonations !== undefined) {
    const donations = parseDonationsInput(rawDonations);
    if (donations.error) return NextResponse.json({ error: 'invalid_input', field: donations.error }, { status: 400 });
    selected = donations.value;
  }

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

    // Checked before anything is written, so a bad selection never leaves a half-completed request.
    let plan: DonationPlan | null = null;
    if (target === 'COMPLETED') {
      const responders = await prisma.requestResponse.findMany({ where: { requestId: id }, select: { id: true, donorId: true } });
      const planned = planDonations(responders, selected);
      if (planned.error) return NextResponse.json({ error: 'invalid_input', field: planned.error }, { status: 400 });
      plan = planned.value;
    }

    // The old status is part of the condition, so two updates racing from the same state cannot both win.
    const changed = await prisma.sosRequest.updateMany({
      where: { id, status: row.status },
      data: { status: target as RequestStatus, ...(target === 'COMPLETED' ? { completedAt: new Date() } : {}) },
    });
    if (changed.count === 0) return NextResponse.json({ error: 'invalid_transition' }, { status: 409 });

    if (plan) await recordDonations(prisma, id, plan);

    const updated = await prisma.sosRequest.findUniqueOrThrow({ where: { id }, include: { _count: { select: { responses: true } } } });
    return NextResponse.json({ request: toRequestDto(updated) });
  } catch (error) {
    console.error('Could not update request', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
