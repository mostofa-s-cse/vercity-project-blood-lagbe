'use client';

import { DonorRegistrationScreen } from '@/components/DonorRegistrationScreen';
import { useAppState } from '@/context/AppStateContext';

export default function RegisterPage() {
  const { navigate, handleRegisterDonor } = useAppState();
  return <DonorRegistrationScreen onNavigate={navigate} onRegisterDonor={handleRegisterDonor} />;
}
