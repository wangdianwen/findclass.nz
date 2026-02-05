/**
 * Cookie Consent Types
 */

export interface CookieCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
  enabled: boolean;
}

export interface CookieConsentProps {
  onAccept: (categories: CookieCategory[]) => void;
  onDecline: () => void;
}

export const defaultCategories: CookieCategory[] = [
  {
    id: 'necessary',
    name: 'cookie.category.necessary',
    description: 'cookie.category.necessaryDesc',
    required: true,
    enabled: true,
  },
  {
    id: 'analytics',
    name: 'cookie.category.analytics',
    description: 'cookie.category.analyticsDesc',
    required: false,
    enabled: false,
  },
  {
    id: 'functional',
    name: 'cookie.category.functional',
    description: 'cookie.category.functionalDesc',
    required: false,
    enabled: false,
  },
];

export const COOKIE_CONSENT_KEY = 'cookie_consent';
export const ANALYTICS_ENABLED_KEY = 'analytics_enabled';
export const COOKIE_DECLINED_KEY = 'cookie_declined';
export const COOKIE_DECLINED_EXPIRY_DAYS = 30;
export const LANGUAGE_PREFERRED_KEY = 'language_preferred';

export const SUPPORTED_LANGUAGES = [
  { code: 'en' as const, name: 'English' },
  { code: 'zh' as const, name: '中文' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];
