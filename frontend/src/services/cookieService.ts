import type { CookieCategory, LanguageCode } from '../components/cookie/types';
import { SUPPORTED_LANGUAGES } from '../config/languages';

export { CookieCategory, LanguageCode };
export type { CookieCategory as CookieCategoryType, LanguageCode as LanguageCodeType };

export const COOKIE_CONSENT_KEY = 'cookie_consent';
export const ANALYTICS_ENABLED_KEY = 'analytics_enabled';
export const COOKIE_DECLINED_KEY = 'cookie_declined';
export const COOKIE_DECLINED_EXPIRY_DAYS = 30;
export const LANGUAGE_PREFERRED_KEY = 'language_preferred';

type StorageType = 'local' | 'session';

const getStorage = (type: StorageType = 'session'): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return type === 'session' ? sessionStorage : localStorage;
  } catch {
    return type === 'session' ? localStorage : null;
  }
};

const setItem = <T>(key: string, value: T, storageType: StorageType = 'session'): void => {
  const storage = getStorage(storageType);
  if (storage) {
    storage.setItem(key, JSON.stringify(value));
  }
};

const getItem = <T>(key: string, storageType: StorageType = 'session'): T | null => {
  const storage = getStorage(storageType);
  if (!storage) return null;
  try {
    const item = storage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
  } catch {
    console.warn(`Failed to get storage item: ${key}`);
    return null;
  }
};

const removeItem = (key: string, storageType: StorageType = 'session'): void => {
  const storage = getStorage(storageType);
  if (storage) {
    storage.removeItem(key);
  }
};

const hasItem = (key: string, storageType: StorageType = 'session'): boolean => {
  const storage = getStorage(storageType);
  if (!storage) return false;
  try {
    return storage.getItem(key) !== null;
  } catch {
    return false;
  }
};

export const cookieService = {
  storage: {
    setItem,
    getItem,
    removeItem,
    hasItem,
    getStorage,
  },

  language: {
    set(language: LanguageCode): void {
      setItem(LANGUAGE_PREFERRED_KEY, language, 'session');
    },

    get(): LanguageCode | null {
      const saved = getItem<string>(LANGUAGE_PREFERRED_KEY, 'session');
      if (saved && SUPPORTED_LANGUAGES.some(lang => lang.code === saved)) {
        return saved as LanguageCode;
      }
      return null;
    },

    remove(): void {
      removeItem(LANGUAGE_PREFERRED_KEY, 'session');
    },
  },

  cookieConsent: {
    save(categories: CookieCategory[]): void {
      setItem(COOKIE_CONSENT_KEY, categories, 'local');
    },

    get(): CookieCategory[] | null {
      return getItem<CookieCategory[]>(COOKIE_CONSENT_KEY, 'local');
    },

    hasAccepted(): boolean {
      return hasItem(COOKIE_CONSENT_KEY, 'local');
    },

    clear(): void {
      removeItem(COOKIE_CONSENT_KEY, 'local');
    },
  },

  cookieDeclined: {
    set(): void {
      setItem(COOKIE_DECLINED_KEY, Date.now(), 'local');
    },

    get(): number | null {
      return getItem<number>(COOKIE_DECLINED_KEY, 'local');
    },

    isActive(): boolean {
      const declinedAt = this.get();
      if (!declinedAt) return false;
      const daysSinceDecline = (Date.now() - declinedAt) / (1000 * 60 * 60 * 24);
      return daysSinceDecline < COOKIE_DECLINED_EXPIRY_DAYS;
    },

    clear(): void {
      removeItem(COOKIE_DECLINED_KEY, 'local');
    },
  },

  analytics: {
    setEnabled(enabled: boolean): void {
      setItem(ANALYTICS_ENABLED_KEY, enabled, 'local');
    },

    isEnabled(): boolean {
      return hasItem(ANALYTICS_ENABLED_KEY, 'local');
    },

    clear(): void {
      removeItem(ANALYTICS_ENABLED_KEY, 'local');
    },
  },

  clearAll(): void {
    this.language.remove();
    this.cookieConsent.clear();
    this.cookieDeclined.clear();
    this.analytics.clear();
  },
};

export default cookieService;
