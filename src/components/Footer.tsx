import React from 'react';
import { ScreenId } from '../types/blood';
import { useLanguage } from '../context/LanguageContext';

interface FooterProps {
  onNavigate: (screen: ScreenId) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { t } = useLanguage();

  return (
    <footer className="w-full bg-slate-900 text-slate-300 mt-16 border-t border-slate-800">
      {/* Upper Legal & Ethical Guarantee Banner */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 border-b border-slate-800/80">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-3xl">volunteer_activism</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-base">{t.legalGuaranteeTitle}</h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase">
                  Strict Non-Commercial
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl mt-1 leading-relaxed">
                {t.legalGuaranteeDesc}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="tel:10655"
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">support_agent</span>
              <span>{t.legalHotlineBtn}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center text-white font-black text-sm">
            BL
          </div>
          <div>
            <span className="font-bold text-white text-sm">Blood Lagbe? (রক্ত লাগবে?)</span>
            <p className="text-[11px] text-slate-400">{t.brandSub}</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-4 sm:gap-6 font-medium">
          <button onClick={() => onNavigate('emergency-hub')} className="hover:text-white transition-colors cursor-pointer">
            {t.navEmergencyHub}
          </button>
          <button onClick={() => onNavigate('donor-directory')} className="hover:text-white transition-colors cursor-pointer">
            {t.navDonorDirectory}
          </button>
          <button onClick={() => onNavigate('create-sos')} className="hover:text-white transition-colors cursor-pointer">
            {t.navCreateSos}
          </button>
          <button onClick={() => onNavigate('live-tracker')} className="hover:text-white transition-colors cursor-pointer">
            {t.navLiveTracker}
          </button>
          <button onClick={() => onNavigate('donor-passport')} className="hover:text-white transition-colors cursor-pointer">
            {t.navDonorPassport}
          </button>
          <button onClick={() => onNavigate('ops-command')} className="hover:text-white transition-colors cursor-pointer">
            {t.navOpsCommand}
          </button>
          <button onClick={() => onNavigate('pitch-deck')} className="hover:text-white transition-colors cursor-pointer">
            {t.navPitchDeck}
          </button>
        </nav>

        <div className="text-[11px] text-slate-500">
          © 2026 Blood Lagbe? • DGHS & BDRCS Affiliated
        </div>
      </div>
    </footer>
  );
};
