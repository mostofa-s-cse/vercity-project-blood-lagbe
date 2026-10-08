/**
 * A defense-in-depth same-origin check, not the only thing standing between a cross-site form and this
 * API: these routes already require `Content-Type: application/json`, which triggers a CORS preflight
 * this app doesn't answer for foreign origins, so a classic `<form>`-based CSRF already can't reach them.
 * This adds protection for anything that *can* set a JSON content type cross-origin by other means.
 *
 * When `Origin` is present, its **host** (hostname:port, scheme ignored) must match the request's own
 * `Host` header (or `X-Forwarded-Host` behind a proxy). Comparing against the `Host` header rather than
 * reconstructing an origin from `request.url` is deliberate: a server bound to `0.0.0.0` (common in
 * containers, and this project's own `npm run dev`) reports its own bind address in `request.url`, which
 * never matches a real browser's `Origin` — comparing hosts is what actually reflects what the browser
 * connected to. Scheme can't be verified this way behind a TLS-terminating proxy (the public scheme is
 * `https`, the internal one may be `http`), so this intentionally only checks the host.
 *
 * When `Origin` is **absent**, the request is allowed — matching how Next.js's own Server Actions origin
 * check behaves, and avoiding breaking legitimate same-site tooling (curl, this project's own
 * verification scripts) that may not send it.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return true;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
