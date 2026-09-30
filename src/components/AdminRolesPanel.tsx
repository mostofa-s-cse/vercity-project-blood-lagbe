'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { SAMPLE_HOSPITAL_ORGS } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';
import type { GrantDto, RoleDto } from '../lib/grantDto';
import { PERMISSION_GROUPS, normalizePermissions, type Permission } from '../lib/permissions';
import type { Admin } from '../locales/en/admin';

type Available = { database: boolean; serviceKey: boolean };

interface PanelData {
  available: Available;
  roles: RoleDto[];
  grants: GrantDto[];
}

type LoadState = { kind: 'loading' } | { kind: 'error'; code: string } | { kind: 'ready'; data: PanelData };

type Message = { tone: 'success' | 'error'; text: string } | null;

type Section = 'roles' | 'people';

/** The role being created or edited: `role` is null for a new one. */
type Editor = { role: RoleDto | null } | null;

/** Which locale entry describes each permission. */
const PERMISSION_TEXT: Record<Permission, keyof Admin['access']['permissions']> = {
  'panel.open': 'panelOpen',
  'panel.alerts': 'panelAlerts',
  'panel.donors': 'panelDonors',
  'panel.requests': 'panelRequests',
  'panel.hospitals': 'panelHospitals',
  'panel.fraud': 'panelFraud',
  'panel.logs': 'panelLogs',
  'roles.manage': 'rolesManage',
  'ops.command': 'opsCommand',
  'stock.own': 'stockOwn',
  'stock.all': 'stockAll',
  'camps.create': 'campsCreate',
};

const NAME_MIN = 2;
const NAME_MAX = 40;
const DESCRIPTION_MAX = 200;

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function errorCode(body: Record<string, unknown>): string {
  return typeof body.error === 'string' ? body.error : '';
}

function looksLikeEmail(value: string): boolean {
  const at = value.indexOf('@');
  return at > 0 && value.indexOf('.', at) > at + 1 && !value.endsWith('.');
}

/** `panel.open` is added by the server whenever another admin-panel permission is chosen; show it ticked and locked then. */
function panelOpenForced(chosen: readonly Permission[]): boolean {
  return normalizePermissions(chosen.filter((p) => p !== 'panel.open')).includes('panel.open');
}

