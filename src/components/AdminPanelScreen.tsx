import React, { useState, useEffect } from 'react';
import { ScreenId, EmergencyDemand, Donor, HospitalOrganization, BloodRequest, FraudIncident, BloodGroup } from '../types/blood';
import { INITIAL_DONORS, SAMPLE_HOSPITAL_ORGS, INITIAL_BLOOD_REQUESTS, FRAUD_INCIDENTS } from '../data/mockData';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';
import { useAlert } from '../context/AlertContext';

interface AdminPanelScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenRequisition: (demand: any) => void;
}

type AdminTab = 'overview' | 'alerts' | 'donors' | 'requests' | 'hospitals' | 'fraud' | 'logs';

export const AdminPanelScreen: React.FC<AdminPanelScreenProps> = ({
  onNavigate,
  onOpenRequisition
}) => {
  const { language, toggleLanguage } = useLanguage();
  const {
    criticalAlert,
    emergencyRadius,
    updateCriticalAlert,
    updateEmergencyRadius,
    resetAlertDefaults,
    getActiveAlertText,
    getActiveRadiusText,
  } = useAlert();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bloodFilter, setBloodFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Emergency Alert Form State
  const [alertHospital, setAlertHospital] = useState(criticalAlert.hospital);
  const [alertBed, setAlertBed] = useState(criticalAlert.bed);
  const [alertBlood, setAlertBlood] = useState(criticalAlert.bloodGroup);
  const [alertBags, setAlertBags] = useState(criticalAlert.bags);
  const [alertUrgency, setAlertUrgency] = useState(criticalAlert.urgency);
  const [alertCustomBn, setAlertCustomBn] = useState(criticalAlert.customMessageBn || '');
  const [alertCustomEn, setAlertCustomEn] = useState(criticalAlert.customMessageEn || '');
  const [alertIsActive, setAlertIsActive] = useState(criticalAlert.isActive);

  // Emergency Radius Form State
  const [radiusZone, setRadiusZone] = useState(emergencyRadius.zone);
  const [radiusKm, setRadiusKm] = useState(emergencyRadius.radiusKm);
  const [radiusCount, setRadiusCount] = useState(emergencyRadius.requestCount);
  const [radiusHospitals, setRadiusHospitals] = useState(emergencyRadius.hospitals);
  const [radiusCustomBn, setRadiusCustomBn] = useState(emergencyRadius.customTextBn || '');
  const [radiusCustomEn, setRadiusCustomEn] = useState(emergencyRadius.customTextEn || '');
  const [radiusIsActive, setRadiusIsActive] = useState(emergencyRadius.isActive);

  // Sync state if context changes externally
  useEffect(() => {
    setAlertHospital(criticalAlert.hospital);
    setAlertBed(criticalAlert.bed);
    setAlertBlood(criticalAlert.bloodGroup);
    setAlertBags(criticalAlert.bags);
    setAlertUrgency(criticalAlert.urgency);
    setAlertCustomBn(criticalAlert.customMessageBn || '');
    setAlertCustomEn(criticalAlert.customMessageEn || '');
    setAlertIsActive(criticalAlert.isActive);
  }, [criticalAlert]);

  useEffect(() => {
    setRadiusZone(emergencyRadius.zone);
    setRadiusKm(emergencyRadius.radiusKm);
    setRadiusCount(emergencyRadius.requestCount);
    setRadiusHospitals(emergencyRadius.hospitals);
    setRadiusCustomBn(emergencyRadius.customTextBn || '');
    setRadiusCustomEn(emergencyRadius.customTextEn || '');
    setRadiusIsActive(emergencyRadius.isActive);
  }, [emergencyRadius]);

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

  const navTabs: { id: AdminTab; label: string; icon: string; count?: number; badgeColor?: string; description?: string }[] = [
    { 
      id: 'overview', 
      label: language === 'bn' ? 'ড্যাশবোর্ড ওভারভিউ' : 'Overview & Analytics', 
      icon: 'dashboard',
      description: language === 'bn' ? 'সিস্টেম কেপিআই, রক্তের চাহিদা পরিসংখ্যান ও রিয়েলটাইম সতর্কতা' : 'System KPI, Telemetry & Real-Time Alert Stream'
    },
    { 
      id: 'alerts', 
      label: language === 'bn' ? 'জরুরি সতর্কতা ও ব্যাসার্ধ' : 'Alerts & Radius Control', 
      icon: 'crisis_alert',
      count: emergencyRadius.requestCount,
      badgeColor: 'bg-red-600 text-white font-black animate-pulse',
      description: language === 'bn' ? 'জরুরি সতর্কতা (হেডার ব্যানার) ও জরুরি ব্যাসার্ধ (রেডিয়াস ডিসপ্যাচ) সরাসরি পরিবর্তন ও ব্রডকাস্ট' : 'Live management of Critical Alert Banner and Emergency Radius Dispatch'
    },
    { 
      id: 'donors', 
      label: language === 'bn' ? 'ডোনার রেজিস্ট্রি' : 'Donor Registry', 
      icon: 'groups', 
      count: donors.length,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      description: language === 'bn' ? 'রক্তদাতা প্রোফাইল নিরীক্ষা, বিডিআরসিএস ও এনআইডি ভেরিফিকেশন' : 'Donor Profiles, Clinical Serology & BDRCS Verification'
    },
    { 
      id: 'requests', 
      label: language === 'bn' ? 'রক্তের রিকোয়েস্ট' : 'Blood Requests Desk', 
      icon: 'emergency', 
      count: requests.filter(r => r.status === 'pending').length,
      badgeColor: 'bg-red-600 text-white',
      description: language === 'bn' ? 'জরুরি রক্তের চাহিদা, কোড-রেড ট্রায়াজ ও স্ট্যাটাস ট্র্যাকিং' : 'Emergency Demand Triage, Doctor Slips & Status Progression'
    },
    { 
      id: 'hospitals', 
      label: language === 'bn' ? 'হাসপাতাল ও সংস্থা' : 'Hospitals & Blood Banks', 
      icon: 'local_hospital', 
      count: hospitals.length,
      badgeColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      description: language === 'bn' ? 'ডিজিএইচএস অনুমোদিত হাসপাতাল, ব্লাড ব্যাংক ও কোল্ড চেইন' : 'Hospital Accreditation, Blood Bags Stock & Camp Coordination'
    },
    { 
      id: 'fraud', 
      label: language === 'bn' ? 'দালাল চক্র প্রতিরোধ' : 'Anti-Fraud & Syndicates', 
      icon: 'gavel', 
      count: fraudList.filter(f => f.status === 'pending').length,
      badgeColor: 'bg-amber-500 text-black font-black',
      description: language === 'bn' ? 'রক্ত কেনাবেচা ও দালাল চক্রের রিপোর্ট তদন্ত ও জাতীয় ব্লকলিস্ট' : 'Syndicate Interception, Blacklist & Cyber Crime Investigation'
    },
    { 
      id: 'logs', 
      label: language === 'bn' ? 'এসএমএস ও সিস্টেম অডিট' : 'Audit Logs & SMS', 
      icon: 'terminal',
      description: language === 'bn' ? 'টেলকো এসএমএস গেটওয়ে, ওটিপি হ্যান্ডশেক ও সার্ভার নিরাপত্তা লগ' : 'Telco SMS Gateway, OTP Handshake Verification & Audit Trail'
    },
  ];

  const publicLinks: { id: ScreenId; label: string; icon: string }[] = [
    { id: 'emergency-hub', label: language === 'bn' ? 'জরুরি হাব' : 'Emergency Hub', icon: 'emergency' },
    { id: 'donor-directory', label: language === 'bn' ? 'রক্তদাতা খুঁজুন' : 'Find Donors', icon: 'person_search' },
    { id: 'create-sos', label: language === 'bn' ? 'রক্তের SOS রিকোয়েস্ট' : 'Create SOS', icon: 'add_alert' },
    { id: 'request-tracking', label: language === 'bn' ? 'রিকোয়েস্ট ট্র্যাকিং' : 'Request Tracking', icon: 'timeline' },
    { id: 'hospital-org', label: language === 'bn' ? 'হাসপাতাল ও সংস্থা' : 'Hospitals & Orgs', icon: 'domain' },
    { id: 'donor-passport', label: language === 'bn' ? 'ডোনার পাসপোর্ট' : 'Donor Passport', icon: 'badge' },
    { id: 'pitch-deck', label: language === 'bn' ? 'প্রজেক্ট প্রপোজাল' : 'Project Proposal', icon: 'slideshow' },
  ];

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
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

      {/* Top Bar 1: Sliding Emergency Marquee */}
      <div className="bg-red-950 text-red-200 border-b border-red-900/60 px-4 py-2 overflow-hidden flex items-center gap-3 text-xs font-bold shrink-0">
        <div className="flex items-center gap-1.5 shrink-0 bg-red-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
          <span className="material-symbols-outlined text-xs">crisis_alert</span>
          <span>{language === 'bn' ? 'জরুরি লাইভ অ্যালার্ট' : 'LIVE ALERT'}</span>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="inline-block whitespace-nowrap animate-marquee">
            <span>
              {getActiveAlertText(language)} • <span className="text-amber-400 font-extrabold">{language === 'bn' ? 'জরুরি ব্যাসার্ধ: ' : 'Emergency Radius: '}</span>{getActiveRadiusText(language)} • {language === 'bn' ? 'সেন্ট্রাল টেলিমেট্রি নোড সক্রিয় • হেল্পলাইন: ১৬২৬৩ / ৯৯৯' : 'Central Telemetry Node Active • 24/7 Helpline: 16263'}
            </span>
          </div>
        </div>
      </div>

      {/* Top Bar 2: Admin Top Header Navbar */}
      <header className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile Sidebar Hamburger Toggle */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer shadow-md shadow-red-600/30"
            title="Open Admin Sidebar"
          >
            <span className="material-symbols-outlined text-xl">menu</span>
          </button>

          {/* Admin Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white shadow-lg shadow-red-600/40 border border-red-500/30">
              <span className="material-symbols-outlined text-xl">shield_person</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-tight text-white">
                  {language === 'bn' ? 'ব্লাড লাগবে?' : 'Blood Lagbe?'}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-red-600 text-[9px] font-black text-white uppercase tracking-wider">
                  ADMIN
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block">
                {language === 'bn' ? 'সেন্ট্রাল অ্যাডমিন ও কমান্ড সেন্টার' : 'National Command & Admin Console'}
              </span>
            </div>
          </div>
        </div>

        {/* Global Search input (desktop) */}
        <div className="hidden md:flex items-center max-w-md w-full mx-4">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'bn' ? 'ডোনার, রোগী, হাসপাতাল বা এনআইডি খুঁজুন...' : 'Search donors, requests, hospitals, NID...'}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Right Top Actions */}
        <div className="flex items-center gap-2.5">
          {/* Back to Public Site button */}
          <button
            onClick={() => {
              sound.playTap();
              onNavigate('emergency-hub');
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Return to Public Website"
          >
            <span className="material-symbols-outlined text-base text-red-400">public</span>
            <span className="hidden sm:inline">{language === 'bn' ? 'পাবলিক সাইট' : 'Public Site'}</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => {
              sound.playTap();
              toggleLanguage();
            }}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold cursor-pointer transition-colors"
            title="Switch Language"
          >
            {language === 'bn' ? '🇺🇸 ENG' : '🇧🇩 বাংলা'}
          </button>

          {/* Trigger Red Alert */}
          <button
            onClick={() => {
              sound.playSosSiren();
              showToast(
                language === 'bn'
                  ? 'দেশব্যাপী সমন্বয়কারীদের কাছে জরুরি রেড অ্যালার্ট জারি করা হয়েছে!'
                  : 'Emergency Red Alert dispatched to all standby coordinators!'
              );
            }}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1 shadow-md shadow-red-600/30 cursor-pointer active:scale-95 transition-all"
            title="Broadcast Emergency Red Alert"
          >
            <span className="material-symbols-outlined text-sm animate-pulse">campaign</span>
            <span className="hidden sm:inline">{language === 'bn' ? 'রেড অ্যালার্ট' : 'SOS Broadcast'}</span>
          </button>

          {/* Admin User Avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=80"
                alt="Admin"
                className="w-8 h-8 rounded-xl object-cover border border-slate-700"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-950 rounded-full" />
            </div>
            <div className="hidden xl:block text-left">
              <span className="text-xs font-bold text-white block leading-tight">
                {language === 'bn' ? 'ডা. শাহরিয়ার রহমান' : 'Dr. Shahriar Rahman'}
              </span>
              <span className="text-[10px] text-slate-400 block leading-tight">
                Super Admin
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Two-Column Body: Left Sidebar + Right Workspace */}
      <div className="flex-1 flex w-full relative">
        
        {/* Mobile Backdrop */}
        {isMobileSidebarOpen && (
          <div 
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 lg:hidden animate-in fade-in"
          />
        )}

        {/* ================= DEDICATED FULL-HEIGHT ADMIN SIDEBAR ================= */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 text-white p-5 border-r border-slate-800 shadow-2xl flex flex-col justify-between transition-transform duration-300 overflow-y-auto
          lg:static lg:w-72 lg:translate-x-0 lg:z-auto lg:shrink-0 lg:sticky lg:top-[98px] lg:h-[calc(100vh-98px)]
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex flex-col gap-5">
            {/* Sidebar Brand Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-red-600/30 text-red-400 text-[10px] font-black tracking-wider uppercase border border-red-500/40">
                  DGHS & BDRCS PROTOCOL v4.5
                </span>
              </div>

              {/* Close button on mobile */}
              <button 
                onClick={() => setIsMobileSidebarOpen(false)}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Protocol & Health Box */}
            <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[11px] font-bold text-slate-200">
                  {language === 'bn' ? 'সিস্টেম সক্রিয় (DHAKA NODE)' : 'System Active (DHAKA NODE)'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">100% UP</span>
            </div>

            {/* Section 1: Main Admin Modules */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-3 mb-1">
                {language === 'bn' ? 'অ্যাডমিন ডেস্ক মেনু' : 'ADMIN DESK'}
              </span>

              {navTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileSidebarOpen(false);
                      sound.playTap();
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between group cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/80 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`material-symbols-outlined text-lg transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-red-400'
                      }`}>
                        {tab.icon}
                      </span>
                      <span className="truncate">{tab.label}</span>
                    </div>

                    {tab.count !== undefined && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ml-2 shrink-0 ${
                        isActive 
                          ? 'bg-white text-red-600' 
                          : (tab.badgeColor || 'bg-slate-800 text-slate-300')
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Section 2: Jump to Public Modules */}
            <div className="flex flex-col gap-1 border-t border-slate-800/80 pt-4">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-3 mb-1">
                {language === 'bn' ? 'পাবলিক মডিউল সমূহ' : 'PUBLIC MODULES'}
              </span>

              {publicLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => {
                    sound.playTap();
                    onNavigate(link.id);
                  }}
                  className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900/60 transition-all flex items-center gap-2.5 cursor-pointer group"
                >
                  <span className="material-symbols-outlined text-base text-slate-500 group-hover:text-red-400">
                    {link.icon}
                  </span>
                  <span className="truncate">{link.label}</span>
                </button>
              ))}
            </div>

            {/* Quick Live Telemetry in Sidebar */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                {language === 'bn' ? 'সরাসরি মেট্রিক্স' : 'LIVE TELEMETRY'}
              </span>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">
                    {language === 'bn' ? 'সক্রিয় ডোনার' : 'Active Donors'}
                  </span>
                  <span className="text-sm font-black text-emerald-400">
                    {donors.filter(d => d.isAvailable).length}
                  </span>
                </div>
                <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">
                    {language === 'bn' ? 'পেন্ডিং রিকোয়েস্ট' : 'Pending'}
                  </span>
                  <span className="text-sm font-black text-red-400">
                    {requests.filter(r => r.status === 'pending').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions inside Sidebar */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  sound.playSosSiren();
                  showToast(
                    language === 'bn'
                      ? 'দেশব্যাপী সমন্বয়কারীদের কাছে জরুরি রেড অ্যালার্ট জারি করা হয়েছে!'
                      : 'Emergency Red Alert dispatched to all standby coordinators!'
                  );
                }}
                className="w-full py-2.5 px-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-base animate-pulse">campaign</span>
                <span>{language === 'bn' ? 'রেড অ্যালার্ট সম্প্রচার' : 'Broadcast Red Alert'}</span>
              </button>

              <button
                onClick={() => {
                  sound.playTap();
                  onNavigate('emergency-hub');
                }}
                className="w-full py-2 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-800 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-base">public</span>
                <span>{language === 'bn' ? 'পাবলিক পোর্টালে যান' : 'Back to Public App'}</span>
              </button>
            </div>
          </div>

          {/* Admin User Profile Card at Bottom of Sidebar */}
          <div className="pt-4 mt-6 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=80"
                  alt="Admin"
                  className="w-9 h-9 rounded-xl object-cover border border-slate-700"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-950 rounded-full" />
              </div>
              <div className="truncate">
                <span className="text-xs font-bold text-white block truncate">
                  {language === 'bn' ? 'ডা. শাহরিয়ার রহমান' : 'Dr. Shahriar Rahman'}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {language === 'bn' ? 'ন্যাশনাল অ্যাডমিন (MIS)' : 'DGHS MIS Admin'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playTap();
                showToast(
                  language === 'bn' ? 'অ্যাডমিন সেশন সুরক্ষিত ও সক্রিয় রয়েছে।' : 'Admin session authenticated and active.'
                );
              }}
              title="Session Verified"
              className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">verified_user</span>
            </button>
          </div>
        </aside>

        {/* ================= RIGHT MAIN WORKSPACE ================= */}
        <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-y-auto">
          
          {/* Header Banner inside workspace */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                    {navTabs.find(t => t.id === activeTab)?.label}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                    BDRCS VERIFIED CONSOLE
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500 text-2xl">
                    {navTabs.find(t => t.id === activeTab)?.icon}
                  </span>
                  <span>
                    {navTabs.find(t => t.id === activeTab)?.label}
                  </span>
                </h1>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  {navTabs.find(t => t.id === activeTab)?.description}
                </p>
              </div>

              {/* Quick Metrics pills in header */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-2xl text-center shadow-inner">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {language === 'bn' ? 'সক্রিয় ডোনার' : 'Active Donors'}
                  </span>
                  <span className="text-base font-black text-emerald-400">
                    {donors.filter(d => d.isAvailable).length} / {donors.length}
                  </span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-2xl text-center shadow-inner">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {language === 'bn' ? 'জরুরি পেন্ডিং' : 'Pending SOS'}
                  </span>
                  <span className="text-base font-black text-red-500">
                    {requests.filter(r => r.status === 'pending').length}
                  </span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-2xl text-center shadow-inner">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {language === 'bn' ? 'অনুমোদিত সংস্থা' : 'Approved Orgs'}
                  </span>
                  <span className="text-base font-black text-cyan-400">
                    {hospitals.filter(h => h.isVerified).length}
                  </span>
                </div>
              </div>
            </div>
          </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6">
          {/* Direct Emergency Alerts & Radius Dispatch Shortcut Banner */}
          <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 border border-red-800/80 rounded-3xl p-5 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-600/30 text-red-400 border border-red-500/40 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl animate-pulse">crisis_alert</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                    {language === 'bn' ? 'লাইভ অ্যালার্ট ও ব্যাসার্ধ নিয়ন্ত্রণ' : 'LIVE ALERT & RADIUS DISPATCH'}
                  </span>
                  <span className="text-xs font-mono font-bold text-red-300">
                    {criticalAlert.isActive ? (language === 'bn' ? '● সক্রিয়' : '● ACTIVE') : (language === 'bn' ? '○ স্থগিত' : '○ PAUSED')}
                  </span>
                </div>
                <h3 className="text-base font-black text-white mt-1">
                  {language === 'bn' ? 'জরুরি সতর্কতা ও জরুরি ব্যাসার্ধ সমন্বয় কেন্দ্র' : 'Emergency Alert & Emergency Radius Control'}
                </h3>
                <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-red-400 font-bold shrink-0">{language === 'bn' ? 'জরুরি সতর্কতা:' : 'Emergency Alert:'}</span>
                    <span className="truncate text-slate-200">{getActiveAlertText(language)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-amber-400 font-bold shrink-0">{language === 'bn' ? 'জরুরি ব্যাসার্ধ:' : 'Emergency Radius:'}</span>
                    <span className="truncate text-slate-200">{getActiveRadiusText(language)}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveTab('alerts');
                sound.playTap();
              }}
              className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-red-600/30 cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined text-base">tune</span>
              <span>{language === 'bn' ? 'সতর্কতা ও ব্যাসার্ধ এডিট করুন' : 'Configure Alerts & Radius'}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

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

      {/* TAB: EMERGENCY ALERTS & RADIUS DISPATCH (জরুরি সতর্কতা ও জরুরি ব্যাসার্ধ নিয়ন্ত্রণ) */}
      {activeTab === 'alerts' && (
        <div className="flex flex-col gap-6">
          {/* Top Banner with Quick Actions */}
          <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-900 border border-red-800/80 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-600/30 text-red-400 border border-red-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-red-600/30">
                <span className="material-symbols-outlined text-3xl animate-pulse">crisis_alert</span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                    {language === 'bn' ? 'সরাসরি ব্রডকাস্ট কন্ট্রোল' : 'LIVE BROADCAST HUB'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                    PUBLIC RIBBON & RADAR SYNC
                  </span>
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  {language === 'bn' ? 'জরুরি সতর্কতা ও জরুরি ব্যাসার্ধ সমন্বয় কেন্দ্র' : 'Emergency Alerts & Radius Dispatch Center'}
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {language === 'bn'
                    ? 'এখানে আপনি যে কোনো সময় ঢাকা ও সমগ্র বাংলাদেশের হাসপাতালগুলোর জন্য কোড-রেড জরুরি সতর্কতা এবং জরুরি ব্যাসার্ধের (Geo-Radius) তথ্য লাইভ পরিবর্তন, ব্রডকাস্ট বা বন্ধ করতে পারবেন।'
                    : 'Manage real-time critical hospital alerts displayed on the top public marquee and adjust local emergency geo-radius broadcasting in real-time.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => {
                  sound.playSosSiren();
                  showToast(language === 'bn' ? '🔊 অডিও সাইরেন টেস্ট সফলভাবে বাজানো হয়েছে!' : '🔊 Siren sound test executed!');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-2 border border-slate-700 cursor-pointer transition-all"
                title="Test Siren Audio"
              >
                <span className="material-symbols-outlined text-amber-400 text-base">volume_up</span>
                <span>{language === 'bn' ? 'সাইরেন টেস্ট' : 'Test Siren'}</span>
              </button>

              <button
                onClick={() => {
                  resetAlertDefaults();
                  sound.playTap();
                  showToast(language === 'bn' ? 'ডিফল্ট সতর্কতা ও ব্যাসার্ধ সেটিংসে রিসেট করা হয়েছে।' : 'Alert & Radius restored to factory defaults.');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs flex items-center gap-2 border border-slate-800 cursor-pointer transition-all"
                title="Reset to factory settings"
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
                <span>{language === 'bn' ? 'ডিফল্ট রিসেট' : 'Reset'}</span>
              </button>
            </div>
          </div>

          {/* Real-time Output Live Previews (How it appears to public users) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">visibility</span>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  {language === 'bn' ? 'লাইভ পাবলিক আউটপুট প্রিভিউ (ব্যবহারকারীরা যা দেখছেন)' : 'Public Live Previews (Real-Time Output)'}
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                {language === 'bn' ? '১০০% লাইভ সিঙ্ক' : '100% Live Synced'}
              </span>
            </div>

            {/* Preview 1: Header Critical Alert Ribbon */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-red-600 text-sm">campaign</span>
                  {language === 'bn' ? '১. হেডারের শীর্ষ টিকার ব্যানার (জরুরি সতর্কতা)' : '1. Top Header Marquee (Emergency Alert)'}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {criticalAlert.isActive ? (language === 'bn' ? 'স্ট্যাটাস: সক্রিয়' : 'Status: ACTIVE') : (language === 'bn' ? 'স্ট্যাটাস: নিষ্ক্রিয়' : 'Status: INACTIVE')}
                </span>
              </div>
              <div className="bg-red-600 text-white rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-3 shadow-inner overflow-hidden">
                <span className="bg-red-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs animate-pulse">emergency</span>
                  {language === 'bn' ? 'জরুরি সতর্কতা:' : 'EMERGENCY ALERT:'}
                </span>
                <span className="truncate font-medium text-red-50">
                  {getActiveAlertText(language)}
                </span>
              </div>
            </div>

            {/* Preview 2: Emergency Hub Radar Strip */}
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-500 text-sm">radar</span>
                  {language === 'bn' ? '২. এমার্জেন্সি হাব রাডার স্ট্রিপ (জরুরি ব্যাসার্ধ)' : '2. Emergency Hub Radar Strip (Emergency Radius)'}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {emergencyRadius.isActive ? (language === 'bn' ? 'স্ট্যাটাস: সক্রিয়' : 'Status: ACTIVE') : (language === 'bn' ? 'স্ট্যাটাস: নিষ্ক্রিয়' : 'Status: INACTIVE')}
                </span>
              </div>
              <div className="bg-red-700 text-white rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-3 shadow-inner overflow-hidden">
                <span className="bg-red-800 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs animate-spin" style={{ animationDuration: '3s' }}>radar</span>
                  {language === 'bn' ? 'জরুরি ব্যাসার্ধ:' : 'EMERGENCY RADIUS:'}
                </span>
                <span className="truncate font-medium text-red-50">
                  {getActiveRadiusText(language)}
                </span>
              </div>
            </div>
          </div>

          {/* Two-Column Editor: 1. Emergency Alert Form | 2. Emergency Radius Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* CARD 1: জরুরি সতর্কতা (CRITICAL EMERGENCY ALERT FORM) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between gap-6">
              <div className="flex flex-col gap-5">
                {/* Card Title & Toggle */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-xl">campaign</span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        {language === 'bn' ? 'জরুরি সতর্কতা সেটআপ' : 'Emergency Alert Setup'}
                      </h3>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {language === 'bn' ? 'পাবলিক ওয়েবসাইটের হেডার স্লাইডারে প্রদর্শিত হবে' : 'Broadcasts to top header ribbon across all pages'}
                      </span>
                    </div>
                  </div>

                  {/* Active Switch */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs font-bold text-slate-600">
                      {alertIsActive ? (language === 'bn' ? 'সক্রিয়' : 'Active') : (language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive')}
                    </span>
                    <input
                      type="checkbox"
                      checked={alertIsActive}
                      onChange={(e) => setAlertIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 relative"></div>
                  </label>
                </div>

                {/* Form Fields */}
                <div className="flex flex-col gap-4">
                  {/* Hospital Name */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {language === 'bn' ? 'হাসপাতালের নাম *' : 'Hospital Name *'}
                    </label>
                    <input
                      type="text"
                      value={alertHospital}
                      onChange={(e) => setAlertHospital(e.target.value)}
                      placeholder="e.g. ঢাকা মেডিকেল কলেজ হাসপাতাল"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-red-500 focus:bg-white transition-colors"
                    />
                    {/* Quick Hospital Chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {['ঢাকা মেডিকেল কলেজ হাসপাতাল', 'BSMMU (পিজি হাসপাতাল)', 'স্যার সলিমুল্লাহ মেডিকেল (মিটফোর্ড)', 'জাতীয় হৃদরোগ ইনস্টিটিউট (NICVD)', 'কুর্মিটোলা জেনারেল হাসপাতাল'].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setAlertHospital(h)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-[10px] font-bold text-slate-600 rounded-md transition-colors"
                        >
                          {h.split(' ')[0]}...
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bed & Ward + Bags */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {language === 'bn' ? 'আইসিইউ / বেড / ওয়ার্ড *' : 'ICU / Bed / Ward *'}
                      </label>
                      <input
                        type="text"
                        value={alertBed}
                        onChange={(e) => setAlertBed(e.target.value)}
                        placeholder="e.g. ICU বেড ১৪"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-red-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {language === 'bn' ? 'প্রয়োজনীয় রক্ত (ব্যাগ) *' : 'Quantity (Bags) *'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={alertBags}
                        onChange={(e) => setAlertBags(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-red-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Blood Group Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      {language === 'bn' ? 'রক্তের গ্রুপ নির্বাচন করুন *' : 'Select Blood Group *'}
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                      {(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as BloodGroup[]).map((bg) => {
                        const isSelected = alertBlood === bg;
                        return (
                          <button
                            key={bg}
                            type="button"
                            onClick={() => setAlertBlood(bg)}
                            className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-red-600 text-white shadow-md shadow-red-600/30 scale-105'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {bg}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Urgency Level */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      {language === 'bn' ? 'জরুরি লেভেল' : 'Urgency Severity Level'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'code_red', labelBn: 'কোড-রেড (অতি জরুরি)', labelEn: 'Code-Red (Urgent)', color: 'border-red-500 text-red-600 bg-red-50' },
                        { id: 'critical', labelBn: 'ক্রিটিক্যাল', labelEn: 'Critical', color: 'border-amber-500 text-amber-600 bg-amber-50' },
                        { id: 'urgent', labelBn: 'জরুরি', labelEn: 'Urgent', color: 'border-blue-500 text-blue-600 bg-blue-50' }
                      ].map((lvl) => {
                        const isSelected = alertUrgency === lvl.id;
                        return (
                          <button
                            key={lvl.id}
                            type="button"
                            onClick={() => setAlertUrgency(lvl.id as any)}
                            className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? `${lvl.color} ring-2 ring-red-400 font-black shadow-xs`
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {language === 'bn' ? lvl.labelBn : lvl.labelEn}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Message (Optional Override) */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {language === 'bn' ? 'কাস্টম বার্তা (বাংলা - খালি রাখলে স্বয়ংক্রিয়ভাবে তৈরি হবে)' : 'Custom Banner Message (Bangla)'}
                    </label>
                    <textarea
                      rows={2}
                      value={alertCustomBn}
                      onChange={(e) => setAlertCustomBn(e.target.value)}
                      placeholder={`${alertHospital}ে (${alertBed}) ${alertBlood} রক্ত অতি জরুরি • ${alertBags} ব্যাগ প্রয়োজন`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={() => {
                  updateCriticalAlert({
                    hospital: alertHospital,
                    bed: alertBed,
                    bloodGroup: alertBlood,
                    bags: alertBags,
                    urgency: alertUrgency,
                    customMessageBn: alertCustomBn || undefined,
                    customMessageEn: alertCustomEn || undefined,
                    isActive: alertIsActive,
                  });
                  sound.playSosSiren();
                  showToast(
                    language === 'bn'
                      ? '🚨 জরুরি সতর্কতা আপডেট করা হয়েছে এবং লাইভ ব্রডকাস্ট চালু হয়েছে!'
                      : '🚨 Emergency Alert updated and broadcasted live to all users!'
                  );
                }}
                className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer transition-all hover:scale-[1.01] active:scale-95"
              >
                <span className="material-symbols-outlined text-base animate-pulse">campaign</span>
                <span>{language === 'bn' ? 'জরুরি সতর্কতা সেভ ও ব্রডকাস্ট করুন' : 'Save & Broadcast Emergency Alert'}</span>
              </button>
            </div>


            {/* CARD 2: জরুরি ব্যাসার্ধ (EMERGENCY RADIUS & GEO-DISPATCH FORM) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between gap-6">
              <div className="flex flex-col gap-5">
                {/* Card Title & Toggle */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-xl">radar</span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        {language === 'bn' ? 'জরুরি ব্যাসার্ধ সেটআপ' : 'Emergency Radius Setup'}
                      </h3>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {language === 'bn' ? 'এমার্জেন্সি হাবের রাডার স্ট্রিপ ও জোন ডিসপ্যাচ নিয়ন্ত্রণ' : 'Controls Emergency Hub radar strip & geographic radius'}
                      </span>
                    </div>
                  </div>

                  {/* Active Switch */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs font-bold text-slate-600">
                      {radiusIsActive ? (language === 'bn' ? 'সক্রিয়' : 'Active') : (language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive')}
                    </span>
                    <input
                      type="checkbox"
                      checked={radiusIsActive}
                      onChange={(e) => setRadiusIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 relative"></div>
                  </label>
                </div>

                {/* Form Fields */}
                <div className="flex flex-col gap-4">
                  {/* Zone Name */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {language === 'bn' ? 'জোন বা অঞ্চলের নাম *' : 'Emergency Zone Name *'}
                    </label>
                    <input
                      type="text"
                      value={radiusZone}
                      onChange={(e) => setRadiusZone(e.target.value)}
                      placeholder="e.g. ঢাকা সেন্ট্রাল জোন"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    />
                    {/* Quick Zone Chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {['ঢাকা সেন্ট্রাল জোন', 'ঢাকা উত্তর জোন (মিরপুর-উত্তরা)', 'ঢাকা দক্ষিণ জোন (ধানমন্ডি-পুরান ঢাকা)', 'চট্টগ্রাম বন্দর জোন', 'সিলেট সদর জোন'].map((z) => (
                        <button
                          key={z}
                          type="button"
                          onClick={() => setRadiusZone(z)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-[10px] font-bold text-slate-600 rounded-md transition-colors"
                        >
                          {z}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Radius Slider + Number Input */}
                  <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-amber-600 text-sm">adjust</span>
                        <span>{language === 'bn' ? 'জরুরি ব্যাসার্ধের দূরত্ব (কিমি) *' : 'Emergency Radius Distance (KM) *'}</span>
                      </label>
                      <span className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shadow-xs">
                        {radiusKm} {language === 'bn' ? 'কিমি ব্যাসার্ধ' : 'KM Radius'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                      <input
                        type="range"
                        min="1"
                        max="25"
                        step="1"
                        value={radiusKm}
                        onChange={(e) => setRadiusKm(parseInt(e.target.value) || 5)}
                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={radiusKm}
                        onChange={(e) => setRadiusKm(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 bg-white border border-amber-300 rounded-xl px-2 py-1.5 text-center text-xs font-black text-amber-900"
                      />
                    </div>
                    <span className="text-[10px] text-amber-700/80 font-medium">
                      {language === 'bn' ? 'সাধারণত ঢাকা মেট্রোর জন্য ৫ কিমি এবং অন্যান্য জেলার জন্য ১০-১৫ কিমি প্রস্তাবিত।' : 'Standard: 5 km for metropolitan areas, 10-15 km for divisional districts.'}
                    </span>
                  </div>

                  {/* Urgent Requests Count & Hospitals */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {language === 'bn' ? 'জরুরি রক্তের রিকোয়েস্ট সংখ্যা *' : 'Urgent Requests Count *'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={radiusCount}
                        onChange={(e) => setRadiusCount(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {language === 'bn' ? 'অন্তর্ভুক্ত প্রধান হাসপাতালসমূহ *' : 'Key Hospitals in Radius *'}
                      </label>
                      <input
                        type="text"
                        value={radiusHospitals}
                        onChange={(e) => setRadiusHospitals(e.target.value)}
                        placeholder="e.g. DMCH, BSMMU, বারডেম"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Custom Message (Optional Override) */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {language === 'bn' ? 'কাস্টম বার্তা (বাংলা - খালি রাখলে স্বয়ংক্রিয়ভাবে তৈরি হবে)' : 'Custom Radius Text (Bangla)'}
                    </label>
                    <textarea
                      rows={2}
                      value={radiusCustomBn}
                      onChange={(e) => setRadiusCustomBn(e.target.value)}
                      placeholder={`${radiusZone}ে ${radiusKm} কিমি এর মধ্যে ${radiusCount}টি জরুরি রক্তের রিকোয়েস্ট (${radiusHospitals})`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={() => {
                  updateEmergencyRadius({
                    zone: radiusZone,
                    radiusKm: radiusKm,
                    requestCount: radiusCount,
                    hospitals: radiusHospitals,
                    customTextBn: radiusCustomBn || undefined,
                    customTextEn: radiusCustomEn || undefined,
                    isActive: radiusIsActive,
                  });
                  sound.playBeacon();
                  showToast(
                    language === 'bn'
                      ? '📡 জরুরি ব্যাসার্ধ সফলভাবে আপডেট হয়েছে এবং এমার্জেন্সি হাবে লাইভ সিঙ্ক হয়েছে!'
                      : '📡 Emergency Radius updated and synced with Emergency Hub!'
                  );
                }}
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 cursor-pointer transition-all hover:scale-[1.01] active:scale-95"
              >
                <span className="material-symbols-outlined text-base">radar</span>
                <span>{language === 'bn' ? 'জরুরি ব্যাসার্ধ আপডেট করুন' : 'Update Emergency Radius'}</span>
              </button>
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

        </div>
      </div>

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
