import React from 'react';
import { useRouter } from 'next/navigation';
import { ScreenId } from '../types/blood';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { safeNextPath } from '../lib/safeRedirect';
import { localizedPath } from '../utils/routes';

interface NoAccessScreenProps {
  need: 'admin' | 'user';
  onNavigate: (screen: ScreenId) => void;
}

/** Shown when someone opens a page they may not see (the proxy sends them here). */
export const NoAccessScreen: React.FC<NoAccessScreenProps> = ({ need, onNavigate }) => {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { configured, loading, user, signOut } = useAuth();
  const a = t.access;

  // The sign-in screen (email/password or Google), not straight into Google — go back to the page
  // they were trying to open once they're actually signed in.
  const signIn = () => {
    const from = new URLSearchParams(window.location.search).get('from');
    const next = safeNextPath(from, window.location.pathname);
    router.push(`${localizedPath(language, '/sign-in')}?next=${encodeURIComponent(next)}`);
  };

  const title = need === 'admin' ? a.adminTitle : a.userTitle;
  let message: string = need === 'admin' ? a.adminDesc : a.userDesc;
  let action: 'signIn' | 'signOut' | null = null;

  if (!configured) {
    if (need === 'admin') message = a.adminUnavailable;
  } else if (!loading) {
    if (!user) action = 'signIn';
    else if (need === 'admin') {
      message = a.adminNotAdmin(user.name ?? user.email ?? '');
      action = 'signOut';
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-24 flex flex-col items-center gap-4 text-center">
      <span className="material-symbols-outlined text-red-600 text-5xl">{need === 'admin' ? 'shield_lock' : 'lock'}</span>
      <h1 className="text-2xl font-black text-slate-900">{title}</h1>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        {action === 'signIn' && (
          <button
            onClick={signIn}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            {t.header.signIn}
          </button>
        )}
        {action === 'signOut' && (
          <button
            onClick={() => void signOut()}
            className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            {t.header.signOut}
          </button>
        )}
        <button
          onClick={() => onNavigate('emergency-hub')}
          className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
        >
          {t.common.backHome}
        </button>
      </div>
    </div>
  );
};
