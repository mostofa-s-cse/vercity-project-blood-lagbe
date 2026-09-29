'use client';

import { NoAccessScreen } from '@/components/NoAccessScreen';
import { useAppState } from '@/context/AppStateContext';

export default function NoAccessAdminPage() {
  const { navigate } = useAppState();
  return <NoAccessScreen need="admin" onNavigate={navigate} />;
}
