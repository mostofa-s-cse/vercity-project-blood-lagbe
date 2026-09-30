import type { Notifications } from '../en/notifications.ts';

export const notifications: Notifications = {
  title: 'জরুরি রক্তদাতা নোটিফিকেশন',
  subtitle: 'আপনার রক্তের গ্রুপ ও এলাকা অনুযায়ী সতর্কবার্তা',
  clearAll: 'সব মুছুন',
  empty: 'কোনো নতুন বিজ্ঞপ্তি নেই।',
  bloodNeeded: (bloodGroup: string) => `${bloodGroup} প্রয়োজন`,
  respondNow: 'রক্ত দিন',
  smsGatewayLive: 'এসএমএস গেটওয়ে সক্রিয়',
};
