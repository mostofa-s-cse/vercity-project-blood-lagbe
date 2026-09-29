import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv } from './env';

/** Supabase client for browser code, or null when Supabase is not configured. */
export function createBrowserSupabase() {
  const env = getSupabaseEnv();
  return env ? createBrowserClient(env.url, env.key) : null;
}
