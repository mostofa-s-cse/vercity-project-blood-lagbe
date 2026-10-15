import type { Toast } from '../en/toast.ts';

export const toast: Toast = {
  sosBroadcast: (bloodGroup: string, hospital: string) =>
    `জরুরি ব্রডকাস্ট চালু: ${hospital}-এর কাছাকাছি ৪৫০+ রক্তদাতার কাছে ${bloodGroup} রক্তের এসওএস পাঠানো হয়েছে।`,
  donationRemoved: 'ডোনেশনটি আপনার পাসপোর্ট থেকে মুছে ফেলা হয়েছে।',
  donationRemoveFailed: 'ডোনেশনটি মুছতে পারেনি। আবার চেষ্টা করুন।',
  donorRegistered: (name: string, bloodGroup: string) =>
    `স্বাগতম ${name}! আপনার ${bloodGroup} রক্তদাতা প্রোফাইল সক্রিয় করা হয়েছে।`,
};
