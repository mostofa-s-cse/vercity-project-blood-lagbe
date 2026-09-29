import type { Common } from '../en/common.ts';

export const common: Common = {
  brandName: 'Blood Lagbe?',
  brandSub: 'জরুরি লাইফলাইন ও ব্লাড রেসকিউ নেটওয়ার্ক',
  banglaTag: 'রক্ত লাগবে?',
  close: 'বন্ধ করুন',
  cancel: 'বাতিল',
  alertInactive: 'বর্তমানে কোনো কোড-রেড জরুরি সতর্কতা জারি নেই • সেন্ট্রাল ব্লাড ব্যাংক সক্রিয়',
  alertFallback: (hospital: string, bed: string, bloodGroup: string, bags: number) =>
    `${hospital}ে (${bed}) ${bloodGroup} রক্ত অতি জরুরি • ${bags} ব্যাগ প্রয়োজন`,
  radiusInactive: 'সেন্ট্রাল জোনের রেডিয়াস অ্যালার্ট সক্রিয়',
  radiusFallback: (zone: string, radiusKm: number, requestCount: number, hospitals: string) =>
    `${zone}ে ${radiusKm} কিমি এর মধ্যে ${requestCount}টি জরুরি রক্তের রিকোয়েস্ট (${hospitals})`,
};
