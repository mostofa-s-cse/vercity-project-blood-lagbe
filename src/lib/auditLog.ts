import { getPrisma, isDatabaseConfigured } from './prisma';

/**
 * Records one line for the Admin Panel's Logs tab. Never throws: a logging failure must not break
 * the action it is logging, so errors are only reported to the console.
 */
export async function writeAuditLog(actorEmail: string | null, action: string, detail: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await getPrisma().auditLog.create({ data: { actorEmail, action, detail } });
  } catch (error) {
    console.error('Could not write audit log', action, error);
  }
}

/** Pulls the email out of a login token, for `writeAuditLog`. */
export function claimsEmail(claims: Record<string, unknown> | null): string | null {
  return typeof claims?.email === 'string' ? claims.email : null;
}
