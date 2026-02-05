/**
 * US1: User Registration - Profile Management Tests
 *
 * User Story:
 * As a registered user
 * I want to manage my profile information
 * So that I can keep my account information up to date
 *
 * Test Type: Integration Test
 * Path: tests/integration/auth/us1-me.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp } from '../setup.integration';
import { createTestUser, cleanupTestUser } from '../fixtures/test-users';
import { describe, expect, it } from 'vitest';

describe('US1: Profile Management', () => {
  // ==================== Happy Path ====================

  describe('Happy Path', () => {
    it('US1-HP-02: should update user profile successfully', async () => {
      const uniqueEmail = `us1-me-hp-02-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // 注册用户
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Original Name',
        role: 'PARENT',
      });

      // 登录
      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      // 更新个人信息
      const response = await request(getApp())
        .put('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe('Updated Name');

      await cleanupTestUser(uniqueEmail);
    });

    it('US1-HP-04: should get user profile successfully', async () => {
      const uniqueEmail = `us1-me-hp-04-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // 注册并登录
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Get Profile Test',
        role: 'PARENT',
      });

      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      // 获取个人信息
      const response = await request(getApp())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(uniqueEmail);
      expect(response.body.data.user.name).toBe('Get Profile Test');

      await cleanupTestUser(uniqueEmail);
    });
  });

  // ==================== Failed Cases ====================

  describe('Failed Cases', () => {
    it('US1-FC-05: should reject unauthorized profile update', async () => {
      const response = await request(getApp())
        .put('/api/v1/auth/me')
        .send({ name: 'Hacker' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('US1-FC-06: should reject unauthorized profile access', async () => {
      const response = await request(getApp()).get('/api/v1/auth/me').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('US1-FC-07: should reject invalid token', async () => {
      const response = await request(getApp())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('US1-EC-06: should handle updating profile with special characters', async () => {
      const uniqueEmail = `us1-me-ec-06-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // 注册并登录
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Original Name',
        role: 'PARENT',
      });

      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      // 更新为包含特殊字符的名称
      const response = await request(getApp())
        .put('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .send({ name: '张老师_测试-2024' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe('张老师_测试-2024');

      await cleanupTestUser(uniqueEmail);
    });

    it('US1-EC-07: should handle empty profile update', async () => {
      const uniqueEmail = `us1-me-ec-07-${Date.now()}@example.com`;
      const password = 'SecurePass123!';

      // 注册并登录
      await request(getApp()).post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password,
        name: 'Empty Update Test',
        role: 'PARENT',
      });

      const loginResponse = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail, password })
        .expect(200);

      // 发送空更新
      const response = await request(getApp())
        .put('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);

      await cleanupTestUser(uniqueEmail);
    });
  });
});
