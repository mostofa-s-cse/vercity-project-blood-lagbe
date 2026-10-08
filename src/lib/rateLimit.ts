/**
 * A plain in-memory fixed-window rate limiter. Honest limitation, stated here and in
 * `docs/HANDOFF.md`/`docs/SETUP-SUPABASE.md`: this only works within one running server process. It
 * resets on restart and shares no state across multiple instances or regions — on Vercel specifically,
 * each function invocation is not guaranteed to reuse a warm instance, so this is a soft, best-effort
 * speed bump there, not a hard guarantee. Real protection at production scale needs a shared store
 * (Upstash Redis is Vercel's own documented pairing) behind an environment variable — not built here,
 * the owner's job once real traffic justifies it, same spirit as `notifyChannels.ts`'s email/SMS switch.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  /** Injectable clock, for tests. Defaults to the real time. */
  now?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** How long until the window resets, in ms. 0 when `allowed` is true. */
  retryAfterMs: number;
}

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = options.now ?? Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count < options.limit) {
    existing.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  }

  return { allowed: false, retryAfterMs: existing.resetAt - now };
}

/** `${route}:${ip}`, the IP from `x-forwarded-for`'s first entry (what Vercel and most proxies set), or a shared `unknown` bucket in local dev. */
export function clientKey(request: Request, route: string): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';
  return `${route}:${ip}`;
}
