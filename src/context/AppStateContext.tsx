'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ScreenId, BloodGroup, DonorNotification } from '../types/blood';
import { INITIAL_NOTIFICATIONS } from '../data/mockData';
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

/** What the notification and the toast need to know about a posted SOS. */
export interface SosCreatedInfo {
  bloodGroup: BloodGroup;
  place: string;
  bags: number;
  patientName: string;
}

/** What the welcome toast needs to know about a registered donor. */
export interface DonorRegisteredInfo {
  name: string;
  bloodGroup: string;
}

interface AppStateValue {
  currentScreen: ScreenId;
  navigate: (screen: ScreenId) => void;
  selectedDivision: string;
  setSelectedDivision: (div: string) => void;
  isAudioMuted: boolean;
  toggleAudioMute: () => void;
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
  handleSosCreated: (info: SosCreatedInfo) => void;
  handleRegisterDonor: (info: DonorRegisteredInfo) => void;
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
  const [notifications, setNotifications] = usePersistentState<DonorNotification[]>('notifications', INITIAL_NOTIFICATIONS);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [requisitionModal, setRequisitionModal] = useState<RequisitionModalState>({ isOpen: false });
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

  const handleSosCreated = ({ bloodGroup, place, bags, patientName }: SosCreatedInfo) => {
    // Also trigger an emergency notification in the system
    const newNotif: DonorNotification = {
      id: `NOTIF-${Date.now().toString().slice(-4)}`,
      title: `🚨 জরুরি ${bloodGroup} রক্তের এসওএস ব্রডকাস্ট!`,
      message: `${place}-এ ${bags} ব্যাগ ${bloodGroup} রক্ত প্রয়োজন। রোগী: ${patientName}`,
      timestamp: 'এইমাত্র',
      type: 'urgent_request',
      read: false,
      bloodGroup,
      hospital: place,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    showToast(t.toast.sosBroadcast(bloodGroup, place));
  };

  const handleRegisterDonor = ({ name, bloodGroup }: DonorRegisteredInfo) => {
    showToast(t.toast.donorRegistered(name, bloodGroup));
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
