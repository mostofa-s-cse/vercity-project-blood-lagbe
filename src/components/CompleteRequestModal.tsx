import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { MAX_UNITS } from '../lib/donationConfirm';
import type { ResponseDto } from '../lib/dtoTypes';

interface CompleteRequestModalProps {
  /** undefined while loading */
  responses: ResponseDto[] | undefined;
  failed: boolean;
  saving: boolean;
  onConfirm: (donations: { responseId: string; units: number }[]) => void;
  onClose: () => void;
}

/** Asks the person who manages a request who actually gave blood, before it is marked completed. */
export const CompleteRequestModal: React.FC<CompleteRequestModalProps> = ({ responses, failed, saving, onConfirm, onClose }) => {
  const { t } = useLanguage();
  const [units, setUnits] = useState<Record<string, number>>({});
  const ticked = Object.keys(units);

  const toggle = (id: string) =>
    setUnits((current) => {
      const next = { ...current };
      if (id in next) delete next[id];
      else next[id] = 1;
      return next;
    });

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.tracking.complete.title}
      onKeyDown={(e) => e.key === 'Escape' && !saving && onClose()}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div>
          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600" aria-hidden="true">volunteer_activism</span>
            {t.tracking.complete.title}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.tracking.complete.hint}</p>
        </div>

        {responses === undefined && !failed ? (
          <p className="text-xs text-slate-500">{t.tracking.complete.loading}</p>
        ) : failed ? (
          <p className="text-xs text-rose-700 font-semibold" role="alert">{t.tracking.answersError}</p>
        ) : responses.length === 0 ? (
          <p className="text-xs text-slate-500">{t.tracking.complete.noAnswers}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {responses.map((response) => {
              const on = response.id in units;
              return (
                <li key={response.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <label className="flex items-center gap-2.5 cursor-pointer min-w-0">
                    <input type="checkbox" checked={on} onChange={() => toggle(response.id)} className="w-4 h-4 accent-emerald-600" />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-900 truncate">{response.name}</span>
                      {response.phone && <span className="block text-[11px] text-slate-500 font-mono">{response.phone}</span>}
                    </span>
                  </label>
                  {on && (
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 shrink-0">
                      {t.tracking.complete.units}
                      <select
                        value={units[response.id]}
                        onChange={(e) => setUnits((current) => ({ ...current, [response.id]: Number(e.target.value) }))}
                        className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                      >
                        {Array.from({ length: MAX_UNITS }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {responses !== undefined && !failed && ticked.length === 0 && (
          <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            {t.tracking.complete.nobodyConfirmed}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={saving || (responses === undefined && !failed) || failed}
            onClick={() => onConfirm(ticked.map((responseId) => ({ responseId, units: units[responseId] })))}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs cursor-pointer"
          >
            {saving ? t.tracking.manage.saving : t.tracking.complete.confirm}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
          >
            {t.tracking.complete.back}
          </button>
        </div>
      </div>
    </div>
  );
};
