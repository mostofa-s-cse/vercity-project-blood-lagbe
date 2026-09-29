import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, TRANSLATIONS } from '../locales';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: typeof TRANSLATIONS['bn'];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to Bengali. Saved choice loads after mount so server and first client render match.
  const [language, setLanguageState] = useState<Language>('bn');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('blood_lagbe_lang');
      if (saved === 'en' || saved === 'bn') setLanguageState(saved);
    } catch (e) {}
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('blood_lagbe_lang', lang);
    } catch (e) {}
  };

  const toggleLanguage = () => {
    const next = language === 'bn' ? 'en' : 'bn';
    setLanguage(next);
  };

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
