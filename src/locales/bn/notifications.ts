import type { Notifications } from '../en/notifications.ts';

export const notifications: Notifications = {
  title: 'জরুরি রক্তদাতা নোটিফিকেশন',
  subtitle: 'আপনার প্রোফাইলের সাথে মিলে যাওয়া সামঞ্জস্যপূর্ণ রক্তের অনুরোধ',
  markAllRead: 'সব পঠিত করুন',
  empty: 'কোনো নতুন বিজ্ঞপ্তি নেই।',
  bloodNeeded: (bloodGroup: string) => `${bloodGroup} প্রয়োজন`,
  message: (bloodGroup: string, place: string) => `${place}-এ ${bloodGroup} রক্ত প্রয়োজন। আপনি একজন সামঞ্জস্যপূর্ণ দাতা।`,
  respondNow: 'রক্ত দিন',
  donationConfirmedTitle: 'রক্তদান নিশ্চিত হয়েছে',
  donationConfirmedMessage: (units: number, place: string, code: string) =>
    `ধন্যবাদ! ${place}-এ আপনার ${units} ইউনিট রক্তদান নিশ্চিত হয়েছে। ডোনেশন কোড: ${code}।`,
  viewPassport: 'আমার পাসপোর্ট দেখুন',
  notMe: 'এটি আমি নই',
  confirmNotMe: 'এই ডোনেশনটি মুছে ফেলবেন? শুধু তখনই করুন যখন আপনি রক্ত দেননি। যিনি রিকোয়েস্ট করেছেন তিনি দেখতে পাবেন যে আপনি আপত্তি জানিয়েছেন।',
};
