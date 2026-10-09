import { hashToken, tokenMatches } from './manageToken.ts';
import { can } from './roles.ts';
import { getClaims } from './supabase/server.ts';

export { canClaimDonor } from './manageToken.ts';

/** The header a person without an account uses to manage the donor profile they registered. */
export const MANAGE_TOKEN_HEADER = 'x-manage-token';

/**
 * Whether the caller may edit this donor profile: the holder of its manage token, the signed-in person
 * who registered it, or an admin-panel user with `panel.donors`. Server only.
 */
export async function canManageDonor(
  donor: { manageTokenHash: string | null; userId: string | null },
  headers: Headers
): Promise<boolean> {
  if (tokenMatches(headers.get(MANAGE_TOKEN_HEADER), donor.manageTokenHash)) return true;

  const claims = await getClaims();
  if (!claims) return false;
  if (donor.userId && claims.sub === donor.userId) return true;
  return can(claims, 'panel.donors');
}

export { hashToken };
