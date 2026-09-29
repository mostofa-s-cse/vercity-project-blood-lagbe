import type { Requisition } from '../en/requisition.ts';

export const requisition: Requisition = {
  title: 'অফিসিয়াল ক্লিনিক্যাল রিকুইজিশন স্লিপ',
  subtitle: 'ডিজিএইচএস ব্লাড সেফটি প্রোটোকল ৪.২ • ভেরিফাইড প্রেসক্রিপশন',
  govHeader: 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার',
  department: 'রক্ত সঞ্চালন ও ক্রিটিক্যাল কেয়ার বিভাগ',
  urgentOtOrder: 'জরুরি ওটি অর্ডার',
  slipNumber: 'স্লিপ #BD-DMCH-2025-98321',
  patientNameLabel: 'রোগীর নাম',
  bloodGroupLabel: 'রক্তের গ্রুপ',
  requiredUnitsLabel: 'প্রয়োজনীয় ইউনিট',
  unitsValue: (units: number) => `${units} ব্যাগ (PRBC)`,
  crossMatchLabel: 'ক্রস-ম্যাচ অবস্থা',
  crossMatchOk: 'প্রাথমিক স্ক্রিনিং সম্পন্ন',
  doctorReg: 'BMDC রেজি. #A-48190 • বায়োমেট্রিক সিলমোহরযুক্ত',
  dghsValidated: 'ডিজিএইচএস অনুমোদিত',
  sealVerified: 'সিল ২৪/৭ যাচাইকৃত',
  signedNotice: 'ডিজিটাল স্বাক্ষরযুক্ত এবং হাসপাতালের ভর্তি তথ্যভাণ্ডারের সাথে মিলিয়ে দেখা হয়েছে',
  acknowledgeClose: 'বুঝেছি, বন্ধ করুন',
};
