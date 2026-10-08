'use client';

import { SignInScreen } from '@/components/SignInScreen';
import { useAppState } from '@/context/AppStateContext';

export default function SignInPage() {
  const { navigate } = useAppState();
  return <SignInScreen onNavigate={navigate} />;
}
