import React, { useState } from 'react';
import { ScreenId, Donor, BloodGroup } from '../types/blood';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';

const DIVISIONS = [
  { value: 'Dhaka Central', id: 'dhakaCentral' },
  { value: 'Dhaka North', id: 'dhakaNorth' },
  { value: 'Chattogram Port', id: 'chattogram' },
  { value: 'Sylhet Sadar', id: 'sylhet' },
  { value: 'Rajshahi Division', id: 'rajshahi' },
] as const;

const VEHICLES = [
  { value: 'Personal Motorcycle', id: 'motorcycle' },
  { value: 'Personal Ride / Car', id: 'car' },
  { value: 'Bicycle / On Foot', id: 'bicycle' },
  { value: 'Uber / Public Transit', id: 'publicTransit' },
] as const;

interface DonorRegistrationScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onRegisterDonor: (newDonor: Donor) => void;
}

export const DonorRegistrationScreen: React.FC<DonorRegistrationScreenProps> = ({
  onNavigate,
  onRegisterDonor
}) => {
  const { t } = useLanguage();

  // Form states
  const [name, setName] = useState('');
  const [age, setAge] = useState('24');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [phone, setPhone] = useState('017');
  const [email, setEmail] = useState('');
  const [division, setDivision] = useState('Dhaka Central');
  const [location, setLocation] = useState('');
  const [nearestHospital, setNearestHospital] = useState('Dhaka Medical College Hospital');
  const [weightKg, setWeightKg] = useState('65');
  const [lastDonationMonths, setLastDonationMonths] = useState('4');
  const [vehicle, setVehicle] = useState('Personal Motorcycle');
  const [isAvailable, setIsAvailable] = useState(true);

  // Medical questionnaire checklist
  const [weightEligible, setWeightEligible] = useState(true);
  const [noChronicIllness, setNoChronicIllness] = useState(true);
  const [noRecentFever, setNoRecentFever] = useState(true);
  const [voluntaryPledge, setVoluntaryPledge] = useState(true);

  const [isSubmitted, setIsSubmitted] = useState(false);

  const divisionId = DIVISIONS.find((d) => d.value === division)?.id;
  const divisionLabel = divisionId ? t.register.divisionNames[divisionId] : division;
  const vehicleId = VEHICLES.find((v) => v.value === vehicle)?.id;
  const vehicleLabel = vehicleId ? t.register.vehicleNames[vehicleId] : vehicle;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !location) return;
    if (!voluntaryPledge) {
      alert(t.register.pledgeAlert);
      return;
    }

    sound.playSuccessTone();

    const createdDonor: Donor = {
      id: `DON-${Date.now().toString().slice(-4)}`,
      name,
      age: parseInt(age) || 24,
      gender,
      bloodGroup,
      rhType: bloodGroup.includes('-') ? 'NEG' : 'POS',
      location,
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
      phone: phone.startsWith('+880') ? phone : `+880 ${phone.trim()}`,
      avatarUrl: gender === 'Female' 
        ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    };

    onRegisterDonor(createdDonor);
    setIsSubmitted(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
      {/* Registration Header */}
      <div className="bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-80 h-80 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                {t.register.badge}
              </span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">verified</span>
                {t.register.networkTag}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              {t.register.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {t.register.subtitle}
            </p>
          </div>

          <button
            onClick={() => onNavigate('donor-directory')}
            className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 self-start md:self-auto cursor-pointer"
          >
            {t.register.browseDonors}
          </button>
        </div>
      </div>

      {isSubmitted ? (
        /* Success Screen */
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-lg text-center flex flex-col items-center gap-4 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">verified</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            {t.register.successTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg leading-relaxed">
            {t.register.successDesc(name, bloodGroup)}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            <button
              onClick={() => onNavigate('donor-passport')}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-red-600/30 cursor-pointer transition-all"
            >
              {t.register.viewPassport}
            </button>
            <button
              onClick={() => onNavigate('donor-directory')}
              className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer transition-all"
            >
              {t.register.openDirectory}
            </button>
          </div>
        </div>
      ) : (
        /* Registration Form */
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Fields */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col gap-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-red-600">person</span>
                <span>{t.register.section1Title}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {t.register.section1Desc}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.register.fullName}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.register.fullNamePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.register.mobile}
                </label>
                <input
                  type="tel"
                  required
                  placeholder="01712-489021"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.register.bloodGroup}
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-red-600 outline-none cursor-pointer"
                >
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                    <option key={bg} value={bg}>{bg} ({bg.includes('-') ? t.register.rhNeg : t.register.rhPos})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.register.ageGender}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="18"
                    max="65"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none"
                    placeholder={t.register.agePlaceholder}
                  />
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none"
                  >
                    <option value="Male">{t.register.male}</option>
                    <option value="Female">{t.register.female}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-red-600">location_on</span>
                <span>{t.register.section2Title}</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                {t.register.section2Desc}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.register.division}
                  </label>
                  <select
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold outline-none cursor-pointer"
                  >
                    {DIVISIONS.map((d) => (
                      <option key={d.value} value={d.value}>{t.register.divisionOptions[d.id]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.register.area}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t.register.areaPlaceholder}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.register.nearestHospital}
                  </label>
                  <input
                    type="text"
                    value={nearestHospital}
                    onChange={(e) => setNearestHospital(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.register.vehicle}
                  </label>
                  <select
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-none cursor-pointer"
                  >
                    {VEHICLES.map((v) => (
                      <option key={v.value} value={v.value}>{t.register.vehicleOptions[v.id]}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Medical Screening Checklist */}
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-red-600">health_and_safety</span>
                <span>{t.register.section3Title}</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                {t.register.section3Desc}
              </p>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={weightEligible}
                    onChange={(e) => setWeightEligible(e.target.checked)}
                    className="mt-0.5 text-red-600 rounded"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">
                      {t.register.weightTitle}
                    </span>
                    <span className="text-slate-500">
                      {t.register.weightDesc}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noChronicIllness}
                    onChange={(e) => setNoChronicIllness(e.target.checked)}
                    className="mt-0.5 text-red-600 rounded"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">
                      {t.register.illnessTitle}
                    </span>
                    <span className="text-slate-500">
                      {t.register.illnessDesc}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-red-50/60 border border-red-200 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={voluntaryPledge}
                    onChange={(e) => setVoluntaryPledge(e.target.checked)}
                    className="mt-0.5 text-red-600 rounded"
                  />
                  <div className="text-xs text-red-900">
                    <span className="font-extrabold block">
                      {t.register.pledgeTitle}
                    </span>
                    <span>
                      {t.register.pledgeDesc}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-red-600/30 cursor-pointer transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">how_to_reg</span>
              <span>{t.register.submit}</span>
            </button>
          </div>

          {/* Right Live Preview Card */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs sticky top-28">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-3">
                {t.register.previewLabel}
              </span>

              {/* Donor Card Preview */}
              <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-full bg-red-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-red-600/30">
                    {bloodGroup}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                    {t.register.previewActive}
                  </span>
                </div>

                <h4 className="font-black text-slate-900 text-base">{name || t.register.yourName}</h4>
                <p className="text-xs text-slate-500 font-medium">
                  {location || t.register.yourArea}, {divisionLabel}
                </p>

                <div className="mt-4 pt-3 border-t border-red-100 space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t.register.phoneLabel}</span>
                    <span className="font-mono font-bold">{phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t.register.transitLabel}</span>
                    <span className="font-semibold">{vehicleLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t.register.hospitalLabel}</span>
                    <span className="font-semibold truncate max-w-[140px]">{nearestHospital}</span>
                  </div>
                </div>

                <div className="mt-4 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-[11px] text-emerald-800 font-semibold">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  <span>{t.register.verifiedSafeDonor}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-500 leading-relaxed">
                <span className="font-bold text-slate-700 block mb-0.5">{t.register.privacyTitle}</span>
                {t.register.privacyDesc}
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
