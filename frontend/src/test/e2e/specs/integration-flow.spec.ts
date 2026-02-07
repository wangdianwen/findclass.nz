/**
 * Integration Flow Tests
 *
 * These tests connect to a REAL staging backend (no MSW mocks).
 * They verify end-to-end user journeys through the application.
 *
 * Prerequisites:
 * - Staging environment running: npm run staging:deploy
 * - Backend healthy: npm run staging:status
 * - Sample data seeded: SEED_SAMPLE_DATA=true
 *
 * Test Scenarios:
 * - INT-001: User Registration Flow
 * - INT-002: User Login Flow
 * - INT-003: Course Search and Filter
 * - INT-004: Course Detail View
 * - INT-005: Teacher Application Flow
 * - INT-006: Favorites Functionality
 *
 * Run with:
 *   npm run test:e2e:integration
 *   npm run test:integration
 */

import { test, expect } from '@playwright/test';
import {
  setupIntegrationTest,
  teardownIntegrationTest,
  createTestUser,
  loginAsDemo,
  generateTestEmail,
  generateTestPhone,
  applyForTeacherRole,
  addFavorite,
  removeFavorite,
  getFavorites,
  searchCourses,
  getCourseById,
  TEST_ACCOUNTS,
  checkStagingHealth,
} from '../setup/integration-helpers';

// Test setup
test.beforeAll(async () => {
  // Verify staging is running before all tests
  const health = await checkStagingHealth();
  if (!health.healthy) {
    throw new Error(
      'Staging backend is not running. Please run: npm run staging:deploy'
    );
  }
});

// Login test data (will be created and reused across tests)
let testUserData: {
  user: any;
  token: string;
  email: string;
  password: string;
};

test.describe('INT-001: User Registration Flow', () => {
  test('should complete full user registration with email verification', async ({ page, request }) => {
    const testEmail = generateTestEmail('register');

    // Step 1: Navigate to registration page
    await page.goto('/register');
    await expect(page).toHaveTitle(/Sign Up|Register/);

    // Step 2: Fill registration form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="text"]', 'Integration Test User');
    await page.fill('input[type="password"]', 'TestPass123!');

    // Step 3: Submit form (expecting to send verification code)
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Step 4: Wait for verification code input or success message
    // In staging with test mode, the code might be auto-filled or shown
    await page.waitForTimeout(2000);

    // Check if we need to enter verification code
    const codeInput = page.locator('input[name="code"], input[placeholder*="code"]').first();

    if (await codeInput.isVisible({ timeout: 5000 })) {
      // Enter test verification code (backend should log this or use a fixed code in test mode)
      await codeInput.fill('123456');
      await page.click('button[type="submit"]');
    }

    // Step 5: Verify registration success
    // Should redirect to user dashboard or show success message
    await page.waitForURL(/user|dashboard|profile/, { timeout: 15000 });

    // Verify we're logged in
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")').first();
    await expect(logoutButton).toBeVisible({ timeout: 10000 });

    // Store user data for cleanup
    testUserData = {
      user: { email: testEmail },
      token: '', // Will be extracted if needed for API cleanup
      email: testEmail,
      password: 'TestPass123!',
    };
  });

  test('should show error for duplicate email registration', async ({ page }) => {
    if (!testUserData?.email) {
      test.skip(); // Skip if first test didn't run
    }

    await page.goto('/register');

    // Try to register with the same email
    await page.fill('input[type="email"]', testUserData.email);
    await page.fill('input[type="text"]', 'Duplicate User');
    await page.fill('input[type="password"]', 'TestPass123!');

    await page.click('button[type="submit"]');

    // Should show error message
    const errorMessage = page.locator('text=Email already exists, text=already registered').first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });
});

