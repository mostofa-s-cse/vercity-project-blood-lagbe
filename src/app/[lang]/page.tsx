'use client';

import { EmergencyHub } from '@/components/EmergencyHub';
import { useAppState } from '@/context/AppStateContext';

export default function EmergencyHubPage() {
  const { navigate } = useAppState();
  return <EmergencyHub onNavigate={navigate} />;
}
