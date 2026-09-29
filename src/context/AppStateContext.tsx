'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ScreenId, EmergencyDemand, ActiveMission, Donor, DonorNotification } from '../types/blood';
import { INITIAL_DEMANDS, ACTIVE_MISSION_DEFAULT, INITIAL_DONORS, INITIAL_NOTIFICATIONS } from '../data/mockData';
import { sound } from '../utils/audio';
import { pathToScreen, screenPath } from '../utils/routes';
import { usePersistentState } from '../utils/persistentState';
import { useLanguage } from './LanguageContext';

interface RequisitionModalState {
  isOpen: boolean;
  patientName?: string;
  hospitalName?: string;
  doctorName?: string;
  bloodGroup?: string;
  units?: number;
}

interface OtpModalState {
  isOpen: boolean;
  mission: ActiveMission;
}

interface AppStateValue {
  currentScreen: ScreenId;
  navigate: (screen: ScreenId) => void;
  selectedDivision: string;
  setSelectedDivision: (div: string) => void;
  isAudioMuted: boolean;
  toggleAudioMute: () => void;
  demands: EmergencyDemand[];
  donors: Donor[];
  notifications: DonorNotification[];
  unreadCount: number;
  isNotificationsOpen: boolean;
  openNotifications: () => void;
  closeNotifications: () => void;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  toastMessage: string | null;
  dismissToast: () => void;
  requisitionModal: RequisitionModalState;
  openRequisition: (demand: any) => void;
  closeRequisition: () => void;
  otpModal: OtpModalState;
  openOtpModal: (mission: ActiveMission) => void;
  closeOtpModal: () => void;
  handleOtpSuccess: () => void;
  handleSosCreated: (newDemand: EmergencyDemand) => void;
  handleRegisterDonor: (newDonor: Donor) => void;
}

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const currentScreen = pathToScreen(pathname);
  const { language, t } = useLanguage();

  // Kept across the remount a language switch causes, so switching language keeps the session's data.
  const [selectedDivision, setSelectedDivision] = usePersistentState<string>('selectedDivision', 'Dhaka Central');
  const [isAudioMuted, setIsAudioMuted] = usePersistentState<boolean>('isAudioMuted', false);
  const [demands, setDemands] = usePersistentState<EmergencyDemand[]>('demands', INITIAL_DEMANDS);
  const [donors, setDonors] = usePersistentState<Donor[]>('donors', INITIAL_DONORS);
  const [notifications, setNotifications] = usePersistentState<DonorNotification[]>('notifications', INITIAL_NOTIFICATIONS);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [requisitionModal, setRequisitionModal] = useState<RequisitionModalState>({ isOpen: false });
  const [otpModal, setOtpModal] = useState<OtpModalState>({
    isOpen: false,
    mission: ACTIVE_MISSION_DEFAULT,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const navigate = useCallback(
    (screen: ScreenId) => {
      router.push(screenPath(screen, language));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [router, language]
  );

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const toggleAudioMute = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    sound.setMuted(nextMuted);
  };

  const openRequisition = (demand: any) => {
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

    showToast(t.toast.sosBroadcast(newDemand.bloodGroup, newDemand.hospital));
  };

  const handleRegisterDonor = (newDonor: Donor) => {
    setDonors((prev) => [newDonor, ...prev]);
    showToast(t.toast.donorRegistered(newDonor.name, newDonor.bloodGroup));
  };

  const openOtpModal = (mission: ActiveMission) => {
    setOtpModal({ isOpen: true, mission });
  };

  const handleOtpSuccess = () => {
    showToast(t.toast.otpSuccess);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const value: AppStateValue = {
    currentScreen,
    navigate,
    selectedDivision,
    setSelectedDivision,
    isAudioMuted,
    toggleAudioMute,
    demands,
    donors,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    isNotificationsOpen,
    openNotifications: () => setIsNotificationsOpen(true),
    closeNotifications: () => setIsNotificationsOpen(false),
    markNotificationRead,
    clearAllNotifications,
    toastMessage,
    dismissToast: () => setToastMessage(null),
    requisitionModal,
    openRequisition,
    closeRequisition: () => setRequisitionModal({ isOpen: false }),
    otpModal,
    openOtpModal,
    closeOtpModal: () => setOtpModal((prev) => ({ ...prev, isOpen: false })),
    handleOtpSuccess,
    handleSosCreated,
    handleRegisterDonor,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = (): AppStateValue => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
