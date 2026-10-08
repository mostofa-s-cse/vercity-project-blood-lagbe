const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface VerifyTurnstileOptions {
  /** Overrides `process.env.TURNSTILE_SECRET_KEY`, for tests. */
  secret?: string;
  /** Swapped in by tests. */
  fetchFn?: typeof fetch;
}

/**
 * Verifies a Cloudflare Turnstile widget token. Resolves `true` immediately, with no network call,
 * when `TURNSTILE_SECRET_KEY` is unset — every environment until the owner configures one (same "needs
 * your own keys" boundary as Supabase, email and SMS). Never throws.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  options: VerifyTurnstileOptions = {}
): Promise<boolean> {
  const secret = options.secret ?? process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  const fetchImpl = options.fetchFn ?? fetch;
  try {
    const response = await fetchImpl(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }).toString(),
    });
    const data: unknown = await response.json();
    return typeof data === 'object' && data !== null && (data as { success?: unknown }).success === true;
  } catch {
    return false;
  }
}

/** Pulls `turnstileToken` out of a parsed JSON body, or `null` if it isn't a string. */
export function turnstileTokenFromBody(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const token = (body as { turnstileToken?: unknown }).turnstileToken;
  return typeof token === 'string' ? token : null;
}
