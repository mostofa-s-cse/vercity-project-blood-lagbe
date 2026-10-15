import React, { useEffect, useMemo, useState } from 'react';
import { ScreenId } from '../types/blood';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { api, useGetRequestQuery, useGetRequestsQuery, useUpdateRequestStatusMutation, useReopenRequestMutation } from '../store/api';
import { useAppDispatch } from '../store/hooks';
import { apiErrorCode, apiStatus, isDatabaseOff } from '../store/errors';
import { browserStorage, readMyRequests, type RememberedRequest } from '../lib/myRequests';
import { canReopen, canTransition, type RequestStatusValue } from '../lib/requestStatus';
import type { RequestDto } from '../lib/dtoTypes';
import { sampleRequests } from '../data/sample';
import { CompleteRequestModal } from './CompleteRequestModal';
import { Pagination } from './Pagination';
import { pageCount, pageSlice } from '../lib/pagination';

interface RequestTrackingScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

type TabId = 'MINE' | RequestStatusValue;

const PAGE_SIZE = 10;
/** The API's largest page: enough for every request one browser remembers (shown PAGE_SIZE at a time). */
const MINE_FETCH_SIZE = 50;

/** The buttons a manager sees, per status, in this order. */
const MANAGE_MOVES: Record<RequestStatusValue, RequestStatusValue[]> = {
  PENDING: ['DONOR_FOUND', 'COMPLETED', 'CANCELLED'],
  DONOR_FOUND: ['COMPLETED', 'CANCELLED', 'PENDING'],
  COMPLETED: [],
  CANCELLED: [],
};

const newestFirst = (a: RequestDto, b: RequestDto) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

function useStatusLabel() {
  const { t } = useLanguage();
  return (status: RequestStatusValue) =>
    status === 'PENDING'
      ? t.tracking.status.pending
      : status === 'DONOR_FOUND'
      ? t.tracking.status.donorFound
      : status === 'COMPLETED'
      ? t.tracking.status.completed
      : t.tracking.status.cancelled;
}

// ---------- One request ----------

interface RequestCardProps {
  req: RequestDto;
  /** This person may change the request (a manage token in this browser, or their own while signed in). */
  manageable: boolean;
  /** Sample data: nothing can be changed or loaded. */
  demo: boolean;
  onToast: (message: string) => void;
}

