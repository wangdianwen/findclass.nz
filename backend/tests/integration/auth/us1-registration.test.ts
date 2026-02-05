/**
 * US1: User Registration
 *
 * User Story:
 * As a visitor
 * I want to register an account with email
 * So that I can start using the platform services
 *
 * Test Type: Integration Test
 * Path: tests/integration/auth/us1-registration.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp } from '../setup.integration';
import { createTestUser, cleanupTestUser } from '../fixtures/test-users';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

describe('US1: User Registration', () => {
  const testEmail = 'us1-test@example.com';

  afterAll(async () => {
    // Clean up test user
    await cleanupTestUser(testEmail);
  });

  // ==================== Happy Path ====================

  describe('Happy Path', () => {
    it('US1-HP-03: should complete full registration flow', async () => {
      const uniqueEmail = `us1-hp-03-${Date.now()}@example.com`;

      // Step 1: 发送验证码
      const sendCodeResponse = await request(getApp())
        .post('/api/v1/auth/send-verification-code')
        .send({ email: uniqueEmail, type: 'REGISTER' })
        .expect(200);

      expect(sendCodeResponse.body.success).toBe(true);
      expect(sendCodeResponse.body.data.expiresIn).toBe(300);

      // Step 2: 注册用户 (简化: 跳过验证码验证直接注册)
      const registerResponse = await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: 'Test User',
          role: 'PARENT',
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe(uniqueEmail);
      expect(registerResponse.body.data.user.name).toBe('Test User');
      expect(registerResponse.body.data.user.role).toBe('PARENT');
      expect(registerResponse.body.data.token).toBeDefined();

      // Step 3: 验证用户可以登录
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: 'SecurePass123!' })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      expect(loginResponse.body.data.user.email).toBe(uniqueEmail);

      // Step 4: 获取用户信息
      const profileResponse = await request(getApp())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.user.email).toBe(uniqueEmail);

      // 清理
      await cleanupTestUser(uniqueEmail);
    });

    it('US1-HP-01: should send verification code successfully', async () => {
      const uniqueEmail = `us1-hp-01-${Date.now()}@example.com`;

      const response = await request(getApp())
        .post('/api/v1/auth/send-verification-code')
        .send({ email: uniqueEmail, type: 'REGISTER' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.expiresIn).toBe(300);
      expect(response.body.message).toBe('Verification code sent successfully');

      await cleanupTestUser(uniqueEmail);
    });

    it('US1-HP-02: should update user profile after registration', async () => {
      const uniqueEmail = `us1-hp-02-${Date.now()}@example.com`;

      // 注册用户
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'SecurePass123!',
        name: 'Original Name',
        role: 'PARENT',
      });

      // 登录
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password: 'SecurePass123!' })
        .expect(200);

      // 更新个人信息
      const updateResponse = await request(getApp())
        .put('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.user.name).toBe('Updated Name');

      await cleanupTestUser(uniqueEmail);
    });
  });

  // ==================== Failed Cases ====================

  describe('Failed Cases', () => {
    it('US1-FC-01: should reject duplicate email registration', async () => {
      const uniqueEmail = `us1-fc-01-${Date.now()}@example.com`;

      // 第一次注册成功
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'SecurePass123!',
        name: 'First User',
        role: 'PARENT',
      });

      // 第二次注册失败
      const duplicateResponse = await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: 'Second User',
          role: 'PARENT',
        })
        .expect(409);

      expect(duplicateResponse.body.success).toBe(false);
      expect(duplicateResponse.body.error.detail).toContain('already registered');

      await cleanupTestUser(uniqueEmail);
    });

    it('US1-FC-02: should reject missing required fields', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          // 缺少 password, name, role
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('US1-FC-03: should reject invalid email format', async () => {
      const response = await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'SecurePass123!',
          name: 'Test User',
          role: 'PARENT',
        })
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

    it('US1-FC-05: should reject unauthorized profile update', async () => {
      const response = await request(getApp())
        .put('/api/v1/auth/me')
        .send({ name: 'Hacker' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('US1-FC-06: should reject weak password', async () => {
      const uniqueEmail = `us1-fc-06-${Date.now()}@example.com`;

      const response = await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: '123',
          name: 'Test User',
          role: 'PARENT',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('US1-EC-01: should handle email case insensitivity', async () => {
      const uniqueEmail = `us1-ec-01-${Date.now()}@EXAMPLE.COM`;

      const response = await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: 'Case Test',
          role: 'PARENT',
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      // 尝试用小写邮箱登录
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail.toLowerCase(), password: 'SecurePass123!' })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);

      await cleanupTestUser(uniqueEmail);
    });

    it('US1-EC-02: should handle special characters in name', async () => {
      const uniqueEmail = `us1-ec-02-${Date.now()}@example.com`;

      const response = await request(getApp())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: '张老师-Test_2024',
          role: 'PARENT',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe('张老师-Test_2024');

      await cleanupTestUser(uniqueEmail);
    });

    it('US1-EC-03: should handle concurrent registration with same email', async () => {
      const uniqueEmail = `us1-ec-03-${Date.now()}@example.com`;

      // 并发注册
      const promises = Array(3)
        .fill(null)
        .map(() =>
          request(getApp()).post('/api/v1/auth/register').send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'User',
            role: 'PARENT',
          })
        );

      const results = await Promise.all(promises);

      // 只有一个成功(201)，其他失败(409)
      const successCount = results.filter(r => r.status === 201).length;
      const conflictCount = results.filter(r => r.status === 409).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(2);

      await cleanupTestUser(uniqueEmail);
    });
  });
});
