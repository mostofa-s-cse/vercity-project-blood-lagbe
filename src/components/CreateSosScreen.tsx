import React, { useState } from 'react';
import { BloodGroup, EmergencyDemand, ScreenId, UrgencyTier } from '../types/blood';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';

interface CreateSosScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onSosCreated: (newDemand: EmergencyDemand) => void;
}

export const CreateSosScreen: React.FC<CreateSosScreenProps> = ({
  onNavigate,
  onSosCreated,
}) => {
  const { t } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [selectedHospital, setSelectedHospital] = useState('Dhaka Medical College Hospital (DMCH)');
  const [wardBed, setWardBed] = useState('Emergency ICU, Bed 12');
  const [attendantPhone, setAttendantPhone] = useState('01712-489021');

  // Blood Requirements
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [bagsRequired, setBagsRequired] = useState<number>(2);
  const [urgencyTier, setUrgencyTier] = useState<UrgencyTier>('critical');
  const [clinicalReason, setClinicalReason] = useState('Emergency Maternal C-Section / Hemorrhage');

  // Verification
  const [doctorName, setDoctorName] = useState('Dr. Farhana Yasmin, FCPS');
  const [bmdcReg, setBmdcReg] = useState('BMDC-A-49210');
  const [slipAttached, setSlipAttached] = useState<boolean>(true);

  // Broadcast settings
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hospitalsList = [
    'Dhaka Medical College Hospital (DMCH)',
    'Bangabandhu Sheikh Mujib Medical University (BSMMU / PG)',
    'Sir Salimullah Medical College & Mitford Hospital',
    'National Institute of Cardiovascular Diseases (NICVD)',
    'National Heart Foundation Hospital (Mirpur)',
    'Square Hospital (Panthapath)',
    'Evercare Hospital Dhaka (Bashundhara)',
    'Kurmitola General Hospital',
    'Chittagong Medical College Hospital (CMCH)',
  ];

  const handleNext = () => {
    sound.playTap();
    if (step < 4) {
      setStep((prev) => (prev + 1) as any);
    }
  };

  const handlePrev = () => {
    sound.playTap();
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    }
  };

  const handleFinalSubmit = () => {
    setIsSubmitting(true);
    sound.playSosSiren();

    const newDemand: EmergencyDemand = {
      id: `DEM-${Math.floor(100 + Math.random() * 900)}`,
      patientName: patientName || 'Emergency Patient',
      condition: clinicalReason,
      bloodGroup: bloodGroup,
      bagsRequired: bagsRequired,
      bagsPledged: 0,
      hospital: selectedHospital,
      hospitalLocation: wardBed,
      distanceKm: 2.1,
      urgencyWindowText: urgencyTier === 'critical' ? 'Critical: Within 1 Hour' : 'Urgent: Within 4 Hours',
      windowRemainingSec: urgencyTier === 'critical' ? 3600 : 14400,
      urgencyTag: urgencyTier === 'critical' ? 'High Emergency P1' : 'Priority P2',
      verificationBadge: 'Verified Doctor Requisition Slip',
      attendantPhone: attendantPhone,
      doctorName: doctorName,
      status: 'active',
    };

    setTimeout(() => {
      onSosCreated(newDemand);
      setIsSubmitting(false);
      onNavigate('live-tracker');
    }, 1200);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider">
              {t.sos.badge}
            </span>
            <span className="text-xs text-slate-400">{t.sos.badgeSub}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 text-2xl">emergency</span>
            {t.sos.title}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.sos.subtitle}
          </p>
        </div>

        <button
          onClick={() => onNavigate('emergency-hub')}
          className="self-start sm:self-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>{t.sos.backToHub}</span>
        </button>
      </div>

      {/* Stepper Wizard Progress */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { num: 1, label: t.sos.steps.patient, icon: 'person' },
          { num: 2, label: t.sos.steps.blood, icon: 'water_drop' },
          { num: 3, label: t.sos.steps.doctor, icon: 'description' },
          { num: 4, label: t.sos.steps.broadcast, icon: 'cell_tower' },
        ].map((s) => {
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <div
              key={s.num}
              onClick={() => {
                if (isDone) {
                  setStep(s.num as any);
                  sound.playTap();
                }
              }}
              className={`p-3 rounded-xl border flex flex-col items-center sm:items-start transition-all cursor-pointer ${
                isActive
                  ? 'bg-red-50/80 border-red-500 shadow-sm text-red-700'
                  : isDone
                  ? 'bg-emerald-50/60 border-emerald-300 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive
                      ? 'bg-red-600 text-white'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isDone ? '✓' : s.num}
                </span>
                <span className="text-xs font-bold hidden sm:inline">{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step Contents */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        {/* STEP 1: PATIENT INFO */}
        {step === 1 && (
          <div className="flex flex-col gap-5 animate-in fade-in">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">patient_list</span>
              {t.sos.step1Title}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.sos.patientName} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t.sos.patientNamePlaceholder}
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.sos.age}</label>
                  <input
                    type="number"
                    placeholder={t.sos.agePlaceholder}
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.sos.gender}</label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="Male">{t.sos.genderMale}</option>
                    <option value="Female">{t.sos.genderFemale}</option>
                    <option value="Other">{t.sos.genderOther}</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.sos.hospital} <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                {hospitalsList.map((hosp) => (
                  <option key={hosp} value={hosp}>
                    {hosp}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.sos.wardBed} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t.sos.wardBedPlaceholder}
                  value={wardBed}
                  onChange={(e) => setWardBed(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.sos.attendantPhone} <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder={t.sos.attendantPhonePlaceholder}
                  value={attendantPhone}
                  onChange={(e) => setAttendantPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: BLOOD & URGENCY */}
        {step === 2 && (
          <div className="flex flex-col gap-6 animate-in fade-in">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">bloodtype</span>
              {t.sos.step2Title}
            </h2>

            {/* Blood Group Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {t.sos.selectBloodGroup} <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as BloodGroup[]).map((grp) => {
                  const isSelected = bloodGroup === grp;
                  return (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => {
                        setBloodGroup(grp);
                        sound.playTap();
                      }}
                      className={`py-3 rounded-xl font-black text-sm transition-all flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/30 scale-105'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{grp}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Number of Bags Required */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-800 block">{t.sos.bagsNeeded}</span>
                <span className="text-[11px] text-slate-500">{t.sos.bagsHint}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setBagsRequired((prev) => Math.max(1, prev - 1));
                    sound.playTap();
                  }}
                  className="w-9 h-9 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 text-lg flex items-center justify-center"
                >
                  -
                </button>
                <span className="text-xl font-black text-red-600 w-8 text-center">{bagsRequired}</span>
                <button
                  type="button"
                  onClick={() => {
                    setBagsRequired((prev) => Math.min(8, prev + 1));
                    sound.playTap();
                  }}
                  className="w-9 h-9 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 text-lg flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Urgency Tier */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {t.sos.urgencyLevel}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    tier: 'critical' as UrgencyTier,
                    title: t.sos.urgency.criticalTitle,
                    desc: t.sos.urgency.criticalDesc,
                    color: 'border-red-500 bg-red-50/50 text-red-900',
                  },
                  {
                    tier: 'semi-urgent' as UrgencyTier,
                    title: t.sos.urgency.semiUrgentTitle,
                    desc: t.sos.urgency.semiUrgentDesc,
                    color: 'border-amber-500 bg-amber-50/50 text-amber-900',
                  },
                  {
                    tier: 'scheduled' as UrgencyTier,
                    title: t.sos.urgency.scheduledTitle,
                    desc: t.sos.urgency.scheduledDesc,
                    color: 'border-blue-500 bg-blue-50/50 text-blue-900',
                  },
                ].map((u) => {
                  const isSelected = urgencyTier === u.tier;
                  return (
                    <div
                      key={u.tier}
                      onClick={() => {
                        setUrgencyTier(u.tier);
                        sound.playTap();
                      }}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? u.color + ' ring-2 ring-red-500 ring-offset-1'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-black block">{u.title}</span>
                      <span className="text-[11px] text-slate-500 mt-1 block leading-tight">
                        {u.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.sos.clinicalReason}
              </label>
              <input
                type="text"
                placeholder={t.sos.clinicalReasonPlaceholder}
                value={clinicalReason}
                onChange={(e) => setClinicalReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* STEP 3: DOCTOR REQUISITION & BMDC */}
        {step === 3 && (
          <div className="flex flex-col gap-6 animate-in fade-in">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">verified</span>
              {t.sos.step3Title}
            </h2>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 text-xl shrink-0 mt-0.5">
                shield
              </span>
              <p className="text-xs text-amber-900 leading-relaxed">
                {t.sos.antiFraudNotice}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.sos.doctorName} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t.sos.doctorNamePlaceholder}
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.sos.bmdcReg}
                </label>
                <input
                  type="text"
                  placeholder={t.sos.bmdcRegPlaceholder}
                  value={bmdcReg}
                  onChange={(e) => setBmdcReg(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Requisition Slip Preview Box */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50 flex flex-col items-center justify-center text-center">
              {slipAttached ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl">task_alt</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {t.sos.slipAttached}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {t.sos.slipFileMeta}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSlipAttached(false);
                      sound.playTap();
                    }}
                    className="text-xs text-red-600 hover:underline font-semibold"
                  >
                    {t.sos.slipChange}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-slate-400 text-3xl">upload_file</span>
                  <span className="text-xs font-bold text-slate-700">{t.sos.slipUploadPrompt}</span>
                  <span className="text-[10px] text-slate-400">{t.sos.slipUploadHint}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSlipAttached(true);
                      sound.playTap();
                    }}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                  >
                    {t.sos.slipSelect}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: GEOFENCE BLAST & BROADCAST REVIEW */}
        {step === 4 && (
          <div className="flex flex-col gap-6 animate-in fade-in">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">cell_tower</span>
              {t.sos.step4Title}
            </h2>

            {/* Geofence Range */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">{t.sos.radiusLabel}</span>
                <span className="font-black text-red-600 text-sm">{t.sos.radiusValue(radiusKm)}</span>
              </div>
              <input
                type="range"
                min="2"
                max="20"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{t.sos.radius2}</span>
                <span>{t.sos.radius5}</span>
                <span>{t.sos.radius20}</span>
              </div>
            </div>

            {/* Carrier Gateways */}
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <span className="text-xs font-bold text-slate-700 block mb-2">
                {t.sos.gatewaysLabel}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="font-bold block">Grameenphone</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">{t.sos.gatewayActive('99.8%')}</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="font-bold block">Robi / Airtel</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">{t.sos.gatewayActive('99.7%')}</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="font-bold block">Banglalink</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">{t.sos.gatewayActive('99.9%')}</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="font-bold block">{t.sos.teletalkGovt}</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">{t.sos.gatewayActivePriority}</span>
                </div>
              </div>
            </div>

            {/* Live SMS Preview */}
            <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2 border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1 font-sans font-bold">
                  <span className="material-symbols-outlined text-sm text-red-500">sms</span>
                  {t.sos.smsPreviewTitle}
                </span>
                <span className="text-[10px] bg-red-600/30 text-red-400 px-2 py-0.5 rounded">
                  {t.sos.urgentTag}
                </span>
              </div>
              <p className="leading-relaxed">
                {t.sos.smsPreview(
                  bagsRequired,
                  bloodGroup,
                  patientName || t.sos.smsPatientFallback,
                  selectedHospital,
                  wardBed,
                  doctorName,
                  attendantPhone,
                )}
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>{t.sos.previousStep}</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span>{t.sos.continue}</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinalSubmit}
              className="px-8 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-red-600/30 hover:scale-105"
            >
              <span className="material-symbols-outlined text-lg animate-pulse">crisis_alert</span>
              <span>{isSubmitting ? t.sos.broadcasting : t.sos.launchBroadcast}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
