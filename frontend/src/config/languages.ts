/**
 * Unified Language Configuration
 *
 * This file centralizes all language configurations for the system.
 * Both website UI languages and course teaching languages are defined here.
 *
 * When adding a new language:
 * 1. Add the language to this configuration
 * 2. Add translation files in src/locales/{code}/
 * 3. Register the language in src/locales/i18n.ts
 * 4. The language will automatically be available for both UI and courses
 */

// ============================================
// Website UI Languages
// ============================================
// These languages are used for the website interface (i18n)

export interface WebsiteLanguage {
  code: string;
  name: string;
  nameNative: string; // Language name in its own language
  flag: string; // Emoji flag or locale code
  rtl?: boolean; // Right-to-left support
}

export const WEBSITE_LANGUAGES: WebsiteLanguage[] = [
  { code: 'en', name: 'English', nameNative: 'English', flag: '🇳🇿' },
  { code: 'zh', name: 'Chinese', nameNative: '中文', flag: '🇨🇳' },
  // Add new languages here
  // { code: 'ko', name: 'Korean', nameNative: '한국어', flag: '🇰🇷' },
];

// ============================================
// Course Teaching Languages
// ============================================
// These languages can be selected for course delivery

export interface TeachingLanguage {
  code: string;
  name: string;
  nameKey: string; // i18n key for translation
  descriptionKey?: string; // Optional description i18n key
}

export const TEACHING_LANGUAGES: TeachingLanguage[] = [
  { code: 'chinese', name: 'Chinese / Mandarin', nameKey: 'language.chinese' },
  { code: 'english', name: 'English', nameKey: 'language.english' },
  // Add new teaching languages here
  // { code: 'korean', name: 'Korean', nameKey: 'language.korean' },
];

// ============================================
// Language Helper Functions
// ============================================

/**
 * Get all supported website UI language codes
 */
export const getWebsiteLanguageCodes = (): string[] => {
  return WEBSITE_LANGUAGES.map(lang => lang.code);
};

/**
 * Get all supported teaching language codes
 */
export const getTeachingLanguageCodes = (): string[] => {
  return TEACHING_LANGUAGES.map(lang => lang.code);
};

/**
 * Check if a language code is a valid website UI language
 */
export const isWebsiteLanguage = (code: string): boolean => {
  return WEBSITE_LANGUAGES.some(lang => lang.code === code);
};

/**
 * Check if a language code is a valid teaching language
 */
export const isTeachingLanguage = (code: string): boolean => {
  return TEACHING_LANGUAGES.some(lang => lang.code === code);
};

/**
 * Get website language by code
 */
export const getWebsiteLanguage = (code: string): WebsiteLanguage | undefined => {
  return WEBSITE_LANGUAGES.find(lang => lang.code === code);
};

/**
 * Get teaching language by code
 */
export const getTeachingLanguage = (code: string): TeachingLanguage | undefined => {
  return TEACHING_LANGUAGES.find(lang => lang.code === code);
};

/**
 * Get flag emoji for a website language code
 */
export const getLanguageFlag = (code: string): string => {
  const lang = getWebsiteLanguage(code);
  return lang?.flag || '🌐';
};

/**
 * Export SUPPORTED_LANGUAGES for backward compatibility
 * (matches the format used in cookieService.ts)
 */
export const SUPPORTED_LANGUAGES: WebsiteLanguage[] = WEBSITE_LANGUAGES.map(lang => ({
  code: lang.code,
  name: lang.name,
  nameNative: lang.nameNative,
  flag: lang.flag,
  rtl: lang.rtl,
}));

// ============================================
// Default Export (convenience)
// ============================================

export default {
  website: WEBSITE_LANGUAGES,
  teaching: TEACHING_LANGUAGES,
  getWebsiteLanguageCodes,
  getTeachingLanguageCodes,
  isWebsiteLanguage,
  isTeachingLanguage,
  getWebsiteLanguage,
  getTeachingLanguage,
  getLanguageFlag,
  SUPPORTED_LANGUAGES,
};
