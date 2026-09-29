import type { Access } from '../en/access.ts';

export const access: Access = {
  adminTitle: 'শুধু অ্যাডমিনদের জন্য',
  adminDesc: 'এই অংশটি Blood Lagbe? অ্যাডমিনিস্ট্রেটরদের জন্য। চালিয়ে যেতে অ্যাডমিন অ্যাকাউন্ট দিয়ে সাইন ইন করুন।',
  adminUnavailable: 'এই ডেমোতে অ্যাডমিন অংশটি চালু নেই।',
  adminNotAdmin: (name: string) => `আপনি ${name} হিসেবে সাইন ইন করা আছেন, কিন্তু এই অ্যাকাউন্টটি অ্যাডমিন নয়।`,
  userTitle: 'চালিয়ে যেতে সাইন ইন করুন',
  userDesc: 'আপনার ডোনার পাসপোর্ট শুধু আপনার নিজের, তাই এটি দেখতে সাইন ইন করতে হবে।',
};
