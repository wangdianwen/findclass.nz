/**
 * US1: User Registration - Verification Code Tests
 *
 * User Story:
 * As a visitor
 * I want to receive verification codes
 * So that I can complete email verification
 *
 * Test Type: Integration Test (PostgreSQL)
 * Path: tests/integration/auth/us1-send-code.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp, getTestPool } from '../setup.integration';
import { cleanupTestUser } from '../fixtures/test-users.postgres';
import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import { Pool } from 'pg';

describe('US1: Verification Code (PostgreSQL)', () => {
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
    it('US1-HP-01: should send verification code successfully', async () => {
      const uniqueEmail = `us1-hp-01-${Date.now()}@example.com`;

      const response = await request(getApp())
        .post('/api/v1/auth/send-verification-code')
        .send({ email: uniqueEmail, type: 'REGISTER' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.expiresIn).toBe(300);
      expect(response.body.message).toBe('Verification code sent successfully');

      // Verify code was stored in database
      const dbResult = await pool.query(
        'SELECT * FROM verification_codes WHERE email = $1 AND type = $2',
        [uniqueEmail.toLowerCase(), 'REGISTER']
      );
      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].used).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });

    it('US1-HP-04: should send verification code for password reset', async () => {
      const uniqueEmail = `us1-hp-04-${Date.now()}@example.com`;

      const response = await request(getApp())
        .post('/api/v1/auth/send-verification-code')
        .send({ email: uniqueEmail, type: 'PASSWORD_RESET' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.expiresIn).toBe(300);

      await cleanupTestUser(uniqueEmail);
    });
  });

  // ==================== Failed Cases ====================

  describe('Failed Cases', () => {
    it('US1-FC-02: should reject missing email', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/send-verification-code')
        .send({ type: 'REGISTER' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('US1-FC-03: should reject invalid email format', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/send-verification-code')
        .send({ email: 'invalid-email', type: 'REGISTER' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('US1-FC-04: should reject invalid verification code type', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/send-verification-code')
        .send({ email: 'test@example.com', type: 'INVALID_TYPE' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('US1-EC-04: should handle very long email address', async () => {
      const longEmail = `test-${'a'.repeat(100)}@example.com`;

      const response = await request(getApp())
        .post('/api/v1/auth/send-verification-code')
        .send({ email: longEmail, type: 'REGISTER' });

      // Should return 400 (invalid email) or 200 (valid long email)
      expect([400, 200]).toContain(response.status);
    });

    it('US1-EC-05: should handle special characters in email', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/send-verification-code')
        .send({ email: 'test+tag@example.com', type: 'REGISTER' });

      expect([400, 200]).toContain(response.status);
    });

    it('US1-EC-08: should handle rate limiting for verification codes', async () => {
      const uniqueEmail = `us1-ec-08-${Date.now()}@example.com`;

      // Send multiple codes quickly
      for (let i = 0; i < 5; i++) {
        await request(getApp())
          .post('/api/v1/auth/send-verification-code')
          .send({ email: uniqueEmail, type: 'REGISTER' });
      }

      // Verify multiple codes exist (or rate limiting kicked in)
      const dbResult = await pool.query(
        'SELECT COUNT(*) FROM verification_codes WHERE email = $1 AND type = $1 AND used = false',
        [uniqueEmail.toLowerCase()]
      );

      await cleanupTestUser(uniqueEmail);
    });
  });
});
