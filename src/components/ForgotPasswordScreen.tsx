import React, { useId, useState } from 'react';
import { ScreenId } from '../types/blood';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { screenPath } from '../utils/routes';

interface ForgotPasswordScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-base font-medium text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-colors';
const labelClass = 'block text-sm font-bold text-slate-800 mb-1.5';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const uid = useId();
  const { configured, requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  if (!configured) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setFormError(t.auth.invalidEmail);
      return;
    }
    setSubmitting(true);
    try {
      await requestPasswordReset(trimmedEmail, screenPath('reset-password', language));
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-10 sm:py-16 flex flex-col gap-5">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg">
        {sent ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="material-symbols-outlined text-emerald-600 text-5xl">mark_email_read</span>
            <h1 className="text-2xl font-black text-slate-900">{t.auth.forgotPasswordSentTitle}</h1>
            <p className="text-sm text-slate-600">{t.auth.forgotPasswordSentDesc}</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-black text-slate-900 text-center">{t.auth.forgotPasswordTitle}</h1>
            <p className="text-sm text-slate-600 text-center mt-2">{t.auth.forgotPasswordDesc}</p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div>
                <label htmlFor={`${uid}-email`} className={labelClass}>
                  {t.auth.emailLabel}
                </label>
                <input
                  id={`${uid}-email`}
                  type="email"
                  autoComplete="email"
                  placeholder={t.auth.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              {formError && <p className="text-xs font-semibold text-red-600">{formError}</p>}

              <button
                type="submit"
                disabled={submitting || !email}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-extrabold text-sm transition-colors cursor-pointer"
              >
                {t.auth.forgotPasswordSubmit}
              </button>
            </form>
          </>
        )}

        <button
          onClick={() => onNavigate('sign-in')}
          className="mt-5 w-full text-center text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          {t.auth.backToSignIn}
        </button>
      </div>
    </div>
  );
};
