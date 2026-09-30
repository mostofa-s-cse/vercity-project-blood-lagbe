'use client';

import { DonorDirectory } from '@/components/DonorDirectory';
import { useAppState } from '@/context/AppStateContext';

export default function DonorsPage() {
  const { navigate } = useAppState();
  return <DonorDirectory onNavigate={navigate} />;
}
