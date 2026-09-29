'use client';

import { PitchDeckScreen } from '@/components/PitchDeckScreen';
import { useAppState } from '@/context/AppStateContext';

export default function DeckPage() {
  const { navigate } = useAppState();
  return <PitchDeckScreen onNavigate={navigate} />;
}
