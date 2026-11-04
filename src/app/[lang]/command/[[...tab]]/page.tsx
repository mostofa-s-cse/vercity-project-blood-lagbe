'use client';

import { OpsCommandScreen } from '@/components/OpsCommandScreen';
import { useAppState } from '@/context/AppStateContext';

export default function CommandPage() {
  const { navigate } = useAppState();
  return <OpsCommandScreen onNavigate={navigate} />;
}
