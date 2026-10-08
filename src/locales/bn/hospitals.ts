import type { Hospitals } from '../en/hospitals.ts';

export const hospitals: Hospitals = {
  toastStockAdded: (group: string) => `${group} গ্রুপের মজুত +১ বৃদ্ধি করা হয়েছে।`,
  toastStockDeducted: (group: string) => `${group} গ্রুপের মজুত -১ হ্রাস করা হয়েছে।`,
  toastCampRegistered: 'রক্তদান ক্যাম্পে আপনার স্বেচ্ছাসেবী হিসেবে রেজিস্ট্রেশন গৃহীত হয়েছে!',
  toastCampCreated: 'নতুন রক্তদান ক্যাম্প সফলভাবে তালিকাভুক্ত হয়েছে!',
  toastStockSaveFailed: 'মজুতের পরিবর্তন সংরক্ষণ করা যায়নি, তাই আগের হিসাবে ফিরিয়ে নেওয়া হয়েছে। আবার চেষ্টা করুন।',
  toastSensorsRecalibrated: 'কোল্ড চেইন সেন্সর পুনরায় ক্যালিব্রেট করা হয়েছে।',
  defaultCampDate: 'আসন্ন সপ্তাহান্তে',

  portalBadge: 'হাসপাতাল ও ব্লাড ব্যাংক পোর্টাল',
  heroSubtitle:
    'রক্ত মজুত ও কোল্ড-চেইন সংরক্ষণ, জরুরি ট্রান্সফিউশন রিকুইজিশন স্লিপ জারি এবং ক্যাম্পাস রক্তদান ক্যাম্প ব্যবস্থাপনা।',
  switchFacility: 'প্রতিষ্ঠান নির্বাচন করুন:',

  tabs: {
    inventory: 'ব্লাড ব্যাংক মজুত ও কোল্ড চেইন',
    requisitions: 'ক্লিনিক্যাল রিকুইজিশন জারি',
    camps: 'রক্তদান ক্যাম্প ও ড্রাইভ',
    dispatch: 'জরুরি ডোনার তলব',
    map: 'ম্যাপ',
  },

  findNearest: 'নিকটতম প্রতিষ্ঠান',
  locating: 'অবস্থান খোঁজা হচ্ছে…',
  nearestFound: (name: string) => `নিকটতম প্রতিষ্ঠানে পরিবর্তন করা হয়েছে: ${name}।`,
  nearestNoneAvailable: 'কোনো প্রতিষ্ঠানের ম্যাপ অবস্থান এখনো নেই।',
  nearestDenied: 'আপনার অবস্থান পাওয়া যায়নি। তালিকা থেকে একটি প্রতিষ্ঠান বেছে নিন।',
  nearestUnsupported: 'এই ব্রাউজার আপনার অবস্থান শেয়ার করতে পারে না। তালিকা থেকে একটি প্রতিষ্ঠান বেছে নিন।',
  mapTitle: 'প্রতিষ্ঠানের ম্যাপ',
  mapSubtitle: 'শুধুমাত্র বাস্তব অবস্থানযুক্ত প্রতিষ্ঠানগুলো এখানে দেখা যাবে।',
  mapEmpty: 'কোনো প্রতিষ্ঠানের ম্যাপ অবস্থান এখনো নেই।',

  totalUnitsInVault: 'মোট সংরক্ষিত রক্ত ব্যাগ',
  bagsCount: (n: number) => `${n} ব্যাগ`,
  acrossAllGroups: 'সকল গ্রুপের সমষ্টি',
  chillerTemp: 'কোল্ড স্টোরেজ তাপমাত্রা',
  safeTempRange: 'নিরাপদ পরিসীমা (২°C – ৬°C)',
  criticalIcuBeds: 'আইসিইউ ও ট্রমা শয্যা',
  icuBedsCount: (n: number) => `${n} টি`,
  totalBeds: (n: number) => `মোট শয্যা: ${n}`,
  healthAuditStatus: 'ডিজিএইচএস অডিট',
  fullyCertified: 'সম্পূর্ণ প্রত্যয়িত',

  vaultTitle: 'গ্রুপভিত্তিক লাইভ মজুত ও ইনভেন্টরি ম্যানেজমেন্ট',
  vaultSubtitle:
    'প্রতিটি গ্রুপের রক্তের ব্যাগ মজুত যোগ বা ট্রমা বিভাগে হস্তান্তরের হিসাব সমন্বয় করুন।',
  refreshTelemetry: 'রিফ্রেশ সেন্সর',
  stockLow: 'সংকট',
  stockSafe: 'স্বাভাবিক',
  units: 'ব্যাগ',
  deductUnitTitle: 'ট্রান্সফিউশনের জন্য এক ব্যাগ বাদ দিন',
  addUnitTitle: 'রক্তদাতার কাছ থেকে এক ব্যাগ যোগ করুন',
  minusOne: '-১',
  plusOne: '+১',

  stockViewOnly: 'শুধু দেখা যাবে',
  stockViewOnlyNotice:
    'শুধু দেখার জন্য। এই হাসপাতালের নিজস্ব অ্যাকাউন্ট বা অ্যাডমিন ছাড়া কেউ এর মজুত পরিবর্তন করতে পারবেন না।',
  stockSignInHint: 'মজুত হালনাগাদ করতে হাসপাতালের অ্যাকাউন্ট দিয়ে সাইন ইন করুন।',

  requisitionTitle: 'ক্লিনিক্যাল রক্ত রিকুইজিশন জারি',
  requisitionSubtitle:
    'আইসিইউ বা সার্জারি রোগীর জন্য বিএমডিসি নিবন্ধিত চিকিৎসকের অফিসিয়াল প্রেসক্রিপশন স্লিপ তৈরি করুন।',
  issueRequisition: 'জরুরি ব্রডকাস্ট জারি করুন',
  protocolTitle: 'হাসপাতাল রিকুইজিশন ভেরিফিকেশন প্রোটোকল',
  protocol1: 'প্রতিটি রিকুইজিশনে রেজিস্টার্ড ডাক্তারের বিএমডিসি নম্বর বাধ্যতামূলক।',
  protocol2: 'দালাল মুক্ত রক্ত নিশ্চিত করতে রোগীর স্বজনের এনআইডি যাচাই করা হয়।',
  protocol3: 'ডিজিটাল ওটিপি ছাড়া রক্ত হস্তান্তর সম্পূর্ণ নিষিদ্ধ।',

  campsTitle: 'ক্যাম্পাস ও কমিউনিটি রক্তদান ড্রাইভ',
  campsSubtitle:
    'ঢাকা বিশ্ববিদ্যালয়, বুয়েট ও মেডিকেল কলেজগুলোতে স্বেচ্ছাসেবী রক্তদান ক্যাম্পের আয়োজন ও অংশগ্রহণ।',
  scheduleCamp: 'নতুন ক্যাম্প শিডিউল করুন',
  campStatus: {
    upcoming: 'আসন্ন',
    ongoing: 'চলমান',
    completed: 'সম্পন্ন',
  },
  registeredDonors: 'নিবন্ধিত রক্তদাতা:',
  target: 'টার্গেট:',
  bags: 'ব্যাগ',
  registerToDonate: 'রক্তদাতা হিসেবে নাম নিবন্ধন',

  dispatchTitle: 'জরুরি ডোনার সমন্বয় ও ব্রডকাস্ট তলব',
  dispatchSubtitle:
    'আইসিইউ বা ওটিতে অবিলম্বে রক্তের প্রয়োজন হলে ৫ কিমি ব্যাসার্ধের রক্তদাতাদের কাছে তৎক্ষণাৎ স্বয়ংক্রিয় এসএমএস ও কল পাঠান।',
  icuPriorityLink: (name: string) => `${name} ICU অগ্রাধিকার লিংক`,
  priorityLinkDesc:
    'সংযুক্ত হাসপাতালের জরুরি বিভাগ থেকে সরাসরি নিকটবর্তী ৫ কিমি এলাকার রক্তদাতাদের অ্যালার্ট পাঠান।',
  launchSos: 'এসওএস ব্রডকাস্ট চালু করুন',
  browseStandby: 'সরাসরি ডোনার ডিরেক্টরি তলব',
  browseStandbyDesc:
    'জরুরি রক্তের গ্রুপের জন্য সরাসরি রক্তদাতাদের ফোন করুন অথবা পাসপোর্টের মাধ্যমে স্বাস্থ্য তথ্য যাচাই করুন।',
  exploreDirectory: 'ডোনার ডিরেক্টরি দেখুন',

  modalTitle: 'নতুন রক্তদান ক্যাম্প শিডিউল',
  campTitleLabel: 'ক্যাম্পের শিরোনাম',
  campTitlePlaceholder: 'যেমন: ঢাবি কেন্দ্রীয় রক্তদান কর্মসূচি',
  venueLabel: 'স্থান / ভেন্যু',
  venuePlaceholder: 'যেমন: টিএসসি প্রাঙ্গণ, ঢাকা বিশ্ববিদ্যালয়',
  dateLabel: 'তারিখ',
  datePlaceholder: 'যেমন: ১২ অক্টোবর, ২০২৬',
  targetBagsLabel: 'টার্গেট ব্যাগ',
  publishCamp: 'ক্যাম্প প্রকাশ করুন',
  cancel: 'বাতিল',

  verifiedBadgeDefault: 'অনুমোদিত প্রতিষ্ঠান',
  pendingVerificationBadge: 'অনুমোদনের অপেক্ষায়',

  applyTitle: 'আপনার প্রতিষ্ঠান নিবন্ধনের জন্য আবেদন করুন',
  applyHint: 'এখনো তালিকাভুক্ত হয়নি এমন হাসপাতাল, ব্লাড ব্যাংক বা স্বেচ্ছাসেবী সংস্থার জন্য। প্রতিটি আবেদন একজন অ্যাডমিন পর্যালোচনা করবেন।',
  applyNameLabel: 'প্রতিষ্ঠানের নাম',
  applyNamePlaceholder: 'যেমন: সিটি জেনারেল হাসপাতাল',
  applyTypeLabel: 'প্রতিষ্ঠানের ধরন',
  applyTypeOptions: {
    government_hospital: 'সরকারি হাসপাতাল',
    private_hospital: 'বেসরকারি হাসপাতাল',
    volunteer_org: 'স্বেচ্ছাসেবী সংস্থা',
    blood_bank: 'ব্লাড ব্যাংক',
  },
  applyAddressLabel: 'ঠিকানা',
  applyAddressPlaceholder: 'রাস্তা, এলাকা, জেলা',
  applyLicenseLabel: 'লাইসেন্স / নিবন্ধন নম্বর',
  applyLicensePlaceholder: 'যেমন: DGHS-GOV-HOSP-0099',
  applyDivisionLabel: 'বিভাগ',
  applyDistrictLabel: 'জেলা',
  applyHotlineLabel: 'হটলাইন',
  applyEmergencyContactLabel: 'জরুরি যোগাযোগ',
  applyDirectorNameLabel: 'পরিচালক / ইনচার্জের নাম',
  applyTotalBedsLabel: 'মোট শয্যা',
  applyIcuBedsLabel: 'আইসিইউ শয্যা',
  applySubmit: 'আবেদন জমা দিন',
  applySuccess: 'আবেদন জমা হয়েছে। একজন অ্যাডমিন শীঘ্রই পর্যালোচনা করবেন।',
  applyFailed: 'আবেদন জমা দেওয়া যায়নি। আবার চেষ্টা করুন।',
};