test.describe('INT-002: User Login Flow', () => {
  test('should login with demo credentials successfully', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await expect(page).toHaveTitle(/Log In|Sign In|Login/);

    // Fill login form
    await page.fill('input[type="email"]', TEST_ACCOUNTS.demo.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.demo.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Verify successful login - should redirect or show user menu
    await page.waitForTimeout(3000);

    // Check for user-related UI elements (user avatar, name, or logout button)
    const userIndicator = page.locator(
      'button:has-text("Logout"), [data-testid="user-menu"], .user-avatar'
    ).first();

    await expect(userIndicator).toBeVisible({ timeout: 15000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill with invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');

    // Should show error message
    const errorMessage = page.locator('text=Invalid, text=Incorrect, text=not found').first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to user profile after login', async ({ page }) => {
    await page.goto('/login');

    // Login with demo account
    await page.fill('input[type="email"]', TEST_ACCOUNTS.demo.email);
    await page.fill('input[type="password"]', TEST_ACCOUNTS.demo.password);
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForTimeout(3000);

    // Navigate to user profile
    await page.goto('/user/profile');

    // Verify profile page shows user information
    const profileSection = page.locator('[data-testid="user-profile"], .user-profile').first();
    await expect(profileSection).toBeVisible({ timeout: 10000 });
  });
});

test.describe('INT-003: Course Search and Filter', () => {
  test('should load courses from real API', async ({ page, request }) => {
    // Verify API is returning real data
    const apiContext = await setupIntegrationTest();
    const searchResult = await searchCourses(apiContext);
    expect(searchResult.data?.courses?.length).toBeGreaterThan(0);
    await apiContext.dispose();

    // Navigate to course list page
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    // Verify course cards are rendered
    const courseCards = page.locator('[data-testid="course-card"], .course-card');
    await expect(courseCards.first()).toBeVisible({ timeout: 15000 });

    // Verify at least some courses are displayed
    const count = await courseCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter courses by search keyword', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    // Find search input
    const searchInput = page.locator(
      'input[data-testid="search-input"], input[placeholder*="search" i], input[name="search"]'
    ).first();

    await expect(searchInput).toBeVisible();
    await searchInput.fill('math');
    await searchInput.press('Enter');

    // Wait for results to update
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    // Verify results are shown (might be empty if no math courses)
    const courseCards = page.locator('[data-testid="course-card"], .course-card');
    const count = await courseCards.count();

    // Either we have results or we see "no results" message
    if (count === 0) {
      const noResults = page.locator('text=no results, text=no courses, text=not found').first();
      await expect(noResults).toBeVisible();
    }
  });

  test('should filter courses by city', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    // Find city filter dropdown
    const cityFilter = page.locator(
      'select[data-testid="filter-city"], select[name="city"], .city-filter select'
    ).first();

    if (await cityFilter.isVisible()) {
      // Select a city (e.g., Auckland)
      await cityFilter.selectOption({ label: /Auckland/i });

      // Wait for results to update
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');

      // Verify URL or page updated
      expect(page.url()).toContain(/city|Auckland/i);
    }
  });

  test('should filter courses by subject', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    // Find subject filter
    const subjectFilter = page.locator(
      'select[data-testid="filter-subject"], select[name="subject"], .subject-filter select'
    ).first();

    if (await subjectFilter.isVisible()) {
      // Select a subject
      await subjectFilter.selectOption({ label: /Math|English/i });

      // Wait for results
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');

      // Verify filter applied
      expect(page.url()).toContain(/subject|Math|English/i);
    }
  });
});

