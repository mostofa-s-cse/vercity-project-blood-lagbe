'use client';

import React from 'react';
import { LanguageProvider } from '../context/LanguageContext';
import { AlertProvider } from '../context/AlertContext';
import { AppStateProvider } from '../context/AppStateContext';
import { AppShell } from '../components/AppShell';
import { LegacyHashRedirect } from '../components/LegacyHashRedirect';
import { DocumentLocale } from './document-locale';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <DocumentLocale />
      <AlertProvider>
        <AppStateProvider>
          <LegacyHashRedirect />
          <AppShell>{children}</AppShell>
        </AppStateProvider>
      </AlertProvider>
    </LanguageProvider>
  );
}
