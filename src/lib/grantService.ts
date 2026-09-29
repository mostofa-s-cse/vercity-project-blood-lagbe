import type { RoleGrantInput } from './validation.ts';

/**
 * Roles are handed out by email. A grant is stored in our database and copied into the person's
 * Supabase `app_metadata` (which only the service key can change), where the proxy and the API
 * routes read it from the login token.
 *
 * This file holds only the rules. The database and Supabase are passed in, so the rules can be
 * tested without either (see grantService.test.ts); the real ones are in grantStore.ts and
 * supabase/admin.ts.
 */

export type GrantRole = 'admin' | 'hospital';

export interface GrantRecord {
  id: string;
  /** Always lower case. */
  email: string;
  role: GrantRole;
  hospitalId: string | null;
  grantedBy: string | null;
  createdAt: Date;
  /** When the role was copied into the person's login data; null while they have not signed in yet. */
  appliedAt: Date | null;
}

export interface GrantStore {
  /** Creates or updates the grant for this email; `appliedAt` starts empty again. */
  upsertByEmail(grant: { email: string; role: GrantRole; hospitalId: string | null; grantedBy: string | null }): Promise<GrantRecord>;
  findByEmail(email: string): Promise<GrantRecord | null>;
  findById(id: string): Promise<GrantRecord | null>;
  markApplied(id: string, at: Date): Promise<void>;
  remove(id: string): Promise<void>;
  list(): Promise<GrantRecord[]>;
  /** The Supabase user id of someone who has signed in with this email, or null. */
  findProfileIdByEmail(email: string): Promise<string | null>;
}

export interface AuthAdmin {
  /** Sets `app_metadata.role` and `app_metadata.hospital_id`; null removes them. */
  setAppMetadata(userId: string, meta: { role: GrantRole | null; hospital_id: string | null }): Promise<void>;
}

export type GrantErrorCode = 'service_key_missing' | 'not_found' | 'cannot_revoke_self';

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

interface Deps {
  store: GrantStore;
  /** Null when `SUPABASE_SERVICE_ROLE_KEY` is not set. */
  auth: AuthAdmin | null;
  /** Emails that are always admins (the `ADMIN_EMAILS` setting). */
  bootstrapAdminEmails: readonly string[];
  now?: () => Date;
}

export function createGrantService({ store, auth, bootstrapAdminEmails, now = () => new Date() }: Deps) {
  const bootstrap = new Set(bootstrapAdminEmails.map((email) => email.trim().toLowerCase()).filter(Boolean));

  async function apply(userId: string, grant: GrantRecord): Promise<void> {
    await auth!.setAppMetadata(userId, { role: grant.role, hospital_id: grant.hospitalId });
    await store.markApplied(grant.id, now());
  }

  return {
    /** Gives `input.email` a role. Applied at once if they have signed in before, otherwise at their next sign-in. */
    async grant(input: RoleGrantInput, actor: { email: string | null }) {
      if (!auth) throw new GrantError('service_key_missing');
      const email = input.email.trim().toLowerCase();
      const record = await store.upsertByEmail({ email, role: input.role, hospitalId: input.hospitalId, grantedBy: actor.email });

      const profileId = await store.findProfileIdByEmail(email);
      if (!profileId) return { grant: record, status: 'pending' as const };
      await apply(profileId, record);
      return { grant: { ...record, appliedAt: now() }, status: 'active' as const };
    },

    /**
     * Called after every sign-in: copies a waiting grant (or a bootstrap admin) into the person's login data.
     * Returns true when it changed that data, so the caller can refresh the login token to include the new role.
     */
    async applyOnSignIn(user: SignedInUser): Promise<boolean> {
      if (!auth || !user.email || !user.emailConfirmed) return false;
      const email = user.email.trim().toLowerCase();

      let grant = await store.findByEmail(email);
      if (bootstrap.has(email) && grant?.role !== 'admin') {
        grant = await store.upsertByEmail({ email, role: 'admin', hospitalId: null, grantedBy: 'ADMIN_EMAILS' });
      }
      if (!grant) return false;

      const alreadyHasIt =
        user.appMetadata.role === grant.role && (user.appMetadata.hospital_id ?? null) === grant.hospitalId;
      if (!alreadyHasIt) {
        await apply(user.id, grant);
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
        if (profileId) await auth.setAppMetadata(profileId, { role: null, hospital_id: null });
      }
      await store.remove(id);
    },

    list: () => store.list(),
  };
}

export type GrantService = ReturnType<typeof createGrantService>;
