import React, { useEffect, useRef, useState } from 'react';
import { ScreenId } from '../types/blood';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface AuthButtonProps {
  onNavigate: (screen: ScreenId) => void;
}

/** "Sign in" (goes to the sign-in screen) / a signed-in person's avatar, opening a menu with Sign out.
 *  Renders nothing until Supabase is configured. */
export const AuthButton: React.FC<AuthButtonProps> = ({ onNavigate }) => {
  const { configured, loading, user, signOut } = useAuth();
  const { t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOnOutsideOrEscape = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideOrEscape);
    document.addEventListener('keydown', closeOnOutsideOrEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideOrEscape);
      document.removeEventListener('keydown', closeOnOutsideOrEscape);
    };
  }, [isMenuOpen]);

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
  const avatar = user.avatarUrl ? (
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
  );

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        onClick={() => setIsMenuOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        className="flex items-center gap-2 rounded-xl p-1 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        {avatar}
        <span className="hidden max-w-[8rem] truncate text-xs font-bold text-slate-700 xl:inline">{label}</span>
        <span className="material-symbols-outlined text-base text-slate-400">expand_more</span>
      </button>

      {isMenuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-lg py-1.5 z-50"
        >
          <p className="px-3 py-1.5 text-xs font-bold text-slate-700 truncate xl:hidden">{label}</p>
          <button
            role="menuitem"
            onClick={() => {
              setIsMenuOpen(false);
              void signOut();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            {t.header.signOut}
          </button>
        </div>
      )}
    </div>
  );
};
