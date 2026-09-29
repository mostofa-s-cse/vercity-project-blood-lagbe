'use client';

import { AdminPanelScreen } from '@/components/AdminPanelScreen';
import { useAppState } from '@/context/AppStateContext';

export default function AdminPage() {
  const { navigate, openRequisition } = useAppState();
  return <AdminPanelScreen onNavigate={navigate} onOpenRequisition={openRequisition} />;
}
