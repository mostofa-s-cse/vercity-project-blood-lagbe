'use client';

import { EmergencyHub } from '@/components/EmergencyHub';
import { useAppState } from '@/context/AppStateContext';
import { sound } from '@/utils/audio';

export default function EmergencyHubPage() {
  const { navigate, openRequisition } = useAppState();
  return (
    <EmergencyHub
      onNavigate={navigate}
      onOpenRequisition={openRequisition}
      onSelectDonorCommit={() => {
        sound.playSuccessTone();
        navigate('live-tracker');
      }}
    />
  );
}
