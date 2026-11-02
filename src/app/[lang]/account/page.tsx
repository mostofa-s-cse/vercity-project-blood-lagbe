'use client';

import { AccountScreen } from '@/components/AccountScreen';
import { useAppState } from '@/context/AppStateContext';

export default function AccountPage() {
  const { navigate } = useAppState();
  return <AccountScreen onNavigate={navigate} />;
}
