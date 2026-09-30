import 'server-only';
import { createGrantService } from './grantService';
import { createPrismaGrantStore } from './grantStore';
import { createAuthAdmin } from './supabase/admin';

/** The real grant service: Postgres for storage, Supabase (service key) for the login data. Needs DATABASE_URL. */
export function getGrantService() {
  return createGrantService({
    store: createPrismaGrantStore(),
    auth: createAuthAdmin(),
    bootstrapAdminEmails: (process.env.ADMIN_EMAILS ?? '').split(','),
  });
}
