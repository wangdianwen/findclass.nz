// ============================================
// Services Index
// ============================================

export { default as api, courseApi, tutorApi, searchApi } from './api';
export { default as cookieService } from './cookieService';
export type { CookieCategory, LanguageCode } from './cookieService';
export {
  COOKIE_CONSENT_KEY,
  ANALYTICS_ENABLED_KEY,
  COOKIE_DECLINED_KEY,
  COOKIE_DECLINED_EXPIRY_DAYS,
  LANGUAGE_PREFERRED_KEY,
} from './cookieService';
export { SUPPORTED_LANGUAGES, type WebsiteLanguage } from '../config/languages';
export {
  defaultCategories,
  type CookieCategory as CookieCategoryType,
} from '../components/cookie/types';
