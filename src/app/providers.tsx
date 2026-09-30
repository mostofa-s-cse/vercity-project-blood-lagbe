'use client';

import React from 'react';
import { StoreProvider } from '../store/StoreProvider';
import { LanguageProvider } from '../context/LanguageContext';
import { AlertProvider } from '../context/AlertContext';
import { AppStateProvider } from '../context/AppStateContext';
import { AuthProvider } from '../context/AuthContext';
import { AppShell } from '../components/AppShell';
import { LegacyHashRedirect } from '../components/LegacyHashRedirect';
import type { Language } from '../locales';

export function Providers({ language, children }: { language: Language; children: React.ReactNode }) {
  return (
    <StoreProvider>
      <LanguageProvider language={language}>
        <AuthProvider>
          <AlertProvider>
            <AppStateProvider>
              <LegacyHashRedirect />
              <AppShell>{children}</AppShell>
            </AppStateProvider>
          </AlertProvider>
        </AuthProvider>
      </LanguageProvider>
    </StoreProvider>
  );
}
