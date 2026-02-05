/**
 * US1: User Registration - Verification Code Tests
 *
 * User Story:
 * As a visitor
 * I want to receive verification codes
 * So that I can complete email verification
 *
 * Test Type: Integration Test
 * Path: tests/integration/auth/us1-send-code.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp } from '../setup.integration';
import { describe, expect, it } from 'vitest';

describe('US1: Verification Code', () => {
  // ==================== Happy Path ====================

  describe('Happy Path', () => {
    it('US1-HP-01: should send verification code successfully', async () => {
      const uniqueEmail = `us1-hp-01-${Date.now()}@example.com`;

      const response = await request(getApp())
        .post('/api/v1/auth/send-verification-code')
        .send({ email: uniqueEmail, type: 'REGISTER' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.expiresIn).toBe(300);
      expect(response.body.message).toBe('Verification code sent successfully');
    });
  });

  // ==================== Failed Cases ====================

  describe('Failed Cases', () => {
    it('US1-FC-02: should reject missing email', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/send-verification-code')
        .send({ type: 'REGISTER' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('US1-FC-03: should reject invalid email format', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/send-verification-code')
        .send({ email: 'invalid-email', type: 'REGISTER' })
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
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('US1-EC-04: should handle very long email address', async () => {
      const longEmail = `test-${'a'.repeat(100)}@example.com`;

      const response = await request(getApp())
        .post('/api/v1/auth/send-verification-code')
        .send({ email: longEmail, type: 'REGISTER' });

      // 应该返回400 (无效邮箱) 或200 (有效长邮箱)
      expect([400, 200]).toContain(response.status);
    });

    it('US1-EC-05: should handle special characters in email', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/send-verification-code')
        .send({ email: 'test+tag@example.com', type: 'REGISTER' });

      expect([400, 200]).toContain(response.status);
    });
  });
});
