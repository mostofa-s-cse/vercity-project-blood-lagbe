'use client';

import { ResetPasswordScreen } from '@/components/ResetPasswordScreen';
import { useAppState } from '@/context/AppStateContext';

export default function ResetPasswordPage() {
  const { navigate } = useAppState();
  return <ResetPasswordScreen onNavigate={navigate} />;
}
