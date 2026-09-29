import React from 'react';
import { ScreenId } from '../types/blood';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface FooterProps {
  onNavigate: (screen: ScreenId) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();

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
                <h4 className="font-bold text-white text-base">{t.footer.legalGuaranteeTitle}</h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase">
                  {t.footer.nonCommercialBadge}
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl mt-1 leading-relaxed">
                {t.footer.legalGuaranteeDesc}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="tel:10655"
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">support_agent</span>
              <span>{t.footer.legalHotlineBtn}</span>
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
            <span className="font-bold text-white text-sm">{t.footer.brandLine}</span>
            <p className="text-[11px] text-slate-400">{t.common.brandSub}</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-3 sm:gap-5 font-semibold text-xs">
          <button onClick={() => onNavigate('emergency-hub')} className="hover:text-white transition-colors cursor-pointer">
            {t.header.nav.emergencyHub}
          </button>
          <button onClick={() => onNavigate('donor-directory')} className="hover:text-white transition-colors cursor-pointer">
            {t.header.nav.donorDirectory}
          </button>
          <button onClick={() => onNavigate('create-sos')} className="hover:text-white transition-colors cursor-pointer">
            {t.header.nav.createSos}
          </button>
          <button onClick={() => onNavigate('request-tracking')} className="hover:text-white transition-colors cursor-pointer">
            {t.header.nav.requestTracking}
          </button>
          <button onClick={() => onNavigate('donor-register')} className="hover:text-white transition-colors cursor-pointer">
            {t.header.nav.donorRegister}
          </button>
          <button onClick={() => onNavigate('live-tracker')} className="hover:text-white transition-colors cursor-pointer">
            {t.header.nav.liveTracker}
          </button>
          <button onClick={() => onNavigate('hospital-org')} className="hover:text-white transition-colors cursor-pointer">
            {t.header.nav.hospitalOrg}
          </button>
          {isAdmin && (
            <button onClick={() => onNavigate('admin-panel')} className="hover:text-white transition-colors cursor-pointer text-red-400 font-bold">
              {t.header.nav.adminPanel}
            </button>
          )}
          <button onClick={() => onNavigate('donor-passport')} className="hover:text-white transition-colors cursor-pointer">
            {t.header.nav.donorPassport}
          </button>
          <button onClick={() => onNavigate('pitch-deck')} className="hover:text-white transition-colors cursor-pointer">
            {t.header.nav.pitchDeck}
          </button>
          <button onClick={() => onNavigate('user-docs')} className="hover:text-white transition-colors cursor-pointer">
            {t.header.nav.userDocs}
          </button>
        </nav>

        <div className="text-[11px] text-slate-500">
          {t.footer.copyright}
        </div>
      </div>
    </footer>
  );
};
