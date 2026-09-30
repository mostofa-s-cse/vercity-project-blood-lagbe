/**
 * Only allows same-site paths as a post-login redirect target, so `?next=` can never
 * send someone to another site (open redirect) or inject a header.
 */
export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
  if (typeof next !== 'string' || next.length === 0 || next.length > 300) return fallback;
  if (!next.startsWith('/') || next.startsWith('//')) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  return next;
}
