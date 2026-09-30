import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnv } from './env';

/**
 * Refreshes the Supabase login session on a page request and returns the response to send.
 * Expired tokens are renewed and the new cookies are written to both the request (so the page
 * sees them) and the response (so the browser keeps them). Also returns the verified claims of the login
 * token (null when signed out) so the proxy can check who may open a page.
 */
export async function refreshSession(
  request: NextRequest
): Promise<{ response: NextResponse; claims: unknown; configured: boolean }> {
  let response = NextResponse.next({ request });
  const env = getSupabaseEnv();
  if (!env) return { response, claims: null, configured: false };

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  let claims: unknown = null;
  try {
    const { data } = await supabase.auth.getClaims();
    claims = data?.claims ?? null;
  } catch {
    // Supabase unreachable: serve the page anyway, the user just stays signed out.
  }
  return { response, claims, configured: true };
}
