'use client';

import { useAppState } from '../context/AppStateContext';
import { useLanguage } from '../context/LanguageContext';

export default function NotFound() {
  const { t } = useLanguage();
  const { navigate } = useAppState();

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-24 flex flex-col items-center gap-4 text-center">
      <span className="material-symbols-outlined text-red-600 text-5xl">search_off</span>
      <h1 className="text-2xl font-black text-slate-900">{t.common.notFoundTitle}</h1>
      <p className="text-sm text-slate-600">{t.common.notFoundDesc}</p>
      <button
        onClick={() => navigate('emergency-hub')}
        className="mt-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer"
      >
        {t.common.backHome}
      </button>
    </div>
  );
}
