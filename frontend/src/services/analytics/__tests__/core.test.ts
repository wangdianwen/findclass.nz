/**
 * Unit Tests for Analytics Core Module
 * @see ../../../../services/analytics/core.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initAnalytics,
  trackEvent,
  setUserId,
  clearUserId,
  trackPageView,
  isAnalyticsInitialized,
  isConsentGranted,
  getConfig,
  resetAnalytics,
} from '@/services/analytics/core';

describe('Analytics Core', () => {
  beforeEach(() => {
    // Reset analytics state before each test
    resetAnalytics();

    // Mock window.gtag
    window.gtag = vi.fn();
    window.dataLayer = [];

    // Clear all mocks
    vi.clearAllMocks();

    // Mock environment variables
    Object.defineProperty(import.meta.env, 'VITE_GA4_MEASUREMENT_ID', {
      value: 'G-TEST123456',
      writable: true,
    });
    Object.defineProperty(import.meta.env, 'VITE_GA4_ENABLED_DEV', {
      value: 'true',
      writable: true,
    });
    Object.defineProperty(import.meta.env, 'DEV', {
      value: true,
      writable: true,
    });
  });

  afterEach(() => {
    // Clean up
    window.gtag = undefined;
    window.dataLayer = [];
  });

  describe('initAnalytics', () => {
    it('should initialize GA4 when called', () => {
      initAnalytics();

      expect(isConsentGranted()).toBe(true);
      expect(isAnalyticsInitialized()).toBe(true);
    });

    it('should call gtag with config parameters', () => {
      initAnalytics();

      expect(window.gtag).toHaveBeenCalledWith('js', expect.any(Date));
      expect(window.gtag).toHaveBeenCalledWith('config', 'G-TEST123456', {
        send_page_view: true,
        anonymize_ip: true,
        debug_mode: true,
        user_id: undefined,
      });
    });

    it('should not initialize if measurement ID is missing', () => {
      Object.defineProperty(import.meta.env, 'VITE_GA4_MEASUREMENT_ID', {
        value: '',
        writable: true,
      });
      resetAnalytics();

      initAnalytics();

      expect(isAnalyticsInitialized()).toBe(false);
    });

    it('should not initialize in dev when enabledDev is false', () => {
      Object.defineProperty(import.meta.env, 'VITE_GA4_ENABLED_DEV', {
        value: 'false',
        writable: true,
      });
      resetAnalytics();

      initAnalytics();

      expect(isAnalyticsInitialized()).toBe(false);
    });
  });

  describe('trackEvent', () => {
    it('should queue events before consent', () => {
      trackEvent('search', {
        search_term: 'math',
        result_count: 10,
      });

      // Event should be queued, not sent
      expect(window.gtag).not.toHaveBeenCalled();
    });

    it('should send events after consent', () => {
      initAnalytics();

      trackEvent('search', {
        search_term: 'math',
        result_count: 10,
      });

      expect(window.gtag).toHaveBeenCalledWith('event', 'search', {
        search_term: 'math',
        result_count: 10,
      });
    });

    it('should flush queued events after consent', () => {
      // Queue events before consent
      trackEvent('search', { search_term: 'math' });
      trackEvent('login', { method: 'email' });

      initAnalytics();

      // Both events should be sent
      expect(window.gtag).toHaveBeenCalledWith('event', 'search', { search_term: 'math' });
      expect(window.gtag).toHaveBeenCalledWith('event', 'login', { method: 'email' });
    });
  });

  describe('setUserId', () => {
    it('should set user ID when initialized', () => {
      initAnalytics();
      setUserId('user123');

      expect(window.gtag).toHaveBeenCalledWith('set', 'user_id', 'user123');
    });

    it('should not set user ID before initialization', () => {
      setUserId('user123');

      expect(window.gtag).not.toHaveBeenCalledWith('set', 'user_id', 'user123');
    });
  });

  describe('clearUserId', () => {
    it('should clear user ID when initialized', () => {
      initAnalytics();
      setUserId('user123');
      clearUserId();

      expect(window.gtag).toHaveBeenCalledWith('set', 'user_id', undefined);
    });
  });

  describe('trackPageView', () => {
    it('should track page views after initialization', () => {
      initAnalytics();

      trackPageView('/courses', 'Course Search', 'https://example.com');

      expect(window.gtag).toHaveBeenCalledWith('event', 'page_view', {
        page_location: window.location.href,
        page_title: 'Course Search',
        page_referrer: 'https://example.com',
      });
    });

    it('should queue page views before consent', () => {
      trackPageView('/courses', 'Course Search');

      expect(window.gtag).not.toHaveBeenCalled();
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = getConfig();

      expect(config).toHaveProperty('measurementId');
      expect(config).toHaveProperty('enabledDev');
      expect(config).toHaveProperty('anonymizeIp');
      expect(config).toHaveProperty('sendPageView');
      expect(config).toHaveProperty('debugMode');
    });
  });

  describe('resetAnalytics', () => {
    it('should reset all state', () => {
      initAnalytics();
      setUserId('user123');

      resetAnalytics();

      expect(isAnalyticsInitialized()).toBe(false);
      expect(isConsentGranted()).toBe(false);
    });
  });
});
