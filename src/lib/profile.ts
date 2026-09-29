import { getPrisma, isDatabaseConfigured } from './prisma';

interface AuthUserLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

const asText = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

/** Creates or updates the `profiles` row for a signed-in Supabase user. No-op when there is no database. */
export async function syncProfile(user: AuthUserLike): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const meta = user.user_metadata ?? {};
  const data = {
    email: user.email ?? null,
    name: asText(meta.full_name) ?? asText(meta.name),
    avatarUrl: asText(meta.avatar_url) ?? asText(meta.picture),
  };
  await getPrisma().profile.upsert({ where: { id: user.id }, create: { id: user.id, ...data }, update: data });
}
