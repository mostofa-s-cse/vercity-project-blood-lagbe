export const notifications = {
  title: 'Donor Emergency Alerts',
  subtitle: 'Compatible blood requests matched to your profile',
  markAllRead: 'Mark all read',
  empty: 'No active notifications.',
  bloodNeeded: (bloodGroup: string) => `${bloodGroup} Needed`,
  message: (bloodGroup: string, place: string) => `${bloodGroup} blood is needed at ${place}. You're a compatible match.`,
  respondNow: 'Respond Now',
  donationConfirmedTitle: 'Donation confirmed',
  donationConfirmedMessage: (units: number, place: string, code: string) =>
    `Thank you! Your donation of ${units} unit(s) at ${place} was confirmed. Donation code: ${code}.`,
  viewPassport: 'See my passport',
  notMe: "This wasn't me",
  confirmNotMe: 'Remove this donation? Use this only if you did not give blood. The person who posted the request will see that you disputed it.',
};
export type Notifications = typeof notifications;
