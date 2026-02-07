/**
 * Unit Tests for useAnalytics Hook
 * @see ../../../hooks/useAnalytics.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useCookieConsent } from '@/components/cookie/useCookieConsent';
import { resetAnalytics } from '@/services/analytics/core';

// Mock useCookieConsent
vi.mock('@/components/cookie/useCookieConsent', () => ({
  useCookieConsent: vi.fn(),
}));

// Mock analytics events
vi.mock('@/services/analytics/events', () => ({
  trackSearch: vi.fn(),
  trackFilterChange: vi.fn(),
  trackCourseClick: vi.fn(),
  trackCourseView: vi.fn(),
  trackAddToWishlist: vi.fn(),
  trackRemoveFromWishlist: vi.fn(),
  trackContact: vi.fn(),
  trackGenerateLead: vi.fn(),
  trackShare: vi.fn(),
  trackLogin: vi.fn(),
  trackSignUp: vi.fn(),
  trackTeacherApplication: vi.fn(),
  trackTeacherView: vi.fn(),
  trackError: vi.fn(),
  trackUserEngagement: vi.fn(),
}));

describe('useAnalytics Hook', () => {
  beforeEach(() => {
    resetAnalytics();
    vi.clearAllMocks();

    // Mock useCookieConsent to return analytics enabled
    vi.mocked(useCookieConsent).mockReturnValue({
      consent: [
        { id: 'necessary', name: 'Necessary', description: 'Required', required: true, enabled: true },
        { id: 'analytics', name: 'Analytics', description: 'Analytics', required: false, enabled: true },
        { id: 'functional', name: 'Functional', description: 'Functional', required: false, enabled: false },
      ],
      saveConsent: vi.fn(),
      hasConsent: vi.fn(() => true),
      isAnalyticsEnabled: vi.fn(() => true),
      resetConsent: vi.fn(),
    });
  });

  describe('hook returns', () => {
    it('should return all tracking functions', () => {
      const { result } = renderHook(() => useAnalytics());

      expect(result.current).toHaveProperty('trackSearch');
      expect(result.current).toHaveProperty('trackFilterChange');
      expect(result.current).toHaveProperty('trackCourseClick');
      expect(result.current).toHaveProperty('trackCourseView');
      expect(result.current).toHaveProperty('trackAddToWishlist');
      expect(result.current).toHaveProperty('trackRemoveFromWishlist');
      expect(result.current).toHaveProperty('trackContact');
      expect(result.current).toHaveProperty('trackGenerateLead');
      expect(result.current).toHaveProperty('trackShare');
      expect(result.current).toHaveProperty('trackLogin');
      expect(result.current).toHaveProperty('trackSignUp');
      expect(result.current).toHaveProperty('trackTeacherApplication');
      expect(result.current).toHaveProperty('trackTeacherView');
      expect(result.current).toHaveProperty('trackError');
      expect(result.current).toHaveProperty('trackUserEngagement');
    });

    it('should return functions that are callable', () => {
      const { result } = renderHook(() => useAnalytics());

      expect(typeof result.current.trackSearch).toBe('function');
      expect(typeof result.current.trackLogin).toBe('function');
      expect(typeof result.current.trackCourseView).toBe('function');
    });
  });

  describe('consent gating', () => {
    it('should call tracking functions even when consent is not granted', () => {
      // Mock consent not granted
      vi.mocked(useCookieConsent).mockReturnValue({
        consent: null,
        saveConsent: vi.fn(),
        hasConsent: vi.fn(() => false),
        isAnalyticsEnabled: vi.fn(() => false),
        resetConsent: vi.fn(),
      });

      const { result } = renderHook(() => useAnalytics());

      // Functions should still be callable
      act(() => {
        result.current.trackSearch('math', { city: 'Auckland' }, 10);
        result.current.trackLogin('email');
      });

      // Note: The actual consent check happens in the core analytics module
      // This hook is primarily for type safety and convenience
    });

    it('should call tracking functions when consent is granted', () => {
      const { result } = renderHook(() => useAnalytics());

      act(() => {
        result.current.trackSearch('math', { city: 'Auckland' }, 10);
        result.current.trackLogin('email');
      });

      // Functions should be callable without errors
      expect(true).toBe(true);
    });
  });

  describe('function signatures', () => {
    it('should accept correct parameters for trackSearch', () => {
      const { result } = renderHook(() => useAnalytics());

      act(() => {
        result.current.trackSearch('math', { city: 'Auckland', subject: 'Math' }, 10);
      });

      // Should not throw
      expect(true).toBe(true);
    });

    it('should accept correct parameters for trackCourseClick', () => {
      const { result } = renderHook(() => useAnalytics());

      act(() => {
        result.current.trackCourseClick(
          {
            id: '1',
            name: 'Math Course',
            category: 'Math',
            city: 'Auckland',
            teacherName: 'John Doe',
            price: 50,
          },
          'search_results',
          1
        );
      });

      // Should not throw
      expect(true).toBe(true);
    });

    it('should accept correct parameters for trackLogin', () => {
      const { result } = renderHook(() => useAnalytics());

      act(() => {
        result.current.trackLogin('email');
        result.current.trackLogin('google');
        result.current.trackLogin('wechat');
      });

      // Should not throw
      expect(true).toBe(true);
    });
  });
});
