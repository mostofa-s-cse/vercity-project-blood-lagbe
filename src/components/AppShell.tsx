'use client';

import React from 'react';
import { useAppState } from '../context/AppStateContext';
import { Header } from './Header';
import { Footer } from './Footer';
import { NotificationsModal } from './NotificationsModal';
import { RequisitionModal } from './RequisitionModal';

export function AppShell({ children }: { children: React.ReactNode }) {
  const app = useAppState();
  const isAdmin = app.currentScreen === 'admin-panel';

  const toast = app.toastMessage && (
    <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4 max-w-md">
      <span className="material-symbols-outlined text-emerald-400 text-xl">verified</span>
      <span className="text-xs font-semibold">{app.toastMessage}</span>
      <button onClick={app.dismissToast} className="text-slate-400 hover:text-white ml-auto cursor-pointer">
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );

  const notificationsModal = (
    <NotificationsModal
      isOpen={app.isNotificationsOpen}
      onClose={app.closeNotifications}
      notifications={app.notifications}
      onMarkAsRead={app.markNotificationRead}
      onClearAll={app.clearAllNotifications}
      onNavigate={app.navigate}
    />
  );

  const requisitionModal = (
    <RequisitionModal
      isOpen={app.requisitionModal.isOpen}
      onClose={app.closeRequisition}
      patientName={app.requisitionModal.patientName}
      hospitalName={app.requisitionModal.hospitalName}
      doctorName={app.requisitionModal.doctorName}
      bloodGroup={app.requisitionModal.bloodGroup}
      units={app.requisitionModal.units}
    />
  );

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
        {toast}
        {children}
        {notificationsModal}
        {requisitionModal}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {toast}

      <Header
        currentScreen={app.currentScreen}
        onNavigate={app.navigate}
        selectedDivision={app.selectedDivision}
        onSelectDivision={app.setSelectedDivision}
        isAudioMuted={app.isAudioMuted}
        onToggleAudioMute={app.toggleAudioMute}
        unreadCount={app.unreadCount}
        onOpenNotifications={app.openNotifications}
      />

      <main className="flex-1 w-full">{children}</main>

      <Footer onNavigate={app.navigate} />

      {notificationsModal}
      {requisitionModal}
    </div>
  );
}
