import React, { useState } from 'react';
import { ScreenId } from '../types/blood';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';

interface PitchDeckScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const PitchDeckScreen: React.FC<PitchDeckScreenProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  const slides = [
    {
      title: t.deck.slide1.title,
      subtitle: t.deck.slide1.subtitle,
      tag: t.deck.slide1.tag,
      accentColor: 'from-red-950 via-slate-900 to-black',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-3xl font-black text-red-500">{t.deck.slide1.unitsValue}</span>
              <h4 className="text-sm font-bold text-white mt-1">{t.deck.slide1.unitsTitle}</h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {t.deck.slide1.unitsDesc}
              </p>
            </div>
            <span className="text-[11px] text-red-400 font-semibold mt-4">
              {t.deck.slide1.unitsNote}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-3xl font-black text-amber-400">{t.deck.slide1.syndicateValue}</span>
              <h4 className="text-sm font-bold text-white mt-1">{t.deck.slide1.syndicateTitle}</h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {t.deck.slide1.syndicateDesc}
              </p>
            </div>
            <span className="text-[11px] text-amber-400 font-semibold mt-4">
              {t.deck.slide1.syndicateNote}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-3xl font-black text-blue-400">{t.deck.slide1.chaosValue}</span>
              <h4 className="text-sm font-bold text-white mt-1">{t.deck.slide1.chaosTitle}</h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {t.deck.slide1.chaosDesc}
              </p>
            </div>
            <span className="text-[11px] text-blue-400 font-semibold mt-4">
              {t.deck.slide1.chaosNote}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: t.deck.slide2.title,
      subtitle: t.deck.slide2.subtitle,
      tag: t.deck.slide2.tag,
      accentColor: 'from-slate-950 via-red-950 to-black',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-red-600/30 text-red-400 flex items-center justify-center shrink-0 font-bold">
                1
              </span>
              <div>
                <strong className="text-white block text-sm">{t.deck.slide2.step1Title}</strong>
                <span>{t.deck.slide2.step1Desc}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-red-600/30 text-red-400 flex items-center justify-center shrink-0 font-bold">
                2
              </span>
              <div>
                <strong className="text-white block text-sm">{t.deck.slide2.step2Title}</strong>
                <span>{t.deck.slide2.step2Desc}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-red-600/30 text-red-400 flex items-center justify-center shrink-0 font-bold">
                3
              </span>
              <div>
                <strong className="text-white block text-sm">{t.deck.slide2.step3Title}</strong>
                <span>{t.deck.slide2.step3Desc}</span>
              </div>
            </div>
          </div>

          <div className="bg-red-950/40 rounded-2xl p-5 border border-red-800/40 flex flex-col justify-between">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                {t.deck.slide2.freeBadge}
              </span>
              <h4 className="text-lg font-black text-white mt-2">{t.deck.slide2.protocolTitle}</h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {t.deck.slide2.protocolDesc}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-red-800/40 flex items-center justify-between text-xs font-mono text-red-300">
              <span>{t.deck.slide2.dghsAuthorized}</span>
              <span>{t.deck.slide2.bdrcsAffiliated}</span>
              <span>{t.deck.slide2.integration999}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: t.deck.slide3.title,
      subtitle: t.deck.slide3.subtitle,
      tag: t.deck.slide3.tag,
      accentColor: 'from-slate-900 via-slate-800 to-red-950',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6 text-xs text-slate-300">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <span className="material-symbols-outlined text-red-500 text-3xl mb-2">hourglass_empty</span>
            <h4 className="text-sm font-bold text-white">{t.deck.slide3.cooldownTitle}</h4>
            <p className="mt-2 leading-relaxed">
              {t.deck.slide3.cooldownDesc}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <span className="material-symbols-outlined text-emerald-400 text-3xl mb-2">badge</span>
            <h4 className="text-sm font-bold text-white">{t.deck.slide3.smartIdTitle}</h4>
            <p className="mt-2 leading-relaxed">
              {t.deck.slide3.smartIdDesc}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <span className="material-symbols-outlined text-amber-400 text-3xl mb-2">ac_unit</span>
            <h4 className="text-sm font-bold text-white">{t.deck.slide3.coldChainTitle}</h4>
            <p className="mt-2 leading-relaxed">
              {t.deck.slide3.coldChainDesc}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: t.deck.slide4.title,
      subtitle: t.deck.slide4.subtitle,
      tag: t.deck.slide4.tag,
      accentColor: 'from-red-950 via-slate-900 to-slate-950',
      content: (
        <div className="flex flex-col gap-6 mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-2xl font-black text-white">{t.deck.slide4.responseValue}</span>
              <span className="text-[11px] text-slate-400 block mt-1">{t.deck.slide4.responseLabel}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-2xl font-black text-emerald-400">94.2%</span>
              <span className="text-[11px] text-slate-400 block mt-1">{t.deck.slide4.fulfillmentLabel}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-2xl font-black text-red-500">2,480+</span>
              <span className="text-[11px] text-slate-400 block mt-1">{t.deck.slide4.donorsLabel}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-2xl font-black text-amber-400">64</span>
              <span className="text-[11px] text-slate-400 block mt-1">{t.deck.slide4.districtsLabel}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white">{t.deck.slide4.ctaTitle}</h4>
              <p className="text-xs text-slate-400 mt-1">
                {t.deck.slide4.ctaDesc}
              </p>
            </div>
            <button
              onClick={() => {
                sound.playTap();
                onNavigate('emergency-hub');
              }}
              className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider transition-transform hover:scale-105 shadow-lg shadow-red-600/30 whitespace-nowrap"
            >
              {t.deck.slide4.ctaButton}
            </button>
          </div>
        </div>
      ),
    },
  ];

  const current = slides[currentSlide];

  const handleNext = () => {
    sound.playTap();
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrev = () => {
    sound.playTap();
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
      {/* Slide Canvas */}
      <div
        className={`bg-gradient-to-br ${current.accentColor} rounded-3xl p-6 sm:p-10 text-white border border-slate-700 shadow-2xl relative min-h-[500px] flex flex-col justify-between`}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                {current.tag}
              </span>
              <span className="text-xs text-slate-400">
                {t.deck.slideCounter(currentSlide + 1, slides.length)}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-400">{t.deck.initiative}</span>
          </div>

          {/* Titles */}
          <div className="mt-6">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {current.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium">
              {current.subtitle}
            </p>
          </div>

          {/* Body Content */}
          {current.content}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-8">
          <div className="flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  sound.playTap();
                  setCurrentSlide(idx);
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === currentSlide ? 'w-8 bg-red-500' : 'w-2 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                currentSlide === 0
                  ? 'border-white/10 text-white/30 cursor-not-allowed'
                  : 'border-white/20 text-white hover:bg-white/10'
              }`}
            >
              {t.deck.previous}
            </button>
            <button
              onClick={handleNext}
              disabled={currentSlide === slides.length - 1}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-colors ${
                currentSlide === slides.length - 1
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-md'
              }`}
            >
              {t.deck.nextSlide}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
