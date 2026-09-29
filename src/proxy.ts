import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, isLanguage, localizedPath, splitLanguage } from './utils/routes';
import { refreshSession } from './lib/supabase/session';

/**
 * Runs before every page request.
 * - A URL without /bn or /en is sent to the saved language (cookie) or the default one: `/donors` to `/bn/donors`.
 * - A URL that has a language keeps the Supabase login session fresh.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { language, path } = splitLanguage(pathname);
  if (language) return refreshSession(request);

  const saved = request.cookies.get(LANGUAGE_COOKIE)?.value;
  const target = isLanguage(saved) ? saved : DEFAULT_LANGUAGE;
  const url = request.nextUrl.clone();
  url.pathname = localizedPath(target, path);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except Next internals, API and auth routes, and files with an extension (favicon.ico, images, ...).
  matcher: ['/((?!_next|api|auth|.*\\..*).*)'],
};
