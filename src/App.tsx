/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ScreenId, EmergencyDemand, ActiveMission, Donor, DonorNotification } from './types/blood';
import { INITIAL_DEMANDS, ACTIVE_MISSION_DEFAULT, INITIAL_DONORS, INITIAL_NOTIFICATIONS } from './data/mockData';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { EmergencyHub } from './components/EmergencyHub';
import { DonorDirectory } from './components/DonorDirectory';
import { CreateSosScreen } from './components/CreateSosScreen';
import { LiveTrackerScreen } from './components/LiveTrackerScreen';
import { DonorPassportScreen } from './components/DonorPassportScreen';
import { OpsCommandScreen } from './components/OpsCommandScreen';
import { PitchDeckScreen } from './components/PitchDeckScreen';
import { AdminPanelScreen } from './components/AdminPanelScreen';
import { HospitalOrgScreen } from './components/HospitalOrgScreen';
import { DonorRegistrationScreen } from './components/DonorRegistrationScreen';
import { RequestTrackingScreen } from './components/RequestTrackingScreen';
import { NotificationsModal } from './components/NotificationsModal';
import { RequisitionModal } from './components/RequisitionModal';
import { OtpVerificationModal } from './components/OtpVerificationModal';
import { sound } from './utils/audio';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AlertProvider } from './context/AlertContext';

