'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { SAMPLE_HOSPITAL_ORGS } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';
import type { GrantDto } from '../lib/grantDto';

type Role = 'admin' | 'hospital';

interface RolesResponse {
  available: { database: boolean; serviceKey: boolean };
  grants: GrantDto[];
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; code: string }
  | { kind: 'ready'; data: RolesResponse };

type Message = { tone: 'success' | 'error'; text: string } | null;

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function looksLikeEmail(value: string): boolean {
  const at = value.indexOf('@');
  return at > 0 && value.indexOf('.', at) > at + 1 && !value.endsWith('.');
}

/** Admin Panel "Access" tab: give people the admin or hospital role by email, and take it away. */
export const AdminRolesPanel: React.FC = () => {
  const { t } = useLanguage();
  const a = t.admin.access;

  const [load, setLoad] = useState<LoadState>({ kind: 'loading' });
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('hospital');
  const [hospitalId, setHospitalId] = useState(SAMPLE_HOSPITAL_ORGS[0]?.id ?? '');
  const [sending, setSending] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);

  const refresh = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoad({ kind: 'loading' });
    try {
      const response = await fetch('/api/admin/roles', { cache: 'no-store' });
      const body = await readJson(response);
      if (!response.ok) {
        setLoad({ kind: 'error', code: typeof body.error === 'string' ? body.error : 'load_failed' });
        return;
      }
      setLoad({ kind: 'ready', data: body as unknown as RolesResponse });
    } catch {
      setLoad({ kind: 'error', code: 'network' });
    }
  }, []);

  useEffect(() => {
    // Load once when the tab opens (the initial state already shows the spinner).
    void refresh(false);
  }, [refresh]);

  const hospitalName = (id: string | null): string => {
    if (!id) return '';
    const hospital = SAMPLE_HOSPITAL_ORGS.find((h) => h.id === id);
    return hospital ? `${hospital.name} (${hospital.shortCode})` : id;
  };

  const errorText = (code: string, field?: unknown): string => {
    switch (code) {
      case 'sign_in_required':
        return a.errors.signInRequired;
      case 'forbidden':
        return a.errors.forbidden;
      case 'invalid_input':
        if (field === 'email') return a.errors.invalidEmail;
        if (field === 'role') return a.errors.invalidRole;
        if (field === 'hospitalId') return a.errors.invalidHospital;
        return a.errors.generic;
      case 'service_key_missing':
        return a.errors.serviceKeyMissing;
      case 'database_not_configured':
        return a.errors.databaseNotConfigured;
      case 'cannot_revoke_self':
        return a.errors.cannotRevokeSelf;
      case 'not_found':
        return a.errors.notFound;
      case 'load_failed':
        return a.errors.loadFailed;
      case 'network':
        return a.errors.network;
      default:
        return a.errors.generic;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!looksLikeEmail(trimmed)) {
      setMessage({ tone: 'error', text: a.errors.invalidEmail });
      return;
    }
    if (role === 'hospital' && !hospitalId) {
      setMessage({ tone: 'error', text: a.errors.invalidHospital });
      return;
    }

    setSending(true);
    setMessage(null);
    try {
      const payload = role === 'hospital' ? { email: trimmed, role, hospitalId } : { email: trimmed, role };
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await readJson(response);
      if (!response.ok) {
        setMessage({ tone: 'error', text: errorText(typeof body.error === 'string' ? body.error : '', body.field) });
        return;
      }
      const status = body.status === 'active' ? 'active' : 'pending';
      setMessage({
        tone: 'success',
        text: `${a.success.given(trimmed)} ${status === 'active' ? a.success.active : a.success.pending}`,
      });
      setEmail('');
      setRole('hospital');
      setHospitalId(SAMPLE_HOSPITAL_ORGS[0]?.id ?? '');
      await refresh(false);
    } catch {
      setMessage({ tone: 'error', text: a.errors.network });
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (grant: GrantDto) => {
    if (!window.confirm(a.list.confirmRevoke(grant.email))) return;
    setRevokingId(grant.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/roles/${encodeURIComponent(grant.id)}`, { method: 'DELETE' });
      const body = await readJson(response);
      if (!response.ok) {
        const code = typeof body.error === 'string' ? body.error : '';
        setMessage({ tone: 'error', text: errorText(code) });
        if (code === 'not_found') await refresh(false);
        return;
      }
      setMessage({ tone: 'success', text: a.list.revoked(grant.email) });
      await refresh(false);
    } catch {
      setMessage({ tone: 'error', text: a.errors.network });
    } finally {
      setRevokingId(null);
    }
  };

  const formatDate = (iso: string): string => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString();
  };

  const inputClass =
    'w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-60';

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-600">admin_panel_settings</span>
          <span>{a.title}</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">{a.desc}</p>
      </div>

      <div aria-live="polite" className={message ? undefined : 'sr-only'}>
        {message && (
          <div
            role={message.tone === 'error' ? 'alert' : 'status'}
            className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
              message.tone === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {message.tone === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="flex-1">{message.text}</span>
            <button
              type="button"
              onClick={() => setMessage(null)}
              aria-label={a.dismiss}
              className="opacity-70 hover:opacity-100 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}
      </div>

      {load.kind === 'loading' && (
        <p className="text-xs text-slate-500 flex items-center gap-2">
          <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
          {a.loading}
        </p>
      )}

      {load.kind === 'error' && (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs font-semibold text-rose-800">{errorText(load.code)}</p>
          <button
            type="button"
            onClick={() => void refresh(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            <span>{a.retry}</span>
          </button>
        </div>
      )}

      {load.kind === 'ready' && !load.data.available.database && (
        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-xs text-amber-900 flex items-start gap-2">
          <span className="material-symbols-outlined text-base">database_off</span>
          <span>{a.noDatabase}</span>
        </div>
      )}

      {load.kind === 'ready' && load.data.available.database && (
        <>
          {!load.data.available.serviceKey && (
            <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-xs text-amber-900 flex items-start gap-2">
              <span className="material-symbols-outlined text-base">key_off</span>
              <span>{a.noServiceKey}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            noValidate
            className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col gap-4"
          >
            <h3 className="text-sm font-extrabold text-slate-900">{a.form.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="access-email" className="text-[11px] font-bold text-slate-600">
                  {a.form.emailLabel}
                </label>
                <input
                  id="access-email"
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={a.form.emailPlaceholder}
                  disabled={sending}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="access-role" className="text-[11px] font-bold text-slate-600">
                  {a.form.roleLabel}
                </label>
                <select
                  id="access-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  disabled={sending}
                  className={inputClass}
                >
                  <option value="hospital">{a.roles.hospital}</option>
                  <option value="admin">{a.roles.admin}</option>
                </select>
              </div>
              {role === 'hospital' && (
                <div className="flex flex-col gap-1">
                  <label htmlFor="access-hospital" className="text-[11px] font-bold text-slate-600">
                    {a.form.hospitalLabel}
                  </label>
                  <select
                    id="access-hospital"
                    value={hospitalId}
                    onChange={(e) => setHospitalId(e.target.value)}
                    disabled={sending}
                    className={inputClass}
                  >
                    {SAMPLE_HOSPITAL_ORGS.map((hospital) => (
                      <option key={hospital.id} value={hospital.id}>
                        {hospital.name} ({hospital.shortCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {role === 'admin' ? a.form.adminHint : a.form.hospitalHint} {a.form.googleHint}
            </p>
            <div>
              <button
                type="submit"
                disabled={sending || !load.data.available.serviceKey}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-base">
                  {sending ? 'progress_activity' : 'person_add'}
                </span>
                <span>{sending ? a.form.sending : a.form.submit}</span>
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-extrabold text-slate-900">
              {a.list.title(load.data.grants.length)}
            </h3>
            {load.data.grants.length === 0 ? (
              <p className="p-4 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500 text-center">
                {a.list.empty}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {load.data.grants.map((grant) => (
                  <li
                    key={grant.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm break-all">{grant.email}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                            grant.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {grant.role === 'admin' ? a.roles.admin : a.roles.hospital}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                            grant.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {grant.status === 'active' ? a.list.statusActive : a.list.statusPending}
                        </span>
                      </div>
                      {grant.role === 'hospital' && (
                        <span className="text-[11px] text-slate-600">
                          {a.list.hospital} <span className="font-semibold">{hospitalName(grant.hospitalId)}</span>
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {a.list.givenBy(grant.grantedBy ?? a.list.unknown, formatDate(grant.createdAt))}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRevoke(grant)}
                      disabled={revokingId !== null}
                      aria-label={a.list.revokeLabel(grant.email)}
                      className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed text-rose-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start md:self-auto shrink-0"
                    >
                      <span className="material-symbols-outlined text-base">
                        {revokingId === grant.id ? 'progress_activity' : 'person_remove'}
                      </span>
                      <span>{revokingId === grant.id ? a.list.revoking : a.list.revoke}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminRolesPanel;
