'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ScreenId, BloodGroup } from '../types/blood';
import type { NotificationDto } from '../lib/dtoTypes';
import { browserStorage as donorStorage, DONOR_PROFILE_CHANGED, readMyDonorProfiles } from '../lib/myDonorProfile';
import { sound } from '../utils/audio';
import { pathToScreen, screenPath } from '../utils/routes';
import { usePersistentState } from '../utils/persistentState';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { useGetDonorNotificationsQuery, useGetDonorsQuery, useMarkNotificationReadMutation, useRemoveDonationMutation } from '../store/api';

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
  notifications: NotificationDto[];
  unreadCount: number;
  isNotificationsOpen: boolean;
  openNotifications: () => void;
  closeNotifications: () => void;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  removeDonation: (donationId: string) => void;
  toastMessage: string | null;
  dismissToast: () => void;
  requisitionModal: RequisitionModalState;
  openRequisition: (demand: any) => void;
  closeRequisition: () => void;
  /** Lets a screen that isn't the public /sos page (e.g. the Admin Panel) post a request without
   * leaving where it is. */
  isCreateSosModalOpen: boolean;
  openCreateSosModal: () => void;
  closeCreateSosModal: () => void;
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [requisitionModal, setRequisitionModal] = useState<RequisitionModalState>({ isOpen: false });
  const [isCreateSosModalOpen, setIsCreateSosModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // The donor this browser is identified as (same pattern as DonorRegistrationScreen/DonorPassportScreen,
  // WP3/WP5): a remembered manage-token donor, or a signed-in person's own donor profile. Nobody
  // identified as a donor means no notifications, never sample ones.
  const { user } = useAuth();
  const [rememberedDonorId, setRememberedDonorId] = useState<string | null>(null);
  // Read again whenever a donor is registered or the remembered ones are cleared (sign-out); reading only
  // on mount left the bell empty after registering until a reload.
  useEffect(() => {
    const read = () => setRememberedDonorId(readMyDonorProfiles(donorStorage())[0]?.id ?? null);
    read();
    window.addEventListener(DONOR_PROFILE_CHANGED, read);
    return () => window.removeEventListener(DONOR_PROFILE_CHANGED, read);
  }, []);
  const mineDonorQuery = useGetDonorsQuery({ mine: true, pageSize: 1 }, { skip: !user });
  const activeDonorId = rememberedDonorId ?? mineDonorQuery.data?.donors[0]?.id ?? null;

  const notificationsQuery = useGetDonorNotificationsQuery({ id: activeDonorId ?? '' }, { skip: !activeDonorId, pollingInterval: 30_000 });
  const [markRead] = useMarkNotificationReadMutation();
  const [removeDonationMutation] = useRemoveDonationMutation();
  const notifications = activeDonorId ? notificationsQuery.data?.notifications ?? [] : [];
  const unreadCount = activeDonorId ? notificationsQuery.data?.unreadCount ?? 0 : 0;

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

  const handleSosCreated = ({ bloodGroup, place }: SosCreatedInfo) => {
    // Real compatible donors are matched and notified server-side (POST /api/sos, WP4); this is just
    // the poster's own toast, not a notification.
    showToast(t.toast.sosBroadcast(bloodGroup, place));
  };

  const handleRegisterDonor = ({ name, bloodGroup }: DonorRegisteredInfo) => {
    showToast(t.toast.donorRegistered(name, bloodGroup));
  };

  const markNotificationRead = (id: string) => {
    if (!activeDonorId) return;
    markRead({ donorId: activeDonorId, id });
  };

  const removeDonation = (donationId: string) => {
    if (!activeDonorId) return;
    void removeDonationMutation({ donorId: activeDonorId, donationId })
      .unwrap()
      .then(() => showToast(t.toast.donationRemoved))
      .catch(() => showToast(t.toast.donationRemoveFailed));
  };

  const clearAllNotifications = () => {
    if (!activeDonorId) return;
    for (const notification of notifications) {
      if (!notification.isRead) markRead({ donorId: activeDonorId, id: notification.id });
    }
  };

  const value: AppStateValue = {
    currentScreen,
    navigate,
    selectedDivision,
    setSelectedDivision,
    isAudioMuted,
    toggleAudioMute,
    notifications,
    unreadCount,
    isNotificationsOpen,
    openNotifications: () => setIsNotificationsOpen(true),
    closeNotifications: () => setIsNotificationsOpen(false),
    markNotificationRead,
    clearAllNotifications,
    removeDonation,
    toastMessage,
    dismissToast: () => setToastMessage(null),
    requisitionModal,
    openRequisition,
    closeRequisition: () => setRequisitionModal({ isOpen: false }),
    isCreateSosModalOpen,
    openCreateSosModal: () => setIsCreateSosModalOpen(true),
    closeCreateSosModal: () => setIsCreateSosModalOpen(false),
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
