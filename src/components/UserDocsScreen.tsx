import React, { useEffect, useState } from 'react';
import { ScreenId } from '../types/blood';
import { useLanguage } from '../context/LanguageContext';
import { sound } from '../utils/audio';
import { useAuth } from '../context/AuthContext';

type SectionId =
  | 'gettingStarted'
  | 'header'
  | 'hub'
  | 'donors'
  | 'sos'
  | 'tracking'
  | 'register'
  | 'passport'
  | 'hospitals'
  | 'command'
  | 'admin';

// Order follows a first-time user's journey, first screen to last.
const SECTIONS: { id: SectionId; icon: string; screen?: ScreenId }[] = [
  { id: 'gettingStarted', icon: 'flag' },
  { id: 'header', icon: 'web_asset' },
  { id: 'hub', icon: 'emergency_home', screen: 'emergency-hub' },
  { id: 'donors', icon: 'person_search', screen: 'donor-directory' },
  { id: 'sos', icon: 'add_circle', screen: 'create-sos' },
  { id: 'tracking', icon: 'track_changes', screen: 'request-tracking' },
  { id: 'register', icon: 'how_to_reg', screen: 'donor-register' },
  { id: 'passport', icon: 'badge', screen: 'donor-passport' },
  { id: 'hospitals', icon: 'local_hospital', screen: 'hospital-org' },
  { id: 'command', icon: 'monitor_heart', screen: 'ops-command' },
  { id: 'admin', icon: 'admin_panel_settings', screen: 'admin-panel' },
];

const FAQ_ID = 'faq';
// The site header is sticky (about 160px tall), so anchors stop below it.
const ACTIVE_OFFSET_PX = 200;
const anchor = (id: string) => `doc-${id}`;

interface UserDocsScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const UserDocsScreen: React.FC<UserDocsScreenProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { can } = useAuth();
  const d = t.docs;
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);

  const tocItems = [
    ...SECTIONS.map((s) => ({ id: s.id as string, icon: s.icon, title: d.sections[s.id].title })),
    { id: FAQ_ID, icon: 'help', title: d.faq.title },
  ];

  // Highlight the contents entry of the last section whose top has passed under the sticky site header.
  useEffect(() => {
    const update = () => {
      let current = tocItems[0].id;
      for (const item of tocItems) {
        const el = document.getElementById(anchor(item.id));
        if (el && el.getBoundingClientRect().top <= ACTIVE_OFFSET_PX) current = item.id;
      }
      setActiveId(current);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollTo = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    sound.playTap();
    document.getElementById(anchor(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${anchor(id)}`);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
      <div id={anchor('top')} className="scroll-mt-44 flex flex-col gap-3 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-2 text-red-600">
          <span className="material-symbols-outlined text-3xl">menu_book</span>
          <h1 className="text-3xl font-black text-slate-900">{d.pageTitle}</h1>
        </div>
        <p className="text-sm text-slate-600 max-w-2xl">{d.pageSubtitle}</p>
        <div className="mt-2 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 max-w-3xl">
          <span className="material-symbols-outlined text-amber-600 text-xl">info</span>
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-bold">{d.demoNoteTitle}</p>
            <p>{d.demoNote}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-8 items-start">
        <nav
          aria-label={d.tocTitle}
          className="lg:sticky lg:top-44 flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:max-h-[calc(100vh-12rem)] overflow-y-auto"
        >
          <p className="px-2 pb-1 text-[11px] font-black uppercase tracking-wider text-slate-500">{d.tocTitle}</p>
          {tocItems.map((item, index) => (
            <a
              key={item.id}
              href={`#${anchor(item.id)}`}
              onClick={(e) => scrollTo(e, item.id)}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                activeId === item.id ? 'bg-red-50 text-red-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="w-5 text-right text-[10px] text-slate-400">{index + 1}</span>
              <span className="material-symbols-outlined text-base">{item.icon}</span>
              <span>{item.title}</span>
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-10 min-w-0">
          {SECTIONS.map((s, index) => {
            const section = d.sections[s.id];
            const steps = Object.values(section.steps);
            const tips = Object.values(section.tips);
            return (
              <article
                key={s.id}
                id={anchor(s.id)}
                className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4"
              >
                <header className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
                      <span className="material-symbols-outlined text-red-600">{s.icon}</span>
                      {section.title}
                    </h2>
                    <p className="text-sm text-slate-600">{section.summary}</p>
                  </div>
                </header>

                {steps.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">{d.stepsLabel}</h3>
                    <ol className="flex flex-col gap-2">
                      {steps.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-700">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                            {i + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {tips.length > 0 && (
                  <div className="rounded-xl bg-slate-50 p-4">
                    <h3 className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">{d.tipsLabel}</h3>
                    <ul className="flex flex-col gap-1.5">
                      {tips.map((tip, i) => (
                        <li key={i} className="flex gap-2 text-xs text-slate-600">
                          <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {s.screen && (s.screen === 'admin-panel' ? can('panel.open') : s.screen === 'ops-command' ? can('ops.command') : true) && (
                  <div>
                    <button
                      onClick={() => onNavigate(s.screen as ScreenId)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 cursor-pointer"
                    >
                      <span>{d.openScreen}</span>
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </button>
                  </div>
                )}
              </article>
            );
          })}

          <article
            id={anchor(FAQ_ID)}
            className="scroll-mt-44 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4"
          >
            <header className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-sm font-black text-white">
                {SECTIONS.length + 1}
              </span>
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
                <span className="material-symbols-outlined text-red-600">help</span>
                {d.faq.title}
              </h2>
            </header>
            <div className="flex flex-col gap-2">
              {Object.values(d.faq.items).map((item, i) => (
                <details key={i} className="group rounded-xl border border-slate-200 px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-bold text-slate-800 flex items-center justify-between gap-3">
                    <span>{item.q}</span>
                    <span className="material-symbols-outlined text-slate-400 transition-transform group-open:rotate-180">
                      expand_more
                    </span>
                  </summary>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </article>

          <div>
            <a
              href={`#${anchor('top')}`}
              onClick={(e) => scrollTo(e, 'top')}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-red-600"
            >
              <span className="material-symbols-outlined text-base">arrow_upward</span>
              {d.backToTop}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
