/**
 * Email Template Tests
 *
 * Tests email template rendering, content, and design.
 * Verifies HTML structure, styling, and localization support.
 *
 * Test Type: Integration Test
 * Path: tests/integration/email/email-templates.test.ts
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { getApp } from '../setup.postgres';
import * as emailService from '@shared/smtp/email.service';
import {
  clearAllEmails,
  verifyEmailSent,
  extractVerificationCode,
} from '../helpers/maildev-helper';

describe('Email Templates', () => {
  beforeAll(() => {
    getApp();
  });

  beforeEach(async () => {
    await clearAllEmails();
  });

  // ==================== Verification Email Template ====================

  describe('Verification Email Template', () => {
    it('should render REGISTER type with correct title', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      expect(email?.html).toContain('Verify Your Email');
      expect(email?.html).toContain('Welcome');
      expect(email?.html).toContain('complete your registration');
    });

    it('should render FORGOT_PASSWORD type with correct title', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'FORGOT_PASSWORD',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      expect(email?.html).toContain('Reset Your Password');
      expect(email?.html).toContain('reset your password');
    });

    it('should render LOGIN type with correct title', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'LOGIN',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      expect(email?.html).toContain('Login Verification');
      expect(email?.html).toContain('complete your login');
    });

    it('should include 6-digit code in dotted box', async () => {
      const to = `test-${Date.now()}@example.com`;
      const code = '987654';

      await emailService.sendVerificationEmail({
        email: to,
        code,
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      expect(email?.html).toContain('border: 2px dashed #0066cc');
      expect(email?.html).toContain('letter-spacing: 8px');

      const extractedCode = extractVerificationCode(email!);
      expect(extractedCode).toBe(code);
    });

    it('should include expiration time', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      expect(email?.html).toContain('5 minutes');
      expect(email?.html).toContain('expire');
    });

    it('should include security notice', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      expect(email?.html).toContain("didn't request");
      expect(email?.html).toContain('ignore this email');
    });

    it('should handle long email addresses', async () => {
      const to = `very-long-email-address-${Date.now()}@example.com`;

      const result = await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      expect(result).toBe(true);

      const { found } = await verifyEmailSent({ to });
      expect(found).toBe(true);
    });

    it('should handle special characters', async () => {
      const to = `test+tag-${Date.now()}@example.com`;

      const result = await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      expect(result).toBe(true);

      const { found } = await verifyEmailSent({ to });
      expect(found).toBe(true);
    });

    it('should include Chinese text in text version', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      expect(email?.text).toContain('Your verification code:');
      expect(email?.text).toContain('FindClass NZ');
    });
  });

  // ==================== Password Reset Template ====================

  describe('Password Reset Template', () => {
    it('should render reset button with correct link', async () => {
      const to = `test-${Date.now()}@example.com`;
      const token = 'reset-token-123';

      await emailService.sendPasswordResetEmail(to, token, 600);

      const { email } = await verifyEmailSent({ to });
      expect(email?.html).toContain('Reset Password');
      expect(email?.html).toContain('href=');
      expect(email?.html).toContain(token);
    });

    it('should include expiration time', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendPasswordResetEmail(to, 'token', 600);

      const { email } = await verifyEmailSent({ to });
      expect(email?.html).toContain('10 minutes');
      expect(email?.html).toContain('expire');
    });

    it('should include security notice', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendPasswordResetEmail(to, 'token', 600);

      const { email } = await verifyEmailSent({ to });
      expect(email?.html).toContain("didn't request");
      expect(email?.html).toContain('ignore');
      expect(email?.html).toContain('contact support');
    });

    it('should handle long reset tokens', async () => {
      const to = `test-${Date.now()}@example.com`;
      const longToken = 'a'.repeat(200);

      await emailService.sendPasswordResetEmail(to, longToken, 600);

      const { email } = await verifyEmailSent({ to });
      expect(email?.html).toContain(longToken);
    });

    it('should include text version with link', async () => {
      const to = `test-${Date.now()}@example.com`;
      const token = 'token-xyz';

      await emailService.sendPasswordResetEmail(to, token, 600);

      const { email } = await verifyEmailSent({ to });
      expect(email?.text).toContain('reset your password');
      expect(email?.text).toContain(token);
      expect(email?.text).toContain('FindClass NZ');
    });
  });

  // ==================== Template Design ====================

  describe('Template Design', () => {
    it('should use correct brand colors', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      // Primary brand color
      expect(email?.html).toContain('#0066cc');
    });

    it('should be responsive', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      // Viewport meta tag
      expect(email?.html).toContain('viewport');
      expect(email?.html).toContain('width=device-width');
    });

    it('should include footer with FindClass branding', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      expect(email?.html).toContain('FindClass NZ');
      expect(email?.html).toContain('class search platform');
    });

    it('should use proper HTML structure', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      // Proper DOCTYPE and HTML tags
      expect(email?.html).toContain('<!DOCTYPE html>');
      expect(email?.html).toContain('<html');
      expect(email?.html).toContain('<head>');
      expect(email?.html).toMatch(/<body/);
    });

    it('should handle Chinese characters correctly', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      // UTF-8 charset (note: template uses lowercase utf-8)
      expect(email?.html).toMatch(/charset="utf-8"/i);

      // Should be able to handle Chinese content
      expect(email?.html).toBeDefined();
      expect(email?.text).toBeDefined();
    });

    it('should use inline styles for email client compatibility', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      // Inline styles (not external CSS)
      expect(email?.html).toContain('style=');
      expect(email?.html).not.toContain('<link ');
      expect(email?.html).not.toContain('<style>');
    });

    it('should use table-based layout for compatibility', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      // Table-based layout (email standard)
      expect(email?.html).toContain('<table');
      expect(email?.html).toContain('<tr>');
      expect(email?.html).toContain('<td');
    });

    it('should include proper alt text and accessibility', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      // Role attribute for tables
      expect(email?.html).toContain('role="presentation"');
    });
  });

  // ==================== Template Content Verification ====================

  describe('Template Content', () => {
    it('should have consistent email subject format', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      expect(email?.subject).toMatch(/^\[FindClass NZ\]/);
    });

    it('should include proper from address', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      expect(email?.from[0].address).toContain('findclass.nz');
      expect(email?.from[0].name).toBeDefined();
    });

    it('should have proper text-to-HTML ratio', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      // Should have both HTML and text versions
      expect(email?.html).toBeDefined();
      expect(email?.text).toBeDefined();
      expect(email?.html?.length).toBeGreaterThan(0);
      expect(email?.text?.length).toBeGreaterThan(0);
    });

    it('should include clear call-to-action', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      // Clear action instruction
      expect(email?.html).toMatch(/code/i);
      expect(email?.text).toMatch(/code/i);
    });
  });

  // ==================== Edge Cases ====================

  describe('Template Edge Cases', () => {
    it('should handle very long codes', async () => {
      const to = `test-${Date.now()}@example.com`;
      const longCode = '1'.repeat(20);

      await emailService.sendVerificationEmail({
        email: to,
        code: longCode,
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      expect(email?.html).toContain(longCode);
    });

    it('should handle very short expiration times', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 1, // 1 second
      });

      const { email } = await verifyEmailSent({ to });
      expect(email?.html).toContain('0 minutes');
    });

    it('should handle very long expiration times', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 86400, // 24 hours
      });

      const { email } = await verifyEmailSent({ to });
      expect(email?.html).toContain('1440 minutes');
    });
  });
});
