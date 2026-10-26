/** The admin's emergency alerts: a list the header ribbon reads from. Pure rules, no React. */

export interface CriticalAlert {
  id: string;
  hospital: string;
  bed: string;
  bloodGroup: string;
  bags: number;
  urgency: 'code_red' | 'critical' | 'urgent';
  customMessageBn?: string;
  customMessageEn?: string;
  isActive: boolean;
  updatedAt: string;
}

export type CriticalAlertInput = Omit<CriticalAlert, 'id' | 'updatedAt'>;

/** A ribbon with more than this many messages stops being readable. */
export const MAX_ALERTS = 10;

export function addAlert(list: CriticalAlert[], input: CriticalAlertInput, id: string, now: string) {
  if (list.length >= MAX_ALERTS) return { value: list, error: 'limit' };
  return { value: [...list, { ...input, id, updatedAt: now }], error: null };
}

export function updateAlert(list: CriticalAlert[], id: string, updates: Partial<CriticalAlertInput>, now: string): CriticalAlert[] {
  return list.map((a) => (a.id === id ? { ...a, ...updates, updatedAt: now } : a));
}

export function removeAlert(list: CriticalAlert[], id: string): CriticalAlert[] {
  return list.filter((a) => a.id !== id);
}

export function activeAlerts(list: CriticalAlert[]): CriticalAlert[] {
  return list.filter((a) => a.isActive);
}

/** Read what was saved: the new list, else the old single alert turned into a one-item list. `null` means nothing usable. */
export function parseStoredAlerts(rawList: string | null, rawLegacy: string | null): CriticalAlert[] | null {
  if (rawList) {
    try {
      const parsed = JSON.parse(rawList);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return null;
    }
    return null;
  }
  if (rawLegacy) {
    try {
      const old = JSON.parse(rawLegacy);
      if (old && typeof old === 'object') return [{ ...old, id: 'legacy' }];
    } catch {
      return null;
    }
  }
  return null;
}
