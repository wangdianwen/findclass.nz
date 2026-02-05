import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import cookieService, {
  COOKIE_CONSENT_KEY,
  ANALYTICS_ENABLED_KEY,
  COOKIE_DECLINED_KEY,
  COOKIE_DECLINED_EXPIRY_DAYS,
  LANGUAGE_PREFERRED_KEY,
} from '../cookieService';
import { SUPPORTED_LANGUAGES } from '../../config/languages';
import type { CookieCategory } from '../../components/cookie/types';

describe('cookieService', () => {
  const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  const mockSessionStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  beforeEach(() => {
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.stubGlobal('sessionStorage', mockSessionStorage);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('language', () => {
    it('sets language preference in sessionStorage', () => {
      cookieService.language.set('en');

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(LANGUAGE_PREFERRED_KEY, '"en"');
    });

    it('gets language preference from sessionStorage', () => {
      mockSessionStorage.getItem.mockReturnValue('"zh"');

      const result = cookieService.language.get();

      expect(result).toBe('zh');
    });

    it('returns null for invalid language preference', () => {
      mockSessionStorage.getItem.mockReturnValue('"invalid"');

      const result = cookieService.language.get();

      expect(result).toBeNull();
    });

    it('returns null when no language preference saved', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const result = cookieService.language.get();

      expect(result).toBeNull();
    });

    it('removes language preference from sessionStorage', () => {
      cookieService.language.remove();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(LANGUAGE_PREFERRED_KEY);
    });
  });

  describe('cookieConsent', () => {
    it('saves consent categories to localStorage', () => {
      const categories: CookieCategory[] = [
        {
          id: 'necessary',
          name: 'Necessary',
          description: 'Required',
          required: true,
          enabled: true,
        },
        {
          id: 'analytics',
          name: 'Analytics',
          description: 'Analytics',
          required: false,
          enabled: true,
        },
      ];

      cookieService.cookieConsent.save(categories);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        COOKIE_CONSENT_KEY,
        JSON.stringify(categories)
      );
    });

    it('retrieves consent categories from localStorage', () => {
      const categories: CookieCategory[] = [
        {
          id: 'necessary',
          name: 'Necessary',
          description: 'Required',
          required: true,
          enabled: true,
        },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(categories));

      const result = cookieService.cookieConsent.get();

      expect(result).toEqual(categories);
    });

    it('returns null when no consent saved', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = cookieService.cookieConsent.get();

      expect(result).toBeNull();
    });

    it('checks if cookies have been accepted', () => {
      mockLocalStorage.getItem.mockReturnValue('[]');

      const result = cookieService.cookieConsent.hasAccepted();

      expect(result).toBe(true);
    });

    it('returns false when cookies not accepted', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = cookieService.cookieConsent.hasAccepted();

      expect(result).toBe(false);
    });

    it('clears consent from localStorage', () => {
      cookieService.cookieConsent.clear();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(COOKIE_CONSENT_KEY);
    });
  });

  describe('cookieDeclined', () => {
    it('sets declined timestamp in localStorage', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      cookieService.cookieDeclined.set();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(COOKIE_DECLINED_KEY, now.toString());
    });

    it('retrieves declined timestamp from localStorage', () => {
      const timestamp = Date.now().toString();
      mockLocalStorage.getItem.mockReturnValue(timestamp);

      const result = cookieService.cookieDeclined.get();

      expect(result).toBe(parseInt(timestamp, 10));
    });

    it('checks if decline is still active (within expiry period)', () => {
      const recentTime = Date.now() - (COOKIE_DECLINED_EXPIRY_DAYS - 1) * 24 * 60 * 60 * 1000;
      mockLocalStorage.getItem.mockReturnValue(recentTime.toString());

      const result = cookieService.cookieDeclined.isActive();

      expect(result).toBe(true);
    });

    it('checks if decline has expired', () => {
      const oldTime = Date.now() - (COOKIE_DECLINED_EXPIRY_DAYS + 1) * 24 * 60 * 60 * 1000;
      mockLocalStorage.getItem.mockReturnValue(oldTime.toString());

      const result = cookieService.cookieDeclined.isActive();

      expect(result).toBe(false);
    });

    it('returns false when no decline recorded', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = cookieService.cookieDeclined.isActive();

      expect(result).toBe(false);
    });

    it('clears declined status from localStorage', () => {
      cookieService.cookieDeclined.clear();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(COOKIE_DECLINED_KEY);
    });
  });

  describe('analytics', () => {
    it('sets analytics enabled status in localStorage', () => {
      cookieService.analytics.setEnabled(true);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(ANALYTICS_ENABLED_KEY, 'true');
    });

    it('checks if analytics is enabled', () => {
      mockLocalStorage.getItem.mockReturnValue('true');

      const result = cookieService.analytics.isEnabled();

      expect(result).toBe(true);
    });

    it('returns false when analytics not enabled', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = cookieService.analytics.isEnabled();

      expect(result).toBe(false);
    });

    it('clears analytics status from localStorage', () => {
      cookieService.analytics.clear();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(ANALYTICS_ENABLED_KEY);
    });
  });

  describe('clearAll', () => {
    it('clears all cookie-related data', () => {
      cookieService.clearAll();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(LANGUAGE_PREFERRED_KEY);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(COOKIE_CONSENT_KEY);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(COOKIE_DECLINED_KEY);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(ANALYTICS_ENABLED_KEY);
    });
  });

  describe('constants', () => {
    it('exports correct cookie consent key', () => {
      expect(COOKIE_CONSENT_KEY).toBe('cookie_consent');
    });

    it('exports correct analytics enabled key', () => {
      expect(ANALYTICS_ENABLED_KEY).toBe('analytics_enabled');
    });

    it('exports correct cookie declined key', () => {
      expect(COOKIE_DECLINED_KEY).toBe('cookie_declined');
    });

    it('exports correct expiry days', () => {
      expect(COOKIE_DECLINED_EXPIRY_DAYS).toBe(30);
    });

    it('exports correct language preferred key', () => {
      expect(LANGUAGE_PREFERRED_KEY).toBe('language_preferred');
    });

    it('exports supported languages', () => {
      expect(SUPPORTED_LANGUAGES).toEqual([
        { code: 'en', name: 'English', nameNative: 'English', flag: '🇳🇿' },
        { code: 'zh', name: 'Chinese', nameNative: '中文', flag: '🇨🇳' },
      ]);
    });
  });
});
