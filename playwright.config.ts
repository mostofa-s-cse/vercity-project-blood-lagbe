import { defineConfig, devices } from '@playwright/test';

/**
 * Two kinds of spec, because a round-trip flow needs a real database and this sandbox (and most CI
 * runs) won't always have one (see docs/superpowers/plans/2026-10-08-wp11-hardening.md). They run as
 * separate invocations (`PW_MODE=demo` / `PW_MODE=real`, see package.json's `test:e2e:*` scripts), not
 * concurrently — Next.js 16's dev server refuses to start a second instance in the same project
 * directory even on a different port ("Another next dev server is already running"), so two webServers
 * can't run side by side here.
 *
 * - "demo": every database/Supabase env var is explicitly blanked, so `.env.local`'s values (a real
 *   `.dev-db` connection in this sandbox) never leak in. Next.js's own env loader only fills in a
 *   `.env.local` value when the key isn't already present in `process.env` — an explicit empty string
 *   still counts as "already present" — so this reliably forces true demo mode without touching any file
 *   on disk (no `mv .env.local` dance, which would be destructive if a test run were interrupted).
 * - "real": inherits whatever `DATABASE_URL` is already configured (this project's `.dev-db` locally, a
 *   GitHub Actions Postgres service container in CI, Task 6). Its specs skip themselves gracefully when
 *   no real database is reachable, rather than failing confusingly.
 */
const PW_MODE = process.env.PW_MODE === 'real' ? 'real' : 'demo';
const PORT = PW_MODE === 'real' ? 3402 : 3401;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: PW_MODE === 'real' ? /(sos-lifecycle|donor-profile)\.spec\.ts/ : 'demo-mode.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: BASE_URL,
  },
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env:
      PW_MODE === 'demo'
        ? {
            DATABASE_URL: '',
            DIRECT_URL: '',
            NEXT_PUBLIC_SUPABASE_URL: '',
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
            SUPABASE_SERVICE_ROLE_KEY: '',
            NEXT_PUBLIC_ADMIN_OPEN: '',
          }
        : {},
  },
});
