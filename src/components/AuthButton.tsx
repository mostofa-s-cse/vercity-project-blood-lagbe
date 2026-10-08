import React from 'react';
import { ScreenId } from '../types/blood';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface AuthButtonProps {
  onNavigate: (screen: ScreenId) => void;
}

/** "Sign in" (goes to the sign-in screen) / sign out. Renders nothing until Supabase is configured. */
export const AuthButton: React.FC<AuthButtonProps> = ({ onNavigate }) => {
  const { configured, loading, user, signOut } = useAuth();
  const { t } = useLanguage();

  if (!configured || loading) return null;

  if (!user) {
    return (
      <button
        onClick={() => onNavigate('sign-in')}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 shadow-sm transition-colors shrink-0 cursor-pointer"
      >
        <span className="material-symbols-outlined text-base">login</span>
        <span>{t.header.signIn}</span>
      </button>
    );
  }

  const label = user.name ?? user.email ?? '';
  return (
    <div className="flex items-center gap-2 shrink-0">
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={label}
          referrerPolicy="no-referrer"
          className="h-8 w-8 rounded-full object-cover ring-2 ring-slate-200"
        />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
          {(label[0] ?? '?').toUpperCase()}
        </span>
      )}
      <span className="hidden max-w-[8rem] truncate text-xs font-bold text-slate-700 xl:inline">{label}</span>
      <button
        onClick={() => void signOut()}
        title={t.header.signOut}
        aria-label={t.header.signOut}
        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-base">logout</span>
        <span className="hidden sm:inline">{t.header.signOut}</span>
      </button>
    </div>
  );
};
