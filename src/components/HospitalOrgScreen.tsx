import React, { useState } from 'react';
import { ScreenId, HospitalOrganization, DonationCamp, BloodGroup } from '../types/blood';
import { SAMPLE_HOSPITAL_ORGS, SAMPLE_CAMPS } from '../data/mockData';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';

interface HospitalOrgScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenRequisition: (demand: any) => void;
}

export const HospitalOrgScreen: React.FC<HospitalOrgScreenProps> = ({
  onNavigate,
  onOpenRequisition
}) => {
  const { language } = useLanguage();
  const [selectedOrgId, setSelectedOrgId] = useState<string>(SAMPLE_HOSPITAL_ORGS[0].id);
  const [hospitals, setHospitals] = useState<HospitalOrganization[]>(SAMPLE_HOSPITAL_ORGS);
  const [camps, setCamps] = useState<DonationCamp[]>(SAMPLE_CAMPS);
  const [activeTab, setActiveTab] = useState<'inventory' | 'requisitions' | 'camps' | 'dispatch'>('inventory');
  
  // New Camp Modal state
  const [isCampModalOpen, setIsCampModalOpen] = useState(false);
  const [newCampTitle, setNewCampTitle] = useState('');
  const [newCampVenue, setNewCampVenue] = useState('');
  const [newCampDate, setNewCampDate] = useState('');
  const [newCampTarget, setNewCampTarget] = useState('200');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedOrg = hospitals.find(h => h.id === selectedOrgId) || hospitals[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Adjust stock
  const handleUpdateStock = (group: BloodGroup, delta: number) => {
    sound.playTap();
    setHospitals(prev => prev.map(h => {
      if (h.id === selectedOrgId) {
        const currentCount = h.bloodStock[group] || 0;
        const newCount = Math.max(0, currentCount + delta);
        return {
          ...h,
          availableBags: h.availableBags + delta,
          bloodStock: {
            ...h.bloodStock,
            [group]: newCount
          }
        };
      }
      return h;
    }));
    showToast(
      language === 'bn'
        ? `${group} গ্রুপের মজুত ${delta > 0 ? '+১ বৃদ্ধি' : '-১ হ্রাস'} করা হয়েছে।`
        : `${group} stock ${delta > 0 ? '+1 added' : '-1 deducted'}.`
    );
  };

  const handleRegisterForCamp = (campId: string) => {
    sound.playSuccessTone();
    setCamps(prev => prev.map(c => {
      if (c.id === campId) {
        return { ...c, registeredDonors: c.registeredDonors + 1 };
      }
      return c;
    }));
    showToast(
      language === 'bn'
        ? 'রক্তদান ক্যাম্পে আপনার স্বেচ্ছাসেবী হিসেবে রেজিস্ট্রেশন গৃহীত হয়েছে!'
        : 'Registered successfully as voluntary donor for this camp!'
    );
  };

  const handleCreateCampSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampTitle || !newCampVenue) return;
    sound.playSuccessTone();
    const newCamp: DonationCamp = {
      id: `CAMP-${Date.now().toString().slice(-4)}`,
      title: newCampTitle,
      organizer: selectedOrg.name,
      venue: newCampVenue,
      division: selectedOrg.division,
      date: newCampDate || 'Upcoming Weekend',
      timeRange: '9:00 AM – 4:00 PM',
      targetBags: parseInt(newCampTarget) || 200,
      registeredDonors: 1,
      contactNumber: selectedOrg.hotline,
      status: 'upcoming'
    };
    setCamps([newCamp, ...camps]);
    setIsCampModalOpen(false);
    setNewCampTitle('');
    setNewCampVenue('');
    showToast(
      language === 'bn'
        ? 'নতুন রক্তদান ক্যাম্প সফলভাবে তালিকাভুক্ত হয়েছে!'
        : 'New blood donation drive scheduled and published!'
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-emerald-400 text-xl">verified</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2 cursor-pointer">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Hospital Portal Hero Banner */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                {language === 'bn' ? 'হাসপাতাল ও ব্লাড ব্যাংক পোর্টাল' : 'HOSPITAL & BLOOD BANK PORTAL'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-800/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {selectedOrg.verifiedBadge}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span className="material-symbols-outlined text-red-500 text-3xl">local_hospital</span>
              <span>{selectedOrg.name}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
              {language === 'bn'
                ? 'রক্ত মজুত ও কোল্ড-চেইন সংরক্ষণ, জরুরি ট্রান্সফিউশন রিকুইজিশন স্লিপ জারি এবং ক্যাম্পাস রক্তদান ক্যাম্প ব্যবস্থাপনা।'
                : 'Centralized institutional suite for cold-chain blood stock monitoring, verified doctor requisitions, and community blood drives.'}
            </p>
          </div>

          {/* Institution Switcher Select */}
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shrink-0 flex flex-col gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {language === 'bn' ? 'প্রতিষ্ঠান নির্বাচন করুন:' : 'Switch Active Facility:'}
            </span>
            <select
              value={selectedOrgId}
              onChange={(e) => {
                setSelectedOrgId(e.target.value);
                sound.playTap();
              }}
              className="bg-slate-950 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
            >
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.shortCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'inventory' as const, label: language === 'bn' ? 'ব্লাড ব্যাংক মজুত ও কোল্ড চেইন' : 'Blood Vault & Cold Storage', icon: 'ac_unit' },
            { id: 'requisitions' as const, label: language === 'bn' ? 'ক্লিনিক্যাল রিকুইজিশন জারি' : 'Doctor Requisition Desk', icon: 'prescriptions' },
            { id: 'camps' as const, label: language === 'bn' ? 'রক্তদান ক্যাম্প ও ড্রাইভ' : 'Donation Drives & Camps', icon: 'event', count: camps.length },
            { id: 'dispatch' as const, label: language === 'bn' ? 'জরুরি ডোনার তলব' : 'Emergency Call Dispatch', icon: 'send_to_mobile' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  sound.playTap();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="material-symbols-outlined text-base">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive ? 'bg-white text-red-600' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: INVENTORY & COLD CHAIN */}
      {activeTab === 'inventory' && (
        <div className="flex flex-col gap-6">
          {/* Facility Status Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {language === 'bn' ? 'মোট সংরক্ষিত রক্ত ব্যাগ' : 'Total Units in Vault'}
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{selectedOrg.availableBags} ব্যাগ</span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {language === 'bn' ? 'সকল গ্রুপের সমষ্টি' : 'Across all 8 groups'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">bloodtype</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {language === 'bn' ? 'কোল্ড স্টোরেজ তাপমাত্রা' : 'Chiller Temp'}
                </span>
                <span className="text-2xl font-black text-emerald-600 mt-1 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  {selectedOrg.coldStorageTempC}°C
                </span>
                <span className="text-[11px] text-emerald-700 font-bold mt-1 block">
                  {language === 'bn' ? 'নিরাপদ পরিসীমা (২°C – ৬°C)' : 'Safe (2°C - 6°C Range)'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">ac_unit</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {language === 'bn' ? 'আইসিইউ ও ট্রমা শয্যা' : 'Critical ICU Beds'}
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{selectedOrg.icuBeds} টি</span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {language === 'bn' ? `মোট শয্যা: ${selectedOrg.totalBeds}` : `Total Beds: ${selectedOrg.totalBeds}`}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">bed</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {language === 'bn' ? 'ডিজিএইচএস অডিট' : 'Health Audit Status'}
                </span>
                <span className="text-base font-black text-emerald-700 mt-1 block">
                  {language === 'bn' ? 'সম্পূর্ণ প্রত্যয়িত' : 'Fully Certified'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                  {selectedOrg.licenseNumber}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">verified_user</span>
              </div>
            </div>
          </div>

          {/* Blood Stock Cards Grid with Direct Controls */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-600">inventory_2</span>
                  <span>{language === 'bn' ? 'গ্রুপভিত্তিক লাইভ মজুত ও ইনভেন্টরি ম্যানেজমেন্ট' : 'Live Group-Wise Blood Vault & Inventory'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'bn'
                    ? 'প্রতিটি গ্রুপের রক্তের ব্যাগ মজুত যোগ বা ট্রমা বিভাগে হস্তান্তরের হিসাব সমন্বয় করুন।'
                    : 'Manage units, adjust for donor donations, and track release for operation theater transfusions.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sound.playTap();
                    showToast(language === 'bn' ? 'কোল্ড চেইন সেন্সর পুনরায় ক্যালিব্রেট করা হয়েছে।' : 'Cold chain sensors re-calibrated.');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  <span>{language === 'bn' ? 'রিফ্রেশ সেন্সর' : 'Refresh Telemetry'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(Object.keys(selectedOrg.bloodStock) as BloodGroup[]).map((group) => {
                const count = selectedOrg.bloodStock[group] || 0;
                const isCritical = count < 20;
                return (
                  <div
                    key={group}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCritical
                        ? 'bg-red-50/70 border-red-300'
                        : 'bg-slate-50/70 border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-black text-slate-900">{group}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        isCritical ? 'bg-red-600 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isCritical ? (language === 'bn' ? 'সংকট' : 'LOW') : (language === 'bn' ? 'স্বাভাবিক' : 'SAFE')}
                      </span>
                    </div>

                    <div className="text-xl font-black text-slate-800 mb-3">
                      {count} <span className="text-xs font-semibold text-slate-500">{language === 'bn' ? 'ব্যাগ' : 'Units'}</span>
                    </div>

                    {/* Quick Add / Deduct buttons */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => handleUpdateStock(group, -1)}
                        title="Deduct unit for transfusion"
                        className="flex-1 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-black cursor-pointer shadow-xs active:scale-95"
                      >
                        -১
                      </button>
                      <button
                        onClick={() => handleUpdateStock(group, 1)}
                        title="Add unit from donor"
                        className="flex-1 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-black cursor-pointer shadow-xs active:scale-95"
                      >
                        +১
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REQUISITION DESK */}
      {activeTab === 'requisitions' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">prescriptions</span>
                <span>{language === 'bn' ? 'ক্লিনিক্যাল রক্ত রিকুইজিশন জারি' : 'Doctor Requisition Desk'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'bn'
                  ? 'আইসিইউ বা সার্জারি রোগীর জন্য বিএমডিসি নিবন্ধিত চিকিৎসকের অফিসিয়াল প্রেসক্রিপশন স্লিপ তৈরি করুন।'
                  : 'Issue hospital-authenticated requisition slips with BMDC registration tokens to stop syndicates.'}
              </p>
            </div>

            <button
              onClick={() => onNavigate('create-sos')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-base">emergency_share</span>
              <span>{language === 'bn' ? 'জরুরি ব্রডকাস্ট জারি করুন' : 'Issue Requisition & Broadcast'}</span>
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <h4 className="font-extrabold text-slate-900 text-sm mb-2">
              {language === 'bn' ? 'হাসপাতাল রিকুইজিশন ভেরিফিকেশন প্রোটোকল' : 'Hospital Protocol Compliance'}
            </h4>
            <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
              <li>{language === 'bn' ? 'প্রতিটি রিকুইজিশনে রেজিস্টার্ড ডাক্তারের বিএমডিসি নম্বর বাধ্যতামূলক।' : 'Every request requires a verified BMDC medical registration code.'}</li>
              <li>{language === 'bn' ? 'দালাল মুক্ত রক্ত নিশ্চিত করতে রোগীর স্বজনের এনআইডি যাচাই করা হয়।' : 'Recipient attendant identity is cross-checked to eliminate black-market brokering.'}</li>
              <li>{language === 'bn' ? 'ডিজিটাল ওটিপি ছাড়া রক্ত হস্তান্তর সম্পূর্ণ নিষিদ্ধ।' : 'Direct recipient OTP sign-off handshake is legally required for record-keeping.'}</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 3: CAMPS & DONATION DRIVES */}
      {activeTab === 'camps' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">event</span>
                <span>{language === 'bn' ? 'ক্যাম্পাস ও কমিউনিটি রক্তদান ড্রাইভ' : 'Community & Campus Donation Drives'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'bn'
                  ? 'ঢাকা বিশ্ববিদ্যালয়, বুয়েট ও মেডিকেল কলেজগুলোতে স্বেচ্ছাসেবী রক্তদান ক্যাম্পের আয়োজন ও অংশগ্রহণ।'
                  : 'Organize university blood donation camps, recruit donors, and track collection targets.'}
              </p>
            </div>

            <button
              onClick={() => setIsCampModalOpen(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-base">add_box</span>
              <span>{language === 'bn' ? 'নতুন ক্যাম্প শিডিউল করুন' : 'Schedule Blood Camp'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {camps.map((camp) => (
              <div 
                key={camp.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-red-300 hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                      {camp.status.toUpperCase()}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 font-mono">{camp.id}</span>
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{camp.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{camp.organizer}</p>

                  <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base">pin_drop</span>
                      <span className="font-semibold">{camp.venue}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base">calendar_today</span>
                      <span>{camp.date} • {camp.timeRange}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base">call</span>
                      <span className="font-mono">{camp.contactNumber}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1 font-medium">
                      <span className="text-slate-600">{language === 'bn' ? 'নিবন্ধিত রক্তদাতা:' : 'Registered Donors:'} <strong>{camp.registeredDonors}</strong></span>
                      <span className="text-slate-500">{language === 'bn' ? 'টার্গেট:' : 'Target:'} {camp.targetBags} {language === 'bn' ? 'ব্যাগ' : 'Bags'}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-red-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (camp.registeredDonors / camp.targetBags) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleRegisterForCamp(camp.id)}
                    className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                  >
                    <span className="material-symbols-outlined text-base">how_to_reg</span>
                    <span>{language === 'bn' ? 'রক্তদাতা হিসেবে নাম নিবন্ধন' : 'Register to Donate'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DIRECT EMERGENCY CALL DISPATCH */}
      {activeTab === 'dispatch' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col gap-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">send_to_mobile</span>
              <span>{language === 'bn' ? 'জরুরি ডোনার সমন্বয় ও ব্রডকাস্ট তলব' : 'Emergency Standby Donor Dispatch'}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'bn'
                ? 'আইসিইউ বা ওটিতে অবিলম্বে রক্তের প্রয়োজন হলে ৫ কিমি ব্যাসার্ধের রক্তদাতাদের কাছে তৎক্ষণাৎ স্বয়ংক্রিয় এসএমএস ও কল পাঠান।'
                : 'Directly dispatch IVR emergency voice calls and SMS to pre-screened voluntary donors near this hospital.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm mb-1">{selectedOrg.name} ICU Priority Link</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {language === 'bn'
                    ? 'সংযুক্ত হাসপাতালের জরুরি বিভাগ থেকে সরাসরি নিকটবর্তী ৫ কিমি এলাকার রক্তদাতাদের অ্যালার্ট পাঠান।'
                    : 'Dispatch priority beacon to donors stationed within immediate driving distance.'}
                </p>
              </div>

              <button
                onClick={() => onNavigate('create-sos')}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-red-600/25 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-lg">emergency_share</span>
                <span>{language === 'bn' ? 'এসওএস ব্রডকাস্ট চালু করুন' : 'Launch Immediate SOS Beacon'}</span>
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm mb-1">
                  {language === 'bn' ? 'সরাসরি ডোনার ডিরেক্টরি তলব' : 'Browse Standby Volunteer Donors'}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {language === 'bn'
                    ? 'জরুরি রক্তের গ্রুপের জন্য সরাসরি রক্তদাতাদের ফোন করুন অথবা পাসপোর্টের মাধ্যমে স্বাস্থ্য তথ্য যাচাই করুন।'
                    : 'View donor medical passports, hemoglobin levels, and direct verified contacts.'}
                </p>
              </div>

              <button
                onClick={() => onNavigate('donor-directory')}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-lg">person_search</span>
                <span>{language === 'bn' ? 'ডোনার ডিরেক্টরি দেখুন' : 'Explore Donor Directory'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Camp Modal */}
      {isCampModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">event</span>
                <span>{language === 'bn' ? 'নতুন রক্তদান ক্যাম্প শিডিউল' : 'Schedule Blood Drive'}</span>
              </h3>
              <button 
                onClick={() => setIsCampModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCampSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'ক্যাম্পের শিরোনাম' : 'Camp Title'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DU Central Blood Donation Drive"
                  value={newCampTitle}
                  onChange={(e) => setNewCampTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'স্থান / ভেন্যু' : 'Venue / Location'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TSC Premises, Dhaka University"
                  value={newCampVenue}
                  onChange={(e) => setNewCampVenue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'তারিখ' : 'Date'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Oct 12, 2026"
                    value={newCampDate}
                    onChange={(e) => setNewCampDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'টার্গেট ব্যাগ' : 'Target Bags'}
                  </label>
                  <input
                    type="number"
                    placeholder="250"
                    value={newCampTarget}
                    onChange={(e) => setNewCampTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  {language === 'bn' ? 'ক্যাম্প প্রকাশ করুন' : 'Publish Blood Camp'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCampModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
