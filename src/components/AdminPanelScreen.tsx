import React, { useState, useEffect } from 'react';
import { ScreenId, EmergencyDemand, Donor, HospitalOrganization, BloodRequest, FraudIncident, BloodGroup } from '../types/blood';
import { INITIAL_DONORS, SAMPLE_HOSPITAL_ORGS, INITIAL_BLOOD_REQUESTS, FRAUD_INCIDENTS } from '../data/mockData';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import type { Permission } from '../lib/permissions';
import { AdminRolesPanel } from './AdminRolesPanel';

interface AdminPanelScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenRequisition: (demand: any) => void;
}

type AdminTab = 'overview' | 'alerts' | 'donors' | 'requests' | 'hospitals' | 'fraud' | 'logs' | 'access';

/** The permission each tab needs. Overview needs only `panel.open`, which anyone who reaches this screen has. */
const TAB_PERMISSION: Record<AdminTab, Permission> = {
  overview: 'panel.open',
  alerts: 'panel.alerts',
  donors: 'panel.donors',
  requests: 'panel.requests',
  hospitals: 'panel.hospitals',
  fraud: 'panel.fraud',
  logs: 'panel.logs',
  access: 'roles.manage',
};

export const AdminPanelScreen: React.FC<AdminPanelScreenProps> = ({
  onNavigate,
  onOpenRequisition
}) => {
  const { language, toggleLanguage, t } = useLanguage();
  const {
    criticalAlert,
    emergencyRadius,
    updateCriticalAlert,
    updateEmergencyRadius,
    resetAlertDefaults,
    getActiveAlertText,
    getActiveRadiusText,
  } = useAlert();
  const { can } = useAuth();

  const [selectedTab, setActiveTab] = useState<AdminTab>('overview');
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
          t.admin.toasts.donorVerifyToggled(d.name, nextState)
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
          t.admin.toasts.donorAvailabilityToggled(d.name, nextState)
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
          t.admin.toasts.requestStatusUpdated(requestId, newStatus)
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
          t.admin.toasts.hospitalVerifyUpdated(h.name)
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
        ? t.admin.toasts.fraudBanned
        : t.admin.toasts.fraudDismissed
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

  const allTabs: { id: AdminTab; label: string; icon: string; count?: number; badgeColor?: string; description?: string }[] = [
    { 
      id: 'overview', 
      label: t.admin.tabs.overview, 
      icon: 'dashboard',
      description: t.admin.tabs.overviewDesc
    },
    { 
      id: 'alerts', 
      label: t.admin.tabs.alerts, 
      icon: 'crisis_alert',
      count: emergencyRadius.requestCount,
      badgeColor: 'bg-red-600 text-white font-black animate-pulse',
      description: t.admin.tabs.alertsDesc
    },
    { 
      id: 'donors', 
      label: t.admin.tabs.donors, 
      icon: 'groups', 
      count: donors.length,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      description: t.admin.tabs.donorsDesc
    },
    { 
      id: 'requests', 
      label: t.admin.tabs.requests, 
      icon: 'emergency', 
      count: requests.filter(r => r.status === 'pending').length,
      badgeColor: 'bg-red-600 text-white',
      description: t.admin.tabs.requestsDesc
    },
    { 
      id: 'hospitals', 
      label: t.admin.tabs.hospitals, 
      icon: 'local_hospital', 
      count: hospitals.length,
      badgeColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      description: t.admin.tabs.hospitalsDesc
    },
    { 
      id: 'fraud', 
      label: t.admin.tabs.fraud, 
      icon: 'gavel', 
      count: fraudList.filter(f => f.status === 'pending').length,
      badgeColor: 'bg-amber-500 text-black font-black',
      description: t.admin.tabs.fraudDesc
    },
    { 
      id: 'logs', 
      label: t.admin.tabs.logs, 
      icon: 'terminal',
      description: t.admin.tabs.logsDesc
    },
    { 
      id: 'access', 
      label: t.admin.tabs.access, 
      icon: 'admin_panel_settings',
      description: t.admin.tabs.accessDesc
    },
  ];
  const navTabs = allTabs.filter((tab) => tab.id === 'overview' || can(TAB_PERMISSION[tab.id]));

  // Show only a tab the person may see: if the chosen one is hidden (or disappears), fall back to the first visible tab.
  const activeTab: AdminTab = navTabs.some((tab) => tab.id === selectedTab) ? selectedTab : (navTabs[0]?.id ?? 'overview');

  const publicLinks: { id: ScreenId; label: string; icon: string }[] = [
    { id: 'emergency-hub', label: t.admin.publicLinks.emergencyHub, icon: 'emergency' },
    { id: 'donor-directory', label: t.admin.publicLinks.donorDirectory, icon: 'person_search' },
    { id: 'create-sos', label: t.admin.publicLinks.createSos, icon: 'add_alert' },
    { id: 'request-tracking', label: t.admin.publicLinks.requestTracking, icon: 'timeline' },
    { id: 'hospital-org', label: t.admin.publicLinks.hospitalOrg, icon: 'domain' },
    { id: 'donor-passport', label: t.admin.publicLinks.donorPassport, icon: 'badge' },
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
          <span>{t.admin.marquee.liveAlert}</span>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="inline-block whitespace-nowrap animate-marquee">
            <span>
              {getActiveAlertText(language)} • <span className="text-amber-400 font-extrabold">{t.admin.marquee.emergencyRadius}</span>{getActiveRadiusText(language)} • {t.admin.marquee.telemetry}
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
            title={t.admin.header.openSidebar}
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
                  {t.admin.header.brand}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-red-600 text-[9px] font-black text-white uppercase tracking-wider">
                  {t.admin.header.adminBadge}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block">
                {t.admin.header.consoleSubtitle}
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
              placeholder={t.admin.header.searchPlaceholder}
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
            title={t.admin.header.returnToPublic}
          >
            <span className="material-symbols-outlined text-base text-red-400">public</span>
            <span className="hidden sm:inline">{t.admin.header.publicSite}</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => {
              sound.playTap();
              toggleLanguage();
            }}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold cursor-pointer transition-colors"
            title={t.admin.header.switchLanguage}
          >
            {t.admin.header.languageToggle}
          </button>

          {/* Trigger Red Alert */}
          <button
            onClick={() => {
              sound.playSosSiren();
              showToast(
                t.admin.toasts.redAlertDispatched
              );
            }}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1 shadow-md shadow-red-600/30 cursor-pointer active:scale-95 transition-all"
            title={t.admin.header.broadcastRedAlertTitle}
          >
            <span className="material-symbols-outlined text-sm animate-pulse">campaign</span>
            <span className="hidden sm:inline">{t.admin.header.sosBroadcast}</span>
          </button>

          {/* Admin User Avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=80"
                alt={t.admin.header.adminAlt}
                className="w-8 h-8 rounded-xl object-cover border border-slate-700"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-950 rounded-full" />
            </div>
            <div className="hidden xl:block text-left">
              <span className="text-xs font-bold text-white block leading-tight">
                {t.admin.header.adminName}
              </span>
              <span className="text-[10px] text-slate-400 block leading-tight">
                {t.admin.header.superAdmin}
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
                  {t.admin.sidebar.protocol}
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
                  {t.admin.sidebar.systemActive}
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">{t.admin.sidebar.uptime}</span>
            </div>

            {/* Section 1: Main Admin Modules */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-3 mb-1">
                {t.admin.sidebar.adminDesk}
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
                {t.admin.sidebar.publicModules}
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
                {t.admin.sidebar.liveTelemetry}
              </span>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">
                    {t.admin.sidebar.activeDonors}
                  </span>
                  <span className="text-sm font-black text-emerald-400">
                    {donors.filter(d => d.isAvailable).length}
                  </span>
                </div>
                <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">
                    {t.admin.sidebar.pending}
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
                    t.admin.toasts.redAlertDispatched
                  );
                }}
                className="w-full py-2.5 px-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-base animate-pulse">campaign</span>
                <span>{t.admin.sidebar.broadcastRedAlert}</span>
              </button>

              <button
                onClick={() => {
                  sound.playTap();
                  onNavigate('emergency-hub');
                }}
                className="w-full py-2 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-800 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-base">public</span>
                <span>{t.admin.sidebar.backToPublic}</span>
              </button>
            </div>
          </div>

          {/* Admin User Profile Card at Bottom of Sidebar */}
          <div className="pt-4 mt-6 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=80"
                  alt={t.admin.header.adminAlt}
                  className="w-9 h-9 rounded-xl object-cover border border-slate-700"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-950 rounded-full" />
              </div>
              <div className="truncate">
                <span className="text-xs font-bold text-white block truncate">
                  {t.admin.header.adminName}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {t.admin.sidebar.adminRole}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playTap();
                showToast(
                  t.admin.toasts.sessionActive
                );
              }}
              title={t.admin.sidebar.sessionVerified}
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
                    {t.admin.workspace.verifiedConsole}
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
                    {t.admin.sidebar.activeDonors}
                  </span>
                  <span className="text-base font-black text-emerald-400">
                    {donors.filter(d => d.isAvailable).length} / {donors.length}
                  </span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-2xl text-center shadow-inner">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {t.admin.workspace.pendingSos}
                  </span>
                  <span className="text-base font-black text-red-500">
                    {requests.filter(r => r.status === 'pending').length}
                  </span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-2xl text-center shadow-inner">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {t.admin.workspace.approvedOrgs}
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
                    {t.admin.overview.liveAlertBadge}
                  </span>
                  <span className="text-xs font-mono font-bold text-red-300">
                    {criticalAlert.isActive ? t.admin.overview.active : t.admin.overview.paused}
                  </span>
                </div>
                <h3 className="text-base font-black text-white mt-1">
                  {t.admin.overview.controlTitle}
                </h3>
                <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-red-400 font-bold shrink-0">{t.admin.overview.emergencyAlert}</span>
                    <span className="truncate text-slate-200">{getActiveAlertText(language)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-amber-400 font-bold shrink-0">{t.admin.overview.emergencyRadius}</span>
                    <span className="truncate text-slate-200">{getActiveRadiusText(language)}</span>
                  </div>
                </div>
              </div>
            </div>

{can('panel.alerts') && (
              <button
                onClick={() => {
                  setActiveTab('alerts');
                  sound.playTap();
                }}
                className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-red-600/30 cursor-pointer transition-all hover:scale-105 active:scale-95"
              >
                <span className="material-symbols-outlined text-base">tune</span>
                <span>{t.admin.overview.configure}</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            )}
          </div>

          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {t.admin.overview.totalDonors}
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{t.admin.overview.totalDonorsValue}</span>
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  {t.admin.overview.joinedToday}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">person_pin</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {t.admin.overview.fulfilled}
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{t.admin.overview.fulfilledValue}</span>
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  {t.admin.overview.successRate}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">volunteer_activism</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {t.admin.overview.avgEta}
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{t.admin.overview.avgEtaValue}</span>
                <span className="text-[11px] text-cyan-600 font-bold flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-sm">near_me</span>
                  {t.admin.overview.dhakaRadius}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">speed</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {t.admin.overview.syndicatesBlocked}
                </span>
                <span className="text-2xl font-black text-red-600 mt-1 block">{t.admin.overview.syndicatesBlockedValue}</span>
                <span className="text-[11px] text-red-600 font-bold flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-sm">block</span>
                  {t.admin.overview.nidBlacklisted}
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
                    <span>{t.admin.overview.matrixTitle}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.admin.overview.matrixDesc}
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {t.admin.overview.liveSynced}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { group: 'O-', stock: 68, demand: 14, status: 'CRITICAL', color: 'bg-red-500', label: t.admin.overview.stockCritical },
                  { group: 'AB-', stock: 92, demand: 8, status: 'LOW', color: 'bg-amber-500', label: t.admin.overview.stockLow },
                  { group: 'A-', stock: 110, demand: 6, status: 'MODERATE', color: 'bg-yellow-500', label: t.admin.overview.stockModerate },
                  { group: 'B-', stock: 125, demand: 9, status: 'MODERATE', color: 'bg-yellow-500', label: t.admin.overview.stockModerate },
                  { group: 'O+', stock: 890, demand: 28, status: 'HEALTHY', color: 'bg-emerald-500', label: t.admin.overview.stockHealthy },
                  { group: 'A+', stock: 740, demand: 18, status: 'HEALTHY', color: 'bg-emerald-500', label: t.admin.overview.stockHealthy },
                  { group: 'B+', stock: 960, demand: 22, status: 'HEALTHY', color: 'bg-emerald-500', label: t.admin.overview.stockHealthy },
                  { group: 'AB+', stock: 410, demand: 7, status: 'HEALTHY', color: 'bg-emerald-500', label: t.admin.overview.stockHealthy },
                ].map((item) => (
                  <div key={item.group} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-black text-slate-900">{item.group}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold text-white ${item.color}`}>
                        {item.label}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1.5 font-medium">
                      <span>{t.admin.overview.stock} <strong>{item.stock}</strong></span>
                      <span className="text-red-600 font-bold">{t.admin.overview.req} {item.demand}</span>
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
                  <span>{t.admin.overview.shortageTitle}</span>
                </h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  {t.admin.overview.shortageDesc}
                </p>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900">
                    <strong className="block text-red-700 font-bold mb-0.5">{t.admin.overview.shortage1Title}</strong>
                    <span>{t.admin.overview.shortage1Desc}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <strong className="block text-amber-700 font-bold mb-0.5">{t.admin.overview.shortage2Title}</strong>
                    <span>{t.admin.overview.shortage2Desc}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2">
                {can('panel.requests') && (
                  <button
                    onClick={() => {
                      setActiveTab('requests');
                      setBloodFilter('O-');
                      sound.playTap();
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span className="material-symbols-outlined text-base">filter_list</span>
                    <span>{t.admin.overview.manageONeg}</span>
                  </button>
                )}
                <button
                  onClick={() => onNavigate('hospital-org')}
                  className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border border-red-200"
                >
                  <span className="material-symbols-outlined text-base">account_balance</span>
                  <span>{t.admin.overview.openHospitalStocks}</span>
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
                    {t.admin.alerts.liveBroadcastHub}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                    {t.admin.alerts.ribbonSync}
                  </span>
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  {t.admin.alerts.centerTitle}
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {t.admin.alerts.centerDesc}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => {
                  sound.playSosSiren();
                  showToast(t.admin.toasts.sirenTested);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-2 border border-slate-700 cursor-pointer transition-all"
                title={t.admin.alerts.testSirenTitle}
              >
                <span className="material-symbols-outlined text-amber-400 text-base">volume_up</span>
                <span>{t.admin.alerts.testSiren}</span>
              </button>

              <button
                onClick={() => {
                  resetAlertDefaults();
                  sound.playTap();
                  showToast(t.admin.toasts.alertsReset);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs flex items-center gap-2 border border-slate-800 cursor-pointer transition-all"
                title={t.admin.alerts.resetTitle}
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
                <span>{t.admin.alerts.reset}</span>
              </button>
            </div>
          </div>

          {/* Real-time Output Live Previews (How it appears to public users) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">visibility</span>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  {t.admin.alerts.previewsTitle}
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                {t.admin.alerts.liveSynced}
              </span>
            </div>

            {/* Preview 1: Header Critical Alert Ribbon */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-red-600 text-sm">campaign</span>
                  {t.admin.alerts.preview1}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {criticalAlert.isActive ? t.admin.alerts.statusActive : t.admin.alerts.statusInactive}
                </span>
              </div>
              <div className="bg-red-600 text-white rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-3 shadow-inner overflow-hidden">
                <span className="bg-red-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs animate-pulse">emergency</span>
                  {t.admin.alerts.emergencyAlertLabel}
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
                  {t.admin.alerts.preview2}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {emergencyRadius.isActive ? t.admin.alerts.statusActive : t.admin.alerts.statusInactive}
                </span>
              </div>
              <div className="bg-red-700 text-white rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-3 shadow-inner overflow-hidden">
                <span className="bg-red-800 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs animate-spin" style={{ animationDuration: '3s' }}>radar</span>
                  {t.admin.alerts.emergencyRadiusLabel}
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
                        {t.admin.alerts.alertSetupTitle}
                      </h3>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {t.admin.alerts.alertSetupDesc}
                      </span>
                    </div>
                  </div>

                  {/* Active Switch */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs font-bold text-slate-600">
                      {alertIsActive ? t.admin.alerts.active : t.admin.alerts.inactive}
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
                      {t.admin.alerts.hospitalName}
                    </label>
                    <input
                      type="text"
                      value={alertHospital}
                      onChange={(e) => setAlertHospital(e.target.value)}
                      placeholder={t.admin.alerts.hospitalPlaceholder}
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
                        {t.admin.alerts.bedWard}
                      </label>
                      <input
                        type="text"
                        value={alertBed}
                        onChange={(e) => setAlertBed(e.target.value)}
                        placeholder={t.admin.alerts.bedPlaceholder}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-red-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {t.admin.alerts.bags}
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
                      {t.admin.alerts.bloodGroup}
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
                      {t.admin.alerts.urgencyLevel}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'code_red', label: t.admin.alerts.urgencyCodeRed, color: 'border-red-500 text-red-600 bg-red-50' },
                        { id: 'critical', label: t.admin.alerts.urgencyCritical, color: 'border-amber-500 text-amber-600 bg-amber-50' },
                        { id: 'urgent', label: t.admin.alerts.urgencyUrgent, color: 'border-blue-500 text-blue-600 bg-blue-50' }
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
                            {lvl.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Message (Optional Override) */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {t.admin.alerts.customAlertMessage}
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
                    t.admin.toasts.alertSaved
                  );
                }}
                className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer transition-all hover:scale-[1.01] active:scale-95"
              >
                <span className="material-symbols-outlined text-base animate-pulse">campaign</span>
                <span>{t.admin.alerts.saveAlert}</span>
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
                        {t.admin.alerts.radiusSetupTitle}
                      </h3>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {t.admin.alerts.radiusSetupDesc}
                      </span>
                    </div>
                  </div>

                  {/* Active Switch */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs font-bold text-slate-600">
                      {radiusIsActive ? t.admin.alerts.active : t.admin.alerts.inactive}
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
                      {t.admin.alerts.zoneName}
                    </label>
                    <input
                      type="text"
                      value={radiusZone}
                      onChange={(e) => setRadiusZone(e.target.value)}
                      placeholder={t.admin.alerts.zonePlaceholder}
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
                        <span>{t.admin.alerts.radiusDistance}</span>
                      </label>
                      <span className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shadow-xs">
                        {t.admin.alerts.radiusKmBadge(radiusKm)}
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
                      {t.admin.alerts.radiusHint}
                    </span>
                  </div>

                  {/* Urgent Requests Count & Hospitals */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {t.admin.alerts.requestCount}
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
                        {t.admin.alerts.keyHospitals}
                      </label>
                      <input
                        type="text"
                        value={radiusHospitals}
                        onChange={(e) => setRadiusHospitals(e.target.value)}
                        placeholder={t.admin.alerts.keyHospitalsPlaceholder}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Custom Message (Optional Override) */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {t.admin.alerts.customRadiusText}
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
                    t.admin.toasts.radiusSaved
                  );
                }}
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 cursor-pointer transition-all hover:scale-[1.01] active:scale-95"
              >
                <span className="material-symbols-outlined text-base">radar</span>
                <span>{t.admin.alerts.updateRadius}</span>
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
                <span>{t.admin.donors.title}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.admin.donors.desc}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('donor-register')}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                <span>{t.admin.donors.addDonor}</span>
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
                placeholder={t.admin.donors.searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
              />
            </div>

            <div>
              <select
                value={bloodFilter}
                onChange={(e) => setBloodFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="ALL">{t.admin.donors.allBloodGroups}</option>
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
                <option value="ALL">{t.admin.donors.allStatuses}</option>
                <option value="AVAILABLE">{t.admin.donors.filterAvailable}</option>
                <option value="VERIFIED">{t.admin.donors.filterVerified}</option>
                <option value="RESTING">{t.admin.donors.filterResting}</option>
              </select>
            </div>
          </div>

          {/* Donors Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">{t.admin.donors.colDonor}</th>
                  <th className="px-3 py-3 text-center">{t.admin.donors.colBlood}</th>
                  <th className="px-3 py-3">{t.admin.donors.colLocation}</th>
                  <th className="px-3 py-3 text-center">{t.admin.donors.colDonations}</th>
                  <th className="px-3 py-3">{t.admin.donors.colVerification}</th>
                  <th className="px-3 py-3">{t.admin.donors.colAvailability}</th>
                  <th className="px-4 py-3 text-right">{t.admin.donors.colActions}</th>
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
                      <span className="font-black text-slate-900">{t.admin.donors.donationTimes(donor.donationCount)}</span>
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
                        <span>{donor.isBdrcsVerified ? t.admin.donors.verified : t.admin.donors.unverified}</span>
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
                        <span>{donor.isAvailable ? t.admin.donors.available : t.admin.donors.resting}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedDonor(donor)}
                          title={t.admin.donors.viewDossier}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">visibility</span>
                        </button>
                        <button
                          onClick={() => {
                            sound.playSuccessTone();
                            showToast(
                              t.admin.toasts.donorPinged(donor.name)
                            );
                          }}
                          title={t.admin.donors.sendPing}
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
                <span>{t.admin.requests.title}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.admin.requests.desc}
              </p>
            </div>

            <button
              onClick={() => onNavigate('create-sos')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              <span>{t.admin.requests.postRequest}</span>
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
                placeholder={t.admin.requests.searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
              />
            </div>

            <div>
              <select
                value={bloodFilter}
                onChange={(e) => setBloodFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold outline-none cursor-pointer"
              >
                <option value="ALL">{t.admin.donors.allBloodGroups}</option>
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
                <option value="ALL">{t.admin.donors.allStatuses}</option>
                <option value="pending">{t.admin.requests.filterPending}</option>
                <option value="donor_found">{t.admin.requests.filterDonorFound}</option>
                <option value="completed">{t.admin.requests.filterCompleted}</option>
                <option value="cancelled">{t.admin.requests.filterCancelled}</option>
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
                      {req.status === 'pending' ? t.admin.requests.statusPending :
                       req.status === 'donor_found' ? t.admin.requests.statusDonorFound :
                       req.status === 'completed' ? t.admin.requests.statusCompleted :
                       t.admin.requests.statusCancelled}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-black text-slate-900 text-base">{req.patientName}</h4>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">{req.condition}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex flex-col items-center justify-center font-black border border-red-200 shrink-0">
                      <span className="text-sm">{req.bloodGroup}</span>
                      <span className="text-[9px] text-red-700 font-bold">{req.bagsRequired} {t.admin.requests.bags}</span>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base">local_hospital</span>
                      <span className="font-semibold">{req.hospital} ({req.wardBed})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base">call</span>
                      <span>{t.admin.requests.attendant} <strong>{req.attendantName} ({req.attendantPhone})</strong></span>
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
                    <span>{t.admin.requests.doctorSlip}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {req.status !== 'donor_found' && req.status !== 'completed' && (
                      <button
                        onClick={() => handleUpdateRequestStatus(req.id, 'donor_found')}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold cursor-pointer"
                      >
                        {t.admin.requests.assign}
                      </button>
                    )}
                    {req.status !== 'completed' && (
                      <button
                        onClick={() => handleUpdateRequestStatus(req.id, 'completed')}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold cursor-pointer"
                      >
                        {t.admin.requests.complete}
                      </button>
                    )}
                    {req.status !== 'cancelled' && (
                      <button
                        onClick={() => handleUpdateRequestStatus(req.id, 'cancelled')}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold cursor-pointer"
                      >
                        {t.admin.requests.cancel}
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
                <span>{t.admin.hospitals.title}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.admin.hospitals.desc}
              </p>
            </div>

            <button
              onClick={() => onNavigate('hospital-org')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-base">open_in_new</span>
              <span>{t.admin.hospitals.openPortal}</span>
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
                      <span>{hosp.isVerified ? t.admin.hospitals.verified : t.admin.hospitals.unverified}</span>
                    </button>
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{hosp.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1">{hosp.address}</p>

                  <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t.admin.hospitals.license}</span>
                      <span className="font-mono font-bold text-slate-800">{hosp.licenseNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t.admin.hospitals.inCharge}</span>
                      <span className="font-semibold text-slate-800">{hosp.directorName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t.admin.hospitals.availableBags}</span>
                      <span className="font-black text-red-600">{hosp.availableBags} {t.admin.hospitals.bags}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500">{t.admin.hospitals.coldStorage}</span>
                      <span className="font-mono font-bold text-emerald-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {hosp.coldStorageTempC}°C
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {t.admin.hospitals.audited} {hosp.lastAuditDate}
                  </span>
                  <a
                    href={`tel:${hosp.emergencyContact}`}
                    className="font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">call</span>
                    <span>{t.admin.hospitals.hotline}</span>
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
              <span>{t.admin.fraud.title}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.admin.fraud.desc}
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
                      {t.admin.fraud.severity[incident.severity]}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">{incident.id}</span>
                    <span className="text-xs text-slate-400">• {incident.reportedAgo}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      incident.status === 'banned' ? 'bg-red-600 text-white' :
                      incident.status === 'dismissed' ? 'bg-slate-200 text-slate-700' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {t.admin.fraud.status[incident.status]}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-sm">{incident.type}: {incident.location}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{incident.description}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-500 font-mono">
                    <span>{t.admin.fraud.target} <strong>{incident.targetEntity}</strong></span>
                    <span>{t.admin.fraud.carrier} <strong>{incident.carrierInfo}</strong></span>
                    <span>{t.admin.fraud.evidence} <strong>{incident.evidence}</strong></span>
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
                        <span>{t.admin.fraud.blacklist}</span>
                      </button>
                      <button
                        onClick={() => handleResolveFraud(incident.id, 'dismissed')}
                        className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                      >
                        {t.admin.fraud.dismiss}
                      </button>
                    </>
                  )}
                  {incident.status === 'banned' && (
                    <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">verified</span>
                      <span>{t.admin.fraud.permanentlyBlocked}</span>
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
                {t.admin.logs.title}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">{t.admin.logs.throughput}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-2">
            {[
              { name: 'Grameenphone (GP-SMS-E01)', latency: '42ms', status: '100%' },
              { name: 'Banglalink (BL-ALRT-GW)', latency: '58ms', status: '99.9%' },
              { name: 'Robi / Airtel (R-PUSH-02)', latency: '61ms', status: '99.8%' },
              { name: 'Teletalk Emergency (TT-999)', latency: '35ms', status: '100%' }
            ].map(gw => (
              <div key={gw.name} className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block truncate">{gw.name}</span>
                <span className="text-emerald-400 font-bold block mt-1">{t.admin.logs.online(gw.status)}</span>
                <span className="text-[10px] text-slate-500">{t.admin.logs.latency} {gw.latency}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800/80 space-y-2 max-h-72 overflow-y-auto">
            <div className="text-slate-400">[10:24:18] <span className="text-emerald-400">[GP-SMS]</span> {t.admin.logs.log1}</div>
            <div className="text-slate-400">[10:23:45] <span className="text-cyan-400">[BDRCS-AUTH]</span> {t.admin.logs.log2}</div>
            <div className="text-slate-400">[10:21:02] <span className="text-amber-400">[AUDIT-WARN]</span> {t.admin.logs.log3}</div>
            <div className="text-slate-400">[10:18:30] <span className="text-red-400">[SECURITY-BLOCK]</span> {t.admin.logs.log4}</div>
            <div className="text-slate-400">[10:14:12] <span className="text-emerald-400">[HANDSHAKE]</span> {t.admin.logs.log5}</div>
          </div>
        </div>
      )}

      {/* TAB 7: ACCESS & ROLES */}
      {activeTab === 'access' && <AdminRolesPanel />}

        </div>
      </div>

      {/* Donor Dossier Modal */}
      {selectedDonor && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">badge</span>
                <span>{t.admin.dossier.title}</span>
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
                  {t.admin.dossier.bloodGroup(selectedDonor.bloodGroup, selectedDonor.rhType)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block text-[11px]">{t.admin.dossier.ageWeight}</span>
                <span className="font-bold text-slate-800">{t.admin.dossier.ageWeightValue(selectedDonor.age, selectedDonor.weightKg)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block text-[11px]">{t.admin.dossier.hemoglobin}</span>
                <span className="font-bold text-emerald-600">{t.admin.dossier.hemoglobinValue(selectedDonor.hbLevel)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block text-[11px]">{t.admin.dossier.totalDonations}</span>
                <span className="font-bold text-slate-800">{t.admin.dossier.totalDonationsValue(selectedDonor.donationCount)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block text-[11px]">{t.admin.dossier.lastDonation}</span>
                <span className="font-bold text-slate-800">{t.admin.dossier.daysAgo(selectedDonor.daysElapsedSinceDonation)}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 mb-5">
              <span className="font-bold block mb-1">{t.admin.dossier.serologyTitle}</span>
              <span>{t.admin.dossier.serologyResults}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  handleToggleVerifyDonor(selectedDonor.id);
                  setSelectedDonor(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                {selectedDonor.isBdrcsVerified ? t.admin.dossier.revoke : t.admin.dossier.grant}
              </button>
              <button
                onClick={() => setSelectedDonor(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                {t.admin.dossier.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
