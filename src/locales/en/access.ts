export const access = {
  adminTitle: 'Admins only',
  adminDesc: 'This area is for Blood Lagbe? administrators. Sign in with an administrator account to continue.',
  adminUnavailable: 'The admin area is not available in this demo.',
  adminNotAdmin: (name: string) => `You are signed in as ${name}, but this account is not an administrator.`,
  userTitle: 'Sign in to continue',
  userDesc: 'Your donor passport is personal to you, so you need to sign in to see it.',
};
export type Access = typeof access;
