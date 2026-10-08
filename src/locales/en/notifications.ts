export const notifications = {
  title: 'Donor Emergency Alerts',
  subtitle: 'Compatible blood requests matched to your profile',
  markAllRead: 'Mark all read',
  empty: 'No active notifications.',
  bloodNeeded: (bloodGroup: string) => `${bloodGroup} Needed`,
  message: (bloodGroup: string, place: string) => `${bloodGroup} blood is needed at ${place}. You're a compatible match.`,
  respondNow: 'Respond Now',
};
export type Notifications = typeof notifications;
