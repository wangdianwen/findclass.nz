import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Integration Tests
 *
 * This configuration is for running integration tests against a real staging backend.
 * Unlike the regular E2E tests which use MSW mocks, these tests connect to:
 * - Staging API: http://localhost:3001
 * - Staging Frontend: http://localhost:3000
 *
 * Usage:
 *   npm run test:e2e:integration       # Run integration tests
 *   npm run test:e2e:integration:ui    # Run with UI
 *   npm run test:integration:ci        # CI mode with JUnit report
 *
 * Prerequisites:
 *   1. Staging environment must be running (npm run staging:deploy)
 *   2. Services must be healthy (npm run staging:status)
 *   3. Test data must be available (SEED_SAMPLE_DATA=true)
 */
export default defineConfig({
  testDir: './src/test/e2e/specs',
  testMatch: '**/integration-flow.spec.ts',

  // Test organization
  fullyParallel: false, // Run sequentially to avoid data conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // More retries for integration tests
  workers: 1, // Single worker to prevent data race conditions

  // Reporter configuration
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report/integration' }],
    ['json', { outputFile: 'test-results/integration-results.json' }],
    ['junit', { outputFile: 'test-results/junit-integration.xml' }],
    ['list'],
  ],

  // Global settings
  timeout: 60 * 1000, // 60 seconds per test
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },

  // Output directory
  outputDir: 'test-results/integration',

  use: {
    // Base URL for staging environment (staging-frontend container)
    baseURL: 'http://localhost:3002',

    // Action timeouts
    actionTimeout: 15 * 1000, // 15 seconds
    navigationTimeout: 30 * 1000, // 30 seconds

    // tracing and screenshots
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Extra HTTP headers (if needed for CORS)
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en',
    },
  },

  // NOTE: Integration tests use staging-frontend container running on port 3002
  // Ensure staging is deployed: npm run staging:deploy
  // webServer is not needed as we use the Docker container

  // Projects for integration tests
  projects: [
    {
      name: 'integration-chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'integration-firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'integration-webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
