import { TRANSLATIONS as LEGACY } from '../utils/translations';
import { en } from './en';
import { bn } from './bn';

export type Language = 'bn' | 'en';
export type { Translations } from './en';

// Legacy flat keys are merged in until every component uses the namespaced locales.
export const TRANSLATIONS = {
  bn: { ...LEGACY.bn, ...bn },
  en: { ...LEGACY.en, ...en },
};
