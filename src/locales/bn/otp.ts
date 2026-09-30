import type { Otp } from '../en/otp.ts';

export const otp: Otp = {
  title: 'রক্তগ্রহীতার হস্তান্তর OTP',
  subtitle: 'দালাল-প্রতিরোধী নিরাপদ সমাপ্তি কোড',
  errorIncomplete: 'অনুগ্রহ করে হস্তান্তর কোডের ৪টি সংখ্যাই লিখুন।',
  errorIncorrect: (expectedOtp: string) => `ভুল কোড। ডেমোর জন্য গোপন OTP হলো ${expectedOtp}।`,
  successTitle: 'হস্তান্তর নিশ্চিত হয়েছে!',
  successDesc: (donorName: string, patientName: string) =>
    `রক্তদান আনুষ্ঠানিকভাবে ${donorName}-এর নামে যুক্ত হয়েছে। ${patientName}-এর জন্য ১ ব্যাগ রক্ত নিরাপদে গ্রহণ করা হয়েছে।`,
  explainer:
    'টাকা আদায় ও রক্তের কালোবাজারি বন্ধ করতে, রোগীর বেডের পাশে ব্যাগ যাচাইয়ের পর রোগীর স্বজন তাঁর গোপন OTP স্বেচ্ছাসেবী রক্তদাতাকে দেন।',
  enterCode: '৪ সংখ্যার হস্তান্তর কোড লিখুন',
  autoFill: (expectedOtp: string) => `স্বজনের OTP স্বয়ংক্রিয়ভাবে বসান (${expectedOtp})`,
  confirmHandover: 'রক্ত হস্তান্তর নিশ্চিত করুন',
};
