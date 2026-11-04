'use client';

import { AdminPanelScreen } from '@/components/AdminPanelScreen';
import { useAppState } from '@/context/AppStateContext';

export default function AdminPage() {
  const { navigate, openCreateSosModal } = useAppState();
  return <AdminPanelScreen onNavigate={navigate} onOpenCreateSos={openCreateSosModal} />;
}
