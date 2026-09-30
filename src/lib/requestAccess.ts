import { hashToken, tokenMatches } from './manageToken';
import { can } from './roles';
import { getClaims } from './supabase/server';

/** The header a person without an account uses to manage the request they made. */
export const MANAGE_TOKEN_HEADER = 'x-manage-token';

/**
 * Whether the caller may manage this request: the holder of its manage token, the signed-in person who
 * made it, or an admin-panel user with `panel.requests`. Server only.
 */
export async function canManageRequest(
  request: { manageTokenHash: string | null; userId: string | null },
  headers: Headers
): Promise<boolean> {
  if (tokenMatches(headers.get(MANAGE_TOKEN_HEADER), request.manageTokenHash)) return true;

  const claims = await getClaims();
  if (!claims) return false;
  if (request.userId && claims.sub === request.userId) return true;
  return can(claims, 'panel.requests');
}

export { hashToken };
