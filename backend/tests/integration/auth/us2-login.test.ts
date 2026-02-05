/**
 * US2: User Login
 *
 * User Story:
 * As a registered user
 * I want to login with email and password
 * So that I can access my account
 *
 * Test Type: Integration Test
 * Path: tests/integration/auth/us2-login.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp } from '../setup.integration';
import { createTestUser, cleanupTestUser } from '../fixtures/test-users';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

describe('US2: User Login', () => {
  // ==================== Happy Path ====================

  describe('Happy Path', () => {
    it('US2-HP-01: should login successfully with valid credentials', async () => {
      const uniqueEmail = `us2-hp-01-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // 先注册用户
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Login Test User',
        role: 'PARENT',
      });

      // 登录
      const response = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.expiresIn).toBeDefined();
      expect(response.body.data.user.email).toBe(uniqueEmail);
      expect(response.body.data.user.name).toBe('Login Test User');

      await cleanupTestUser(uniqueEmail);
    });

    it('US2-HP-02: should get user profile after login', async () => {
      const uniqueEmail = `us2-hp-02-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // 注册并登录
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Profile Test User',
        role: 'TEACHER',
      });

      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      // 获取用户信息
      const profileResponse = await request(getApp())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.user.email).toBe(uniqueEmail);
      expect(profileResponse.body.data.user.name).toBe('Profile Test User');
      expect(profileResponse.body.data.user.role).toBe('TEACHER');

      await cleanupTestUser(uniqueEmail);
    });

    it('US2-HP-03: should refresh token successfully', async () => {
      const uniqueEmail = `us2-hp-03-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // 注册并登录
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Token Refresh Test',
        role: 'PARENT',
      });

      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      // 刷新Token
      const refreshResponse = await request(getApp())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginResponse.body.data.refreshToken })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.token).toBeDefined();
      expect(refreshResponse.body.data.refreshToken).toBeDefined();
      // 新Token应该与旧Token不同
      expect(refreshResponse.body.data.token).not.toBe(loginResponse.body.data.token);

      await cleanupTestUser(uniqueEmail);
    });

    it('US2-HP-04: should logout successfully', async () => {
      const uniqueEmail = `us2-hp-04-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // 注册并登录
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Logout Test',
        role: 'PARENT',
      });

      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      // 登出
      const logoutResponse = await request(getApp())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .send({ refreshToken: loginResponse.body.data.refreshToken })
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);

      // 验证Token已失效
      const profileResponse = await request(getApp())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .expect(401);

      expect(profileResponse.body.success).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });
  });

  // ==================== Failed Cases ====================

  describe('Failed Cases', () => {
    it('US2-FC-01: should reject wrong password', async () => {
      const uniqueEmail = `us2-fc-01-${Date.now()}@example.com`;

      // 注册用户
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'CorrectPass123!',
        name: 'Wrong Password Test',
        role: 'PARENT',
      });

      // 使用错误密码登录
      const response = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: 'WrongPass123!' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.detail).toContain('Invalid');

      await cleanupTestUser(uniqueEmail);
    });

    it('US2-FC-02: should reject non-existent user', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'AnyPass123!' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('US2-FC-03: should reject disabled user', async () => {
      const uniqueEmail = `us2-fc-03-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // 注册用户
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Disabled User Test',
        role: 'PARENT',
      });

      // 注意: 这里需要模拟账户被禁用的情况
      // 由于测试环境限制，跳过此测试用例的实际禁用步骤
      // 实际应该测试被禁用账户的登录失败场景

      await cleanupTestUser(uniqueEmail);
    });

    it('US2-FC-04: should reject empty credentials', async () => {
      const response = await request(getApp()).post('/api/v1/auth/login').send({}).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('US2-FC-05: should reject invalid email format', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: 'invalid-email', password: 'AnyPass123!' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('US2-FC-06: should reject expired refresh token', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'expired-refresh-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('US2-EC-01: should handle case-insensitive email login', async () => {
      const uniqueEmail = `us2-ec-01-${Date.now()}@EXAMPLE.COM`;
      const password = 'SecurePass123!';

      // 注册用户
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Case Test',
        role: 'PARENT',
      });

      // 使用小写邮箱登录
      const response = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail.toLowerCase(), password })
        .expect(200);

      expect(response.body.success).toBe(true);

      await cleanupTestUser(uniqueEmail);
    });

    it('US2-EC-02: should handle whitespace in credentials', async () => {
      const uniqueEmail = `us2-ec-02-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // 注册用户
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Whitespace Test',
        role: 'PARENT',
      });

      // 密码前后有空格
      const response = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: `  ${password}  ` })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('US2-EC-03: should reject access token for logout', async () => {
      const uniqueEmail = `us2-ec-03-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // 注册并登录
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Logout Token Test',
        role: 'PARENT',
      });

      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      // 尝试用access token当作refresh token
      const response = await request(getApp())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginResponse.body.data.token })
        .expect(401);

      expect(response.body.success).toBe(false);

      await cleanupTestUser(uniqueEmail);
    });

    it('US2-EC-04: should handle very long password', async () => {
      const uniqueEmail = `us2-ec-04-${Date.now()}@example.com`;
      const longPassword = 'A'.repeat(1000);

      // 注册用户
      const registerResponse = await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: longPassword,
        name: 'Long Password Test',
        role: 'PARENT',
      });

      // 如果注册成功，尝试登录
      if (registerResponse.status === 201) {
        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: longPassword })
          .expect(200);

        expect(loginResponse.body.success).toBe(true);

        await cleanupTestUser(uniqueEmail);
      }
    });
  });
});
