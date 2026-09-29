'use client';

import { NoAccessScreen } from '@/components/NoAccessScreen';
import { useAppState } from '@/context/AppStateContext';

export default function NoAccessUserPage() {
  const { navigate } = useAppState();
  return <NoAccessScreen need="user" onNavigate={navigate} />;
}
