/**
 * A defense-in-depth same-origin check, not the only thing standing between a cross-site form and this
 * API: these routes already require `Content-Type: application/json`, which triggers a CORS preflight
 * this app doesn't answer for foreign origins, so a classic `<form>`-based CSRF already can't reach them.
 * This adds protection for anything that *can* set a JSON content type cross-origin by other means.
 *
 * When `Origin` is present, it must match the request's own origin. When it is **absent**, the request
 * is allowed — matching how Next.js's own Server Actions origin check behaves, and avoiding breaking
 * legitimate same-site tooling (curl, this project's own verification scripts) that may not send it.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}
