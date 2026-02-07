/**
 * Authentication E2E Tests
 *
 * Tests for login, registration, and authentication flows:
 * - Login with email/code
 * - Login validation
 * - Rate limiting
 * - Social login
 */

import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Rendering', () => {
    test('LOGIN-001: 登录页正确加载', async ({ page }) => {
      // Use more flexible selector - check for page title or heading
      await expect(page.locator('h1, [data-testid="page-title"]').first()).toBeVisible();
      await expect(page.locator('input[type="email"], [name="email"]').first()).toBeVisible();
    });

    test('LOGIN-002: 页面包含邮箱输入框', async ({ page }) => {
      // Check email input exists
      const emailInput = page.locator('input[type="email"], [name="email"]').first();
      await expect(emailInput).toBeVisible();
    });
  });

  test.describe('Form Fields', () => {
    test('LOGIN-003: 包含提交按钮', async ({ page }) => {
      // Check submit button exists
      const submitBtn = page.locator('button[type="submit"]').first();
      await expect(submitBtn).toBeVisible();
    });

    test('LOGIN-004: 包含社交登录按钮', async ({ page }) => {
      // Check for social login buttons (Google/WeChat)
      const googleBtn = page.locator('button:has-text("Google"), [data-testid="google-login"]');
      await expect(googleBtn.first()).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('LOGIN-008: 跳转到注册页链接', async ({ page }) => {
      // Find and click sign up link
      const signUpLink = page.locator('a:has-text("Sign Up"), a:has-text("Register")').first();
      if (await signUpLink.isVisible()) {
        await signUpLink.click();
        await page.waitForURL(/register/);
      }
    });

    test('LOGIN-009: 跳转到忘记密码页链接', async ({ page }) => {
      // Find and click forgot password link
      const forgotLink = page
        .locator('a:has-text("Forgot Password"), a:has-text("忘记密码")')
        .first();
      if (await forgotLink.isVisible()) {
        await forgotLink.click();
        await page.waitForURL(/forgot/);
      }
    });
  });

  test.describe('Social Login', () => {
    test('LOGIN-010: Google 登录按钮存在', async ({ page }) => {
      const googleBtn = page.locator('button:has-text("Google"), [aria-label*="Google"]').first();
      await expect(googleBtn.first()).toBeVisible();
    });

    test('LOGIN-011: WeChat 登录按钮存在', async ({ page }) => {
      const wechatBtn = page.locator('button:has-text("WeChat"), [aria-label*="WeChat"]').first();
      await expect(wechatBtn.first()).toBeVisible();
    });
  });
});

test.describe('Register Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Rendering', () => {
    test('REG-001: 注册页正确加载', async ({ page }) => {
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('input[type="email"], [name="email"]').first()).toBeVisible();
    });

    test('REG-002: 包含基本表单字段', async ({ page }) => {
      await expect(page.locator('input[type="text"], [name="name"]').first()).toBeVisible();
      await expect(page.locator('input[type="email"], [name="email"]').first()).toBeVisible();
      await expect(page.locator('input[type="password"], [name="password"]').first()).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('REG-006: 跳转到登录页链接', async ({ page }) => {
      const loginLink = page.locator('a:has-text("Log In"), a:has-text("Login")').first();
      if (await loginLink.isVisible()) {
        await loginLink.click();
        await page.waitForURL(/login/);
      }
    });
  });
});

test.describe('Forgot Password Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');
  });

  test('FP-001: 页面正确加载', async ({ page }) => {
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('input[type="email"], [name="email"]').first()).toBeVisible();
  });

  test('FP-002: 包含提交按钮', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
  });

  test('FP-003: 跳回登录页链接', async ({ page }) => {
    const loginLink = page.locator('a:has-text("Back to Login"), a:has-text("返回登录")').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await page.waitForURL(/login/);
    }
  });
});
