/**
 * US11: RBAC Permission Control
 *
 * User Story:
 * As a platform user
 * I want to have permissions based on my role
 * So that I can access role-appropriate features
 *
 * Test Type: Integration Test (PostgreSQL)
 * Path: tests/integration/auth/us11-rbac.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp, getTestPool } from '../setup.integration';
import { cleanupTestUser } from '../fixtures/test-users.postgres';
import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { UserRole } from '@shared/types';

describe('US11: RBAC Permission Control (PostgreSQL)', () => {
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
    it('US11-HP-01: PARENT can access auth endpoints', async () => {
      const uniqueEmail = `us11hp01-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Register as PARENT
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: 'Test Parent',
          role: UserRole.PARENT,
        })
        .expect(201);

      // Login
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: 'SecurePass123!' })
        .expect(200);

      const token = loginResponse.body.data.token;

      // PARENT can access /auth/roles endpoint
      const response = await request(getApp())
        .get('/api/v1/auth/roles')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      await cleanupTestUser(uniqueEmail);
    });

    it('US11-HP-02: TEACHER can access auth endpoints', async () => {
      const uniqueEmail = `us11hp02-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Register as TEACHER
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: 'Test Teacher',
          role: UserRole.TEACHER,
        })
        .expect(201);

      // Login
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: 'SecurePass123!' })
        .expect(200);

      const token = loginResponse.body.data.token;

      // TEACHER can access auth endpoints
      const response = await request(getApp())
        .get('/api/v1/auth/roles')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      await cleanupTestUser(uniqueEmail);
    });

    it('US11-HP-03: ADMIN can access role approval endpoint', async () => {
      const uniqueEmail = `us11hp03-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Register as ADMIN
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: 'Test Admin',
          role: UserRole.ADMIN,
        })
        .expect(201);

      // Login
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: 'SecurePass123!' })
        .expect(200);

      const token = loginResponse.body.data.token;

      // ADMIN can access role approval endpoint
      // The request should be authorized (not 401/403), may return error for non-existent app
      const response = await request(getApp())
        .post('/api/v1/auth/roles/applications/non-existent-id/approve')
        .set('Authorization', `Bearer ${token}`)
        .send({ approved: true });

      // Admin should be able to access the endpoint (not 401/403)
      expect([401, 403]).not.toContain(response.status);

      await cleanupTestUser(uniqueEmail);
    });
  });

  // ==================== Failed Cases ====================

  describe('Failed Cases', () => {
    it('US11-FC-01: UNAUTHENTICATED user cannot access protected routes', async () => {
      // Try to access protected endpoint without token
      const response = await request(getApp()).get('/api/v1/auth/roles').expect(401);

      expect(response.body.success).toBe(false);

      await cleanupTestUser('');
    });

    it('US11-FC-02: STUDENT cannot approve role applications', async () => {
      const uniqueEmail = `us11fc02-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Register as STUDENT
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: 'Test Student',
          role: UserRole.STUDENT,
        })
        .expect(201);

      // Login
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: 'SecurePass123!' })
        .expect(200);

      const token = loginResponse.body.data.token;

      // STUDENT trying to approve role application should fail
      const response = await request(getApp())
        .post('/api/v1/auth/roles/applications/test-id/approve')
        .set('Authorization', `Bearer ${token}`)
        .send({ approved: true })
        .expect(403);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });

    it('US11-FC-03: PARENT cannot approve role applications', async () => {
      const uniqueEmail = `us11fc03-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Register as PARENT
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: 'Test Parent',
          role: UserRole.PARENT,
        })
        .expect(201);

      // Login
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: 'SecurePass123!' })
        .expect(200);

      const token = loginResponse.body.data.token;

      // PARENT trying to approve role application should fail
      const response = await request(getApp())
        .post('/api/v1/auth/roles/applications/test-id/approve')
        .set('Authorization', `Bearer ${token}`)
        .send({ approved: true })
        .expect(403);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('US11-EC-01: Expired token should be rejected', async () => {
      // Use an invalid/expired token
      const response = await request(getApp())
        .get('/api/v1/auth/roles')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('US11-EC-02: Malformed authorization header', async () => {
      // Missing "Bearer" prefix
      const response = await request(getApp())
        .get('/api/v1/auth/roles')
        .set('Authorization', 'some-token-without-bearer')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('US11-EC-03: Empty authorization header', async () => {
      // This tests the middleware's handling of empty tokens
      const response = await request(getApp())
        .get('/api/v1/auth/roles')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
