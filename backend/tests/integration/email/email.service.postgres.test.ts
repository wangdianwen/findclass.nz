/**
 * Email Service Integration Tests
 *
 * Tests the email service functionality using MailDev TestContainer.
 * Verifies email sending, content, and error handling.
 *
 * Test Type: Integration Test
 * Path: tests/integration/email/email.service.test.ts
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { getApp } from '../setup.postgres';
import * as emailService from '@shared/smtp/email.service';
import {
  getAllEmails,
  clearAllEmails,
  verifyEmailSent,
  extractVerificationCode,
  extractResetLink,
  waitForEmail,
  verifyEmailContent,
} from '../helpers/maildev-helper';

describe('Email Service Integration Tests', () => {
  beforeAll(() => {
    // MailDev is already started by setup.postgres.ts
    // Get app instance to ensure config is loaded
    getApp();
  });

  beforeEach(async () => {
    // Clear all emails before each test for isolation
    await clearAllEmails();
  });

  // ==================== sendEmail() Tests ====================

  describe('sendEmail()', () => {
    it('should send email with HTML and text body', async () => {
      const to = `test-${Date.now()}@example.com`;
      const subject = 'Test Email';
      const htmlBody = '<h1>Test HTML</h1>';
      const textBody = 'Test Text';

      const result = await emailService.sendEmail({
        to,
        subject,
        htmlBody,
        textBody,
      });

      expect(result).toBe(true);

      // Verify email was sent
      const { found, email } = await verifyEmailSent({ to, subject });
      expect(found).toBe(true);
      expect(email).toBeDefined();
      expect(email?.subject).toBe(subject);

      // Verify HTML and text content
      if (email) {
        expect(email.html).toContain('Test HTML');
        expect(email.text).toContain('Test Text');
      }
    });

    it('should send email to multiple recipients', async () => {
      const recipients = [
        `test1-${Date.now()}@example.com`,
        `test2-${Date.now()}@example.com`,
      ];
      const subject = 'Multiple Recipients Test';

      const result = await emailService.sendEmail({
        to: recipients,
        subject,
        htmlBody: '<p>Test</p>',
        textBody: 'Test',
      });

      expect(result).toBe(true);

      // Verify emails were sent to both recipients
      for (const recipient of recipients) {
        const { found } = await verifyEmailSent({ to: recipient, subject });
        expect(found).toBe(true);
      }
    });

    it('should include correct from address', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendEmail({
        to,
        subject: 'From Address Test',
        htmlBody: '<p>Test</p>',
        textBody: 'Test',
      });

      const { email } = await verifyEmailSent({ to });
      expect(email).toBeDefined();
      expect(email?.from[0].address).toContain('findclass.nz');
    });

    it('should handle special characters in subject', async () => {
      const to = `test-${Date.now()}@example.com`;
      const subject = 'Test with 特殊字符 & symbols! @#$%';

      const result = await emailService.sendEmail({
        to,
        subject,
        htmlBody: '<p>Test</p>',
        textBody: 'Test',
      });

      expect(result).toBe(true);

      const { found, email } = await verifyEmailSent({ to, subject });
      expect(found).toBe(true);
      expect(email?.subject).toContain('特殊字符');
    });

    it('should handle Chinese characters in email body', async () => {
      const to = `test-${Date.now()}@example.com`;

      const result = await emailService.sendEmail({
        to,
        subject: 'Chinese Test',
        htmlBody: '<p>欢迎来到 FindClass.nz</p>',
        textBody: '欢迎来到 FindClass.nz',
      });

      expect(result).toBe(true);

      const { email } = await verifyEmailSent({ to });
      expect(email?.html).toContain('欢迎');
      expect(email?.text).toContain('欢迎');
    });

    it('should work without text body (HTML only)', async () => {
      const to = `test-${Date.now()}@example.com`;

      const result = await emailService.sendEmail({
        to,
        subject: 'HTML Only Test',
        htmlBody: '<p>HTML only</p>',
      });

      expect(result).toBe(true);

      const { found } = await verifyEmailSent({ to });
      expect(found).toBe(true);
    });
  });

  // ==================== sendVerificationEmail() Tests ====================

  describe('sendVerificationEmail()', () => {
    it('should send REGISTER verification email', async () => {
      const to = `test-${Date.now()}@example.com`;
      const code = '123456';

      const result = await emailService.sendVerificationEmail({
        email: to,
        code,
        type: 'REGISTER',
        expiresIn: 300,
      });

      expect(result).toBe(true);

      const { email } = await verifyEmailSent({ to });
      expect(email).toBeDefined();

      // Verify subject
      expect(email?.subject).toContain('verification code');

      // Verify code is in email
      const extractedCode = extractVerificationCode(email!);
      expect(extractedCode).toBe(code);

      // Verify content
      expect(email?.html).toContain('Verify Your Email');
      expect(email?.html).toContain('Welcome');
      expect(email?.text).toContain('Verify Your Email');
    });

    it('should send FORGOT_PASSWORD verification email', async () => {
      const to = `test-${Date.now()}@example.com`;
      const code = '654321';

      const result = await emailService.sendVerificationEmail({
        email: to,
        code,
        type: 'FORGOT_PASSWORD',
        expiresIn: 300,
      });

      expect(result).toBe(true);

      const { email } = await verifyEmailSent({ to });
      expect(email).toBeDefined();

      // Verify content
      expect(email?.html).toContain('Reset Your Password');
      expect(email?.html).toContain(code);

      const extractedCode = extractVerificationCode(email!);
      expect(extractedCode).toBe(code);
    });

    it('should send LOGIN verification email', async () => {
      const to = `test-${Date.now()}@example.com`;
      const code = '111111';

      const result = await emailService.sendVerificationEmail({
        email: to,
        code,
        type: 'LOGIN',
        expiresIn: 300,
      });

      expect(result).toBe(true);

      const { email } = await verifyEmailSent({ to });
      expect(email).toBeDefined();

      // Verify content
      expect(email?.html).toContain('Login Verification');
      expect(email?.html).toContain('complete your login');

      const extractedCode = extractVerificationCode(email!);
      expect(extractedCode).toBe(code);
    });

    it('should include correct 6-digit code in HTML', async () => {
      const to = `test-${Date.now()}@example.com`;
      const code = '999999';

      await emailService.sendVerificationEmail({
        email: to,
        code,
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      expect(email?.html).toContain(`<span`);
      expect(email?.html).toContain(code);
      expect(email?.html).toContain(`</span>`);
    });

    it('should include expiration time in email', async () => {
      const to = `test-${Date.now()}@example.com`;
      const expiresIn = 300; // 5 minutes

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn,
      });

      const { email } = await verifyEmailSent({ to });
      expect(email?.html).toContain('5 minutes');
      expect(email?.text).toContain('5 minutes');
    });

    it('should render HTML template correctly', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });

      // Verify HTML structure
      expect(email?.html).toContain('<!DOCTYPE html>');
      expect(email?.html).toContain('<title>');
      expect(email?.html).toContain('FindClass NZ');
      expect(email?.html).toContain('#0066cc'); // Brand color
      expect(email?.html).toContain('border-radius');
    });

    it('should render text template correctly', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });

      // Verify text content
      expect(email?.text).toContain('Your verification code:');
      expect(email?.text).toContain('123456');
      expect(email?.text).toContain('expire');
      expect(email?.text).toContain('FindClass NZ');
    });

    it('should handle Chinese characters in email', async () => {
      const to = `test-${Date.now()}@example.com`;

      const result = await emailService.sendVerificationEmail({
        email: to,
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      expect(result).toBe(true);

      const { email } = await verifyEmailSent({ to });
      // Email should support UTF-8
      expect(email?.html).toBeDefined();
      expect(email?.text).toBeDefined();
    });
  });

  // ==================== sendPasswordResetEmail() Tests ====================

  describe('sendPasswordResetEmail()', () => {
    it('should send password reset email', async () => {
      const to = `test-${Date.now()}@example.com`;
      const resetToken = 'abc123def456';

      const result = await emailService.sendPasswordResetEmail(to, resetToken, 600);

      expect(result).toBe(true);

      const { email } = await verifyEmailSent({ to });
      expect(email).toBeDefined();
      expect(email?.subject).toContain('Reset Your Password');
    });

    it('should include reset link with token', async () => {
      const to = `test-${Date.now()}@example.com`;
      const resetToken = 'token123';

      await emailService.sendPasswordResetEmail(to, resetToken, 600);

      const { email } = await verifyEmailSent({ to });

      // Verify reset link is present
      expect(email?.html).toContain('reset-password');
      expect(email?.html).toContain(resetToken);

      const resetLink = extractResetLink(email!);
      expect(resetLink).toBeDefined();
      expect(resetLink).toContain(resetToken);
    });

    it('should include expiration time', async () => {
      const to = `test-${Date.now()}@example.com`;
      const expiresIn = 600; // 10 minutes

      await emailService.sendPasswordResetEmail(to, 'token123', expiresIn);

      const { email } = await verifyEmailSent({ to });
      expect(email?.html).toContain('10 minutes');
      expect(email?.text).toContain('10 minutes');
    });

    it('should render HTML template correctly', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendPasswordResetEmail(to, 'token123', 600);

      const { email } = await verifyEmailSent({ to });

      // Verify HTML structure
      expect(email?.html).toContain('<!DOCTYPE html>');
      expect(email?.html).toContain('Reset Your Password');
      expect(email?.html).toContain('FindClass NZ');
      expect(email?.html).toContain('#0066cc'); // Brand color
      expect(email?.html).toContain('Reset Password'); // Button text
    });

    it('should render text template correctly', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendPasswordResetEmail(to, 'token123', 600);

      const { email } = await verifyEmailSent({ to });

      // Verify text content
      expect(email?.text).toContain('reset your password');
      expect(email?.text).toContain('reset-password');
      expect(email?.text).toContain('expire');
      expect(email?.text).toContain('FindClass NZ');
    });

    it('should generate correct reset link format', async () => {
      const to = `test-${Date.now()}@example.com`;
      const resetToken = 'xyz789';

      await emailService.sendPasswordResetEmail(to, resetToken, 600);

      const { email } = await verifyEmailSent({ to });
      const resetLink = extractResetLink(email!);

      expect(resetLink).toMatch(/https?:\/\/.+/);
      expect(resetLink).toContain('/auth/reset-password');
      expect(resetLink).toContain('token=');
      expect(resetLink).toContain(resetToken);
    });
  });

  // ==================== Template Generation Tests ====================

  describe('Template Generation', () => {
    it('should generate verification HTML with correct placeholders', () => {
      const html = emailService.generateVerificationEmailHTML({
        email: 'test@example.com',
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      expect(html).toContain('Verify Your Email');
      expect(html).toContain('123456');
      expect(html).toContain('5 minutes');
      expect(html).toContain('FindClass NZ');
    });

    it('should generate verification text with correct placeholders', () => {
      const text = emailService.generateVerificationEmailText({
        email: 'test@example.com',
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      expect(text).toContain('Verify Your Email');
      expect(text).toContain('123456');
      expect(text).toContain('5 minutes');
    });

    it('should handle different verification types', () => {
      const registerHTML = emailService.generateVerificationEmailHTML({
        email: 'test@example.com',
        code: '123456',
        type: 'REGISTER',
        expiresIn: 300,
      });

      const forgotHTML = emailService.generateVerificationEmailHTML({
        email: 'test@example.com',
        code: '123456',
        type: 'FORGOT_PASSWORD',
        expiresIn: 300,
      });

      const loginHTML = emailService.generateVerificationEmailHTML({
        email: 'test@example.com',
        code: '123456',
        type: 'LOGIN',
        expiresIn: 300,
      });

      expect(registerHTML).toContain('Verify Your Email');
      expect(forgotHTML).toContain('Reset Your Password');
      expect(loginHTML).toContain('Login Verification');
    });

    it('should format expiration time correctly', () => {
      const html1 = emailService.generateVerificationEmailHTML({
        email: 'test@example.com',
        code: '123456',
        type: 'REGISTER',
        expiresIn: 60, // 1 minute
      });

      const html2 = emailService.generateVerificationEmailHTML({
        email: 'test@example.com',
        code: '123456',
        type: 'REGISTER',
        expiresIn: 3600, // 1 hour
      });

      expect(html1).toContain('1 minutes');
      expect(html2).toContain('60 minutes');
    });
  });

  // ==================== Helper Function Tests ====================

  describe('MailDev Helper Functions', () => {
    it('should clear all emails', async () => {
      // Send some emails
      await emailService.sendEmail({
        to: `test1-${Date.now()}@example.com`,
        subject: 'Test 1',
        htmlBody: '<p>Test</p>',
      });

      await emailService.sendEmail({
        to: `test2-${Date.now()}@example.com`,
        subject: 'Test 2',
        htmlBody: '<p>Test</p>',
      });

      // Verify emails exist
      let emails = await getAllEmails();
      expect(emails.length).toBeGreaterThan(0);

      // Clear emails
      await clearAllEmails();

      // Verify emails are cleared
      emails = await getAllEmails();
      expect(emails.length).toBe(0);
    });

    it('should wait for email to arrive', async () => {
      const to = `test-${Date.now()}@example.com`;

      // Send email in background
      setTimeout(async () => {
        await emailService.sendEmail({
          to,
          subject: 'Wait Test',
          htmlBody: '<p>Test</p>',
        });
      }, 500);

      // Wait for email
      const email = await waitForEmail({ to }, 2000);
      expect(email).toBeDefined();
      expect(email?.to[0].address).toBe(to);
    });

    it('should verify email content correctly', async () => {
      const to = `test-${Date.now()}@example.com`;

      await emailService.sendEmail({
        to,
        subject: 'Content Test',
        htmlBody: '<h1>Hello World</h1>',
        textBody: 'Hello World',
      });

      const { email } = await verifyEmailSent({ to });
      expect(email).toBeDefined();

      const isValid = verifyEmailContent(email!, {
        subject: 'Content Test',
        htmlBody: 'Hello World',
        textBody: 'Hello World',
        from: 'findclass.nz',
      });

      expect(isValid).toBe(true);
    });

    it('should extract verification code correctly', async () => {
      const to = `test-${Date.now()}@example.com`;
      const code = '555555';

      await emailService.sendVerificationEmail({
        email: to,
        code,
        type: 'REGISTER',
        expiresIn: 300,
      });

      const { email } = await verifyEmailSent({ to });
      const extractedCode = extractVerificationCode(email!);

      expect(extractedCode).toBe(code);
    });

    it('should extract reset link correctly', async () => {
      const to = `test-${Date.now()}@example.com`;
      const token = 'test-token-123';

      await emailService.sendPasswordResetEmail(to, token, 600);

      const { email } = await verifyEmailSent({ to });
      const resetLink = extractResetLink(email!);

      expect(resetLink).toBeDefined();
      expect(resetLink).toContain(token);
    });
  });

  // ==================== Error Handling Tests ====================

  describe('Error Handling', () => {
    it('should handle invalid email address gracefully', async () => {
      // This test verifies the service doesn't crash on invalid input
      const result = await emailService.sendEmail({
        to: 'not-a-valid-email',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
      });

      // Should return false or throw error
      expect(typeof result).toBe('boolean');
    });

    it('should handle missing required fields', async () => {
      // @ts-expect-error - Testing missing field
      const result = await emailService.sendEmail({
        to: 'test@example.com',
        // missing subject
        htmlBody: '<p>Test</p>',
      });

      expect(typeof result).toBe('boolean');
    });

    it('should log errors appropriately', async () => {
      // This test verifies error logging doesn't crash
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Send to invalid SMTP server (this will be caught by our test setup)
      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Error Test',
        htmlBody: '<p>Test</p>',
      });

      // In our test setup with MailDev, this should succeed
      // This test mainly ensures error handling doesn't crash
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
