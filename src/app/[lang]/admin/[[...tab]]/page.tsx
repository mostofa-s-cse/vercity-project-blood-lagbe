'use client';

import { AdminPanelScreen } from '@/components/AdminPanelScreen';
import { useAppState } from '@/context/AppStateContext';

export default function AdminPage() {
  const { navigate, openRequisition, openCreateSosModal } = useAppState();
  return <AdminPanelScreen onNavigate={navigate} onOpenRequisition={openRequisition} onOpenCreateSos={openCreateSosModal} />;
}
