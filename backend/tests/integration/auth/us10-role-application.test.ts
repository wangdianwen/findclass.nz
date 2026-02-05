/**
 * US10: Role Application
 *
 * User Story:
 * As a user
 * I want to apply for a new role (TEACHER/INSTITUTION)
 * So that I can access role-specific features
 *
 * Test Type: Integration Test
 * Path: tests/integration/auth/us10-role-application.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp } from '../setup.integration';
import { describe, expect, it } from 'vitest';
import { UserRole } from '@shared/types';

describe('US10: Role Application', () => {
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
    });

    it('US10-FC-02: should reject unauthorized role application', async () => {
      // Try to apply without token
      const response = await request(getApp())
        .post('/api/v1/auth/roles/apply')
        .send({ role: UserRole.TEACHER, reason: 'No token' })
        .expect(401);

      expect(response.body.success).toBe(false);
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
    });
  });
});