/** Admin Panel "Access" tab: create roles (a name and a choice of permissions) and give them to people by email. */
export const AdminRolesPanel: React.FC = () => {
  const { t } = useLanguage();
  const a = t.admin.access;

  const [load, setLoad] = useState<LoadState>({ kind: 'loading' });
  const [section, setSection] = useState<Section>('roles');
  const [message, setMessage] = useState<Message>(null);
  /** What is being sent right now ('role-form', 'grant', 'delete:<id>', 'revoke:<id>'), or null. */
  const [busy, setBusy] = useState<string | null>(null);

  // Role form
  const [editor, setEditor] = useState<Editor>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);

  // Grant form
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [hospitalId, setHospitalId] = useState(SAMPLE_HOSPITAL_ORGS[0]?.id ?? '');

  const refresh = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoad({ kind: 'loading' });
    try {
      const [rolesResponse, grantsResponse] = await Promise.all([
        fetch('/api/admin/roles', { cache: 'no-store' }),
        fetch('/api/admin/grants', { cache: 'no-store' }),
      ]);
      const [rolesBody, grantsBody] = await Promise.all([readJson(rolesResponse), readJson(grantsResponse)]);
      if (!rolesResponse.ok || !grantsResponse.ok) {
        const failed = !rolesResponse.ok ? rolesBody : grantsBody;
        setLoad({ kind: 'error', code: errorCode(failed) || 'load_failed' });
        return;
      }
      setLoad({
        kind: 'ready',
        data: {
          available: (rolesBody.available as Available) ?? { database: false, serviceKey: false },
          roles: Array.isArray(rolesBody.roles) ? (rolesBody.roles as RoleDto[]) : [],
          grants: Array.isArray(grantsBody.grants) ? (grantsBody.grants as GrantDto[]) : [],
        },
      });
    } catch {
      setLoad({ kind: 'error', code: 'network' });
    }
  }, []);

  useEffect(() => {
    // Load once when the tab opens (the initial state already shows the spinner).
    void refresh(false);
  }, [refresh]);

  const errorText = (code: string, field?: unknown): string => {
    switch (code) {
      case 'sign_in_required':
        return a.errors.signInRequired;
      case 'forbidden':
        return a.errors.forbidden;
      case 'load_failed':
        return a.errors.loadFailed;
      case 'network':
        return a.errors.network;
      case 'invalid_input':
        if (field === 'name') return a.errors.nameLength;
        if (field === 'description') return a.errors.descriptionTooLong;
        if (field === 'permissions') return a.errors.permissionsRequired;
        if (field === 'email') return a.errors.invalidEmail;
        if (field === 'roleId') return a.errors.invalidRole;
        if (field === 'hospitalId') return a.errors.invalidHospital;
        return a.errors.generic;
      case 'hospital_required':
        return a.errors.hospitalRequired;
      case 'role_not_found':
        return a.errors.roleNotFound;
      case 'name_taken':
        return a.errors.nameTaken;
      case 'system_role_locked':
        return a.errors.systemRoleLocked;
      case 'role_in_use':
        return a.errors.roleInUse;
      case 'service_key_missing':
        return a.errors.serviceKeyMissing;
      case 'database_not_configured':
        return a.errors.databaseNotConfigured;
      case 'cannot_revoke_self':
        return a.errors.cannotRevokeSelf;
      case 'not_found':
        return a.errors.notFound;
      default:
        return a.errors.generic;
    }
  };

  /** Errors after which the lists are out of date. */
  const STALE_CODES = ['not_found', 'role_not_found', 'role_in_use', 'name_taken'];

  const hospitalName = (id: string | null): string => {
    if (!id) return '';
    const hospital = SAMPLE_HOSPITAL_ORGS.find((h) => h.id === id);
    return hospital ? `${hospital.name} (${hospital.shortCode})` : id;
  };

  const formatDate = (iso: string): string => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString();
  };

  // ---------- Roles ----------

  const openEditor = (role: RoleDto | null) => {
    setEditor({ role });
    setRoleName(role?.name ?? '');
    setRoleDescription(role?.description ?? '');
    setRolePermissions(normalizePermissions(role?.permissions ?? []));
    setMessage(null);
  };

  const closeEditor = () => {
    setEditor(null);
    setRoleName('');
    setRoleDescription('');
    setRolePermissions([]);
  };

  const togglePermission = (permission: Permission) => {
    setRolePermissions((current) =>
      current.includes(permission) ? current.filter((p) => p !== permission) : [...current, permission]
    );
  };

  const handleRoleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editor) return;
    const name = roleName.trim();
    const description = roleDescription.trim();
    const permissions = normalizePermissions(rolePermissions);
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      setMessage({ tone: 'error', text: a.errors.nameLength });
      return;
    }
    if (description.length > DESCRIPTION_MAX) {
      setMessage({ tone: 'error', text: a.errors.descriptionTooLong });
      return;
    }
    if (permissions.length === 0) {
      setMessage({ tone: 'error', text: a.errors.permissionsRequired });
      return;
    }

    const editing = editor.role;
    setBusy('role-form');
    setMessage(null);
    try {
      const response = await fetch(editing ? `/api/admin/roles/${encodeURIComponent(editing.id)}` : '/api/admin/roles', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || undefined, permissions }),
      });
      const body = await readJson(response);
      if (!response.ok) {
        const code = errorCode(body);
        setMessage({ tone: 'error', text: errorText(code, body.field) });
        if (STALE_CODES.includes(code)) await refresh(false);
        return;
      }
      let text = editing ? a.roles.updated(name) : a.roles.created(name);
      const propagated = body.propagated as { updated?: number; failed?: number } | undefined;
      const updated = propagated?.updated ?? 0;
      const failed = propagated?.failed ?? 0;
      if (editing && updated + failed > 0) text = `${text} ${a.roles.propagated(updated, failed)}`;
      setMessage({ tone: failed > 0 ? 'error' : 'success', text });
      closeEditor();
      await refresh(false);
    } catch {
      setMessage({ tone: 'error', text: a.errors.network });
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteRole = async (role: RoleDto) => {
    if (!window.confirm(a.roles.confirmDelete(role.name))) return;
    setBusy(`delete:${role.id}`);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/roles/${encodeURIComponent(role.id)}`, { method: 'DELETE' });
      const body = await readJson(response);
      if (!response.ok) {
        const code = errorCode(body);
        setMessage({ tone: 'error', text: errorText(code) });
        if (STALE_CODES.includes(code)) await refresh(false);
        return;
      }
      if (editor?.role?.id === role.id) closeEditor();
      if (roleId === role.id) setRoleId('');
      setMessage({ tone: 'success', text: a.roles.deleted(role.name) });
      await refresh(false);
    } catch {
      setMessage({ tone: 'error', text: a.errors.network });
    } finally {
      setBusy(null);
    }
  };

  // ---------- People ----------

  const handleGrantSubmit = async (event: React.FormEvent, roles: RoleDto[]) => {
    event.preventDefault();
    const trimmed = email.trim();
    const role = roles.find((r) => r.id === roleId);
    if (!looksLikeEmail(trimmed)) {
      setMessage({ tone: 'error', text: a.errors.invalidEmail });
      return;
    }
    if (!role) {
      setMessage({ tone: 'error', text: a.errors.invalidRole });
      return;
    }
    if (role.needsHospital && !hospitalId) {
      setMessage({ tone: 'error', text: a.errors.hospitalRequired });
      return;
    }

    setBusy('grant');
    setMessage(null);
    try {
      const payload = role.needsHospital ? { email: trimmed, roleId: role.id, hospitalId } : { email: trimmed, roleId: role.id };
      const response = await fetch('/api/admin/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await readJson(response);
      if (!response.ok) {
        const code = errorCode(body);
        setMessage({ tone: 'error', text: errorText(code, body.field) });
        if (STALE_CODES.includes(code)) await refresh(false);
        return;
      }
      const statusText = body.status === 'active' ? `${a.people.active} ${a.people.signOutReminder}` : a.people.pending;
      setMessage({ tone: 'success', text: `${a.people.given(trimmed)} ${statusText}` });
      setEmail('');
      await refresh(false);
    } catch {
      setMessage({ tone: 'error', text: a.errors.network });
    } finally {
      setBusy(null);
    }
  };

  const handleRevoke = async (grant: GrantDto) => {
    if (!window.confirm(a.people.confirmRevoke(grant.email))) return;
    setBusy(`revoke:${grant.id}`);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/grants/${encodeURIComponent(grant.id)}`, { method: 'DELETE' });
      const body = await readJson(response);
      if (!response.ok) {
        const code = errorCode(body);
        setMessage({ tone: 'error', text: errorText(code) });
        if (STALE_CODES.includes(code)) await refresh(false);
        return;
      }
      setMessage({ tone: 'success', text: a.people.revoked(grant.email) });
      await refresh(false);
    } catch {
      setMessage({ tone: 'error', text: a.errors.network });
    } finally {
      setBusy(null);
    }
  };

  // ---------- Rendering ----------

  const inputClass =
    'w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-60';
  const labelClass = 'text-[11px] font-bold text-slate-600';
  const primaryButton =
    'px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all';
  const secondaryButton =
    'px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer';
  const dangerButton =
    'px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed text-rose-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer';

  const renderRoleForm = (data: PanelData) => {
    if (!editor) return null;
    const editing = editor.role;
    const nameLocked = editing?.isSystem ?? false;
    const forced = panelOpenForced(rolePermissions);
    const sending = busy === 'role-form';
    return (
      <form
        onSubmit={handleRoleSubmit}
        noValidate
        className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col gap-4"
      >
        <h4 className="text-sm font-extrabold text-slate-900">
          {editing ? a.form.editTitle(editing.name) : a.form.createTitle}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="role-name" className={labelClass}>
              {a.form.nameLabel}
            </label>
            <input
              id="role-name"
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder={a.form.namePlaceholder}
              maxLength={NAME_MAX}
              disabled={sending || nameLocked}
              aria-describedby="role-name-hint"
              className={inputClass}
            />
            <span id="role-name-hint" className="text-[10px] text-slate-500">
              {nameLocked ? a.form.nameLocked : a.form.nameHint}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="role-description" className={labelClass}>
              {a.form.descriptionLabel}
            </label>
            <input
              id="role-description"
              type="text"
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              placeholder={a.form.descriptionPlaceholder}
              maxLength={DESCRIPTION_MAX}
              disabled={sending}
              className={inputClass}
            />
          </div>
        </div>

        <fieldset className="flex flex-col gap-3" disabled={sending}>
          <legend className={`${labelClass} mb-2`}>{a.form.permissionsLabel}</legend>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.id} className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col gap-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">{a.groups[group.id]}</span>
                {group.permissions.map((permission) => {
                  const text = a.permissions[PERMISSION_TEXT[permission]];
                  const locked = permission === 'panel.open' && forced;
                  const checked = locked || rolePermissions.includes(permission);
                  const inputId = `perm-${permission.replace('.', '-')}`;
                  return (
                    <label key={permission} htmlFor={inputId} className="flex items-start gap-2 cursor-pointer">
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={checked}
                        disabled={locked}
                        onChange={() => togglePermission(permission)}
                        className="mt-0.5 accent-red-600"
                      />
                      <span className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800">{text.label}</span>
                        <span className="text-[11px] text-slate-500">{locked ? a.form.autoPanel : text.desc}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </fieldset>

        {editing && !data.available.serviceKey && activeGrantCount(data, editing.id) > 0 && (
          <p className="text-[11px] text-amber-800">{a.roles.editNeedsKey}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={sending || (editing !== null && !data.available.serviceKey && activeGrantCount(data, editing.id) > 0)}
            className={primaryButton}
          >
            <span className="material-symbols-outlined text-base">{sending ? 'progress_activity' : 'save'}</span>
            <span>{sending ? a.form.saving : editing ? a.form.save : a.form.create}</span>
          </button>
          <button type="button" onClick={closeEditor} disabled={sending} className={secondaryButton}>
            {a.form.cancel}
          </button>
        </div>
      </form>
    );
  };

  const renderRoles = (data: PanelData) => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">{a.roles.title}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">{a.roles.desc}</p>
        </div>
        {!editor && (
          <button type="button" onClick={() => openEditor(null)} disabled={busy !== null} className={`${primaryButton} self-start shrink-0`}>
            <span className="material-symbols-outlined text-base">add</span>
            <span>{a.roles.newRole}</span>
          </button>
        )}
      </div>

      {renderRoleForm(data)}

      {data.roles.length === 0 ? (
        <p className="p-4 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500 text-center">{a.roles.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.roles.map((role) => {
            const isAdmin = role.systemKey === 'admin';
            const editBlocked = !data.available.serviceKey && activeGrantCount(data, role.id) > 0;
            const deleting = busy === `delete:${role.id}`;
            const hint = isAdmin
              ? a.roles.adminLocked
              : role.isSystem
                ? a.roles.builtInLocked
                : role.grantCount > 0
                  ? a.roles.inUseHint
                  : editBlocked
                    ? a.roles.editNeedsKey
                    : null;
            return (
              <li key={role.id} className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="min-w-0 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm break-words">{role.name}</span>
                      {role.isSystem && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase bg-slate-900 text-white">
                          {a.roles.builtIn}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-800 border border-blue-100">
                        {a.roles.peopleCount(role.grantCount)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{role.description || a.roles.noDescription}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {!isAdmin && (
                      <button
                        type="button"
                        onClick={() => openEditor(role)}
                        disabled={busy !== null || editBlocked}
                        aria-label={a.roles.editLabel(role.name)}
                        className={secondaryButton}
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                        <span>{a.roles.edit}</span>
                      </button>
                    )}
                    {!role.isSystem && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteRole(role)}
                        disabled={busy !== null || role.grantCount > 0}
                        aria-label={a.roles.deleteLabel(role.name)}
                        title={role.grantCount > 0 ? a.roles.inUseHint : undefined}
                        className={dangerButton}
                      >
                        <span className="material-symbols-outlined text-base">{deleting ? 'progress_activity' : 'delete'}</span>
                        <span>{deleting ? a.roles.deleting : a.roles.delete}</span>
                      </button>
                    )}
                  </div>
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {normalizePermissions(role.permissions).map((permission) => (
                    <li
                      key={permission}
                      title={a.permissions[PERMISSION_TEXT[permission]].desc}
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {a.permissions[PERMISSION_TEXT[permission]].label}
                    </li>
                  ))}
                </ul>
                {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const renderPeople = (data: PanelData) => {
    const selectedRole = data.roles.find((r) => r.id === roleId);
    const sending = busy === 'grant';
    const noKey = !data.available.serviceKey;
    return (
      <div className="flex flex-col gap-5">
        <form
          onSubmit={(e) => void handleGrantSubmit(e, data.roles)}
          noValidate
          className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col gap-4"
        >
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{a.people.title}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{a.people.desc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="access-email" className={labelClass}>
                {a.people.emailLabel}
              </label>
              <input
                id="access-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={a.people.emailPlaceholder}
                disabled={sending || noKey}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="access-role" className={labelClass}>
                {a.people.roleLabel}
              </label>
              <select
                id="access-role"
                value={selectedRole ? roleId : ''}
                onChange={(e) => setRoleId(e.target.value)}
                disabled={sending || noKey || data.roles.length === 0}
                className={inputClass}
              >
                <option value="">{data.roles.length === 0 ? a.people.noRoles : a.people.rolePlaceholder}</option>
                {data.roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedRole?.needsHospital && (
              <div className="flex flex-col gap-1">
                <label htmlFor="access-hospital" className={labelClass}>
                  {a.people.hospitalLabel}
                </label>
                <select
                  id="access-hospital"
                  value={hospitalId}
                  onChange={(e) => setHospitalId(e.target.value)}
                  disabled={sending || noKey}
                  aria-describedby="access-hospital-hint"
                  className={inputClass}
                >
                  {SAMPLE_HOSPITAL_ORGS.map((hospital) => (
                    <option key={hospital.id} value={hospital.id}>
                      {hospital.name} ({hospital.shortCode})
                    </option>
                  ))}
                </select>
                <span id="access-hospital-hint" className="text-[10px] text-slate-500">
                  {a.people.hospitalHint}
                </span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {a.people.statusHint}
          </p>
          <div>
            <button type="submit" disabled={sending || noKey || busy !== null || !selectedRole} className={primaryButton}>
              <span className="material-symbols-outlined text-base">{sending ? 'progress_activity' : 'person_add'}</span>
              <span>{sending ? a.people.sending : a.people.submit}</span>
            </button>
          </div>
        </form>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-extrabold text-slate-900">{a.people.listTitle(data.grants.length)}</h3>
          {data.grants.length === 0 ? (
            <p className="p-4 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500 text-center">{a.people.empty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.grants.map((grant) => {
                const revoking = busy === `revoke:${grant.id}`;
                const revokeBlocked = noKey && grant.status === 'active';
                return (
                  <li
                    key={grant.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm break-all">{grant.email}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase bg-blue-100 text-blue-800">
                          {grant.roleName}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                            grant.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {grant.status === 'active' ? a.people.statusActive : a.people.statusPending}
                        </span>
                      </div>
                      {grant.hospitalId && (
                        <span className="text-[11px] text-slate-600">
                          {a.people.hospital} <span className="font-semibold">{hospitalName(grant.hospitalId)}</span>
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {a.people.givenBy(grant.grantedBy ?? a.people.unknown, formatDate(grant.createdAt))}
                      </span>
                      {revokeBlocked && <span className="text-[11px] text-amber-800">{a.people.revokeNeedsKey}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRevoke(grant)}
                      disabled={busy !== null || revokeBlocked}
                      aria-label={a.people.revokeLabel(grant.email)}
                      className={`${dangerButton} self-start md:self-auto shrink-0`}
                    >
                      <span className="material-symbols-outlined text-base">{revoking ? 'progress_activity' : 'person_remove'}</span>
                      <span>{revoking ? a.people.revoking : a.people.revoke}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  };

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
            <span className="material-symbols-outlined text-base">{message.tone === 'success' ? 'check_circle' : 'error'}</span>
            <span className="flex-1">{message.text}</span>
            <button type="button" onClick={() => setMessage(null)} aria-label={a.dismiss} className="opacity-70 hover:opacity-100 cursor-pointer">
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

          <div role="group" aria-label={a.sections.label} className="flex flex-wrap gap-2 p-1 rounded-2xl bg-slate-100 self-start">
            {(['roles', 'people'] as const).map((id) => {
              const selected = section === id;
              const label = id === 'roles' ? a.sections.roles(load.data.roles.length) : a.sections.people(load.data.grants.length);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSection(id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    selected ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{id === 'roles' ? 'badge' : 'group'}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {section === 'roles' ? renderRoles(load.data) : renderPeople(load.data)}
        </>
      )}
    </div>
  );
};

/** How many people have the role applied to their login (these need the service key to change). */
function activeGrantCount(data: PanelData, roleId: string): number {
  return data.grants.filter((grant) => grant.roleId === roleId && grant.status === 'active').length;
}

export default AdminRolesPanel;
