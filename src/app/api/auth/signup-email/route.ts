import { NextResponse } from 'next/server';
import { createEmailAccount, type EmailAuthAdmin } from '@/lib/emailAuth';
import { isSameOrigin } from '@/lib/originCheck';
import { syncProfile } from '@/lib/profile';
import { checkRateLimit, clientKey } from '@/lib/rateLimit';
import { createEmailAuthAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Body {
  email?: unknown;
  password?: unknown;
  name?: unknown;
}

/**
 * Creates an email + password account with no confirmation-link wait (see emailAuth.ts for why). The
 * browser signs itself in afterward with the same password, through the public client — this route only
 * ever creates the user, it never hands back a session.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  const rate = checkRateLimit(clientKey(request, 'signup-email'), { limit: 5, windowMs: 10 * 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } }
    );
  }

  const admin: EmailAuthAdmin | null = createEmailAuthAdmin();
  if (!admin) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (typeof body.email !== 'string' || !EMAIL_RE.test(body.email)) {
    return NextResponse.json({ error: 'invalid_input', field: 'email' }, { status: 400 });
  }
  if (typeof body.password !== 'string' || body.password.length < 6) {
    return NextResponse.json({ error: 'invalid_input', field: 'password' }, { status: 400 });
  }
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : undefined;

  const result = await createEmailAccount(admin, { email: body.email, password: body.password, name });
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'email_taken' ? 409 : 500 });
  }
  // The `profiles` row is normally made by /auth/callback (OAuth/email-confirmation-link redirects);
  // this path never hits that route at all, so it has to happen here instead — otherwise donor
  // registration and the claim route would silently never link to this brand new account.
  try {
    await syncProfile({ id: result.userId, email: body.email, user_metadata: name ? { name } : undefined });
  } catch (error) {
    console.error('Could not create profile for new email account', error);
  }
  return NextResponse.json({ userId: result.userId });
}
