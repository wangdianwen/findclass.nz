/**
 * US10-History: Role Application History
 *
 * User Story:
 * As an administrator
 * I want to view application details and history
 * So that I can review applications thoroughly
 *
 * As a user
 * I want to view my role applications
 * So that I can track my application status
 *
 * Test Type: Integration Test (PostgreSQL)
 * Path: tests/integration/auth/us10-history.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp, getTestPool } from '../setup.integration';
import { cleanupTestUser } from '../fixtures/test-users.postgres';
import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { UserRole } from '@shared/types';

describe('US10-History: Role Application History (PostgreSQL)', () => {
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

  // ==================== Admin: Get Application Detail ====================

  describe('Admin: Get Application Detail', () => {
    it('US10-HIST-HP-01: admin should get application detail', async () => {
      const applicantEmail = `us10histhp01-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
      const adminEmail = `us10histhp01a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Create applicant
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: applicantEmail,
          password: 'SecurePass123!',
          name: 'Applicant User',
          role: UserRole.PARENT,
        })
        .expect(201);

      // Create admin
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
      const applyResponse = await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({ role: UserRole.TEACHER, reason: 'I want to teach' });

      expect(applyResponse.status).toBe(201);
      const applicationId = applyResponse.body.data.applicationId;

      // Admin approves
      const adminLogin = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: adminEmail, password: 'SecurePass123!' })
        .expect(200);
      const adminToken = adminLogin.body.data.token;

      await request(getApp())
        .post(`/api/v1/auth/roles/applications/${applicationId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approved: true, comment: 'Qualifications verified' })
        .expect(200);

      // Get detail after approval
      const detailResponse = await request(getApp())
        .get(`/api/v1/auth/roles/applications/${applicationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(detailResponse.body.data.status).toBe('APPROVED');
      expect(detailResponse.body.data.comment).toBe('Qualifications verified');
      expect(detailResponse.body.data.processedBy).toBeDefined();

      await cleanupTestUser(applicantEmail);
      await cleanupTestUser(adminEmail);
    });

    it('US10-HIST-FC-01: non-admin should not get application detail', async () => {
      const applicantEmail = `us10histfc01-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
      const userEmail = `us10histfc01b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Create applicant
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: applicantEmail,
          password: 'SecurePass123!',
          name: 'Applicant',
          role: UserRole.PARENT,
        })
        .expect(201);

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

      // Applicant applies
      const applicantLogin = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: applicantEmail, password: 'SecurePass123!' })
        .expect(200);
      const applicantToken = applicantLogin.body.data.token;

      const applyResponse = await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({ role: UserRole.TEACHER, reason: 'I want to teach' });

      expect(applyResponse.status).toBe(201);
      const applicationId = applyResponse.body.data.applicationId;

      // Regular user tries to get detail
      const userLogin = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: userEmail, password: 'SecurePass123!' })
        .expect(200);
      const userToken = userLogin.body.data.token;

      const response = await request(getApp())
        .get(`/api/v1/auth/roles/applications/${applicationId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(applicantEmail);
      await cleanupTestUser(userEmail);
    });

    it('US10-HIST-FC-02: unauthenticated request should be rejected', async () => {
      const response = await request(getApp())
        .get('/api/v1/auth/roles/applications/some-id')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== User: Get My Applications ====================

  describe('User: Get My Applications', () => {
    it('US10-HIST-HP-04: user should get their applications', async () => {
      const userEmail = `us10histhp04-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Create user
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: userEmail,
          password: 'SecurePass123!',
          name: 'User',
          role: UserRole.PARENT,
        })
        .expect(201);

      // Login
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: userEmail, password: 'SecurePass123!' })
        .expect(200);
      const token = loginResponse.body.data.token;

      // Apply for role
      await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: UserRole.TEACHER, reason: 'I want to teach' })
        .expect(201);

      // Get my applications
      const myAppsResponse = await request(getApp())
        .get('/api/v1/auth/roles/applications/my')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(myAppsResponse.body.success).toBe(true);
      expect(myAppsResponse.body.data.applications).toBeDefined();
      expect(myAppsResponse.body.data.applications.length).toBe(1);

      await cleanupTestUser(userEmail);
    });

    it('US10-HIST-HP-05: user should see empty list with no applications', async () => {
      const userEmail = `us10histhp05-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Create user
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: userEmail,
          password: 'SecurePass123!',
          name: 'New User',
          role: UserRole.PARENT,
        })
        .expect(201);

      // Login
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: userEmail, password: 'SecurePass123!' })
        .expect(200);
      const token = loginResponse.body.data.token;

      // Get my applications (should be empty)
      const myAppsResponse = await request(getApp())
        .get('/api/v1/auth/roles/applications/my')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(myAppsResponse.body.success).toBe(true);
      expect(myAppsResponse.body.data.applications).toEqual([]);

      await cleanupTestUser(userEmail);
    });

    it('US10-HIST-FC-03: unauthenticated request should be rejected', async () => {
      const response = await request(getApp())
        .get('/api/v1/auth/roles/applications/my')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
