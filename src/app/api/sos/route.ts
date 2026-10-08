import { NextResponse } from 'next/server';
import type { BloodGroup } from '@/generated/prisma/client';
import { COMPATIBLE_DONORS } from '@/lib/bloodCompatibility';
import { DONATION_COOLDOWN_DAYS } from '@/lib/eligibility';
import { findMatchingDonors, type MatchDonor } from '@/lib/donorMatching';
import { hashToken, newManageToken } from '@/lib/manageToken';
import { sendEmail, sendSms } from '@/lib/notifyChannels';
import { isSameOrigin } from '@/lib/originCheck';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { checkRateLimit, clientKey } from '@/lib/rateLimit';
import { getCurrentUserId } from '@/lib/supabase/server';
import { BLOOD_GROUP_FROM_DB, DB_BLOOD_GROUP, parseSosInput } from '@/lib/validation';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 20_000;

/**
 * Saves an SOS request. Works signed out (people in an emergency should not have to sign in); when signed
 * in it is linked to the profile. The answer carries a one-time `manageToken` that lets the person
 * complete or cancel the request later without an account; only its hash is stored.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  const rate = checkRateLimit(clientKey(request, 'sos'), { limit: 5, windowMs: 10 * 60_000 });
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

  const parsed = parseSosInput(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });
  const input = parsed.value;

  try {
    const prisma = getPrisma();
    const userId = await getCurrentUserId();
    const profile = userId ? await prisma.profile.findUnique({ where: { id: userId }, select: { id: true } }) : null;

    const manageToken = newManageToken();
    const sos = await prisma.sosRequest.create({
      data: {
        userId: profile?.id ?? null,
        manageTokenHash: hashToken(manageToken),
        area: input.area,
        problem: input.problem,
        patientName: input.patientName,
        patientAge: input.patientAge,
        attendantName: input.attendantName,
        bloodGroup: DB_BLOOD_GROUP[input.bloodGroup] as BloodGroup,
        bags: input.bags,
        place: input.place,
        phones: input.phones,
        isCritical: input.isCritical,
        language: input.language,
        postText: input.postText,
        latitude: input.latitude,
        longitude: input.longitude,
      },
      select: { id: true },
    });

    // Notifying compatible donors is best-effort: the request is already saved, so a problem here is
    // logged, never turned into a failed response (no job queue in this project — see the WP4 plan).
    try {
      const compatibleDbGroups = COMPATIBLE_DONORS[input.bloodGroup].map((group) => DB_BLOOD_GROUP[group] as BloodGroup);
      const eligibleCutoff = new Date(Date.now() - DONATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
      const candidates = await prisma.donor.findMany({
        where: {
          bloodGroup: { in: compatibleDbGroups },
          isAvailable: true,
          OR: [{ lastDonationAt: null }, { lastDonationAt: { lte: eligibleCutoff } }],
        },
      });
      const matchDonors: MatchDonor[] = candidates.map((donor) => ({
        id: donor.id,
        bloodGroup: BLOOD_GROUP_FROM_DB[donor.bloodGroup],
        area: donor.area,
        division: donor.division,
        latitude: donor.latitude,
        longitude: donor.longitude,
        isAvailable: donor.isAvailable,
        lastDonationAt: donor.lastDonationAt,
        userId: donor.userId,
      }));
      const matched = findMatchingDonors(matchDonors, {
        bloodGroup: input.bloodGroup,
        area: input.area ?? null,
        division: null, // SosRequest has no division column; area is the only location text it carries.
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        userId: profile?.id ?? null,
      });

      if (matched.length > 0) {
        await prisma.notification.createMany({
          data: matched.map((donor) => ({
            donorId: donor.id,
            requestId: sos.id,
            bloodGroup: DB_BLOOD_GROUP[input.bloodGroup] as BloodGroup,
          })),
        });
        await Promise.all(
          matched.map((donor) => {
            const matchedRow = candidates.find((c) => c.id === donor.id)!;
            return Promise.all([
              matchedRow.email ? sendEmail(matchedRow.email, 'Blood needed nearby', input.postText) : undefined,
              sendSms(matchedRow.phone, input.postText),
            ]);
          })
        );
      }
    } catch (notifyError) {
      console.error('Could not notify matching donors', notifyError);
    }

    return NextResponse.json({ id: sos.id, manageToken }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not save SOS request', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
