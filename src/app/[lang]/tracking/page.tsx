'use client';

import { RequestTrackingScreen } from '@/components/RequestTrackingScreen';
import { useAppState } from '@/context/AppStateContext';

export default function TrackingPage() {
  const { navigate, openRequisition, openOtpModal } = useAppState();
  return (
    <RequestTrackingScreen
      onNavigate={navigate}
      onOpenRequisition={openRequisition}
      onOpenOtpModal={openOtpModal}
    />
  );
}
