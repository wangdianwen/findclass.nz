/**
 * US10-Pending: Get Pending Role Applications
 *
 * User Story:
 * As an administrator
 * I want to view all pending role applications
 * So that I can review and process them
 *
 * Test Type: Integration Test (PostgreSQL)
 * Path: tests/integration/auth/us10-pending-list.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp, getTestPool } from '../setup.integration';
import { cleanupTestUser } from '../fixtures/test-users.postgres';
import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { UserRole } from '@shared/types';

describe('US10-Pending: Get Pending Role Applications (PostgreSQL)', () => {
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
    it('US10-PENDING-HP-01: admin should get pending applications list', async () => {
      const adminEmail = `us10pendinghp01a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Create admin user
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: adminEmail,
          password: 'SecurePass123!',
          name: 'Admin User',
          role: UserRole.ADMIN,
        })
        .expect(201);

      // Login as admin
      const adminLogin = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: adminEmail, password: 'SecurePass123!' })
        .expect(200);

      const adminToken = adminLogin.body.data.token;

      // Get pending applications (should be empty initially)
      const response = await request(getApp())
        .get('/api/v1/auth/roles/applications/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.applications).toBeDefined();
      expect(Array.isArray(response.body.data.applications)).toBe(true);

      await cleanupTestUser(adminEmail);
    });

    it('US10-PENDING-HP-02: should see new applications in pending list', async () => {
      const applicantEmail = `us10pendinghp02-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
      const adminEmail = `us10pendinghp02a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Create applicant user
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: applicantEmail,
          password: 'SecurePass123!',
          name: 'Applicant User',
          role: UserRole.PARENT,
        })
        .expect(201);

      // Create admin user
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: adminEmail,
          password: 'SecurePass123!',
          name: 'Admin User',
          role: UserRole.ADMIN,
        })
        .expect(201);

      // Login as applicant
      const applicantLogin = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: applicantEmail, password: 'SecurePass123!' })
        .expect(200);

      const applicantToken = applicantLogin.body.data.token;

      // Apply for TEACHER role
      await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({ role: UserRole.TEACHER, reason: 'Experienced math teacher' })
        .expect(201);

      // Login as admin
      const adminLogin = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: adminEmail, password: 'SecurePass123!' })
        .expect(200);

      const adminToken = adminLogin.body.data.token;

      // Get pending applications - should include the new application
      const response = await request(getApp())
        .get('/api/v1/auth/roles/applications/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const applications = response.body.data.applications;
      const ourApplication = applications.find(
        (app: { userId: string; role: string }) => app.role === UserRole.TEACHER
      );
      expect(ourApplication).toBeDefined();
      expect(ourApplication.status).toBe('PENDING');

      await cleanupTestUser(applicantEmail);
      await cleanupTestUser(adminEmail);
    });
  });

  // ==================== Failed Cases ====================

  describe('Failed Cases', () => {
    it('US10-PENDING-FC-01: should reject non-admin from viewing pending list', async () => {
      const userEmail = `us10pendingfc01-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Create regular user
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: userEmail,
          password: 'SecurePass123!',
          name: 'Regular User',
          role: UserRole.PARENT,
        })
        .expect(201);

      // Login as regular user
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: userEmail, password: 'SecurePass123!' })
        .expect(200);

      const token = loginResponse.body.data.token;

      // Try to get pending applications (should fail)
      const response = await request(getApp())
        .get('/api/v1/auth/roles/applications/pending')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(userEmail);
    });

    it('US10-PENDING-FC-02: should reject unauthenticated request', async () => {
      const response = await request(getApp())
        .get('/api/v1/auth/roles/applications/pending')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('US10-PENDING-FC-03: should reject TEACHER from viewing pending list', async () => {
      const teacherEmail = `us10pendingfc03-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Create teacher user
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: teacherEmail,
          password: 'SecurePass123!',
          name: 'Teacher User',
          role: UserRole.TEACHER,
        })
        .expect(201);

      // Login as teacher
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: teacherEmail, password: 'SecurePass123!' })
        .expect(200);

      const token = loginResponse.body.data.token;

      // Try to get pending applications (should fail - not admin)
      const response = await request(getApp())
        .get('/api/v1/auth/roles/applications/pending')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(teacherEmail);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('US10-PENDING-EC-01: should handle empty pending list', async () => {
      const adminEmail = `us10pendingec01-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Create admin user
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: adminEmail,
          password: 'SecurePass123!',
          name: 'Admin User',
          role: UserRole.ADMIN,
        })
        .expect(201);

      // Login as admin
      const adminLogin = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: adminEmail, password: 'SecurePass123!' })
        .expect(200);

      const adminToken = adminLogin.body.data.token;

      // Get pending applications - should return empty array
      const response = await request(getApp())
        .get('/api/v1/auth/roles/applications/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.applications).toEqual([]);

      await cleanupTestUser(adminEmail);
    });
  });
});
