'use client';

import { HospitalOrgScreen } from '@/components/HospitalOrgScreen';
import { useAppState } from '@/context/AppStateContext';

export default function HospitalsPage() {
  const { navigate, openRequisition } = useAppState();
  return <HospitalOrgScreen onNavigate={navigate} onOpenRequisition={openRequisition} />;
}
