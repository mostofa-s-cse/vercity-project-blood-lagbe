import React, { useState } from 'react';
import { BloodGroup, Donor, ScreenId } from '../types/blood';
import { INITIAL_DONORS } from '../data/mockData';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';

interface DonorDirectoryProps {
  onNavigate: (screen: ScreenId) => void;
  onInitiateEmergencyForDonor?: (donor: Donor) => void;
}

export const DonorDirectory: React.FC<DonorDirectoryProps> = ({
  onNavigate,
  onInitiateEmergencyForDonor,
}) => {
  const { language, t } = useLanguage();
  const [donors, setDonors] = useState<Donor[]>(INITIAL_DONORS);
  const [selectedGroup, setSelectedGroup] = useState<BloodGroup | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxDistance, setMaxDistance] = useState<number>(15);
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(true);
  const [onlyVerified, setOnlyVerified] = useState<boolean>(true);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const bloodGroups: (BloodGroup | 'ALL')[] = [
    'ALL',
    'A+',
    'A-',
    'B+',
    'B-',
    'O+',
    'O-',
    'AB+',
    'AB-',
  ];

  const filteredDonors = donors.filter((d) => {
    if (selectedGroup !== 'ALL' && d.bloodGroup !== selectedGroup) return false;
    if (onlyAvailable && !d.isAvailable) return false;
    if (onlyVerified && !d.isBdrcsVerified) return false;
    if (d.distanceKm > maxDistance) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = d.name.toLowerCase().includes(q);
      const matchLoc = d.location.toLowerCase().includes(q);
      const matchHosp = d.nearestHospital.toLowerCase().includes(q);
      const matchVehicle = d.vehicle.toLowerCase().includes(q);
      if (!matchName && !matchLoc && !matchHosp && !matchVehicle) return false;
    }
    return true;
  });

  const handleCallDonor = (donor: Donor, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playTap();
    setToastMessage(`Initiating secure direct call to ${donor.name} (${donor.phone}). Please state patient hospital & bed number.`);
    setTimeout(() => setToastMessage(null), 4500);
    window.location.href = `tel:${donor.phone.replace(/[^0-9+]/g, '')}`;
  };

  const handleSendUrgentNudge = (donor: Donor, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playAlertPing();
    setToastMessage(`Urgent Priority SMS dispatched to ${donor.name} with nearby hospital beacon.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4 max-w-md">
          <span className="material-symbols-outlined text-emerald-400 text-xl">contact_phone</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-auto">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Directory Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-slate-700/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[11px] font-bold tracking-wide uppercase border border-red-500/30">
                {t.verifiedRosterBadge}
              </span>
              <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {t.activeDonorsCount}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {t.donorRegistryTitle}
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              {t.donorRegistryDesc}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <button
              onClick={() => {
                sound.playSosSiren();
                onNavigate('create-sos');
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 hover:scale-[1.02] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">emergency_share</span>
              <span>{t.broadcastSosBtn}</span>
            </button>
            <button
              onClick={() => {
                sound.playTap();
                onNavigate('donor-passport');
              }}
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-white/20 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">badge</span>
              <span>{t.navDonorPassport}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col gap-4">
        {/* Blood Group Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {language === 'bn' ? 'রক্তের গ্রুপ ফিল্টার:' : 'Filter Blood Group:'}
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {bloodGroups.map((grp) => {
              const isSelected = selectedGroup === grp;
              return (
                <button
                  key={grp}
                  onClick={() => {
                    setSelectedGroup(grp);
                    sound.playTap();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30 scale-105'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {grp === 'ALL' && language === 'bn' ? 'সব' : grp}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search box */}
          <div className="md:col-span-5 relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              placeholder={t.searchDonorPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          {/* Distance Slider */}
          <div className="md:col-span-4 flex items-center gap-3 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/80">
            <span className="material-symbols-outlined text-slate-500 text-lg">distance</span>
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                <span>{t.maxRadiusLabel}</span>
                <span className="text-red-600 font-bold">{maxDistance} km</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="md:col-span-3 flex items-center justify-between sm:justify-end gap-3 text-xs font-semibold text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600"
              />
              <span>{t.availableNowOnly}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyVerified}
                onChange={(e) => setOnlyVerified(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600"
              />
              <span>{t.bdrcsVerifiedOnly}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results Count & Status */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          {language === 'bn' ? (
            <>তালিকাভুক্ত <strong className="text-slate-900">{filteredDonors.length}</strong> জন ভেরিফাইড রক্তদাতা পাওয়া গেছে</>
          ) : (
            <>Showing <strong className="text-slate-900">{filteredDonors.length}</strong> verified voluntary donors matching criteria</>
          )}
        </span>
        <span className="flex items-center gap-1 text-emerald-600 font-semibold">
          <span className="material-symbols-outlined text-base">verified_user</span>
          {t.freeDonationGuarantee}
        </span>
      </div>

      {/* Donor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDonors.map((donor) => {
          const isEligible = donor.daysElapsedSinceDonation >= 90;
          return (
            <div
              key={donor.id}
              onClick={() => setSelectedDonor(donor)}
              className="group bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer hover:border-red-300 relative overflow-hidden"
            >
              {/* Top Accent Strip */}
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  donor.isAvailable ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              />

              <div>
                {/* Header with Avatar & Blood Badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {donor.avatarUrl ? (
                        <img
                          src={donor.avatarUrl}
                          alt={donor.name}
                          className="w-13 h-13 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                      ) : (
                        <div className="w-13 h-13 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-base border-2 border-white shadow-sm">
                          {donor.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      {donor.isAvailable && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" title="Active on duty" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-red-600 transition-colors">
                          {donor.name}
                        </h3>
                        {donor.isBdrcsVerified && (
                          <span className="material-symbols-outlined text-sky-500 text-base" title="BDRCS Verified Donor">
                            verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-xs">location_on</span>
                        {donor.location} • {donor.distanceKm} km
                      </p>
                    </div>
                  </div>

                  {/* Blood Group Badge */}
                  <div className="flex flex-col items-center bg-red-50 text-red-700 px-3 py-1.5 rounded-xl border border-red-200 shrink-0">
                    <span className="text-lg font-black leading-none">{donor.bloodGroup}</span>
                    <span className="text-[9px] font-extrabold uppercase tracking-tight text-red-500">
                      {donor.rhType}
                    </span>
                  </div>
                </div>

                {/* Badges and Attributes */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">military_tech</span>
                    {donor.badge} ({donor.donationCount} {language === 'bn' ? 'বার রক্তদান' : 'donations'})
                  </span>
                  {donor.bmdcReg && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                      {t.doctorVolunteer}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">two_wheeler</span>
                    {donor.vehicle}
                  </span>
                </div>

                {/* Vitals & Cooldown Row */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 text-center mb-4 border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-600 block">{t.hemoglobinLabel}</span>
                    <span className="text-xs font-bold text-slate-800">{donor.hbLevel} g/dL</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 block">{t.restPeriodLabel}</span>
                    <span
                      className={`text-xs font-bold ${
                        isEligible ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {donor.daysElapsedSinceDonation}{language === 'bn' ? ' দিন আগে' : 'd ago'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 block">{t.transitEtaLabel}</span>
                    <span className="text-xs font-bold text-slate-800">~{donor.commuteEtaMin} {language === 'bn' ? 'মিনিট' : 'min'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={(e) => handleCallDonor(donor, e)}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">call</span>
                  <span>{t.directCallBtn}</span>
                </button>
                <button
                  onClick={(e) => handleSendUrgentNudge(donor, e)}
                  title="Dispatch High-Priority SOS SMS"
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base text-red-500">notifications_active</span>
                  <span className="hidden sm:inline">{t.sosPingBtn}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDonors.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">person_off</span>
          </div>
          <h3 className="text-base font-bold text-slate-900">No Donors Matched Filter</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Try expanding the search radius or toggling off "Available Now" to see more volunteers registered in the network.
          </p>
          <button
            onClick={() => {
              setSelectedGroup('ALL');
              setMaxDistance(25);
              setOnlyAvailable(false);
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Selected Donor Detail Drawer/Modal */}
      {selectedDonor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedDonor(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-4">
              {selectedDonor.avatarUrl ? (
                <img
                  src={selectedDonor.avatarUrl}
                  alt={selectedDonor.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-red-500 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 font-black text-xl flex items-center justify-center">
                  {selectedDonor.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{selectedDonor.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-xs font-black">
                    {selectedDonor.bloodGroup} {selectedDonor.rhType}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedDonor.age} yrs • {selectedDonor.gender} • {selectedDonor.location}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>BDRCS Verified & NID Authenticated</span>
                </div>
              </div>
            </div>

            {/* Vitals Summary Card */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-red-500">ecg_heart</span>
                Clinical Fitness & Lab Screen
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-600 block">Hemoglobin</span>
                  <span className="font-bold text-slate-800">{selectedDonor.hbLevel} g/dL</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-600 block">Body Weight</span>
                  <span className="font-bold text-slate-800">{selectedDonor.weightKg} kg</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-600 block">Blood Pressure</span>
                  <span className="font-bold text-slate-800">{selectedDonor.bloodPressure}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-600 block">Serology Tests</span>
                  <span className="font-bold text-emerald-600">All Clear</span>
                </div>
              </div>
            </div>

            {/* Details Table */}
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Nearest Hospital Base</span>
                <span className="font-semibold text-slate-800">{selectedDonor.nearestHospital}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Rapid Transit Mode</span>
                <span className="font-semibold text-slate-800">{selectedDonor.vehicle}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Lifetime Donations</span>
                <span className="font-semibold text-slate-800">{selectedDonor.donationCount} Units (Honorary)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 font-medium">Languages</span>
                <span className="font-semibold text-slate-800">{selectedDonor.languages.join(', ')}</span>
              </div>
              {selectedDonor.bmdcReg && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">BMDC Practitioner ID</span>
                  <span className="font-semibold text-blue-600">{selectedDonor.bmdcReg}</span>
                </div>
              )}
            </div>

            {/* Direct Dial Banner */}
            <div className="bg-red-50 rounded-xl p-3 border border-red-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-red-600 font-bold uppercase block">Verified Contact Phone</span>
                <span className="text-sm font-extrabold text-slate-900">{selectedDonor.phone}</span>
              </div>
              <button
                onClick={(e) => handleCallDonor(selectedDonor, e)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">call</span>
                <span>Call Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
