'use client';

import { DonorDirectory } from '@/components/DonorDirectory';
import { useAppState } from '@/context/AppStateContext';

export default function DonorsPage() {
  const { navigate, donors } = useAppState();
  return <DonorDirectory onNavigate={navigate} donors={donors} />;
}
