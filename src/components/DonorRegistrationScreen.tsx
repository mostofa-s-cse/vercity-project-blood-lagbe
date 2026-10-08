import React, { useEffect, useId, useMemo, useState } from 'react';
import { ScreenId, Donor, BloodGroup } from '../types/blood';
import { sound } from '../utils/audio';
import { isValidBdPhone } from '../utils/phone';
import { useGetDonorQuery, useRegisterDonorMutation, useUpdateDonorMutation } from '../store/api';
import { isDatabaseOff } from '../store/errors';
import { browserStorage as donorStorage, readMyDonorProfiles, rememberDonor } from '../lib/myDonorProfile';
import type { DonorRegisteredInfo } from '../context/AppStateContext';
import { useLanguage } from '../context/LanguageContext';
import { BD_DIVISIONS, districtsByDivision } from '../data/bdGeo.ts';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const VEHICLES = [
  { value: 'Personal Motorcycle', id: 'motorcycle' },
  { value: 'Personal Ride / Car', id: 'car' },
  { value: 'Bicycle / On Foot', id: 'bicycle' },
  { value: 'Uber / Public Transit', id: 'publicTransit' },
] as const;

const labelClass = 'block text-sm font-bold text-slate-800 mb-1.5';
const inputClass =
  'w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-base font-medium text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-colors';

interface DonorRegistrationScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onRegisterDonor: (info: DonorRegisteredInfo) => void;
}

