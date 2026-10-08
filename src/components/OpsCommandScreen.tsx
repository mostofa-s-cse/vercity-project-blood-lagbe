import React, { useEffect, useMemo, useState } from 'react';
import { OpsSubTab, ScreenId, BloodGroup, HospitalOrganization } from '../types/blood';
import { CHILLER_UNITS, SAMPLE_HOSPITAL_ORGS, FRAUD_INCIDENTS } from '../data/mockData';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';
import { useGetRequestsQuery, useUpdateRequestStatusMutation, useGetFraudIncidentsQuery, useResolveFraudIncidentMutation, useGetDonorsQuery, useGetOrganizationsQuery } from '../store/api';
import { isDatabaseOff, apiErrorCode, apiStatus } from '../store/errors';
import { sampleRequests } from '../data/sample';
import { canTransition, type RequestStatusValue } from '../lib/requestStatus';
import { fetchHospitalStock } from '../lib/api';
import { toHospitalOrganizations } from '../lib/organizationMapping.ts';
import type { RequestDto, FraudIncidentDto } from '../lib/dtoTypes';

/** Total bags of a hospital: always the sum of its blood groups (same rule as HospitalOrgScreen.tsx). */
const sumStock = (stock: HospitalOrganization['bloodStock']): number =>
  Object.values(stock).reduce((total, units) => total + (units || 0), 0);

/** Puts saved stock over the sample data (only the groups a hospital has reported), same as HospitalOrgScreen.tsx. */
const mergeSavedStock = (base: HospitalOrganization[], saved: Record<string, Record<string, number>>): HospitalOrganization[] =>
  base.map((h) => {
    const reported = saved[h.id];
    if (!reported) return h;
    const bloodStock = { ...h.bloodStock };
    for (const group of Object.keys(bloodStock) as BloodGroup[]) {
      const units = reported[group];
      if (typeof units === 'number' && Number.isFinite(units)) bloodStock[group] = units;
    }
    return { ...h, bloodStock, availableBags: sumStock(bloodStock) };
  });

/** One row for the Anti-Fraud tab, from either the real API or the sample fallback. */
interface FraudRow {
  id: string;
  type: string;
  severity: string;
  location: string;
  targetEntity: string;
  carrierInfo: string;
  description: string;
  status: string;
  whenText: string;
}

interface OpsCommandScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenRequisition: (demand: any) => void;
}

