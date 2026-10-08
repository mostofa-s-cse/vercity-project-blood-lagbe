import React, { useId, useState } from 'react';
import { ScreenId } from '../types/blood';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface ResetPasswordScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-base font-medium text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-colors';
const labelClass = 'block text-sm font-bold text-slate-800 mb-1.5';

/**
 * Where a password-reset email's link lands (via `/auth/callback?next=/reset-password`). Supabase's
 * code exchange already turned that link's one-time code into a short-lived "recovery" session by the
 * time this screen mounts — the same session shape as a normal sign-in, so `user` present is treated as
 * "has a valid session to update". Opened directly (no `user`), it shows an explanatory message instead
 * of a broken form.
 */
export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const uid = useId();
  const { configured, loading, user, updatePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!configured) return null;
  if (loading) return null;

  if (!user && !done) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <span className="material-symbols-outlined text-amber-600 text-5xl">error</span>
        <h1 className="text-2xl font-black text-slate-900">{t.auth.resetPasswordNoSessionTitle}</h1>
        <p className="text-sm text-slate-600">{t.auth.resetPasswordNoSessionDesc}</p>
        <button
          onClick={() => onNavigate('forgot-password')}
          className="mt-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer"
        >
          {t.auth.requestNewLink}
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <span className="material-symbols-outlined text-emerald-600 text-5xl">verified</span>
        <h1 className="text-2xl font-black text-slate-900">{t.auth.resetPasswordDoneTitle}</h1>
        <p className="text-sm text-slate-600">{t.auth.resetPasswordDoneDesc}</p>
        <button
          onClick={() => onNavigate('emergency-hub')}
          className="mt-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
        >
          {t.auth.backHome}
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (password !== confirmPassword) {
      setFormError(t.auth.passwordsDontMatch);
      return;
    }
    setSubmitting(true);
    try {
      const result = await updatePassword(password);
      if (result.error) {
        setFormError((t.auth.errors as Record<string, string>)[result.error] ?? t.auth.errors.update_password_failed);
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-10 sm:py-16 flex flex-col gap-5">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg">
        <h1 className="text-2xl font-black text-slate-900 text-center">{t.auth.resetPasswordTitle}</h1>
        <p className="text-sm text-slate-600 text-center mt-2">{t.auth.resetPasswordDesc}</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor={`${uid}-password`} className={labelClass}>
              {t.auth.newPasswordLabel}
            </label>
            <input
              id={`${uid}-password`}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor={`${uid}-confirm`} className={labelClass}>
              {t.auth.confirmPasswordLabel}
            </label>
            <input
              id={`${uid}-confirm`}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {formError && <p className="text-xs font-semibold text-red-600">{formError}</p>}

          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-extrabold text-sm transition-colors cursor-pointer"
          >
            {t.auth.resetPasswordSubmit}
          </button>
        </form>
      </div>
    </div>
  );
};
