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
 * Test Type: Integration Test
 * Path: tests/integration/auth/us10-history.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp } from '../setup.integration';
import { describe, expect, it } from 'vitest';
import { UserRole } from '@shared/types';

describe('US10-History: Role Application History', () => {
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
    });

    it('US10-HIST-FC-02: unauthenticated request should be rejected', async () => {
      const response = await request(getApp())
        .get('/api/v1/auth/roles/applications/some-id')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== Admin: Get Application History ====================

  describe('Admin: Get Application History', () => {
    it('US10-HIST-HP-03: admin should get application history', async () => {
      const applicantEmail = `us10histhp03-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
      const adminEmail = `us10histhp03a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Create users
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: applicantEmail,
          password: 'SecurePass123!',
          name: 'Applicant',
          role: UserRole.PARENT,
        })
        .expect(201);

      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: adminEmail,
          password: 'SecurePass123!',
          name: 'Admin',
          role: UserRole.ADMIN,
        })
        .expect(201);

      // Apply and approve
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

      const adminLogin = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: adminEmail, password: 'SecurePass123!' })
        .expect(200);
      const adminToken = adminLogin.body.data.token;

      await request(getApp())
        .post(`/api/v1/auth/roles/applications/${applicationId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approved: true, comment: 'Approved' })
        .expect(200);

      // Get history
      const historyResponse = await request(getApp())
        .get(`/api/v1/auth/roles/applications/${applicationId}/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data.history).toBeDefined();
      expect(historyResponse.body.data.history.length).toBeGreaterThan(0);
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
    });

    it('US10-HIST-HP-06: my applications should include status and history', async () => {
      const userEmail = `us10histhp06-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
      const adminEmail = `us10histhp06a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Create users
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: userEmail,
          password: 'SecurePass123!',
          name: 'User',
          role: UserRole.PARENT,
        })
        .expect(201);

      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: adminEmail,
          password: 'SecurePass123!',
          name: 'Admin',
          role: UserRole.ADMIN,
        })
        .expect(201);

      // User applies
      const userLogin = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: userEmail, password: 'SecurePass123!' })
        .expect(200);
      const userToken = userLogin.body.data.token;

      const applyResponse = await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${userToken}`)
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
        .send({ approved: true })
        .expect(200);

      // Get my applications - should show approved status and history
      const myAppsResponse = await request(getApp())
        .get('/api/v1/auth/roles/applications/my')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(myAppsResponse.body.success).toBe(true);
      const teacherApp = myAppsResponse.body.data.applications.find(
        (app: { role: string }) => app.role === UserRole.TEACHER
      );
      expect(teacherApp).toBeDefined();
      expect(teacherApp.status).toBe('APPROVED');
      expect(teacherApp.history).toBeDefined();
      expect(teacherApp.history.length).toBeGreaterThan(0);
    });

    it('US10-HIST-FC-03: unauthenticated request should be rejected', async () => {
      const response = await request(getApp())
        .get('/api/v1/auth/roles/applications/my')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
