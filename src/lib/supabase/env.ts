/**
 * Supabase project URL and browser-safe key, or null when they are not set.
 * `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the current name; `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the older one.
 * Each variable is read by its full name so Next.js can inline it into the browser bundle.
 */
export function getSupabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}
