import React, { useState } from 'react';
import { ScreenId, EmergencyDemand, Donor, HospitalOrganization, BloodRequest, FraudIncident, BloodGroup } from '../types/blood';
import { INITIAL_DONORS, SAMPLE_HOSPITAL_ORGS, INITIAL_BLOOD_REQUESTS, FRAUD_INCIDENTS } from '../data/mockData';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';

interface AdminPanelScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenRequisition: (demand: any) => void;
}

type AdminTab = 'overview' | 'donors' | 'requests' | 'hospitals' | 'fraud' | 'logs';

export const AdminPanelScreen: React.FC<AdminPanelScreenProps> = ({
  onNavigate,
  onOpenRequisition
}) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [bloodFilter, setBloodFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Interactive Admin state
  const [donors, setDonors] = useState<Donor[]>(INITIAL_DONORS);
  const [requests, setRequests] = useState<BloodRequest[]>(INITIAL_BLOOD_REQUESTS);
  const [hospitals, setHospitals] = useState<HospitalOrganization[]>(SAMPLE_HOSPITAL_ORGS);
  const [fraudList, setFraudList] = useState<FraudIncident[]>(FRAUD_INCIDENTS);
  
  // Selected detail modal
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<BloodRequest | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Donor actions
  const handleToggleVerifyDonor = (donorId: string) => {
    sound.playTap();
    setDonors(prev => prev.map(d => {
      if (d.id === donorId) {
        const nextState = !d.isBdrcsVerified;
        showToast(
          language === 'bn' 
            ? `${d.name}-এর বিডিআরসিএস ও এনআইডি ভেরিফিকেশন স্ট্যাটাস পরিবর্তন করা হয়েছে।` 
            : `${d.name} verification status toggled to ${nextState ? 'VERIFIED' : 'UNVERIFIED'}.`
        );
        return { ...d, isBdrcsVerified: nextState };
      }
      return d;
    }));
  };

  const handleToggleDonorAvailability = (donorId: string) => {
    sound.playTap();
    setDonors(prev => prev.map(d => {
      if (d.id === donorId) {
        const nextState = !d.isAvailable;
        showToast(
          language === 'bn'
            ? `${d.name}-এর প্রাপ্যতা আপডেট: ${nextState ? 'প্রস্তুত' : 'স্থগিত'}`
            : `${d.name} availability set to ${nextState ? 'Available' : 'Paused'}`
        );
        return { ...d, isAvailable: nextState, isOnDuty: nextState };
      }
      return d;
    }));
  };

  // Request actions
  const handleUpdateRequestStatus = (requestId: string, newStatus: 'pending' | 'donor_found' | 'completed' | 'cancelled') => {
    sound.playTap();
    setRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        showToast(
          language === 'bn'
            ? `রিকোয়েস্ট #${requestId} এর স্ট্যাটাস '${newStatus}' এ পরিবর্তন করা হয়েছে।`
            : `Request #${requestId} status updated to ${newStatus.toUpperCase()}.`
        );
        return { ...r, status: newStatus };
      }
      return r;
    }));
  };

  const handleToggleHospitalVerification = (hospitalId: string) => {
    sound.playTap();
    setHospitals(prev => prev.map(h => {
      if (h.id === hospitalId) {
        const nextState = !h.isVerified;
        showToast(
          language === 'bn'
            ? `${h.name}-এর প্রাতিষ্ঠানিক অনুমোদন স্ট্যাটাস হালনাগাদ করা হয়েছে।`
            : `${h.name} institution verification updated.`
        );
        return { ...h, isVerified: nextState };
      }
      return h;
    }));
  };

  const handleResolveFraud = (id: string, action: 'banned' | 'dismissed') => {
    sound.playTap();
    setFraudList(prev => prev.map(item => item.id === id ? { ...item, status: action } : item));
    showToast(
      action === 'banned'
        ? (language === 'bn' ? 'সংশ্লিষ্ট নম্বর ও এনআইডি স্থায়ীভাবে ব্লকলিস্টে রাখা হয়েছে।' : 'Entity blacklisted across national SMS gateways.')
        : (language === 'bn' ? 'প্রতিবেদনটি খারিজ করা হয়েছে।' : 'Incident report dismissed.')
    );
  };

  // Filtered donors
  const filteredDonors = donors.filter(d => {
    const matchesSearch = 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone.includes(searchQuery);
    const matchesBlood = bloodFilter === 'ALL' || d.bloodGroup === bloodFilter;
    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'AVAILABLE' && d.isAvailable) ||
      (statusFilter === 'VERIFIED' && d.isBdrcsVerified) ||
      (statusFilter === 'RESTING' && !d.isAvailable);
    return matchesSearch && matchesBlood && matchesStatus;
  });

  // Filtered requests
  const filteredRequests = requests.filter(r => {
    const matchesSearch = 
      r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.hospital.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBlood = bloodFilter === 'ALL' || r.bloodGroup === bloodFilter;
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesBlood && matchesStatus;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-emerald-400 text-xl">admin_panel_settings</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2 cursor-pointer">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Admin Top Master Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                {language === 'bn' ? 'কেন্দ্রীয় অ্যাডমিন প্যানেল' : 'CENTRAL ADMIN CONSOLE'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                {language === 'bn' ? 'ডিজিএইচএস ও বিডিআরসিএস প্রত্যয়িত' : 'DGHS & BDRCS PROTOCOL v4.5'}
              </span>
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {language === 'bn' ? 'সিস্টেম অনলাইন • ১০০% সক্রিয়' : 'System Operational • 100% Online'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-3xl">shield_person</span>
              <span>{language === 'bn' ? 'ব্লাড লাগবে? জাতীয় সমন্বয় ও নিয়ন্ত্রণ ড্যাশবোর্ড' : 'Blood Lagbe? National Command & Admin Panel'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
              {language === 'bn' 
                ? 'রক্তদাতা রেজিস্ট্রি, জরুরি রক্তের রিকোয়েস্ট অনুমোদন, হাসপাতাল ভেরিফিকেশন, রক্ত ব্যাংক নিরীক্ষা এবং দালাল চক্র বিরোধী পর্যবেক্ষণ।'
                : 'Centralized administration for donor registry, emergency request triage, hospital verification, blood cold-chain audits, and anti-fraud enforcement.'}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="bg-slate-900/90 border border-slate-800 px-4 py-2.5 rounded-2xl text-center shadow-inner">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {language === 'bn' ? 'সক্রিয় ডোনার' : 'Active Donors'}
              </span>
              <span className="text-xl font-black text-emerald-400">
                {donors.filter(d => d.isAvailable).length} / {donors.length}
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 px-4 py-2.5 rounded-2xl text-center shadow-inner">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {language === 'bn' ? 'জরুরি রিকোয়েস্ট' : 'Pending Requests'}
              </span>
              <span className="text-xl font-black text-red-500">
                {requests.filter(r => r.status === 'pending').length}
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 px-4 py-2.5 rounded-2xl text-center shadow-inner">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {language === 'bn' ? 'ভেরিফাইড হাসপাতাল' : 'Verified Orgs'}
              </span>
              <span className="text-xl font-black text-cyan-400">
                {hospitals.filter(h => h.isVerified).length}
              </span>
            </div>

            <button
              onClick={() => {
                sound.playSosSiren();
                showToast(
                  language === 'bn'
                    ? 'দেশব্যাপী সমন্বয়কারীদের কাছে জরুরি রেড অ্যালার্ট জারি করা হয়েছে!'
                    : 'Emergency Red Alert dispatched to all standby coordinators!'
                );
              }}
              className="px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-all hover:scale-105 cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-base animate-pulse">campaign</span>
              <span>{language === 'bn' ? 'রেড অ্যালার্ট সম্প্রচার' : 'Broadcast Red Alert'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'overview' as AdminTab, label: language === 'bn' ? 'সামগ্রিক ড্যাশবোর্ড' : 'Overview & Analytics', icon: 'dashboard' },
            { id: 'donors' as AdminTab, label: language === 'bn' ? 'ডোনার রেজিস্ট্রি ব্যবস্থাপনা' : 'Donor Registry', icon: 'groups', count: donors.length },
            { id: 'requests' as AdminTab, label: language === 'bn' ? 'রক্তের রিকোয়েস্ট কন্ট্রোল' : 'Blood Requests Desk', icon: 'emergency', count: requests.filter(r => r.status === 'pending').length },
            { id: 'hospitals' as AdminTab, label: language === 'bn' ? 'হাসপাতাল ও সংস্থা অনুমোদন' : 'Hospitals & Blood Banks', icon: 'local_hospital', count: hospitals.length },
            { id: 'fraud' as AdminTab, label: language === 'bn' ? 'দালাল চক্র প্রতিরোধ' : 'Anti-Fraud & Syndicates', icon: 'gavel', count: fraudList.filter(f => f.status === 'pending').length },
            { id: 'logs' as AdminTab, label: language === 'bn' ? 'এসএমএস ও সিস্টেম অডিট' : 'SMS Gateway & Audit Logs', icon: 'terminal' },
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

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {language === 'bn' ? 'মোট নিবন্ধিত রক্তদাতা' : 'Total Registered Donors'}
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">২,৪৮০ জন</span>
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  {language === 'bn' ? '+১৮ জন আজ যুক্ত হয়েছেন' : '+18 joined today'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">person_pin</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {language === 'bn' ? 'রক্তদান সম্পন্ন (এই মাসে)' : 'Fulfilled Transfusions'}
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">৪৫২ টি</span>
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  {language === 'bn' ? '৯৬.৪% দ্রুত পূরণ হার' : '96.4% success rate'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">volunteer_activism</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {language === 'bn' ? 'গড় ডোনার পৌঁছানোর সময়' : 'Avg. Donor Transit ETA'}
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">১৮.২ মিনিট</span>
                <span className="text-[11px] text-cyan-600 font-bold flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-sm">near_me</span>
                  {language === 'bn' ? 'ঢাকা মেট্রো ৫ কিমি রেডিয়াস' : 'Dhaka 5km radius'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">speed</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {language === 'bn' ? 'দালাল চক্র প্রতিরোধ' : 'Syndicates Blocked'}
                </span>
                <span className="text-2xl font-black text-red-600 mt-1 block">২১ জন</span>
                <span className="text-[11px] text-red-600 font-bold flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-sm">block</span>
                  {language === 'bn' ? 'টেলিটক ও জিপি গেটওয়ে ব্লক' : 'NID permanently blacklisted'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">shield</span>
              </div>
            </div>
          </div>

          {/* Blood Group Matrix and Shortage Alert */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* National Blood Stock Availability Matrix */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-600">bloodtype</span>
                    <span>{language === 'bn' ? 'জাতীয় রক্তের গ্রুপ মজুত ও চাহিদার অনুপাত' : 'National Blood Group Supply & Demand Matrix'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {language === 'bn' ? 'ডিএমসিএইচ, বিএসএমএমইউ ও কোয়ান্টাম ল্যাবের লাইভ সেন্সর' : 'Live sensor data aggregated from major hospital blood vaults'}
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {language === 'bn' ? 'লাইভ সিঙ্ক' : 'Live Synced'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { group: 'O-', stock: 68, demand: 14, status: 'CRITICAL', color: 'bg-red-500', note: 'অতি স্বল্প' },
                  { group: 'AB-', stock: 92, demand: 8, status: 'LOW', color: 'bg-amber-500', note: 'স্বল্প' },
                  { group: 'A-', stock: 110, demand: 6, status: 'MODERATE', color: 'bg-yellow-500', note: 'মাঝারি' },
                  { group: 'B-', stock: 125, demand: 9, status: 'MODERATE', color: 'bg-yellow-500', note: 'মাঝারি' },
                  { group: 'O+', stock: 890, demand: 28, status: 'HEALTHY', color: 'bg-emerald-500', note: 'পর্যাপ্ত' },
                  { group: 'A+', stock: 740, demand: 18, status: 'HEALTHY', color: 'bg-emerald-500', note: 'পর্যাপ্ত' },
                  { group: 'B+', stock: 960, demand: 22, status: 'HEALTHY', color: 'bg-emerald-500', note: 'পর্যাপ্ত' },
                  { group: 'AB+', stock: 410, demand: 7, status: 'HEALTHY', color: 'bg-emerald-500', note: 'পর্যাপ্ত' },
                ].map((item) => (
                  <div key={item.group} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-black text-slate-900">{item.group}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold text-white ${item.color}`}>
                        {language === 'bn' ? item.note : item.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1.5 font-medium">
                      <span>{language === 'bn' ? 'মজুত ব্যাগ:' : 'Stock:'} <strong>{item.stock}</strong></span>
                      <span className="text-red-600 font-bold">{language === 'bn' ? 'চাহিদা:' : 'Req:'} {item.demand}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full ${item.color}`}
                        style={{ width: `${Math.min(100, (item.stock / 1000) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Emergency Actions & Shortage Callouts */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-amber-500">warning</span>
                  <span>{language === 'bn' ? 'জরুরি রক্তের ঘাটতি সতর্কতা' : 'Urgent Shortage Alerts'}</span>
                </h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  {language === 'bn' 
                    ? 'আইসিইউ ও জরুরি বিভাগে ও-নেগেটিভ ও এবি-নেগেটিভ রক্তের চরম সংকট রয়েছে।' 
                    : 'Critical shortage of rare Rh-negative units across Dhaka Central ICU facilities.'}
                </p>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900">
                    <strong className="block text-red-700 font-bold mb-0.5">DMCH ICU Bed 14</strong>
                    <span>{language === 'bn' ? 'ও-নেগেটিভ রক্ত অতি জরুরি (২ ব্যাগ প্রয়োজন)' : 'O- Negative required immediately (2 Bags)'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <strong className="block text-amber-700 font-bold mb-0.5">National Heart Foundation</strong>
                    <span>{language === 'bn' ? 'এবি-নেগেটিভ বাইপাস সার্জারি (৩ ব্যাগ প্রয়োজন)' : 'AB- Negative Coronary Bypass (3 Bags)'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setActiveTab('requests');
                    setBloodFilter('O-');
                    sound.playTap();
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-base">filter_list</span>
                  <span>{language === 'bn' ? 'ও-নেগেটিভ রিকোয়েস্ট ম্যানেজ করুন' : 'Manage O- Negative Requests'}</span>
                </button>
                <button
                  onClick={() => onNavigate('hospital-org')}
                  className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border border-red-200"
                >
                  <span className="material-symbols-outlined text-base">account_balance</span>
                  <span>{language === 'bn' ? 'হাসপাতাল স্টক পোর্টালে যান' : 'Open Hospital Stocks Hub'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DONOR REGISTRY MANAGEMENT */}
      {activeTab === 'donors' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col gap-5">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">groups</span>
                <span>{language === 'bn' ? 'রক্তদাতা রেজিস্ট্রি ও ভেরিফিকেশন ব্যবস্থাপনা' : 'Donor Registry & Verification Desk'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'bn' 
                  ? 'নিবন্ধিত রক্তদাতাদের প্রোফাইল, এনআইডি ও রেড ক্রিসেন্ট ভেরিফিকেশন এবং প্রাপ্যতা কন্ট্রোল।' 
                  : 'Manage donor rosters, verify NID and BDRCS credentials, and toggle emergency standby status.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('donor-register')}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                <span>{language === 'bn' ? 'নতুন ডোনার যোগ করুন' : 'Add New Donor'}</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'bn' ? 'নাম, এলাকা বা ফোন নম্বর লিখুন...' : 'Search name, area, phone...'}
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
              />
            </div>

            <div>
              <select
                value={bloodFilter}
                onChange={(e) => setBloodFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="ALL">{language === 'bn' ? 'সকল রক্তের গ্রুপ' : 'All Blood Groups'}</option>
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="ALL">{language === 'bn' ? 'সকল স্ট্যাটাস' : 'All Statuses'}</option>
                <option value="AVAILABLE">{language === 'bn' ? 'বর্তমানে প্রস্তুত' : 'Available & Ready'}</option>
                <option value="VERIFIED">{language === 'bn' ? 'বিডিআরসিএস ভেরিফাইড' : 'BDRCS Verified'}</option>
                <option value="RESTING">{language === 'bn' ? 'বিশ্রামে আছেন' : 'Resting Cooldown'}</option>
              </select>
            </div>
          </div>

          {/* Donors Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">{language === 'bn' ? 'রক্তদাতা' : 'Donor Profile'}</th>
                  <th className="px-3 py-3 text-center">{language === 'bn' ? 'গ্রুপ' : 'Blood'}</th>
                  <th className="px-3 py-3">{language === 'bn' ? 'এলাকা ও বিভাগ' : 'Location'}</th>
                  <th className="px-3 py-3 text-center">{language === 'bn' ? 'রক্তদান সংখ্যা' : 'Donations'}</th>
                  <th className="px-3 py-3">{language === 'bn' ? 'ভেরিফিকেশন' : 'Verification'}</th>
                  <th className="px-3 py-3">{language === 'bn' ? 'প্রাপ্যতা' : 'Availability'}</th>
                  <th className="px-4 py-3 text-right">{language === 'bn' ? 'অ্যাকশন' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredDonors.map((donor) => (
                  <tr key={donor.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={donor.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                          alt={donor.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <span className="font-extrabold text-slate-900 block">{donor.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{donor.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-red-100 text-red-800 font-black text-xs">
                        {donor.bloodGroup}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-semibold block">{donor.location}</span>
                      <span className="text-[11px] text-slate-500">{donor.division}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-black text-slate-900">{donor.donationCount} বার</span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleToggleVerifyDonor(donor.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                          donor.isBdrcsVerified
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {donor.isBdrcsVerified ? 'verified' : 'pending'}
                        </span>
                        <span>{donor.isBdrcsVerified ? (language === 'bn' ? 'ভেরিফাইড' : 'Verified') : (language === 'bn' ? 'পেন্ডিং' : 'Unverified')}</span>
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleToggleDonorAvailability(donor.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                          donor.isAvailable
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>{donor.isAvailable ? (language === 'bn' ? 'সক্রিয়' : 'Available') : (language === 'bn' ? 'স্থগিত' : 'Resting')}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedDonor(donor)}
                          title="View Donor Dossier"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">visibility</span>
                        </button>
                        <button
                          onClick={() => {
                            sound.playSuccessTone();
                            showToast(
                              language === 'bn'
                                ? `${donor.name}-এর কাছে জরুরি এসএমএস পিং পাঠানো হয়েছে।`
                                : `Emergency SMS dispatched to ${donor.name}.`
                            );
                          }}
                          title="Send Emergency Ping"
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">sms</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BLOOD REQUEST MANAGEMENT */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">emergency</span>
                <span>{language === 'bn' ? 'রক্তের রিকোয়েস্ট ও ব্রডকাস্ট পর্যবেক্ষণ' : 'Blood Request Management & Triage'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'bn' 
                  ? 'রোগীর তথ্য, ডাক্তারের রিকুইজিশন যাচাই এবং স্ট্যাটাস (পেন্ডিং, ডোনার প্রাপ্ত, সম্পন্ন, বাতিল) নির্ধারণ করুন।' 
                  : 'Track and verify clinical requisitions, change triage priority, and supervise request lifecycle.'}
              </p>
            </div>

            <button
              onClick={() => onNavigate('create-sos')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              <span>{language === 'bn' ? 'নতুন রিকোয়েস্ট পোস্ট করুন' : 'Post Blood Request'}</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'bn' ? 'রোগী, হাসপাতাল বা আইডি...' : 'Search patient, hospital, ID...'}
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
              />
            </div>

            <div>
              <select
                value={bloodFilter}
                onChange={(e) => setBloodFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="ALL">{language === 'bn' ? 'সকল রক্তের গ্রুপ' : 'All Blood Groups'}</option>
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="ALL">{language === 'bn' ? 'সকল স্ট্যাটাস' : 'All Statuses'}</option>
                <option value="pending">{language === 'bn' ? 'অপেক্ষারত (Pending)' : 'Pending'}</option>
                <option value="donor_found">{language === 'bn' ? 'ডোনার পাওয়া গেছে (Donor Found)' : 'Donor Found'}</option>
                <option value="completed">{language === 'bn' ? 'সম্পন্ন (Completed)' : 'Completed'}</option>
                <option value="cancelled">{language === 'bn' ? 'বাতিল (Cancelled)' : 'Cancelled'}</option>
              </select>
            </div>
          </div>

          {/* Request Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRequests.map((req) => (
              <div 
                key={req.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-red-300 hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-[11px] font-bold text-slate-500">{req.id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      req.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      req.status === 'donor_found' ? 'bg-blue-100 text-blue-800' :
                      req.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {req.status === 'pending' ? (language === 'bn' ? 'অপেক্ষারত' : 'Pending') :
                       req.status === 'donor_found' ? (language === 'bn' ? 'ডোনার প্রস্তুত' : 'Donor Found') :
                       req.status === 'completed' ? (language === 'bn' ? 'রক্তদান সম্পন্ন' : 'Completed') :
                       (language === 'bn' ? 'বাতিল' : 'Cancelled')}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-black text-slate-900 text-base">{req.patientName}</h4>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">{req.condition}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex flex-col items-center justify-center font-black border border-red-200 shrink-0">
                      <span className="text-sm">{req.bloodGroup}</span>
                      <span className="text-[9px] text-red-700 font-bold">{req.bagsRequired} {language === 'bn' ? 'ব্যাগ' : 'Bags'}</span>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base">local_hospital</span>
                      <span className="font-semibold">{req.hospital} ({req.wardBed})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base">call</span>
                      <span>{language === 'bn' ? 'স্বজন:' : 'Attendant:'} <strong>{req.attendantName} ({req.attendantPhone})</strong></span>
                    </div>
                    {req.doctorName && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="material-symbols-outlined text-emerald-600 text-sm">verified_user</span>
                        <span>{req.doctorName} • {req.bmdcReg}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Toggle & Slip Inspection Buttons */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => onOpenRequisition(req)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">prescriptions</span>
                    <span>{language === 'bn' ? 'ডাক্তার স্লিপ' : 'Doctor Slip'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {req.status !== 'donor_found' && req.status !== 'completed' && (
                      <button
                        onClick={() => handleUpdateRequestStatus(req.id, 'donor_found')}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold cursor-pointer"
                      >
                        {language === 'bn' ? 'ডোনার এসাইন' : 'Assign'}
                      </button>
                    )}
                    {req.status !== 'completed' && (
                      <button
                        onClick={() => handleUpdateRequestStatus(req.id, 'completed')}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold cursor-pointer"
                      >
                        {language === 'bn' ? 'সম্পন্ন করুন' : 'Complete'}
                      </button>
                    )}
                    {req.status !== 'cancelled' && (
                      <button
                        onClick={() => handleUpdateRequestStatus(req.id, 'cancelled')}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold cursor-pointer"
                      >
                        {language === 'bn' ? 'বাতিল' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: HOSPITAL & ORGANIZATION VERIFICATION */}
      {activeTab === 'hospitals' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">local_hospital</span>
                <span>{language === 'bn' ? 'হাসপাতাল ও স্বেচ্ছাসেবী সংস্থা যাচাইকরণ ডেস্ক' : 'Hospital & Organization Verification Desk'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'bn' 
                  ? 'ডিজিএইচএস অনুমোদিত ব্লাড ব্যাংক ও স্বেচ্ছাসেবী ক্লাব (সন্ধানী, বাঁধন, কোয়ান্টাম) এর অডিট ও অনুমোদন ব্যবস্থাপনা।' 
                  : 'Verify government hospitals, private trauma centers, voluntary student networks, and blood bank licenses.'}
              </p>
            </div>

            <button
              onClick={() => onNavigate('hospital-org')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-base">open_in_new</span>
              <span>{language === 'bn' ? 'হাসপাতাল পোর্টাল খুলুন' : 'Open Hospital Portal'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hospitals.map((hosp) => (
              <div 
                key={hosp.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-slate-100 text-slate-600">
                      {hosp.shortCode}
                    </span>
                    <button
                      onClick={() => handleToggleHospitalVerification(hosp.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase cursor-pointer ${
                        hosp.isVerified
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">
                        {hosp.isVerified ? 'verified' : 'pending'}
                      </span>
                      <span>{hosp.isVerified ? (language === 'bn' ? 'অনুমোদিত' : 'Verified') : (language === 'bn' ? 'অপেক্ষারত' : 'Unverified')}</span>
                    </button>
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{hosp.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1">{hosp.address}</p>

                  <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{language === 'bn' ? 'লাইসেন্স নম্বর:' : 'DGHS License:'}</span>
                      <span className="font-mono font-bold text-slate-800">{hosp.licenseNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{language === 'bn' ? 'পরিচালক / ইনচার্জ:' : 'In-Charge:'}</span>
                      <span className="font-semibold text-slate-800">{hosp.directorName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{language === 'bn' ? 'উপলব্ধ রক্ত মজুত:' : 'Available Bags:'}</span>
                      <span className="font-black text-red-600">{hosp.availableBags} {language === 'bn' ? 'ব্যাগ' : 'Bags'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500">{language === 'bn' ? 'কোল্ড স্টোরেজ তাপমাত্রা:' : 'Cold Storage:'}</span>
                      <span className="font-mono font-bold text-emerald-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {hosp.coldStorageTempC}°C
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {language === 'bn' ? 'অডিট:' : 'Audited:'} {hosp.lastAuditDate}
                  </span>
                  <a
                    href={`tel:${hosp.emergencyContact}`}
                    className="font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">call</span>
                    <span>{language === 'bn' ? 'হটলাইন' : 'Hotline'}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: ANTI-FRAUD & BLACKLIST DESK */}
      {activeTab === 'fraud' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-600">gavel</span>
              <span>{language === 'bn' ? 'দালাল চক্র ও প্রতারণা প্রতিরোধ সেল' : 'Anti-Broker & Syndicate Defense Desk'}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'bn'
                ? 'রক্ত বিক্রয়কারী দালাল, ভুয়া কল এবং প্রতারকদের স্থায়ীভাবে জাতীয় এসএমএস গেটওয়ে ও এনআইডি ব্লকলিস্টে রাখুন।'
                : 'Intercept illegal blood broker syndicates, extortion calls, and synthetic bot swarms targeting emergency donor queues.'}
            </p>
          </div>

          <div className="space-y-4">
            {fraudList.map((incident) => (
              <div 
                key={incident.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black text-[10px] uppercase">
                      {incident.severity} SEVERITY
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">{incident.id}</span>
                    <span className="text-xs text-slate-400">• {incident.reportedAgo}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      incident.status === 'banned' ? 'bg-red-600 text-white' :
                      incident.status === 'dismissed' ? 'bg-slate-200 text-slate-700' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {incident.status.toUpperCase()}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-sm">{incident.type}: {incident.location}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{incident.description}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-500 font-mono">
                    <span>Target: <strong>{incident.targetEntity}</strong></span>
                    <span>Carrier: <strong>{incident.carrierInfo}</strong></span>
                    <span>Evidence: <strong>{incident.evidence}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {incident.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleResolveFraud(incident.id, 'banned')}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">block</span>
                        <span>{language === 'bn' ? 'স্থায়ীভাবে ব্যান করুন' : 'Blacklist Entity'}</span>
                      </button>
                      <button
                        onClick={() => handleResolveFraud(incident.id, 'dismissed')}
                        className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                      >
                        {language === 'bn' ? 'খারিজ' : 'Dismiss'}
                      </button>
                    </>
                  )}
                  {incident.status === 'banned' && (
                    <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">verified</span>
                      <span>Permanently Blocked on DGHS</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: SMS GATEWAYS & AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-slate-950 text-slate-200 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col gap-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-black text-white text-sm">
                {language === 'bn' ? 'ডিজিএইচএস মাল্টি-ক্যারিয়ার টেলিকম গেটওয়ে ও অডিট লগ' : 'DGHS Telecom SMS Gateways & Real-Time Audit Trail'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Throughput: 1,840 SMS/sec</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-2">
            {[
              { name: 'Grameenphone (GP-SMS-E01)', latency: '42ms', status: 'ONLINE 100%' },
              { name: 'Banglalink (BL-ALRT-GW)', latency: '58ms', status: 'ONLINE 99.9%' },
              { name: 'Robi / Airtel (R-PUSH-02)', latency: '61ms', status: 'ONLINE 99.8%' },
              { name: 'Teletalk Emergency (TT-999)', latency: '35ms', status: 'ONLINE 100%' }
            ].map(gw => (
              <div key={gw.name} className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">{gw.name}</span>
                <span className="text-emerald-400 font-bold block mt-1">{gw.status}</span>
                <span className="text-[10px] text-slate-500">Latency: {gw.latency}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800/80 space-y-2 max-h-72 overflow-y-auto">
            <div className="text-slate-400">[10:24:18] <span className="text-emerald-400">[GP-SMS]</span> Broadcast payload dispatched to 42 donors within 2.5km cluster for REQ-1092 (O-).</div>
            <div className="text-slate-400">[10:23:45] <span className="text-cyan-400">[BDRCS-AUTH]</span> Donor profile DON-01 verified with National ID biometric record.</div>
            <div className="text-slate-400">[10:21:02] <span className="text-amber-400">[AUDIT-WARN]</span> Mitford Hospital Chiller Unit B-04 reported minor temperature variance (4.1°C). Re-calibrated.</div>
            <div className="text-slate-400">[10:18:30] <span className="text-red-400">[SECURITY-BLOCK]</span> Automated bot spam from IP 103.114.*** throttled at firewall edge.</div>
            <div className="text-slate-400">[10:14:12] <span className="text-emerald-400">[HANDSHAKE]</span> OTP #4921 confirmed for REQ-8942 between Donor Tanvir Ahmed and DMCH Ward Bed 14A.</div>
          </div>
        </div>
      )}

      {/* Donor Dossier Modal */}
      {selectedDonor && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">badge</span>
                <span>{language === 'bn' ? 'রক্তদাতার পূর্ণাঙ্গ ফাইল' : 'Donor Full Dossier'}</span>
              </h3>
              <button 
                onClick={() => setSelectedDonor(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl mb-4">
              <img
                src={selectedDonor.avatarUrl}
                alt={selectedDonor.name}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-300 shadow-xs"
              />
              <div>
                <h4 className="font-black text-slate-900 text-base">{selectedDonor.name}</h4>
                <p className="text-xs text-slate-500 font-medium">{selectedDonor.location}, {selectedDonor.division}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-red-100 text-red-800 font-black text-xs">
                  Blood Group: {selectedDonor.bloodGroup} (Rh {selectedDonor.rhType})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block text-[11px]">{language === 'bn' ? 'বয়স ও ওজন:' : 'Age & Weight:'}</span>
                <span className="font-bold text-slate-800">{selectedDonor.age} yrs • {selectedDonor.weightKg} kg</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block text-[11px]">{language === 'bn' ? 'হিমোগ্লোবিন স্তর:' : 'Hemoglobin:'}</span>
                <span className="font-bold text-emerald-600">{selectedDonor.hbLevel} g/dL (Optimal)</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block text-[11px]">{language === 'bn' ? 'রক্তদান সংখ্যা:' : 'Total Donations:'}</span>
                <span className="font-bold text-slate-800">{selectedDonor.donationCount} Times Verified</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block text-[11px]">{language === 'bn' ? 'শেষ রক্তদানের সময়:' : 'Last Donation:'}</span>
                <span className="font-bold text-slate-800">{selectedDonor.daysElapsedSinceDonation} days ago</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 mb-5">
              <span className="font-bold block mb-1">BDRCS & Clinical Serology:</span>
              <span>HIV 1/2: Negative • Hep B/C: Negative • Syphilis: Negative • Malaria: Negative</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  handleToggleVerifyDonor(selectedDonor.id);
                  setSelectedDonor(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                {selectedDonor.isBdrcsVerified ? (language === 'bn' ? 'ভেরিফিকেশন স্থগিত' : 'Revoke Verification') : (language === 'bn' ? 'অনুমোদন দিন' : 'Grant Verified Badge')}
              </button>
              <button
                onClick={() => setSelectedDonor(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
