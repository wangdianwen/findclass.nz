/**
 * US4: Role Application
 *
 * User Story:
 * As a customer
 * I want to apply to become a teacher
 * So that I can publish my own courses
 *
 * Test Type: Integration Test
 * Path: tests/integration/users/us4-role-application.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp } from '../setup.integration';
import { cleanupTestUser } from '../fixtures/test-users';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

describe('US4: Role Application', () => {
  let customerEmail: string;
  let authToken: string;

  beforeAll(async () => {
    // Register customer user first
    customerEmail = `us4-customer-${Date.now()}@example.com`;
    const password = 'SecurePass123!';

    // Register
    await request(getApp()).post('/api/v1/auth/register').send({
      email: customerEmail,
      password,
      name: 'Customer User',
      role: 'STUDENT',
    });

    // Login to get token
    const loginResponse = await request(getApp())
      .post('/api/v1/auth/login')
      .send({ email: customerEmail, password });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    await cleanupTestUser(customerEmail);
  });

  // ==================== Happy Path ====================

  describe('Happy Path', () => {
    it.todo('US4-HP-01: should submit teacher application'); // Not yet implemented
    it.todo('US4-HP-02: should get application status'); // Route not implemented
    it.todo('US4-HP-03: should get application detail');
    it.todo('US4-HP-04: should supplement application materials');
    it.todo('US4-HP-05: should deactivate course as teacher');
    it.todo('US4-HP-06: should activate course as teacher');
  });

  // ==================== Failed Cases ====================

  describe('Failed Cases', () => {
    it.todo('US4-FC-01: should reject duplicate application');
    it.todo('US4-FC-02: should reject application from existing teacher');
    it.todo('US4-FC-03: should reject viewing other user application');
    it.todo('US4-FC-04: should reject course management from non-teacher');
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it.todo('US4-EC-01: should handle concurrent applications');
    it.todo('US4-EC-02: should handle application timeout');
  });
});