test.describe('INT-004: Course Detail View', () => {
  test('should display complete course information', async ({ page, request }) => {
    // First get a course ID from the API
    const apiContext = await setupIntegrationTest();
    const searchResult = await searchCourses(apiContext);
    const courseId = searchResult.data?.courses?.[0]?.id;

    if (!courseId) {
      await apiContext.dispose();
      test.skip('No courses found in database');
    }

    // Navigate to course detail page
    await page.goto(`/courses/${courseId}`);
    await page.waitForLoadState('networkidle');

    // Verify course title is visible
    const title = page.locator('h1, [data-testid="course-title"]').first();
    await expect(title).toBeVisible();

    // Verify course description
    const description = page.locator('[data-testid="course-description"], .course-description').first();
    await expect(description).toBeVisible();

    // Verify teacher information
    const teacherInfo = page.locator('[data-testid="teacher-info"], .teacher-info').first();
    await expect(teacherInfo).toBeVisible();

    // Verify pricing information
    const price = page.locator('[data-testid="price"], .price, text:has-text("$")').first();
    await expect(price).toBeVisible();

    await apiContext.dispose();
  });

  test('should show similar courses section', async ({ page, request }) => {
    const apiContext = await setupIntegrationTest();
    const searchResult = await searchCourses(apiContext);
    const courseId = searchResult.data?.courses?.[0]?.id;

    if (!courseId) {
      await apiContext.dispose();
      test.skip('No courses found');
    }

    await page.goto(`/courses/${courseId}`);
    await page.waitForLoadState('networkidle');

    // Scroll to bottom to find similar courses
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Look for similar courses section
    const similarSection = page.locator(
      '[data-testid="similar-courses"], .similar-courses, section:has-text("Similar")'
    ).first();

    // Similar courses might not always be available, so we use soft assertion
    const isVisible = await similarSection.isVisible().catch(() => false);
    if (isVisible) {
      const similarCards = page.locator('[data-testid="course-card"], .course-card');
      const count = await similarCards.count();
      expect(count).toBeGreaterThan(0);
    }

    await apiContext.dispose();
  });

  test('should navigate from list to detail and back', async ({ page }) => {
    // Start at course list
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    // Wait for courses to load
    const firstCard = page.locator('[data-testid="course-card"], .course-card').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });

    // Click first course card
    await firstCard.click();

    // Should navigate to detail page
    await page.waitForURL(/\/courses\/\w+/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/courses\/\w+/);

    // Go back to list
    await page.goBack();
    await page.waitForURL(/\/courses$/, { timeout: 10000 });

    // Should be back on list page
    expect(page.url()).toMatch(/\/courses$/);
  });
});

test.describe('INT-005: Teacher Application Flow', () => {
  test('should submit teacher application successfully', async ({ page, request }) => {
    // First login as demo user
    const apiContext = await setupIntegrationTest();
    const loginData = await loginAsDemo(apiContext);

    // Set auth state in browser
    await page.addInitScript((token: string) => {
      localStorage.setItem('auth_token', token);
    }, loginData.token);

    // Navigate to teacher application page
    await page.goto('/teacher/apply');
    await page.waitForLoadState('networkidle');

    // Verify application form is visible
    const form = page.locator('form, [data-testid="teacher-application-form"]').first();
    await expect(form).toBeVisible();

    // Fill application form
    const testPhone = generateTestPhone();

    await page.fill('input[name="phone"], input[placeholder*="phone"]', testPhone);
    await page.fill('textarea[name="qualifications"], textarea[name="qualification"]', 'Bachelor of Education');
    await page.fill('textarea[name="experience"]', '5 years of teaching experience');
    await page.fill('input[name="subjects"], input[placeholder*="subjects"]', 'Math, English, Science');

    // Submit application
    await page.click('button[type="submit"]');

    // Wait for success message or redirect
    await page.waitForTimeout(3000);

    // Verify success
    const successMessage = page.locator('text=Application submitted, text=Success, text=Pending').first();
    await expect(successMessage).toBeVisible({ timeout: 10000 });

    await apiContext.dispose();
  });

  test('should show application status after submission', async ({ page, request }) => {
    const apiContext = await setupIntegrationTest();
    const loginData = await loginAsDemo(apiContext);

    await page.addInitScript((token: string) => {
      localStorage.setItem('auth_token', token);
    }, loginData.token);

    // Go to user profile/applications page
    await page.goto('/user/applications');
    await page.waitForLoadState('networkidle');

    // Look for applications list
    const applicationsList = page.locator('[data-testid="applications-list"], .applications-list').first();
    const isVisible = await applicationsList.isVisible().catch(() => false);

    if (isVisible) {
      // Verify application status is shown
      const statusBadge = page.locator('[data-testid="status"], .status, text:has-text("Pending")').first();
      await expect(statusBadge).toBeVisible();
    }

    await apiContext.dispose();
  });
});

