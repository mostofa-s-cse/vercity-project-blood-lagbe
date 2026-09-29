'use client';

import { OpsCommandScreen } from '@/components/OpsCommandScreen';
import { useAppState } from '@/context/AppStateContext';

export default function CommandPage() {
  const { navigate, openRequisition } = useAppState();
  return <OpsCommandScreen onNavigate={navigate} onOpenRequisition={openRequisition} />;
}
