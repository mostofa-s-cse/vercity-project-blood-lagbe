import { useCallback, useState } from 'react';

const store = new Map<string, unknown>();

/**
 * `useState` whose value survives its provider remounting, which happens when the
 * `[lang]` layout re-renders for a language switch. Browser-only: the server never
 * reads or writes the store, so nothing leaks between requests.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() =>
    typeof window !== 'undefined' && store.has(key) ? (store.get(key) as T) : initial
  );

  const set = useCallback(
    (update: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof update === 'function' ? (update as (prev: T) => T)(prev) : update;
        if (typeof window !== 'undefined') store.set(key, next);
        return next;
      });
    },
    [key]
  );

  return [value, set] as const;
}
