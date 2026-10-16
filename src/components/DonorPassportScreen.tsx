import React, { useEffect, useState } from 'react';
import { ScreenId } from '../types/blood';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useGetDonorDonationsQuery, useRemoveDonationMutation, useGetDonorQuery, useGetDonorsQuery } from '../store/api';
import { DONATION_COOLDOWN_DAYS } from '../lib/eligibility';
import { browserStorage as donorStorage, DONOR_PROFILE_CHANGED, readMyDonorProfiles } from '../lib/myDonorProfile';
import { ageCheck, buildCertificateHtml, donorLevel, nextEligibleDate } from '../lib/passport';
import type { DonationDto } from '../lib/dtoTypes';

interface DonorPassportScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const DonorPassportScreen: React.FC<DonorPassportScreenProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // The donor this browser remembers (from registering), read only after mount so hydration never
  // mismatches; a signed-in person's own profile is the fallback if this browser has none.
  const [rememberedId, setRememberedId] = useState<string | null>(null);
  const [storageRead, setStorageRead] = useState(false);
  useEffect(() => {
    const read = () => {
      setRememberedId(readMyDonorProfiles(donorStorage())[0]?.id ?? null);
      setStorageRead(true);
    };
    read();
    window.addEventListener(DONOR_PROFILE_CHANGED, read);
    return () => window.removeEventListener(DONOR_PROFILE_CHANGED, read);
  }, []);
  const mineQuery = useGetDonorsQuery({ mine: true, pageSize: 1 }, { skip: !user });
  const activeDonorId = rememberedId ?? mineQuery.data?.donors[0]?.id ?? null;

  const donorQuery = useGetDonorQuery(activeDonorId ?? '', { skip: !activeDonorId });
  const donationsQuery = useGetDonorDonationsQuery(activeDonorId ?? '', { skip: !activeDonorId });
  const donor = activeDonorId ? donorQuery.data?.donor : undefined;
  const donations: DonationDto[] = donationsQuery.data?.donations ?? [];
  const [removeDonation, { isLoading: removing }] = useRemoveDonationMutation();
  const [removeError, setRemoveError] = useState(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const dateText = (iso: string) =>
    new Date(iso).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-GB', { dateStyle: 'medium' });

  // A printable certificate for one donation, built from the real record, opened in its own tab.
  const openCertificate = (donation: DonationDto) => {
    if (!donor) return;
    sound.playTap();
    const html = buildCertificateHtml(
      {
        donorName: donor.name,
        bloodGroup: donor.bloodGroup,
        units: donation.units,
        hospital: donation.hospital,
        dateText: dateText(donation.donatedAt),
        code: donation.code,
      },
      { ...t.passport.certificate, codeLabel: t.passport.donationCodeLabel },
      language
    );
    const win = window.open('', '_blank');
    if (!win) {
      showToast(t.passport.certificate.popupBlocked);
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const header = (
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
        <p className="text-xs text-slate-500 mt-0.5">{t.passport.subtitle}</p>
      </div>

      {donor && (
        <button
          disabled={donations.length === 0}
          onClick={() => donations[0] && openCertificate(donations[0])}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          <span>{t.passport.exportCertificate}</span>
        </button>
      )}
    </div>
  );

  // Not known yet, or no donor to show: say so instead of showing someone else's sample passport.
  const waitingForDonor = !storageRead || (!!activeDonorId && (donorQuery.isLoading || donationsQuery.isLoading)) || (!!user && !rememberedId && mineQuery.isLoading);
  if (!donor) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
        {header}
        {waitingForDonor ? (
          <p className="text-center text-sm text-slate-500 py-16" role="status">{t.passport.loading}</p>
        ) : donorQuery.isError && activeDonorId ? (
          <div className="text-center py-16 flex flex-col items-center gap-3" role="alert">
            <p className="text-sm font-semibold text-rose-700">{t.passport.loadError}</p>
            <button
              type="button"
              onClick={() => donorQuery.refetch()}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
            >
              {t.passport.retry}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-5xl text-slate-300">badge</span>
            <h2 className="text-lg font-extrabold text-slate-900">{t.passport.emptyTitle}</h2>
            <p className="text-sm text-slate-600 max-w-md">{t.passport.emptyDesc}</p>
            <button
              onClick={() => {
                sound.playTap();
                onNavigate('donor-register');
              }}
              className="mt-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
            >
              {t.passport.registerCta}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Everything below comes from this donor's real profile and donation rows.
  const totalUnits = donations.reduce((sum, d) => sum + d.units, 0);
  const level = donorLevel(donations.length);
  const lastDonation = donations[0];
  const currentElapsed = donor.lastDonationAt
    ? Math.floor((Date.now() - new Date(donor.lastDonationAt).getTime()) / DAY_MS)
    : DONATION_COOLDOWN_DAYS;
  const isEligible = donor.isEligible;
  const cooldownPct = Math.min(100, Math.max(0, Math.round((currentElapsed / DONATION_COOLDOWN_DAYS) * 100)));
  const daysLeft = Math.max(0, DONATION_COOLDOWN_DAYS - currentElapsed);
  const nextDate = nextEligibleDate(donor.lastDonationAt, DONATION_COOLDOWN_DAYS);
  const age = ageCheck(donor.age);
  const displayName = donor.name;
  const checkClass = (ok: boolean) => (ok ? 'text-emerald-600' : 'text-amber-600');

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-emerald-400 text-xl">verified</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {header}

      {/* Smart Card + Biological Readiness Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Digital Donor ID Card (7 cols) */}
        <div className="lg:col-span-7 bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-red-900/40 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white font-black text-base shadow-md">
                BL
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight text-white block">{t.passport.countryName}</span>
                <span className="text-[10px] text-red-300 uppercase font-semibold">{t.passport.dghsLine}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase border border-amber-500/30">
              <span className="material-symbols-outlined text-xs">military_tech</span>
              <span>{t.passport.level[level]}</span>
            </div>
          </div>

          <div className="relative z-10 my-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-red-500 shadow-xl"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-red-500 shadow-xl flex items-center justify-center">
                  <span className="text-2xl font-black text-white">{(Array.from(displayName)[0] ?? '?').toUpperCase()}</span>
                </div>
              )}

              <div>
                <h2 className="text-xl font-extrabold text-white">{displayName}</h2>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  {t.passport.donorIdLabel}: BL-{donor.id.slice(-8).toUpperCase()}
                </p>
                <p className="text-[11px] text-red-300 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">location_on</span>
                  {t.passport.locationLine(donor.area, donor.division)}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 text-center min-w-[90px]">
              <span className="text-3xl font-black text-red-500">{donor.bloodGroup}</span>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-300">
                {donor.bloodGroup.includes('-') ? t.passport.rhNegative : t.passport.rhPositive}
              </span>
            </div>
          </div>

          <div className="relative z-10 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
            <div>
              <span className="text-[10px] text-slate-500 block">{t.passport.nearestBaseLabel}</span>
              <span className="font-semibold text-slate-200">{donor.nearestHospital ?? t.passport.notStated}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">{t.passport.totalDonationsLabel}</span>
              <span className="font-bold text-emerald-400">{t.passport.totalDonationsCount(totalUnits)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">{t.passport.lastDonationLabel}</span>
              <span className="font-semibold text-slate-200">
                {lastDonation
                  ? t.passport.lastDonationDate(dateText(lastDonation.donatedAt), lastDonation.hospital)
                  : t.passport.neverDonated}
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
                  isEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isEligible ? t.passport.eligibleNow : t.passport.restingPeriod}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center my-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="10" />
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
                  <span className="text-3xl font-black text-slate-900">{Math.min(currentElapsed, DONATION_COOLDOWN_DAYS)}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">{t.passport.ofDays}</span>
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
                    {t.passport.daysRemaining(daysLeft)}
                  </p>
                )}
                <span className="text-[11px] text-slate-400 mt-1 block">{t.passport.mandatoryInterval}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playTap();
              if (isEligible) onNavigate('emergency-hub');
            }}
            disabled={!isEligible}
            className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              isEligible
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/30 cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-base">emergency</span>
            <span>{isEligible ? t.passport.viewNearby : t.passport.cooldownActive}</span>
          </button>
        </div>
      </div>

      {/* Donation readiness: each check is worked out from the donor's own profile and record */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-red-600 text-base">health_and_safety</span>
          {t.passport.readinessTitle}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-600 block">{t.passport.checks.age}</span>
            <span className={`text-sm font-black mt-1 block ${checkClass(age === 'ok')}`}>
              {age === 'ok' && donor.age !== null
                ? t.passport.checks.ageOk(donor.age)
                : age === 'under'
                ? t.passport.checks.ageUnder
                : age === 'over'
                ? t.passport.checks.ageOver
                : t.passport.checks.ageUnknown}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-600 block">{t.passport.checks.interval}</span>
            <span className={`text-sm font-black mt-1 block ${checkClass(isEligible)}`}>
              {!isEligible
                ? t.passport.checks.intervalWait(daysLeft)
                : donor.lastDonationAt
                ? t.passport.checks.intervalOk
                : t.passport.checks.intervalNever}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-600 block">{t.passport.checks.availability}</span>
            <span className={`text-sm font-black mt-1 block ${checkClass(donor.isAvailable)}`}>
              {donor.isAvailable ? t.passport.checks.availableYes : t.passport.checks.availableNo}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-600 block">{t.passport.checks.next}</span>
            <span className={`text-sm font-black mt-1 block ${checkClass(isEligible)}`}>
              {!isEligible && nextDate ? t.passport.checks.nextOn(dateText(nextDate.toISOString())) : t.passport.checks.nextAnytime}
            </span>
          </div>
        </div>
      </div>

      {/* Donation record */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-red-600 text-base">history_edu</span>
          {t.passport.ledgerTitle}
        </h3>

        {donations.length > 0 ? (
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
                    <span className="text-[10px] font-mono text-slate-400 mt-1 block">{dateText(donation.donatedAt)}</span>
                    <span className="text-[10px] font-mono font-bold text-slate-500 mt-0.5 block" title={t.passport.donationCodeLabel}>
                      {donation.code}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => openCertificate(donation)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm text-red-600">verified</span>
                    <span>{t.passport.viewCertificate}</span>
                  </button>
                  <button
                    type="button"
                    disabled={removing}
                    onClick={() => {
                      if (!window.confirm(t.passport.confirmRemoveDonation)) return;
                      setRemoveError(false);
                      void removeDonation({ donorId: donor.id, donationId: donation.id })
                        .unwrap()
                        .catch(() => setRemoveError(true));
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                  >
                    {t.passport.removeDonation}
                  </button>
                </div>
              </div>
            ))}
            {removeError && (
              <p role="alert" className="text-xs font-semibold text-rose-700">
                {t.passport.removeDonationFailed}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500">{t.passport.noDonationsYet}</p>
        )}
      </div>
    </div>
  );
};
