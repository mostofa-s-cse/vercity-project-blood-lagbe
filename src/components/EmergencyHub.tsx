import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BloodGroup, ScreenId } from '../types/blood';
import type { RequestDto } from '../lib/dtoTypes';
import { REQUEST_STATUSES, remainingSeconds } from '../lib/requestStatus';
import { useGetRequestsQuery, useRespondToRequestMutation, type RequestsQuery } from '../store/api';
import { apiErrorCode, apiStatus, isDatabaseOff } from '../store/errors';
import { sampleRequests } from '../data/sample';
import { isValidBdPhone } from '../utils/phone';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';

interface EmergencyHubProps {
  onNavigate: (screen: ScreenId) => void;
}

const PAGE_SIZE = 20;

/** The person who last answered a request from this browser, so the "I can donate" form is prefilled. */
const RESPONDER_KEY = 'bloodlagbe.responder';

interface Responder {
  name: string;
  phone: string;
}

function readResponder(): Responder {
  try {
    const raw = window.localStorage.getItem(RESPONDER_KEY);
    if (!raw) return { name: '', phone: '' };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { name: '', phone: '' };
    const record = parsed as Record<string, unknown>;
    return {
      name: typeof record.name === 'string' ? record.name.slice(0, 80) : '',
      phone: typeof record.phone === 'string' ? record.phone.slice(0, 20) : '',
    };
  } catch {
    return { name: '', phone: '' };
  }
}

function saveResponder(responder: Responder) {
  try {
    window.localStorage.setItem(RESPONDER_KEY, JSON.stringify(responder));
  } catch {
    // Storage blocked (private window): the form just starts empty next time.
  }
}

const isClosed = (request: RequestDto) => request.status === 'COMPLETED' || request.status === 'CANCELLED';

/** One more page of requests ("Load more"). Each page keeps its own subscription, so it refreshes after an answer too. */
function ExtraRequestsPage({
  args,
  page,
  renderRequest,
}: {
  args: RequestsQuery;
  page: number;
  renderRequest: (request: RequestDto) => React.ReactNode;
}) {
  const { t } = useLanguage();
  const { currentData, error, refetch } = useGetRequestsQuery({ ...args, page });
  if (currentData) return <>{currentData.requests.map(renderRequest)}</>;
  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-slate-600">{t.hub.loadError}</span>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
        >
          {t.hub.retry}
        </button>
      </div>
    );
  }
  return (
    <div className="text-center text-xs text-slate-500 py-3" role="status">
      {t.hub.loadingMore}
    </div>
  );
}

