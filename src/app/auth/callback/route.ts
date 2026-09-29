import type { NextRequest } from 'next/server';
import { syncProfile } from '@/lib/profile';
import { safeNextPath } from '@/lib/safeRedirect';
import { createServerSupabase } from '@/lib/supabase/server';

/** A redirect with a relative Location, so the site's own origin never has to be guessed behind proxies. */
function redirectTo(path: string): Response {
  return new Response(null, { status: 303, headers: { Location: path } });
}

/**
 * Where Google sends the person back after signing in (via Supabase).
 * Trades the one-time `code` for a session cookie, records the profile, then returns to the page they came from.
 */
export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get('next'), '/');
  const code = request.nextUrl.searchParams.get('code');

  const supabase = await createServerSupabase();
  if (!supabase || !code) return redirectTo(next);

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return redirectTo('/?auth_error=1');

  try {
    await syncProfile(data.user);
  } catch (profileError) {
    // Signing in still works when the database is down; the profile is retried at the next sign-in.
    console.error('Could not save profile', profileError);
  }
  return redirectTo(next);
}
