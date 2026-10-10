import { NextResponse } from 'next/server';
import { createPhoneAccount, type PhoneAuthAdmin } from '@/lib/phoneAuth';
import { isSameOrigin } from '@/lib/originCheck';
import { syncProfile } from '@/lib/profile';
import { checkRateLimit, clientKey } from '@/lib/rateLimit';
import { createPhoneAuthAdmin } from '@/lib/supabase/admin';
import { isValidBdPhone } from '@/utils/phone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  phone?: unknown;
  password?: unknown;
  name?: unknown;
}

/**
 * Creates a phone + password account with no SMS step (see phoneAuth.ts for why). The browser signs
 * itself in afterward with the same password, through the public client — this route only ever creates
 * the user, it never hands back a session.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  const rate = checkRateLimit(clientKey(request, 'signup-phone'), { limit: 5, windowMs: 10 * 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } }
    );
  }

  const admin: PhoneAuthAdmin | null = createPhoneAuthAdmin();
  if (!admin) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (typeof body.phone !== 'string' || !isValidBdPhone(body.phone)) {
    return NextResponse.json({ error: 'invalid_input', field: 'phone' }, { status: 400 });
  }
  if (typeof body.password !== 'string' || body.password.length < 6) {
    return NextResponse.json({ error: 'invalid_input', field: 'password' }, { status: 400 });
  }
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : undefined;

  const result = await createPhoneAccount(admin, { phone: body.phone, password: body.password, name });
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'phone_taken' ? 409 : 500 });
  }
  // Same reasoning as signup-email: this path never hits /auth/callback (the route that normally
  // creates the `profiles` row), so it has to happen here instead.
  try {
    await syncProfile({ id: result.userId, email: null, user_metadata: name ? { name } : undefined });
  } catch (error) {
    console.error('Could not create profile for new phone account', error);
  }
  return NextResponse.json({ userId: result.userId });
}
