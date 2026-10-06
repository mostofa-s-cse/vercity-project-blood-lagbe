import { NextResponse } from 'next/server';
import type { Permission } from './permissions';
import { can } from './roles';
import { getClaims } from './supabase/server';

type Guard = { claims: Record<string, unknown>; response: null } | { claims: null; response: NextResponse };

/**
 * For API routes that need a permission. Checks the signed-in person's login token on the server:
 * 401 when nobody is signed in, 403 when they are signed in without that permission.
 * Use as `const guard = await requirePermission('roles.manage'); if (guard.response) return guard.response;`.
 */
export async function requirePermission(permission: Permission): Promise<Guard> {
  const claims = await getClaims();
  if (!claims) return { claims: null, response: NextResponse.json({ error: 'sign_in_required' }, { status: 401 }) };
  if (!can(claims, permission)) return { claims: null, response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  return { claims, response: null };
}

/** Like `requirePermission`, but any one of the given permissions is enough (e.g. the Admin Panel's Fraud tab and Ops Command share data). */
export async function requireAnyPermission(permissions: readonly Permission[]): Promise<Guard> {
  const claims = await getClaims();
  if (!claims) return { claims: null, response: NextResponse.json({ error: 'sign_in_required' }, { status: 401 }) };
  if (!permissions.some((permission) => can(claims, permission))) {
    return { claims: null, response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }
  return { claims, response: null };
}
