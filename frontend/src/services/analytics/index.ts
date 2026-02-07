/**
 * Google Analytics 4 (GA4) Service
 *
 * Complete GA4 integration for FindClass.nz with:
 * - Type-safe event tracking
 * - GDPR-compliant consent management
 * - Automatic page view tracking
 * - User ID tracking
 * - Event queue (events before consent)
 */

// Core functions
export {
  initAnalytics,
  trackEvent,
  setUserId,
  clearUserId,
  trackPageView,
  isAnalyticsInitialized,
  isConsentGranted,
  getConfig,
  resetAnalytics,
} from './core';

// Event tracking functions
export {
  trackSearch,
  trackFilterChange,
  trackCourseClick,
  trackCourseView,
  trackAddToWishlist,
  trackRemoveFromWishlist,
  trackContact,
  trackGenerateLead,
  trackShare,
  trackLogin,
  trackSignUp,
  trackTeacherApplication,
  trackTeacherView,
  trackError,
  trackUserEngagement,
  trackSessionStart,
} from './events';

// React Provider
export { AnalyticsProvider, withAnalytics } from './AnalyticsProvider';

// Types
export type {
  Ga4EventName,
  Ga4EventParams,
  Ga4Item,
  Ga4Config,
  QueuedEvent,
  AnalyticsContext,
} from '@/types/analytics';
