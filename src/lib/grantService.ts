import { needsHospital, normalizePermissions, type Permission } from './permissions.ts';

/**
 * Roles and who has them.
 *
 * A role is a named set of permissions that an admin creates. Giving a role to an email stores a grant in
 * our database and copies the role's permissions into the person's Supabase `app_metadata` (only the
 * service key can change it), where the proxy and the API routes read them from the login token with no
 * database lookup. Editing a role copies the new permissions to everyone who has it.
 *
 * This file holds only the rules. The database and Supabase are passed in, so the rules can be tested
 * without either (see grantService.test.ts); the real ones are in grantStore.ts and supabase/admin.ts.
 */

/** The two built-in roles are found by these keys, never by name. */
export type SystemKey = 'admin' | 'hospital';

export interface RoleRecord {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
  /** Built-in roles cannot be deleted; the Admin role cannot be edited at all. */
  isSystem: boolean;
  systemKey: SystemKey | null;
  createdAt: Date;
}

export type RoleWithCount = RoleRecord & { grantCount: number };

export interface GrantRecord {
  id: string;
  /** Always lower case. */
  email: string;
  roleId: string;
  /** Only for roles tied to one hospital. */
  hospitalId: string | null;
  grantedBy: string | null;
  createdAt: Date;
  /** When the role was copied into the person's login data; null while they have not signed in yet. */
  appliedAt: Date | null;
}

/** What is written to (or cleared from) a person's `app_metadata`. */
export interface AppMetadataPatch {
  /** The old two-value role name, kept for the built-in roles so older tokens and SQL keep working. */
  role: SystemKey | null;
  role_id: string | null;
  role_name: string | null;
  permissions: readonly Permission[] | null;
  hospital_id: string | null;
}

const CLEARED: AppMetadataPatch = { role: null, role_id: null, role_name: null, permissions: null, hospital_id: null };

export function appMetadataFor(
  role: Pick<RoleRecord, 'id' | 'name' | 'permissions' | 'systemKey'>,
  hospitalId: string | null
): AppMetadataPatch {
  return {
    role: role.systemKey,
    role_id: role.id,
    role_name: role.name,
    permissions: role.permissions,
    hospital_id: needsHospital(role.permissions) ? hospitalId : null,
  };
}

export interface GrantStore {
  listRoles(): Promise<RoleWithCount[]>;
  findRole(id: string): Promise<RoleRecord | null>;
  /** Case-insensitive. */
  findRoleByName(name: string): Promise<RoleRecord | null>;
  findRoleBySystemKey(key: SystemKey): Promise<RoleRecord | null>;
  createRole(role: { name: string; description: string | null; permissions: Permission[] }): Promise<RoleRecord>;
  updateRole(id: string, patch: { name: string; description: string | null; permissions: Permission[] }): Promise<RoleRecord>;
  deleteRole(id: string): Promise<void>;

  /** Creates or updates the grant for this email; `appliedAt` starts empty again. */
  upsertByEmail(grant: { email: string; roleId: string; hospitalId: string | null; grantedBy: string | null }): Promise<GrantRecord>;
  findByEmail(email: string): Promise<GrantRecord | null>;
  findById(id: string): Promise<GrantRecord | null>;
  listByRole(roleId: string): Promise<GrantRecord[]>;
  markApplied(id: string, at: Date): Promise<void>;
  remove(id: string): Promise<void>;
  list(): Promise<GrantRecord[]>;
  /** The Supabase user id of someone who has signed in with this email, or null. */
  findProfileIdByEmail(email: string): Promise<string | null>;
}

export interface AuthAdmin {
  /** Merges these fields into `app_metadata`; null removes a field. */
  setAppMetadata(userId: string, meta: AppMetadataPatch): Promise<void>;
}

export type GrantErrorCode =
  | 'service_key_missing'
  | 'not_found'
  | 'cannot_revoke_self'
  | 'role_not_found'
  | 'hospital_required'
  | 'name_taken'
  | 'system_role_locked'
  | 'role_in_use';

export class GrantError extends Error {
  code: GrantErrorCode;
  constructor(code: GrantErrorCode) {
    super(code);
    this.code = code;
  }
}

export interface SignedInUser {
  id: string;
  email: string | null;
  /** Only a verified email may receive a role. */
  emailConfirmed: boolean;
  appMetadata: Record<string, unknown>;
}

export interface GrantInput {
  email: string;
  roleId: string;
  hospitalId: string | null;
}

export interface RoleInput {
  name: string;
  description: string | null;
  permissions: Permission[];
}

interface Deps {
  store: GrantStore;
  /** Null when `SUPABASE_SERVICE_ROLE_KEY` is not set. */
  auth: AuthAdmin | null;
  /** Emails that are always admins (the `ADMIN_EMAILS` setting). */
  bootstrapAdminEmails: readonly string[];
  now?: () => Date;
}

const sameList = (a: unknown, b: readonly string[]): boolean =>
  Array.isArray(a) && a.length === b.length && a.every((value, index) => value === b[index]);

