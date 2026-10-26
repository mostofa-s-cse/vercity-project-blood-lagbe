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
} from '../lib/alertList';

export type { CriticalAlert, CriticalAlertInput };

export interface EmergencyRadiusConfig {
  zone: string;
  radiusKm: number;
  requestCount: number;
  hospitals: string;
  customTextBn?: string;
  customTextEn?: string;
  isActive: boolean;
  updatedAt: string;
}

interface AlertContextType {
  alerts: CriticalAlert[];
  emergencyRadius: EmergencyRadiusConfig;
  /** `'limit'` when the list is full. */
  addCriticalAlert: (input: CriticalAlertInput) => string | null;
  updateCriticalAlert: (id: string, updates: Partial<CriticalAlertInput>) => void;
  removeCriticalAlert: (id: string) => void;
  updateEmergencyRadius: (updates: Partial<EmergencyRadiusConfig>) => void;
  resetAlertDefaults: () => void;
  /** The ribbon text of one alert. */
  getAlertText: (alert: CriticalAlert, lang: 'bn' | 'en') => string;
  /** One line per active alert; the "no alert" line when none is active. */
  getActiveAlertTexts: (lang: 'bn' | 'en') => string[];
  getActiveRadiusText: (lang: 'bn' | 'en') => string;
}

const DEFAULT_ALERT: CriticalAlert = {
  id: 'default',
  hospital: 'ঢাকা মেডিকেল কলেজ হাসপাতাল',
  bed: 'ICU বেড ১৪',
  bloodGroup: 'O-',
  bags: 2,
  urgency: 'code_red',
  isActive: true,
  updatedAt: new Date().toISOString(),
};

const DEFAULT_RADIUS: EmergencyRadiusConfig = {
  zone: 'ঢাকা সেন্ট্রাল জোন',
  radiusKm: 5,
  requestCount: 14,
  hospitals: 'DMCH, BSMMU, বারডেম',
  customTextBn: 'ঢাকা সেন্ট্রাল জোনে ৫ কিমি এর মধ্যে ১৪টি জরুরি রক্তের রিকোয়েস্ট (DMCH, BSMMU, বারডেম)',
  customTextEn: '14 Urgent blood requests within 5 km in Dhaka Central Zone (DMCH, BSMMU, BIRDEM)',
  isActive: true,
  updatedAt: new Date().toISOString(),
};

const ALERTS_KEY = 'blood_lagbe_critical_alerts';
const LEGACY_ALERT_KEY = 'blood_lagbe_critical_alert';

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<CriticalAlert[]>([DEFAULT_ALERT]);
  const [emergencyRadius, setEmergencyRadius] = useState<EmergencyRadiusConfig>(DEFAULT_RADIUS);

  const saveAlerts = (next: CriticalAlert[]) => {
    try {
      localStorage.setItem(ALERTS_KEY, JSON.stringify(next));
    } catch (e) {}
  };

  // Load saved config after mount so server and first client render match.
  useEffect(() => {
    try {
      const saved = parseStoredAlerts(localStorage.getItem(ALERTS_KEY), localStorage.getItem(LEGACY_ALERT_KEY));
      if (saved) setAlerts(saved);
    } catch (e) {
      console.error('Error loading critical alerts', e);
    }
    try {
      const savedRadius = localStorage.getItem('blood_lagbe_emergency_radius');
      if (savedRadius) setEmergencyRadius(JSON.parse(savedRadius));
    } catch (e) {
      console.error('Error loading emergency radius', e);
    }
  }, []);

  const addCriticalAlert = (input: CriticalAlertInput): string | null => {
    const id = `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const result = addAlert(alerts, input, id, new Date().toISOString());
    if (result.error) return result.error;
    setAlerts(result.value);
    saveAlerts(result.value);
    return null;
  };

  const updateCriticalAlert = (id: string, updates: Partial<CriticalAlertInput>) => {
    const next = updateAlert(alerts, id, updates, new Date().toISOString());
    setAlerts(next);
    saveAlerts(next);
  };

  const removeCriticalAlert = (id: string) => {
    const next = removeAlert(alerts, id);
    setAlerts(next);
    saveAlerts(next);
  };

  const updateEmergencyRadius = (updates: Partial<EmergencyRadiusConfig>) => {
    setEmergencyRadius(prev => {
      const next: EmergencyRadiusConfig = {
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      if (!updates.customTextBn && (updates.zone || updates.radiusKm || updates.requestCount || updates.hospitals)) {
        const z = updates.zone || prev.zone;
        const r = updates.radiusKm || prev.radiusKm;
        const count = updates.requestCount || prev.requestCount;
        const h = updates.hospitals || prev.hospitals;
        next.customTextBn = `${z}ে ${r} কিমি এর মধ্যে ${count}টি জরুরি রক্তের রিকোয়েস্ট (${h})`;
        next.customTextEn = `${count} Urgent blood requests within ${r} km in ${z} (${h})`;
      }
      try {
        localStorage.setItem('blood_lagbe_emergency_radius', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const resetAlertDefaults = () => {
    setAlerts([DEFAULT_ALERT]);
    setEmergencyRadius(DEFAULT_RADIUS);
    try {
      localStorage.setItem(ALERTS_KEY, JSON.stringify([DEFAULT_ALERT]));
      localStorage.setItem('blood_lagbe_emergency_radius', JSON.stringify(DEFAULT_RADIUS));
    } catch (e) {}
  };

  const getAlertText = (alert: CriticalAlert, lang: 'bn' | 'en'): string => {
    const fallback = TRANSLATIONS[lang].common.alertFallback(alert.hospital, alert.bed, alert.bloodGroup, alert.bags);
    return (lang === 'bn' ? alert.customMessageBn : alert.customMessageEn) || fallback;
  };

  const getActiveAlertTexts = (lang: 'bn' | 'en'): string[] => {
    const active = activeAlerts(alerts);
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
        emergencyRadius,
        addCriticalAlert,
        updateCriticalAlert,
        removeCriticalAlert,
        updateEmergencyRadius,
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
