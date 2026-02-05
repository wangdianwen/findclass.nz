/**
 * MSW Setup for E2E Tests
 *
 * This file provides utilities for MSW (Mock Service Worker) in E2E tests.
 *
 * IMPORTANT: For E2E tests, MSW is already configured in main.tsx via the browser.
 * This file provides utilities for advanced MSW usage in tests if needed.
 *
 * For basic tests, the Service Worker in src/mocks/browser.ts handles all API mocking.
 */

import { test, expect } from '@playwright/test';

// Export test utilities for MSW-related testing
export { test, expect };

/**
 * Helper to set localStorage for authenticated user state
 */
export async function setAuthState(page: Parameters<typeof page>[0], userData: {
  id: string;
  name: string;
  email: string;
  token?: string;
}) {
  await page.addInitScript((data) => {
    localStorage.setItem('auth_token', data.token || 'test-token');
    localStorage.setItem('user', JSON.stringify(data));
  }, userData);
}

/**
 * Helper to clear auth state
 */
export async function clearAuthState(page: Parameters<typeof page>[0]) {
  await page.addInitScript(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  });
}

/**
 * Helper to simulate different user states for edge case testing
 */
export const USER_STATES = {
  regular: {
    id: 'user-active-001',
    name: 'Active User',
    email: 'user@example.com',
  },
  banned: {
    id: 'user-banned-001',
    name: 'Banned User',
    email: 'banned@test.com',
    token: 'banned-token-123',
  },
  deleted: {
    id: 'user-deleted-001',
    name: 'Deleted User',
    email: 'deleted@test.com',
  },
};

/**
 * Helper to intercept and modify API responses for error testing
 */
export async function interceptWithError(
  page: Parameters<typeof page>[0],
  urlPattern: string,
  errorResponse: { status: number; body: Record<string, unknown> }
) {
  await page.route(urlPattern, route => {
    route.fulfill({
      status: errorResponse.status,
      body: JSON.stringify(errorResponse.body),
    });
  });
}
