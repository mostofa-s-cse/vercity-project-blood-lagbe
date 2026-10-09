/**
 * Phone sign-up without SMS: this project's Supabase "Phone" provider is off (no SMS gateway wired, see
 * docs/SETUP-SUPABASE.md), so the usual public signUp({ phone, password }) call is rejected server-side
 * ("Phone logins are disabled") regardless of confirmation settings. Creating the user through the admin
 * API with `phone_confirm: true` instead sidesteps that gate entirely — no OTP is ever sent, the phone
 * number is trusted as typed. The owner's job if they want this provider-gated instead: enable "Phone" in
 * Supabase's dashboard and this path keeps working unchanged (phone_confirm would just be a formality then).
 *
 * The real admin client lives in `src/lib/supabase/admin.ts` (needs the service key, server-only); this
 * file is pure so it can be tested with a fake `PhoneAuthAdmin`.
 */

/** The admin API surface this module needs — narrow on purpose so tests can pass a fake. */
export interface PhoneAuthAdmin {
  createUser(attrs: {
    phone: string;
    password: string;
    phone_confirm: true;
    user_metadata?: Record<string, unknown>;
  }): Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>;
}

/** Bangladesh phone, any of the forms the UI accepts, into the digits-only country-code form Supabase's
 * phone field expects (e.g. "01712345678" / "+8801712345678" -> "8801712345678"). */
export function normalizePhoneForAuth(raw: string): string {
  const compact = raw.replace(/[\s-]/g, '').replace(/^\+/, '');
  if (compact.startsWith('880')) return compact;
  if (compact.startsWith('0')) return `880${compact.slice(1)}`;
  return `880${compact}`;
}

/** Creates the account and reports why, never silently succeeding without a real user id. */
export async function createPhoneAccount(
  admin: PhoneAuthAdmin,
  { phone, password, name }: { phone: string; password: string; name?: string }
): Promise<{ userId: string } | { error: 'phone_taken' | 'create_failed' }> {
  const { data, error } = await admin.createUser({
    phone: normalizePhoneForAuth(phone),
    password,
    phone_confirm: true,
    ...(name ? { user_metadata: { name } } : {}),
  });
  if (error) return { error: /already|registered|exists/i.test(error.message) ? 'phone_taken' : 'create_failed' };
  if (!data.user) return { error: 'create_failed' };
  return { userId: data.user.id };
}