function getScreenFromHash(): ScreenId {
  const hash = window.location.hash.toLowerCase().replace('#', '').trim();
  if (hash === 'admin' || hash === 'admin-panel') return 'admin-panel';
  if (hash === 'donors' || hash === 'donor-directory') return 'donor-directory';
  if (hash === 'sos' || hash === 'create-sos') return 'create-sos';
  if (hash === 'tracking' || hash === 'requests' || hash === 'request-tracking') return 'request-tracking';
  if (hash === 'register' || hash === 'donor-register') return 'donor-register';
  if (hash === 'tracker' || hash === 'live-tracker') return 'live-tracker';
  if (hash === 'hospitals' || hash === 'orgs' || hash === 'hospital-org') return 'hospital-org';
  if (hash === 'passport' || hash === 'donor-passport') return 'donor-passport';
  if (hash === 'command' || hash === 'ops-command') return 'ops-command';
  if (hash === 'deck' || hash === 'proposal' || hash === 'pitch-deck') return 'pitch-deck';
  if (hash === 'emergency' || hash === 'emergency-hub') return 'emergency-hub';
  return 'emergency-hub';
}

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(() => getScreenFromHash());
  const [selectedDivision, setSelectedDivision] = useState<string>('Dhaka Central');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  // Sync with browser hash changes (e.g. back/forward button or direct URL typing)
  React.useEffect(() => {
    const handleHashChange = () => {
      const screen = getScreenFromHash();
      setCurrentScreen(screen);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Demands state for live creation
  const [demands, setDemands] = useState<EmergencyDemand[]>(INITIAL_DEMANDS);

  // Donors state (allows new donor registrations to appear in directory)
  const [allDonors, setAllDonors] = useState<Donor[]>(INITIAL_DONORS);

  // Notifications state
  const [notifications, setNotifications] = useState<DonorNotification[]>(INITIAL_NOTIFICATIONS);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  // Modal states
  const [requisitionModal, setRequisitionModal] = useState<{
    isOpen: boolean;
    patientName?: string;
    hospitalName?: string;
    doctorName?: string;
    bloodGroup?: string;
    units?: number;
  }>({
    isOpen: false,
  });

  const [otpModal, setOtpModal] = useState<{
    isOpen: boolean;
    mission: ActiveMission;
  }>({
    isOpen: false,
    mission: ACTIVE_MISSION_DEFAULT,
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { language } = useLanguage();

  const handleNavigate = (screen: ScreenId) => {
    setCurrentScreen(screen);
    window.location.hash = screen;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleAudioMute = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    sound.setMuted(nextMuted);
  };

  const handleOpenRequisition = (demand: any) => {
    sound.playTap();
    setRequisitionModal({
      isOpen: true,
      patientName: demand.patientName,
      hospitalName: demand.hospital,
      doctorName: demand.doctorName || 'Dr. Ashfaqul Alam, MD (Registrar)',
      bloodGroup: demand.bloodGroup,
      units: demand.bagsRequired,
    });
  };

  const handleSosCreated = (newDemand: EmergencyDemand) => {
    setDemands((prev) => [newDemand, ...prev]);

    // Also trigger an emergency notification in the system
    const newNotif: DonorNotification = {
      id: `NOTIF-${Date.now().toString().slice(-4)}`,
      title: `🚨 জরুরি ${newDemand.bloodGroup} রক্তের এসওএস ব্রডকাস্ট!`,
      message: `${newDemand.hospital}-এ ${newDemand.bagsRequired} ব্যাগ ${newDemand.bloodGroup} রক্ত প্রয়োজন। রোগী: ${newDemand.patientName}`,
      timestamp: 'এইমাত্র',
      type: 'urgent_request',
      read: false,
      bloodGroup: newDemand.bloodGroup,
      hospital: newDemand.hospital,
      distanceKm: newDemand.distanceKm || 1.8,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    setToastMessage(
      language === 'bn'
        ? `জরুরি ব্রডকাস্ট চালু: ${newDemand.hospital}-এর কাছাকাছি ৪৫০+ রক্তদাতার কাছে ${newDemand.bloodGroup} রক্তের এসওএস পাঠানো হয়েছে।`
        : `Broadcast Active: ${newDemand.bloodGroup} SOS dispatched to 450+ donors near ${newDemand.hospital}.`
    );
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleRegisterDonor = (newDonor: Donor) => {
    setAllDonors((prev) => [newDonor, ...prev]);
    setToastMessage(
      language === 'bn'
        ? `স্বাগতম ${newDonor.name}! আপনার ${newDonor.bloodGroup} রক্তদাতা প্রোফাইল সক্রিয় করা হয়েছে।`
        : `Welcome ${newDonor.name}! Your ${newDonor.bloodGroup} profile is now active on the donor roster.`
    );
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleOpenOtpModal = (mission: ActiveMission) => {
    setOtpModal({
      isOpen: true,
      mission,
    });
  };

  const handleOtpSuccess = () => {
    setToastMessage(
      language === 'bn'
        ? 'রক্তদান সম্পন্ন ও নিশ্চিত করা হয়েছে! ডিজিটাল সনদ ও রসিদ রেকর্ড করা হলো।'
        : 'Transfusion Handshake Confirmed! Official digital blood exchange receipt recorded.'
    );
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  if (currentScreen === 'admin-panel') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4 max-w-md">
            <span className="material-symbols-outlined text-emerald-400 text-xl">verified</span>
            <span className="text-xs font-semibold">{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-auto cursor-pointer">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        <AdminPanelScreen
          onNavigate={handleNavigate}
          onOpenRequisition={handleOpenRequisition}
        />

        {/* Notifications Modal */}
        <NotificationsModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          notifications={notifications}
          onMarkAsRead={handleMarkNotificationRead}
          onClearAll={handleClearAllNotifications}
          onNavigate={handleNavigate}
        />

        {/* Requisition Verification Modal */}
        <RequisitionModal
          isOpen={requisitionModal.isOpen}
          onClose={() => setRequisitionModal({ isOpen: false })}
          patientName={requisitionModal.patientName}
          hospitalName={requisitionModal.hospitalName}
          doctorName={requisitionModal.doctorName}
          bloodGroup={requisitionModal.bloodGroup}
          units={requisitionModal.units}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4 max-w-md">
          <span className="material-symbols-outlined text-emerald-400 text-xl">verified</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-auto cursor-pointer">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Global Header */}
      <Header
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        selectedDivision={selectedDivision}
        onSelectDivision={setSelectedDivision}
        isAudioMuted={isAudioMuted}
        onToggleAudioMute={handleToggleAudioMute}
        unreadCount={unreadNotificationsCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />

      {/* Main App Content Container */}
      <main className="flex-1 w-full">
        {currentScreen === 'emergency-hub' && (
          <EmergencyHub
            onNavigate={handleNavigate}
            onOpenRequisition={handleOpenRequisition}
            onSelectDonorCommit={() => {
              sound.playSuccessTone();
              handleNavigate('live-tracker');
            }}
          />
        )}
        {currentScreen === 'donor-directory' && (
          <DonorDirectory 
            onNavigate={handleNavigate} 
            donors={allDonors}
          />
        )}
        {currentScreen === 'create-sos' && (
          <CreateSosScreen
            onNavigate={handleNavigate}
            onSosCreated={handleSosCreated}
          />
        )}
        {currentScreen === 'request-tracking' && (
          <RequestTrackingScreen
            onNavigate={handleNavigate}
            onOpenRequisition={handleOpenRequisition}
            onOpenOtpModal={handleOpenOtpModal}
          />
        )}
        {currentScreen === 'donor-register' && (
          <DonorRegistrationScreen
            onNavigate={handleNavigate}
            onRegisterDonor={handleRegisterDonor}
          />
        )}
        {currentScreen === 'live-tracker' && (
          <LiveTrackerScreen
            onNavigate={handleNavigate}
            onOpenRequisition={handleOpenRequisition}
            onOpenOtpModal={handleOpenOtpModal}
          />
        )}
        {currentScreen === 'donor-passport' && (
          <DonorPassportScreen onNavigate={handleNavigate} />
        )}
        {currentScreen === 'hospital-org' && (
          <HospitalOrgScreen
            onNavigate={handleNavigate}
            onOpenRequisition={handleOpenRequisition}
          />
        )}
        {currentScreen === 'ops-command' && (
          <OpsCommandScreen
            onNavigate={handleNavigate}
            onOpenRequisition={handleOpenRequisition}
          />
        )}
        {currentScreen === 'pitch-deck' && (
          <PitchDeckScreen onNavigate={handleNavigate} />
        )}
      </main>

      {/* Global Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Donor Notifications Modal Drawer */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkNotificationRead}
        onClearAll={handleClearAllNotifications}
        onNavigate={handleNavigate}
      />

      {/* Clinical Requisition Slip Modal */}
      <RequisitionModal
        isOpen={requisitionModal.isOpen}
        onClose={() => setRequisitionModal({ isOpen: false })}
        patientName={requisitionModal.patientName}
        hospitalName={requisitionModal.hospitalName}
        doctorName={requisitionModal.doctorName}
        bloodGroup={requisitionModal.bloodGroup}
        units={requisitionModal.units}
      />

      {/* Recipient Handshake OTP Sign-Off Modal */}
      <OtpVerificationModal
        isOpen={otpModal.isOpen}
        onClose={() => setOtpModal((prev) => ({ ...prev, isOpen: false }))}
        expectedOtp={otpModal.mission?.otpCode || '4921'}
        donorName={otpModal.mission?.donors[0]?.name || 'Tanvir Ahmed'}
        patientName={otpModal.mission?.patientName || 'Nahidul Islam'}
        onSuccess={handleOtpSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AlertProvider>
        <AppContent />
      </AlertProvider>
    </LanguageProvider>
  );
}
