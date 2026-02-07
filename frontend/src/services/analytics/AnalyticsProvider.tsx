/**
 * Google Analytics 4 (GA4) React Provider
 *
 * Provides automatic page view tracking and integrates GA4 with React app.
 * Wraps the application and handles route change tracking.
 */

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useCookieConsent } from '@/components/cookie/useCookieConsent';
import {
  initAnalytics,
  setUserId,
  clearUserId,
  trackPageView,
  isAnalyticsInitialized,
} from './core';

interface AnalyticsProviderProps {
  children: ReactNode;
  userId?: string; // User ID from auth store
}

/**
 * Analytics Provider Component
 *
 * 1. Initializes GA4 when user consents to analytics cookies
 * 2. Tracks page views on route changes
 * 3. Manages user ID (set on login, clear on logout)
 */
export function AnalyticsProvider({ children, userId }: AnalyticsProviderProps) {
  const location = useLocation();
  const { isAnalyticsEnabled } = useCookieConsent();

  // Initialize analytics when consent is granted
  useEffect(() => {
    if (isAnalyticsEnabled() && !isAnalyticsInitialized()) {
      initAnalytics();
    }
  }, [isAnalyticsEnabled]);

  // Update user ID when it changes
  useEffect(() => {
    if (!isAnalyticsInitialized()) return;

    if (userId) {
      setUserId(userId);
    } else {
      clearUserId();
    }
  }, [userId, isAnalyticsInitialized]);

  // Track page views on route changes
  useEffect(() => {
    if (!isAnalyticsInitialized()) return;

    // Get page title from document or route
    const pageTitle = document.title;

    // Track page view
    trackPageView(location.pathname, pageTitle);
  }, [location.pathname, location.search]);

  return <>{children}</>;
}

/**
 * HOC to add analytics to a component
 * Use this if you cannot use the Provider directly
 */
export function withAnalytics<P extends object>(
  Component: React.ComponentType<P>,
  userId?: string
): React.ComponentType<P> {
  return function WrappedComponent(props: P) {
    return (
      <AnalyticsProvider userId={userId}>
        <Component {...props} />
      </AnalyticsProvider>
    );
  };
}
