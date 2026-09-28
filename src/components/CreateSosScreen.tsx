import React, { useState } from 'react';
import { BloodGroup, EmergencyDemand, ScreenId, UrgencyTier } from '../types/blood';
import { sound } from '../utils/audio';

interface CreateSosScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onSosCreated: (newDemand: EmergencyDemand) => void;
}

export const CreateSosScreen: React.FC<CreateSosScreenProps> = ({
  onNavigate,
  onSosCreated,
}) => {
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
              Emergency Broadcast Center
            </span>
            <span className="text-xs text-slate-400">• Multi-Carrier SMS Dispatch</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 text-2xl">emergency</span>
            Create Emergency SOS Request
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Geofenced alert broadcast to verified voluntary donors within minutes across Dhaka & nationwide.
          </p>
        </div>

        <button
          onClick={() => onNavigate('emergency-hub')}
          className="self-start sm:self-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Back to Hub</span>
        </button>
      </div>

      {/* Stepper Wizard Progress */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { num: 1, label: 'Patient Info', icon: 'person' },
          { num: 2, label: 'Blood & Urgency', icon: 'water_drop' },
          { num: 3, label: 'Doctor Slip', icon: 'description' },
          { num: 4, label: 'Broadcast SOS', icon: 'cell_tower' },
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
              Step 1: Patient & Hospital Location
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Patient Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nahidul Islam / 8-yr-old Child"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    placeholder="e.g. 28"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hospital / Medical Center <span className="text-red-500">*</span>
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
                  Ward / Cabin / Bed No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Trauma ICU Bed 04 / OT Complex"
                  value={wardBed}
                  onChange={(e) => setWardBed(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Attendant Contact Mobile <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 01712-489021"
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
              Step 2: Blood Group & Emergency Urgency
            </h2>

            {/* Blood Group Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Select Required Blood Group <span className="text-red-500">*</span>
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
                <span className="text-xs font-bold text-slate-800 block">Number of Bags / Units Needed</span>
                <span className="text-[11px] text-slate-500">Standard 450 mL whole blood bag</span>
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
                Emergency Urgency Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    tier: 'critical' as UrgencyTier,
                    title: 'Immediate (Code Red)',
                    desc: 'Under 1-2 hours (Massive trauma, maternal hemorrhage)',
                    color: 'border-red-500 bg-red-50/50 text-red-900',
                  },
                  {
                    tier: 'semi-urgent' as UrgencyTier,
                    title: 'Urgent (Under 6h)',
                    desc: 'Scheduled surgery today / Severe anemia',
                    color: 'border-amber-500 bg-amber-50/50 text-amber-900',
                  },
                  {
                    tier: 'scheduled' as UrgencyTier,
                    title: 'Scheduled (Next 24h)',
                    desc: 'Thalassemia transfusion / Routine elective',
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
                Clinical Indication / Diagnosis
              </label>
              <input
                type="text"
                placeholder="e.g. Ruptured Ectopic Pregnancy, Open Heart Surgery"
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
              Step 3: Doctor Requisition & Anti-Fraud Verification
            </h2>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 text-xl shrink-0 mt-0.5">
                shield
              </span>
              <p className="text-xs text-amber-900 leading-relaxed">
                To prevent black-market hoarding and syndicate exploitation, all requests broadcasted through Blood Lagbe are cross-checked with attending hospital doctor credentials. Fake slips will result in permanent NID and mobile blacklisting.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Attending Doctor's Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Farhana Yasmin, FCPS"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  BMDC Registration Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. BMDC-A-49210"
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
                      Hospital Requisition Slip Attached (Verified Seal)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      DMCH-BLOOD-REQ-9842.PDF • 1.4 MB • Tamper-Resistant Timestamped
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
                    Change / Re-upload File
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-slate-400 text-3xl">upload_file</span>
                  <span className="text-xs font-bold text-slate-700">Click to upload doctor signed requisition slip</span>
                  <span className="text-[10px] text-slate-400">JPG, PNG, PDF up to 5MB</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSlipAttached(true);
                      sound.playTap();
                    }}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                  >
                    Select Hospital Prescription
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
              Step 4: Geofence Dispatch & Multi-Carrier Gateway
            </h2>

            {/* Geofence Range */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">Geofence Broadcast Radius:</span>
                <span className="font-black text-red-600 text-sm">{radiusKm} km Radius</span>
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
                <span>2 km (Walking / Rickshaw)</span>
                <span>5 km (Motorcycle / Fast transit)</span>
                <span>20 km (Greater Dhaka Met)</span>
              </div>
            </div>

            {/* Carrier Gateways */}
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Multi-Carrier SMS Dispatcher Gateways:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="font-bold block">Grameenphone</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Active • 99.8%</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="font-bold block">Robi / Airtel</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Active • 99.7%</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="font-bold block">Banglalink</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Active • 99.9%</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="font-bold block">Teletalk (Govt)</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Active • Priority</span>
                </div>
              </div>
            </div>

            {/* Live SMS Preview */}
            <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2 border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1 font-sans font-bold">
                  <span className="material-symbols-outlined text-sm text-red-500">sms</span>
                  SMS Alert Payload Preview (Automated SMS to ~450 Donors)
                </span>
                <span className="text-[10px] bg-red-600/30 text-red-400 px-2 py-0.5 rounded">
                  URGENT
                </span>
              </div>
              <p className="leading-relaxed">
                [BLOOD LAGBE? SOS ALERT] Urgent {bloodGroup} blood required for {patientName || 'Patient'} at {selectedHospital}, {wardBed}. {bagsRequired} Bag(s) needed. Requisition verified by {doctorName}. Please call {attendantPhone} immediately if you can donate. Non-commercial/free service.
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
              <span>Previous Step</span>
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
              <span>Continue</span>
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
              <span>{isSubmitting ? 'Broadcasting Emergency...' : 'Launch Geofence SOS Broadcast'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
