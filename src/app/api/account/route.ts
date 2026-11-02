import { NextResponse } from 'next/server';
import { parseAccountUpdate, updateAccount } from '@/lib/accountUpdate';
import { isSameOrigin } from '@/lib/originCheck';
import { syncProfile } from '@/lib/profile';
import { checkRateLimit, clientKey } from '@/lib/rateLimit';
import { getCurrentUserId } from '@/lib/supabase/server';
import { createAccountAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Changes the signed-in person's own name, phone and/or email. The account is the one in the session
 * cookie, never one named in the body. A new email or phone is trusted as typed (see accountUpdate.ts);
 * the browser refreshes its session afterwards so the new values show at once.
 */
export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const rate = checkRateLimit(clientKey(request, 'account-update'), { limit: 10, windowMs: 10 * 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } }
    );
  }

  const admin = createAccountAdmin();
  if (!admin) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = parseAccountUpdate(body);
  if (parsed.error) return NextResponse.json({ error: 'invalid_input', field: parsed.error }, { status: 400 });

  const result = await updateAccount(admin, userId, parsed.value);
  if ('error' in result) {
    const status = result.error === 'not_found' ? 404 : result.error === 'update_failed' ? 500 : 409;
    return NextResponse.json({ error: result.error }, { status });
  }

  // Keep the `profiles` row (used to link donors and requests to the account) in step with the new values.
  try {
    const fresh = await admin.getUserById(userId);
    if (fresh.data.user) {
      const user = fresh.data.user as { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null };
      await syncProfile(user);
    }
  } catch (error) {
    console.error('Could not sync profile after account update', error);
  }
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
