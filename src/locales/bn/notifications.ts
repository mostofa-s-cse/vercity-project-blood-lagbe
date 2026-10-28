import type { Notifications } from '../en/notifications.ts';

export const notifications: Notifications = {
  title: 'নোটিফিকেশন',
  subtitle: 'আপনার সাথে মিলে যাওয়া রক্তের অনুরোধ এবং আপনার অনুরোধে সাড়া দেওয়া রক্তদাতা',
  markAllRead: 'সব পঠিত করুন',
  empty: 'কোনো নতুন বিজ্ঞপ্তি নেই।',
  bloodNeeded: (bloodGroup: string) => `${bloodGroup} প্রয়োজন`,
  message: (bloodGroup: string, place: string) => `${place}-এ ${bloodGroup} রক্ত প্রয়োজন। আপনি একজন সামঞ্জস্যপূর্ণ দাতা।`,
  respondNow: 'রক্ত দিন',
  donationConfirmedTitle: 'রক্তদান নিশ্চিত হয়েছে',
  donationConfirmedMessage: (units: number, place: string, code: string) =>
    `ধন্যবাদ! ${place}-এ আপনার ${units} ইউনিট রক্তদান নিশ্চিত হয়েছে। ডোনেশন কোড: ${code}।`,
  donorRespondedTitle: 'একজন রক্তদাতা সাড়া দিয়েছেন',
  donorRespondedMessage: (name: string, bloodGroup: string, place: string) =>
    `${name} ${place}-এ ${bloodGroup} রক্ত দিতে পারবেন বলে জানিয়েছেন। ট্র্যাকিং-এ গিয়ে ফোন করে নিশ্চিত করুন।`,
  trackRequest: 'ট্র্যাক করুন',
  viewPassport: 'আমার পাসপোর্ট দেখুন',
  notMe: 'এটি আমি নই',
  confirmNotMe: 'এই ডোনেশনটি মুছে ফেলবেন? শুধু তখনই করুন যখন আপনি রক্ত দেননি। যিনি রিকোয়েস্ট করেছেন তিনি দেখতে পাবেন যে আপনি আপত্তি জানিয়েছেন।',
};
