/**
 * The sign-in page's one-click demo accounts (donor, hospital, admin) are shown only when
 * NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS is exactly "true". Off by default: on a public site anyone could
 * otherwise sign in as a hospital or an admin and change live data.
 */
export function demoAccountsEnabled(value: string | undefined): boolean {
  return value === 'true';
}
