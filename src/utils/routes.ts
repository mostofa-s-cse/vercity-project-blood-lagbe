import type { ScreenId } from '../types/blood';

export const SCREEN_PATHS: Record<ScreenId, string> = {
  'emergency-hub': '/',
  'donor-directory': '/donors',
  'create-sos': '/sos',
  'request-tracking': '/tracking',
  'donor-register': '/register',
  'live-tracker': '/tracker',
  'hospital-org': '/hospitals',
  'donor-passport': '/passport',
  'ops-command': '/command',
  'pitch-deck': '/deck',
  'admin-panel': '/admin',
};

const PATH_TO_SCREEN: Record<string, ScreenId> = Object.fromEntries(
  Object.entries(SCREEN_PATHS).map(([screen, path]) => [path, screen as ScreenId])
);

export function pathToScreen(pathname: string | null | undefined): ScreenId {
  if (!pathname) return 'emergency-hub';
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return Object.hasOwn(PATH_TO_SCREEN, normalized) ? PATH_TO_SCREEN[normalized] : 'emergency-hub';
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
  tracker: 'live-tracker',
  'live-tracker': 'live-tracker',
  hospitals: 'hospital-org',
  orgs: 'hospital-org',
  'hospital-org': 'hospital-org',
  passport: 'donor-passport',
  'donor-passport': 'donor-passport',
  command: 'ops-command',
  'ops-command': 'ops-command',
  deck: 'pitch-deck',
  proposal: 'pitch-deck',
  'pitch-deck': 'pitch-deck',
  emergency: 'emergency-hub',
  'emergency-hub': 'emergency-hub',
};

/** Path to redirect an old `/#alias` URL to, or null when no redirect applies. */
export function resolveLegacyRedirect(pathname: string, hash: string): string | null {
  if (pathname !== '/') return null;
  const key = hash.toLowerCase().replace('#', '').trim();
  if (!Object.hasOwn(LEGACY_HASH_ALIASES, key)) return null;
  return SCREEN_PATHS[LEGACY_HASH_ALIASES[key]];
}
