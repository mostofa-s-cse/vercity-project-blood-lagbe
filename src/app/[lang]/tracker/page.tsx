'use client';

import { LiveTrackerScreen } from '@/components/LiveTrackerScreen';
import { useAppState } from '@/context/AppStateContext';

export default function TrackerPage() {
  const { navigate, openRequisition, openOtpModal } = useAppState();
  return (
    <LiveTrackerScreen
      onNavigate={navigate}
      onOpenRequisition={openRequisition}
      onOpenOtpModal={openOtpModal}
    />
  );
}
