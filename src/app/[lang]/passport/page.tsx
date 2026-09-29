'use client';

import { DonorPassportScreen } from '@/components/DonorPassportScreen';
import { useAppState } from '@/context/AppStateContext';

export default function PassportPage() {
  const { navigate } = useAppState();
  return <DonorPassportScreen onNavigate={navigate} />;
}
