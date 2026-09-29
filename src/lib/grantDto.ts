import type { GrantRecord } from './grantService';

/** How a grant is sent to the admin panel. */
export function toGrantDto(grant: GrantRecord) {
  return {
    id: grant.id,
    email: grant.email,
    role: grant.role,
    hospitalId: grant.hospitalId,
    status: grant.appliedAt ? ('active' as const) : ('pending' as const),
    createdAt: grant.createdAt.toISOString(),
    grantedBy: grant.grantedBy,
  };
}

export type GrantDto = ReturnType<typeof toGrantDto>;
