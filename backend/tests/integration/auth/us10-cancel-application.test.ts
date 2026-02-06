/**
 * US10-Cancel: Cancel Role Application
 *
 * User Story:
 * As a user with a pending role application
 * I want to cancel my application
 * So that I can withdraw my request before it's processed
 *
 * Test Type: Integration Test (PostgreSQL)
 * Path: tests/integration/auth/us10-cancel-application.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp, getTestPool } from '../setup.integration';
import { cleanupTestUser } from '../fixtures/test-users.postgres';
import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { UserRole } from '@shared/types';

describe('US10-Cancel: Cancel Role Application (PostgreSQL)', () => {
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
    it('US10-CANCEL-HP-01: should cancel pending application successfully', async () => {
      const uniqueEmail = `us10cancel01-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Register as PARENT
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: 'Test User',
          role: UserRole.PARENT,
        })
        .expect(201);

      // Login
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: 'SecurePass123!' })
        .expect(200);

      const token = loginResponse.body.data.token;

      // Apply for TEACHER role
      const applyResponse = await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: UserRole.TEACHER, reason: 'Want to teach' })
        .expect(201);

      const applicationId = applyResponse.body.data.applicationId;

      // Cancel the application
      const cancelResponse = await request(getApp())
        .delete(`/api/v1/auth/roles/applications/${applicationId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(cancelResponse.body.success).toBe(true);

      // Verify application is cancelled - status should be CANCELLED
      const dbResult = await pool.query('SELECT status FROM role_applications WHERE id = $1', [
        applicationId,
      ]);
      expect(dbResult.rows[0].status).toBe('CANCELLED');

      await cleanupTestUser(uniqueEmail);
    });

    it('US10-CANCEL-HP-02: should allow re-applying after cancellation', async () => {
      const uniqueEmail = `us10cancel02-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Register as PARENT
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: 'Test User',
          role: UserRole.PARENT,
        })
        .expect(201);

      // Login
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: 'SecurePass123!' })
        .expect(200);

      const token = loginResponse.body.data.token;

      // Apply for role
      const applyResponse = await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: UserRole.TEACHER, reason: 'First application' })
        .expect(201);

      const applicationId = applyResponse.body.data.applicationId;

      // Cancel
      await request(getApp())
        .delete(`/api/v1/auth/roles/applications/${applicationId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Should be able to apply again
      const reapplyResponse = await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: UserRole.TEACHER, reason: 'Re-application' })
        .expect(201);

      expect(reapplyResponse.body.success).toBe(true);

      await cleanupTestUser(uniqueEmail);
    });
  });

  // ==================== Failed Cases ====================

  describe('Failed Cases', () => {
    it('US10-CANCEL-FC-01: should reject cancellation of non-existent application', async () => {
      const uniqueEmail = `us10cancelfc01-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Register
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: 'Test User',
          role: UserRole.PARENT,
        })
        .expect(201);

      // Login
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: 'SecurePass123!' })
        .expect(200);

      const token = loginResponse.body.data.token;

      // Try to cancel non-existent application
      const response = await request(getApp())
        .delete('/api/v1/auth/roles/applications/non-existent-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });

    it('US10-CANCEL-FC-02: should reject cancellation without authentication', async () => {
      const response = await request(getApp())
        .delete('/api/v1/auth/roles/applications/some-id')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it("US10-CANCEL-FC-03: should reject cancelling another user's application", async () => {
      const email1 = `us10cancelfc03a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
      const email2 = `us10cancelfc03b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Register user 1
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: email1,
          password: 'SecurePass123!',
          name: 'User 1',
          role: UserRole.PARENT,
        })
        .expect(201);

      // Login as user 1
      const login1 = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: email1, password: 'SecurePass123!' })
        .expect(200);

      const token1 = login1.body.data.token;

      // User 1 applies for role
      const applyResponse = await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${token1}`)
        .send({ role: UserRole.TEACHER, reason: 'User 1 application' })
        .expect(201);

      const applicationId = applyResponse.body.data.applicationId;

      // Register user 2
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: email2,
          password: 'SecurePass123!',
          name: 'User 2',
          role: UserRole.PARENT,
        })
        .expect(201);

      // Login as user 2
      const login2 = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: email2, password: 'SecurePass123!' })
        .expect(200);

      const token2 = login2.body.data.token;

      // User 2 tries to cancel user 1's application
      const response = await request(getApp())
        .delete(`/api/v1/auth/roles/applications/${applicationId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(403);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(email1);
      await cleanupTestUser(email2);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('US10-CANCEL-EC-01: should handle multiple rapid cancellations', async () => {
      const uniqueEmail = `us10cancelec01-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Register
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: 'Test User',
          role: UserRole.PARENT,
        })
        .expect(201);

      // Login
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: 'SecurePass123!' })
        .expect(200);

      const token = loginResponse.body.data.token;

      // Apply for role
      const applyResponse = await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: UserRole.TEACHER, reason: 'TestReason' })
        .expect(201);

      const applicationId = applyResponse.body.data.applicationId;

      // Cancel once (should succeed)
      await request(getApp())
        .delete(`/api/v1/auth/roles/applications/${applicationId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Try to cancel again (should fail - already cancelled)
      await request(getApp())
        .delete(`/api/v1/auth/roles/applications/${applicationId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      await cleanupTestUser(uniqueEmail);
    });
  });
});
