import React, { useState, useEffect } from 'react';
import { BloodGroup, EmergencyDemand, ScreenId } from '../types/blood';
import { INITIAL_DEMANDS } from '../data/mockData';
import { sound } from '../utils/audio';

interface EmergencyHubProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenRequisition: (demand: EmergencyDemand) => void;
  onSelectDonorCommit: (demand: EmergencyDemand) => void;
}

export const EmergencyHub: React.FC<EmergencyHubProps> = ({
  onNavigate,
  onOpenRequisition,
  onSelectDonorCommit,
}) => {
  const [selectedBlood, setSelectedBlood] = useState<BloodGroup | 'ALL'>('ALL');
  const [demands, setDemands] = useState<EmergencyDemand[]>(INITIAL_DEMANDS);
  const [isAvailableOnDuty, setIsAvailableOnDuty] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto decrement countdown seconds for demo realism
  useEffect(() => {
    const timer = setInterval(() => {
      setDemands((prev) =>
        prev.map((d) => ({
          ...d,
          windowRemainingSec: Math.max(0, d.windowRemainingSec - 1),
        }))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}h : ${String(mins).padStart(2, '0')}m : ${String(secs).padStart(2, '0')}s`;
  };

  const handleToggleAvailability = () => {
    const nextState = !isAvailableOnDuty;
    setIsAvailableOnDuty(nextState);
    sound.playTap();
    if (nextState) {
      setToastMessage('Live Beacon Active: Nearby hospital ICU desks can now alert you for emergency transfusions.');
    } else {
      setToastMessage('Live Beacon Paused: You will not receive siren sound emergency alerts while resting.');
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredDemands = demands.filter((d) => {
    if (selectedBlood === 'ALL') return true;
    return d.bloodGroup === selectedBlood;
  });

  const handleShare = (demand: EmergencyDemand) => {
    sound.playTap();
    if (navigator.share) {
      navigator.share({
        title: `URGENT BLOOD NEEDED: ${demand.bloodGroup}`,
        text: `Urgent ${demand.bloodGroup} blood required for ${demand.patientName} at ${demand.hospital}. Call: ${demand.attendantPhone}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(
        `URGENT ${demand.bloodGroup} BLOOD NEEDED: ${demand.patientName} at ${demand.hospital}. Contact: ${demand.attendantPhone}`
      );
      setToastMessage('Emergency request copied to clipboard for WhatsApp sharing.');
      setTimeout(() => setToastMessage(null), 3500);
    }
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

      {/* Critical Radius Ticker Strip */}
      <div className="w-full bg-red-600 text-white px-4 md:px-8 py-2.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs md:text-sm font-semibold">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <span className="font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0">
              <span className="material-symbols-outlined text-base">radar</span>
              CRITICAL RADIUS:
            </span>
            <span className="truncate">
              14 urgent blood requests within 5km in Dhaka Central (DMCH, BSMMU, Birdem & Square Zone)
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs opacity-90 shrink-0">
            <span className="bg-white/20 px-2 py-0.5 rounded-full font-bold">
              Live GPS Sync: Active
            </span>
            <span className="hidden md:inline flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">schedule</span>
              Auto-refreshed just now
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 w-full py-6 flex flex-col gap-6">
        {/* Dual Action Hero Cards */}
        <div className="grid grid-cols-12 gap-6 items-stretch">
          {/* Left Card: Emergency SOS Broadcast */}
          <div className="col-span-12 lg:col-span-7 rounded-2xl bg-gradient-to-br from-red-600 via-red-700 to-rose-900 p-6 md:p-8 text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
            <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-black/20 blur-xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-sm">emergency_home</span>
                  Dhaka Lifeline SOS Relay
                </span>
                <span className="flex items-center gap-1.5 text-xs text-white/90 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  1,248 Donors On-Call Nearby
                </span>
              </div>

              <div className="mt-2">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Need Blood Urgently?
                </h1>
                <p className="text-sm md:text-base text-white/90 max-w-xl mt-2 leading-relaxed">
                  Broadcast an instant SOS alert directly to verified ABO/Rh matched donors and regional hospital volunteers across Dhaka in under 45 seconds.
                </p>
              </div>
            </div>

            <div className="relative z-10 pt-6 mt-4 flex flex-wrap items-center gap-4">
              <button
                onClick={() => {
                  sound.playEmergencyChime();
                  onNavigate('create-sos');
                }}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-red-600 font-extrabold text-sm md:text-base shadow-lg hover:bg-slate-50 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <span className="material-symbols-outlined text-xl">campaign</span>
                <span>Create Emergency Request →</span>
              </button>
              <div className="flex items-center gap-1 text-white/90 text-xs font-semibold">
                <span className="material-symbols-outlined text-emerald-400 text-lg">verified_user</span>
                <span>Hospital Verified Dispatch</span>
              </div>
            </div>
          </div>

          {/* Right Card: Active Donor Status (Tanvir Ahmed) */}
          <div className="col-span-12 lg:col-span-5 rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRa_qgZ4D0JH1FH_9_3lcBwJW2TCZoLH0XEWx8Qwpdz8678B6kODnsDddVS-UFGFaJ8A7Xz-4Qplkl9AiX3edNVszYC_EcFAbCMMifCX9BmnXIUM4GAzPN8rYy--1oxTfesImJfy5rGo75P6Q6jrj5DTbU7jyJwqft8clNXttKn8jwOpjC8SYYfwIGobjjnaP3bmIetXYgFmeRZdE2um7l2J_xIVO97lnRl_1QO_qCYVTGikkez7FI"
                      alt="Tanvir Ahmed"
                      className="w-14 h-14 rounded-full object-cover shadow-sm ring-2 ring-slate-100"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
                        isAvailableOnDuty ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    ></span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-base">Tanvir Ahmed</span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                        Hero (8x)
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 mt-0.5">Dhanmondi, Dhaka • 8 Donations</span>
                  </div>
                </div>
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-600 text-white font-extrabold text-xl shadow-md">
                  O+
                </div>
              </div>

              {/* Eligibility & Readiness */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Eligibility</span>
                  <span className="font-bold text-emerald-700 text-sm flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-base">check_circle</span> Cleared
                  </span>
                  <span className="text-[11px] text-slate-500">Last gave 94 days ago</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Readiness</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5">Immediate</span>
                  <span className="text-[11px] text-emerald-700 font-medium">Ready for Whole Blood</span>
                </div>
              </div>

              {/* Fast Live Toggle Box */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100/80 border border-slate-200">
                <div className="flex flex-col max-w-[240px]">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    Instant Availability Beacon
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isAvailableOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    ></span>
                  </span>
                  <span className="text-[11px] text-slate-600 leading-tight mt-0.5">
                    Live radar beacon visible to nearby hospital ICU & OT desks
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAvailableOnDuty}
                    onChange={handleToggleAvailability}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-slate-600">
                <span className="material-symbols-outlined text-sm text-emerald-600">shield</span>
                Privacy Protected Anonymized IVR
              </span>
              <button
                onClick={() => onNavigate('donor-passport')}
                className="text-red-600 hover:text-red-700 font-bold transition-colors"
              >
                View Donor Passport →
              </button>
            </div>
          </div>
        </div>

        {/* Quick Compatibility ABO/Rh Filter Bar */}
        <div className="flex flex-col gap-3 bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600 text-xl">bloodtype</span>
              <h2 className="font-bold text-base text-slate-900">ABO / Rh Quick Filter</h2>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full hidden md:inline">
                Select blood group to filter emergency roster
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600"></span>
              <span>Critical Shortage (&lt;10 Units in Cluster)</span>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 pt-1">
            {/* ALL */}
            <button
              onClick={() => {
                setSelectedBlood('ALL');
                sound.playTap();
              }}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                selectedBlood === 'ALL'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
              }`}
            >
              <span>ALL</span>
              <span className={`text-[10px] font-normal ${selectedBlood === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
                178 online
              </span>
            </button>

            {/* O+ */}
            <button
              onClick={() => {
                setSelectedBlood('O+');
                sound.playTap();
              }}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                selectedBlood === 'O+'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
              }`}
            >
              <span className={selectedBlood === 'O+' ? 'text-white' : 'text-red-600'}>O+</span>
              <span className={`text-[10px] font-normal ${selectedBlood === 'O+' ? 'text-white/80' : 'text-slate-500'}`}>
                38 available
              </span>
            </button>

            {/* B+ */}
            <button
              onClick={() => {
                setSelectedBlood('B+');
                sound.playTap();
              }}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                selectedBlood === 'B+'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
              }`}
            >
              <span className={selectedBlood === 'B+' ? 'text-white' : 'text-red-600'}>B+</span>
              <span className={`text-[10px] font-normal ${selectedBlood === 'B+' ? 'text-white/80' : 'text-slate-500'}`}>
                52 available
              </span>
            </button>

            {/* A+ */}
            <button
              onClick={() => {
                setSelectedBlood('A+');
                sound.playTap();
              }}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                selectedBlood === 'A+'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
              }`}
            >
              <span className={selectedBlood === 'A+' ? 'text-white' : 'text-red-600'}>A+</span>
              <span className={`text-[10px] font-normal ${selectedBlood === 'A+' ? 'text-white/80' : 'text-slate-500'}`}>
                27 available
              </span>
            </button>

            {/* AB+ */}
            <button
              onClick={() => {
                setSelectedBlood('AB+');
                sound.playTap();
              }}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                selectedBlood === 'AB+'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
              }`}
            >
              <span className={selectedBlood === 'AB+' ? 'text-white' : 'text-red-600'}>AB+</span>
              <span className={`text-[10px] font-normal ${selectedBlood === 'AB+' ? 'text-white/80' : 'text-slate-500'}`}>
                12 available
              </span>
            </button>

            {/* O- CRITICAL */}
            <button
              onClick={() => {
                setSelectedBlood('O-');
                sound.playTap();
              }}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl font-bold text-sm transition-all cursor-pointer relative ${
                selectedBlood === 'O-'
                  ? 'bg-red-700 text-white ring-2 ring-red-400 shadow-md'
                  : 'bg-rose-50 hover:bg-rose-100 text-red-700 border border-red-200'
              }`}
            >
              <span className="flex items-center gap-1">
                O-
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
              </span>
              <span className="text-[10px] font-extrabold uppercase">8 CRITICAL</span>
            </button>

            {/* B- */}
            <button
              onClick={() => {
                setSelectedBlood('B-');
                sound.playTap();
              }}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                selectedBlood === 'B-'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
              }`}
            >
              <span className={selectedBlood === 'B-' ? 'text-white' : 'text-red-600'}>B-</span>
              <span className={`text-[10px] font-normal ${selectedBlood === 'B-' ? 'text-white/80' : 'text-slate-500'}`}>
                6 available
              </span>
            </button>

            {/* A- */}
            <button
              onClick={() => {
                setSelectedBlood('A-');
                sound.playTap();
              }}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                selectedBlood === 'A-'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
              }`}
            >
              <span className={selectedBlood === 'A-' ? 'text-white' : 'text-red-600'}>A-</span>
              <span className={`text-[10px] font-normal ${selectedBlood === 'A-' ? 'text-white/80' : 'text-slate-500'}`}>
                4 available
              </span>
            </button>

            {/* AB- */}
            <button
              onClick={() => {
                setSelectedBlood('AB-');
                sound.playTap();
              }}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                selectedBlood === 'AB-'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
              }`}
            >
              <span className={selectedBlood === 'AB-' ? 'text-white' : 'text-red-600'}>AB-</span>
              <span className={`text-[10px] font-normal ${selectedBlood === 'AB-' ? 'text-white/80' : 'text-slate-500'}`}>
                2 available
              </span>
            </button>
          </div>
        </div>

        {/* Main Content Layout (12-col grid: 8 cols Left Feed, 4 cols Right Sidebar) */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* LEFT 8 COLUMNS: Emergency Demands Near You */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                </span>
                <h3 className="font-extrabold text-base text-slate-900">
                  Emergency Demands Near You
                </h3>
                <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">
                  LIVE FEED
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-sm">tune</span> Filter Priority
                </button>
                <button className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-sm">near_me</span> Sort: Distance
                </button>
              </div>
            </div>

            {/* Demand Cards List */}
            {filteredDemands.map((demand) => {
              const fulfilledPct = Math.round((demand.bagsPledged / demand.bagsRequired) * 100);
              return (
                <div
                  key={demand.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6 flex flex-col gap-4 relative overflow-hidden transition-all hover:shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Blood Badge */}
                      <div className="w-16 h-16 rounded-2xl bg-red-600 text-white flex flex-col items-center justify-center shrink-0 shadow-md">
                        <span className="text-2xl font-black leading-none">{demand.bloodGroup}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-100 mt-1">
                          {demand.bagsRequired} Bags
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[11px] font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">timer</span>
                            {demand.urgencyTag}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">verified</span>
                            {demand.verificationBadge}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-base md:text-lg text-slate-900 mt-1.5 leading-snug">
                          {demand.patientName}
                        </h4>
                        <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                          <span className="material-symbols-outlined text-sm text-red-600">local_hospital</span>
                          <span className="font-bold text-slate-800">{demand.hospital}</span>
                          <span>•</span>
                          <span>{demand.hospitalLocation}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">{demand.distanceKm} km away</span>
                        </p>
                      </div>
                    </div>

                    {/* Countdown Box */}
                    <div className="sm:text-right shrink-0 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                        Window Remaining
                      </span>
                      <span className="text-sm md:text-base font-extrabold text-red-600 font-mono">
                        {formatCountdown(demand.windowRemainingSec)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Fulfilled Bar */}
                  <div className="flex flex-col gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-medium">
                        Bags Pledged: <strong className="text-slate-900">{demand.bagsPledged} of {demand.bagsRequired} Bags</strong>
                      </span>
                      <span className="text-red-600 font-bold">
                        {fulfilledPct}% Fulfilled • {demand.bagsRequired - demand.bagsPledged} Bag Urgent
                      </span>
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
                      <button
                        onClick={() => {
                          sound.playSuccessTone();
                          onSelectDonorCommit(demand);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs md:text-sm shadow-md transition-all flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-base">volunteer_activism</span>
                        <span>I Can Donate (Commit)</span>
                      </button>
                      <a
                        href={`tel:${demand.attendantPhone}`}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-base">call</span>
                        <span>Call Attendant ({demand.attendantPhone})</span>
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleShare(demand)}
                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title="Share WhatsApp SOS"
                      >
                        <span className="material-symbols-outlined text-lg text-emerald-600">share</span>
                      </button>
                      <button
                        onClick={() => onOpenRequisition(demand)}
                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title="Inspect Hospital Requisition Slip"
                      >
                        <span className="material-symbols-outlined text-lg">description</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* View Other Demands Button */}
            <div className="text-center pt-2">
              <button
                onClick={() => onNavigate('live-tracker')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 font-bold text-xs md:text-sm transition-colors"
              >
                <span className="material-symbols-outlined text-lg">format_list_bulleted</span>
                <span>View All Active Requests Across Dhaka Command Grid</span>
              </button>
            </div>
          </div>

          {/* RIGHT 4 COLUMNS: Stats, Realtime Handshakes & Hospital Hotlines */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            {/* Community Impact Stats Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-red-600">insights</span>
                  Dhaka Lifeline Impact
                </span>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                  Verified 24/7
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Metric 1 */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">favorite</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Lives Saved</span>
                      <span className="text-xs text-slate-600">Through app alerts</span>
                    </div>
                  </div>
                  <span className="font-mono text-lg font-black text-slate-900">4,820+</span>
                </div>

                {/* Metric 2 */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">group</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Active Donors</span>
                      <span className="text-xs text-slate-600">Available on call</span>
                    </div>
                  </div>
                  <span className="font-mono text-lg font-black text-emerald-700">12,450</span>
                </div>

                {/* Metric 3 */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">speed</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Avg Response</span>
                      <span className="text-xs text-slate-600">From SOS to match</span>
                    </div>
                  </div>
                  <span className="font-mono text-lg font-black text-red-600">8.4 min</span>
                </div>
              </div>

              {/* Sparkline Chart SVG */}
              <div className="pt-1 flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>Hourly Transfusion Requests (Today)</span>
                  <span className="text-red-600 font-bold">+18% vs yesterday</span>
                </div>
                <div className="h-16 w-full flex items-end pt-2">
                  <svg className="w-full h-full text-red-600" preserveAspectRatio="none" viewBox="0 0 300 60">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.3"></stop>
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0.0"></stop>
                      </linearGradient>
                    </defs>
                    <path d="M0,45 Q30,48 60,32 T120,20 T180,35 T240,15 T300,8 L300,60 L0,60 Z" fill="url(#chartGradient)"></path>
                    <path d="M0,45 Q30,48 60,32 T120,20 T180,35 T240,15 T300,8" fill="none" stroke="currentColor" strokeWidth="2.5"></path>
                  </svg>
                </div>
              </div>
            </div>

            {/* Recent Live Donation Handshakes Ticker */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-600">handshake</span>
                  Live Handshakes
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    O+
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-xs text-slate-900 font-bold truncate">Rahim K. donated Whole Blood</p>
                    <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs text-slate-400">location_on</span>
                      BSMMU Hospital • 15m ago
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    A+
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-xs text-slate-900 font-bold truncate">Nazmul H. pledged 1 Bag Platelets</p>
                    <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs text-slate-400">location_on</span>
                      Evercare Hospital • 32m ago
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    B+
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-xs text-slate-900 font-bold truncate">Farhana Y. verified match for ICU Bed 6</p>
                    <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs text-slate-400">location_on</span>
                      Square Hospital • 54m ago
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 24/7 Verified Blood Banks Hotlines */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600 text-xl">ring_volume</span>
                <h3 className="font-bold text-sm text-slate-900">24/7 Verified Blood Banks</h3>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">Bangladesh Red Crescent</span>
                    <span className="text-[10px] text-slate-500">National Blood Center, Dhaka</span>
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
                    <span className="text-xs font-bold text-slate-900">DMCH Central Transfusion Dept</span>
                    <span className="text-[10px] text-slate-500">Govt Emergency Blood Bank</span>
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
                    <span className="text-xs font-bold text-slate-900">Quantum Blood Lab Kakrail</span>
                    <span className="text-[10px] text-slate-500">Non-profit 24/7 Testing & Bags</span>
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
                onClick={() => onNavigate('ops-command')}
                className="w-full mt-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-base text-red-600">local_hospital</span>
                <span>Access Complete Dhaka Hospital Network Directory →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
