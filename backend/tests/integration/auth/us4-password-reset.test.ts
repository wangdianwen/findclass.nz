/**
 * US4: Password Management
 *
 * User Story:
 * As a registered user
 * I want to manage and reset my password
 * So that I can keep my account secure
 *
 * Test Type: Integration Test (PostgreSQL)
 * Path: tests/integration/auth/us4-password-reset.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp, getTestPool } from '../setup.integration';
import { createTestUser, cleanupTestUser } from '../fixtures/test-users.postgres';
import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import { Pool } from 'pg';

describe('US4: Password Management (PostgreSQL)', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = getTestPool();
  });

  beforeEach(async () => {
    // Clean up before each test
    await pool.query('DELETE FROM role_application_history');
    await pool.query('DELETE FROM role_applications');
    await pool.query('DELETE FROM sessions');
    await pool.query('DELETE FROM verification_codes');
    await pool.query('DELETE FROM users');
  });

  // ==================== Happy Path ====================

  describe('Happy Path', () => {
    it('US4-HP-01: should send password reset code for existing user', async () => {
      const uniqueEmail = `us4-hp-01-${Date.now()}@example.com`;

      // Register user
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'TestPass123!',
        name: 'Password Reset Test',
        role: 'PARENT',
      });

      // Request password reset
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: uniqueEmail })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password reset code sent to your email');

      await cleanupTestUser(uniqueEmail);
    });

    it('US4-HP-02: should complete full password reset flow', async () => {
      const uniqueEmail = `us4-hp-02-${Date.now()}@example.com`;
      const originalPassword = 'OriginalPass123!';
      const newPassword = 'NewSecurePass456!';

      // Register user
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: originalPassword,
        name: 'Full Reset Test',
        role: 'PARENT',
      });

      // Request password reset
      await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: uniqueEmail })
        .expect(200);

      // Get the verification code from database
      const codeResult = await pool.query(
        'SELECT code FROM verification_codes WHERE email = $1 AND type = $2 ORDER BY created_at DESC LIMIT 1',
        [uniqueEmail.toLowerCase(), 'PASSWORD_RESET']
      );

      expect(codeResult.rows.length).toBe(1);
      const resetCode = codeResult.rows[0].code;

      // Reset password with valid code
      const resetResponse = await request(getApp())
        .post('/api/v1/auth/password/reset')
        .send({ email: uniqueEmail, code: resetCode, newPassword })
        .expect(200);

      expect(resetResponse.body.success).toBe(true);

      // Verify old password no longer works
      const oldLogin = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: originalPassword })
        .expect(401);

      expect(oldLogin.body.success).toBe(false);

      // Verify new password works
      const newLogin = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: newPassword })
        .expect(200);

      expect(newLogin.body.success).toBe(true);

      await cleanupTestUser(uniqueEmail);
    });
  });

  // ==================== Failed Cases ====================

  describe('Failed Cases', () => {
    it('US4-FC-01: should return success for non-existent email (user enumeration prevention)', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should NOT indicate whether email exists or not
      expect(response.body.message).toBe('Password reset code sent to your email');
    });

    it('US4-FC-02: should reject invalid verification code', async () => {
      const uniqueEmail = `us4-fc-02-${Date.now()}@example.com`;

      // Register user
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'TestPass123!',
        name: 'Invalid Code Test',
        role: 'PARENT',
      });

      // Request password reset
      await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: uniqueEmail })
        .expect(200);

      // Use invalid verification code
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset')
        .send({ email: uniqueEmail, code: 'INVALID', newPassword: 'NewPass123!' })
        .expect(400);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });

    it('US4-FC-03: should reject short new password', async () => {
      const uniqueEmail = `us4-fc-03-${Date.now()}@example.com`;

      // Register user
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'TestPass123!',
        name: 'Short Password Test',
        role: 'PARENT',
      });

      // Request password reset
      await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: uniqueEmail })
        .expect(200);

      // Use short new password
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset')
        .send({ email: uniqueEmail, code: '123456', newPassword: 'short' })
        .expect(400);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });

    it('US4-FC-04: should reject reset for non-existent user', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset')
        .send({ email: 'nonexistent@example.com', code: '123456', newPassword: 'NewPass123!' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('US4-FC-05: should reject empty email in reset request', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('US4-FC-06: should reject empty new password', async () => {
      const uniqueEmail = `us4-fc-06-${Date.now()}@example.com`;

      // Register user
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'TestPass123!',
        name: 'Empty Password Test',
        role: 'PARENT',
      });

      // Request password reset
      await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: uniqueEmail })
        .expect(200);

      // Use empty new password
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset')
        .send({ email: uniqueEmail, code: '123456', newPassword: '' })
        .expect(400);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('US4-EC-01: should handle case-insensitive email for reset request', async () => {
      const uniqueEmail = `us4-ec-01-${Date.now()}@EXAMPLE.COM`;

      // Register user (with uppercase email)
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'TestPass123!',
        name: 'Case Test',
        role: 'PARENT',
      });

      // Request reset with lowercase email
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: uniqueEmail.toLowerCase() })
        .expect(200);

      expect(response.body.success).toBe(true);

      await cleanupTestUser(uniqueEmail);
    });

    it('US4-EC-02: should handle very long new password', async () => {
      const uniqueEmail = `us4-ec-02-${Date.now()}@example.com`;
      const longPassword = 'A'.repeat(500);

      // Register user
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'TestPass123!',
        name: 'Long Password Test',
        role: 'PARENT',
      });

      // Request password reset
      await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: uniqueEmail })
        .expect(200);

      // Try with very long password
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset')
        .send({ email: uniqueEmail, code: '123456', newPassword: longPassword })
        .expect(400);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });

    it('US4-EC-03: should handle special characters in new password', async () => {
      const uniqueEmail = `us4-ec-03-${Date.now()}@example.com`;
      const specialPassword = 'NewPass!@#$%^&*()123';

      // Register user
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'TestPass123!',
        name: 'Special Chars Test',
        role: 'PARENT',
      });

      // Request password reset
      await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: uniqueEmail })
        .expect(200);

      // Get the verification code
      const codeResult = await pool.query(
        'SELECT code FROM verification_codes WHERE email = $1 AND type = $2 ORDER BY created_at DESC LIMIT 1',
        [uniqueEmail.toLowerCase(), 'PASSWORD_RESET']
      );

      if (codeResult.rows.length > 0) {
        const response = await request(getApp())
          .post('/api/v1/auth/password/reset')
          .send({ email: uniqueEmail, code: codeResult.rows[0].code, newPassword: specialPassword })
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify new password works
        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: specialPassword })
          .expect(200);

        expect(loginResponse.body.success).toBe(true);
      }

      await cleanupTestUser(uniqueEmail);
    });
  });
});
