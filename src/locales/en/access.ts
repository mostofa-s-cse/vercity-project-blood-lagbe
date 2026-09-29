export const access = {
  adminTitle: 'You do not have access to this page',
  adminDesc: 'Only accounts with the right role can open this area. Sign in with an account that has it to continue.',
  adminUnavailable: 'This area is not available in this demo.',
  adminNotAdmin: (name: string) => `You are signed in as ${name}, but this account does not have a role that can open this page.`,
  userTitle: 'Sign in to continue',
  userDesc: 'Your donor passport is personal to you, so you need to sign in to see it.',
};
export type Access = typeof access;
