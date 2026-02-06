/**
 * US1: User Registration - Profile Management Tests
 *
 * User Story:
 * As a registered user
 * I want to manage my profile information
 * So that I can keep my account information up to date
 *
 * Test Type: Integration Test (PostgreSQL)
 * Path: tests/integration/auth/us1-me.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp, getTestPool } from '../setup.integration';
import { cleanupTestUser } from '../fixtures/test-users.postgres';
import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import { Pool } from 'pg';

describe('US1: Profile Management (PostgreSQL)', () => {
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
    it('US1-HP-02: should update user profile successfully', async () => {
      const uniqueEmail = `us1-me-hp-02-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // Register user
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Original Name',
        role: 'PARENT',
      });

      // Login
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      // Update profile
      const response = await request(getApp())
        .put('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe('Updated Name');

      // Verify in database
      const dbResult = await pool.query('SELECT name FROM users WHERE email = $1', [
        uniqueEmail.toLowerCase(),
      ]);
      expect(dbResult.rows[0].name).toBe('Updated Name');

      await cleanupTestUser(uniqueEmail);
    });

    it('US1-HP-04: should get user profile successfully', async () => {
      const uniqueEmail = `us1-me-hp-04-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // Register and login
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Get Profile Test',
        role: 'PARENT',
      });

      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      // Get profile
      const response = await request(getApp())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(uniqueEmail.toLowerCase());
      expect(response.body.data.user.name).toBe('Get Profile Test');

      await cleanupTestUser(uniqueEmail);
    });
  });

  // ==================== Failed Cases ====================

  describe('Failed Cases', () => {
    it('US1-FC-05: should reject unauthorized profile update', async () => {
      const response = await request(getApp())
        .put('/api/v1/auth/me')
        .send({ name: 'Hacker' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('US1-FC-06: should reject unauthorized profile access', async () => {
      const response = await request(getApp()).get('/api/v1/auth/me').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('US1-FC-07: should reject invalid token', async () => {
      const response = await request(getApp())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('US1-EC-06: should handle updating profile with special characters', async () => {
      const uniqueEmail = `us1-me-ec-06-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // Register and login
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Original Name',
        role: 'PARENT',
      });

      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      // Update with special characters
      const response = await request(getApp())
        .put('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .send({ name: '张老师_测试-2024' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe('张老师_测试-2024');

      await cleanupTestUser(uniqueEmail);
    });

    it('US1-EC-07: should handle empty profile update', async () => {
      const uniqueEmail = `us1-me-ec-07-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // Register and login
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Empty Update Test',
        role: 'PARENT',
      });

      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      // Send empty update
      const response = await request(getApp())
        .put('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);

      await cleanupTestUser(uniqueEmail);
    });

    it('US1-EC-09: should return proper user info with all fields', async () => {
      const uniqueEmail = `us1-me-ec-09-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // Register user
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Full Profile Test',
        role: 'STUDENT',
      });

      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      // Get profile
      const response = await request(getApp())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBeDefined();
      expect(response.body.data.user.email).toBe(uniqueEmail.toLowerCase());
      expect(response.body.data.user.name).toBe('Full Profile Test');
      expect(response.body.data.user.role).toBe('STUDENT');
      expect(response.body.data.user.createdAt).toBeDefined();

      await cleanupTestUser(uniqueEmail);
    });
  });
});
