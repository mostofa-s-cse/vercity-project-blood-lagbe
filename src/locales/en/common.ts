export const common = {
  brandName: 'Blood Lagbe?',
  brandSub: 'Emergency Lifeline & Centralized Blood Rescue Network',
  banglaTag: 'রক্ত লাগবে?',
  close: 'Close',
  cancel: 'Cancel',
  metaTitle: 'Blood Lagbe? (রক্ত লাগবে?) - Emergency Lifeline Network',
  metaDescription:
    'Emergency Medical Lifeline Portal & Centralized Blood Rescue Network for Bangladesh. Real-time geo-matched donor broadcast, live telemetry tracker, and DGHS operations command.',
  notFoundTitle: 'Page not found',
  notFoundDesc: 'The page you are looking for does not exist or has moved.',
  backHome: 'Back to Emergency Hub',
  alertInactive: 'No Code-Red alert currently active • Central blood bank active',
  alertFallback: (hospital: string, bed: string, bloodGroup: string, bags: number) =>
    `${hospital} (${bed}) ${bloodGroup} blood urgently required • ${bags} Bag(s) needed`,
  radiusInactive: 'Central zone radius dispatch standby',
  radiusFallback: (zone: string, radiusKm: number, requestCount: number, hospitals: string) =>
    `${requestCount} Urgent blood requests within ${radiusKm} km in ${zone} (${hospitals})`,
};
export type Common = typeof common;
