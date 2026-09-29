import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { AuthAdmin } from '../grantService';
import { getSupabaseEnv } from './env';

/** True when the service key is set. Server-only: this file can never be imported by browser code. */
export function isServiceKeyConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) && getSupabaseEnv() !== null;
}

/**
 * Supabase admin access (service key), used only to write a person's role into their `app_metadata`.
 * Null when the key is not set. The key bypasses all row-level security, so it must never leave the server.
 */
export function createAuthAdmin(): AuthAdmin | null {
  const env = getSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !serviceKey) return null;

  const client = createClient(env.url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  return {
    async setAppMetadata(userId, meta) {
      // A null value clears the field. Even if it were kept as a literal null, roleOf() reads it as "no role".
      const { error } = await client.auth.admin.updateUserById(userId, { app_metadata: meta });
      if (error) throw new Error(`Supabase could not update the user: ${error.message}`);
    },
  };
}