export const DonorRegistrationScreen: React.FC<DonorRegistrationScreenProps> = ({
  onNavigate,
  onRegisterDonor
}) => {
  const { t, language } = useLanguage();
  const uid = useId();
  const fieldId = (name: string) => `${uid}-${name}`;

  // A donor this browser already registered (if any), so returning visitors see "My profile" instead
  // of a blank form. Starts null (matches the server-rendered markup) and is read from localStorage
  // only after mount, so hydration does not mismatch; `null` again once they press "Register someone else".
  const [rememberedId, setRememberedId] = useState<string | null>(null);
  useEffect(() => {
    setRememberedId(readMyDonorProfiles(donorStorage())[0]?.id ?? null);
  }, []);

  // Required fields
  const [registerDonor] = useRegisterDonorMutation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | null>(null);
  const [location, setLocation] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [pledge, setPledge] = useState(false);

  // Optional "More details"
  const [age, setAge] = useState('24');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const dhakaDivision = BD_DIVISIONS.find((d) => d.name === 'Dhaka') ?? BD_DIVISIONS[0];
  const [divisionId, setDivisionId] = useState(dhakaDivision.id);
  const districtOptions = useMemo(() => districtsByDivision(divisionId), [divisionId]);
  const [districtId, setDistrictId] = useState(() => districtsByDivision(dhakaDivision.id).find((d) => d.name === 'Dhaka')?.id ?? '');
  const selectedDivision = BD_DIVISIONS.find((d) => d.id === divisionId);
  const selectedDistrict = districtOptions.find((d) => d.id === districtId);
  // Stored as real district + division names (e.g. "Dhaka, Dhaka"); UI language only changes the select labels.
  const division = selectedDistrict && selectedDivision ? `${selectedDistrict.name}, ${selectedDivision.name}` : '';
  const [email, setEmail] = useState('');
  const [weightKg, setWeightKg] = useState('65');
  const [lastDonationMonths, setLastDonationMonths] = useState('4');
  const [vehicle, setVehicle] = useState('Personal Motorcycle');
  const [nearestHospital, setNearestHospital] = useState('Dhaka Medical College Hospital');

  const [submittedDonor, setSubmittedDonor] = useState<Donor | null>(null);

  const phoneValid = isValidBdPhone(phone);
  const showPhoneError = phoneTouched && !phoneValid;
  const canSubmit =
    name.trim() !== '' && phoneValid && bloodGroup !== null && location.trim() !== '' && pledge;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !bloodGroup) {
      setPhoneTouched(true);
      return;
    }

    sound.playSuccessTone();

    const trimmedPhone = phone.trim();
    const createdDonor: Donor = {
      id: `DON-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      age: parseInt(age) || 24,
      gender,
      bloodGroup,
      rhType: bloodGroup.includes('-') ? 'NEG' : 'POS',
      location: location.trim(),
      division,
      distanceKm: 1.5,
      nearestHospital,
      donationCount: 1,
      rating: 5.0,
      badge: 'Community Hero',
      daysElapsedSinceDonation: (parseInt(lastDonationMonths) || 4) * 30,
      isAvailable,
      isOnDuty: isAvailable,
      isBdrcsVerified: true,
      hbLevel: 13.8,
      weightKg: parseInt(weightKg) || 65,
      bloodPressure: '120/80',
      serologyClear: true,
      commuteEtaMin: 12,
      vehicle,
      languages: ['Bangla', 'English'],
      phone: trimmedPhone.startsWith('+880') ? trimmedPhone : `+880 ${trimmedPhone}`,
      avatarUrl: gender === 'Female'
        ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    };

    // Save to the database when one is configured. Fire and forget: the demo works the same without it.
    void registerDonor({
      name: createdDonor.name,
      phone: trimmedPhone,
      bloodGroup,
      area: createdDonor.location,
      age: createdDonor.age,
      gender,
      division,
      email: email.trim() || undefined,
      weightKg: createdDonor.weightKg,
      lastDonationMonths: parseInt(lastDonationMonths) || 4,
      vehicle,
      nearestHospital,
      isAvailable,
    })
      .unwrap()
      .then((saved) => rememberDonor(donorStorage(), { id: saved.id, token: saved.manageToken }))
      .catch(() => undefined);

    onRegisterDonor({ name: createdDonor.name, bloodGroup });
    setSubmittedDonor(createdDonor);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl">
        <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider mb-2">
          {t.register.badge}
        </span>
        <h1 className="text-2xl font-black text-white">{t.register.title}</h1>
        <p className="text-sm text-slate-300 mt-1 leading-relaxed">{t.register.subtitle}</p>
        <button
          type="button"
          onClick={() => onNavigate('donor-directory')}
          className="mt-4 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 cursor-pointer inline-flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">group</span>
          {t.register.browseDonors}
        </button>
      </div>

      {!submittedDonor && rememberedId ? (
        <MyDonorProfilePanel
          id={rememberedId}
          onRegisterAnother={() => setRememberedId(null)}
        />
      ) : submittedDonor ? (
        /* Success Screen */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg text-center flex flex-col items-center gap-4 animate-in zoom-in-95" role="status">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl" aria-hidden="true">verified</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900">{t.register.successTitle}</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {t.register.successDesc(submittedDonor.name, submittedDonor.bloodGroup)}
          </p>

          <div className="w-full rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-4 flex items-center gap-4 text-left">
            <div className="w-14 h-14 shrink-0 rounded-full bg-red-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-red-600/30">
              {submittedDonor.bloodGroup}
            </div>
            <dl className="flex-1 min-w-0 text-sm space-y-1">
              <dt className="sr-only">{t.register.fullName}</dt>
              <dd className="font-black text-slate-900 truncate">{submittedDonor.name}</dd>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">{t.register.summaryPhone}</dt>
                <dd className="font-mono font-bold text-slate-800 truncate">{submittedDonor.phone}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">{t.register.summaryArea}</dt>
                <dd className="font-semibold text-slate-800 truncate">{submittedDonor.location}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">{t.register.summaryStatus}</dt>
                <dd className={`font-semibold ${submittedDonor.isAvailable ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {submittedDonor.isAvailable ? t.register.statusAvailable : t.register.statusUnavailable}
                </dd>
              </div>
            </dl>
          </div>

          <div className="w-full flex flex-col sm:flex-row gap-3 mt-2">
            <button
              type="button"
              onClick={() => onNavigate('donor-passport')}
              className="flex-1 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-600/30 cursor-pointer transition-all"
            >
              {t.register.viewPassport}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('donor-directory')}
              className="flex-1 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm cursor-pointer transition-all"
            >
              {t.register.openDirectory}
            </button>
          </div>
        </div>
      ) : (
        /* Registration Form */
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs flex flex-col gap-5"
        >
          <p className="text-xs text-slate-500">{t.register.requiredNote}</p>

          {/* 1. Full name */}
          <div>
            <label htmlFor={fieldId('name')} className={labelClass}>
              {t.register.fullName}
            </label>
            <input
              id={fieldId('name')}
              type="text"
              required
              autoComplete="name"
              placeholder={t.register.fullNamePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* 2. Mobile number */}
          <div>
            <label htmlFor={fieldId('phone')} className={labelClass}>
              {t.register.mobile}
            </label>
            <input
              id={fieldId('phone')}
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder={t.register.mobilePlaceholder}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setPhoneTouched(true)}
              aria-invalid={showPhoneError}
              aria-describedby={showPhoneError ? fieldId('phone-error') : fieldId('phone-hint')}
              className={`${inputClass} font-mono ${showPhoneError ? 'border-red-500' : ''}`}
            />
            {showPhoneError ? (
              <p id={fieldId('phone-error')} className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm" aria-hidden="true">error</span>
                {t.register.mobileError}
              </p>
            ) : (
              <p id={fieldId('phone-hint')} className="mt-1.5 text-xs text-slate-500">
                {t.register.mobileHint}
              </p>
            )}
          </div>

          {/* 3. Blood group */}
          <fieldset>
            <legend className={labelClass}>{t.register.bloodGroup}</legend>
            <div className="grid grid-cols-4 gap-2">
              {BLOOD_GROUPS.map((bg) => {
                const selected = bloodGroup === bg;
                return (
                  <button
                    key={bg}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setBloodGroup(bg)}
                    className={`min-h-12 rounded-xl border-2 text-base font-black transition-all cursor-pointer ${
                      selected
                        ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-600/30'
                        : 'bg-white border-slate-200 text-slate-800 hover:border-red-300'
                    }`}
                  >
                    {bg}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* 4. Area */}
          <div>
            <label htmlFor={fieldId('area')} className={labelClass}>
              {t.register.area}
            </label>
            <input
              id={fieldId('area')}
              type="text"
              required
              placeholder={t.register.areaPlaceholder}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* 5. Availability switch */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span id={fieldId('available')} className="block text-sm font-bold text-slate-900">
                {t.register.available}
              </span>
              <span id={fieldId('available-hint')} className="block text-xs text-slate-500 mt-0.5">
                {t.register.availableHint}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isAvailable}
              aria-labelledby={fieldId('available')}
              aria-describedby={fieldId('available-hint')}
              onClick={() => setIsAvailable((v) => !v)}
              className={`relative shrink-0 w-14 h-8 rounded-full transition-colors cursor-pointer ${
                isAvailable ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                  isAvailable ? 'translate-x-6' : 'translate-x-0'
                }`}
                aria-hidden="true"
              />
            </button>
          </div>

          {/* 6. Eligibility and voluntary pledge */}
          <label
            htmlFor={fieldId('pledge')}
            className="flex items-start gap-3 p-4 rounded-xl bg-red-50/60 border border-red-200 cursor-pointer"
          >
            <input
              id={fieldId('pledge')}
              type="checkbox"
              required
              checked={pledge}
              onChange={(e) => setPledge(e.target.checked)}
              className="mt-0.5 w-5 h-5 shrink-0 accent-red-600 rounded cursor-pointer"
            />
            <span className="text-sm text-red-950 font-medium leading-relaxed">{t.register.pledge}</span>
          </label>

          {/* 7. More details (optional) */}
          <details className="group rounded-xl border border-slate-200">
            <summary className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-sm font-bold text-slate-900">{t.register.moreDetails}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{t.register.moreDetailsHint}</span>
              </span>
              <span className="material-symbols-outlined text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true">
                expand_more
              </span>
            </summary>

            <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-4">
              <div>
                <label htmlFor={fieldId('age')} className={labelClass}>{t.register.age}</label>
                <input
                  id={fieldId('age')}
                  type="number"
                  inputMode="numeric"
                  min="18"
                  max="65"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor={fieldId('gender')} className={labelClass}>{t.register.gender}</label>
                <select
                  id={fieldId('gender')}
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="Male">{t.register.male}</option>
                  <option value="Female">{t.register.female}</option>
                </select>
              </div>

              <div>
                <label htmlFor={fieldId('division')} className={labelClass}>{t.register.division}</label>
                <select
                  id={fieldId('division')}
                  value={divisionId}
                  onChange={(e) => {
                    const nextDivisionId = e.target.value;
                    setDivisionId(nextDivisionId);
                    setDistrictId(districtsByDivision(nextDivisionId)[0]?.id ?? '');
                  }}
                  className={`${inputClass} cursor-pointer`}
                >
                  {BD_DIVISIONS.map((d) => (
                    <option key={d.id} value={d.id}>{language === 'bn' ? d.bnName : d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={fieldId('district')} className={labelClass}>{t.register.district}</label>
                <select
                  id={fieldId('district')}
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  {districtOptions.map((d) => (
                    <option key={d.id} value={d.id}>{language === 'bn' ? d.bnName : d.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label htmlFor={fieldId('email')} className={labelClass}>{t.register.email}</label>
                <input
                  id={fieldId('email')}
                  type="email"
                  autoComplete="email"
                  placeholder={t.register.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor={fieldId('weight')} className={labelClass}>{t.register.weight}</label>
                <input
                  id={fieldId('weight')}
                  type="number"
                  inputMode="numeric"
                  min="45"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor={fieldId('last-donation')} className={labelClass}>{t.register.lastDonation}</label>
                <input
                  id={fieldId('last-donation')}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={lastDonationMonths}
                  onChange={(e) => setLastDonationMonths(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="col-span-2">
                <label htmlFor={fieldId('vehicle')} className={labelClass}>{t.register.vehicle}</label>
                <select
                  id={fieldId('vehicle')}
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  {VEHICLES.map((v) => (
                    <option key={v.value} value={v.value}>{t.register.vehicleNames[v.id]}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label htmlFor={fieldId('hospital')} className={labelClass}>{t.register.nearestHospital}</label>
                <input
                  id={fieldId('hospital')}
                  type="text"
                  value={nearestHospital}
                  onChange={(e) => setNearestHospital(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </details>

          <div>
            <button
              type="submit"
              disabled={!canSubmit}
              aria-describedby={canSubmit ? undefined : fieldId('submit-hint')}
              className="w-full min-h-14 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-base shadow-lg shadow-red-600/30 cursor-pointer transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <span className="material-symbols-outlined" aria-hidden="true">how_to_reg</span>
              <span>{t.register.submit}</span>
            </button>
            {!canSubmit && (
              <p id={fieldId('submit-hint')} className="mt-2 text-xs text-slate-500 text-center">
                {t.register.submitHint}
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

/**
 * Shown instead of the blank form to a returning visitor whose browser remembers a donor profile.
 * Only ever one instance on the page, so plain static ids are fine here — `useId()` is for repeated or
 * SSR-matched elements, and this component itself only ever mounts after hydration (never server-rendered).
 */
const MyDonorProfilePanel: React.FC<{ id: string; onRegisterAnother: () => void }> = ({ id, onRegisterAnother }) => {
  const { t } = useLanguage();
  const fieldId = (name: string) => `donor-profile-${name}`;
  const { data, error, isLoading } = useGetDonorQuery(id);
  const [updateDonor, { isLoading: isSaving }] = useUpdateDonorMutation();
  const [isAvailable, setIsAvailable] = useState(true);
  const [lastDonationMonths, setLastDonationMonths] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');

  const donor = data?.donor;
  useEffect(() => {
    if (!donor) return;
    setIsAvailable(donor.isAvailable);
    setLastDonationMonths(donor.lastDonationMonths != null ? String(donor.lastDonationMonths) : '');
  }, [donor]);

  const isDemo = isDatabaseOff(error);

  const handleSave = () => {
    setSaveState('idle');
    const months = parseInt(lastDonationMonths, 10);
    void updateDonor({
      id,
      isAvailable,
      ...(Number.isFinite(months) ? { lastDonationMonths: months } : {}),
    })
      .unwrap()
      .then(() => {
        sound.playSuccessTone();
        setSaveState('saved');
      })
      .catch(() => setSaveState('error'));
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-black text-slate-900">{t.register.myProfileTitle}</h2>
        <p className="text-sm text-slate-600 mt-1">{t.register.myProfileDesc}</p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">{t.register.loadingProfile}</p>}
      {isDemo && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">{t.register.profileLoadError}</p>}
      {error && !isDemo && <p className="text-sm text-red-700">{t.register.profileLoadError}</p>}

      {donor && (
        <>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-12 h-12 shrink-0 rounded-full bg-red-600 text-white font-black flex items-center justify-center">
              {donor.bloodGroup}
            </div>
            <div className="min-w-0">
              <p className="font-black text-slate-900 truncate">{donor.name}</p>
              <p className="text-xs text-slate-500 truncate">{donor.area}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span id={fieldId('available')} className="text-sm font-bold text-slate-900">
              {t.register.editAvailable}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isAvailable}
              aria-labelledby={fieldId('available')}
              onClick={() => setIsAvailable((v) => !v)}
              className={`relative shrink-0 w-14 h-8 rounded-full transition-colors cursor-pointer ${isAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${isAvailable ? 'translate-x-6' : 'translate-x-0'}`}
                aria-hidden="true"
              />
            </button>
          </div>

          <div>
            <label htmlFor={fieldId('last-donation')} className={labelClass}>
              {t.register.editLastDonation}
            </label>
            <input
              id={fieldId('last-donation')}
              type="number"
              inputMode="numeric"
              min="0"
              value={lastDonationMonths}
              onChange={(e) => setLastDonationMonths(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-600/30 cursor-pointer disabled:opacity-60"
            >
              {t.register.saveChanges}
            </button>
            {saveState === 'saved' && <span className="text-sm font-semibold text-emerald-700">{t.register.saved}</span>}
            {saveState === 'error' && <span className="text-sm font-semibold text-red-700">{t.register.saveError}</span>}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={onRegisterAnother}
        className="text-sm font-bold text-slate-600 hover:text-slate-900 cursor-pointer text-left"
      >
        {t.register.registerAnother}
      </button>
    </div>
  );
};
