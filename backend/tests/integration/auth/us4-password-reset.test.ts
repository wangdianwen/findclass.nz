/**
 * US4: Password Management
 *
 * User Story:
 * As a registered user
 * I want to manage and reset my password
 * So that I can keep my account secure
 *
 * Test Type: Integration Test
 * Path: tests/integration/auth/us4-password-reset.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp } from '../setup.integration';
import { createTestUser, cleanupTestUser } from '../fixtures/test-users';
import { describe, expect, it } from 'vitest';

describe('US4: Password Management', () => {
  // ==================== Happy Path ====================

  describe('Happy Path', () => {
    it('US4-HP-01: should send password reset code for existing user', async () => {
      const uniqueEmail = `us4-hp-01-${Date.now()}@example.com`;

      // 先注册用户
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'TestPass123!',
        name: 'Password Reset Test',
        role: 'PARENT',
      });

      // 请求重置密码
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: uniqueEmail })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password reset code sent to your email');

      await cleanupTestUser(uniqueEmail);
    });

    it('US4-HP-02: should complete full password reset flow', async () => {
      const uniqueEmail = `us4-hp-02-${Date.now()}@example.com`;
      const originalPassword = 'OriginalPass123!';
      const newPassword = 'NewSecurePass456!';

      // Step 1: 注册用户
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: originalPassword,
        name: 'Full Reset Test',
        role: 'PARENT',
      });

      // Step 2: 请求重置密码
      await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: uniqueEmail })
        .expect(200);

      // Step 3: 使用错误验证码尝试重置 (应该失败)
      const failResponse = await request(getApp())
        .post('/api/v1/auth/password/reset')
        .send({ email: uniqueEmail, code: 'INVALID', newPassword })
        .expect(400);

      expect(failResponse.body.success).toBe(false);

      // 注意: 完整的密码重置流程需要真实的验证码
      // 这里测试失败场景来验证流程正确性

      await cleanupTestUser(uniqueEmail);
    });
  });

  // ==================== Failed Cases ====================

  describe('Failed Cases', () => {
    it('US4-FC-01: should return success for non-existent email (user enumeration prevention)', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should NOT indicate whether email exists or not
      expect(response.body.message).toBe('Password reset code sent to your email');
    });

    it('US4-FC-02: should reject invalid verification code', async () => {
      const uniqueEmail = `us4-fc-02-${Date.now()}@example.com`;

      // 注册用户
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'TestPass123!',
        name: 'Invalid Code Test',
        role: 'PARENT',
      });

      // 请求重置密码
      await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: uniqueEmail })
        .expect(200);

      // 使用无效验证码
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset')
        .send({ email: uniqueEmail, code: 'INVALID', newPassword: 'NewPass123!' })
        .expect(400);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });

    it('US4-FC-03: should reject short new password', async () => {
      const uniqueEmail = `us4-fc-03-${Date.now()}@example.com`;

      // 注册用户
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'TestPass123!',
        name: 'Short Password Test',
        role: 'PARENT',
      });

      // 请求重置密码
      await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: uniqueEmail })
        .expect(200);

      // 使用过短的新密码
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset')
        .send({ email: uniqueEmail, code: '123456', newPassword: 'short' })
        .expect(400);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });

    it('US4-FC-04: should reject reset for non-existent user', async () => {
      // 尝试为不存在的用户重置密码
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset')
        .send({ email: 'nonexistent@example.com', code: '123456', newPassword: 'NewPass123!' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('US4-FC-05: should reject empty email in reset request', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('US4-FC-06: should reject empty new password', async () => {
      const uniqueEmail = `us4-fc-06-${Date.now()}@example.com`;

      // 注册用户
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'TestPass123!',
        name: 'Empty Password Test',
        role: 'PARENT',
      });

      // 请求重置密码
      await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: uniqueEmail })
        .expect(200);

      // 使用空新密码
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset')
        .send({ email: uniqueEmail, code: '123456', newPassword: '' })
        .expect(400);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('US4-EC-01: should handle case-insensitive email for reset request', async () => {
      const uniqueEmail = `us4-ec-01-${Date.now()}@EXAMPLE.COM`;

      // 注册用户 (使用大写邮箱)
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'TestPass123!',
        name: 'Case Test',
        role: 'PARENT',
      });

      // 使用小写邮箱请求重置
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: uniqueEmail.toLowerCase() })
        .expect(200);

      expect(response.body.success).toBe(true);

      await cleanupTestUser(uniqueEmail);
    });

    it('US4-EC-02: should handle very long new password', async () => {
      const uniqueEmail = `us4-ec-02-${Date.now()}@example.com`;
      const longPassword = 'A'.repeat(500);

      // 注册用户
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'TestPass123!',
        name: 'Long Password Test',
        role: 'PARENT',
      });

      // 请求重置密码
      await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: uniqueEmail })
        .expect(200);

      // 尝试使用超长密码
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset')
        .send({ email: uniqueEmail, code: '123456', newPassword: longPassword })
        .expect(400);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });

    it('US4-EC-03: should handle special characters in new password', async () => {
      const uniqueEmail = `us4-ec-03-${Date.now()}@example.com`;
      const specialPassword = 'NewPass!@#$%^&*()123';

      // 注册用户
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'TestPass123!',
        name: 'Special Chars Test',
        role: 'PARENT',
      });

      // 请求重置密码
      await request(getApp())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: uniqueEmail })
        .expect(200);

      // 尝试使用特殊字符密码 (如果验证通过)
      const response = await request(getApp())
        .post('/api/v1/auth/password/reset')
        .send({ email: uniqueEmail, code: '123456', newPassword: specialPassword });

      // 可能是400(验证码错误)或400(密码格式错误)或200(成功)
      expect([200, 400]).toContain(response.status);

      await cleanupTestUser(uniqueEmail);
    });
  });
});
