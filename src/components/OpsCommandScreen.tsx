import React, { useState } from 'react';
import { OpsSubTab, ScreenId, EmergencyDemand, FraudIncident } from '../types/blood';
import { INITIAL_DEMANDS, CHILLER_UNITS, HOSPITAL_STOCKS, FRAUD_INCIDENTS } from '../data/mockData';
import { sound } from '../utils/audio';

interface OpsCommandScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenRequisition: (demand: EmergencyDemand) => void;
}

export const OpsCommandScreen: React.FC<OpsCommandScreenProps> = ({
  onNavigate,
  onOpenRequisition,
}) => {
  const [activeTab, setActiveTab] = useState<OpsSubTab>('overview');
  const [demands, setDemands] = useState<EmergencyDemand[]>(INITIAL_DEMANDS);
  const [fraudList, setFraudList] = useState<FraudIncident[]>(FRAUD_INCIDENTS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleResolveFraud = (id: string, action: 'banned' | 'dismissed') => {
    sound.playTap();
    setFraudList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: action } : item))
    );
    setToastMessage(
      action === 'banned'
        ? `Entity permanently blocked across DGHS SMS gateway & NID flagged.`
        : `Report flagged as dismissed after verification.`
    );
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleDemandStatus = (id: string) => {
    sound.playTap();
    setDemands((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: d.status === 'active' ? 'in-progress' : 'active' } : d))
    );
    setToastMessage(`Dispatcher updated status for demand #${id}.`);
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
                GOVERNMENT OF BANGLADESH • DGHS
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Command Console (24/7 Transfusion Control)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              National Emergency Blood Operations Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Centralized telemetry oversight for Bangladesh Directorate General of Health Services, Red Crescent Society, and affiliated government blood banks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Active National SOS</span>
              <span className="text-xl font-black text-red-500">14 In Progress</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Donors On Standby</span>
              <span className="text-xl font-black text-emerald-400">2,480 Active</span>
            </div>
            <button
              onClick={() => {
                sound.playSosSiren();
                setToastMessage('Red Alert Broadcast sent to standby volunteer coordinators.');
              }}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all hover:scale-105"
            >
              <span className="material-symbols-outlined text-base">campaign</span>
              <span>Trigger Red Alert</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="relative z-10 flex items-center gap-2 overflow-x-auto mt-6 pt-6 border-t border-slate-800/80">
          {[
            { id: 'overview' as OpsSubTab, label: 'Overview & Matrix', icon: 'grid_view' },
            { id: 'sos-queue' as OpsSubTab, label: 'Emergency SOS Queue', icon: 'emergency' },
            { id: 'hospitals-stocks' as OpsSubTab, label: 'Hospitals & Cold-Chain Stocks', icon: 'ac_unit' },
            { id: 'anti-fraud' as OpsSubTab, label: 'Anti-Fraud & Syndicates', icon: 'security' },
            { id: 'system-gateways' as OpsSubTab, label: 'Telecom Gateways', icon: 'settings_input_antenna' },
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
                  <span className="text-xs font-bold text-slate-600 block">Avg Response Time</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">18.4 mins</span>
                </div>
                <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center material-symbols-outlined">
                  speed
                </span>
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-2 block">
                ↓ 4.2m faster than 2023 baseline
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-600 block">Fulfillment Ratio</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">94.2%</span>
                </div>
                <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center material-symbols-outlined">
                  task_alt
                </span>
              </div>
              <span className="text-[11px] text-blue-600 font-semibold mt-2 block">
                1,120 of 1,188 emergency cases
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-600 block">Cold-Chain Alarms</span>
                  <span className="text-2xl font-black text-amber-600 mt-1 block">1 Active</span>
                </div>
                <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center material-symbols-outlined">
                  thermostat
                </span>
              </div>
              <span className="text-[11px] text-amber-600 font-semibold mt-2 block">
                Kurmitola Unit D-09 (5.7°C - Inspecting)
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-600 block">Syndicates Intercepted</span>
                  <span className="text-2xl font-black text-red-600 mt-1 block">28 Brokers</span>
                </div>
                <span className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center material-symbols-outlined">
                  gavel
                </span>
              </div>
              <span className="text-[11px] text-red-600 font-semibold mt-2 block">
                Blacklisted with DGHS & Police 999
              </span>
            </div>
          </div>

          {/* Blood Stock Matrix Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-red-600 text-base">water_drop</span>
                National Blood Group Reserves (Dhaka Hubs)
              </h3>
              <span className="text-xs text-slate-400">Updated 2 mins ago</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { grp: 'A+', bags: 412, status: 'Safe', color: 'text-emerald-600 bg-emerald-50' },
                { grp: 'A-', bags: 64, status: 'Moderate', color: 'text-amber-600 bg-amber-50' },
                { grp: 'B+', bags: 580, status: 'Optimal', color: 'text-emerald-600 bg-emerald-50' },
                { grp: 'B-', bags: 38, status: 'Low Stock', color: 'text-red-600 bg-red-50' },
                { grp: 'O+', bags: 840, status: 'Optimal', color: 'text-emerald-600 bg-emerald-50' },
                { grp: 'O-', bags: 12, status: 'CRITICAL', color: 'text-red-700 bg-red-100 font-black ring-1 ring-red-400' },
                { grp: 'AB+', bags: 290, status: 'Safe', color: 'text-emerald-600 bg-emerald-50' },
                { grp: 'AB-', bags: 18, status: 'CRITICAL', color: 'text-red-700 bg-red-100 font-black ring-1 ring-red-400' },
              ].map((item) => (
                <div
                  key={item.grp}
                  className={`p-3.5 rounded-2xl border border-slate-200/80 text-center flex flex-col items-center justify-between ${item.color}`}
                >
                  <span className="text-base font-black">{item.grp}</span>
                  <span className="text-xl font-extrabold my-1">{item.bags}</span>
                  <span className="text-[10px] uppercase font-bold tracking-tight">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: EMERGENCY SOS QUEUE */}
      {activeTab === 'sos-queue' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Live Hospital SOS Dispatch Queue</h3>
              <p className="text-xs text-slate-500">
                Direct triage and verification for hospital ICU and surgical wards.
              </p>
            </div>
            <button
              onClick={() => onNavigate('create-sos')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Manual SOS Intake</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Case ID</th>
                  <th className="py-3 px-3">Patient & Condition</th>
                  <th className="py-3 px-3">Blood Group</th>
                  <th className="py-3 px-3">Hospital & Ward</th>
                  <th className="py-3 px-3">Urgency</th>
                  <th className="py-3 px-3">Slip Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {demands.map((demand) => (
                  <tr key={demand.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-900">{demand.id}</td>
                    <td className="py-3.5 px-3">
                      <strong className="block text-slate-900">{demand.patientName}</strong>
                      <span className="text-[11px] text-slate-500">{demand.condition}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 font-black text-xs">
                        {demand.bloodGroup} ({demand.bagsRequired} Bags)
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-slate-800 font-semibold block">{demand.hospital}</span>
                      <span className="text-[11px] text-slate-500">{demand.hospitalLocation}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold">
                        {demand.urgencyTag}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <button
                        onClick={() => onOpenRequisition(demand)}
                        className="text-red-600 hover:underline font-semibold flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        <span>Inspect</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleDemandStatus(demand.id)}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold"
                        >
                          {demand.status === 'active' ? 'Mark Dispatched' : 'Active'}
                        </button>
                        <button
                          onClick={() => onNavigate('live-tracker')}
                          className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-bold hover:bg-red-700"
                        >
                          Telemetry
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-red-600 text-base">ac_unit</span>
              IoT Cold-Chain Storage Vaults (Target: +2°C to +6°C)
            </h3>

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
                        {unit.volumePct}% Filled ({unit.capacityBags} Max)
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
              Hospital Blood Bank Stocks & Triage Leads
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {HOSPITAL_STOCKS.map((hosp) => (
                <div
                  key={hosp.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-xs text-slate-900">{hosp.name}</h4>
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">
                        {hosp.code}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">{hosp.district}</span>

                    <div className="grid grid-cols-2 gap-2 my-3 text-xs bg-white p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Bags Stock</span>
                        <strong className="text-slate-800 font-black">{hosp.totalBags} Units</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Critical Beds</span>
                        <strong className="text-slate-800 font-black">{hosp.criticalBeds} Beds</strong>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600">
                      <strong>Triage Lead:</strong> {hosp.triageLead}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Stock Health:</strong> {hosp.stockStatus}
                    </p>
                  </div>

                  <a
                    href={`tel:${hosp.hotline.replace(/[^0-9+]/g, '')}`}
                    onClick={() => sound.playTap()}
                    className="mt-3 py-1.5 text-center rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">call</span>
                    <span>Direct Hotline: {hosp.hotline}</span>
                  </a>
                </div>
              ))}
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
                Syndicate Interception & Blacklist Enforcement
              </h3>
              <p className="text-xs text-slate-500">
                Automated detection of extortionists, fraudulent medical requisitions, and fake donor calls.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              AI Heuristics Active (99.2% Accuracy)
            </span>
          </div>

          <div className="space-y-4">
            {fraudList.map((inc) => (
              <div
                key={inc.id}
                className="p-5 rounded-2xl border border-red-200 bg-red-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-red-600 text-white font-black text-[10px]">
                      {inc.severity} SEVERITY
                    </span>
                    <strong className="text-xs text-slate-900">{inc.type}</strong>
                    <span className="text-[11px] text-slate-400 font-mono">• {inc.reportedAgo}</span>
                  </div>

                  <p className="text-xs text-slate-800 mt-1 leading-relaxed">{inc.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 mt-2 font-mono">
                    <span>Target: {inc.targetEntity}</span>
                    <span>Carrier: {inc.carrierInfo}</span>
                    <span>Location: {inc.location}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {inc.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleResolveFraud(inc.id, 'banned')}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-sm">block</span>
                        <span>Permanent Blacklist</span>
                      </button>
                      <button
                        onClick={() => handleResolveFraud(inc.id, 'dismissed')}
                        className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                      >
                        Dismiss
                      </button>
                    </>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold uppercase">
                      Action Taken ({inc.status})
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
              Telecom Carriers & Automated Dispatch Gateways
            </h3>
            <p className="text-xs text-slate-500">
              High-throughput SMS aggregation, DGHS API endpoints, and Emergency 999 link status.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                carrier: 'Grameenphone (GP)',
                tps: '450 SMS/sec',
                latency: '42 ms',
                success: '99.8%',
                status: 'HEALTHY',
              },
              {
                carrier: 'Robi Axiata',
                tps: '380 SMS/sec',
                latency: '48 ms',
                success: '99.7%',
                status: 'HEALTHY',
              },
              {
                carrier: 'Banglalink (VEON)',
                tps: '320 SMS/sec',
                latency: '39 ms',
                success: '99.9%',
                status: 'HEALTHY',
              },
              {
                carrier: 'Teletalk Bangladesh',
                tps: '150 SMS/sec',
                latency: '82 ms',
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
                    <span>Throughput:</span>
                    <strong className="text-slate-800">{gw.tps}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>API Latency:</span>
                    <strong className="text-slate-800">{gw.latency}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Rate:</span>
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
                <h4 className="font-bold text-xs text-white">National Emergency Service 999 API</h4>
                <p className="text-[11px] text-slate-400">Direct integration for trauma police & fire service escorts.</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              Synchronized 100%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
