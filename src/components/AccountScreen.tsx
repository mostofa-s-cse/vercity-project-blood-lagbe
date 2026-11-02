import React, { useEffect, useId, useState } from 'react';
import { ScreenId } from '../types/blood';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface AccountScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-base font-medium text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-colors';
const labelClass = 'block text-sm font-bold text-slate-800 mb-1.5';
const buttonClass =
  'px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors cursor-pointer';

/** The signed-in person edits their own name, phone and email, and sets a password. */
export const AccountScreen: React.FC<AccountScreenProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const uid = useId();
  const { configured, loading, user, updateAccount, updatePassword } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Fill the form from the account once it is known (and again after a save refreshes it).
  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setPhone(user.phone ?? '');
    setEmail(user.email ?? '');
  }, [user]);

  // The proxy already sends signed-out people to sign-in; without Supabase (demo mode) there is no account.
  if (!configured || loading || !user) return null;

  const errorText = (code: string) => (t.account.errors as Record<string, string>)[code] ?? t.account.errors.generic;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    // Only what changed is sent, so an untouched field is never rewritten.
    const update: { name?: string; phone?: string; email?: string } = {};
    if (name.trim() !== (user.name ?? '')) update.name = name;
    if (phone.trim() !== (user.phone ?? '')) update.phone = phone;
    if (email.trim().toLowerCase() !== (user.email ?? '').toLowerCase()) update.email = email;
    if (Object.keys(update).length === 0) {
      setMessage({ kind: 'ok', text: t.account.nothingChanged });
      return;
    }
    setSaving(true);
    setMessage(null);
    const { error } = await updateAccount(update);
    setSaving(false);
    setMessage(error ? { kind: 'error', text: errorText(error) } : { kind: 'ok', text: t.account.saved });
  };

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingPassword) return;
    if (password.length < 6) return setPasswordMessage({ kind: 'error', text: t.account.errors.passwordShort });
    if (password !== confirm) return setPasswordMessage({ kind: 'error', text: t.account.errors.passwordMismatch });
    setSavingPassword(true);
    setPasswordMessage(null);
    const { error } = await updatePassword(password);
    setSavingPassword(false);
    if (error) return setPasswordMessage({ kind: 'error', text: error === 'weak_password' ? t.auth.errors.weak_password : t.account.errors.generic });
    setPassword('');
    setConfirm('');
    setPasswordMessage({ kind: 'ok', text: t.account.passwordSaved });
  };

  const note = (m: { kind: 'ok' | 'error'; text: string } | null) =>
    m && (
      <p role={m.kind === 'error' ? 'alert' : 'status'} className={`text-sm font-semibold ${m.kind === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>
        {m.text}
      </p>
    );

  return (
    <div className="w-full max-w-xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <span className="material-symbols-outlined text-red-600 text-2xl">manage_accounts</span>
          {t.account.title}
        </h1>
        <p className="text-xs text-slate-500 mt-1">{t.account.subtitle}</p>
      </div>

      <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor={`${uid}-name`} className={labelClass}>{t.account.nameLabel}</label>
          <input id={`${uid}-name`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputClass} />
        </div>
        <div>
          <label htmlFor={`${uid}-phone`} className={labelClass}>
            {t.account.phoneLabel} <span className="font-normal text-slate-400">({t.account.optional})</span>
          </label>
          <input id={`${uid}-phone`} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" className={inputClass} />
          {!user.phone && <p className="text-xs text-slate-500 mt-1">{t.account.phoneMissing}</p>}
        </div>
        <div>
          <label htmlFor={`${uid}-email`} className={labelClass}>
            {t.account.emailLabel} <span className="font-normal text-slate-400">({t.account.optional})</span>
          </label>
          <input id={`${uid}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={inputClass} />
          <p className="text-xs text-slate-500 mt-1">{user.email ? t.account.emailHint : t.account.emailMissing}</p>
        </div>
        {note(message)}
        <div>
          <button type="submit" disabled={saving} className={buttonClass}>
            {saving ? t.account.saving : t.account.save}
          </button>
        </div>
      </form>

      <form onSubmit={submitPassword} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4" noValidate>
        <div>
          <h2 className="text-base font-extrabold text-slate-900">{t.account.passwordTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.account.passwordHint}</p>
        </div>
        <div>
          <label htmlFor={`${uid}-pw`} className={labelClass}>{t.account.newPassword}</label>
          <input id={`${uid}-pw`} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={inputClass} />
        </div>
        <div>
          <label htmlFor={`${uid}-pw2`} className={labelClass}>{t.account.confirmPassword}</label>
          <input id={`${uid}-pw2`} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={inputClass} />
        </div>
        {note(passwordMessage)}
        <div>
          <button type="submit" disabled={savingPassword} className={buttonClass}>
            {savingPassword ? t.account.saving : t.account.savePassword}
          </button>
        </div>
      </form>
      <button type="button" onClick={() => onNavigate('emergency-hub')} className="self-start text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer">
        ← {t.common.backHome}
      </button>
    </div>
  );
};
