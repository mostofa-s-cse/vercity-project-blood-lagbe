import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { pageCount, pageItems, pageRange } from '../lib/pagination';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}

/** Previous / numbered pages / next, with "11-20 of 95". Renders nothing when everything fits on one page. */
export const Pagination: React.FC<PaginationProps> = ({ page, pageSize, total, onPage }) => {
  const { t } = useLanguage();
  const pages = pageCount(total, pageSize);
  if (pages <= 1) return null;

  const current = Math.min(Math.max(1, page), pages);
  const { from, to } = pageRange(current, pageSize, total);
  const button = 'min-w-9 h-9 px-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <nav aria-label={t.common.pagination.label} className="flex flex-col items-center gap-2 pt-2">
      <p className="text-[11px] font-semibold text-slate-500" role="status">
        {t.common.pagination.summary(from, to, total)}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          disabled={current === 1}
          onClick={() => onPage(current - 1)}
          className={`${button} bg-white border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1`}
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">chevron_left</span>
          <span className="hidden sm:inline">{t.common.pagination.previous}</span>
        </button>

        {pageItems(current, pages).map((item, index) =>
          item === 'gap' ? (
            <span key={`gap-${index}`} className="px-1 text-slate-400" aria-hidden="true">…</span>
          ) : (
            <button
              key={item}
              type="button"
              aria-current={item === current ? 'page' : undefined}
              aria-label={t.common.pagination.goTo(item)}
              onClick={() => onPage(item)}
              className={`${button} ${
                item === current ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          disabled={current === pages}
          onClick={() => onPage(current + 1)}
          className={`${button} bg-white border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1`}
        >
          <span className="hidden sm:inline">{t.common.pagination.next}</span>
          <span className="material-symbols-outlined text-base" aria-hidden="true">chevron_right</span>
        </button>
      </div>
    </nav>
  );
};
