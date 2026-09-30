import type { Common } from '../en/common.ts';

export const common: Common = {
  brandName: 'Blood Lagbe?',
  brandSub: 'জরুরি লাইফলাইন ও ব্লাড রেসকিউ নেটওয়ার্ক',
  banglaTag: 'রক্ত লাগবে?',
  close: 'বন্ধ করুন',
  cancel: 'বাতিল',
  metaTitle: 'Blood Lagbe? (রক্ত লাগবে?) - জরুরি লাইফলাইন নেটওয়ার্ক',
  metaDescription:
    'বাংলাদেশের জরুরি চিকিৎসা লাইফলাইন পোর্টাল ও কেন্দ্রীয় ব্লাড রেসকিউ নেটওয়ার্ক। রিয়েল-টাইম লোকেশন-ভিত্তিক রক্তদাতা ব্রডকাস্ট, লাইভ ট্র্যাকার এবং ডিজিএইচএস অপারেশন কমান্ড।',
  notFoundTitle: 'পেজটি পাওয়া যায়নি',
  notFoundDesc: 'আপনি যে পেজটি খুঁজছেন সেটি নেই অথবা সরানো হয়েছে।',
  backHome: 'জরুরি হাবে ফিরে যান',
  alertInactive: 'বর্তমানে কোনো কোড-রেড জরুরি সতর্কতা জারি নেই • সেন্ট্রাল ব্লাড ব্যাংক সক্রিয়',
  alertFallback: (hospital: string, bed: string, bloodGroup: string, bags: number) =>
    `${hospital}ে (${bed}) ${bloodGroup} রক্ত অতি জরুরি • ${bags} ব্যাগ প্রয়োজন`,
  radiusInactive: 'সেন্ট্রাল জোনের রেডিয়াস অ্যালার্ট সক্রিয়',
  radiusFallback: (zone: string, radiusKm: number, requestCount: number, hospitals: string) =>
    `${zone}ে ${radiusKm} কিমি এর মধ্যে ${requestCount}টি জরুরি রক্তের রিকোয়েস্ট (${hospitals})`,
};
