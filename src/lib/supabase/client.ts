import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv } from './env';

/**
 * Supabase client for browser code, or null when Supabase is not configured. PKCE is pinned explicitly
 * (rather than left to the library's default) so every auth method — Google's OAuth redirect, email
 * confirmation, password reset — keeps landing on `/auth/callback?code=...` the same way, even across a
 * future `@supabase/ssr` upgrade.
 */
export function createBrowserSupabase() {
  const env = getSupabaseEnv();
  return env ? createBrowserClient(env.url, env.key, { auth: { flowType: 'pkce' } }) : null;
}
