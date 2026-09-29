import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREEN_PATHS, pathToScreen, resolveLegacyRedirect } from './routes.ts';

test('SCREEN_PATHS covers every screen with a unique path', () => {
  const paths = Object.values(SCREEN_PATHS);
  assert.equal(paths.length, 11);
  assert.equal(new Set(paths).size, 11);
  assert.equal(SCREEN_PATHS['emergency-hub'], '/');
  assert.equal(SCREEN_PATHS['admin-panel'], '/admin');
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
    tracker: '/tracker',
    'live-tracker': '/tracker',
    hospitals: '/hospitals',
    orgs: '/hospitals',
    'hospital-org': '/hospitals',
    passport: '/passport',
    'donor-passport': '/passport',
    command: '/command',
    'ops-command': '/command',
    deck: '/deck',
    proposal: '/deck',
    'pitch-deck': '/deck',
    emergency: '/',
    'emergency-hub': '/',
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
