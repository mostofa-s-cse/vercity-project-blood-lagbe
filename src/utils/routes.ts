import type { ScreenId } from '../types/blood';

export const SCREEN_PATHS: Record<ScreenId, string> = {
  'emergency-hub': '/',
  'donor-directory': '/donors',
  'create-sos': '/sos',
  'request-tracking': '/tracking',
  'donor-register': '/register',
  'hospital-org': '/hospitals',
  'donor-passport': '/passport',
  'ops-command': '/command',
  'admin-panel': '/admin',
  'user-docs': '/docs',
};

export const LANGUAGES = ['bn', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'bn';
export const LANGUAGE_COOKIE = 'blood_lagbe_lang';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

function trimTrailingSlash(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

/** Splits a leading `/bn` or `/en` segment off a pathname. `path` is unprefixed and starts with `/`. */
export function splitLanguage(pathname: string): { language: Language | null; path: string } {
  const normalized = trimTrailingSlash(pathname);
  const [, first = '', ...rest] = normalized.split('/');
  if (isLanguage(first)) return { language: first, path: rest.length ? `/${rest.join('/')}` : '/' };
  return { language: null, path: normalized };
}

export function localizedPath(language: Language, path: string): string {
  return path === '/' ? `/${language}` : `/${language}${path}`;
}

export function screenPath(screen: ScreenId, language: Language): string {
  return localizedPath(language, SCREEN_PATHS[screen]);
}

/** The same page in another language, e.g. `/bn/donors` to `/en/donors`. */
export function switchLanguagePath(pathname: string, language: Language): string {
  return localizedPath(language, splitLanguage(pathname).path);
}

const PATH_TO_SCREEN: Record<string, ScreenId> = Object.fromEntries(
  Object.entries(SCREEN_PATHS).map(([screen, path]) => [path, screen as ScreenId])
);

export function pathToScreen(pathname: string | null | undefined): ScreenId {
  if (!pathname) return 'emergency-hub';
  const { path } = splitLanguage(pathname);
  return Object.hasOwn(PATH_TO_SCREEN, path) ? PATH_TO_SCREEN[path] : 'emergency-hub';
}

// Same alias list as the old getScreenFromHash in App.tsx.
const LEGACY_HASH_ALIASES: Record<string, ScreenId> = {
  admin: 'admin-panel',
  'admin-panel': 'admin-panel',
  donors: 'donor-directory',
  'donor-directory': 'donor-directory',
  sos: 'create-sos',
  'create-sos': 'create-sos',
  tracking: 'request-tracking',
  requests: 'request-tracking',
  'request-tracking': 'request-tracking',
  register: 'donor-register',
  'donor-register': 'donor-register',
  hospitals: 'hospital-org',
  orgs: 'hospital-org',
  'hospital-org': 'hospital-org',
  passport: 'donor-passport',
  'donor-passport': 'donor-passport',
  command: 'ops-command',
  'ops-command': 'ops-command',
  emergency: 'emergency-hub',
  'emergency-hub': 'emergency-hub',
  docs: 'user-docs',
  guide: 'user-docs',
  help: 'user-docs',
  'user-docs': 'user-docs',
};

/** Unprefixed path to redirect an old `/#alias` URL to, or null when no redirect applies. */
export function resolveLegacyRedirect(pathname: string, hash: string): string | null {
  if (splitLanguage(pathname).path !== '/') return null;
  const key = hash.toLowerCase().replace('#', '').trim();
  if (!Object.hasOwn(LEGACY_HASH_ALIASES, key)) return null;
  return SCREEN_PATHS[LEGACY_HASH_ALIASES[key]];
}
