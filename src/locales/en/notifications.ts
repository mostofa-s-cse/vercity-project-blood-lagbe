export const notifications = {
  title: 'Notifications',
  subtitle: 'Blood requests matched to you, and donors who answered your requests',
  markAllRead: 'Mark all read',
  empty: 'No active notifications.',
  bloodNeeded: (bloodGroup: string) => `${bloodGroup} Needed`,
  message: (bloodGroup: string, place: string) => `${bloodGroup} blood is needed at ${place}. You're a compatible match.`,
  respondNow: 'Respond Now',
  donationConfirmedTitle: 'Donation confirmed',
  donationConfirmedMessage: (units: number, place: string, code: string) =>
    `Thank you! Your donation of ${units} unit(s) at ${place} was confirmed. Donation code: ${code}.`,
  donorRespondedTitle: 'A donor can help',
  donorRespondedMessage: (name: string, bloodGroup: string, place: string) =>
    `${name} said they can donate ${bloodGroup} blood at ${place}. Open tracking to call and confirm.`,
  trackRequest: 'Track request',
  viewPassport: 'See my passport',
  notMe: "This wasn't me",
  confirmNotMe: 'Remove this donation? Use this only if you did not give blood. The person who posted the request will see that you disputed it.',
};
export type Notifications = typeof notifications;
