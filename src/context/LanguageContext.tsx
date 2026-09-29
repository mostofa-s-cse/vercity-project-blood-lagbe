'use client';

import React, { createContext, useCallback, useContext, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Language, TRANSLATIONS } from '../locales';
import { LANGUAGE_COOKIE, switchLanguagePath } from '../utils/routes';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: typeof TRANSLATIONS['bn'];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/** The language comes from the URL (`/bn/...`, `/en/...`); switching it navigates to the same page in the other one. */
export const LanguageProvider: React.FC<{ language: Language; children: React.ReactNode }> = ({
  language,
  children,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  // Remember the language so the proxy can send prefix-less URLs to it.
  useEffect(() => {
    document.cookie = `${LANGUAGE_COOKIE}=${language}; path=/; max-age=31536000; samesite=lax`;
  }, [language]);

  const setLanguage = useCallback(
    (next: Language) => {
      if (next === language) return;
      router.push(`${switchLanguagePath(pathname, next)}${window.location.search}${window.location.hash}`, { scroll: false });
    },
    [language, pathname, router]
  );

  const toggleLanguage = () => setLanguage(language === 'bn' ? 'en' : 'bn');

  const t = TRANSLATIONS[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
