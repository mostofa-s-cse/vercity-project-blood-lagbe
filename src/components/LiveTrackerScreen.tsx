import React, { useState, useEffect } from 'react';
import { ActiveMission, ScreenId } from '../types/blood';
import { ACTIVE_MISSION_DEFAULT } from '../data/mockData';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';

interface LiveTrackerScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenRequisition: (demand: any) => void;
  onOpenOtpModal: (mission: ActiveMission) => void;
}

export const LiveTrackerScreen: React.FC<LiveTrackerScreenProps> = ({
  onNavigate,
  onOpenRequisition,
  onOpenOtpModal,
}) => {
  const { t } = useLanguage();
  const [mission, setMission] = useState<ActiveMission>(ACTIVE_MISSION_DEFAULT);
  const [elapsedSec, setElapsedSec] = useState<number>(ACTIVE_MISSION_DEFAULT.elapsedSeconds);
  const [gpsProgress, setGpsProgress] = useState<number>(68); // percentage along route
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Timer update
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
      // slight donor progress oscillation
      setGpsProgress((prev) => {
        if (prev >= 96) return 96;
        return prev + 0.3;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStageAdvance = (targetStage: 1 | 2 | 3 | 4 | 5) => {
    sound.playTap();
    setMission((prev) => ({
      ...prev,
      stage: targetStage,
    }));
    if (targetStage === 5) {
      setIsCompleted(true);
      sound.playSuccessChime();
    }
  };

  const stages = [
    { num: 1, title: t.tracker.stages.s1.title, time: t.tracker.stages.s1.time, desc: t.tracker.stages.s1.desc },
    { num: 2, title: t.tracker.stages.s2.title, time: t.tracker.stages.s2.time, desc: t.tracker.stages.s2.desc },
    { num: 3, title: t.tracker.stages.s3.title, time: t.tracker.stages.s3.time, desc: t.tracker.stages.s3.desc },
    { num: 4, title: t.tracker.stages.s4.title, time: t.tracker.stages.s4.time, desc: t.tracker.stages.s4.desc },
    { num: 5, title: t.tracker.stages.s5.title, time: t.tracker.stages.s5.time, desc: t.tracker.stages.s5.desc },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-emerald-400 text-xl">info</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Mission Banner Card */}
      <div className="bg-gradient-to-r from-red-900 via-slate-900 to-slate-900 rounded-2xl p-6 md:p-8 text-white border border-red-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                {t.tracker.liveBadge}
              </span>
              <span className="text-xs text-red-200 font-mono">{t.tracker.caseLabel(mission.id)}</span>
              <span className="text-xs text-slate-400">{t.tracker.refLabel(mission.referenceNo)}</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>{mission.patientName}</span>
              <span className="px-3 py-0.5 rounded-xl bg-white text-red-700 font-black text-lg">
                {mission.bloodGroup}
              </span>
            </h1>

            <p className="text-xs md:text-sm text-slate-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-red-400">local_hospital</span>
              <strong>{mission.hospital}</strong> — {mission.bedRoom}
            </p>
          </div>

          {/* Timer and Quick CTA */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <div className="bg-black/40 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10 text-center min-w-[130px]">
              <span className="text-[10px] uppercase font-bold text-red-400 block tracking-wider">
                {t.tracker.missionElapsed}
              </span>
              <span className="text-2xl font-mono font-black text-white">{formatTimer(elapsedSec)}</span>
            </div>

            <button
              onClick={() => {
                sound.playTap();
                onOpenRequisition({
                  patientName: mission.patientName,
                  hospital: mission.hospital,
                  doctorName: 'Dr. Farhana Yasmin, FCPS',
                  bloodGroup: mission.bloodGroup,
                  bagsRequired: mission.bagsNeeded,
                });
              }}
              className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-base">description</span>
              <span>{t.tracker.inspectSlip}</span>
            </button>

            <button
              onClick={() => {
                sound.playAlertPing();
                onOpenOtpModal(mission);
              }}
              className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-600/30 transition-transform hover:scale-105"
            >
              <span className="material-symbols-outlined text-base">verified</span>
              <span>{t.tracker.handshakeSignOff}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5-Stage Stepper Pipeline */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-600 text-base">timeline</span>
          {t.tracker.protocolProgress}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {stages.map((stg) => {
            const isPassed = mission.stage >= stg.num;
            const isCurrent = mission.stage === stg.num;
            return (
              <div
                key={stg.num}
                onClick={() => handleStageAdvance(stg.num as any)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-red-50/80 border-red-500 ring-2 ring-red-500/20 shadow-sm'
                    : isPassed
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCurrent
                          ? 'bg-red-600 text-white animate-pulse'
                          : isPassed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-300 text-slate-700'
                      }`}
                    >
                      {isPassed && !isCurrent ? '✓' : stg.num}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{stg.time}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">{stg.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{stg.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Grid: Live Map & Responding Donors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stylized Live GPS Telemetry Map (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {t.tracker.gpsTitle}
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">{t.tracker.simulatedGps}</span>
          </div>

          {/* Interactive Map Visual */}
          <div className="w-full h-80 bg-slate-950 rounded-xl relative overflow-hidden border border-slate-800 flex items-center justify-center">
            {/* Grid Map Background Lines */}
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#475569" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Stylized Dhaka Road Network Paths */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 320">
              {/* Arterial roads */}
              <path
                d="M 50 160 Q 180 120 280 170 T 450 140"
                fill="none"
                stroke="#334155"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <path
                d="M 120 40 Q 200 140 250 280"
                fill="none"
                stroke="#334155"
                strokeWidth="6"
                strokeLinecap="round"
              />
              {/* Active Route in Glowing Red */}
              <path
                d="M 90 200 Q 180 170 320 160 T 410 130"
                fill="none"
                stroke="#dc2626"
                strokeWidth="3.5"
                strokeDasharray="6 4"
                className="animate-pulse"
              />
            </svg>

            {/* Landmarks Pins */}
            {/* DMCH Hospital Destination */}
            <div className="absolute top-[38%] right-[16%] flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-red-600/30 flex items-center justify-center animate-ping absolute" />
              <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg border-2 border-white relative z-10">
                <span className="material-symbols-outlined text-sm">local_hospital</span>
              </div>
              <span className="text-[10px] font-bold text-white bg-slate-900/90 px-2 py-0.5 rounded shadow mt-1 whitespace-nowrap border border-red-500/50">
                {t.tracker.destinationPin}
              </span>
            </div>

            {/* BSMMU / Shahbagh Marker */}
            <div className="absolute top-[20%] left-[32%] flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-blue-500/80 text-white flex items-center justify-center text-[10px] font-bold border border-white">
                B
              </div>
              <span className="text-[9px] font-semibold text-slate-300 mt-0.5">{t.tracker.bsmmuPin}</span>
            </div>

            {/* Donor Position along route */}
            <div
              className="absolute transition-all duration-1000 flex flex-col items-center z-20"
              style={{
                left: `${18 + (gpsProgress * 0.65)}%`,
                top: `${60 - (gpsProgress * 0.25)}%`,
              }}
            >
              <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xl border-2 border-white animate-bounce">
                <span className="material-symbols-outlined text-base">two_wheeler</span>
              </div>
              <div className="bg-emerald-950/95 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full mt-1 border border-emerald-500/50 whitespace-nowrap shadow-lg flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>{t.tracker.donorPinLabel}</span>
              </div>
            </div>

            {/* Telemetry HUD overlay in bottom corner */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-2.5 rounded-xl text-slate-300 text-[11px] font-mono flex items-center gap-4">
              <div>
                <span className="text-slate-500 text-[9px] block">{t.tracker.currentSpeed}</span>
                <span className="font-bold text-white">{t.tracker.speedValue}</span>
              </div>
              <div className="border-l border-slate-700 pl-3">
                <span className="text-slate-500 text-[9px] block">{t.tracker.remainingDistance}</span>
                <span className="font-bold text-white">{t.tracker.distanceValue}</span>
              </div>
              <div className="border-l border-slate-700 pl-3">
                <span className="text-slate-500 text-[9px] block">{t.tracker.trafficIndex}</span>
                <span className="font-bold text-amber-400">{t.tracker.trafficValue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Responding Donors & Pulse Timeline (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Active Donor Cards */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-600 text-base">group</span>
              {t.tracker.assignedDonors}
            </h3>

            {mission.donors.map((d) => (
              <div
                key={d.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col gap-2 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    {d.avatarUrl ? (
                      <img
                        src={d.avatarUrl}
                        alt={d.name}
                        className="w-11 h-11 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-red-100 text-red-600 font-bold flex items-center justify-center text-sm">
                        {d.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900">{d.name}</h4>
                        <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-700 text-[10px] font-bold">
                          {d.bagLabel}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">{d.vehicle}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      d.status === 'En Route'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {d.status}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                  <span className="text-slate-600 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
                    {t.tracker.etaLine(d.etaMinutes, d.distanceKm)}
                  </span>
                  <a
                    href={`tel:${d.phone.replace(/[^0-9+]/g, '')}`}
                    onClick={() => sound.playTap()}
                    className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">call</span>
                    <span>{t.tracker.callDonor}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Broadcast Pulse Feed */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3 flex-1">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-red-500 text-base">rss_feed</span>
              {t.tracker.pulseTitle}
            </h3>

            <div className="space-y-3 overflow-y-auto max-h-56 pr-1">
              {mission.broadcastPulse.map((evt, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-slate-700 leading-relaxed">{evt.message}</p>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                      {evt.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
