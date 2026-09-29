import type { Tracking } from '../en/tracking.ts';

export const tracking: Tracking = {
  statusChangedToast: (id: string, status: string) => `রিকোয়েস্ট #${id} এর অবস্থা '${status}' হিসেবে আপডেট হয়েছে।`,
  badge: 'রিকোয়েস্ট ট্র্যাকিং ড্যাশবোর্ড',
  liveBadge: '৪-ধাপের রিয়েল-টাইম ট্র্যাকিং',
  title: 'রক্তের রিকোয়েস্ট স্ট্যাটাস ও ট্র্যাকিং',
  subtitle:
    'রক্তের প্রতিটি আবেদন ৪টি নির্দিষ্ট ধাপে ট্র্যাক করা যায়: অপেক্ষারত (Pending) ➜ ডোনার পাওয়া গেছে (Donor Found) ➜ সম্পন্ন (Completed) ➜ বাতিল (Cancelled)।',
  postRequest: 'নতুন রিকোয়েস্ট পোস্ট',
  tabs: {
    all: 'সকল রিকোয়েস্ট',
    pending: '⏳ অপেক্ষারত (Pending)',
    donorFound: '🤝 ডোনার পাওয়া গেছে (Donor Found)',
    completed: '✅ সম্পন্ন (Completed)',
    cancelled: '❌ বাতিল (Cancelled)',
  },
  searchPlaceholder: 'রোগীর নাম, হাসপাতাল বা রিকোয়েস্ট আইডি দিয়ে খুঁজুন...',
  bags: 'ব্যাগ',
  status: {
    pending: 'অপেক্ষারত (Pending)',
    donorFound: 'ডোনার পাওয়া গেছে (Donor Found)',
    completed: 'রক্তদান সম্পন্ন (Completed)',
    cancelled: 'বাতিলকৃত (Cancelled)',
  },
  stages: {
    issued: '১. রিকোয়েস্ট জারি',
    matching: '২. ডোনার ম্যাচিং',
    otp: '৩. ওটিপি নিশ্চিতকরণ',
    success: '৪. রক্তদান সফল',
  },
  attendant: 'রোগীর স্বজন:',
  doctor: 'চিকিৎসক:',
  assignedDonor: 'নিযুক্ত রক্তদাতা (সরাসরি হাসপাতালে আসছেন):',
  eta: (minutes: number) => `আনুমানিক পৌঁছানো: ~${minutes} মিনিট`,
  doctorSlip: 'ডাক্তারের স্লিপ',
  linkCopied: 'রিকোয়েস্টের লিংক কপি করা হয়েছে।',
  share: 'শেয়ার',
  acceptDonor: 'ডোনার গ্রহণ করুন',
  confirmCompleted: 'রক্তদান সম্পন্ন নিশ্চিত করুন',
  cancelRequest: 'রিকোয়েস্ট বাতিল',
};
