import React, { useEffect, useRef, useState } from 'react';
import { ScreenId, HospitalOrganization, DonationCamp, BloodGroup } from '../types/blood';
import { SAMPLE_HOSPITAL_ORGS, SAMPLE_CAMPS } from '../data/mockData';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { fetchHospitalStock, saveHospitalStock, type HospitalStockMap } from '../lib/api';
import { useApplyOrganizationMutation, useGetOrganizationsQuery, type OrganizationApplyPayload } from '../store/api';
import { isDatabaseOff } from '../store/errors';
import { toHospitalOrganizations } from '../lib/organizationMapping.ts';
import { haversineDistanceKm } from '../lib/geo.ts';
import { useGeolocation } from '../hooks/useGeolocation';
import { MapView } from './MapView';
import { TurnstileWidget } from './TurnstileWidget';

/** Total bags of a hospital: always the sum of its blood groups. */
const sumStock = (stock: HospitalOrganization['bloodStock']): number =>
  Object.values(stock).reduce((total, units) => total + (units || 0), 0);

/** Puts saved stock over the sample data (only the groups a hospital has reported) and recomputes the totals. */
const mergeSavedStock = (base: HospitalOrganization[], saved: HospitalStockMap): HospitalOrganization[] =>
  base.map(h => {
    const reported = saved[h.id];
    if (!reported) return h;
    const bloodStock = { ...h.bloodStock };
    for (const group of Object.keys(bloodStock) as BloodGroup[]) {
      const units = reported[group];
      if (typeof units === 'number' && Number.isFinite(units)) bloodStock[group] = units;
    }
    return { ...h, bloodStock, availableBags: sumStock(bloodStock) };
  });

/** Sets one blood group of one hospital and keeps the hospital total equal to the sum of its groups. */
const withGroupUnits = (
  list: HospitalOrganization[],
  hospitalId: string,
  group: BloodGroup,
  units: number
): HospitalOrganization[] =>
  list.map(h => {
    if (h.id !== hospitalId) return h;
    const bloodStock = { ...h.bloodStock, [group]: units };
    return { ...h, bloodStock, availableBags: sumStock(bloodStock) };
  });

interface HospitalOrgScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenRequisition: (demand: any) => void;
}

