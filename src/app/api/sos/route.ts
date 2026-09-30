import { NextResponse } from 'next/server';
import type { BloodGroup } from '@/generated/prisma/client';
import { hashToken, newManageToken } from '@/lib/manageToken';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/supabase/server';
import { DB_BLOOD_GROUP, parseSosInput } from '@/lib/validation';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 20_000;

/**
 * Saves an SOS request. Works signed out (people in an emergency should not have to sign in); when signed
 * in it is linked to the profile. The answer carries a one-time `manageToken` that lets the person
 * complete or cancel the request later without an account; only its hash is stored.
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
      },
      select: { id: true },
    });
    return NextResponse.json({ id: sos.id, manageToken }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not save SOS request', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
