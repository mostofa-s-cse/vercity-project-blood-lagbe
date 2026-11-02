import { NextResponse } from 'next/server';
import { AVATAR_MAX_BYTES, removeAvatar, saveAvatar, type AvatarDeps } from '@/lib/avatarUpload';
import { reencodeAvatar } from '@/lib/avatarImage';
import { isSameOrigin } from '@/lib/originCheck';
import { checkRateLimit, clientKey } from '@/lib/rateLimit';
import { getCurrentUserId } from '@/lib/supabase/server';
import { createAccountAdmin, createAvatarStorage } from '@/lib/supabase/admin';

export const runtime = 'nodejs'; // sharp is a native module
export const dynamic = 'force-dynamic';

/** Room for the multipart envelope around a file at the size limit. */
const BODY_LIMIT = AVATAR_MAX_BYTES + 64 * 1024;

const STATUS: Record<string, number> = {
  empty: 400,
  too_large: 413,
  unsupported_type: 415,
  process_failed: 415,
  not_found: 404,
  upload_failed: 500,
  update_failed: 500,
};

/** Both routes act on the signed-in person's own account (the session cookie), never on an id in the request. */
async function context(request: Request): Promise<{ response: NextResponse } | { userId: string; deps: AvatarDeps }> {
  if (!isSameOrigin(request)) return { response: NextResponse.json({ error: 'forbidden_origin' }, { status: 403 }) };
  const userId = await getCurrentUserId();
  if (!userId) return { response: NextResponse.json({ error: 'sign_in_required' }, { status: 401 }) };
  const rate = checkRateLimit(clientKey(request, 'account-avatar'), { limit: 10, windowMs: 10 * 60_000 });
  if (!rate.allowed) {
    return {
      response: NextResponse.json(
        { error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } }
      ),
    };
  }
  const storage = createAvatarStorage();
  const admin = createAccountAdmin();
  if (!storage || !admin) return { response: NextResponse.json({ error: 'not_configured' }, { status: 503 }) };
  return { userId, deps: { storage, admin, reencode: reencodeAvatar, now: () => new Date() } };
}

/** Uploads or replaces the signed-in person's profile photo (multipart, field `file`). */
export async function POST(request: Request) {
  const ctx = await context(request);
  if ('response' in ctx) return ctx.response;

  // Refuse an oversized body before reading it.
  if (Number(request.headers.get('content-length') ?? 0) > BODY_LIMIT) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }
  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get('file');
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'empty' }, { status: 400 });

  const result = await saveAvatar(ctx.deps, ctx.userId, new Uint8Array(await file.arrayBuffer()));
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: STATUS[result.error] ?? 500 });
  return NextResponse.json({ url: result.url }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Removes the signed-in person's profile photo (the initials circle shows again). */
export async function DELETE(request: Request) {
  const ctx = await context(request);
  if ('response' in ctx) return ctx.response;
  const result = await removeAvatar(ctx.deps, ctx.userId);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: STATUS[result.error] ?? 500 });
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
