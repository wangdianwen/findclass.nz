/**
 * Google Analytics 4 (GA4) Event Tracking Functions
 *
 * Type-safe event tracking functions for all GA4 events used in FindClass.nz
 *
 * @see https://developers.google.com/analytics/devguides/collection/ga4/reference/events
 */

import type { Ga4Item } from '@/types/analytics';
import { trackEvent } from './core';

// ============================================================================
// Search Events
// ============================================================================

/**
 * Track search submission
 *
 * @param searchTerm - The search term/keyword
 * @param filters - Search filters (city, subject, grade, trust level)
 * @param resultCount - Number of search results
 */
export function trackSearch(
  searchTerm: string,
  filters: {
    city?: string;
    subject?: string;
    grade?: string;
    trustLevel?: string;
  },
  resultCount: number
): void {
  trackEvent('search', {
    search_term: searchTerm,
    search_filters: JSON.stringify(filters),
    result_count: resultCount,
  });
}

/**
 * Track filter changes
 *
 * @param filterType - Type of filter (city, subject, grade, trust_level)
 * @param filterValue - Selected filter value
 */
export function trackFilterChange(filterType: string, filterValue: string): void {
  trackEvent('filter_change', {
    filter_type: filterType,
    filter_value: filterValue,
  });
}

// ============================================================================
// Course Events
// ============================================================================

/**
 * Track course card click from list
 *
 * @param course - Course information
 * @param listName - List where course was displayed (e.g., 'search_results', 'home_featured')
 * @param position - Position in the list (1-indexed)
 */
export function trackCourseClick(
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
): void {
  const item: Ga4Item = {
    item_id: course.id,
    item_name: course.name,
    item_category: course.category,
    item_list_name: listName,
    index: position,
    affiliation: course.city,
    price: course.price,
  };

  trackEvent('select_item', {
    items: [item],
  });
}

/**
 * Track course detail view
 *
 * @param course - Course information
 */
export function trackCourseView(course: {
  id: string;
  name: string;
  category?: string;
  city?: string;
  teacherName?: string;
  teacherId?: string;
  price?: number;
}): void {
  const item: Ga4Item = {
    item_id: course.id,
    item_name: course.name,
    item_category: course.category,
    item_category2: course.city,
    item_brand: course.teacherName,
    location_id: course.teacherId,
    price: course.price,
  };

  trackEvent('view_item', {
    items: [item],
    currency: 'NZD',
    value: course.price || 0,
  });
}

/**
 * Track add to wishlist (favorite course)
 *
 * @param course - Course information
 */
export function trackAddToWishlist(course: {
  id: string;
  name: string;
  category?: string;
  price?: number;
}): void {
  const item: Ga4Item = {
    item_id: course.id,
    item_name: course.name,
    item_category: course.category,
    price: course.price,
  };

  trackEvent('add_to_wishlist', {
    items: [item],
    currency: 'NZD',
    value: course.price || 0,
  });
}

/**
 * Track remove from wishlist (unfavorite course)
 *
 * @param course - Course information
 */
export function trackRemoveFromWishlist(course: {
  id: string;
  name: string;
  category?: string;
}): void {
  const item: Ga4Item = {
    item_id: course.id,
    item_name: course.name,
    item_category: course.category,
  };

  trackEvent('remove_from_cart', {
    items: [item],
  });
}

// ============================================================================
// Contact Events
// ============================================================================

/**
 * Track contact action (phone, email, WeChat, form)
 *
 * @param contactMethod - Contact method (phone, email, wechat, form)
 * @param courseId - Course ID
 * @param teacherId - Teacher ID
 */
export function trackContact(
  contactMethod: 'phone' | 'email' | 'wechat' | 'form',
  courseId?: string,
  teacherId?: string
): void {
  trackEvent('contact', {
    contact_method: contactMethod,
    item_id: courseId,
    teacher_id: teacherId,
  });
}

/**
 * Track generate lead (contact form submitted)
 *
 * @param courseId - Course ID
 * @param teacherId - Teacher ID
 * @param value - Lead value (optional)
 */
export function trackGenerateLead(
  courseId: string,
  teacherId?: string,
  value?: number
): void {
  trackEvent('generate_lead', {
    currency: 'NZD',
    value: value || 0,
    item_id: courseId,
    teacher_id: teacherId,
  });
}

// ============================================================================
// Share Events
// ============================================================================

/**
 * Track share action
 *
 * @param shareMethod - Share method (native, clipboard, link, wechat, facebook)
 * @param contentType - Type of content (course, teacher, profile)
 * @param contentId - Content ID
 */
export function trackShare(
  shareMethod: 'native' | 'clipboard' | 'link' | 'wechat' | 'facebook',
  contentType: 'course' | 'teacher' | 'profile',
  contentId?: string
): void {
  trackEvent('share', {
    method: shareMethod,
    content_type: contentType,
    item_id: contentId,
  });
}

// ============================================================================
// Authentication Events
// ============================================================================

/**
 * Track login
 *
 * @param method - Login method (email, google, wechat)
 */
export function trackLogin(method: 'email' | 'google' | 'wechat'): void {
  trackEvent('login', {
    method,
  });
}

/**
 * Track registration/sign up
 *
 * @param method - Registration method (email, google, wechat)
 */
export function trackSignUp(method: 'email' | 'google' | 'wechat'): void {
  trackEvent('sign_up', {
    method,
  });
}

// ============================================================================
// Teacher Events
// ============================================================================

/**
 * Track teacher application submission
 */
export function trackTeacherApplication(): void {
  trackEvent('generate_lead', {
    currency: 'NZD',
    value: 0,
  });
}

/**
 * Track teacher profile view
 *
 * @param teacherId - Teacher ID
 * @param teacherName - Teacher name
 */
export function trackTeacherView(teacherId: string, teacherName: string): void {
  trackEvent('view_item', {
    items: [
      {
        item_id: teacherId,
        item_name: teacherName,
        item_category: 'teacher',
      },
    ],
  });
}

// ============================================================================
// Error Events
// ============================================================================

/**
 * Track error (for error boundaries)
 *
 * @param errorMessage - Error message
 * @param errorCode - Error code (optional)
 * @param context - Error context (component, page, etc.)
 */
export function trackError(errorMessage: string, errorCode?: string, context?: string): void {
  trackEvent('app_exception', {
    description: errorMessage,
    fatal: false,
    error_code: errorCode,
    context,
  });
}

// ============================================================================
// Engagement Events
// ============================================================================

/**
 * Track user engagement time
 * Call this periodically to measure engagement
 *
 * @param engagementTimeMsec - Engagement time in milliseconds
 */
export function trackUserEngagement(engagementTimeMsec: number): void {
  trackEvent('user_engagement', {
    engagement_time_msec: engagementTimeMsec,
  });
}

/**
 * Track session start
 */
export function trackSessionStart(): void {
  trackEvent('session_start', {
    engagement_time_msec: 1,
  });
}
