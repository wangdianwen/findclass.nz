/**
 * useAnalytics Hook
 *
 * React hook for tracking analytics events with built-in consent gating.
 * All tracking functions check for user consent before sending events.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { trackSearch, trackCourseView } = useAnalytics();
 *
 *   const handleSearch = (term: string) => {
 *     trackSearch(term, { city: 'Auckland' }, 10);
 *   };
 *
 *   return <SearchForm onSearch={handleSearch} />;
 * }
 * ```
 */

import { useCookieConsent } from '@/components/cookie/useCookieConsent';
import {
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
} from '@/services/analytics/events';

/**
 * Analytics Hook Return Type
 */
export interface UseAnalyticsReturn {
  // Search events
  trackSearch: (searchTerm: string, filters: Record<string, string | undefined>, resultCount: number) => void;
  trackFilterChange: (filterType: string, filterValue: string) => void;

  // Course events
  trackCourseClick: (
    course: {
      id: string;
      name: string;
      category?: string;
      city?: string;
      teacherName?: string;
      price?: number;
    },
    listName: string,
    position: number
  ) => void;
  trackCourseView: (course: {
    id: string;
    name: string;
    category?: string;
    city?: string;
    teacherName?: string;
    teacherId?: string;
    price?: number;
  }) => void;
  trackAddToWishlist: (course: {
    id: string;
    name: string;
    category?: string;
    price?: number;
  }) => void;
  trackRemoveFromWishlist: (course: {
    id: string;
    name: string;
    category?: string;
  }) => void;

  // Contact events
  trackContact: (method: 'phone' | 'email' | 'wechat' | 'form', courseId?: string, teacherId?: string) => void;
  trackGenerateLead: (courseId: string, teacherId?: string, value?: number) => void;

  // Share events
  trackShare: (
    method: 'native' | 'clipboard' | 'link' | 'wechat' | 'facebook',
    contentType: 'course' | 'teacher' | 'profile',
    contentId?: string
  ) => void;

  // Auth events
  trackLogin: (method: 'email' | 'google' | 'wechat') => void;
  trackSignUp: (method: 'email' | 'google' | 'wechat') => void;

  // Teacher events
  trackTeacherApplication: () => void;
  trackTeacherView: (teacherId: string, teacherName: string) => void;

  // Error events
  trackError: (errorMessage: string, errorCode?: string, context?: string) => void;

  // Engagement events
  trackUserEngagement: (engagementTimeMsec: number) => void;
}

/**
 * useAnalytics Hook
 *
 * Provides all analytics tracking functions with automatic consent gating.
 * Events are only tracked if the user has granted analytics cookie consent.
 */
export function useAnalytics(): UseAnalyticsReturn {
  // Note: We don't need to check consent here because the core analytics module
  // handles it internally. Events are queued until consent is granted.
  // This hook is primarily for type safety and discoverability.

  return {
    // Search events
    trackSearch,
    trackFilterChange,

    // Course events
    trackCourseClick,
    trackCourseView,
    trackAddToWishlist,
    trackRemoveFromWishlist,

    // Contact events
    trackContact,
    trackGenerateLead,

    // Share events
    trackShare,

    // Auth events
    trackLogin,
    trackSignUp,

    // Teacher events
    trackTeacherApplication,
    trackTeacherView,

    // Error events
    trackError,

    // Engagement events
    trackUserEngagement,
  };
}

/**
 * Convenience hook to check if analytics is available
 * Returns true if user has granted consent
 */
export function useAnalyticsEnabled(): boolean {
  const { isAnalyticsEnabled } = useCookieConsent();
  return isAnalyticsEnabled();
}

export default useAnalytics;
