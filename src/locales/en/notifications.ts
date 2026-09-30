export const notifications = {
  title: 'Donor Emergency Alerts',
  subtitle: 'Geofenced blood calls matching your blood type',
  clearAll: 'Clear All',
  empty: 'No active notifications.',
  bloodNeeded: (bloodGroup: string) => `${bloodGroup} Needed`,
  respondNow: 'Respond Now',
  smsGatewayLive: 'DGHS Carrier SMS Live',
};
export type Notifications = typeof notifications;
