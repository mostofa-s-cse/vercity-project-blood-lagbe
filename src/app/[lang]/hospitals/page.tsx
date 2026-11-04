'use client';

import { HospitalOrgScreen } from '@/components/HospitalOrgScreen';
import { useAppState } from '@/context/AppStateContext';

export default function HospitalsPage() {
  const { navigate } = useAppState();
  return <HospitalOrgScreen onNavigate={navigate} />;
}