export const EmergencyHub: React.FC<EmergencyHubProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const [selectedBlood, setSelectedBlood] = useState<BloodGroup | 'ALL'>('ALL');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Pages added with "Load more", remembered per filter: a new filter starts again from the first page.
  const filterKey = `${selectedBlood}|${emergencyOnly}`;
  const [extra, setExtra] = useState<{ key: string; count: number }>({ key: filterKey, count: 0 });
  const extraPages = extra.key === filterKey ? extra.count : 0;

  // "I can donate" form.
  const [respondTarget, setRespondTarget] = useState<RequestDto | null>(null);
  const [form, setForm] = useState<Responder>({ name: '', phone: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [respondDone, setRespondDone] = useState(false);
  const [respondedIds, setRespondedIds] = useState<Set<string>>(() => new Set());
  const [respond, { isLoading: isSending }] = useRespondToRequestMutation();

  const queryArgs = useMemo<RequestsQuery>(
    () => ({
      pageSize: PAGE_SIZE,
      ...(selectedBlood !== 'ALL' ? { bloodGroup: selectedBlood } : {}),
      ...(emergencyOnly ? { emergency: true } : {}),
    }),
    [selectedBlood, emergencyOnly]
  );
  const { currentData, error, refetch } = useGetRequestsQuery({ ...queryArgs, page: 1 });
  const isDemo = isDatabaseOff(error);

  // With no database the screen shows sample requests, filtered and ordered the way the server would.
  const samples = useMemo(() => sampleRequests(), []);
  const demoRequests = useMemo(
    () =>
      samples
        .filter((r) => (selectedBlood === 'ALL' || r.bloodGroup === selectedBlood) && (!emergencyOnly || r.isCritical))
        .sort(
          (a, b) =>
            REQUEST_STATUSES.indexOf(a.status) - REQUEST_STATUSES.indexOf(b.status) ||
            Number(b.isCritical) - Number(a.isCritical) ||
            b.createdAt.localeCompare(a.createdAt)
        ),
    [samples, selectedBlood, emergencyOnly]
  );

  const firstPage = isDemo ? demoRequests : currentData?.requests ?? [];
  const isLoadingFirst = !isDemo && !currentData && !error;
  const loadFailed = !isDemo && !currentData && !!error;
  const total = currentData?.total ?? 0;
  const canLoadMore = !isDemo && !!currentData && total > (1 + extraPages) * PAGE_SIZE;

  // One shared clock for every countdown on the screen.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = useCallback((message: string, ms = 4000) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), ms);
  }, []);

  const formatCountdown = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return t.hub.countdown(String(hrs).padStart(2, '0'), String(mins).padStart(2, '0'), String(secs).padStart(2, '0'));
  };

  const statusLabel = (request: RequestDto) =>
    ({
      PENDING: t.hub.statusPending,
      DONOR_FOUND: t.hub.statusDonorFound,
      COMPLETED: t.hub.statusCompleted,
      CANCELLED: t.hub.statusCancelled,
    })[request.status] ?? t.hub.statusPending;

  const handleShare = (request: RequestDto) => {
    sound.playTap();
    if (navigator.share) {
      navigator.share({ title: t.hub.shareTitle(request.bloodGroup), text: request.postText }).catch(() => {});
    } else {
      navigator.clipboard
        ?.writeText(request.postText)
        .then(() => showToast(t.hub.toastCopied, 3500))
        .catch(() => {});
    }
  };

  const openRespond = (request: RequestDto) => {
    sound.playTap();
    setForm(readResponder());
    setFormError(null);
    setRespondDone(false);
    setRespondTarget(request);
  };

  const closeRespond = useCallback(() => {
    if (!isSending) setRespondTarget(null);
  }, [isSending]);

  useEffect(() => {
    if (!respondTarget) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRespond();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [respondTarget, closeRespond]);

  const respondErrorMessage = (err: unknown): string => {
    if (isDatabaseOff(err)) return t.hub.errDemo;
    const code = apiErrorCode(err);
    if (code === 'already_responded') return t.hub.errAlreadyResponded;
    if (code === 'request_closed') return t.hub.errRequestClosed;
    if (code === 'invalid_input') {
      const field = (err as { data?: { field?: unknown } }).data?.field;
      if (field === 'phone') return t.hub.errInvalidPhone;
      if (field === 'name') return t.hub.errInvalidName;
    }
    if (code === 'not_found' || apiStatus(err) === 404) return t.hub.errNotFound;
    return t.hub.errGeneric;
  };

  const markResponded = (id: string) => setRespondedIds((prev) => new Set(prev).add(id));

  const submitRespond = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!respondTarget || isSending) return;
    const name = form.name.trim();
    const phone = form.phone.trim();
    if (name.length < 2 || name.length > 80) return setFormError(t.hub.errInvalidName);
    if (!isValidBdPhone(phone)) return setFormError(t.hub.errInvalidPhone);
    setFormError(null);
    try {
      await respond({ id: respondTarget.id, name, phone }).unwrap();
      saveResponder({ name, phone });
      markResponded(respondTarget.id);
      sound.playSuccessTone();
      setRespondDone(true);
      showToast(t.hub.toastResponded);
    } catch (err) {
      if (apiErrorCode(err) === 'already_responded') markResponded(respondTarget.id);
      setFormError(respondErrorMessage(err));
    }
  };

  const renderRequest = (request: RequestDto) => {
    const title = request.patientName || request.problem || request.place;
    const bags = Math.max(1, request.bags);
    const fulfilledPct = Math.min(100, Math.round((request.bagsPledged / bags) * 100));
    const stillNeeded = Math.max(0, bags - request.bagsPledged);
    const closed = isClosed(request);
    const responded = respondedIds.has(request.id);
    const phone = request.phones[0];
    const secondsLeft = remainingSeconds(request.createdAt, request.isCritical, new Date(now));
    const statusClass =
      request.status === 'PENDING'
        ? 'bg-amber-100 text-amber-800'
        : request.status === 'DONOR_FOUND'
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-slate-200 text-slate-700';

    return (
      <div
        key={request.id}
        className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6 flex flex-col gap-4 relative overflow-hidden transition-all hover:shadow-md ${
          closed ? 'opacity-75' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Blood Badge */}
            <div className="w-16 h-16 rounded-2xl bg-red-600 text-white flex flex-col items-center justify-center shrink-0 shadow-md">
              <span className="text-2xl font-black leading-none">{request.bloodGroup}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-100 mt-1">
                {t.hub.bagsCount(request.bags)}
              </span>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                {request.isCritical && (
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[11px] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">emergency</span>
                    {t.hub.emergencyBadge}
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 ${statusClass}`}>
                  <span className="material-symbols-outlined text-xs">
                    {request.status === 'DONOR_FOUND' ? 'check_circle' : closed ? 'block' : 'person_search'}
                  </span>
                  {statusLabel(request)}
                </span>
              </div>
              <h4 className="font-extrabold text-base md:text-lg text-slate-900 mt-1.5 leading-snug break-words">{title}</h4>
              {request.problem && request.problem !== title && (
                <p className="text-xs text-slate-600 mt-0.5">{request.problem}</p>
              )}
              <p className="text-xs text-slate-600 flex flex-wrap items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-sm text-red-600">local_hospital</span>
                <span className="font-bold text-slate-800">{request.place}</span>
                {request.area && (
                  <>
                    <span>•</span>
                    <span>{request.area}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Countdown Box */}
          <div className="sm:text-right shrink-0 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
              {t.hub.windowRemaining}
            </span>
            <span className="text-sm md:text-base font-extrabold text-red-600 font-mono">
              {closed ? statusLabel(request) : formatCountdown(secondsLeft)}
            </span>
          </div>
        </div>

        {/* Progress Fulfilled Bar */}
        <div className="flex flex-col gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="flex flex-wrap justify-between items-center gap-1 text-xs">
            <span className="text-slate-600 font-medium">
              {t.hub.bagsPledgedLabel} <strong className="text-slate-900">{t.hub.pledgedOf(request.bagsPledged, request.bags)}</strong>
            </span>
            <span className="text-red-600 font-bold">{t.hub.fulfilledStatus(fulfilledPct, stillNeeded)}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-red-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, fulfilledPct)}%` }}
            ></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {responded ? (
              <span className="px-5 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs md:text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>{t.hub.alreadyOffered}</span>
              </span>
            ) : (
              <button
                onClick={() => openRespond(request)}
                disabled={isDemo || closed}
                title={isDemo ? t.hub.demoDonateDisabled : undefined}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs md:text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-base">volunteer_activism</span>
                <span>{closed ? t.hub.requestClosedBtn : t.hub.iCanDonate}</span>
              </button>
            )}
            {phone && (
              <a
                href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">call</span>
                <span>
                  {t.hub.callAttendant} ({phone})
                </span>
              </a>
            )}
            {isDemo && !closed && (
              <span className="text-[11px] font-semibold text-amber-700 w-full">{t.hub.demoDonateDisabled}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleShare(request)}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title={t.hub.shareWhatsApp}
              aria-label={t.hub.shareWhatsApp}
            >
              <span className="material-symbols-outlined text-lg text-emerald-600">share</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const bloodGroups: BloodGroup[] = ['O+', 'B+', 'A+', 'AB+', 'O-', 'B-', 'A-', 'AB-'];

  const selectBlood = (group: BloodGroup | 'ALL') => {
    setSelectedBlood(group);
    sound.playTap();
  };

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-emerald-400 text-xl">info</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-8 w-full py-6 flex flex-col gap-6">
        {/* Emergency SOS Broadcast */}
        <div className="rounded-2xl bg-gradient-to-br from-red-600 via-red-700 to-rose-900 p-6 md:p-8 text-white shadow-xl flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>

          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {t.hub.needBloodTitle}
            </h1>
            <p className="text-sm md:text-base text-white/90 max-w-xl mt-2 leading-relaxed">{t.hub.needBloodDesc}</p>
          </div>

          <div className="relative z-10 pt-2">
            <button
              onClick={() => {
                sound.playEmergencyChime();
                onNavigate('create-sos');
              }}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-red-600 font-extrabold text-sm md:text-base shadow-lg hover:bg-slate-50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">campaign</span>
              <span>{t.hub.broadcastSosBtn} →</span>
            </button>
          </div>
        </div>

        {/* Blood Group Filter */}
        <div className="flex flex-col gap-3 bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="font-bold text-sm text-slate-900">{t.hub.filterByBloodGroup}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
            <button
              onClick={() => selectBlood('ALL')}
              aria-pressed={selectedBlood === 'ALL'}
              className={`py-2.5 px-1 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                selectedBlood === 'ALL'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
              }`}
            >
              {t.hub.filterAll}
            </button>

            {bloodGroups.map((group) => {
              const active = selectedBlood === group;
              return (
                <button
                  key={group}
                  onClick={() => selectBlood(group)}
                  aria-pressed={active}
                  className={`py-2.5 px-1 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                    active ? 'bg-red-600 text-white shadow-md' : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  {group}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Layout (12-col grid: 8 cols Left Feed, 4 cols Right Sidebar) */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* LEFT 8 COLUMNS: Blood requests, emergencies first */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                </span>
                <h3 className="font-extrabold text-base text-slate-900">
                  {t.hub.demandsNearYou}
                </h3>
                <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">
                  {t.hub.liveFeed}
                </span>
              </div>
              <button
                onClick={() => {
                  setEmergencyOnly((on) => !on);
                  sound.playTap();
                }}
                aria-pressed={emergencyOnly}
                className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  emergencyOnly ? 'bg-red-600 text-white hover:bg-red-700' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-sm">emergency</span> {t.hub.emergencyOnly}
              </button>
            </div>

            {isDemo && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs font-medium">
                <span className="material-symbols-outlined text-base text-amber-600">info</span>
                <span>{t.hub.demoNotice}</span>
              </div>
            )}

            {isLoadingFirst && (
              <div className="flex flex-col gap-4" role="status" aria-live="polite">
                <span className="sr-only">{t.hub.loadingRequests}</span>
                {[0, 1].map((i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6 flex flex-col gap-4 animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-200 shrink-0"></div>
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="h-3 w-24 bg-slate-200 rounded"></div>
                        <div className="h-4 w-2/3 bg-slate-200 rounded"></div>
                        <div className="h-3 w-1/2 bg-slate-200 rounded"></div>
                      </div>
                    </div>
                    <div className="h-10 bg-slate-100 rounded-xl"></div>
                  </div>
                ))}
              </div>
            )}

            {loadFailed && (
              <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 flex flex-col items-center text-center gap-3">
                <span className="material-symbols-outlined text-3xl text-red-600">cloud_off</span>
                <p className="text-sm text-slate-700">{t.hub.loadError}</p>
                <button
                  onClick={() => refetch()}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs md:text-sm transition-colors cursor-pointer"
                >
                  {t.hub.retry}
                </button>
              </div>
            )}

            {!isLoadingFirst && !loadFailed && firstPage.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col items-center text-center gap-2">
                <span className="material-symbols-outlined text-3xl text-slate-400">bloodtype</span>
                <p className="font-bold text-sm text-slate-900">{t.hub.emptyTitle}</p>
                <p className="text-xs text-slate-500">{t.hub.emptyDesc}</p>
              </div>
            )}

            {/* Request Cards List */}
            {firstPage.map(renderRequest)}
            {!isDemo &&
              Array.from({ length: extraPages }, (_, i) => (
                <ExtraRequestsPage key={`${filterKey}-${i + 2}`} args={queryArgs} page={i + 2} renderRequest={renderRequest} />
              ))}

            {canLoadMore && (
              <div className="text-center">
                <button
                  onClick={() => {
                    sound.playTap();
                    setExtra({ key: filterKey, count: extraPages + 1 });
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 font-bold text-xs md:text-sm transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">expand_more</span>
                  <span>{t.hub.loadMore}</span>
                </button>
              </div>
            )}
          </div>

          {/* RIGHT 4 COLUMNS: Hospital Hotlines */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            {/* 24/7 Verified Blood Banks Hotlines */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600 text-xl">ring_volume</span>
                <h3 className="font-bold text-sm text-slate-900">{t.hub.bloodBanksTitle}</h3>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">{t.hub.bank1Name}</span>
                    <span className="text-[10px] text-slate-500">{t.hub.bank1Desc}</span>
                  </div>
                  <a
                    href="tel:029330188"
                    className="px-2.5 py-1 rounded bg-white hover:bg-red-600 hover:text-white transition-colors text-red-600 font-bold text-xs shadow-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">call</span> 02-9330188
                  </a>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">{t.hub.bank2Name}</span>
                    <span className="text-[10px] text-slate-500">{t.hub.bank2Desc}</span>
                  </div>
                  <a
                    href="tel:10655"
                    className="px-2.5 py-1 rounded bg-white hover:bg-red-600 hover:text-white transition-colors text-red-600 font-bold text-xs shadow-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">call</span> 10655
                  </a>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">{t.hub.bank3Name}</span>
                    <span className="text-[10px] text-slate-500">{t.hub.bank3Desc}</span>
                  </div>
                  <a
                    href="tel:01714010869"
                    className="px-2.5 py-1 rounded bg-white hover:bg-red-600 hover:text-white transition-colors text-red-600 font-bold text-xs shadow-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">call</span> 01714-010869
                  </a>
                </div>
              </div>

              <button
                onClick={() => onNavigate('hospital-org')}
                className="w-full mt-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-base text-red-600">local_hospital</span>
                <span>{t.hub.hospitalDirectory}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* "I can donate" form */}
      {respondTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" onClick={closeRespond}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="respond-title"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-lg shrink-0">
                  {respondTarget.bloodGroup}
                </div>
                <h2 id="respond-title" className="font-extrabold text-lg text-slate-900">
                  {respondDone ? t.hub.respondSuccessTitle : t.hub.respondTitle}
                </h2>
              </div>
              <button
                onClick={closeRespond}
                disabled={isSending}
                aria-label={t.hub.respondClose}
                className="text-slate-400 hover:text-slate-700 cursor-pointer disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {respondDone ? (
              <>
                <p className="text-sm text-slate-700 leading-relaxed">{t.hub.respondSuccessDesc}</p>
                <div className="flex flex-wrap gap-2 justify-end">
                  {respondTarget.phones[0] && (
                    <a
                      href={`tel:${respondTarget.phones[0].replace(/[^0-9+]/g, '')}`}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">call</span>
                      <span>
                        {t.hub.callAttendant} ({respondTarget.phones[0]})
                      </span>
                    </a>
                  )}
                  <button
                    onClick={closeRespond}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm cursor-pointer"
                  >
                    {t.hub.respondClose}
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={submitRespond} className="flex flex-col gap-3" noValidate>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t.hub.respondIntro(respondTarget.bloodGroup, respondTarget.place)}
                </p>
                <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                  {t.hub.nameLabel}
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
                    placeholder={t.hub.namePlaceholder}
                    autoComplete="name"
                    maxLength={80}
                    required
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                  {t.hub.phoneLabel}
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(event) => setForm((f) => ({ ...f, phone: event.target.value }))}
                    placeholder={t.hub.phonePlaceholder}
                    autoComplete="tel"
                    maxLength={20}
                    required
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </label>
                <p className="text-[11px] text-slate-500 flex items-start gap-1">
                  <span className="material-symbols-outlined text-sm text-emerald-600">shield</span>
                  <span>{t.hub.respondPrivacy}</span>
                </p>
                {formError && (
                  <p role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    {formError}
                  </p>
                )}
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={closeRespond}
                    disabled={isSending}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm cursor-pointer disabled:cursor-not-allowed"
                  >
                    {t.hub.respondCancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                  >
                    <span className="material-symbols-outlined text-base">volunteer_activism</span>
                    <span>{isSending ? t.hub.respondSending : t.hub.respondSubmit}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
