/** Page arithmetic for lists shown a page at a time. Pure: no React, no storage. */

/** How many pages `total` items need (at least 1, so an empty list still has a first page). */
export function pageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * The page buttons to show: every page when there are few, otherwise the first, the last and the ones next
 * to the current page, with 'gap' where pages are left out. A gap that would hide a single page shows it.
 */
export function pageItems(current: number, pages: number): Array<number | 'gap'> {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  const at = Math.min(Math.max(1, current), pages);
  const shown = [...new Set([1, pages, at - 1, at, at + 1].filter((page) => page >= 1 && page <= pages))].sort((a, b) => a - b);
  const items: Array<number | 'gap'> = [];
  shown.forEach((page, index) => {
    const previous = shown[index - 1];
    if (previous !== undefined && page - previous === 2) items.push(previous + 1);
    else if (previous !== undefined && page - previous > 2) items.push('gap');
    items.push(page);
  });
  return items;
}

/** The 1-based numbers of the first and last item on a page, for "11-20 of 95". Zeros when empty. */
export function pageRange(page: number, pageSize: number, total: number): { from: number; to: number } {
  if (total <= 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  return { from, to: Math.min(total, page * pageSize) };
}

/** One page of an in-memory list. */
export function pageSlice<T>(list: readonly T[], page: number, pageSize: number): T[] {
  return list.slice((page - 1) * pageSize, page * pageSize);
}
