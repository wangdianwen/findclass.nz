/**
 * US1: User Registration - PostgreSQL Integration Test
 *
 * Tests the complete registration flow with real PostgreSQL database
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp, getTestPool } from '../setup.postgres';
import {
  createTestUser,
  cleanupTestUser,
  createTestVerificationCode,
} from '../fixtures/test-users.postgres';
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';

describe('US1: User Registration (PostgreSQL)', () => {
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
    it('US1-HP-03: should complete full registration flow', async () => {
      const uniqueEmail = `us1-hp-03-${Date.now()}@example.com`;

      // Step 1: Send verification code
      const sendCodeResponse = await request(getApp())
        .post('/api/v1/auth/send-verification-code')
        .send({ email: uniqueEmail, type: 'REGISTER' })
        .expect(200);

      expect(sendCodeResponse.body.success).toBe(true);
      expect(sendCodeResponse.body.data.expiresIn).toBe(300);
      expect(sendCodeResponse.body.message).toBe('Verification code sent successfully');

      // Step 2: Register user
      const registerResponse = await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: 'Test User',
          role: 'PARENT',
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe(uniqueEmail.toLowerCase());
      expect(registerResponse.body.data.user.name).toBe('Test User');
      expect(registerResponse.body.data.user.role).toBe('PARENT');
      expect(registerResponse.body.data.token).toBeDefined();

      // Step 3: Verify user can login
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: 'SecurePass123!' })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      expect(loginResponse.body.data.user.email).toBe(uniqueEmail.toLowerCase());

      // Step 4: Get user info
      const profileResponse = await request(getApp())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.user.email).toBe(uniqueEmail.toLowerCase());

      // Verify user exists in database
      const dbResult = await pool.query('SELECT * FROM users WHERE email = $1', [
        uniqueEmail.toLowerCase(),
      ]);
      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].name).toBe('Test User');
    });

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
    });

    it('US1-HP-02: should update user profile after registration', async () => {
      const uniqueEmail = `us1-hp-02-${Date.now()}@example.com`;

      // Register user
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'SecurePass123!',
        name: 'Original Name',
        role: 'PARENT',
      });

      // Login
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: 'SecurePass123!' })
        .expect(200);

      // Update profile
      const updateResponse = await request(getApp())
        .put('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.user.name).toBe('Updated Name');

      // Verify in database
      const dbResult = await pool.query('SELECT name FROM users WHERE email = $1', [
        uniqueEmail.toLowerCase(),
      ]);
      expect(dbResult.rows[0].name).toBe('Updated Name');
    });
  });

  // ==================== Failed Cases ====================

  describe('Failed Cases', () => {
    it('US1-FC-01: should reject duplicate email registration', async () => {
      const uniqueEmail = `us1-fc-01-${Date.now()}@example.com`;

      // First registration succeeds
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'SecurePass123!',
        name: 'First User',
        role: 'PARENT',
      });

      // Second registration fails
      const duplicateResponse = await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: 'Second User',
          role: 'PARENT',
        })
        .expect(409);

      expect(duplicateResponse.body.success).toBe(false);
      expect(duplicateResponse.body.error.detail).toContain('already registered');
    });

    it('US1-FC-02: should reject missing required fields', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          // missing password, name, role
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('US1-FC-03: should reject invalid email format', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'SecurePass123!',
          name: 'Test User',
          role: 'PARENT',
        })
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

    it('US1-FC-05: should reject unauthorized profile update', async () => {
      const response = await request(getApp())
        .put('/api/v1/auth/me')
        .send({ name: 'Hacker' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('US1-FC-06: should reject weak password', async () => {
      const uniqueEmail = `us1-fc-06-${Date.now()}@example.com`;

      const response = await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: '123',
          name: 'Test User',
          role: 'PARENT',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('US1-EC-01: should handle email case insensitivity', async () => {
      const uniqueEmail = `us1-ec-01-${Date.now()}@EXAMPLE.COM`;

      const response = await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: 'Case Test',
          role: 'PARENT',
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Login with lowercase email
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail.toLowerCase(), password: 'SecurePass123!' })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);

      // Verify in database
      const dbResult = await pool.query('SELECT email FROM users WHERE email = $1', [
        uniqueEmail.toLowerCase(),
      ]);
      expect(dbResult.rows[0].email).toBe(uniqueEmail.toLowerCase());
    });

    it('US1-EC-02: should handle special characters in name', async () => {
      const uniqueEmail = `us1-ec-02-${Date.now()}@example.com`;

      const response = await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: '张老师-Test_2024',
          role: 'PARENT',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe('张老师-Test_2024');
    });

    it('US1-EC-03: should handle concurrent registration with same email', async () => {
      const uniqueEmail = `us1-ec-03-${Date.now()}@example.com`;

      // Concurrent registrations
      const promises = Array(3)
        .fill(null)
        .map(() =>
          request(getApp()).post('/api/v1/auth/register').send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'User',
            role: 'PARENT',
          })
        );

      const results = await Promise.all(promises);

      // Only one succeeds (201), others fail (409)
      const successCount = results.filter(r => r.status === 201).length;
      const conflictCount = results.filter(r => r.status === 409).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(2);

      // Verify only one user in database
      const dbResult = await pool.query('SELECT COUNT(*) FROM users WHERE email = $1', [
        uniqueEmail.toLowerCase(),
      ]);
      expect(parseInt(dbResult.rows[0].count)).toBe(1);
    });
  });
});

describe('US2: User Login (PostgreSQL)', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = getTestPool();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM role_application_history');
    await pool.query('DELETE FROM role_applications');
    await pool.query('DELETE FROM sessions');
    await pool.query('DELETE FROM verification_codes');
    await pool.query('DELETE FROM users');
  });

  describe('Happy Path', () => {
    it('US2-HP-01: should login successfully with correct credentials', async () => {
      const testUser = await createTestUser({
        email: 'login-test@example.com',
        password: 'SecurePass123!',
        name: 'Login Test User',
        role: 'PARENT',
      });

      const response = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(response.body.data.user.name).toBe(testUser.name);
    });

    it('US2-HP-02: should return user profile after login', async () => {
      const testUser = await createTestUser({
        email: 'profile-test@example.com',
        password: 'SecurePass123!',
        name: 'Profile Test',
        role: 'STUDENT',
      });

      const response = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.id).toBeDefined();
      expect(response.body.data.user.role).toBe('STUDENT');
    });
  });

  describe('Failed Cases', () => {
    it('US2-FC-01: should reject invalid password', async () => {
      await createTestUser({
        email: 'wrong-pass@example.com',
        password: 'CorrectPass123!',
      });

      const response = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: 'wrong-pass@example.com', password: 'WrongPassword123!' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.detail).toContain('Invalid email or password');
    });

    it('US2-FC-02: should reject non-existent user', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'SecurePass123!' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('US2-FC-03: should reject disabled account', async () => {
      await createTestUser({
        email: 'disabled@example.com',
        password: 'SecurePass123!',
        status: 'DISABLED',
      });

      const response = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: 'disabled@example.com', password: 'SecurePass123!' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.detail).toContain('disabled');
    });
  });
});
