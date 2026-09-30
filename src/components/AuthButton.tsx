import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

/** Sign in with Google / sign out. Renders nothing until Supabase is configured. */
export const AuthButton: React.FC = () => {
  const { configured, loading, user, signInWithGoogle, signOut } = useAuth();
  const { t } = useLanguage();

  if (!configured || loading) return null;

  if (!user) {
    return (
      <button
        onClick={() => void signInWithGoogle()}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 shadow-sm transition-colors shrink-0 cursor-pointer"
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" className="h-4 w-4">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
          <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
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
