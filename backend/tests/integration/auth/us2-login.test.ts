/**
 * US2: User Login
 *
 * User Story:
 * As a registered user
 * I want to login with email and password
 * So that I can access my account
 *
 * Test Type: Integration Test (PostgreSQL)
 * Path: tests/integration/auth/us2-login.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp, getTestPool } from '../setup.integration';
import { createTestUser, cleanupTestUser } from '../fixtures/test-users.postgres';
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';

describe('US2: User Login (PostgreSQL)', () => {
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
    it('US2-HP-01: should login successfully with valid credentials', async () => {
      const uniqueEmail = `us2-hp-01-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // Register user
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Login Test User',
        role: 'PARENT',
      });

      // Login
      const response = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(uniqueEmail.toLowerCase());
      expect(response.body.data.user.name).toBe('Login Test User');

      await cleanupTestUser(uniqueEmail);
    });

    it('US2-HP-02: should get user profile after login', async () => {
      const uniqueEmail = `us2-hp-02-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // Register and login
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Profile Test User',
        role: 'TEACHER',
      });

      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      // Get user info
      const profileResponse = await request(getApp())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.user.email).toBe(uniqueEmail.toLowerCase());
      expect(profileResponse.body.data.user.name).toBe('Profile Test User');
      expect(profileResponse.body.data.user.role).toBe('TEACHER');

      await cleanupTestUser(uniqueEmail);
    });

    it('US2-HP-03: should logout successfully', async () => {
      const uniqueEmail = `us2-hp-03-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // Register and login
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Logout Test',
        role: 'PARENT',
      });

      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      // Logout
      const logoutResponse = await request(getApp())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);

      // Verify token is invalidated
      const profileResponse = await request(getApp())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .expect(401);

      expect(profileResponse.body.success).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });

    it('US2-HP-04: should refresh token successfully', async () => {
      const uniqueEmail = `us2-hp-04-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // Register and login
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Token Refresh Test',
        role: 'PARENT',
      });

      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      // Refresh token
      const refreshResponse = await request(getApp())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginResponse.body.data.refreshToken })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.token).toBeDefined();
      // New token should be different from old token
      expect(refreshResponse.body.data.token).not.toBe(loginResponse.body.data.token);

      await cleanupTestUser(uniqueEmail);
    });
  });

  // ==================== Failed Cases ====================

  describe('Failed Cases', () => {
    it('US2-FC-01: should reject wrong password', async () => {
      const uniqueEmail = `us2-fc-01-${Date.now()}@example.com`;

      // Register user
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'CorrectPass123!',
        name: 'Wrong Password Test',
        role: 'PARENT',
      });

      // Login with wrong password
      const response = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: 'WrongPass123!' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.detail).toContain('Invalid');

      await cleanupTestUser(uniqueEmail);
    });

    it('US2-FC-02: should reject non-existent user', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'AnyPass123!' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('US2-FC-03: should reject disabled user', async () => {
      const uniqueEmail = `us2-fc-03-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // Create disabled user
      await createTestUser({
        email: uniqueEmail,
        password,
        name: 'Disabled User Test',
        role: 'PARENT',
        status: 'DISABLED',
      });

      const response = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.detail).toContain('disabled');

      await cleanupTestUser(uniqueEmail);
    });

    it('US2-FC-04: should reject empty credentials', async () => {
      const response = await request(getApp()).post('/api/v1/auth/login').send({}).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('US2-FC-05: should reject invalid email format', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: 'invalid-email', password: 'AnyPass123!' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('US2-FC-06: should reject expired refresh token', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'expired-refresh-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('US2-EC-01: should handle case-insensitive email login', async () => {
      const uniqueEmail = `us2-ec-01-${Date.now()}@EXAMPLE.COM`;
      const password = 'SecurePass123!';

      // Register user
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Case Test',
        role: 'PARENT',
      });

      // Login with lowercase email
      const response = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail.toLowerCase(), password })
        .expect(200);

      expect(response.body.success).toBe(true);

      await cleanupTestUser(uniqueEmail);
    });

    it('US2-EC-02: should handle whitespace in credentials', async () => {
      const uniqueEmail = `us2-ec-02-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // Register user
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Whitespace Test',
        role: 'PARENT',
      });

      // Login with whitespace in password
      const response = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: `  ${password}  ` })
        .expect(401);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });

    it('US2-EC-03: should reject access token for refresh', async () => {
      const uniqueEmail = `us2-ec-03-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // Register and login
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Logout Token Test',
        role: 'PARENT',
      });

      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      // Try to use access token as refresh token
      const response = await request(getApp())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginResponse.body.data.token })
        .expect(401);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });

    it('US2-EC-04: should handle very long password', async () => {
      const uniqueEmail = `us2-ec-04-${Date.now()}@example.com`;
      const longPassword = 'A'.repeat(1000);

      // Register user
      const registerResponse = await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: longPassword,
        name: 'Long Password Test',
        role: 'PARENT',
      });

      // If registration succeeds, login should work
      if (registerResponse.status === 201) {
        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: longPassword })
          .expect(200);

        expect(loginResponse.body.success).toBe(true);

        await cleanupTestUser(uniqueEmail);
      }
    });
  });
});
