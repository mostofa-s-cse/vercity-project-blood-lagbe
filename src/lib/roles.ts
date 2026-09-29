import { ADMIN_PERMISSIONS, HOSPITAL_PERMISSIONS, isPermission, type Permission } from './permissions.ts';

/**
 * Who may open which page, and who may do what.
 *
 * A person's permissions travel in their Supabase login token, in `app_metadata.permissions`. An admin
 * gives them by assigning a role (see grantService.ts); `app_metadata` can only be changed with the
 * service key, never by the person. Older tokens carry just `app_metadata.role` ("admin" or "hospital"),
 * which is still understood.
 *
 * Every page is public except:
 * - the Admin Panel (`panel.open`) and Ops Command (`ops.command`). Without Supabase nobody can prove a
 *   permission, so they stay closed unless the demo switch `NEXT_PUBLIC_ADMIN_OPEN=true` is on.
 * - the Donor Passport, which needs sign-in once Supabase is configured.
 * An emergency must never need a login, so nothing else is protected.
 */
export type Requirement = { level: 'admin'; permission: Permission } | { level: 'user' };

/** Unprefixed paths (no /bn or /en) that need something. */
const PROTECTED_PATHS: Record<string, Requirement> = {
  '/admin': { level: 'admin', permission: 'panel.open' },
  '/command': { level: 'admin', permission: 'ops.command' },
  '/passport': { level: 'user' },
};

export function requiredAccess(path: string): Requirement | null {
  return Object.hasOwn(PROTECTED_PATHS, path) ? PROTECTED_PATHS[path] : null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The permissions in the login token, or none. Only `app_metadata` is read. */
export function permissionsOf(claims: unknown): ReadonlySet<Permission> {
  if (!isRecord(claims) || !isRecord(claims.app_metadata)) return new Set();
  const meta = claims.app_metadata;

  if (Array.isArray(meta.permissions)) return new Set(meta.permissions.filter(isPermission));
  if (meta.role === 'admin') return new Set(ADMIN_PERMISSIONS);
  if (meta.role === 'hospital') return new Set(HOSPITAL_PERMISSIONS);
  return new Set();
}

export function can(claims: unknown, permission: Permission): boolean {
  return permissionsOf(claims).has(permission);
}

/** True when the login token names a person (has a subject). */
export function isSignedInClaims(claims: unknown): boolean {
  return isRecord(claims) && typeof claims.sub === 'string' && claims.sub.length > 0;
}

/** The hospital a person is tied to (`app_metadata.hospital_id`), or null. Only meaningful with `stock.own`. */
export function hospitalIdOf(claims: unknown): string | null {
  if (!isRecord(claims) || !isRecord(claims.app_metadata)) return null;
  const id = claims.app_metadata.hospital_id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/** `stock.all` may change every hospital's stock; `stock.own` only the hospital the person is tied to. */
export function canManageHospital(claims: unknown, hospitalId: string): boolean {
  if (can(claims, 'stock.all')) return true;
  const own = hospitalIdOf(claims);
  return can(claims, 'stock.own') && own !== null && own === hospitalId;
}

export interface AccessContext {
  /** `NEXT_PUBLIC_ADMIN_OPEN === 'true'`: opens the admin pages for demos. */
  adminOpen: boolean;
  /** Whether Supabase keys are set. */
  configured: boolean;
  /** Verified claims of the login token, or null when signed out. */
  claims: unknown;
}

export function canAccessPath(requirement: Requirement, { adminOpen, configured, claims }: AccessContext): boolean {
  if (requirement.level === 'admin') {
    if (adminOpen) return true;
    return configured && can(claims, requirement.permission);
  }
  return !configured || isSignedInClaims(claims);
}