export const OpsCommandScreen: React.FC<OpsCommandScreenProps> = ({
  onNavigate,
  onOpenRequisition,
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<OpsSubTab>('overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [stockMap, setStockMap] = useState<Record<string, Record<string, number>> | null>(null);

  // Hospital stock hospitals have saved; without a database this stays null and the sample numbers are kept.
  useEffect(() => {
    let active = true;
    fetchHospitalStock().then((saved) => {
      if (active && saved) setStockMap(saved);
    });
    return () => {
      active = false;
    };
  }, []);
  // Real organizations once they load (sample until then); rejected applications aren't a usable facility here.
  const { currentData: orgsData, error: orgsError } = useGetOrganizationsQuery();
  const orgsDemo = isDatabaseOff(orgsError);
  const realHospitals = useMemo(() => {
    if (!orgsData) return null;
    const real = orgsData.organizations.filter((o) => o.status !== 'rejected');
    return real.length > 0 ? toHospitalOrganizations(real) : null;
  }, [orgsData]);
  const baseHospitals = !orgsDemo && realHospitals ? realHospitals : SAMPLE_HOSPITAL_ORGS;
  const hospitals = stockMap ? mergeSavedStock(baseHospitals, stockMap) : baseHospitals;

  const allRequests = useGetRequestsQuery({ pageSize: 50 });
  const pendingCount = useGetRequestsQuery({ status: 'PENDING', pageSize: 1 });
  const donorFoundCount = useGetRequestsQuery({ status: 'DONOR_FOUND', pageSize: 1 });
  const completedCount = useGetRequestsQuery({ status: 'COMPLETED', pageSize: 1 });
  const availableDonors = useGetDonorsQuery({ available: true, pageSize: 1 });
  const fraudQuery = useGetFraudIncidentsQuery();
  const [updateStatus] = useUpdateRequestStatusMutation();
  const [resolveFraud] = useResolveFraudIncidentMutation();

  const isRequestsDemo = isDatabaseOff(allRequests.error);
  // Fraud/stats reads need an admin/ops permission, checked before the database check, so a signed-out
  // viewer (including in NEXT_PUBLIC_ADMIN_OPEN demo mode, which opens the page but not the API) gets 401
  // even with no database. Treat that the same as "no live data" here, so the tab still shows the sample
  // incidents instead of an empty list.
  const isFraudDemo = isDatabaseOff(fraudQuery.error) || apiStatus(fraudQuery.error) === 401 || apiStatus(fraudQuery.error) === 403;

  const demoRequests = useMemo(() => sampleRequests(), []);
  const requestsList: RequestDto[] = isRequestsDemo ? demoRequests : (allRequests.data?.requests ?? []);

  const whenText = (iso: string) =>
    new Date(iso).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  const fraudRows: FraudRow[] = isFraudDemo
    ? FRAUD_INCIDENTS.map((inc) => ({
        id: inc.id,
        type: inc.type,
        severity: inc.severity,
        location: inc.location,
        targetEntity: inc.targetEntity,
        carrierInfo: inc.carrierInfo,
        description: inc.description,
        status: inc.status,
        whenText: inc.reportedAgo,
      }))
    : (fraudQuery.data?.incidents ?? []).map((inc: FraudIncidentDto) => ({
        id: inc.id,
        type: inc.type,
        severity: inc.severity,
        location: inc.location,
        targetEntity: inc.targetEntity ?? '—',
        carrierInfo: inc.carrierInfo ?? '—',
        description: inc.description,
        status: inc.status,
        whenText: whenText(inc.createdAt),
      }));

  const statusLabel = (status: string) =>
    ({
      PENDING: t.tracking.status.pending,
      DONOR_FOUND: t.tracking.status.donorFound,
      COMPLETED: t.tracking.status.completed,
      CANCELLED: t.tracking.status.cancelled,
    })[status] ?? status;

  const handleResolveFraud = async (id: string, action: 'banned' | 'dismissed') => {
    if (isFraudDemo) return;
    sound.playTap();
    try {
      await resolveFraud({ id, status: action }).unwrap();
      setToastMessage(action === 'banned' ? t.command.toastEntityBlocked : t.command.toastReportDismissed);
    } catch {
      setToastMessage(t.command.actionFailed);
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleChangeRequestStatus = async (req: RequestDto, next: RequestStatusValue) => {
    if (isRequestsDemo) return;
    sound.playTap();
    try {
      await updateStatus({ id: req.id, status: next }).unwrap();
      setToastMessage(t.command.toastDemandStatusUpdated(req.id));
    } catch (error) {
      setToastMessage(apiErrorCode(error) === 'invalid_transition' ? t.tracking.errors.invalidTransition : t.command.actionFailed);
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-emerald-400 text-xl">admin_panel_settings</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* DGHS Operations Header */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-600/30 text-red-400 text-[10px] font-black uppercase tracking-wider border border-red-500/40">
                {t.command.govBadge}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {t.command.liveConsole}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {t.command.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {t.command.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">{t.command.activeNationalSos}</span>
              <span className="text-xl font-black text-red-500">
                {isRequestsDemo ? t.command.activeNationalSosValue : (pendingCount.data?.total ?? 0) + (donorFoundCount.data?.total ?? 0)}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">{t.command.donorsOnStandby}</span>
              <span className="text-xl font-black text-emerald-400">
                {isDatabaseOff(availableDonors.error) ? t.command.donorsOnStandbyValue : (availableDonors.data?.total ?? 0)}
              </span>
            </div>
            <button
              onClick={() => {
                sound.playSosSiren();
                setToastMessage(t.command.toastRedAlertSent);
              }}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all hover:scale-105"
            >
              <span className="material-symbols-outlined text-base">campaign</span>
              <span>{t.command.triggerRedAlert}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="relative z-10 flex items-center gap-2 overflow-x-auto mt-6 pt-6 border-t border-slate-800/80">
          {[
            { id: 'overview' as OpsSubTab, label: t.command.tabs.overview, icon: 'grid_view' },
            { id: 'sos-queue' as OpsSubTab, label: t.command.tabs.sosQueue, icon: 'emergency' },
            { id: 'hospitals-stocks' as OpsSubTab, label: t.command.tabs.hospitalsStocks, icon: 'ac_unit' },
            { id: 'anti-fraud' as OpsSubTab, label: t.command.tabs.antiFraud, icon: 'security' },
            { id: 'system-gateways' as OpsSubTab, label: t.command.tabs.systemGateways, icon: 'settings_input_antenna' },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  sound.playTap();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-base">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-TAB 1: OVERVIEW & MATRIX */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6 animate-in fade-in">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-600 block">{t.command.avgResponseTime}</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">{t.command.avgResponseTimeValue}</span>
                </div>
                <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center material-symbols-outlined">
                  speed
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-semibold mt-2 block">
                {t.command.sampleDataNote}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-600 block">{t.command.fulfillmentRatio}</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">
                    {isRequestsDemo || !allRequests.data?.total
                      ? '—'
                      : `${Math.round(((completedCount.data?.total ?? 0) / allRequests.data.total) * 100)}%`}
                  </span>
                </div>
                <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center material-symbols-outlined">
                  task_alt
                </span>
              </div>
              <span className="text-[11px] text-blue-600 font-semibold mt-2 block">
                {isRequestsDemo
                  ? t.command.fulfillmentRatioNote
                  : t.command.fulfillmentRatioReal(completedCount.data?.total ?? 0, allRequests.data?.total ?? 0)}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-600 block">{t.command.coldChainAlarms}</span>
                  <span className="text-2xl font-black text-amber-600 mt-1 block">{t.command.coldChainAlarmsValue}</span>
                </div>
                <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center material-symbols-outlined">
                  thermostat
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-semibold mt-2 block">
                {t.command.sampleDataNote}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-600 block">{t.command.syndicatesIntercepted}</span>
                  <span className="text-2xl font-black text-red-600 mt-1 block">
                    {isFraudDemo ? t.command.syndicatesInterceptedValue : (fraudQuery.data?.incidents.filter((i) => i.status === 'banned').length ?? 0)}
                  </span>
                </div>
                <span className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center material-symbols-outlined">
                  gavel
                </span>
              </div>
              <span className="text-[11px] text-red-600 font-semibold mt-2 block">
                {t.command.syndicatesInterceptedNote}
              </span>
            </div>
          </div>

          {/* Blood Stock Matrix Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-red-600 text-base">water_drop</span>
                {t.command.reservesTitle}
              </h3>
              <span className="text-xs text-slate-400">{t.command.updatedAgo}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {(Object.keys(SAMPLE_HOSPITAL_ORGS[0].bloodStock) as BloodGroup[]).map((group) => {
                const bags = hospitals.reduce((sum, h) => sum + (h.bloodStock[group] || 0), 0);
                const status =
                  bags < 50 ? t.command.stockStatus.critical : bags < 150 ? t.command.stockStatus.low : t.command.stockStatus.safe;
                const color =
                  bags < 50
                    ? 'text-red-700 bg-red-100 font-black ring-1 ring-red-400'
                    : bags < 150
                      ? 'text-amber-600 bg-amber-50'
                      : 'text-emerald-600 bg-emerald-50';
                return (
                  <div key={group} className={`p-3.5 rounded-2xl border border-slate-200/80 text-center flex flex-col items-center justify-between ${color}`}>
                    <span className="text-base font-black">{group}</span>
                    <span className="text-xl font-extrabold my-1">{bags}</span>
                    <span className="text-[10px] uppercase font-bold tracking-tight">{status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: EMERGENCY SOS QUEUE */}
      {activeTab === 'sos-queue' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.command.sosQueueTitle}</h3>
              <p className="text-xs text-slate-500">
                {t.command.sosQueueDesc}
              </p>
            </div>
            <button
              onClick={() => onNavigate('create-sos')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>{t.command.manualSosIntake}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">{t.command.colCaseId}</th>
                  <th className="py-3 px-3">{t.command.colPatient}</th>
                  <th className="py-3 px-3">{t.command.colBloodGroup}</th>
                  <th className="py-3 px-3">{t.command.colHospital}</th>
                  <th className="py-3 px-3">{t.command.colUrgency}</th>
                  <th className="py-3 px-3">{t.command.colSlipStatus}</th>
                  <th className="py-3 px-3 text-right">{t.command.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requestsList.map((req) => {
                  const nextStatus: RequestStatusValue | null =
                    req.status === 'PENDING' && canTransition(req.status, 'DONOR_FOUND')
                      ? 'DONOR_FOUND'
                      : req.status === 'DONOR_FOUND' && canTransition(req.status, 'PENDING')
                        ? 'PENDING'
                        : null;
                  return (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900">{req.id}</td>
                      <td className="py-3.5 px-3">
                        <strong className="block text-slate-900">{req.patientName || t.tracking.defaultPatient}</strong>
                        <span className="text-[11px] text-slate-500">{req.problem}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 font-black text-xs">
                          {req.bloodGroup} ({t.command.bags(req.bags)})
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-slate-800 font-semibold block">{req.place}</span>
                        <span className="text-[11px] text-slate-500">{req.area}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold">
                          {statusLabel(req.status)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <button
                          onClick={() =>
                            onOpenRequisition({
                              patientName: req.patientName || req.problem || req.place,
                              hospital: req.place,
                              bloodGroup: req.bloodGroup,
                              bagsRequired: req.bags,
                            })
                          }
                          className="text-red-600 hover:underline font-semibold flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          <span>{t.command.inspect}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {nextStatus ? (
                            <button
                              onClick={() => handleChangeRequestStatus(req, nextStatus)}
                              disabled={isRequestsDemo}
                              title={isRequestsDemo ? t.command.sampleDataNote : undefined}
                              className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {nextStatus === 'DONOR_FOUND' ? t.command.markDonorFound : t.command.backToPending}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-semibold">{statusLabel(req.status)}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: HOSPITALS & COLD-CHAIN STOCKS */}
      {activeTab === 'hospitals-stocks' && (
        <div className="flex flex-col gap-6 animate-in fade-in">
          {/* Cold-Chain IoT Vaults */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-red-600 text-base">ac_unit</span>
                {t.command.vaultsTitle}
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold">{t.command.sampleDataNote}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CHILLER_UNITS.map((unit) => {
                const isWarning = unit.status === 'TEMP RISING';
                return (
                  <div
                    key={unit.id}
                    className={`p-4 rounded-2xl border ${
                      isWarning
                        ? 'border-amber-400 bg-amber-50/50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{unit.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          isWarning
                            ? 'bg-amber-500 text-white animate-pulse'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {unit.status}
                      </span>
                    </div>

                    <div className="my-3 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-slate-900">
                        {unit.tempCelsius}°C
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        {t.command.filled(unit.volumePct, unit.capacityBags)}
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${unit.volumePct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hospital Stocks Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-red-600 text-base">local_hospital</span>
              {t.command.hospitalStocksTitle}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hospitals.map((hosp) => {
                const lowest = (Object.entries(hosp.bloodStock) as [BloodGroup, number][]).sort((a, b) => a[1] - b[1])[0];
                const stockHealth = lowest && lowest[1] < 20 ? `${lowest[0]} ${t.command.stockStatus.low} (${lowest[1]})` : t.command.stockStatus.safe;
                return (
                  <div
                    key={hosp.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-xs text-slate-900">{hosp.name}</h4>
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">
                          {hosp.shortCode}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">{hosp.district}</span>

                      <div className="grid grid-cols-2 gap-2 my-3 text-xs bg-white p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block">{t.command.totalBagsStock}</span>
                          <strong className="text-slate-800 font-black">{t.command.units(hosp.availableBags)}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">{t.command.criticalBeds}</span>
                          <strong className="text-slate-800 font-black">{t.command.beds(hosp.icuBeds)}</strong>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600">
                        <strong>{t.command.triageLead}</strong> {hosp.directorName}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        <strong>{t.command.stockHealth}</strong> {stockHealth}
                      </p>
                    </div>

                  <a
                    href={`tel:${hosp.hotline.replace(/[^0-9+]/g, '')}`}
                    onClick={() => sound.playTap()}
                    className="mt-3 py-1.5 text-center rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">call</span>
                    <span>{t.command.directHotline(hosp.hotline)}</span>
                  </a>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: ANTI-FRAUD & SYNDICATES */}
      {activeTab === 'anti-fraud' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col gap-5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">shield_person</span>
                {t.command.fraudTitle}
              </h3>
              <p className="text-xs text-slate-500">
                {t.command.fraudDesc}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              {t.command.aiHeuristics}
            </span>
          </div>

          <div className="space-y-4">
            {fraudRows.map((inc) => (
              <div
                key={inc.id}
                className="p-5 rounded-2xl border border-red-200 bg-red-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-red-600 text-white font-black text-[10px]">
                      {t.command.severity(inc.severity)}
                    </span>
                    <strong className="text-xs text-slate-900">{inc.type}</strong>
                    <span className="text-[11px] text-slate-400 font-mono">• {inc.whenText}</span>
                  </div>

                  <p className="text-xs text-slate-800 mt-1 leading-relaxed">{inc.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 mt-2 font-mono">
                    <span>{t.command.target(inc.targetEntity)}</span>
                    <span>{t.command.carrier(inc.carrierInfo)}</span>
                    <span>{t.command.location(inc.location)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {inc.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleResolveFraud(inc.id, 'banned')}
                        disabled={isFraudDemo}
                        title={isFraudDemo ? t.command.sampleDataNote : undefined}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-sm">block</span>
                        <span>{t.command.permanentBlacklist}</span>
                      </button>
                      <button
                        onClick={() => handleResolveFraud(inc.id, 'dismissed')}
                        disabled={isFraudDemo}
                        title={isFraudDemo ? t.command.sampleDataNote : undefined}
                        className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t.command.dismiss}
                      </button>
                    </>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold uppercase">
                      {t.command.actionTaken(inc.status === 'banned' ? t.command.fraudStatus.banned : inc.status === 'dismissed' ? t.command.fraudStatus.dismissed : inc.status)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: SYSTEM GATEWAYS */}
      {activeTab === 'system-gateways' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col gap-6 animate-in fade-in">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {t.command.gatewaysTitle}
            </h3>
            <p className="text-xs text-slate-500">
              {t.command.gatewaysDesc}
            </p>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">{t.command.sampleDataNote}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                carrier: 'Grameenphone (GP)',
                tps: t.command.smsPerSec(450),
                latency: t.command.latencyMs(42),
                success: '99.8%',
                status: 'HEALTHY',
              },
              {
                carrier: 'Robi Axiata',
                tps: t.command.smsPerSec(380),
                latency: t.command.latencyMs(48),
                success: '99.7%',
                status: 'HEALTHY',
              },
              {
                carrier: 'Banglalink (VEON)',
                tps: t.command.smsPerSec(320),
                latency: t.command.latencyMs(39),
                success: '99.9%',
                status: 'HEALTHY',
              },
              {
                carrier: 'Teletalk Bangladesh',
                tps: t.command.smsPerSec(150),
                latency: t.command.latencyMs(82),
                success: '98.9%',
                status: 'HEALTHY',
              },
            ].map((gw) => (
              <div key={gw.carrier} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{gw.carrier}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="my-2 space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>{t.command.throughput}</span>
                    <strong className="text-slate-800">{gw.tps}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.command.apiLatency}</span>
                    <strong className="text-slate-800">{gw.latency}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.command.deliveryRate}</span>
                    <strong className="text-emerald-600">{gw.success}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center font-black text-sm">
                999
              </span>
              <div>
                <h4 className="font-bold text-xs text-white">{t.command.emergency999Title}</h4>
                <p className="text-[11px] text-slate-400">{t.command.emergency999Desc}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              {t.command.synchronized}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