export const HospitalOrgScreen: React.FC<HospitalOrgScreenProps> = ({
  onNavigate,
  onOpenRequisition
}) => {
  const { t } = useLanguage();
  const { configured, loading: authLoading, user, can, canManageHospital } = useAuth();
  const [selectedOrgId, setSelectedOrgId] = useState<string>(SAMPLE_HOSPITAL_ORGS[0].id);
  const [hospitals, setHospitals] = useState<HospitalOrganization[]>(SAMPLE_HOSPITAL_ORGS);
  const [camps, setCamps] = useState<DonationCamp[]>(SAMPLE_CAMPS);
  const [activeTab, setActiveTab] = useState<'inventory' | 'requisitions' | 'camps' | 'dispatch' | 'map'>('inventory');

  // New Camp Modal state
  const [isCampModalOpen, setIsCampModalOpen] = useState(false);
  const [newCampTitle, setNewCampTitle] = useState('');
  const [newCampVenue, setNewCampVenue] = useState('');
  const [newCampDate, setNewCampDate] = useState('');
  const [newCampTarget, setNewCampTarget] = useState('200');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedOrg = hospitals.find(h => h.id === selectedOrgId) || hospitals[0];
  // Demo mode (no Supabase): everyone may try it locally. Otherwise admins, or this hospital's own account.
  const canEdit = canManageHospital(selectedOrg.id);
  // Camps are not saved yet, so only admin and hospital accounts may create them (everyone in demo mode).
  const canCreateCamp = can('camps.create');

  // "Nearest hospital": an explicit opt-in (never prompted automatically), picks the closest facility
  // that has a real coordinate. Facilities without one (sample data, or a pending application) are skipped.
  const { coords, status: geoStatus, request: requestLocation } = useGeolocation();
  const handleFindNearest = () => {
    sound.playTap();
    requestLocation();
  };
  useEffect(() => {
    if (!coords) return;
    const withCoords = hospitals.filter((h) => h.latitude != null && h.longitude != null);
    if (withCoords.length === 0) {
      showToast(t.hospitals.nearestNoneAvailable);
      return;
    }
    const nearest = withCoords.reduce((best, h) =>
      haversineDistanceKm(coords, { lat: h.latitude!, lng: h.longitude! }) <
      haversineDistanceKm(coords, { lat: best.latitude!, lng: best.longitude! })
        ? h
        : best
    );
    setSelectedOrgId(nearest.id);
    showToast(t.hospitals.nearestFound(nearest.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);

  // Real organizations replace the sample list once they load; without a database this stays the sample.
  const { currentData: orgsData, error: orgsError } = useGetOrganizationsQuery();
  const orgsDemo = isDatabaseOff(orgsError);
  const stockRef = useRef<HospitalStockMap | null>(null);

  // Load the stock hospitals have saved; without a database this stays null and the sample data is kept.
  useEffect(() => {
    let active = true;
    fetchHospitalStock().then(saved => {
      if (!active) return;
      stockRef.current = saved;
      if (saved) setHospitals(prev => mergeSavedStock(prev, saved));
    });
    return () => {
      active = false;
    };
  }, []);

  // Rejected applications aren't a usable facility here; everything else (pending + approved) is.
  useEffect(() => {
    if (orgsDemo || !orgsData) return;
    const real = orgsData.organizations.filter(o => o.status !== 'rejected');
    if (real.length === 0) return;
    const base = toHospitalOrganizations(real);
    setHospitals(stockRef.current ? mergeSavedStock(base, stockRef.current) : base);
  }, [orgsDemo, orgsData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    if (geoStatus === 'denied') showToast(t.hospitals.nearestDenied);
    if (geoStatus === 'unsupported') showToast(t.hospitals.nearestUnsupported);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoStatus]);

  // "Apply to register your organization": public, no login required.
  const [applyOrganization, { isLoading: applying }] = useApplyOrganizationMutation();
  const [applyName, setApplyName] = useState('');
  const [applyType, setApplyType] = useState<OrganizationApplyPayload['type']>('private_hospital');
  const [applyAddress, setApplyAddress] = useState('');
  const [applyLicense, setApplyLicense] = useState('');
  const [applyDivision, setApplyDivision] = useState('');
  const [applyDistrict, setApplyDistrict] = useState('');
  const [applyHotline, setApplyHotline] = useState('');
  const [applyEmergencyContact, setApplyEmergencyContact] = useState('');
  const [applyDirectorName, setApplyDirectorName] = useState('');
  const [applyTotalBeds, setApplyTotalBeds] = useState('');
  const [applyIcuBeds, setApplyIcuBeds] = useState('');
  const [applyTurnstileToken, setApplyTurnstileToken] = useState<string | null>(null);

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyName.trim() || !applyAddress.trim() || !applyLicense.trim()) return;
    sound.playTap();
    try {
      await applyOrganization({
        name: applyName.trim(),
        type: applyType,
        address: applyAddress.trim(),
        licenseNumber: applyLicense.trim(),
        division: applyDivision.trim() || undefined,
        district: applyDistrict.trim() || undefined,
        hotline: applyHotline.trim() || undefined,
        emergencyContact: applyEmergencyContact.trim() || undefined,
        directorName: applyDirectorName.trim() || undefined,
        totalBeds: applyTotalBeds ? Number(applyTotalBeds) : undefined,
        icuBeds: applyIcuBeds ? Number(applyIcuBeds) : undefined,
        turnstileToken: applyTurnstileToken ?? undefined,
      }).unwrap();
      setApplyName('');
      setApplyAddress('');
      setApplyLicense('');
      setApplyDivision('');
      setApplyDistrict('');
      setApplyHotline('');
      setApplyEmergencyContact('');
      setApplyDirectorName('');
      setApplyTotalBeds('');
      setApplyIcuBeds('');
      showToast(t.hospitals.applySuccess);
    } catch {
      showToast(t.hospitals.applyFailed);
    }
  };

  // Adjust stock
  const handleUpdateStock = async (group: BloodGroup, delta: number) => {
    if (!canEdit) return;
    const hospitalId = selectedOrg.id;
    const current = selectedOrg.bloodStock[group] || 0;
    const next = Math.max(0, current + delta);
    if (next === current) return;

    sound.playTap();
    setHospitals(prev => withGroupUnits(prev, hospitalId, group, next));
    showToast(
      delta > 0 ? t.hospitals.toastStockAdded(group) : t.hospitals.toastStockDeducted(group)
    );

    // Demo mode keeps changes local; with sign-in set up, save to the server (which checks the role again).
    if (!configured) return;
    const saved = await saveHospitalStock(hospitalId, group, next);
    if (saved) return;
    // Undo, unless a later change already replaced this value.
    setHospitals(prev => {
      const hospital = prev.find(h => h.id === hospitalId);
      if (!hospital || (hospital.bloodStock[group] || 0) !== next) return prev;
      return withGroupUnits(prev, hospitalId, group, current);
    });
    showToast(t.hospitals.toastStockSaveFailed);
  };

  const handleRegisterForCamp = (campId: string) => {
    sound.playSuccessTone();
    setCamps(prev => prev.map(c => {
      if (c.id === campId) {
        return { ...c, registeredDonors: c.registeredDonors + 1 };
      }
      return c;
    }));
    showToast(t.hospitals.toastCampRegistered);
  };

  const handleCreateCampSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateCamp || !newCampTitle || !newCampVenue) return;
    sound.playSuccessTone();
    const newCamp: DonationCamp = {
      id: `CAMP-${Date.now().toString().slice(-4)}`,
      title: newCampTitle,
      organizer: selectedOrg.name,
      venue: newCampVenue,
      division: selectedOrg.division,
      date: newCampDate || t.hospitals.defaultCampDate,
      timeRange: '9:00 AM – 4:00 PM',
      targetBags: parseInt(newCampTarget) || 200,
      registeredDonors: 1,
      contactNumber: selectedOrg.hotline,
      status: 'upcoming'
    };
    setCamps([newCamp, ...camps]);
    setIsCampModalOpen(false);
    setNewCampTitle('');
    setNewCampVenue('');
    showToast(t.hospitals.toastCampCreated);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-emerald-400 text-xl">verified</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2 cursor-pointer">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Hospital Portal Hero Banner */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                {t.hospitals.portalBadge}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-800/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {selectedOrg.verifiedBadge || (selectedOrg.isVerified ? t.hospitals.verifiedBadgeDefault : t.hospitals.pendingVerificationBadge)}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span className="material-symbols-outlined text-red-500 text-3xl">local_hospital</span>
              <span>{selectedOrg.name}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
              {t.hospitals.heroSubtitle}
            </p>
          </div>

          {/* Institution Switcher Select */}
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shrink-0 flex flex-col gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {t.hospitals.switchFacility}
            </span>
            <select
              value={selectedOrgId}
              onChange={(e) => {
                setSelectedOrgId(e.target.value);
                sound.playTap();
              }}
              className="bg-slate-950 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
            >
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.shortCode})
                </option>
              ))}
            </select>
            <button
              onClick={handleFindNearest}
              disabled={geoStatus === 'loading'}
              className="flex items-center justify-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-60 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">
                {geoStatus === 'loading' ? 'progress_activity' : 'near_me'}
              </span>
              {geoStatus === 'loading' ? t.hospitals.locating : t.hospitals.findNearest}
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'inventory' as const, label: t.hospitals.tabs.inventory, icon: 'ac_unit' },
            { id: 'requisitions' as const, label: t.hospitals.tabs.requisitions, icon: 'prescriptions' },
            { id: 'camps' as const, label: t.hospitals.tabs.camps, icon: 'event', count: camps.length },
            { id: 'dispatch' as const, label: t.hospitals.tabs.dispatch, icon: 'send_to_mobile' },
            { id: 'map' as const, label: t.hospitals.tabs.map, icon: 'map' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  sound.playTap();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="material-symbols-outlined text-base">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive ? 'bg-white text-red-600' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: INVENTORY & COLD CHAIN */}
      {activeTab === 'inventory' && (
        <div className="flex flex-col gap-6">
          {/* Facility Status Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {t.hospitals.totalUnitsInVault}
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{t.hospitals.bagsCount(selectedOrg.availableBags)}</span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {t.hospitals.acrossAllGroups}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">bloodtype</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {t.hospitals.chillerTemp}
                </span>
                <span className="text-2xl font-black text-emerald-600 mt-1 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  {selectedOrg.coldStorageTempC}°C
                </span>
                <span className="text-[11px] text-emerald-700 font-bold mt-1 block">
                  {t.hospitals.safeTempRange}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">ac_unit</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {t.hospitals.criticalIcuBeds}
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{t.hospitals.icuBedsCount(selectedOrg.icuBeds)}</span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {t.hospitals.totalBeds(selectedOrg.totalBeds)}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">bed</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {t.hospitals.healthAuditStatus}
                </span>
                <span className="text-base font-black text-emerald-700 mt-1 block">
                  {t.hospitals.fullyCertified}
                </span>
                <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                  {selectedOrg.licenseNumber}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">verified_user</span>
              </div>
            </div>
          </div>

          {/* Blood Stock Cards Grid with Direct Controls */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-600">inventory_2</span>
                  <span>{t.hospitals.vaultTitle}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.hospitals.vaultSubtitle}
                </p>
                {!canEdit && (
                  <p className="mt-2 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-sm">lock</span>
                    <span>
                      {t.hospitals.stockViewOnlyNotice}
                      {configured && !authLoading && !user && <> {t.hospitals.stockSignInHint}</>}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sound.playTap();
                    showToast(t.hospitals.toastSensorsRecalibrated);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  <span>{t.hospitals.refreshTelemetry}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(Object.keys(selectedOrg.bloodStock) as BloodGroup[]).map((group) => {
                const count = selectedOrg.bloodStock[group] || 0;
                const isCritical = count < 20;
                return (
                  <div
                    key={group}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCritical
                        ? 'bg-red-50/70 border-red-300'
                        : 'bg-slate-50/70 border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-black text-slate-900">{group}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        isCritical ? 'bg-red-600 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isCritical ? t.hospitals.stockLow : t.hospitals.stockSafe}
                      </span>
                    </div>

                    <div className="text-xl font-black text-slate-800 mb-3">
                      {count} <span className="text-xs font-semibold text-slate-500">{t.hospitals.units}</span>
                    </div>

                    {/* Quick Add / Deduct buttons (only for people who may change this hospital's stock) */}
                    {canEdit ? (
                      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60">
                        <button
                          onClick={() => handleUpdateStock(group, -1)}
                          title={t.hospitals.deductUnitTitle}
                          className="flex-1 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-black cursor-pointer shadow-xs active:scale-95"
                        >
                          {t.hospitals.minusOne}
                        </button>
                        <button
                          onClick={() => handleUpdateStock(group, 1)}
                          title={t.hospitals.addUnitTitle}
                          className="flex-1 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-black cursor-pointer shadow-xs active:scale-95"
                        >
                          {t.hospitals.plusOne}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 pt-2 border-t border-slate-200/60 text-[11px] font-semibold text-slate-500">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        <span>{t.hospitals.stockViewOnly}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REQUISITION DESK */}
      {activeTab === 'requisitions' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">prescriptions</span>
                <span>{t.hospitals.requisitionTitle}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.hospitals.requisitionSubtitle}
              </p>
            </div>

            <button
              onClick={() => onNavigate('create-sos')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-base">emergency_share</span>
              <span>{t.hospitals.issueRequisition}</span>
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <h4 className="font-extrabold text-slate-900 text-sm mb-2">
              {t.hospitals.protocolTitle}
            </h4>
            <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
              <li>{t.hospitals.protocol1}</li>
              <li>{t.hospitals.protocol2}</li>
              <li>{t.hospitals.protocol3}</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 3: CAMPS & DONATION DRIVES */}
      {activeTab === 'camps' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">event</span>
                <span>{t.hospitals.campsTitle}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.hospitals.campsSubtitle}
              </p>
            </div>

            {canCreateCamp && (
              <button
                onClick={() => setIsCampModalOpen(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-base">add_box</span>
                <span>{t.hospitals.scheduleCamp}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {camps.map((camp) => (
              <div 
                key={camp.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-red-300 hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                      {t.hospitals.campStatus[camp.status]}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 font-mono">{camp.id}</span>
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{camp.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{camp.organizer}</p>

                  <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base">pin_drop</span>
                      <span className="font-semibold">{camp.venue}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base">calendar_today</span>
                      <span>{camp.date} • {camp.timeRange}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base">call</span>
                      <span className="font-mono">{camp.contactNumber}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1 font-medium">
                      <span className="text-slate-600">{t.hospitals.registeredDonors} <strong>{camp.registeredDonors}</strong></span>
                      <span className="text-slate-500">{t.hospitals.target} {camp.targetBags} {t.hospitals.bags}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-red-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (camp.registeredDonors / camp.targetBags) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleRegisterForCamp(camp.id)}
                    className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                  >
                    <span className="material-symbols-outlined text-base">how_to_reg</span>
                    <span>{t.hospitals.registerToDonate}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DIRECT EMERGENCY CALL DISPATCH */}
      {activeTab === 'dispatch' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col gap-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">send_to_mobile</span>
              <span>{t.hospitals.dispatchTitle}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.hospitals.dispatchSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm mb-1">{t.hospitals.icuPriorityLink(selectedOrg.name)}</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {t.hospitals.priorityLinkDesc}
                </p>
              </div>

              <button
                onClick={() => onNavigate('create-sos')}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-red-600/25 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-lg">emergency_share</span>
                <span>{t.hospitals.launchSos}</span>
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm mb-1">
                  {t.hospitals.browseStandby}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {t.hospitals.browseStandbyDesc}
                </p>
              </div>

              <button
                onClick={() => onNavigate('donor-directory')}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-lg">person_search</span>
                <span>{t.hospitals.exploreDirectory}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: FACILITIES MAP */}
      {activeTab === 'map' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">map</span>
              <span>{t.hospitals.mapTitle}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{t.hospitals.mapSubtitle}</p>
          </div>
          {hospitals.some((h) => h.latitude != null && h.longitude != null) ? (
            <MapView
              markers={hospitals
                .filter((h) => h.latitude != null && h.longitude != null)
                .map((h) => ({ id: h.id, lat: h.latitude!, lng: h.longitude!, label: `${h.name} (${h.shortCode})` }))}
              center={coords ?? undefined}
            />
          ) : (
            <p className="text-xs text-slate-500 text-center py-6">{t.hospitals.mapEmpty}</p>
          )}
        </div>
      )}

      {/* Schedule Camp Modal */}
      {isCampModalOpen && canCreateCamp && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">event</span>
                <span>{t.hospitals.modalTitle}</span>
              </h3>
              <button 
                onClick={() => setIsCampModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCampSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.hospitals.campTitleLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.hospitals.campTitlePlaceholder}
                  value={newCampTitle}
                  onChange={(e) => setNewCampTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.hospitals.venueLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.hospitals.venuePlaceholder}
                  value={newCampVenue}
                  onChange={(e) => setNewCampVenue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.hospitals.dateLabel}
                  </label>
                  <input
                    type="text"
                    placeholder={t.hospitals.datePlaceholder}
                    value={newCampDate}
                    onChange={(e) => setNewCampDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.hospitals.targetBagsLabel}
                  </label>
                  <input
                    type="number"
                    placeholder="250"
                    value={newCampTarget}
                    onChange={(e) => setNewCampTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  {t.hospitals.publishCamp}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCampModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  {t.hospitals.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply to register a new organization: public, no login required. */}
      <details className="group rounded-2xl border border-slate-200 bg-white">
        <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-sm font-bold text-slate-900">{t.hospitals.applyTitle}</span>
            <span className="block text-xs text-slate-500 mt-0.5">{t.hospitals.applyHint}</span>
          </span>
          <span className="material-symbols-outlined text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true">
            expand_more
          </span>
        </summary>

        <form onSubmit={handleApplySubmit} className="px-5 pb-5 pt-1 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.hospitals.applyNameLabel}
              </label>
              <input
                type="text"
                required
                placeholder={t.hospitals.applyNamePlaceholder}
                value={applyName}
                onChange={(e) => setApplyName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.hospitals.applyTypeLabel}
              </label>
              <select
                value={applyType}
                onChange={(e) => setApplyType(e.target.value as OrganizationApplyPayload['type'])}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500 bg-white"
              >
                <option value="government_hospital">{t.hospitals.applyTypeOptions.government_hospital}</option>
                <option value="private_hospital">{t.hospitals.applyTypeOptions.private_hospital}</option>
                <option value="volunteer_org">{t.hospitals.applyTypeOptions.volunteer_org}</option>
                <option value="blood_bank">{t.hospitals.applyTypeOptions.blood_bank}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.hospitals.applyAddressLabel}
              </label>
              <input
                type="text"
                required
                placeholder={t.hospitals.applyAddressPlaceholder}
                value={applyAddress}
                onChange={(e) => setApplyAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.hospitals.applyLicenseLabel}
              </label>
              <input
                type="text"
                required
                placeholder={t.hospitals.applyLicensePlaceholder}
                value={applyLicense}
                onChange={(e) => setApplyLicense(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.hospitals.applyDivisionLabel} <span className="font-normal text-slate-400">({t.sos.optional})</span>
              </label>
              <input
                type="text"
                value={applyDivision}
                onChange={(e) => setApplyDivision(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.hospitals.applyDistrictLabel} <span className="font-normal text-slate-400">({t.sos.optional})</span>
              </label>
              <input
                type="text"
                value={applyDistrict}
                onChange={(e) => setApplyDistrict(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.hospitals.applyHotlineLabel} <span className="font-normal text-slate-400">({t.sos.optional})</span>
              </label>
              <input
                type="text"
                value={applyHotline}
                onChange={(e) => setApplyHotline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.hospitals.applyEmergencyContactLabel} <span className="font-normal text-slate-400">({t.sos.optional})</span>
              </label>
              <input
                type="text"
                value={applyEmergencyContact}
                onChange={(e) => setApplyEmergencyContact(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.hospitals.applyDirectorNameLabel} <span className="font-normal text-slate-400">({t.sos.optional})</span>
              </label>
              <input
                type="text"
                value={applyDirectorName}
                onChange={(e) => setApplyDirectorName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.hospitals.applyTotalBedsLabel} <span className="font-normal text-slate-400">({t.sos.optional})</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={applyTotalBeds}
                  onChange={(e) => setApplyTotalBeds(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.hospitals.applyIcuBedsLabel} <span className="font-normal text-slate-400">({t.sos.optional})</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={applyIcuBeds}
                  onChange={(e) => setApplyIcuBeds(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
                />
              </div>
            </div>
          </div>

          <TurnstileWidget onVerify={setApplyTurnstileToken} />

          <button
            type="submit"
            disabled={applying}
            className="self-start px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold text-xs cursor-pointer shadow-sm"
          >
            {t.hospitals.applySubmit}
          </button>
        </form>
      </details>
    </div>
  );
};
