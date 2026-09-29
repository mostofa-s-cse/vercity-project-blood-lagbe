import type { Toast } from '../en/toast.ts';

export const toast: Toast = {
  sosBroadcast: (bloodGroup: string, hospital: string) =>
    `জরুরি ব্রডকাস্ট চালু: ${hospital}-এর কাছাকাছি ৪৫০+ রক্তদাতার কাছে ${bloodGroup} রক্তের এসওএস পাঠানো হয়েছে।`,
  donorRegistered: (name: string, bloodGroup: string) =>
    `স্বাগতম ${name}! আপনার ${bloodGroup} রক্তদাতা প্রোফাইল সক্রিয় করা হয়েছে।`,
  otpSuccess: 'রক্তদান সম্পন্ন ও নিশ্চিত করা হয়েছে! ডিজিটাল সনদ ও রসিদ রেকর্ড করা হলো।',
};
