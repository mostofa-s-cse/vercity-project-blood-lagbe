import { NextResponse } from 'next/server';
import { roleOf } from './roles';
import { getClaims } from './supabase/server';

type Guard = { claims: Record<string, unknown>; response: null } | { claims: null; response: NextResponse };

/**
 * For API routes only admins may call. Checks the signed-in person's login token on the server:
 * 401 when nobody is signed in, 403 when they are signed in but not an admin.
 * Use as `const guard = await requireAdmin(); if (guard.response) return guard.response;`.
 */
export async function requireAdmin(): Promise<Guard> {
  const claims = await getClaims();
  if (!claims) return { claims: null, response: NextResponse.json({ error: 'sign_in_required' }, { status: 401 }) };
  if (roleOf(claims) !== 'admin') return { claims: null, response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  return { claims, response: null };
}
