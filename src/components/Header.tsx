import React, { useState } from 'react';
import { ScreenId } from '../types/blood';
import { sound } from '../utils/audio';
import { AuthButton } from './AuthButton';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useAlert } from '../context/AlertContext';

interface HeaderProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  selectedDivision: string;
  onSelectDivision: (div: string) => void;
  isAudioMuted: boolean;
  onToggleAudioMute: () => void;
  unreadCount?: number;
  onOpenNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  selectedDivision,
  onSelectDivision,
  isAudioMuted,
  onToggleAudioMute,
  unreadCount = 0,
  onOpenNotifications,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();
  const { getActiveAlertText } = useAlert();
  const { can, user } = useAuth();
  const activeAlertMessage = getActiveAlertText(language);

  const allNavItems: { id: ScreenId; label: string; icon: string; badge?: string }[] = [
    { id: 'emergency-hub', label: t.header.nav.emergencyHub, icon: 'emergency_home' },
    { id: 'donor-directory', label: t.header.nav.donorDirectory, icon: 'person_search' },
    { id: 'create-sos', label: t.header.nav.createSos, icon: 'add_circle' },
    { id: 'request-tracking', label: t.header.nav.requestTracking, icon: 'track_changes', badge: t.header.badgeNew },
    { id: 'donor-register', label: t.header.nav.donorRegister, icon: 'how_to_reg' },
    { id: 'hospital-org', label: t.header.nav.hospitalOrg, icon: 'local_hospital' },
    { id: 'admin-panel', label: t.header.nav.adminPanel, icon: 'admin_panel_settings' },
    { id: 'donor-passport', label: t.header.nav.donorPassport, icon: 'badge' },
    { id: 'user-docs', label: t.header.nav.userDocs, icon: 'menu_book' },
  ];
  // The Admin Panel link is only for people who may open it (the proxy also blocks the page itself).
  const navItems = allNavItems.filter((item) => item.id !== 'admin-panel' || can('panel.open'));

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl shadow-sm border-b border-slate-200">
      {/* 1. Top Critical Alert Ribbon */}
      <div className="bg-red-600 text-white px-3 md:px-8 py-1.5 text-xs overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between font-semibold gap-2 md:gap-4">
          {/* Static Alert Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <span className="uppercase tracking-wider font-extrabold shrink-0 text-[11px] bg-red-700/90 px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] animate-pulse">campaign</span>
              {t.header.criticalAlertPrefix}
            </span>
          </div>

          {/* Continuous Sliding / Marquee Ticker */}
          <div className="flex-1 overflow-hidden min-w-0 marquee-mask relative py-0.5 select-none" title={activeAlertMessage}>
            <div className="animate-marquee-infinite flex items-center shrink-0">
              {/* Set 1 */}
              <div className="flex items-center gap-6 px-3 shrink-0">
                <span className="inline-flex items-center gap-1.5 font-medium text-xs md:text-sm text-red-50 hover:text-white">
                  <span className="material-symbols-outlined text-sm text-amber-300">emergency</span>
                  <span>{activeAlertMessage}</span>
                </span>
                <span className="text-red-300/80 font-bold">•</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-xs md:text-sm text-red-50 hover:text-white">
                  <span className="material-symbols-outlined text-sm text-amber-300">bloodtype</span>
                  <span>{activeAlertMessage}</span>
                </span>
                <span className="text-red-300/80 font-bold">•</span>
              </div>
              {/* Set 2 (Identical for seamless infinite continuous sliding loop) */}
              <div className="flex items-center gap-6 px-3 shrink-0" aria-hidden="true">
                <span className="inline-flex items-center gap-1.5 font-medium text-xs md:text-sm text-red-50 hover:text-white">
                  <span className="material-symbols-outlined text-sm text-amber-300">emergency</span>
                  <span>{activeAlertMessage}</span>
                </span>
                <span className="text-red-300/80 font-bold">•</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-xs md:text-sm text-red-50 hover:text-white">
                  <span className="material-symbols-outlined text-sm text-amber-300">bloodtype</span>
                  <span>{activeAlertMessage}</span>
                </span>
                <span className="text-red-300/80 font-bold">•</span>
              </div>
            </div>
          </div>

          {/* Right Helpline & Audio controls */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <span className="hidden sm:inline opacity-90 text-[11px] font-mono">
              {t.header.helplineText}
            </span>
            <button
              onClick={() => {
                onToggleAudioMute();
                sound.playTap();
              }}
              title={isAudioMuted ? t.header.unmuteChimes : t.header.muteChimes}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">
                {isAudioMuted ? 'volume_off' : 'volume_up'}
              </span>
              <span>{isAudioMuted ? t.header.audioMuted : t.header.audioOn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Brand & Action Bar */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo & Division Selector */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={() => {
              onNavigate('emergency-hub');
              sound.playTap();
            }}
            className="flex items-center gap-2.5 text-left group min-w-0 cursor-pointer"
          >
            {/* Blood Droplet Logo */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-md shadow-red-500/25 group-hover:scale-105 transition-transform shrink-0">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                <path
                  d="M9 13h2l1-2 2 4 1-2h2"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl text-red-600 leading-tight tracking-tight">
                  {t.common.brandName}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                  {t.common.banglaTag}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium leading-none truncate">
                {t.common.brandSub}
              </span>
            </div>
          </button>

          {/* Division Selector */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-slate-800 text-xs font-semibold transition-colors border border-slate-200/60 shrink-0">
            <span className="material-symbols-outlined text-red-600 text-base">location_on</span>
            <select
              value={selectedDivision}
              onChange={(e) => onSelectDivision(e.target.value)}
              className="bg-transparent font-bold outline-none cursor-pointer pr-1 text-xs"
            >
              <option value="Dhaka Central">{t.header.divisions.dhakaCentral}</option>
              <option value="Dhaka North">{t.header.divisions.dhakaNorth}</option>
              <option value="Chattogram Port">{t.header.divisions.chattogram}</option>
              <option value="Sylhet Sadar">{t.header.divisions.sylhet}</option>
              <option value="Rajshahi Division">{t.header.divisions.rajshahi}</option>
            </select>
          </div>
        </div>

        {/* Right CTA Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {/* Real-Time Emergency Notification Bell */}
          <button
            onClick={() => {
              if (onOpenNotifications) {
                onOpenNotifications();
                sound.playTap();
              }
            }}
            title={t.header.notificationsTitle}
            className="relative p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-red-600 rounded-xl border border-slate-300 shadow-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-lg sm:text-xl">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Language Switcher Button (বাংলা / English) */}
          <button
            onClick={() => {
              toggleLanguage();
              sound.playTap();
            }}
            title={t.header.langToggleTitle}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-base text-red-600">translate</span>
            <span className="font-extrabold">{t.header.langToggle}</span>
            <span className="px-1 py-0.2 rounded bg-red-100 text-red-700 text-[10px] font-black uppercase">
              {language.toUpperCase()}
            </span>
          </button>

          {/* SOS Trigger Primary CTA Button */}
          <button
            onClick={() => {
              onNavigate('create-sos');
              sound.playEmergencyChime();
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md shadow-red-600/30 transition-all transform active:scale-95 animate-pulse shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base sm:text-lg">emergency_share</span>
            <span className="tracking-wide uppercase">{t.header.sosTriggerBtn}</span>
          </button>

          {/* Sign in with Google (only when Supabase is configured) */}
          <AuthButton onNavigate={onNavigate} />

          {/* User Profile Avatar Pill — links to the Donor Passport. No fake blood-group badge: this
              header has no real donor lookup, and a made-up group is worse than none. */}
          <button
            onClick={() => onNavigate('donor-passport')}
            className="flex items-center gap-2 pl-0.5 group cursor-pointer shrink-0"
            title={t.header.viewPassportTitle}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={t.header.profileAlt}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200 group-hover:ring-red-500 transition-all"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-900 ring-2 ring-slate-200 group-hover:ring-red-500 transition-all flex items-center justify-center">
                {user?.name || user?.email ? (
                  <span className="text-xs font-black text-white">{(user.name ?? user.email ?? '?')[0].toUpperCase()}</span>
                ) : (
                  <span className="material-symbols-outlined text-base text-white">person</span>
                )}
              </div>
            )}
          </button>

          {/* Mobile Hamburger Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer border border-slate-200"
            title={t.header.toggleMenu}
          >
            <span className="material-symbols-outlined text-xl">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Dedicated Horizontal Navigation Tab Strip */}
      <div className="border-t border-slate-100 bg-slate-50/80">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <nav className="flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-none">
            {navItems.map((item) => {
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    sound.playTap();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-red-600 text-white shadow-sm shadow-red-600/25 scale-[1.02]'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-black tracking-wider ${
                        isActive
                          ? 'bg-white text-red-600'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 4. Mobile Menu Dropdown (when hamburger is clicked) */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 px-4 py-3 shadow-xl animate-in slide-in-from-top-2">
          {/* Mobile Language & Division Selector */}
          <div className="mb-3 p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs gap-2">
            <span className="text-slate-500 font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-red-600 text-sm">location_on</span>
              {t.header.divisionLabel}
            </span>
            <select
              value={selectedDivision}
              onChange={(e) => onSelectDivision(e.target.value)}
              className="font-bold text-slate-800 bg-transparent outline-none text-xs"
            >
              <option value="Dhaka Central">{t.header.divisionsShort.dhakaCentral}</option>
              <option value="Dhaka North">{t.header.divisionsShort.dhakaNorth}</option>
              <option value="Chattogram Port">{t.header.divisionsShort.chattogram}</option>
              <option value="Sylhet Sadar">{t.header.divisionsShort.sylhet}</option>
              <option value="Rajshahi Division">{t.header.divisionsShort.rajshahi}</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-1">
            {navItems.map((item) => {
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileMenuOpen(false);
                    sound.playTap();
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between ${
                    isActive
                      ? 'bg-red-600 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  {isActive && <span className="text-xs">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
