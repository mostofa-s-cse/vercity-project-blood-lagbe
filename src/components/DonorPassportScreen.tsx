import React, { useEffect, useState } from 'react';
import { ScreenId } from '../types/blood';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useGetDonorDonationsQuery, useGetDonorQuery, useGetDonorsQuery } from '../store/api';
import { DONATION_COOLDOWN_DAYS } from '../lib/eligibility';
import { browserStorage as donorStorage, readMyDonorProfiles } from '../lib/myDonorProfile';

interface DonorPassportScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const DonorPassportScreen: React.FC<DonorPassportScreenProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // The donor this browser remembers (from registering, see WP3), read only after mount so hydration
  // never mismatches; a signed-in person's own profile is the fallback if this browser has none.
  const [rememberedId, setRememberedId] = useState<string | null>(null);
  useEffect(() => {
    setRememberedId(readMyDonorProfiles(donorStorage())[0]?.id ?? null);
  }, []);
  const mineQuery = useGetDonorsQuery({ mine: true, pageSize: 1 }, { skip: !user });
  const activeDonorId = rememberedId ?? mineQuery.data?.donors[0]?.id ?? null;

  const donorQuery = useGetDonorQuery(activeDonorId ?? '', { skip: !activeDonorId });
  const donationsQuery = useGetDonorDonationsQuery(activeDonorId ?? '', { skip: !activeDonorId });
  const realDonor = activeDonorId ? donorQuery.data?.donor : undefined;
  const showSampleNotice = !realDonor;

  // Real donor: cooldown counted from their actual last donation (never donated = fully rested).
  // No real donor identified (or no database): the original fixed sample value.
  const currentElapsed = realDonor
    ? realDonor.lastDonationAt
      ? Math.floor((Date.now() - new Date(realDonor.lastDonationAt).getTime()) / DAY_MS)
      : DONATION_COOLDOWN_DAYS
    : 94;
  const isEligible = realDonor ? realDonor.isEligible : currentElapsed >= DONATION_COOLDOWN_DAYS;
  const cooldownPct = Math.min(100, Math.round((currentElapsed / DONATION_COOLDOWN_DAYS) * 100));
  const donations = donationsQuery.data?.donations ?? [];

  const handleDownloadCertificate = () => {
    sound.playSuccessChime();
    setToastMessage(t.passport.toastCertificate);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-emerald-400 text-xl">verified</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Screen Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider">
              {t.passport.badgeOfficial}
            </span>
            <span className="text-xs text-slate-500">{t.passport.recognized}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 text-2xl">badge</span>
            {t.passport.title}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.passport.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCertificate}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>{t.passport.exportCertificate}</span>
          </button>
        </div>
      </div>

      {showSampleNotice && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs font-medium">
          <span className="material-symbols-outlined text-base text-amber-600">info</span>
          <span>{t.passport.demoNotice}</span>
        </div>
      )}

      {/* Smart Card + Biological Readiness Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Digital Smart Donor ID Card (7 cols) */}
        <div className="lg:col-span-7 bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-red-900/40 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Card Top Brand */}
          <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white font-black text-base shadow-md">
                BL
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight text-white block">
                  {t.passport.countryName}
                </span>
                <span className="text-[10px] text-red-300 uppercase font-semibold">
                  {t.passport.dghsLine}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase border border-amber-500/30">
              <span className="material-symbols-outlined text-xs">military_tech</span>
              <span>{t.passport.goldDonor}</span>
            </div>
          </div>

          {/* Card Center Info & QR */}
          <div className="relative z-10 my-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                {(() => {
                  const displayName = realDonor?.name ?? user?.name ?? user?.email ?? t.passport.donorName;
                  return user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-red-500 shadow-xl"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-red-500 shadow-xl flex items-center justify-center">
                      <span className="text-2xl font-black text-white">{(displayName[0] ?? '?').toUpperCase()}</span>
                    </div>
                  );
                })()}
                <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs border-2 border-slate-900" title={t.passport.verifiedNid}>
                  ✓
                </span>
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-white">{realDonor?.name ?? user?.name ?? t.passport.donorName}</h2>
                <p className="text-xs text-slate-300 font-mono mt-0.5">NID: 1996269120000492</p>
                <p className="text-[11px] text-red-300 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">location_on</span>
                  {realDonor?.area ?? t.passport.locationLine}
                </p>
              </div>
            </div>

            {/* Blood Group & Holographic Emblem */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 text-center min-w-[90px]">
                <span className="text-3xl font-black text-red-500">{realDonor?.bloodGroup ?? 'O+'}</span>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-300">
                  {(realDonor?.bloodGroup ?? 'O+').includes('-') ? t.passport.rhNegative : t.passport.rhPositive}
                </span>
              </div>

              {/* QR Code Placeholder for Hospital Verification */}
              <div className="w-18 h-18 bg-white p-1 rounded-xl shadow-lg flex items-center justify-center shrink-0">
                <svg className="w-full h-full text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 2h8v8H2zm2 2v4h4V4zm10-2h8v8h-8zm2 2v4h4V4zM2 14h8v8H2zm2 2v4h4v-4zm13-2h3v3h-3zm-3 3h3v3h-3zm3 3h3v3h-3zm3-3h3v3h-3zm-6-3h3v3h-3zm6-6h3v3h-3zm-3 3h3v3h-3z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card Footer Details */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
            <div>
              <span className="text-[10px] text-slate-500 block">{t.passport.primaryBaseLabel}</span>
              <span className="font-semibold text-slate-200">{t.passport.primaryBaseValue}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">{t.passport.totalDonationsLabel}</span>
              <span className="font-bold text-emerald-400">
                {realDonor ? t.passport.totalDonationsCount(donations.length) : t.passport.totalDonationsValue}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">{t.passport.lastDonationLabel}</span>
              <span className="font-semibold text-slate-200">
                {realDonor
                  ? donations[0]
                    ? t.passport.lastDonationDate(new Date(donations[0].donatedAt).toLocaleDateString(), donations[0].hospital)
                    : t.passport.neverDonated
                  : t.passport.lastDonationValue}
              </span>
            </div>
          </div>
        </div>

        {/* Biological Readiness Dial (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-red-600 text-base">vital_signs</span>
                {t.passport.cooldownTitle}
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  isEligible
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isEligible ? t.passport.eligibleNow : t.passport.restingPeriod}
              </span>
            </div>

            {/* Circular Progress & Dial */}
            <div className="flex flex-col items-center justify-center my-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={isEligible ? '#10b981' : '#f59e0b'}
                    strokeWidth="10"
                    strokeDasharray={264}
                    strokeDashoffset={264 - (264 * cooldownPct) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-black text-slate-900">{currentElapsed}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {t.passport.ofDays}
                  </span>
                </div>
              </div>

              <div className="text-center mt-3 max-w-xs">
                {isEligible ? (
                  <p className="text-xs text-emerald-700 font-bold flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {t.passport.regenerated}
                  </p>
                ) : (
                  <p className="text-xs text-amber-700 font-bold flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">hourglass_top</span>
                    {t.passport.daysRemaining(DONATION_COOLDOWN_DAYS - currentElapsed)}
                  </p>
                )}
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {t.passport.mandatoryInterval}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playTap();
              onNavigate('emergency-hub');
            }}
            className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              isEligible
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/30'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-base">emergency</span>
            <span>{isEligible ? t.passport.viewNearby : t.passport.cooldownActive}</span>
          </button>
        </div>
      </div>

      {/* Clinical Fitness Vitals Ledger */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-red-600 text-base">health_and_safety</span>
          {t.passport.screeningsTitle}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-600 block">{t.passport.hemoglobin}</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">14.8 g/dL</span>
            <span className="text-[10px] text-emerald-600 font-bold">{t.passport.hbOptimal}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-600 block">{t.passport.bloodPressure}</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">120/80</span>
            <span className="text-[10px] text-emerald-600 font-bold">{t.passport.normotensive}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-600 block">{t.passport.bodyMass}</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">{t.passport.weightValue}</span>
            <span className="text-[10px] text-emerald-600 font-bold">{t.passport.aboveThreshold}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-600 block">{t.passport.ttiScreen}</span>
            <span className="text-xl font-black text-emerald-600 mt-0.5 block">{t.passport.allNegative}</span>
            <span className="text-[10px] text-slate-600">{t.passport.ttiList}</span>
          </div>
        </div>
      </div>

      {/* Donation History Timeline */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-red-600 text-base">history_edu</span>
          {t.passport.ledgerTitle}
        </h3>

        {realDonor ? (
          donations.length > 0 ? (
            <div className="space-y-3">
              {donations.map((donation, idx) => (
                <div
                  key={donation.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-200 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs shrink-0">
                      #{donations.length - idx}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{donation.hospital}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{t.passport.bagsVolume(donation.units)}</p>
                      <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                        {new Date(donation.donatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">{t.passport.noDonationsYet}</p>
          )
        ) : (
          <div className="space-y-3">
            {[
              {
                date: t.passport.history.h1.date,
                hospital: t.passport.history.h1.hospital,
                patient: t.passport.history.h1.patient,
                volume: t.passport.bagVolume,
                certNo: 'CERT-DMCH-8812',
              },
              {
                date: t.passport.history.h2.date,
                hospital: t.passport.history.h2.hospital,
                patient: t.passport.history.h2.patient,
                volume: t.passport.bagVolume,
                certNo: 'CERT-BSMMU-6401',
              },
              {
                date: t.passport.history.h3.date,
                hospital: t.passport.history.h3.hospital,
                patient: t.passport.history.h3.patient,
                volume: t.passport.bagVolume,
                certNo: 'CERT-NHF-4919',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-200 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs shrink-0">
                    #{3 - idx}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{item.hospital}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {item.patient} • {item.volume}
                    </p>
                    <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                      {item.date} • {item.certNo}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleDownloadCertificate}
                  className="self-start sm:self-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm text-red-600">verified</span>
                  <span>{t.passport.viewCertificate}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
