/**
 * Google Analytics 4 (GA4) Core Service
 *
 * Handles GA4 initialization, event tracking, and consent management.
 *
 * @see https://developers.google.com/analytics/devguides/collection/ga4
 */

import type { Ga4Config, Ga4EventName, Ga4EventParams, QueuedEvent } from '@/types/analytics';

// ============================================================================
// Configuration
// ============================================================================

const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID || '';
const GA4_ENABLED_DEV = import.meta.env.VITE_GA4_ENABLED_DEV === 'true';
const IS_DEV = import.meta.env.DEV;

const config: Ga4Config = {
  measurementId: GA4_MEASUREMENT_ID,
  enabledDev: GA4_ENABLED_DEV,
  anonymizeIp: true,
  sendPageView: true,
  debugMode: IS_DEV && GA4_ENABLED_DEV,
};

// ============================================================================
// State
// ============================================================================

let isInitialized = false;
let hasConsent = false;
let currentUserId: string | undefined = undefined;
let eventQueue: QueuedEvent[] = [];

// ============================================================================
// Window Type Definitions
// ============================================================================

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'consent' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: Record<string, unknown> | Ga4EventParams | string
    ) => void;
    dataLayer: unknown[];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load gtag.js script asynchronously
 */
function loadGtagScript(): void {
  if (typeof window === 'undefined' || window.gtag) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${config.measurementId}`;
  script.addEventListener('load', () => {
    if (IS_DEV && config.debugMode) {
      console.log('[GA4] gtag.js loaded successfully');
    }
  });
  script.addEventListener('error', () => {
    console.error('[GA4] Failed to load gtag.js');
  });

  document.head.appendChild(script);
}

/**
 * Initialize gtag.js with configuration
 */
function initializeGtag(): void {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('js', new Date());

  window.gtag('config', config.measurementId, {
    send_page_view: config.sendPageView,
    anonymize_ip: config.anonymizeIp,
    debug_mode: config.debugMode,
    user_id: currentUserId,
  } as Record<string, unknown>);

  isInitialized = true;

  if (IS_DEV && config.debugMode) {
    console.log('[GA4] Initialized with config:', config);
  }
}

/**
 * Check if GA4 should be enabled
 */
function shouldEnable(): boolean {
  if (!config.measurementId) {
    console.warn('[GA4] No measurement ID configured');
    return false;
  }

  if (IS_DEV && !config.enabledDev) {
    if (IS_DEV) {
      console.log('[GA4] Disabled in development (VITE_GA4_ENABLED_DEV=false)');
    }
    return false;
  }

  return true;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize GA4 with user consent
 * Call this when user grants analytics cookie consent
 */
export function initAnalytics(): void {
  if (!shouldEnable()) return;

  if (IS_DEV) {
    console.log('[GA4] Initializing analytics...');
  }

  hasConsent = true;

  // Load gtag.js script
  loadGtagScript();

  // Initialize gtag after script loads
  if (window.gtag) {
    initializeGtag();
  } else {
    // Wait for script to load
    const checkGtag = setInterval(() => {
      if (window.gtag) {
        initializeGtag();
        clearInterval(checkGtag);
      }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => clearInterval(checkGtag), 5000);
  }

  // Flush queued events
  flushEventQueue();
}

/**
 * Track a custom event
 * Events are queued until consent is granted
 */
export function trackEvent(eventName: Ga4EventName, eventParams?: Ga4EventParams): void {
  const event: QueuedEvent = {
    eventName,
    eventParams,
    timestamp: Date.now(),
  };

  // If not yet consented, queue the event
  if (!hasConsent) {
    eventQueue.push(event);

    if (IS_DEV && eventQueue.length <= 1) {
      console.log('[GA4] Event queued (waiting for consent):', eventName);
    }

    return;
  }

  // Ensure gtag is loaded
  if (!window.gtag) {
    console.warn('[GA4] gtag not loaded, queuing event:', eventName);
    eventQueue.push(event);
    return;
  }

  // Send event to GA4
  try {
    window.gtag?.('event', eventName, eventParams as Ga4EventParams);

    if (IS_DEV && config.debugMode) {
      console.log('[GA4] Event tracked:', eventName, eventParams);
    }
  } catch (error) {
    console.error('[GA4] Failed to track event:', error);
  }
}

/**
 * Set user ID for logged-in users
 */
export function setUserId(userId: string): void {
  currentUserId = userId;

  if (!hasConsent || !isInitialized) {
    if (IS_DEV) {
      console.log('[GA4] User ID set (will be sent on init):', userId);
    }
    return;
  }

  if (window.gtag) {
    window.gtag('set', 'user_id', userId);

    if (IS_DEV && config.debugMode) {
      console.log('[GA4] User ID set:', userId);
    }
  }
}

/**
 * Clear user ID (on logout)
 */
export function clearUserId(): void {
  currentUserId = undefined;

  if (!hasConsent || !isInitialized) return;

  if (window.gtag) {
    window.gtag('set', 'user_id', undefined);

    if (IS_DEV && config.debugMode) {
      console.log('[GA4] User ID cleared');
    }
  }
}

/**
 * Track page view (called automatically on route changes)
 */
export function trackPageView(
  pagePath: string,
  pageTitle?: string,
  pageReferrer?: string
): void {
  if (!hasConsent || !isInitialized) {
    if (IS_DEV) {
      console.log('[GA4] Page view queued (waiting for consent):', pagePath);
    }

    // Queue page view as event
    trackEvent('page_view', {
      page_location: window.location.href,
      page_title: pageTitle || document.title,
      page_referrer: pageReferrer || document.referrer,
    });

    return;
  }

  if (window.gtag && config.measurementId) {
    window.gtag?.('event', 'page_view', {
      page_location: window.location.href,
      page_title: pageTitle || document.title,
      page_referrer: pageReferrer || document.referrer,
    } as Ga4EventParams);

    if (IS_DEV && config.debugMode) {
      console.log('[GA4] Page view tracked:', pagePath, pageTitle);
    }
  }
}

/**
 * Flush queued events (called after consent is granted)
 */
function flushEventQueue(): void {
  if (eventQueue.length === 0) return;

  if (IS_DEV) {
    console.log(`[GA4] Flushing ${eventQueue.length} queued events`);
  }

  const events = [...eventQueue];
  eventQueue = [];

  events.forEach(({ eventName, eventParams }) => {
    // Use setTimeout to avoid blocking
    setTimeout(() => {
      trackEvent(eventName, eventParams);
    }, 0);
  });
}

/**
 * Check if analytics is initialized
 */
export function isAnalyticsInitialized(): boolean {
  return isInitialized;
}

/**
 * Check if user has granted consent
 */
export function isConsentGranted(): boolean {
  return hasConsent;
}

/**
 * Get current configuration
 */
export function getConfig(): Ga4Config {
  return { ...config };
}

/**
 * Reset analytics (for testing)
 */
export function resetAnalytics(): void {
  isInitialized = false;
  hasConsent = false;
  currentUserId = undefined;
  eventQueue = [];

  if (IS_DEV) {
    console.log('[GA4] Reset');
  }
}
