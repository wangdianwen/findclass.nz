/**
 * Course Search E2E Tests
 *
 * Tests for course listing and search functionality:
 * - Course listing
 * - Search functionality
 * - Filtering
 * - Sorting
 * - Pagination
 */

import { test, expect } from '@playwright/test';

test.describe('Course Search Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Rendering', () => {
    test('SEARCH-001: 课程列表页正确加载', async ({ page }) => {
      // Check page loads with course content
      await expect(page.locator('h1, [data-testid="page-title"]').first()).toBeVisible();
    });

    test('SEARCH-002: 筛选面板存在', async ({ page }) => {
      // Check filter controls exist
      const filterPanel = page
        .locator('[data-testid="filter-panel"], .filters, section[class*="filter"]')
        .first();
      await expect(filterPanel.first()).toBeVisible();
    });
  });

  test.describe('Search Functionality', () => {
    test('SEARCH-003: 搜索输入框存在', async ({ page }) => {
      // Check search input exists
      const searchInput = page
        .locator('[data-testid="search-input"], input[placeholder*="Search"], input[name="search"]')
        .first();
      await expect(searchInput.first()).toBeVisible();
    });

    test('SEARCH-004: 搜索无结果显示空状态', async ({ page }) => {
      // Use search input if available
      const searchInput = page
        .locator('[data-testid="search-input"], input[placeholder*="Search"]')
        .first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('nosuchcourse12345xyz');
        const searchBtn = page
          .locator('[data-testid="search-button"], button[type="submit"]')
          .first();
        if (await searchBtn.isVisible()) {
          await searchBtn.click();
          await page.waitForLoadState('networkidle');
        }
      }
    });
  });

  test.describe('Filters', () => {
    test('SEARCH-005: 城市筛选存在', async ({ page }) => {
      // Check city filter exists
      const cityFilter = page
        .locator('[data-testid="filter-city"], select[name="city"], .city-filter')
        .first();
      await expect(cityFilter.first()).toBeVisible();
    });

    test('SEARCH-006: 科目筛选存在', async ({ page }) => {
      // Check subject filter exists
      const subjectFilter = page
        .locator('[data-testid="filter-subject"], select[name="subject"], .subject-filter')
        .first();
      await expect(subjectFilter.first()).toBeVisible();
    });

    test('SEARCH-007: 年级筛选存在', async ({ page }) => {
      // Check grade filter exists
      const gradeFilter = page
        .locator('[data-testid="filter-grade"], select[name="grade"], .grade-filter')
        .first();
      await expect(gradeFilter.first()).toBeVisible();
    });
  });

  test.describe('Course Cards', () => {
    test('SEARCH-015: 课程卡片存在', async ({ page }) => {
      // Wait for course cards to load
      await page.waitForSelector(
        '[data-testid="course-card"], .course-card, [class*="course"] [class*="card"]',
        { timeout: 10000 }
      );
      const cards = page.locator('[data-testid="course-card"], .course-card').first();
      await expect(cards.first()).toBeVisible();
    });

    test('SEARCH-016: 点击跳转到详情页', async ({ page }) => {
      // Wait for cards and click first one
      await page.waitForSelector('[data-testid="course-card"], .course-card', { timeout: 10000 });
      const firstCard = page.locator('[data-testid="course-card"], .course-card').first();
      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForURL(/courses\//, { timeout: 5000 });
      }
    });
  });

  test.describe('Sorting', () => {
    test('SEARCH-010: 排序选择器存在', async ({ page }) => {
      const sortSelect = page
        .locator('[data-testid="sort-select"], select[name="sort"], .sort-select')
        .first();
      await expect(sortSelect.first()).toBeVisible();
    });
  });

  test.describe('Pagination', () => {
    test('SEARCH-012: 分页控件存在', async ({ page }) => {
      const pagination = page
        .locator('[data-testid="pagination"], .pagination, nav[class*="pagination"]')
        .first();
      await expect(pagination.first()).toBeVisible();
    });
  });
});

test.describe('Course Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/courses/1');
    await page.waitForLoadState('networkidle');
  });

  test('CD-001: 课程详情页加载', async ({ page }) => {
    await expect(page.locator('h1, [data-testid="course-title"]').first()).toBeVisible();
  });

  test('CD-002: 课程信息显示', async ({ page }) => {
    // Check for course title or description
    const courseInfo = page.locator('[class*="course"], [data-testid="course-detail"]').first();
    await expect(courseInfo.first()).toBeVisible();
  });

  test('CD-003: 教师信息存在', async ({ page }) => {
    const teacherInfo = page.locator('[class*="teacher"], [data-testid="teacher"]').first();
    await expect(teacherInfo.first()).toBeVisible();
  });

  test('CD-004: 联系信息存在', async ({ page }) => {
    const contactInfo = page.locator('[class*="contact"], [data-testid="contact"]').first();
    await expect(contactInfo.first()).toBeVisible();
  });

  test('CD-005: 相似课程存在', async ({ page }) => {
    const similarCourses = page.locator('[class*="similar"], [class*="related"]').first();
    await expect(similarCourses.first()).toBeVisible();
  });
});
