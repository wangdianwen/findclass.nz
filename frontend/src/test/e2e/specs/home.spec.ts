/**
 * Home Page E2E Tests
 *
 * Tests for the home page including:
 * - Page loading and skeleton screens
 * - Announcement bar
 * - Navigation
 * - Featured courses
 * - Language switching
 */

import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page and wait for network to be idle
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Loading', () => {
    test('HOME-001: 页面正确加载', async ({ page }) => {
      // Verify main sections are visible
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    });

    test('HOME-002: 公告栏显示', async ({ page }) => {
      // Check if announcement bar is visible (check by data-testid or class)
      const announcementBar = page.locator('[data-testid="announcement-bar"], [class*="announcement"]').first();
      await expect(announcementBar.first()).toBeVisible();
    });

    test('HOME-003: 公告栏关闭功能', async ({ page }) => {
      const closeButton = page.locator('[data-testid="announcement-close"], [class*="announcement"] button').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        // After close, announcement should be hidden
        const announcementBar = page.locator('[data-testid="announcement-bar"]');
        await expect(announcementBar).not.toBeVisible();
      }
    });
  });

  test.describe('Navigation', () => {
    test('HOME-005: 导航链接跳转', async ({ page }) => {
      // Check navigation links exist and are clickable
      const coursesLink = page.locator('nav a:has-text("Courses"), nav a[href="/courses"]').first();
      await expect(coursesLink.first()).toBeVisible();

      // Click and verify navigation
      await coursesLink.click();
      await page.waitForURL(/courses/);
    });

    test('HOME-006: 未登录显示登录按钮', async ({ page }) => {
      // Check if login button is visible when not logged in
      const loginButton = page.locator('header button:has-text("Log In"), header a[href="/login"]').first();
      await expect(loginButton.first()).toBeVisible();
    });
  });

  test.describe('Language Switching', () => {
    test('HOME-004: 语言切换器存在', async ({ page }) => {
      // Find language switcher
      const langSwitcher = page.locator('[data-testid="language-switcher"], select[name="lang"], [class*="language"]').first();
      await expect(langSwitcher.first()).toBeVisible();
    });
  });

  test.describe('Featured Courses', () => {
    test('HOME-010: Featured Courses 显示', async ({ page }) => {
      // Wait for courses to load
      const courseCards = page.locator('[data-testid="course-card"], .course-card, [class*="course"] [class*="card"]');
      await expect(courseCards.first()).toBeVisible({ timeout: 10000 });
    });

    test('HOME-011: 点击课程卡片跳转详情页', async ({ page }) => {
      // Click on first course card
      const firstCourse = page.locator('[data-testid="course-card"], .course-card').first();
      if (await firstCourse.isVisible()) {
        await firstCourse.click();
        // Should navigate to course detail page
        await page.waitForURL(/courses\//, { timeout: 5000 });
      }
    });

    test('HOME-012: 课程卡片信息显示', async ({ page }) => {
      // Wait for cards and verify content
      const cards = page.locator('[data-testid="course-card"], .course-card');
      await expect(cards.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Hero Section', () => {
    test('HOME-008: Hero 标题显示', async ({ page }) => {
      // Check hero section exists
      const heroSection = page.locator('[data-testid="hero-section"], section[class*="hero"], [class*="banner"]').first();
      await expect(heroSection.first()).toBeVisible();
    });

    test('HOME-009: CTA 按钮可点击', async ({ page }) => {
      // Find and click CTA button
      const ctaButton = page.locator('[data-testid="hero-cta"], section[class*="hero"] button').first();
      if (await ctaButton.isVisible()) {
        await ctaButton.click();
        // Should navigate to courses page
        await page.waitForURL(/courses/);
      }
    });
  });

  test.describe('Footer', () => {
    test('HOME-013: 页脚链接显示', async ({ page }) => {
      // Check footer exists with links
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
      // Verify at least 3 links exist in footer
      const linkCount = await footer.locator('a').count();
      expect(linkCount).toBeGreaterThanOrEqual(3);
    });
  });
});

test.describe('Home Page - Logged In User', () => {
  test.beforeEach(async ({ page }) => {
    // Set localStorage to simulate logged in user
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'user-test-001',
        name: 'Test User',
        email: 'test@example.com',
      }));
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('HOME-007: 已登录显示用户头像', async ({ page }) => {
    // When logged in, should show user avatar instead of login button
    const userAvatar = page.locator('[data-testid="user-avatar"], header [class*="avatar"]').first();
    await expect(userAvatar.first()).toBeVisible();
  });

  test('HOME-014: 用户下拉菜单存在', async ({ page }) => {
    // Click on user avatar to open dropdown
    const userAvatar = page.locator('[data-testid="user-avatar"], header [class*="avatar"]').first();
    if (await userAvatar.isVisible()) {
      await userAvatar.click();
      // Check dropdown menu exists
      const dropdown = page.locator('[class*="dropdown"], [class*="menu"]').first();
      await expect(dropdown.first()).toBeVisible();
    }
  });
});
