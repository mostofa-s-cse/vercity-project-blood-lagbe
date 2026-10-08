import React, { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenId } from '../types/blood';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { safeNextPath } from '../lib/safeRedirect';

interface SignInScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-base font-medium text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-colors';
const labelClass = 'block text-sm font-bold text-slate-800 mb-1.5';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SignInScreen: React.FC<SignInScreenProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const uid = useId();
  const router = useRouter();
  const { configured, loading, user, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  const nextPath = () => safeNextPath(new URLSearchParams(window.location.search).get('next'), window.location.pathname);

  // Already signed in: go straight to where they were headed.
  useEffect(() => {
    if (!loading && user) router.replace(nextPath());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  if (!configured) return null;
  if (loading || user) return null;

  const errorText = (code: string): string =>
    (t.auth.errors as Record<string, string>)[code] ?? t.auth.errors.sign_in_failed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setFormError(t.auth.invalidEmail);
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setFormError(t.auth.passwordsDontMatch);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const result = await signUpWithEmail(trimmedEmail, password, nextPath());
        if (result.error) {
          setFormError(errorText(result.error));
          return;
        }
        if (result.needsEmailConfirmation) {
          setNeedsEmailConfirmation(true);
          return;
        }
        router.replace(nextPath());
      } else {
        const result = await signInWithEmail(trimmedEmail, password);
        if (result.error) {
          setFormError(errorText(result.error));
          return;
        }
        router.replace(nextPath());
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (needsEmailConfirmation) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <span className="material-symbols-outlined text-emerald-600 text-5xl">mark_email_read</span>
        <h1 className="text-2xl font-black text-slate-900">{t.auth.checkEmailTitle}</h1>
        <p className="text-sm text-slate-600">{t.auth.checkEmailDesc}</p>
        <button
          onClick={() => onNavigate('emergency-hub')}
          className="mt-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
        >
          {t.auth.backHome}
        </button>
      </div>
    );
  }

  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;
  const confirmId = `${uid}-confirm`;

  return (
    <div className="w-full max-w-md mx-auto px-4 py-10 sm:py-16 flex flex-col gap-5">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg">
        <h1 className="text-2xl font-black text-slate-900 text-center">
          {mode === 'signin' ? t.auth.signInTitle : t.auth.signUpTitle}
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor={emailId} className={labelClass}>
              {t.auth.emailLabel}
            </label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              placeholder={t.auth.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor={passwordId} className={labelClass}>
              {t.auth.passwordLabel}
            </label>
            <input
              id={passwordId}
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label htmlFor={confirmId} className={labelClass}>
                {t.auth.confirmPasswordLabel}
              </label>
              <input
                id={confirmId}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => onNavigate('forgot-password')}
              className="self-end text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer"
            >
              {t.auth.forgotPasswordLink}
            </button>
          )}

          {formError && <p className="text-xs font-semibold text-red-600">{formError}</p>}

          <button
            type="submit"
            disabled={submitting || !email || !password}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-extrabold text-sm transition-colors cursor-pointer"
          >
            {mode === 'signin' ? t.auth.signInSubmit : t.auth.signUpSubmit}
          </button>
        </form>

        <div className="mt-5 flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="h-px flex-1 bg-slate-200" />
          <span>{t.auth.orDivider}</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          onClick={() => void signInWithGoogle(nextPath())}
          className="mt-5 w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-bold text-slate-700 shadow-sm transition-colors cursor-pointer"
        >
          <svg aria-hidden="true" viewBox="0 0 48 48" className="h-4 w-4">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
            <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
          </svg>
          <span>{t.auth.continueWithGoogle}</span>
        </button>

        <button
          onClick={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
            setFormError(null);
          }}
          className="mt-5 w-full text-center text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          {mode === 'signin' ? t.auth.switchToSignUp : t.auth.switchToSignIn}
        </button>
      </div>
    </div>
  );
};
