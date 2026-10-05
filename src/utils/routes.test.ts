import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  SCREEN_PATHS,
  isLanguage,
  localizedPath,
  pathToScreen,
  resolveLegacyRedirect,
  screenPath,
  splitLanguage,
  switchLanguagePath,
} from './routes.ts';

test('SCREEN_PATHS covers every screen with a unique path', () => {
  const paths = Object.values(SCREEN_PATHS);
  assert.equal(paths.length, 10);
  assert.equal(new Set(paths).size, 10);
  assert.equal(SCREEN_PATHS['emergency-hub'], '/');
  assert.equal(SCREEN_PATHS['admin-panel'], '/admin');
  assert.equal(SCREEN_PATHS['user-docs'], '/docs');
});

test('pathToScreen round-trips every screen', () => {
  for (const [screen, path] of Object.entries(SCREEN_PATHS)) {
    assert.equal(pathToScreen(path), screen);
  }
});

test('pathToScreen tolerates trailing slash, null, unknown and prototype keys', () => {
  assert.equal(pathToScreen('/donors/'), 'donor-directory');
  assert.equal(pathToScreen(null), 'emergency-hub');
  assert.equal(pathToScreen(undefined), 'emergency-hub');
  assert.equal(pathToScreen('/nope'), 'emergency-hub');
  assert.equal(pathToScreen('/constructor'), 'emergency-hub');
  assert.equal(pathToScreen('/__proto__'), 'emergency-hub');
});

test('resolveLegacyRedirect maps every old alias from root', () => {
  const cases: Record<string, string> = {
    admin: '/admin',
    'admin-panel': '/admin',
    donors: '/donors',
    'donor-directory': '/donors',
    sos: '/sos',
    'create-sos': '/sos',
    tracking: '/tracking',
    requests: '/tracking',
    'request-tracking': '/tracking',
    register: '/register',
    'donor-register': '/register',
    hospitals: '/hospitals',
    orgs: '/hospitals',
    'hospital-org': '/hospitals',
    passport: '/passport',
    'donor-passport': '/passport',
    command: '/command',
    'ops-command': '/command',
    emergency: '/',
    'emergency-hub': '/',
    docs: '/docs',
    guide: '/docs',
    help: '/docs',
    'user-docs': '/docs',
  };
  for (const [alias, target] of Object.entries(cases)) {
    assert.equal(resolveLegacyRedirect('/', `#${alias}`), target, alias);
  }
});

test('resolveLegacyRedirect is case-insensitive and trims', () => {
  assert.equal(resolveLegacyRedirect('/', '#ADMIN'), '/admin');
  assert.equal(resolveLegacyRedirect('/', '# Donors '), '/donors');
  assert.equal(resolveLegacyRedirect('/', 'sos'), '/sos');
});

test('resolveLegacyRedirect ignores unknown, empty and prototype hashes', () => {
  assert.equal(resolveLegacyRedirect('/', ''), null);
  assert.equal(resolveLegacyRedirect('/', '#'), null);
  assert.equal(resolveLegacyRedirect('/', '#nope'), null);
  assert.equal(resolveLegacyRedirect('/', '#constructor'), null);
  assert.equal(resolveLegacyRedirect('/', '#toString'), null);
  assert.equal(resolveLegacyRedirect('/', '#__proto__'), null);
});

test('resolveLegacyRedirect never redirects from a non-root path', () => {
  assert.equal(resolveLegacyRedirect('/admin', '#sos'), null);
  assert.equal(resolveLegacyRedirect('/donors', '#admin'), null);
});

test('language constants', () => {
  assert.deepEqual([...LANGUAGES], ['bn', 'en']);
  assert.equal(DEFAULT_LANGUAGE, 'bn');
  assert.equal(isLanguage('bn'), true);
  assert.equal(isLanguage('en'), true);
  for (const bad of ['BN', 'fr', '', 'constructor', undefined, null, 3]) assert.equal(isLanguage(bad), false);
});

test('splitLanguage separates a leading language segment', () => {
  assert.deepEqual(splitLanguage('/bn'), { language: 'bn', path: '/' });
  assert.deepEqual(splitLanguage('/bn/'), { language: 'bn', path: '/' });
  assert.deepEqual(splitLanguage('/en/donors'), { language: 'en', path: '/donors' });
  assert.deepEqual(splitLanguage('/en/donors/'), { language: 'en', path: '/donors' });
  assert.deepEqual(splitLanguage('/donors'), { language: null, path: '/donors' });
  assert.deepEqual(splitLanguage('/'), { language: null, path: '/' });
  assert.deepEqual(splitLanguage('/bnx/donors'), { language: null, path: '/bnx/donors' });
  assert.deepEqual(splitLanguage('/BN/donors'), { language: null, path: '/BN/donors' });
  assert.deepEqual(splitLanguage('/bn/bn/donors'), { language: 'bn', path: '/bn/donors' });
});

test('localizedPath prefixes the language, keeping root clean', () => {
  assert.equal(localizedPath('bn', '/'), '/bn');
  assert.equal(localizedPath('en', '/'), '/en');
  assert.equal(localizedPath('en', '/donors'), '/en/donors');
  assert.equal(localizedPath('bn', '/admin'), '/bn/admin');
});

test('screenPath gives every screen a localized path', () => {
  assert.equal(screenPath('emergency-hub', 'bn'), '/bn');
  assert.equal(screenPath('admin-panel', 'en'), '/en/admin');
  for (const screen of Object.keys(SCREEN_PATHS) as (keyof typeof SCREEN_PATHS)[]) {
    for (const lang of LANGUAGES) assert.equal(pathToScreen(screenPath(screen, lang)), screen);
  }
});

test('switchLanguagePath swaps or adds the language and keeps the page', () => {
  assert.equal(switchLanguagePath('/bn/donors', 'en'), '/en/donors');
  assert.equal(switchLanguagePath('/en', 'bn'), '/bn');
  assert.equal(switchLanguagePath('/bn/', 'en'), '/en');
  assert.equal(switchLanguagePath('/bn/donors/', 'en'), '/en/donors');
  assert.equal(switchLanguagePath('/donors', 'en'), '/en/donors');
  assert.equal(switchLanguagePath('/', 'bn'), '/bn');
  assert.equal(switchLanguagePath('/en/nope', 'bn'), '/bn/nope');
});

test('pathToScreen ignores the language prefix', () => {
  assert.equal(pathToScreen('/bn'), 'emergency-hub');
  assert.equal(pathToScreen('/en/'), 'emergency-hub');
  assert.equal(pathToScreen('/en/admin'), 'admin-panel');
  assert.equal(pathToScreen('/bn/donors/'), 'donor-directory');
  assert.equal(pathToScreen('/bn/constructor'), 'emergency-hub');
  assert.equal(pathToScreen('/bn/nope'), 'emergency-hub');
});

test('resolveLegacyRedirect works from a language root and returns an unprefixed path', () => {
  assert.equal(resolveLegacyRedirect('/bn', '#admin'), '/admin');
  assert.equal(resolveLegacyRedirect('/en/', '#sos'), '/sos');
  assert.equal(resolveLegacyRedirect('/en', '#emergency'), '/');
  assert.equal(resolveLegacyRedirect('/bn/admin', '#sos'), null);
  assert.equal(resolveLegacyRedirect('/en/donors', '#admin'), null);
  assert.equal(resolveLegacyRedirect('/bn', '#constructor'), null);
});
