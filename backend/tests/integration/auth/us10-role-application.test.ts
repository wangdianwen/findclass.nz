/**
 * US10: Role Application
 *
 * User Story:
 * As a user
 * I want to apply for a new role (TEACHER/INSTITUTION)
 * So that I can access role-specific features
 *
 * Test Type: Integration Test (PostgreSQL)
 * Path: tests/integration/auth/us10-role-application.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp, getTestPool } from '../setup.integration';
import { cleanupTestUser } from '../fixtures/test-users.postgres';
import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { UserRole } from '@shared/types';

describe('US10: Role Application (PostgreSQL)', () => {
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
    it('US10-HP-01: should apply for TEACHER role successfully', async () => {
      const uniqueEmail = `us10hp01-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

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

      // Apply for TEACHER role
      const applyResponse = await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: UserRole.TEACHER, reason: 'I want to teach mathematics' })
        .expect(201);

      expect(applyResponse.body.success).toBe(true);
      expect(applyResponse.body.data.applicationId).toBeDefined();
      expect(applyResponse.body.data.role).toBe(UserRole.TEACHER);
      expect(applyResponse.body.data.status).toBe('PENDING');

      // Verify in database
      const dbResult = await pool.query(
        'SELECT * FROM role_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [loginResponse.body.data.user.id]
      );
      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].role).toBe(UserRole.TEACHER);
      expect(dbResult.rows[0].status).toBe('PENDING');

      await cleanupTestUser(uniqueEmail);
    });

    it('US10-HP-02: should get role history after application', async () => {
      const uniqueEmail = `us10hp02-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

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
      await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: UserRole.TEACHER, reason: 'Test reason' })
        .expect(201);

      // Get roles - should show pending application
      const rolesResponse = await request(getApp())
        .get('/api/v1/auth/roles')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(rolesResponse.body.success).toBe(true);
      expect(rolesResponse.body.data.currentRole).toBe(UserRole.PARENT);
      expect(rolesResponse.body.data.pendingApplication).toBeDefined();

      await cleanupTestUser(uniqueEmail);
    });

    it('US10-HP-03: should apply for INSTITUTION role', async () => {
      const uniqueEmail = `us10hp03-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      // Register as STUDENT
      await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: 'Test Institution',
          role: UserRole.STUDENT,
        })
        .expect(201);

      // Login
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: 'SecurePass123!' })
        .expect(200);

      const token = loginResponse.body.data.token;

      // Apply for INSTITUTION role
      const applyResponse = await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: UserRole.INSTITUTION, reason: 'We are an educational institution' })
        .expect(201);

      expect(applyResponse.body.success).toBe(true);
      expect(applyResponse.body.data.role).toBe(UserRole.INSTITUTION);

      await cleanupTestUser(uniqueEmail);
    });
  });

  // ==================== Failed Cases ====================

  describe('Failed Cases', () => {
    it('US10-FC-01: should reject duplicate role application', async () => {
      const uniqueEmail = `us10fc01-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

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

      // First application should succeed
      await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: UserRole.TEACHER, reason: 'First application' })
        .expect(201);

      // Second application should fail
      const secondResponse = await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: UserRole.INSTITUTION, reason: 'Second application' })
        .expect(400);

      expect(secondResponse.body.success).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });

    it('US10-FC-02: should reject unauthorized role application', async () => {
      // Try to apply without token
      const response = await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .send({ role: UserRole.TEACHER, reason: 'No token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('US10-FC-03: should reject invalid role type', async () => {
      const uniqueEmail = `us10fc03-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

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

      // Apply with invalid role
      const response = await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'INVALID_ROLE', reason: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('US10-EC-01: should handle STUDENT applying for PARENT role', async () => {
      const uniqueEmail = `us10ec01-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

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

      // STUDENT applies for PARENT role
      const response = await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: UserRole.PARENT, reason: 'I am a parent' })
        .expect(201);

      expect(response.body.success).toBe(true);

      await cleanupTestUser(uniqueEmail);
    });

    it('US10-EC-02: should handle empty reason', async () => {
      const uniqueEmail = `us10ec02-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

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

      // Apply without reason
      const response = await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: UserRole.TEACHER })
        .expect(201);

      expect(response.body.success).toBe(true);

      await cleanupTestUser(uniqueEmail);
    });

    it('US10-EC-03: should show current role as PARENT when applying for TEACHER', async () => {
      const uniqueEmail = `us10ec03-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

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

      // Apply for TEACHER
      await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: UserRole.TEACHER, reason: 'Teaching math' })
        .expect(201);

      // Check current role is still PARENT
      const rolesResponse = await request(getApp())
        .get('/api/v1/auth/roles')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(rolesResponse.body.data.currentRole).toBe(UserRole.PARENT);
      expect(rolesResponse.body.data.pendingApplication.role).toBe(UserRole.TEACHER);

      await cleanupTestUser(uniqueEmail);
    });
  });
});