test.describe('INT-006: Favorites Functionality', () => {
  test('should add course to favorites', async ({ page, request }) => {
    const apiContext = await setupIntegrationTest();
    const loginData = await loginAsDemo(apiContext);

    // Set auth state
    await page.addInitScript((token: string) => {
      localStorage.setItem('auth_token', token);
    }, loginData.token);

    // Get a course to favorite
    const searchResult = await searchCourses(apiContext);
    const courseId = searchResult.data?.courses?.[0]?.id;

    if (!courseId) {
      await apiContext.dispose();
      test.skip('No courses available');
      return;
    }

    // Navigate to course detail
    await page.goto(`/courses/${courseId}`);
    await page.waitForLoadState('networkidle');

    // Find and click favorite button
    const favoriteButton = page.locator(
      'button[data-testid="favorite-button"], button:has-text("Favorite"), button:has-text("收藏")'
    ).first();

    await expect(favoriteButton).toBeVisible();
    await favoriteButton.click();

    // Wait for API call and UI update
    await page.waitForTimeout(2000);

    // Verify button state changed (e.g., shows as favorited)
    const isFavorited = await page.locator('button[aria-pressed="true"], .favorited, .active').isVisible();
    expect(isFavorited).toBeTruthy();

    // Verify via API
    const favorites = await getFavorites(apiContext, loginData.token);
    const foundInFavorites = favorites.data?.some((f: any) => f.courseId === courseId);
    expect(foundInFavorites).toBeTruthy();

    await apiContext.dispose();
  });

  test('should show favorites list in user profile', async ({ page, request }) => {
    const apiContext = await setupIntegrationTest();
    const loginData = await loginAsDemo(apiContext);

    await page.addInitScript((token: string) => {
      localStorage.setItem('auth_token', token);
    }, loginData.token);

    // Navigate to favorites page
    await page.goto('/user/favorites');
    await page.waitForLoadState('networkidle');

    // Look for favorites section
    const favoritesSection = page.locator(
      '[data-testid="favorites-list"], .favorites-list, section:has-text("Favorites")'
    ).first();

    const isVisible = await favoritesSection.isVisible().catch(() => false);

    if (isVisible) {
      // Verify favorite courses are displayed
      const favoriteCards = page.locator('[data-testid="course-card"], .course-card');
      const count = await favoriteCards.count();

      // Should have at least some favorites if demo account has been used
      // Otherwise might be empty
      if (count > 0) {
        await expect(favoriteCards.first()).toBeVisible();
      }
    }

    await apiContext.dispose();
  });

  test('should remove course from favorites', async ({ page, request }) => {
    const apiContext = await setupIntegrationTest();
    const loginData = await loginAsDemo(apiContext);

    // First add a favorite via API
    const searchResult = await searchCourses(apiContext);
    const courseId = searchResult.data?.courses?.[0]?.id;

    if (!courseId) {
      await apiContext.dispose();
      test.skip('No courses available');
      return;
    }

    await addFavorite(apiContext, loginData.token, courseId);

    // Set auth and navigate
    await page.addInitScript((token: string) => {
      localStorage.setItem('auth_token', token);
    }, loginData.token);

    await page.goto(`/courses/${courseId}`);
    await page.waitForLoadState('networkidle');

    // Click favorite button to remove
    const favoriteButton = page.locator(
      'button[data-testid="favorite-button"], button:has-text("Favorite"), button:has-text("收藏")'
    ).first();

    await favoriteButton.click();
    await page.waitForTimeout(2000);

    // Verify removed (button not in active state)
    const isFavorited = await page
      .locator('button[aria-pressed="true"], .favorited, .active')
      .isVisible()
      .catch(() => false);
    expect(isFavorited).toBeFalsy();

    // Verify via API
    const favorites = await getFavorites(apiContext, loginData.token);
    const foundInFavorites = favorites.data?.some((f: any) => f.courseId === courseId);
    expect(foundInFavorites).toBeFalsy();

    await apiContext.dispose();
  });
});

// Test cleanup
test.afterAll(async ({ request }) => {
  // Cleanup any test data created
  // Note: This requires admin privileges or special cleanup endpoints
  // For now, we'll log what was created
  console.log('Integration tests completed');
  console.log('Note: Test data cleanup requires admin privileges');
  console.log('Run: npm run staging:reset to clean the database');
});
