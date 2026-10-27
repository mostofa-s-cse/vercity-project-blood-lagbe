import React, { createContext, useContext, useState, useEffect } from 'react';
import { sound } from '../utils/audio';
import { TRANSLATIONS } from '../locales';
import {
  addAlert,
  removeAlert,
  updateAlert,
  activeAlerts,
  parseStoredAlerts,
  type CriticalAlert,
  type CriticalAlertInput,
  type EmergencyRadiusConfig,
} from '../lib/alertList';
import { SAMPLE_ALERTS, SAMPLE_RADIUS } from '../data/mockData';
import { useAuth } from './AuthContext';
import {
  useAddAlertMutation,
  useGetAdminAlertsQuery,
  useGetAlertsQuery,
  useGetRadiusQuery,
  useSaveRadiusMutation,
  useRemoveAlertMutation,
  useUpdateAlertMutation,
} from '../store/api';
import { apiErrorCode, isDatabaseOff } from '../store/errors';

export type { CriticalAlert, CriticalAlertInput };

export type { EmergencyRadiusConfig };

interface AlertContextType {
  alerts: CriticalAlert[];
  emergencyRadius: EmergencyRadiusConfig;
  /** True while the saved alerts are still loading. */
  alertsLoading: boolean;
  /** The three changes answer `null` when done, `'limit'` when the list is full, otherwise `'save_failed'`. */
  addCriticalAlert: (input: CriticalAlertInput) => Promise<string | null>;
  updateCriticalAlert: (id: string, updates: Partial<CriticalAlertInput>) => Promise<string | null>;
  removeCriticalAlert: (id: string) => Promise<string | null>;
  /** Answers like the alert changes: `null` when saved, otherwise `'save_failed'`. */
  updateEmergencyRadius: (updates: Partial<EmergencyRadiusConfig>) => Promise<string | null>;
  /** True with no database: alerts and radius then live in this browser only, and "reset" is offered. */
  isDemo: boolean;
  resetAlertDefaults: () => void;
  /** The ribbon text of one alert. */
  getAlertText: (alert: CriticalAlert, lang: 'bn' | 'en') => string;
  /** One line per active alert; the "no alert" line when none is active. */
  getActiveAlertTexts: (lang: 'bn' | 'en') => string[];
  getActiveRadiusText: (lang: 'bn' | 'en') => string;
}

const DEFAULT_ALERTS: CriticalAlert[] = SAMPLE_ALERTS.map(({ ageMinutes, ...alert }) => ({ ...alert, updatedAt: new Date().toISOString() }));

const DEFAULT_RADIUS: EmergencyRadiusConfig = { ...SAMPLE_RADIUS, updatedAt: new Date().toISOString() };

const ALERTS_KEY = 'blood_lagbe_critical_alerts';
const LEGACY_ALERT_KEY = 'blood_lagbe_critical_alert';

