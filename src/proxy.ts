import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, isLanguage, localizedPath, splitLanguage } from './utils/routes';
import { refreshSession } from './lib/supabase/session';
import { canAccessPath, requiredAccess } from './lib/roles';

/**
 * Runs before every page request.
 * - A URL without /bn or /en is sent to the saved language (cookie) or the default one: `/donors` to `/bn/donors`.
 * - A URL that has a language keeps the Supabase login session fresh, and the admin / signed-in pages are
 *   only served to people who have the needed permission (see src/lib/roles.ts); everyone else is sent to a
 *   "no access" page.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { language, path } = splitLanguage(pathname);

  if (!language) {
    const saved = request.cookies.get(LANGUAGE_COOKIE)?.value;
    const target = isLanguage(saved) ? saved : DEFAULT_LANGUAGE;
    const url = request.nextUrl.clone();
    url.pathname = localizedPath(target, path);
    return NextResponse.redirect(url);
  }

  const { response, claims, configured } = await refreshSession(request);

  const need = requiredAccess(path);
  if (need && !canAccessPath(need, { adminOpen: process.env.NEXT_PUBLIC_ADMIN_OPEN === 'true', configured, claims })) {
    const url = request.nextUrl.clone();
    url.pathname = localizedPath(language, `/no-access/${need.level}`);
    url.search = `?from=${encodeURIComponent(`${pathname}${request.nextUrl.search}`)}`;
    const denied = NextResponse.redirect(url);
    // Keep any session cookies the refresh just issued.
    response.cookies.getAll().forEach((cookie) => denied.cookies.set(cookie));
    return denied;
  }
  return response;
}

export const config = {
  // Everything except Next internals, API and auth routes, and files with an extension (favicon.ico, images, ...).
  matcher: ['/((?!_next|api|auth|.*\\..*).*)'],
};
