import { NextResponse } from 'next/server';
import { toResponseDto } from '@/lib/dto';
import { isSameOrigin } from '@/lib/originCheck';
import { getPrisma, isDatabaseConfigured } from '@/lib/prisma';
import { checkRateLimit, clientKey } from '@/lib/rateLimit';
import { getCurrentUserId } from '@/lib/supabase/server';
import { turnstileTokenFromBody, verifyTurnstileToken } from '@/lib/turnstile';
import { parseRespondInput } from '@/lib/validation';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 5_000;

/**
 * "I can donate": records that someone answered a blood request. Open to everyone. The first answer moves
 * a pending request to "donor found". The same phone number can answer a request only once, and closed
 * (completed or cancelled) requests take no answers.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  const rate = checkRateLimit(clientKey(request, 'respond'), { limit: 10, windowMs: 10 * 60_000 });
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
  if (!(await verifyTurnstileToken(turnstileTokenFromBody(body)))) {
    return NextResponse.json({ error: 'captcha_failed' }, { status: 403 });
  }
  const parsed = parseRespondInput(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });
  const { name, phone } = parsed.value;

  const { id } = await params;
  try {
    const prisma = getPrisma();
    const userId = await getCurrentUserId();
    // If this phone belongs to a registered donor, link the answer to that donor.
    const donor = await prisma.donor.findFirst({ where: { phone }, select: { id: true } });

    const outcome = await prisma.$transaction(async (tx) => {
      const found = await tx.sosRequest.findUnique({ where: { id }, select: { status: true } });
      if (!found) return { kind: 'not_found' as const };
      if (found.status !== 'PENDING' && found.status !== 'DONOR_FOUND') return { kind: 'closed' as const };

      const duplicate = await tx.requestResponse.findUnique({ where: { requestId_phone: { requestId: id, phone } }, select: { id: true } });
      if (duplicate) return { kind: 'duplicate' as const };

      const response = await tx.requestResponse.create({
        data: { requestId: id, name, phone, donorId: donor?.id ?? null, userId },
      });
      // Only a request that is still pending moves; one that already has a donor stays as it is.
      await tx.sosRequest.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'DONOR_FOUND' } });
      return { kind: 'created' as const, response };
    });

    if (outcome.kind === 'not_found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (outcome.kind === 'closed') return NextResponse.json({ error: 'request_closed' }, { status: 409 });
    if (outcome.kind === 'duplicate') return NextResponse.json({ error: 'already_responded' }, { status: 409 });
    return NextResponse.json({ response: toResponseDto(outcome.response, false), status: 'DONOR_FOUND' }, { status: 201 });
  } catch (error) {
    // Two identical answers arriving at the same instant: the unique index stops the second.
    if (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'already_responded' }, { status: 409 });
    }
    console.error('Could not save response', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
