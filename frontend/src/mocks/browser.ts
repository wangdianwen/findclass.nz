// MSW Worker setup for development environment
// This file sets up the Service Worker to intercept API requests

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Log the number of handlers for debugging
console.log('[MSW] Total handlers registered:', handlers.length);

// Create the worker with all handlers
export const worker = setupWorker(...handlers);

// Start the worker in development mode
// This will intercept all API requests and return mock data
export async function initMockServer() {
  console.log('[MSW] Attempting to start mock server...');
  console.log('[MSW] DEV mode:', import.meta.env.DEV);

  if (import.meta.env.DEV) {
    try {
      console.log('[MSW] Starting worker with', handlers.length, 'handlers...');
      await worker.start({
        // Quiet mode - don't warn about unhandled requests
        onUnhandledRequest: 'bypass',
      });
      console.log('[MSW] Mock server started successfully');
    } catch (error) {
      console.error('[MSW] Failed to start mock server:', error);
      console.warn('[MSW] Mock server initialization skipped');
    }
  } else {
    console.log('[MSW] Not in DEV mode, skipping mock server');
  }
}
