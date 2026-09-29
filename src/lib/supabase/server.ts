import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseEnv } from './env';

/** Supabase client for route handlers and server components (reads the session from cookies), or null when not configured. */
export async function createServerSupabase() {
  const env = getSupabaseEnv();
  if (!env) return null;
  const cookieStore = await cookies();

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, which cannot set cookies. The proxy refreshes the session instead.
        }
      },
    },
  });
}

/** The signed-in user's id from the session cookie, or null. Never throws. */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createServerSupabase();
    if (!supabase) return null;
    const { data } = await supabase.auth.getClaims();
    return data?.claims.sub ?? null;
  } catch {
    return null;
  }
}
