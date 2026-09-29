/**
 * Who may open which page.
 *
 * - `admin`: the Admin Panel and Ops Command. Only accounts whose Supabase `app_metadata.role` is "admin"
 *   (app_metadata can only be changed with the service key or SQL, never by the person themselves).
 *   With no Supabase nobody can prove they are an admin, so the area stays closed unless the demo
 *   switch `NEXT_PUBLIC_ADMIN_OPEN=true` is on.
 * - `user`: pages about the signed-in person (Donor Passport). Open in demo mode; once Supabase is
 *   configured the person must be signed in.
 * Every other page is public: an emergency must never need a login.
 */
export type AccessLevel = 'admin' | 'user';

/** Unprefixed paths (no /bn or /en) that need a level. */
export const PROTECTED_PATHS: Record<string, AccessLevel> = {
  '/admin': 'admin',
  '/command': 'admin',
  '/passport': 'user',
};

export function requiredLevel(path: string): AccessLevel | null {
  return Object.hasOwn(PROTECTED_PATHS, path) ? PROTECTED_PATHS[path] : null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** True when the login token's `app_metadata.role` is exactly "admin". */
export function isAdminClaims(claims: unknown): boolean {
  if (!isRecord(claims) || !isRecord(claims.app_metadata)) return false;
  return claims.app_metadata.role === 'admin';
}

/** True when the login token names a person (has a subject). */
export function isSignedInClaims(claims: unknown): boolean {
  return isRecord(claims) && typeof claims.sub === 'string' && claims.sub.length > 0;
}

export interface AccessContext {
  /** `NEXT_PUBLIC_ADMIN_OPEN === 'true'`: opens the admin area for demos. */
  adminOpen: boolean;
  /** Whether Supabase keys are set. */
  configured: boolean;
  /** Verified claims of the login token, or null when signed out. */
  claims: unknown;
}

export function canAccess(level: AccessLevel, { adminOpen, configured, claims }: AccessContext): boolean {
  if (level === 'admin') {
    if (adminOpen) return true;
    return configured && isAdminClaims(claims);
  }
  return !configured || isSignedInClaims(claims);
}

export type AppRoleName = 'admin' | 'hospital';

/** The person's role from the login token's `app_metadata.role`, or null (a normal user). */
export function roleOf(claims: unknown): AppRoleName | null {
  if (!isRecord(claims) || !isRecord(claims.app_metadata)) return null;
  const role = claims.app_metadata.role;
  return role === 'admin' || role === 'hospital' ? role : null;
}

/** The hospital a `hospital` account belongs to (`app_metadata.hospital_id`), or null. */
export function hospitalIdOf(claims: unknown): string | null {
  if (roleOf(claims) !== 'hospital') return null;
  const id = (claims as { app_metadata: Record<string, unknown> }).app_metadata.hospital_id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/** Admins manage every hospital; a hospital account manages only its own. */
export function canManageHospital(claims: unknown, hospitalId: string): boolean {
  if (roleOf(claims) === 'admin') return true;
  const own = hospitalIdOf(claims);
  return own !== null && own === hospitalId;
}