const RequestCard: React.FC<RequestCardProps> = ({ req, manageable, demo, onToast }) => {
  const { t, language } = useLanguage();
  const statusLabel = useStatusLabel();
  const dispatch = useAppDispatch();
  const [answersOpen, setAnswersOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updateStatus, { isLoading: saving }] = useUpdateRequestStatusMutation();
  const [reopen, { isLoading: reopening }] = useReopenRequestMutation();
  const detail = useGetRequestQuery(req.id, { skip: !(answersOpen || completeOpen) || demo });

  const canManage = manageable && !demo;
  const moves = canManage ? MANAGE_MOVES[req.status].filter((next) => canTransition(req.status, next)) : [];
  const created = new Date(req.createdAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const title = req.patientName || req.problem || t.tracking.defaultPatient;
  const subtitle = [req.patientName ? req.problem : null, req.patientAge !== null ? t.tracking.patientAge(req.patientAge) : null]
    .filter(Boolean)
    .join(' • ');

  const errorMessage = (error: unknown): string => {
    const code = apiErrorCode(error);
    const status = apiStatus(error);
    if (code === 'invalid_transition') return t.tracking.errors.invalidTransition;
    if (code === 'forbidden' || code === 'unauthorized' || status === 401 || status === 403) return t.tracking.errors.notAllowed;
    if (code === 'not_found' || status === 404) return t.tracking.errors.notFound;
    if (status === undefined) return t.tracking.errors.network;
    return t.tracking.errors.generic;
  };

  // A wrong "who donated" can be fixed for a short while after completing: the request goes back to
  // "donor found" and can be completed again with the right people.
  const canFix = canManage && canReopen(req.status, req.completedAt);
  const fixDonations = async () => {
    if (!window.confirm(t.tracking.confirmReopen)) return;
    sound.playTap();
    setActionError(null);
    try {
      await reopen({ id: req.id }).unwrap();
      onToast(t.tracking.reopenedToast);
    } catch (error) {
      setActionError(apiErrorCode(error) === 'reopen_not_allowed' ? t.tracking.errors.reopenNotAllowed : errorMessage(error));
      dispatch(api.util.invalidateTags(['Request']));
    }
  };

  const changeStatus = async (next: RequestStatusValue, donations?: { responseId: string; units: number }[]) => {
    if (next === 'CANCELLED' && !window.confirm(t.tracking.confirmCancel)) return;
    // Completing asks first who actually donated (the modal), instead of a bare confirm.
    if (next === 'COMPLETED' && !donations) {
      sound.playTap();
      setCompleteOpen(true);
      return;
    }
    sound.playTap();
    setActionError(null);
    try {
      await updateStatus({ id: req.id, status: next, donations }).unwrap();
      setCompleteOpen(false);
      if (next === 'COMPLETED') sound.playSuccessTone();
      onToast(t.tracking.statusChangedToast(statusLabel(next)));
    } catch (error) {
      setActionError(errorMessage(error));
      // Someone else changed it first: show the list as it is now.
      if (apiErrorCode(error) === 'invalid_transition') dispatch(api.util.invalidateTags(['Request']));
    }
  };

  const copyPost = async () => {
    try {
      await navigator.clipboard.writeText(req.postText);
      sound.playTap();
      onToast(t.tracking.postCopied);
    } catch {
      onToast(t.tracking.copyFailed);
    }
  };

  const moveLabel = (next: RequestStatusValue) =>
    next === 'DONOR_FOUND'
      ? t.tracking.manage.markDonorFound
      : next === 'COMPLETED'
      ? t.tracking.manage.markCompleted
      : next === 'CANCELLED'
      ? t.tracking.manage.cancel
      : t.tracking.manage.backToPending;

  const moveClass = (next: RequestStatusValue) =>
    next === 'DONOR_FOUND'
      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
      : next === 'COMPLETED'
      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
      : next === 'CANCELLED'
      ? 'bg-slate-100 hover:bg-rose-50 text-rose-700'
      : 'bg-slate-100 hover:bg-slate-200 text-slate-700';

  const responses = detail.data?.responses ?? [];
  const showsPhones = responses.some((response) => response.phone);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col gap-5">
      {/* Top Row: Patient, Blood, Urgency & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex flex-col items-center justify-center font-black shadow-md shadow-red-600/25 shrink-0">
            <span className="text-lg leading-none">{req.bloodGroup}</span>
            <span className="text-[10px] text-red-100 font-bold mt-0.5">
              {req.bags} {t.tracking.bags}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs text-slate-500 font-medium">{created}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  req.isCritical ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {req.isCritical ? t.tracking.critical : t.tracking.normal}
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900 break-words">{title}</h3>
            {subtitle && <p className="text-xs text-slate-600 mt-0.5 font-medium">{subtitle}</p>}
          </div>
        </div>

        {/* Status Badge */}
        <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5">
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
              req.status === 'PENDING'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : req.status === 'DONOR_FOUND'
                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                : req.status === 'COMPLETED'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-slate-200 text-slate-800 border border-slate-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current" />
            <span>{statusLabel(req.status)}</span>
          </span>
          {canManage && (
            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                key
              </span>
              {t.tracking.youManage}
            </span>
          )}
        </div>
      </div>

      {/* Three-Stage Progress Indicator */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
        <div className="flex items-center justify-between gap-2 text-xs font-extrabold mb-2">
          <span className={req.status !== 'CANCELLED' ? 'text-red-600' : 'text-slate-400'}>{t.tracking.stages.posted}</span>
          <span className={req.status === 'DONOR_FOUND' || req.status === 'COMPLETED' ? 'text-blue-600' : 'text-slate-400'}>
            {t.tracking.stages.found}
          </span>
          <span className={req.status === 'COMPLETED' ? 'text-emerald-700' : 'text-slate-400'}>{t.tracking.stages.done}</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
          <div
            className={`h-full transition-all duration-500 ${
              req.status === 'CANCELLED'
                ? 'bg-slate-400 w-full'
                : req.status === 'PENDING'
                ? 'bg-amber-500 w-1/3'
                : req.status === 'DONOR_FOUND'
                ? 'bg-blue-600 w-2/3'
                : 'bg-emerald-500 w-full'
            }`}
          />
        </div>
      </div>

      {/* Place & Contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-slate-700">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-base">local_hospital</span>
            <span className="font-bold text-slate-900 break-words">{req.place}</span>
          </div>
          <div className="text-slate-500 pl-6">
            {req.area ? `${req.area} • ` : ''}
            {t.tracking.pledged(req.responseCount, req.bags)}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-slate-700">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-base">person</span>
            <span>
              {req.attendantName ? (
                <>
                  {t.tracking.attendant} <strong>{req.attendantName}</strong>
                </>
              ) : (
                t.tracking.contact
              )}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 pl-6">
            {req.phones.map((phone) => (
              <a
                key={phone}
                href={`tel:${phone}`}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-xs">call</span>
                <span>{phone}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Answers */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/50">
        <button
          type="button"
          aria-expanded={answersOpen}
          onClick={() => {
            sound.playTap();
            setAnswersOpen((open) => !open);
          }}
          className="w-full px-4 py-3 flex items-center justify-between gap-2 text-xs font-black uppercase text-blue-900 tracking-wider cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">
              volunteer_activism
            </span>
            {t.tracking.answersToggle(req.responseCount)}
          </span>
          <span className={`material-symbols-outlined text-base transition-transform ${answersOpen ? 'rotate-180' : ''}`} aria-hidden="true">
            expand_more
          </span>
        </button>

        {answersOpen && (
          <div className="px-4 pb-4 space-y-2 text-xs">
            {demo ? (
              <p className="text-slate-500">{t.tracking.answersDemo}</p>
            ) : detail.isLoading ? (
              <p className="text-slate-500">{t.tracking.answersLoading}</p>
            ) : detail.isError ? (
              <p className="text-rose-700 font-semibold" role="alert">
                {t.tracking.answersError}{' '}
                <button type="button" onClick={() => detail.refetch()} className="underline cursor-pointer">
                  {t.tracking.retry}
                </button>
              </p>
            ) : responses.length === 0 ? (
              <p className="text-slate-500">{t.tracking.answersEmpty}</p>
            ) : (
              <>
                {responses.map((response) => (
                  <div
                    key={response.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-blue-200/80"
                  >
                    <span className="font-extrabold text-slate-900">
                      {response.name}
                      {response.donatedUnits > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {t.tracking.donatedUnits(response.donatedUnits)}
                        </span>
                      )}
                      {response.donationRejected && (
                        <span className="ml-2 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
                          {t.tracking.donationRejected}
                        </span>
                      )}
                      {response.donationCode && (
                        <span className="ml-2 font-mono text-[10px] text-slate-500" title={t.tracking.donationCode}>
                          {response.donationCode}
                        </span>
                      )}
                    </span>
                    {response.phone && (
                      <a
                        href={`tel:${response.phone}`}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-xs self-start sm:self-auto"
                      >
                        <span className="material-symbols-outlined text-xs">call</span>
                        <span>{response.phone}</span>
                      </a>
                    )}
                  </div>
                ))}
                {!showsPhones && <p className="text-slate-500">{t.tracking.answersPhonesHidden}</p>}
              </>
            )}
          </div>
        )}
      </div>

      {completeOpen && (
        <CompleteRequestModal
          responses={detail.data?.responses}
          failed={detail.isError}
          saving={saving}
          onConfirm={(donations) => void changeStatus('COMPLETED', donations)}
          onClose={() => setCompleteOpen(false)}
        />
      )}

      {actionError && (
        <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          {actionError}
        </p>
      )}

      {/* Action Buttons Bar */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={copyPost}
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined text-sm">share</span>
          <span>{t.tracking.share}</span>
        </button>

        {canFix && (
          <button
            type="button"
            disabled={reopening}
            onClick={fixDonations}
            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">edit_note</span>
            <span>{reopening ? t.tracking.manage.saving : t.tracking.manage.fixDonations}</span>
          </button>
        )}

        {moves.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {moves.map((next) => (
              <button
                key={next}
                type="button"
                disabled={saving}
                onClick={() => changeStatus(next)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-wait ${moveClass(next)}`}
              >
                {saving ? t.tracking.manage.saving : moveLabel(next)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- Pages after the first ("Load more") ----------

// ---------- Screen ----------

export const RequestTrackingScreen: React.FC<RequestTrackingScreenProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('PENDING');
  const [page, setPage] = useState(1);
  const [remembered, setRemembered] = useState<RememberedRequest[]>([]);
  const [storageRead, setStorageRead] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // The browser's list is only readable after mounting. Someone with requests of their own sees them first.
  useEffect(() => {
    const list = readMyRequests(browserStorage());
    setRemembered(list);
    if (list.length > 0) setActiveTab('MINE');
    setStorageRead(true);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const isMine = activeTab === 'MINE';
  const rememberedIds = useMemo(() => remembered.map((entry) => entry.id), [remembered]);
  const tokenIds = useMemo(() => new Set(rememberedIds), [rememberedIds]);

  // Tab counts (one row each) double as the "is there a database" check.
  const pendingCount = useGetRequestsQuery({ status: 'PENDING', pageSize: 1 });
  const donorFoundCount = useGetRequestsQuery({ status: 'DONOR_FOUND', pageSize: 1 });
  const completedCount = useGetRequestsQuery({ status: 'COMPLETED', pageSize: 1 });
  const cancelledCount = useGetRequestsQuery({ status: 'CANCELLED', pageSize: 1 });
  const countQueries = [pendingCount, donorFoundCount, completedCount, cancelledCount];

  const statusQuery = useGetRequestsQuery(
    { status: isMine ? undefined : activeTab, page, pageSize: PAGE_SIZE },
    { skip: isMine }
  );
  const idsQuery = useGetRequestsQuery({ ids: rememberedIds, pageSize: MINE_FETCH_SIZE }, { skip: !isMine || rememberedIds.length === 0 });
  // Always loaded when signed in, so the person's own requests show manage buttons in every tab.
  const mineQuery = useGetRequestsQuery({ mine: true, pageSize: MINE_FETCH_SIZE }, { skip: !user });

  const demo = [...countQueries, statusQuery, idsQuery, mineQuery].some((query) => isDatabaseOff(query.error));
  const samples = useMemo(() => (demo ? sampleRequests() : []), [demo]);

  const ownIds = useMemo(() => new Set((mineQuery.data?.requests ?? []).map((req) => req.id)), [mineQuery.data]);
  const isManageable = (req: RequestDto) => tokenIds.has(req.id) || ownIds.has(req.id);

  const mineList = useMemo(() => {
    const byId = new Map<string, RequestDto>();
    for (const req of [...(idsQuery.data?.requests ?? []), ...(mineQuery.data?.requests ?? [])]) byId.set(req.id, req);
    return [...byId.values()].sort(newestFirst);
  }, [idsQuery.data, mineQuery.data]);

  // A signed-out or expired session answers 401 to `mine`: that is not an error worth showing.
  const mineError = mineQuery.isError && apiStatus(mineQuery.error) !== 401 && !demo;

  // Status tabs are paged by the server (`page` and `total`); the sample list and "My requests" (this
  // browser's remembered requests plus the signed-in person's own, at most MINE_FETCH_SIZE) are paged here.
  let list: RequestDto[];
  let loading: boolean;
  let failed: boolean;
  let total: number;
  if (demo) {
    const all = isMine ? [] : samples.filter((req) => req.status === activeTab);
    list = pageSlice(all, page, PAGE_SIZE);
    loading = false;
    failed = false;
    total = all.length;
  } else if (isMine) {
    list = pageSlice(mineList, page, PAGE_SIZE);
    loading = !storageRead || idsQuery.isLoading || mineQuery.isLoading;
    failed = idsQuery.isError || mineError;
    total = mineList.length;
  } else {
    list = statusQuery.data?.requests ?? [];
    loading = !storageRead || statusQuery.isLoading;
    failed = statusQuery.isError;
    total = statusQuery.data?.total ?? 0;
  }

  const retry = () => {
    if (isMine) {
      if (idsQuery.isError) idsQuery.refetch();
      if (mineQuery.isError) mineQuery.refetch();
    } else {
      statusQuery.refetch();
    }
  };

  // The last request on a page can move to another tab (completed, cancelled): step back instead of showing an empty page.
  useEffect(() => {
    if (!loading && !failed && page > pageCount(total, PAGE_SIZE)) setPage(pageCount(total, PAGE_SIZE));
  }, [loading, failed, page, total]);

  const countFor = (status: RequestStatusValue, index: number) =>
    demo ? samples.filter((req) => req.status === status).length : countQueries[index].data?.total;

  const tabs: Array<{ id: TabId; label: string; count: number | undefined }> = [
    { id: 'MINE', label: t.tracking.tabs.mine, count: demo ? 0 : storageRead && !idsQuery.isFetching ? mineList.length : undefined },
    { id: 'PENDING', label: t.tracking.tabs.pending, count: countFor('PENDING', 0) },
    { id: 'DONOR_FOUND', label: t.tracking.tabs.donorFound, count: countFor('DONOR_FOUND', 1) },
    { id: 'COMPLETED', label: t.tracking.tabs.completed, count: countFor('COMPLETED', 2) },
    { id: 'CANCELLED', label: t.tracking.tabs.cancelled, count: countFor('CANCELLED', 3) },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 left-6 sm:left-auto z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4"
        >
          <span className="material-symbols-outlined text-emerald-400 text-xl">near_me</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2 cursor-pointer">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                {t.tracking.badge}
              </span>
              <span className="text-xs text-slate-300 flex items-center gap-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {t.tracking.liveBadge}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-3xl">track_changes</span>
              <span>{t.tracking.title}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">{t.tracking.subtitle}</p>
          </div>

          <button
            onClick={() => onNavigate('create-sos')}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-2 cursor-pointer transition-all self-start md:self-auto hover:scale-105"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>{t.tracking.postRequest}</span>
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="mt-6 pt-5 border-t border-slate-700/80 flex items-center gap-2 overflow-x-auto scrollbar-none" role="tablist">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                  sound.playTap();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive ? 'bg-red-600 text-white shadow-md shadow-red-600/30' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isActive ? 'bg-white text-red-600' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notices */}
      {demo && (
        <div className="p-3.5 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold flex items-start gap-2">
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            info
          </span>
          <span>{isMine ? t.tracking.demoMine : t.tracking.demoNotice}</span>
        </div>
      )}
      {isMine && !demo && (
        <div className="p-3.5 rounded-2xl border border-slate-200 bg-white text-slate-600 text-xs font-medium flex items-start gap-2">
          <span className="material-symbols-outlined text-base text-slate-400" aria-hidden="true">
            key
          </span>
          <span>
            {t.tracking.mineHint} {user ? t.tracking.mineHintSignedIn : ''}
          </span>
        </div>
      )}

      {/* Requests Cards */}
      <div className="grid grid-cols-1 gap-5">
        {loading ? (
          <p className="text-center text-sm text-slate-500 py-10" role="status">
            {t.tracking.loading}
          </p>
        ) : failed ? (
          <div className="text-center py-10 flex flex-col items-center gap-3" role="alert">
            <p className="text-sm font-semibold text-rose-700">{t.tracking.loadError}</p>
            <button
              type="button"
              onClick={retry}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
            >
              {t.tracking.retry}
            </button>
          </div>
        ) : list.length === 0 ? (
          demo && isMine ? null : (
            <p className="text-center text-sm text-slate-500 py-10">{isMine ? t.tracking.emptyMine : t.tracking.emptyStatus}</p>
          )
        ) : (
          list.map((req) => (
            <RequestCard key={req.id} req={req} manageable={!demo && isManageable(req)} demo={demo} onToast={setToastMessage} />
          ))
        )}

        {!loading && !failed && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPage={(next) => {
              sound.playTap();
              setPage(next);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </div>
    </div>
  );
};
