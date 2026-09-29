import React, { useEffect, useMemo, useState } from 'react';
import { ScreenId } from '../types/blood';
import { BLOOD_GROUPS, type BloodGroupValue } from '../lib/validation';
import type { DonorDto } from '../lib/dtoTypes';
import { useGetDonorsQuery, useLazyGetDonorContactQuery } from '../store/api';
import { isDatabaseOff } from '../store/errors';
import { sampleContactPhone, sampleDonors } from '../data/sample';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';

interface DonorDirectoryProps {
  onNavigate: (screen: ScreenId) => void;
}

/** The API sends 20 donors per page. */
const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;

type GroupFilter = BloodGroupValue | 'ALL';

/** Loaded pages for one set of filters. A new filter key starts again from page 1. */
interface LoadedPages {
  key: string;
  pages: Record<number, DonorDto[]>;
  total: number | null;
}

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toUpperCase() || '?';

const telHref = (phone: string): string => `tel:${phone.replace(/[^0-9+]/g, '')}`;

export const DonorDirectory: React.FC<DonorDirectoryProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const [selectedGroup, setSelectedGroup] = useState<GroupFilter>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(true);
  const [selectedDonor, setSelectedDonor] = useState<DonorDto | null>(null);
  const [callingId, setCallingId] = useState<string | null>(null);
  const [callErrorId, setCallErrorId] = useState<string | null>(null);
  /** Once the server says there is no database, the screen stays on sample data. */
  const [demo, setDemo] = useState(false);

  // Wait until typing pauses before searching.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filterKey = JSON.stringify([selectedGroup, search, onlyAvailable]);
  const [pageState, setPageState] = useState<{ key: string; page: number }>({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;

  const { currentData, error, isFetching, refetch } = useGetDonorsQuery(
    {
      bloodGroup: selectedGroup === 'ALL' ? undefined : selectedGroup,
      q: search || undefined,
      available: onlyAvailable || undefined,
      page,
      pageSize: PAGE_SIZE,
    },
    { skip: demo }
  );

  useEffect(() => {
    if (isDatabaseOff(error)) setDemo(true);
  }, [error]);

  const [loaded, setLoaded] = useState<LoadedPages>({ key: filterKey, pages: {}, total: null });
  useEffect(() => {
    if (!currentData) return;
    setLoaded((prev) => ({
      key: filterKey,
      pages: { ...(prev.key === filterKey ? prev.pages : {}), [page]: currentData.donors },
      total: currentData.total,
    }));
    // Runs only when a new answer arrives; currentData always belongs to the current filters and page.
  }, [currentData]);

  const [getContact] = useLazyGetDonorContactQuery();
  const samples = useMemo(() => sampleDonors(), []);

  const sampleMatches = useMemo(() => {
    const q = search.toLowerCase();
    return samples
      .filter((d) => {
        if (selectedGroup !== 'ALL' && d.bloodGroup !== selectedGroup) return false;
        if (onlyAvailable && !d.isAvailable) return false;
        if (q) {
          const text = [d.name, d.area, d.division ?? ''].join(' ').toLowerCase();
          if (!text.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable));
  }, [samples, selectedGroup, onlyAvailable, search]);

  const livePages = loaded.key === filterKey ? loaded : null;
  const liveDonors: DonorDto[] = [];
  if (livePages) {
    for (let p = 1; p <= page; p += 1) liveDonors.push(...(livePages.pages[p] ?? []));
  }

  const donors = demo ? sampleMatches : liveDonors;
  const total = demo ? sampleMatches.length : livePages?.total ?? null;
  const loadFailed = !demo && !!error && !isDatabaseOff(error);
  const firstLoad = !demo && !loadFailed && liveDonors.length === 0 && (isFetching || total === null);
  const canLoadMore = !demo && total !== null && donors.length < total;
  const loadingMore = !demo && isFetching && page > 1 && !livePages?.pages[page];

  const resetFilters = () => {
    setSelectedGroup('ALL');
    setOnlyAvailable(false);
    setSearchInput('');
    setSearch('');
  };

  const loadMore = () => {
    sound.playTap();
    setPageState({ key: filterKey, page: page + 1 });
  };

  const handleCallDonor = async (donor: DonorDto, e: React.MouseEvent) => {
    e.stopPropagation();
    if (callingId) return;
    sound.playTap();
    setCallErrorId(null);
    setCallingId(donor.id);
    try {
      const phone = demo ? sampleContactPhone(donor.id) : (await getContact(donor.id).unwrap()).phone;
      if (!phone) throw new Error('no phone');
      window.location.href = telHref(phone);
    } catch {
      setCallErrorId(donor.id);
    } finally {
      setCallingId(null);
    }
  };

  const lastDonationText = (donor: DonorDto) =>
    donor.lastDonationMonths === null ? t.donors.notStated : t.donors.monthsAgo(donor.lastDonationMonths);

  const personLine = (donor: DonorDto) =>
    [donor.age !== null ? t.donors.ageYears(donor.age) : null, donor.gender ? t.donors.gender[donor.gender] : null]
      .filter(Boolean)
      .join(' • ');

  const callButton = (donor: DonorDto, className: string) => {
    const busy = callingId === donor.id;
    return (
      <button
        onClick={(e) => handleCallDonor(donor, e)}
        disabled={!!callingId}
        aria-busy={busy}
        className={`${className} disabled:opacity-70 disabled:cursor-wait`}
      >
        <span className={`material-symbols-outlined text-base ${busy ? 'animate-spin' : ''}`}>
          {busy ? 'progress_activity' : 'call'}
        </span>
        <span>{busy ? t.donors.calling : t.donors.callBtn}</span>
      </button>
    );
  };

  const callErrorText = (donor: DonorDto) =>
    callErrorId === donor.id ? (
      <p role="alert" className="text-[11px] font-semibold text-red-600 mt-1.5">
        {t.donors.callFailed}
      </p>
    ) : null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
      {/* Directory Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-slate-700/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[11px] font-bold tracking-wide uppercase border border-red-500/30">
                {t.donors.heroBadge}
              </span>
              {total !== null && (
                <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                  {t.donors.totalDonors(total)}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{t.donors.donorRegistryTitle}</h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">{t.donors.donorRegistryDesc}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <button
              onClick={() => {
                sound.playSosSiren();
                onNavigate('create-sos');
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 hover:scale-[1.02] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">emergency_share</span>
              <span>{t.donors.broadcastSosBtn}</span>
            </button>
            <button
              onClick={() => {
                sound.playTap();
                onNavigate('donor-passport');
              }}
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-white/20 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">badge</span>
              <span>{t.donors.navDonorPassport}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sample data notice */}
      {demo && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-xs font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-amber-600">info</span>
          <span>{t.donors.sampleNotice}</span>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col gap-4">
        {/* Blood Group Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.donors.filterBloodGroup}</span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', ...BLOOD_GROUPS] as GroupFilter[]).map((grp) => {
              const isSelected = selectedGroup === grp;
              return (
                <button
                  key={grp}
                  onClick={() => {
                    setSelectedGroup(grp);
                    sound.playTap();
                  }}
                  aria-pressed={isSelected}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30 scale-105'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {grp === 'ALL' ? t.donors.allGroups : grp}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              placeholder={t.donors.searchDonorPlaceholder}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                aria-label={t.donors.clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 shrink-0">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600"
            />
            <span>{t.donors.availableNowOnly}</span>
          </label>
        </div>
      </div>

      {/* Results Count & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 px-1">
        <span>{total !== null && !loadFailed ? t.donors.showingCount(donors.length, total) : ' '}</span>
        <span className="flex items-center gap-1 text-emerald-600 font-semibold">
          <span className="material-symbols-outlined text-base">volunteer_activism</span>
          {t.donors.freeDonationGuarantee}
        </span>
      </div>

      {/* Loading */}
      {firstLoad && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true" aria-label={t.donors.loading}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm animate-pulse flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-13 h-13 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                </div>
                <div className="w-12 h-10 rounded-xl bg-red-50" />
              </div>
              <div className="h-12 bg-slate-100 rounded-xl" />
              <div className="h-8 bg-slate-200 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {loadFailed && donors.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">cloud_off</span>
          </div>
          <h3 className="text-base font-bold text-slate-900">{t.donors.loadErrorTitle}</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">{t.donors.loadErrorDesc}</p>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-70"
          >
            {isFetching ? t.donors.loading : t.donors.retry}
          </button>
        </div>
      )}

      {/* Donor Cards Grid */}
      {donors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {donors.map((donor) => {
            const rested = donor.lastDonationMonths !== null && donor.lastDonationMonths >= 3;
            const person = personLine(donor);
            return (
              <div
                key={donor.id}
                onClick={() => setSelectedDonor(donor)}
                className="group bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer hover:border-red-300 relative overflow-hidden"
              >
                {/* Top Accent Strip */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${donor.isAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`} />

                <div>
                  {/* Header with Avatar & Blood Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-13 h-13 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-base border-2 border-white shadow-sm">
                          {initials(donor.name)}
                        </div>
                        {donor.isAvailable && (
                          <span
                            className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white"
                            title={t.donors.available}
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-red-600 transition-colors truncate">
                          {donor.name}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-xs">location_on</span>
                          <span className="truncate">{[donor.area, donor.division].filter(Boolean).join(', ')}</span>
                        </p>
                      </div>
                    </div>

                    {/* Blood Group Badge */}
                    <div className="flex flex-col items-center bg-red-50 text-red-700 px-3 py-1.5 rounded-xl border border-red-200 shrink-0">
                      <span className="text-lg font-black leading-none">{donor.bloodGroup}</span>
                    </div>
                  </div>

                  {/* Attributes */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                        donor.isAvailable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {donor.isAvailable ? t.donors.available : t.donors.unavailable}
                    </span>
                    {person && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium">{person}</span>
                    )}
                    {donor.vehicle && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">two_wheeler</span>
                        {donor.vehicle}
                      </span>
                    )}
                  </div>

                  {/* Last donation & hospital */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-2.5 text-center mb-4 border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-600 block">{t.donors.lastDonationLabel}</span>
                      <span
                        className={`text-xs font-bold ${
                          donor.lastDonationMonths === null ? 'text-slate-500' : rested ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {lastDonationText(donor)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-600 block">{t.donors.nearestHospital}</span>
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        {donor.nearestHospital ?? t.donors.notStated}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Phone & Call */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-xs font-bold text-slate-700 tracking-wide flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-slate-400">phone</span>
                      {donor.phoneMasked}
                    </span>
                    {callButton(
                      donor,
                      'px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer'
                    )}
                  </div>
                  {callErrorText(donor)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {donors.length > 0 && (canLoadMore || (loadFailed && page > 1)) && (
        <div className="flex flex-col items-center gap-2">
          {loadFailed && (
            <p role="alert" className="text-xs font-semibold text-red-600">
              {t.donors.loadErrorDesc}
            </p>
          )}
          <button
            onClick={loadFailed ? () => refetch() : loadMore}
            disabled={loadingMore}
            className="px-6 py-2.5 rounded-xl bg-white border border-slate-300 hover:border-red-300 hover:text-red-600 text-slate-700 font-bold text-xs flex items-center gap-2 shadow-sm transition-colors disabled:opacity-70 disabled:cursor-wait cursor-pointer"
          >
            <span className={`material-symbols-outlined text-base ${loadingMore ? 'animate-spin' : ''}`}>
              {loadingMore ? 'progress_activity' : loadFailed ? 'refresh' : 'expand_more'}
            </span>
            <span>{loadingMore ? t.donors.loadingMore : loadFailed ? t.donors.retry : t.donors.loadMore}</span>
          </button>
        </div>
      )}

      {/* Empty */}
      {!firstLoad && !loadFailed && total === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">person_off</span>
          </div>
          <h3 className="text-base font-bold text-slate-900">{t.donors.noMatchTitle}</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">{t.donors.noMatchDesc}</p>
          <button onClick={resetFilters} className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold">
            {t.donors.resetFilters}
          </button>
        </div>
      )}

      {/* Selected Donor Detail Modal */}
      {selectedDonor && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedDonor(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedDonor.name}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 relative max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={() => setSelectedDonor(null)}
              aria-label={t.donors.closeDetails}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-4 pr-8">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 font-black text-xl flex items-center justify-center shrink-0">
                {initials(selectedDonor.name)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-slate-900">{selectedDonor.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-xs font-black">
                    {selectedDonor.bloodGroup}
                  </span>
                </div>
                {personLine(selectedDonor) && <p className="text-xs text-slate-500 mt-0.5">{personLine(selectedDonor)}</p>}
                <div
                  className={`flex items-center gap-1 text-[11px] font-semibold mt-1 ${
                    selectedDonor.isAvailable ? 'text-emerald-600' : 'text-slate-500'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {selectedDonor.isAvailable ? 'check_circle' : 'do_not_disturb_on'}
                  </span>
                  <span>{selectedDonor.isAvailable ? t.donors.available : t.donors.unavailable}</span>
                </div>
              </div>
            </div>

            {/* Details Table */}
            <div className="space-y-2 text-xs text-slate-600">
              {[
                [t.donors.area, selectedDonor.area],
                [t.donors.division, selectedDonor.division ?? t.donors.notStated],
                [t.donors.lastDonationLabel, lastDonationText(selectedDonor)],
                [t.donors.nearestHospital, selectedDonor.nearestHospital ?? t.donors.notStated],
                [t.donors.vehicle, selectedDonor.vehicle ?? t.donors.notStated],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-1.5 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">{label}</span>
                  <span className="font-semibold text-slate-800 text-right">{value}</span>
                </div>
              ))}
            </div>

            {/* Direct Dial Banner */}
            <div className="bg-red-50 rounded-xl p-3 border border-red-200">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-red-600 font-bold uppercase block">{t.donors.phoneLabel}</span>
                  <span className="text-sm font-extrabold text-slate-900 tracking-wide">{selectedDonor.phoneMasked}</span>
                </div>
                {callButton(
                  selectedDonor,
                  'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm'
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">{t.donors.callHint}</p>
              {callErrorText(selectedDonor)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
