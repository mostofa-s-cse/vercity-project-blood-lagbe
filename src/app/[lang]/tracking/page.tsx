'use client';

import { RequestTrackingScreen } from '@/components/RequestTrackingScreen';
import { useAppState } from '@/context/AppStateContext';

export default function TrackingPage() {
  const { navigate } = useAppState();
  return <RequestTrackingScreen onNavigate={navigate} />;
}