/** What the Alerts tab shows with a database but nothing saved yet: the sample values, switched off. */
const UNSAVED_RADIUS: EmergencyRadiusConfig = { ...DEFAULT_RADIUS, isActive: false };

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Alerts live in the database. With no database (demo mode) they live in this browser's local storage.
  const { can } = useAuth();
  const canManage = can('panel.alerts');
  // The ribbon always reads the public list (active alerts), so it stays right even if the admin list fails.
  const publicQuery = useGetAlertsQuery();
  const adminQuery = useGetAdminAlertsQuery(undefined, { skip: !canManage });
  const demo = isDatabaseOff(publicQuery.error);
  const [localAlerts, setLocalAlerts] = useState<CriticalAlert[]>(DEFAULT_ALERTS);
  const ribbonAlerts = demo ? localAlerts : (publicQuery.data?.alerts ?? []);
  // The Alerts tab's list: every alert, including switched-off ones, when the admin list is available.
  const alerts = demo ? localAlerts : (adminQuery.data?.alerts ?? publicQuery.data?.alerts ?? []);
  const alertsLoading = !demo && publicQuery.isLoading;
  const [localRadius, setLocalRadius] = useState<EmergencyRadiusConfig>(DEFAULT_RADIUS);
  const radiusQuery = useGetRadiusQuery(undefined, { skip: !canManage || demo });
  const emergencyRadius = demo ? localRadius : (radiusQuery.data?.radius ?? UNSAVED_RADIUS);
  const [saveRadiusMutation] = useSaveRadiusMutation();
  const [addMutation] = useAddAlertMutation();
  const [updateMutation] = useUpdateAlertMutation();
  const [removeMutation] = useRemoveAlertMutation();

  const saveLocalAlerts = (next: CriticalAlert[]) => {
    setLocalAlerts(next);
    try {
      localStorage.setItem(ALERTS_KEY, JSON.stringify(next));
    } catch (e) {}
  };

  // Load saved config after mount so server and first client render match.
  useEffect(() => {
    try {
      const saved = parseStoredAlerts(localStorage.getItem(ALERTS_KEY), localStorage.getItem(LEGACY_ALERT_KEY));
      if (saved) setLocalAlerts(saved);
    } catch (e) {
      console.error('Error loading critical alerts', e);
    }
    try {
      const savedRadius = localStorage.getItem('blood_lagbe_emergency_radius');
      if (savedRadius) setLocalRadius(JSON.parse(savedRadius));
    } catch (e) {
      console.error('Error loading emergency radius', e);
    }
  }, []);

  const failure = (result: { error?: unknown }): string | null => {
    if (!result.error) return null;
    return apiErrorCode(result.error) === 'limit' ? 'limit' : 'save_failed';
  };

  const addCriticalAlert = async (input: CriticalAlertInput): Promise<string | null> => {
    if (!demo) return failure(await addMutation(input));
    const id = `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const result = addAlert(localAlerts, input, id, new Date().toISOString());
    if (result.error) return result.error;
    saveLocalAlerts(result.value);
    return null;
  };

  const updateCriticalAlert = async (id: string, updates: Partial<CriticalAlertInput>): Promise<string | null> => {
    if (!demo) return failure(await updateMutation({ id, ...updates }));
    saveLocalAlerts(updateAlert(localAlerts, id, updates, new Date().toISOString()));
    return null;
  };

  const removeCriticalAlert = async (id: string): Promise<string | null> => {
    if (!demo) return failure(await removeMutation(id));
    saveLocalAlerts(removeAlert(localAlerts, id));
    return null;
  };

  const updateEmergencyRadius = async (updates: Partial<EmergencyRadiusConfig>): Promise<string | null> => {
    const next: EmergencyRadiusConfig = { ...emergencyRadius, ...updates, updatedAt: new Date().toISOString() };
    if (!demo) {
      const { updatedAt, ...input } = next;
      // An empty text is sent as is, so saving can clear a custom one.
      return failure(await saveRadiusMutation({ ...input, customTextBn: next.customTextBn ?? '', customTextEn: next.customTextEn ?? '' }));
    }
    setLocalRadius(next);
    try {
      localStorage.setItem('blood_lagbe_emergency_radius', JSON.stringify(next));
    } catch (e) {}
    return null;
  };

  // Demo mode only: with a database the saved alerts and radius are real data.
  const resetAlertDefaults = () => {
    if (!demo) return;
    saveLocalAlerts(DEFAULT_ALERTS);
    setLocalRadius(DEFAULT_RADIUS);
    try {
      localStorage.setItem('blood_lagbe_emergency_radius', JSON.stringify(DEFAULT_RADIUS));
    } catch (e) {}
  };

  const getAlertText = (alert: CriticalAlert, lang: 'bn' | 'en'): string => {
    const fallback = TRANSLATIONS[lang].common.alertFallback(alert.hospital, alert.bed, alert.bloodGroup, alert.bags);
    return (lang === 'bn' ? alert.customMessageBn : alert.customMessageEn) || fallback;
  };

  const getActiveAlertTexts = (lang: 'bn' | 'en'): string[] => {
    if (alertsLoading) return [];
    const active = activeAlerts(ribbonAlerts);
    if (active.length === 0) return [TRANSLATIONS[lang].common.alertInactive];
    return active.map((a) => getAlertText(a, lang));
  };

  const getActiveRadiusText = (lang: 'bn' | 'en'): string => {
    if (!emergencyRadius.isActive) {
      return TRANSLATIONS[lang].common.radiusInactive;
    }
    const fallback = TRANSLATIONS[lang].common.radiusFallback(emergencyRadius.zone, emergencyRadius.radiusKm, emergencyRadius.requestCount, emergencyRadius.hospitals);
    if (lang === 'bn') {
      return emergencyRadius.customTextBn || fallback;
    }
    return emergencyRadius.customTextEn || fallback;
  };

  return (
    <AlertContext.Provider
      value={{
        alerts,
        alertsLoading,
        emergencyRadius,
        addCriticalAlert,
        updateCriticalAlert,
        removeCriticalAlert,
        updateEmergencyRadius,
        isDemo: demo,
        resetAlertDefaults,
        getAlertText,
        getActiveAlertTexts,
        getActiveRadiusText,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
