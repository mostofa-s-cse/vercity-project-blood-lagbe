/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ScreenId, EmergencyDemand, ActiveMission } from './types/blood';
import { INITIAL_DEMANDS, ACTIVE_MISSION_DEFAULT } from './data/mockData';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { EmergencyHub } from './components/EmergencyHub';
import { DonorDirectory } from './components/DonorDirectory';
import { CreateSosScreen } from './components/CreateSosScreen';
import { LiveTrackerScreen } from './components/LiveTrackerScreen';
import { DonorPassportScreen } from './components/DonorPassportScreen';
import { OpsCommandScreen } from './components/OpsCommandScreen';
import { PitchDeckScreen } from './components/PitchDeckScreen';
import { RequisitionModal } from './components/RequisitionModal';
import { OtpVerificationModal } from './components/OtpVerificationModal';
import { sound } from './utils/audio';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('emergency-hub');
  const [selectedDivision, setSelectedDivision] = useState<string>('Dhaka Central');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  // Demands state for live creation
  const [demands, setDemands] = useState<EmergencyDemand[]>(INITIAL_DEMANDS);

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
    setToastMessage(
      language === 'bn'
        ? `জরুরি ব্রডকাস্ট চালু: ${newDemand.hospital}-এর কাছাকাছি ৪৫০+ রক্তদাতার কাছে ${newDemand.bloodGroup} রক্তের এসওএস পাঠানো হয়েছে।`
        : `Broadcast Active: ${newDemand.bloodGroup} SOS dispatched to 450+ donors near ${newDemand.hospital}.`
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
          <DonorDirectory onNavigate={handleNavigate} />
        )}
        {currentScreen === 'create-sos' && (
          <CreateSosScreen
            onNavigate={handleNavigate}
            onSosCreated={handleSosCreated}
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
      <AppContent />
    </LanguageProvider>
  );
}
