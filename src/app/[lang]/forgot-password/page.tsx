'use client';

import { ForgotPasswordScreen } from '@/components/ForgotPasswordScreen';
import { useAppState } from '@/context/AppStateContext';

export default function ForgotPasswordPage() {
  const { navigate } = useAppState();
  return <ForgotPasswordScreen onNavigate={navigate} />;
}