export function createGrantService({ store, auth, bootstrapAdminEmails, now = () => new Date() }: Deps) {
  const bootstrap = new Set(bootstrapAdminEmails.map((email) => email.trim().toLowerCase()).filter(Boolean));

  async function apply(userId: string, grant: GrantRecord, role: RoleRecord): Promise<void> {
    await auth!.setAppMetadata(userId, appMetadataFor(role, grant.hospitalId));
    await store.markApplied(grant.id, now());
  }

  /** A role name is free if no other role has it (ignoring case). */
  async function assertNameFree(name: string, exceptId?: string): Promise<void> {
    const existing = await store.findRoleByName(name);
    if (existing && existing.id !== exceptId) throw new GrantError('name_taken');
  }

  return {
    listRoles: () => store.listRoles(),

    async createRole(input: RoleInput): Promise<RoleRecord> {
      const name = input.name.trim();
      await assertNameFree(name);
      return store.createRole({
        name,
        description: input.description?.trim() || null,
        permissions: normalizePermissions(input.permissions),
      });
    },

    /**
     * Changes a role and copies the new permissions to everyone who already has it (people who have not
     * signed in yet get it at sign-in). Individual failures are counted, not fatal.
     */
    async updateRole(id: string, input: RoleInput): Promise<{ role: RoleRecord; propagated: { updated: number; failed: number } }> {
      const role = await store.findRole(id);
      if (!role) throw new GrantError('not_found');
      const name = input.name.trim();
      if (role.systemKey === 'admin') throw new GrantError('system_role_locked');
      if (role.systemKey !== null && name !== role.name) throw new GrantError('system_role_locked');
      await assertNameFree(name, id);

      const applied = (await store.listByRole(id)).filter((grant) => grant.appliedAt !== null);
      if (applied.length > 0 && !auth) throw new GrantError('service_key_missing');

      const updated = await store.updateRole(id, {
        name,
        description: input.description?.trim() || null,
        permissions: normalizePermissions(input.permissions),
      });

      let done = 0;
      let failed = 0;
      for (const grant of applied) {
        try {
          const profileId = await store.findProfileIdByEmail(grant.email);
          if (!profileId) continue;
          await auth!.setAppMetadata(profileId, appMetadataFor(updated, grant.hospitalId));
          done += 1;
        } catch {
          failed += 1;
        }
      }
      return { role: updated, propagated: { updated: done, failed } };
    },

    async deleteRole(id: string): Promise<void> {
      const role = await store.findRole(id);
      if (!role) throw new GrantError('not_found');
      if (role.isSystem) throw new GrantError('system_role_locked');
      if ((await store.listByRole(id)).length > 0) throw new GrantError('role_in_use');
      await store.deleteRole(id);
    },

    /** Gives `input.email` a role. Applied at once if they have signed in before, otherwise at their next sign-in. */
    async grant(input: GrantInput, actor: { email: string | null }) {
      if (!auth) throw new GrantError('service_key_missing');
      const role = await store.findRole(input.roleId);
      if (!role) throw new GrantError('role_not_found');
      if (needsHospital(role.permissions) && !input.hospitalId) throw new GrantError('hospital_required');

      const email = input.email.trim().toLowerCase();
      const record = await store.upsertByEmail({
        email,
        roleId: role.id,
        hospitalId: needsHospital(role.permissions) ? input.hospitalId : null,
        grantedBy: actor.email,
      });

      const profileId = await store.findProfileIdByEmail(email);
      if (!profileId) return { grant: record, status: 'pending' as const };
      await apply(profileId, record, role);
      return { grant: { ...record, appliedAt: now() }, status: 'active' as const };
    },

    /**
     * Called after every sign-in: copies a waiting grant (or a bootstrap admin) into the person's login data.
     * Returns true when it changed that data, so the caller can refresh the login token to include it.
     */
    async applyOnSignIn(user: SignedInUser): Promise<boolean> {
      if (!auth || !user.email || !user.emailConfirmed) return false;
      const email = user.email.trim().toLowerCase();

      let grant = await store.findByEmail(email);
      if (bootstrap.has(email)) {
        const admin = await store.findRoleBySystemKey('admin');
        if (admin && grant?.roleId !== admin.id) {
          grant = await store.upsertByEmail({ email, roleId: admin.id, hospitalId: null, grantedBy: 'ADMIN_EMAILS' });
        }
      }
      if (!grant) return false;
      const role = await store.findRole(grant.roleId);
      if (!role) return false;

      const wanted = appMetadataFor(role, grant.hospitalId);
      const meta = user.appMetadata;
      const alreadyHasIt =
        meta.role_id === wanted.role_id &&
        meta.role_name === wanted.role_name &&
        (meta.hospital_id ?? null) === wanted.hospital_id &&
        sameList(meta.permissions, wanted.permissions ?? []);

      if (!alreadyHasIt) {
        await apply(user.id, grant, role);
        return true;
      }
      if (!grant.appliedAt) await store.markApplied(grant.id, now());
      return false;
    },

    /** Removes a role. The person keeps their account but loses the role at their next token refresh. */
    async revoke(id: string, actor: { email: string | null }): Promise<void> {
      const grant = await store.findById(id);
      if (!grant) throw new GrantError('not_found');
      if (actor.email && actor.email.trim().toLowerCase() === grant.email) throw new GrantError('cannot_revoke_self');

      if (grant.appliedAt) {
        if (!auth) throw new GrantError('service_key_missing');
        const profileId = await store.findProfileIdByEmail(grant.email);
        if (profileId) await auth.setAppMetadata(profileId, CLEARED);
      }
      await store.remove(id);
    },

    list: () => store.list(),
  };
}

export type GrantService = ReturnType<typeof createGrantService>;
