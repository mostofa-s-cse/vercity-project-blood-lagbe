import type { GrantRecord, RoleWithCount } from './grantService';
import { needsHospital } from './permissions';

/** How a grant is sent to the admin panel. `roleName` is looked up from the roles, or the id if the role is gone. */
export function toGrantDto(grant: GrantRecord, roleName: string | undefined) {
  return {
    id: grant.id,
    email: grant.email,
    roleId: grant.roleId,
    roleName: roleName ?? grant.roleId,
    hospitalId: grant.hospitalId,
    status: grant.appliedAt ? ('active' as const) : ('pending' as const),
    createdAt: grant.createdAt.toISOString(),
    grantedBy: grant.grantedBy,
  };
}

/** How a role is sent to the admin panel. `needsHospital` tells the form to ask which hospital when assigning it. */
export function toRoleDto(role: RoleWithCount | (Omit<RoleWithCount, 'grantCount'> & { grantCount?: number })) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    isSystem: role.isSystem,
    systemKey: role.systemKey,
    grantCount: role.grantCount ?? 0,
    needsHospital: needsHospital(role.permissions),
  };
}

export type GrantDto = ReturnType<typeof toGrantDto>;
export type RoleDto = ReturnType<typeof toRoleDto>;
