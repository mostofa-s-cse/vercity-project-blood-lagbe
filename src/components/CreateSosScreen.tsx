import React, { useEffect, useId, useRef, useState } from 'react';
import { BloodGroup, EmergencyDemand, ScreenId } from '../types/blood';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';
import { buildSosPost } from '../utils/sosPost';
import { isValidBdPhone } from '../utils/phone';
import { saveSos } from '../lib/api';

interface CreateSosScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onSosCreated: (newDemand: EmergencyDemand) => void;
}

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PROBLEM_KEYS = ['pregnant', 'accident', 'surgery', 'thalassemia', 'cancer', 'other'] as const;
const MIN_BAGS = 1;
const MAX_BAGS = 8;
const BROADCAST_DELAY_MS = 1200;

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

const inputClass =
  'w-full px-4 py-3 rounded-xl border text-base text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-red-500 focus:outline-none';
const labelClass = 'block text-sm font-bold text-slate-800 mb-1.5';

export const CreateSosScreen: React.FC<CreateSosScreenProps> = ({ onNavigate, onSosCreated }) => {
  const { language, t } = useLanguage();
  const ids = useId();

  // Form
  const [area, setArea] = useState('');
  const [problem, setProblem] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | null>(null);
  const [bags, setBags] = useState(1);
  const [place, setPlace] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [showPhone2, setShowPhone2] = useState(false);
  const [within1Hour, setWithin1Hour] = useState(true);

  // Validation display
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [touched, setTouched] = useState({ place: false, phone1: false, phone2: false });

  // Submit / success
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postedText, setPostedText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const submitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (submitTimer.current) clearTimeout(submitTimer.current);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    []
  );

  const phones = showPhone2 ? [phone1, phone2] : [phone1];
  const postText = buildSosPost(
    { area, problem, bloodGroup: bloodGroup ?? t.sos.missingGroup, bags, place, phones },
    t.sos.post
  );

  const bloodGroupOk = bloodGroup !== null;
  const placeOk = place.trim() !== '';
  const phone1Ok = isValidBdPhone(phone1);
  const phone2Ok = !showPhone2 || phone2.trim() === '' || isValidBdPhone(phone2);
  const canSubmit = bloodGroupOk && placeOk && phone1Ok && phone2Ok;

  const showBloodGroupError = triedSubmit && !bloodGroupOk;
  const showPlaceError = (triedSubmit || touched.place) && !placeOk;
  const showPhone1Error = (triedSubmit || touched.phone1) && !phone1Ok;
  const showPhone2Error = (triedSubmit || touched.phone2) && !phone2Ok;

  const touch = (field: keyof typeof touched) => setTouched((prev) => ({ ...prev, [field]: true }));

  const changeBags = (delta: number) => {
    sound.playTap();
    setBags((prev) => Math.min(MAX_BAGS, Math.max(MIN_BAGS, prev + delta)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!canSubmit || bloodGroup === null) {
      setTriedSubmit(true);
      return;
    }

    setIsSubmitting(true);
    sound.playSosSiren();

    const finalPost = postText;

    // Save to the database when one is configured. Fire and forget: the demo works the same without it.
    void saveSos({
      area: area.trim() || undefined,
      problem: problem.trim() || undefined,
      bloodGroup,
      bags,
      place: place.trim(),
      phones: phones.map((value) => value.trim()).filter(Boolean),
      isCritical: within1Hour,
      language,
      postText: finalPost,
    });
    const newDemand: EmergencyDemand = {
      id: `DEM-${Math.floor(100 + Math.random() * 900)}`,
      patientName: t.sos.defaultPatient,
      condition: problem.trim() || t.sos.defaultCondition,
      bloodGroup,
      bagsRequired: bags,
      bagsPledged: 0,
      hospital: place.trim(),
      hospitalLocation: area.trim(),
      distanceKm: 2.1,
      urgencyWindowText: within1Hour ? 'Critical: Within 1 Hour' : 'Urgent: Within 4 Hours',
      windowRemainingSec: within1Hour ? 3600 : 14400,
      urgencyTag: within1Hour ? 'High Emergency P1' : 'Priority P2',
      verificationBadge: 'Community SOS Post',
      attendantPhone: phone1.trim(),
      status: 'active',
    };

    submitTimer.current = setTimeout(() => {
      onSosCreated(newDemand);
      setIsSubmitting(false);
      setPostedText(finalPost);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, BROADCAST_DELAY_MS);
  };

  const handleCopy = async () => {
    if (!postedText) return;
    try {
      await navigator.clipboard.writeText(postedText);
      sound.playTap();
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const openShare = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleReset = () => {
    sound.playTap();
    setArea('');
    setProblem('');
    setBloodGroup(null);
    setBags(1);
    setPlace('');
    setPhone1('');
    setPhone2('');
    setShowPhone2(false);
    setWithin1Hour(true);
    setTriedSubmit(false);
    setTouched({ place: false, phone1: false, phone2: false });
    setCopied(false);
    setPostedText(null);
  };

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <span className="inline-block px-2 py-0.5 mb-1 rounded bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider">
          {t.sos.badge}
        </span>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <span className="material-symbols-outlined text-red-600 text-2xl" aria-hidden="true">
            emergency
          </span>
          {postedText ? t.sos.success.title : t.sos.title}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{postedText ? t.sos.success.subtitle : t.sos.subtitle}</p>
      </div>
      <button
        type="button"
        onClick={() => onNavigate('emergency-hub')}
        className="shrink-0 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-sm" aria-hidden="true">
          arrow_back
        </span>
        <span>{t.sos.backToHub}</span>
      </button>
    </div>
  );

  const postCard = (text: string, title: string, hint?: string) => (
    <section className="rounded-2xl border border-red-200 bg-red-50/60 p-4" aria-label={title}>
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-red-600 text-lg" aria-hidden="true">
          campaign
        </span>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      </div>
      {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}
      <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-slate-900 bg-white rounded-xl border border-red-100 p-4 break-words">
        {text}
      </pre>
    </section>
  );

  // ---------- SUCCESS STATE ----------
  if (postedText) {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(postedText)}`;
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      window.location.origin
    )}&quote=${encodeURIComponent(postedText)}`;

    return (
      <div className="w-full max-w-xl mx-auto px-4 py-6 flex flex-col gap-5">
        {header}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
            <span className="material-symbols-outlined text-emerald-600 text-3xl" aria-hidden="true">
              check_circle
            </span>
            <p className="text-base font-bold">{t.sos.success.title}</p>
          </div>

          {postCard(postedText, t.sos.previewTitle)}

          <div className="grid grid-cols-1 gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span aria-live="polite">{copied ? t.sos.success.copied : t.sos.success.copy}</span>
            </button>
            <button
              type="button"
              onClick={() => openShare(waUrl)}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">
                chat
              </span>
              <span>{t.sos.success.whatsapp}</span>
            </button>
            <button
              type="button"
              onClick={() => openShare(fbUrl)}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">
                share
              </span>
              <span>{t.sos.success.facebook}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigate('live-tracker')}
              className="py-3 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 font-bold text-sm flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">
                my_location
              </span>
              <span>{t.sos.success.track}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-sm flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">
                add
              </span>
              <span>{t.sos.success.postAnother}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center">{t.sos.demoNote}</p>
        </div>
      </div>
    );
  }

  // ---------- FORM ----------
  const areaId = `${ids}-area`;
  const problemId = `${ids}-problem`;
  const placeId = `${ids}-place`;
  const placeListId = `${ids}-place-list`;
  const phone1Id = `${ids}-phone1`;
  const phone2Id = `${ids}-phone2`;
  const bagsId = `${ids}-bags`;
  const urgentId = `${ids}-urgent`;
  const errorClass = 'mt-1.5 text-sm font-semibold text-red-600';
  const borderFor = (hasError: boolean) => (hasError ? 'border-red-400 bg-red-50/40' : 'border-slate-200 bg-white');

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 flex flex-col gap-5">
      {header}

      <form
        noValidate
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col gap-6"
      >
        {/* 1. Area */}
        <div>
          <label htmlFor={areaId} className={labelClass}>
            {t.sos.area} <span className="font-normal text-slate-400">({t.sos.optional})</span>
          </label>
          <input
            id={areaId}
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder={t.sos.areaPlaceholder}
            autoComplete="address-level2"
            className={`${inputClass} ${borderFor(false)}`}
          />
        </div>

        {/* 2. Patient problem */}
        <div>
          <label htmlFor={problemId} className={labelClass}>
            {t.sos.problem} <span className="font-normal text-slate-400">({t.sos.optional})</span>
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {PROBLEM_KEYS.map((key) => {
              const label = t.sos.problemChips[key];
              const active = problem === label;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    sound.playTap();
                    setProblem(active ? '' : label);
                  }}
                  className={`px-3.5 py-2 rounded-full border text-sm font-bold transition-colors ${
                    active
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-red-300 hover:bg-red-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <input
            id={problemId}
            type="text"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder={t.sos.problemPlaceholder}
            className={`${inputClass} ${borderFor(false)}`}
          />
        </div>

        {/* 3. Blood group */}
        <fieldset aria-describedby={showBloodGroupError ? `${ids}-bg-error` : undefined}>
          <legend className={labelClass}>
            {t.sos.bloodGroup} <span className="text-red-500">*</span>
          </legend>
          <div className="grid grid-cols-4 gap-2">
            {BLOOD_GROUPS.map((bg) => {
              const active = bloodGroup === bg;
              return (
                <button
                  key={bg}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    sound.playTap();
                    setBloodGroup(bg);
                  }}
                  className={`py-3.5 rounded-xl border-2 text-lg font-black transition-colors ${
                    active
                      ? 'bg-red-600 border-red-600 text-white shadow-sm'
                      : showBloodGroupError
                      ? 'bg-red-50/40 border-red-300 text-slate-800 hover:border-red-400'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-red-300 hover:bg-red-50'
                  }`}
                >
                  {bg}
                </button>
              );
            })}
          </div>
          {showBloodGroupError && (
            <p id={`${ids}-bg-error`} className={errorClass}>
              {t.sos.errors.bloodGroup}
            </p>
          )}
        </fieldset>

        {/* 4. Amount */}
        <div>
          <span id={bagsId} className={labelClass}>
            {t.sos.bags}
          </span>
          <div className="flex items-center gap-3" role="group" aria-labelledby={bagsId}>
            <button
              type="button"
              onClick={() => changeBags(-1)}
              disabled={bags <= MIN_BAGS}
              aria-label={t.sos.bagsLess}
              className="w-12 h-12 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                remove
              </span>
            </button>
            <output aria-live="polite" className="min-w-24 text-center text-lg font-black text-slate-900">
              {t.sos.bagsValue(bags)}
            </output>
            <button
              type="button"
              onClick={() => changeBags(1)}
              disabled={bags >= MAX_BAGS}
              aria-label={t.sos.bagsMore}
              className="w-12 h-12 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                add
              </span>
            </button>
          </div>
        </div>

        {/* 5. Donation place */}
        <div>
          <label htmlFor={placeId} className={labelClass}>
            {t.sos.place} <span className="text-red-500">*</span>
          </label>
          <input
            id={placeId}
            type="text"
            list={placeListId}
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            onBlur={() => touch('place')}
            placeholder={t.sos.placePlaceholder}
            aria-invalid={showPlaceError}
            aria-describedby={showPlaceError ? `${placeId}-error` : undefined}
            className={`${inputClass} ${borderFor(showPlaceError)}`}
          />
          <datalist id={placeListId}>
            {hospitalsList.map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
          {showPlaceError && (
            <p id={`${placeId}-error`} className={errorClass}>
              {t.sos.errors.place}
            </p>
          )}
        </div>

        {/* 6. Contact */}
        <div>
          <label htmlFor={phone1Id} className={labelClass}>
            {t.sos.phone} <span className="text-red-500">*</span>
          </label>
          <input
            id={phone1Id}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone1}
            onChange={(e) => setPhone1(e.target.value)}
            onBlur={() => touch('phone1')}
            placeholder={t.sos.phonePlaceholder}
            aria-invalid={showPhone1Error}
            aria-describedby={showPhone1Error ? `${phone1Id}-error` : undefined}
            className={`${inputClass} ${borderFor(showPhone1Error)}`}
          />
          {showPhone1Error && (
            <p id={`${phone1Id}-error`} className={errorClass}>
              {t.sos.errors.phone}
            </p>
          )}

          {showPhone2 ? (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={phone2Id} className="text-sm font-bold text-slate-800">
                  {t.sos.phone2} <span className="font-normal text-slate-400">({t.sos.optional})</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowPhone2(false);
                    setPhone2('');
                    setTouched((prev) => ({ ...prev, phone2: false }));
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-red-600"
                >
                  {t.sos.removePhone}
                </button>
              </div>
              <input
                id={phone2Id}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
                onBlur={() => touch('phone2')}
                placeholder={t.sos.phonePlaceholder}
                aria-invalid={showPhone2Error}
                aria-describedby={showPhone2Error ? `${phone2Id}-error` : undefined}
                className={`${inputClass} ${borderFor(showPhone2Error)}`}
              />
              {showPhone2Error && (
                <p id={`${phone2Id}-error`} className={errorClass}>
                  {t.sos.errors.phone}
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPhone2(true)}
              className="mt-2 py-1 text-sm font-bold text-red-600 hover:text-red-700 hover:underline"
            >
              {t.sos.addPhone}
            </button>
          )}
        </div>

        {/* Urgency */}
        <label
          htmlFor={urgentId}
          className="flex items-center gap-3 p-3.5 rounded-xl border border-red-200 bg-red-50/60 cursor-pointer select-none"
        >
          <input
            id={urgentId}
            type="checkbox"
            checked={within1Hour}
            onChange={(e) => setWithin1Hour(e.target.checked)}
            className="w-5 h-5 accent-red-600"
          />
          <span className="material-symbols-outlined text-red-600" aria-hidden="true">
            timer
          </span>
          <span className="text-base font-bold text-slate-900">{t.sos.within1Hour}</span>
        </label>

        {/* Live preview */}
        {postCard(postText, t.sos.previewTitle, t.sos.previewHint)}

        {/* Submit */}
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            aria-disabled={!canSubmit || isSubmitting}
            aria-describedby={!canSubmit ? `${ids}-submit-hint` : undefined}
            className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-colors ${
              canSubmit && !isSubmitting
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-md'
                : isSubmitting
                ? 'bg-red-400 text-white cursor-wait'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span className={`material-symbols-outlined ${isSubmitting ? 'animate-spin' : ''}`} aria-hidden="true">
              {isSubmitting ? 'progress_activity' : 'campaign'}
            </span>
            <span>{isSubmitting ? t.sos.submitting : t.sos.submit}</span>
          </button>
          {!canSubmit && (
            <p id={`${ids}-submit-hint`} className="text-xs text-slate-500 text-center">
              {t.sos.submitHint}
            </p>
          )}
          <p className="text-xs text-slate-400 text-center">{t.sos.demoNote}</p>
        </div>
      </form>
    </div>
  );
};
