'use client';

import { CreateSosScreen } from '@/components/CreateSosScreen';
import { useAppState } from '@/context/AppStateContext';

export default function SosPage() {
  const { navigate, handleSosCreated } = useAppState();
  return <CreateSosScreen onNavigate={navigate} onSosCreated={handleSosCreated} />;
}
