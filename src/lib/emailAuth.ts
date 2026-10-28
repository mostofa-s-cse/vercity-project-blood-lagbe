/**
 * Email sign-up with no confirmation wait, same reasoning as src/lib/phoneAuth.ts for phone: the owner
 * asked that creating an account never make someone check their inbox first. The public signUp() call
 * also has its own quirk worth avoiding — Supabase rejects some email shapes outright before confirmation
 * even enters the picture (seen with the `.test` TLD during this project's own testing). Creating the
 * user through the admin API with `email_confirm: true` sidesteps both: no confirmation email is ever
 * sent, and the stricter public-signup validation path is never hit.
 *
 * The real admin client lives in `src/lib/supabase/admin.ts` (needs the service key, server-only); this
 * file is pure so it can be tested with a fake `EmailAuthAdmin`.
 */

/** The admin API surface this module needs — narrow on purpose so tests can pass a fake. */
export interface EmailAuthAdmin {
  createUser(attrs: {
    email: string;
    password: string;
    email_confirm: true;
    user_metadata?: Record<string, unknown>;
  }): Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>;
}

/** Creates the account and reports why, never silently succeeding without a real user id. */
export async function createEmailAccount(
  admin: EmailAuthAdmin,
  { email, password, name, metadata }: { email: string; password: string; name?: string; metadata?: Record<string, unknown> }
): Promise<{ userId: string } | { error: 'email_taken' | 'create_failed' }> {
  // `metadata` (name, phone, blood group, ...) wins over the bare `name` shortcut.
  const userMetadata = metadata ?? (name ? { name } : undefined);
  const { data, error } = await admin.createUser({
    email,
    password,
    email_confirm: true,
    ...(userMetadata ? { user_metadata: userMetadata } : {}),
  });
  if (error) return { error: /already|registered|exists/i.test(error.message) ? 'email_taken' : 'create_failed' };
  if (!data.user) return { error: 'create_failed' };
  return { userId: data.user.id };
}
