import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, isLanguage, localizedPath, splitLanguage } from './utils/routes';

/** Sends prefix-less URLs to the saved language (cookie) or the default one: `/donors` to `/bn/donors`. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { language, path } = splitLanguage(pathname);
  if (language) return NextResponse.next();

  const saved = request.cookies.get(LANGUAGE_COOKIE)?.value;
  const target = isLanguage(saved) ? saved : DEFAULT_LANGUAGE;
  const url = request.nextUrl.clone();
  url.pathname = localizedPath(target, path);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except Next internals, API routes and files with an extension (favicon.ico, images, ...).
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
