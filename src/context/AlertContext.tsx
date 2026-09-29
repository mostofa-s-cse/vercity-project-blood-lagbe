import React, { createContext, useContext, useState, useEffect } from 'react';
import { sound } from '../utils/audio';

export interface CriticalAlertConfig {
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
  criticalAlert: CriticalAlertConfig;
  emergencyRadius: EmergencyRadiusConfig;
  updateCriticalAlert: (updates: Partial<CriticalAlertConfig>) => void;
  updateEmergencyRadius: (updates: Partial<EmergencyRadiusConfig>) => void;
  resetAlertDefaults: () => void;
  getActiveAlertText: (lang: 'bn' | 'en') => string;
  getActiveRadiusText: (lang: 'bn' | 'en') => string;
}

const DEFAULT_ALERT: CriticalAlertConfig = {
  hospital: 'ঢাকা মেডিকেল কলেজ হাসপাতাল',
  bed: 'ICU বেড ১৪',
  bloodGroup: 'O-',
  bags: 2,
  urgency: 'code_red',
  customMessageBn: 'ঢাকা মেডিকেল কলেজ হাসপাতালে (ICU বেড ১৪) ও-নেগেটিভ রক্ত অতি জরুরি • ২ ব্যাগ প্রয়োজন',
  customMessageEn: 'Dhaka Medical College Hospital (ICU Bed 14) O-Negative blood urgently required • 2 Bags needed',
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

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [criticalAlert, setCriticalAlert] = useState<CriticalAlertConfig>(DEFAULT_ALERT);
  const [emergencyRadius, setEmergencyRadius] = useState<EmergencyRadiusConfig>(DEFAULT_RADIUS);

  // Load saved config after mount so server and first client render match.
  useEffect(() => {
    try {
      const savedAlert = localStorage.getItem('blood_lagbe_critical_alert');
      if (savedAlert) setCriticalAlert(JSON.parse(savedAlert));
    } catch (e) {
      console.error('Error loading critical alert', e);
    }
    try {
      const savedRadius = localStorage.getItem('blood_lagbe_emergency_radius');
      if (savedRadius) setEmergencyRadius(JSON.parse(savedRadius));
    } catch (e) {
      console.error('Error loading emergency radius', e);
    }
  }, []);

  const updateCriticalAlert = (updates: Partial<CriticalAlertConfig>) => {
    setCriticalAlert(prev => {
      const next: CriticalAlertConfig = {
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      // Auto-compute text if custom text isn't explicitly provided
      if (!updates.customMessageBn && (updates.hospital || updates.bed || updates.bloodGroup || updates.bags)) {
        const h = updates.hospital || prev.hospital;
        const b = updates.bed || prev.bed;
        const bg = updates.bloodGroup || prev.bloodGroup;
        const bags = updates.bags || prev.bags;
        next.customMessageBn = `${h}ে (${b}) ${bg} রক্ত অতি জরুরি • ${bags} ব্যাগ প্রয়োজন`;
        next.customMessageEn = `${h} (${b}) ${bg} blood urgently required • ${bags} Bag(s) needed`;
      }
      try {
        localStorage.setItem('blood_lagbe_critical_alert', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
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
    setCriticalAlert(DEFAULT_ALERT);
    setEmergencyRadius(DEFAULT_RADIUS);
    try {
      localStorage.setItem('blood_lagbe_critical_alert', JSON.stringify(DEFAULT_ALERT));
      localStorage.setItem('blood_lagbe_emergency_radius', JSON.stringify(DEFAULT_RADIUS));
    } catch (e) {}
  };

  const getActiveAlertText = (lang: 'bn' | 'en'): string => {
    if (!criticalAlert.isActive) {
      return lang === 'bn' 
        ? 'বর্তমানে কোনো কোড-রেড জরুরি সতর্কতা জারি নেই • সেন্ট্রাল ব্লাড ব্যাংক সক্রিয়' 
        : 'No Code-Red alert currently active • Central blood bank active';
    }
    if (lang === 'bn') {
      return criticalAlert.customMessageBn || `${criticalAlert.hospital}ে (${criticalAlert.bed}) ${criticalAlert.bloodGroup} রক্ত অতি জরুরি • ${criticalAlert.bags} ব্যাগ প্রয়োজন`;
    }
    return criticalAlert.customMessageEn || `${criticalAlert.hospital} (${criticalAlert.bed}) ${criticalAlert.bloodGroup} blood urgently required • ${criticalAlert.bags} Bag(s) needed`;
  };

  const getActiveRadiusText = (lang: 'bn' | 'en'): string => {
    if (!emergencyRadius.isActive) {
      return lang === 'bn' 
        ? 'সেন্ট্রাল জোনের রেডিয়াস অ্যালার্ট সক্রিয়' 
        : 'Central zone radius dispatch standby';
    }
    if (lang === 'bn') {
      return emergencyRadius.customTextBn || `${emergencyRadius.zone}ে ${emergencyRadius.radiusKm} কিমি এর মধ্যে ${emergencyRadius.requestCount}টি জরুরি রক্তের রিকোয়েস্ট (${emergencyRadius.hospitals})`;
    }
    return emergencyRadius.customTextEn || `${emergencyRadius.requestCount} Urgent blood requests within ${emergencyRadius.radiusKm} km in ${emergencyRadius.zone} (${emergencyRadius.hospitals})`;
  };

  return (
    <AlertContext.Provider
      value={{
        criticalAlert,
        emergencyRadius,
        updateCriticalAlert,
        updateEmergencyRadius,
        resetAlertDefaults,
        getActiveAlertText,
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
