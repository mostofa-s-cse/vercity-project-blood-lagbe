'use client';

import { UserDocsScreen } from '@/components/UserDocsScreen';
import { useAppState } from '@/context/AppStateContext';

export default function DocsPage() {
  const { navigate } = useAppState();
  return <UserDocsScreen onNavigate={navigate} />;
}
