import React, { useEffect, useId, useRef, useState } from 'react';
import { ScreenId } from '../types/blood';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { downscaleImage } from '../utils/downscaleImage';

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
  const { configured, loading, user, updateAccount, updatePassword, updateAvatar, removeAvatar } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

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

  const photoErrorText = (code: string) => {
    if (code === 'too_large') return t.account.errors.photoTooLarge;
    if (code === 'unsupported_type' || code === 'process_failed' || code === 'empty') return t.account.errors.photoUnsupported;
    if (code === 'not_configured') return t.account.errors.photoUnavailable;
    return errorText(code);
  };

  const onPhotoChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // so choosing the same file again still fires
    if (!file || photoBusy) return;
    setPhotoBusy(true);
    setPhotoMessage(null);
    const { error } = await updateAvatar(await downscaleImage(file));
    setPhotoBusy(false);
    setPhotoMessage(error ? { kind: 'error', text: photoErrorText(error) } : { kind: 'ok', text: t.account.photoSaved });
  };

  const onPhotoRemove = async () => {
    if (photoBusy) return;
    setPhotoBusy(true);
    setPhotoMessage(null);
    const { error } = await removeAvatar();
    setPhotoBusy(false);
    setPhotoMessage(error ? { kind: 'error', text: photoErrorText(error) } : { kind: 'ok', text: t.account.photoRemoved });
  };

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

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-slate-200" />
        ) : (
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-slate-900 text-2xl font-black text-white">
            {((user.name ?? user.email ?? '?')[0] ?? '?').toUpperCase()}
          </span>
        )}
        <div className="flex flex-col gap-2 min-w-0">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">{t.account.photoTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.account.photoHint}</p>
          </div>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhotoChosen} className="hidden" aria-label={t.account.choosePhoto} />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={photoBusy} onClick={() => fileInput.current?.click()} className={buttonClass}>
              {photoBusy ? t.account.uploading : user.avatarUrl ? t.account.changePhoto : t.account.choosePhoto}
            </button>
            {user.avatarUrl && (
              <button
                type="button"
                disabled={photoBusy}
                onClick={onPhotoRemove}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-sm font-bold transition-colors cursor-pointer"
              >
                {t.account.removePhoto}
              </button>
            )}
          </div>
          {note(photoMessage)}
        </div>
      </section>

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
