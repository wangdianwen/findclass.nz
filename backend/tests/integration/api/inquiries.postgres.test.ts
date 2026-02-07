/**
 * Inquiries API Integration Tests
 *
 * Tests for inquiries and reports API endpoints
 * Path: tests/integration/api/inquiries.api.test.ts
 *
 * Test Coverage:
 * - POST /api/v1/inquiries - Create inquiry (authenticated/guest)
 * - GET /api/v1/inquiries/:id - Get inquiry by ID
 * - POST /api/v1/inquiries/:id/reply - Reply to inquiry (admin)
 * - PATCH /api/v1/inquiries/:id/status - Update inquiry status (admin)
 * - POST /api/v1/reports - Create report (authenticated/guest)
 * - GET /api/v1/reports/:id - Get report by ID
 * - PATCH /api/v1/reports/:id/status - Update report status (admin)
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp, getTestPool } from '../setup.postgres';
import { createTestUser, cleanupTestUser } from '../fixtures/test-users.postgres';
import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { UserRole } from '@shared/types';

describe('Inquiries API Integration Tests (PostgreSQL)', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = getTestPool();
  });

  beforeEach(async () => {
    // Clean up before each test - handle missing tables gracefully
    const tables = [
      'inquiries',
      'reports',
      'role_application_history',
      'role_applications',
      'sessions',
      'verification_codes',
      'users',
    ];

    for (const table of tables) {
      try {
        await pool.query(`DELETE FROM ${table}`);
      } catch {
        // Table doesn't exist, skip
      }
    }
  });

  // ==================== POST /api/v1/inquiries ====================

  describe('POST /api/v1/inquiries - Create Inquiry', () => {
    describe('Happy Path', () => {
      it('should create inquiry as authenticated user', async () => {
        const uniqueEmail = `inquiry-auth-${Date.now()}@example.com`;

        // Register and login user
        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Test User',
            role: UserRole.PARENT,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        // Create inquiry
        const response = await request(getApp())
          .post('/api/v1/inquiries')
          .set('Authorization', `Bearer ${token}`)
          .send({
            targetType: 'course',
            targetId: 'course-123',
            subject: 'Course Information',
            message: 'I would like to know more about this course.',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.inquiryId).toBeDefined();
        expect(response.body.message).toBe('Inquiry sent successfully');

        // Verify in database
        const dbResult = await pool.query('SELECT * FROM inquiries WHERE id = $1', [
          response.body.data.inquiryId,
        ]);
        expect(dbResult.rows.length).toBe(1);
        expect(dbResult.rows[0].user_id).toBeDefined();
        expect(dbResult.rows[0].target_type).toBe('course');
        expect(dbResult.rows[0].target_id).toBe('course-123');
        expect(dbResult.rows[0].status).toBe('PENDING');

        await cleanupTestUser(uniqueEmail);
      });

      it('should create inquiry as guest (without authentication)', async () => {
        const response = await request(getApp())
          .post('/api/v1/inquiries')
          .send({
            targetType: 'teacher',
            targetId: 'teacher-456',
            subject: 'Teacher Question',
            message: 'What are the qualifications for this teacher?',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.inquiryId).toBeDefined();

        // Verify in database
        const dbResult = await pool.query('SELECT * FROM inquiries WHERE id = $1', [
          response.body.data.inquiryId,
        ]);
        expect(dbResult.rows.length).toBe(1);
        expect(dbResult.rows[0].user_id).toBeNull();
        expect(dbResult.rows[0].target_type).toBe('teacher');
      });

      it('should create general inquiry without targetId', async () => {
        const uniqueEmail = `inquiry-general-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Test User',
            role: UserRole.STUDENT,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const response = await request(getApp())
          .post('/api/v1/inquiries')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            targetType: 'general',
            message: 'I have a general question about the platform.',
          })
          .expect(201);

        expect(response.body.success).toBe(true);

        const dbResult = await pool.query('SELECT * FROM inquiries WHERE id = $1', [
          response.body.data.inquiryId,
        ]);
        expect(dbResult.rows[0].target_type).toBe('general');
        expect(dbResult.rows[0].target_id).toBeNull();

        await cleanupTestUser(uniqueEmail);
      });

      it('should trim message whitespace', async () => {
        const response = await request(getApp())
          .post('/api/v1/inquiries')
          .send({
            targetType: 'general',
            message: '   This is a test message with extra spaces   ',
          })
          .expect(201);

        expect(response.body.success).toBe(true);

        const dbResult = await pool.query('SELECT message FROM inquiries WHERE id = $1', [
          response.body.data.inquiryId,
        ]);
        expect(dbResult.rows[0].message).toBe('This is a test message with extra spaces');
      });
    });

    describe('Validation Errors', () => {
      it('should reject inquiry without targetType', async () => {
        const response = await request(getApp())
          .post('/api/v1/inquiries')
          .send({
            message: 'Test message',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Target type is required');
      });

      it('should reject inquiry with invalid targetType', async () => {
        const uniqueEmail = `inquiry-invalid-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Test User',
            role: UserRole.STUDENT,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const response = await request(getApp())
          .post('/api/v1/inquiries')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            targetType: 'invalid_type',
            message: 'Test message',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Invalid target type');

        await cleanupTestUser(uniqueEmail);
      });

      it('should reject inquiry without message', async () => {
        const response = await request(getApp())
          .post('/api/v1/inquiries')
          .send({
            targetType: 'course',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Message is required');
      });

      it('should reject inquiry with empty message', async () => {
        const response = await request(getApp())
          .post('/api/v1/inquiries')
          .send({
            targetType: 'course',
            message: '   ',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Message is required');
      });

      it('should reject inquiry with message exceeding 5000 characters', async () => {
        const longMessage = 'A'.repeat(5001);

        const uniqueEmail = `inquiry-long-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Test User',
            role: UserRole.STUDENT,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const response = await request(getApp())
          .post('/api/v1/inquiries')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            targetType: 'general',
            message: longMessage,
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('less than 5000 characters');

        await cleanupTestUser(uniqueEmail);
      });
    });

    describe('Rate Limiting', () => {
      it('should prevent duplicate inquiry for same target within 24 hours', async () => {
        const uniqueEmail = `inquiry-dup-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Test User',
            role: UserRole.PARENT,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        // First inquiry
        await request(getApp())
          .post('/api/v1/inquiries')
          .set('Authorization', `Bearer ${token}`)
          .send({
            targetType: 'course',
            targetId: 'course-duplicate-test',
            message: 'First inquiry about this course.',
          })
          .expect(201);

        // Second inquiry for same target should fail
        const response = await request(getApp())
          .post('/api/v1/inquiries')
          .set('Authorization', `Bearer ${token}`)
          .send({
            targetType: 'course',
            targetId: 'course-duplicate-test',
            message: 'Second inquiry about the same course.',
          })
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('already have a pending inquiry');

        await cleanupTestUser(uniqueEmail);
      });

      it('should allow inquiries for different targets', async () => {
        const uniqueEmail = `inquiry-diff-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Test User',
            role: UserRole.PARENT,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        // First inquiry
        await request(getApp())
          .post('/api/v1/inquiries')
          .set('Authorization', `Bearer ${token}`)
          .send({
            targetType: 'course',
            targetId: 'course-1',
            message: 'First inquiry.',
          })
          .expect(201);

        // Second inquiry for different target should succeed
        const response = await request(getApp())
          .post('/api/v1/inquiries')
          .set('Authorization', `Bearer ${token}`)
          .send({
            targetType: 'course',
            targetId: 'course-2',
            message: 'Second inquiry for different course.',
          })
          .expect(201);

        expect(response.body.success).toBe(true);

        await cleanupTestUser(uniqueEmail);
      });

      it('should allow guest users to submit multiple inquiries', async () => {
        // Guest users are not rate limited (no userId)
        const firstResponse = await request(getApp())
          .post('/api/v1/inquiries')
          .send({
            targetType: 'general',
            message: 'First guest inquiry.',
          })
          .expect(201);

        expect(firstResponse.body.success).toBe(true);

        const secondResponse = await request(getApp())
          .post('/api/v1/inquiries')
          .send({
            targetType: 'general',
            message: 'Second guest inquiry.',
          })
          .expect(201);

        expect(secondResponse.body.success).toBe(true);
      });
    });
  });

  // ==================== GET /api/v1/inquiries/:id ====================

  describe('GET /api/v1/inquiries/:id - Get Inquiry by ID', () => {
    describe('Happy Path', () => {
      it('should get inquiry by ID', async () => {
        const uniqueEmail = `get-inquiry-${Date.now()}@example.com`;

        // Create user and inquiry
        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Test User',
            role: UserRole.PARENT,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        const createResponse = await request(getApp())
          .post('/api/v1/inquiries')
          .set('Authorization', `Bearer ${token}`)
          .send({
            targetType: 'teacher',
            targetId: 'teacher-123',
            subject: 'Qualifications',
            message: 'What are the teacher qualifications?',
          });

        const inquiryId = createResponse.body.data.inquiryId;

        // Get inquiry
        const response = await request(getApp())
          .get(`/api/v1/inquiries/${inquiryId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(inquiryId);
        expect(response.body.data.targetType).toBe('teacher');
        expect(response.body.data.targetId).toBe('teacher-123');
        expect(response.body.data.subject).toBe('Qualifications');
        expect(response.body.data.message).toBe('What are the teacher qualifications?');
        expect(response.body.data.status).toBe('PENDING');

        await cleanupTestUser(uniqueEmail);
      });
    });

    describe('Failed Cases', () => {
      it('should reject request without authentication', async () => {
        const response = await request(getApp()).get('/api/v1/inquiries/some-id').expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should return 404 for non-existent inquiry', async () => {
        const uniqueEmail = `not-found-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Test User',
            role: UserRole.STUDENT,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const response = await request(getApp())
          .get('/api/v1/inquiries/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Inquiry not found');

        await cleanupTestUser(uniqueEmail);
      });
    });
  });

  // ==================== POST /api/v1/inquiries/:id/reply ====================

  describe('POST /api/v1/inquiries/:id/reply - Reply to Inquiry (Admin)', () => {
    describe('Happy Path', () => {
      it('should reply to inquiry as admin', async () => {
        const uniqueEmail = `reply-admin-${Date.now()}@example.com`;

        // Create admin user
        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        // Create inquiry as guest
        const createResponse = await request(getApp())
          .post('/api/v1/inquiries')
          .send({
            targetType: 'general',
            message: 'I need help with something.',
          });

        const inquiryId = createResponse.body.data.inquiryId;

        // Reply to inquiry
        const response = await request(getApp())
          .post(`/api/v1/inquiries/${inquiryId}/reply`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            replyContent: 'Thank you for your inquiry. We are here to help!',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(inquiryId);
        expect(response.body.data.replyContent).toBe('Thank you for your inquiry. We are here to help!');
        expect(response.body.data.status).toBe('REPLIED');
        expect(response.body.data.repliedAt).toBeDefined();

        // Verify in database
        const dbResult = await pool.query('SELECT * FROM inquiries WHERE id = $1', [inquiryId]);
        expect(dbResult.rows[0].reply_content).toBe('Thank you for your inquiry. We are here to help!');
        expect(dbResult.rows[0].status).toBe('REPLIED');
        expect(dbResult.rows[0].replied_at).not.toBeNull();

        await cleanupTestUser(uniqueEmail);
      });
    });

    describe('Failed Cases', () => {
      it('should reject reply without authentication', async () => {
        const response = await request(getApp())
          .post('/api/v1/inquiries/some-id/reply')
          .send({ replyContent: 'Test reply' })
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should reject reply with empty content', async () => {
        const uniqueEmail = `reply-empty-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const response = await request(getApp())
          .post('/api/v1/inquiries/some-id/reply')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({ replyContent: '   ' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Reply content is required');

        await cleanupTestUser(uniqueEmail);
      });

      it('should return 404 for non-existent inquiry', async () => {
        const uniqueEmail = `reply-notfound-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const response = await request(getApp())
          .post('/api/v1/inquiries/00000000-0000-0000-0000-000000000000/reply')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({ replyContent: 'Test reply' })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Inquiry not found');

        await cleanupTestUser(uniqueEmail);
      });
    });
  });

  // ==================== PATCH /api/v1/inquiries/:id/status ====================

  describe('PATCH /api/v1/inquiries/:id/status - Update Inquiry Status (Admin)', () => {
    describe('Happy Path', () => {
      it('should update inquiry status to READ', async () => {
        const uniqueEmail = `status-read-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        const createResponse = await request(getApp())
          .post('/api/v1/inquiries')
          .send({
            targetType: 'general',
            message: 'Test inquiry.',
          });

        const inquiryId = createResponse.body.data.inquiryId;

        const response = await request(getApp())
          .patch(`/api/v1/inquiries/${inquiryId}/status`)
          .set('Authorization', `Bearer ${token}`)
          .send({ status: 'READ' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('READ');

        const dbResult = await pool.query('SELECT status FROM inquiries WHERE id = $1', [inquiryId]);
        expect(dbResult.rows[0].status).toBe('READ');

        await cleanupTestUser(uniqueEmail);
      });

      it('should update inquiry status to CLOSED', async () => {
        const uniqueEmail = `status-closed-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        const createResponse = await request(getApp())
          .post('/api/v1/inquiries')
          .send({
            targetType: 'course',
            targetId: 'course-abc',
            message: 'Question about course.',
          });

        const inquiryId = createResponse.body.data.inquiryId;

        const response = await request(getApp())
          .patch(`/api/v1/inquiries/${inquiryId}/status`)
          .set('Authorization', `Bearer ${token}`)
          .send({ status: 'CLOSED' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('CLOSED');

        await cleanupTestUser(uniqueEmail);
      });

      it('should allow all valid status transitions', async () => {
        const uniqueEmail = `status-trans-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        const createResponse = await request(getApp())
          .post('/api/v1/inquiries')
          .send({
            targetType: 'general',
            message: 'Test inquiry for status transitions.',
          });

        const inquiryId = createResponse.body.data.inquiryId;

        const statuses: Array<'PENDING' | 'READ' | 'REPLIED' | 'CLOSED'> = [
          'PENDING',
          'READ',
          'REPLIED',
          'CLOSED',
        ];

        for (const status of statuses) {
          const response = await request(getApp())
            .patch(`/api/v1/inquiries/${inquiryId}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status });

          expect(response.body.success).toBe(true);
          expect(response.body.data.status).toBe(status);
        }

        await cleanupTestUser(uniqueEmail);
      });
    });

    describe('Validation Errors', () => {
      it('should reject invalid status', async () => {
        const uniqueEmail = `status-invalid-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const response = await request(getApp())
          .patch('/api/v1/inquiries/some-id/status')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({ status: 'INVALID_STATUS' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Invalid status');

        await cleanupTestUser(uniqueEmail);
      });

      it('should reject status update without status field', async () => {
        const uniqueEmail = `status-missing-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const response = await request(getApp())
          .patch('/api/v1/inquiries/some-id/status')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Invalid status');

        await cleanupTestUser(uniqueEmail);
      });
    });

    describe('Failed Cases', () => {
      it('should reject unauthenticated status update', async () => {
        const response = await request(getApp())
          .patch('/api/v1/inquiries/some-id/status')
          .send({ status: 'READ' })
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should return 404 for non-existent inquiry', async () => {
        const uniqueEmail = `status-404-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const response = await request(getApp())
          .patch('/api/v1/inquiries/00000000-0000-0000-0000-000000000000/status')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({ status: 'READ' })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Inquiry not found');

        await cleanupTestUser(uniqueEmail);
      });
    });
  });

  // ==================== POST /api/v1/reports ====================

  describe('POST /api/v1/reports - Create Report', () => {
    describe('Happy Path', () => {
      it('should create report as authenticated user', async () => {
        const uniqueEmail = `report-auth-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Test User',
            role: UserRole.PARENT,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        const response = await request(getApp())
          .post('/api/v1/reports')
          .set('Authorization', `Bearer ${token}`)
          .send({
            targetType: 'course',
            targetId: 'course-123',
            reason: 'inappropriate_content',
            description: 'This course contains inappropriate language.',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.reportId).toBeDefined();
        expect(response.body.message).toBe('Report submitted successfully');

        const dbResult = await pool.query('SELECT * FROM reports WHERE id = $1', [
          response.body.data.reportId,
        ]);
        expect(dbResult.rows.length).toBe(1);
        expect(dbResult.rows[0].target_type).toBe('course');
        expect(dbResult.rows[0].reason).toBe('inappropriate_content');
        expect(dbResult.rows[0].status).toBe('PENDING');

        await cleanupTestUser(uniqueEmail);
      });

      it('should create report as guest (without authentication)', async () => {
        const response = await request(getApp())
          .post('/api/v1/reports')
          .send({
            targetType: 'review',
            targetId: 'review-456',
            reason: 'spam',
            description: 'This review is spam and does not provide any useful information.',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.reportId).toBeDefined();

        const dbResult = await pool.query('SELECT * FROM reports WHERE id = $1', [
          response.body.data.reportId,
        ]);
        expect(dbResult.rows[0].user_id).toBeNull();
        expect(dbResult.rows[0].target_type).toBe('review');
      });

      it('should support all valid report reasons', async () => {
        const uniqueEmail = `report-reasons-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Test User',
            role: UserRole.STUDENT,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        const reasons: Array<
          'spam' | 'inappropriate_content' | 'fake_information' | 'harassment' | 'fraud' | 'copyright' | 'other'
        > = ['spam', 'inappropriate_content', 'fake_information', 'harassment', 'fraud', 'copyright', 'other'];

        for (const reason of reasons) {
          const response = await request(getApp())
            .post('/api/v1/reports')
            .set('Authorization', `Bearer ${token}`)
            .send({
              targetType: 'other',
              targetId: `target-${reason}`,
              reason,
              description: `Report for reason: ${reason}. This is a test description that meets the minimum length requirement.`,
            });

          expect(response.body.success).toBe(true);
        }

        await cleanupTestUser(uniqueEmail);
      });

      it('should support all valid target types', async () => {
        const uniqueEmail = `report-targets-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Test User',
            role: UserRole.PARENT,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        const targetTypes: Array<'course' | 'teacher' | 'review' | 'user' | 'comment' | 'other'> = [
          'course',
          'teacher',
          'review',
          'user',
          'comment',
          'other',
        ];

        for (const targetType of targetTypes) {
          const response = await request(getApp())
            .post('/api/v1/reports')
            .set('Authorization', `Bearer ${token}`)
            .send({
              targetType,
              targetId: `target-${targetType}`,
              reason: 'spam',
              description: `Report for target type: ${targetType}. This is a test description.`,
            });

          expect(response.body.success).toBe(true);
        }

        await cleanupTestUser(uniqueEmail);
      });

      it('should trim description whitespace', async () => {
        const response = await request(getApp())
          .post('/api/v1/reports')
          .send({
            targetType: 'comment',
            targetId: 'comment-123',
            reason: 'spam',
            description: '   This is a test description with extra spaces   ',
          })
          .expect(201);

        expect(response.body.success).toBe(true);

        const dbResult = await pool.query('SELECT description FROM reports WHERE id = $1', [
          response.body.data.reportId,
        ]);
        expect(dbResult.rows[0].description).toBe('This is a test description with extra spaces');
      });
    });

    describe('Validation Errors', () => {
      it('should reject report without targetType', async () => {
        const response = await request(getApp())
          .post('/api/v1/reports')
          .send({
            targetId: 'target-123',
            reason: 'spam',
            description: 'Test description for report.',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Target type is required');
      });

      it('should reject report without targetId', async () => {
        const response = await request(getApp())
          .post('/api/v1/reports')
          .send({
            targetType: 'course',
            reason: 'spam',
            description: 'Test description for report.',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Target ID is required');
      });

      it('should reject report without reason', async () => {
        const response = await request(getApp())
          .post('/api/v1/reports')
          .send({
            targetType: 'course',
            targetId: 'course-123',
            description: 'Test description for report.',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Reason is required');
      });

      it('should reject report with description less than 10 characters', async () => {
        const response = await request(getApp())
          .post('/api/v1/reports')
          .send({
            targetType: 'course',
            targetId: 'course-123',
            reason: 'spam',
            description: 'Short',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('at least 10 characters');
      });

      it('should reject report with description exceeding 2000 characters', async () => {
        const longDescription = 'A'.repeat(2001);

        const uniqueEmail = `report-long-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Test User',
            role: UserRole.STUDENT,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const response = await request(getApp())
          .post('/api/v1/reports')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            targetType: 'course',
            targetId: 'course-123',
            reason: 'spam',
            description: longDescription,
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('less than 2000 characters');

        await cleanupTestUser(uniqueEmail);
      });

      it('should reject report with invalid reason', async () => {
        const uniqueEmail = `report-bad-reason-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Test User',
            role: UserRole.STUDENT,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const response = await request(getApp())
          .post('/api/v1/reports')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            targetType: 'course',
            targetId: 'course-123',
            reason: 'invalid_reason',
            description: 'Test description for report.',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Invalid reason');

        await cleanupTestUser(uniqueEmail);
      });

      it('should reject report with invalid targetType', async () => {
        const uniqueEmail = `report-bad-type-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Test User',
            role: UserRole.STUDENT,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const response = await request(getApp())
          .post('/api/v1/reports')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            targetType: 'invalid_type',
            targetId: 'target-123',
            reason: 'spam',
            description: 'Test description for report.',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Invalid target type');

        await cleanupTestUser(uniqueEmail);
      });
    });

    describe('Duplicate Prevention', () => {
      it('should prevent duplicate report for same target from authenticated user', async () => {
        const uniqueEmail = `report-dup-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Test User',
            role: UserRole.PARENT,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        // First report
        await request(getApp())
          .post('/api/v1/reports')
          .set('Authorization', `Bearer ${token}`)
          .send({
            targetType: 'course',
            targetId: 'course-dup-test',
            reason: 'spam',
            description: 'First report for this content.',
          })
          .expect(201);

        // Second report for same target should fail
        const response = await request(getApp())
          .post('/api/v1/reports')
          .set('Authorization', `Bearer ${token}`)
          .send({
            targetType: 'course',
            targetId: 'course-dup-test',
            reason: 'inappropriate_content',
            description: 'Second report for the same content.',
          })
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('already reported');

        await cleanupTestUser(uniqueEmail);
      });

      it('should allow different users to report same target', async () => {
        const email1 = `report-user1-${Date.now()}@example.com`;
        const email2 = `report-user2-${Date.now()}@example.com`;

        // First user
        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: email1,
            password: 'SecurePass123!',
            name: 'User 1',
            role: UserRole.PARENT,
          });

        const login1 = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: email1, password: 'SecurePass123!' });

        // First user's report
        await request(getApp())
          .post('/api/v1/reports')
          .set('Authorization', `Bearer ${login1.body.data.token}`)
          .send({
            targetType: 'course',
            targetId: 'course-multi-report',
            reason: 'spam',
            description: 'First user report.',
          })
          .expect(201);

        // Second user
        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: email2,
            password: 'SecurePass123!',
            name: 'User 2',
            role: UserRole.PARENT,
          });

        const login2 = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: email2, password: 'SecurePass123!' });

        // Second user's report should succeed
        const response = await request(getApp())
          .post('/api/v1/reports')
          .set('Authorization', `Bearer ${login2.body.data.token}`)
          .send({
            targetType: 'course',
            targetId: 'course-multi-report',
            reason: 'spam',
            description: 'Second user report.',
          })
          .expect(201);

        expect(response.body.success).toBe(true);

        await cleanupTestUser(email1);
        await cleanupTestUser(email2);
      });

      it('should allow guest users to submit multiple reports', async () => {
        // Guest users are not tracked for duplicate prevention
        const firstResponse = await request(getApp())
          .post('/api/v1/reports')
          .send({
            targetType: 'comment',
            targetId: 'comment-guest-test',
            reason: 'spam',
            description: 'First guest report.',
          })
          .expect(201);

        expect(firstResponse.body.success).toBe(true);

        const secondResponse = await request(getApp())
          .post('/api/v1/reports')
          .send({
            targetType: 'comment',
            targetId: 'comment-guest-test',
            reason: 'spam',
            description: 'Second guest report for same target.',
          })
          .expect(201);

        expect(secondResponse.body.success).toBe(true);
      });

      it('should allow report for same target after previous report is resolved', async () => {
        const uniqueEmail = `report-resolved-${Date.now()}@example.com`;

        // Regular user
        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Test User',
            role: UserRole.PARENT,
          });

        const userLogin = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        // Admin user
        const adminEmail = `admin-report-${Date.now()}@example.com`;
        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: adminEmail,
            password: 'SecurePass123!',
            name: 'Admin',
            role: UserRole.ADMIN,
          });

        const adminLogin = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: adminEmail, password: 'SecurePass123!' });

        const userToken = userLogin.body.data.token;
        const adminToken = adminLogin.body.data.token;

        // First report
        const createResponse = await request(getApp())
          .post('/api/v1/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'course',
            targetId: 'course-resolved-test',
            reason: 'spam',
            description: 'First report.',
          })
          .expect(201);

        const reportId = createResponse.body.data.reportId;

        // Admin resolves the report
        await request(getApp())
          .patch(`/api/v1/reports/${reportId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'RESOLVED', adminNotes: 'Issue resolved' })
          .expect(200);

        // User can report again
        const response = await request(getApp())
          .post('/api/v1/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            targetType: 'course',
            targetId: 'course-resolved-test',
            reason: 'spam',
            description: 'New report after previous one was resolved.',
          })
          .expect(201);

        expect(response.body.success).toBe(true);

        await cleanupTestUser(uniqueEmail);
        await cleanupTestUser(adminEmail);
      });
    });
  });

  // ==================== GET /api/v1/reports/:id ====================

  describe('GET /api/v1/reports/:id - Get Report by ID', () => {
    describe('Happy Path', () => {
      it('should get report by ID', async () => {
        const uniqueEmail = `get-report-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Test User',
            role: UserRole.PARENT,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        const createResponse = await request(getApp())
          .post('/api/v1/reports')
          .set('Authorization', `Bearer ${token}`)
          .send({
            targetType: 'teacher',
            targetId: 'teacher-123',
            reason: 'fake_information',
            description: 'This teacher profile contains incorrect information about qualifications.',
          });

        const reportId = createResponse.body.data.reportId;

        const response = await request(getApp())
          .get(`/api/v1/reports/${reportId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(reportId);
        expect(response.body.data.targetType).toBe('teacher');
        expect(response.body.data.targetId).toBe('teacher-123');
        expect(response.body.data.reason).toBe('fake_information');
        expect(response.body.data.description).toBe(
          'This teacher profile contains incorrect information about qualifications.'
        );
        expect(response.body.data.status).toBe('PENDING');

        await cleanupTestUser(uniqueEmail);
      });
    });

    describe('Failed Cases', () => {
      it('should reject request without authentication', async () => {
        const response = await request(getApp()).get('/api/v1/reports/some-id').expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should return 404 for non-existent report', async () => {
        const uniqueEmail = `report-notfound-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Test User',
            role: UserRole.STUDENT,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const response = await request(getApp())
          .get('/api/v1/reports/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Report not found');

        await cleanupTestUser(uniqueEmail);
      });
    });
  });

  // ==================== PATCH /api/v1/reports/:id/status ====================

  describe('PATCH /api/v1/reports/:id/status - Update Report Status (Admin)', () => {
    describe('Happy Path', () => {
      it('should update report status to REVIEWING', async () => {
        const uniqueEmail = `r-status-review-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        const createResponse = await request(getApp())
          .post('/api/v1/reports')
          .send({
            targetType: 'course',
            targetId: 'course-abc',
            reason: 'spam',
            description: 'This course is spam.',
          });

        const reportId = createResponse.body.data.reportId;

        const response = await request(getApp())
          .patch(`/api/v1/reports/${reportId}/status`)
          .set('Authorization', `Bearer ${token}`)
          .send({ status: 'REVIEWING' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('REVIEWING');

        await cleanupTestUser(uniqueEmail);
      });

      it('should update report status to RESOLVED with admin notes', async () => {
        const uniqueEmail = `r-status-resolve-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        const createResponse = await request(getApp())
          .post('/api/v1/reports')
          .send({
            targetType: 'review',
            targetId: 'review-xyz',
            reason: 'harassment',
            description: 'This review contains harassing language.',
          });

        const reportId = createResponse.body.data.reportId;
        const adminNotes = 'Investigated and removed the offensive review. User warned.';

        const response = await request(getApp())
          .patch(`/api/v1/reports/${reportId}/status`)
          .set('Authorization', `Bearer ${token}`)
          .send({ status: 'RESOLVED', adminNotes })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('RESOLVED');
        expect(response.body.data.adminNotes).toBe(adminNotes);
        expect(response.body.data.resolvedAt).toBeDefined();

        const dbResult = await pool.query('SELECT * FROM reports WHERE id = $1', [reportId]);
        expect(dbResult.rows[0].admin_notes).toBe(adminNotes);
        expect(dbResult.rows[0].resolved_at).not.toBeNull();

        await cleanupTestUser(uniqueEmail);
      });

      it('should update report status to DISMISSED', async () => {
        const uniqueEmail = `r-status-dismiss-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        const createResponse = await request(getApp())
          .post('/api/v1/reports')
          .send({
            targetType: 'user',
            targetId: 'user-123',
            reason: 'fraud',
            description: 'This user profile appears to be fraudulent.',
          });

        const reportId = createResponse.body.data.reportId;

        const response = await request(getApp())
          .patch(`/api/v1/reports/${reportId}/status`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            status: 'DISMISSED',
            adminNotes: 'Insufficient evidence to support the claim.',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('DISMISSED');
        expect(response.body.data.adminNotes).toBe('Insufficient evidence to support the claim.');
        expect(response.body.data.resolvedAt).toBeUndefined();

        await cleanupTestUser(uniqueEmail);
      });

      it('should update admin notes on existing report', async () => {
        const uniqueEmail = `r-update-notes-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        const createResponse = await request(getApp())
          .post('/api/v1/reports')
          .send({
            targetType: 'comment',
            targetId: 'comment-123',
            reason: 'inappropriate_content',
            description: 'Inappropriate comment.',
          });

        const reportId = createResponse.body.data.reportId;

        // First status update with notes
        await request(getApp())
          .patch(`/api/v1/reports/${reportId}/status`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            status: 'REVIEWING',
            adminNotes: 'Initial review started.',
          })
          .expect(200);

        // Update to RESOLVED with new notes
        const response = await request(getApp())
          .patch(`/api/v1/reports/${reportId}/status`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            status: 'RESOLVED',
            adminNotes: 'Comment removed. Issue resolved.',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.adminNotes).toBe('Comment removed. Issue resolved.');
        expect(response.body.data.resolvedAt).toBeDefined();

        await cleanupTestUser(uniqueEmail);
      });

      it('should allow all valid status transitions', async () => {
        const uniqueEmail = `r-status-trans-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        const createResponse = await request(getApp())
          .post('/api/v1/reports')
          .send({
            targetType: 'other',
            targetId: 'target-xyz',
            reason: 'other',
            description: 'Other report for status transitions.',
          });

        const reportId = createResponse.body.data.reportId;

        const statuses: Array<'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED'> = [
          'PENDING',
          'REVIEWING',
          'RESOLVED',
          'DISMISSED',
        ];

        for (const status of statuses) {
          const response = await request(getApp())
            .patch(`/api/v1/reports/${reportId}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status });

          expect(response.body.success).toBe(true);
          expect(response.body.data.status).toBe(status);
        }

        await cleanupTestUser(uniqueEmail);
      });
    });

    describe('Admin Notes Handling', () => {
      it('should update report without admin notes', async () => {
        const uniqueEmail = `r-no-notes-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        const createResponse = await request(getApp())
          .post('/api/v1/reports')
          .send({
            targetType: 'course',
            targetId: 'course-123',
            reason: 'copyright',
            description: 'Copyright infringement report.',
          });

        const reportId = createResponse.body.data.reportId;

        const response = await request(getApp())
          .patch(`/api/v1/reports/${reportId}/status`)
          .set('Authorization', `Bearer ${token}`)
          .send({ status: 'REVIEWING' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.adminNotes).toBeUndefined();

        await cleanupTestUser(uniqueEmail);
      });

      it('should handle empty admin notes string', async () => {
        const uniqueEmail = `r-empty-notes-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        const createResponse = await request(getApp())
          .post('/api/v1/reports')
          .send({
            targetType: 'teacher',
            targetId: 'teacher-456',
            reason: 'harassment',
            description: 'Harassment report.',
          });

        const reportId = createResponse.body.data.reportId;

        // Empty string should not set admin notes
        const response = await request(getApp())
          .patch(`/api/v1/reports/${reportId}/status`)
          .set('Authorization', `Bearer ${token}`)
          .send({ status: 'REVIEWING', adminNotes: '' })
          .expect(200);

        expect(response.body.success).toBe(true);
        // Empty string may be stored as null or empty string depending on implementation
        expect(['', null, undefined]).toContain(response.body.data.adminNotes);

        await cleanupTestUser(uniqueEmail);
      });

      it('should handle long admin notes', async () => {
        const uniqueEmail = `r-long-notes-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const token = loginResponse.body.data.token;

        const createResponse = await request(getApp())
          .post('/api/v1/reports')
          .send({
            targetType: 'review',
            targetId: 'review-789',
            reason: 'fake_information',
            description: 'Fake information report.',
          });

        const reportId = createResponse.body.data.reportId;
        const longNotes =
          'Detailed investigation notes: ' +
          '1. Reviewed the reported content multiple times. '.repeat(10) +
          '2. Cross-referenced with available data. '.repeat(5) +
          '3. Consulted with team members. ' +
          '4. Final decision based on evidence gathered.';

        const response = await request(getApp())
          .patch(`/api/v1/reports/${reportId}/status`)
          .set('Authorization', `Bearer ${token}`)
          .send({ status: 'RESOLVED', adminNotes: longNotes })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.adminNotes).toBe(longNotes);

        await cleanupTestUser(uniqueEmail);
      });
    });

    describe('Validation Errors', () => {
      it('should reject invalid status', async () => {
        const uniqueEmail = `r-invalid-status-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const response = await request(getApp())
          .patch('/api/v1/reports/some-id/status')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({ status: 'INVALID_STATUS' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Invalid status');

        await cleanupTestUser(uniqueEmail);
      });

      it('should reject status update without status field', async () => {
        const uniqueEmail = `r-missing-status-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const response = await request(getApp())
          .patch('/api/v1/reports/some-id/status')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({ adminNotes: 'Some notes' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Invalid status');

        await cleanupTestUser(uniqueEmail);
      });
    });

    describe('Failed Cases', () => {
      it('should reject unauthenticated status update', async () => {
        const response = await request(getApp())
          .patch('/api/v1/reports/some-id/status')
          .send({ status: 'REVIEWING' })
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should return 404 for non-existent report', async () => {
        const uniqueEmail = `r-404-${Date.now()}@example.com`;

        await request(getApp())
          .post('/api/v1/auth/register')
          .send({
            email: uniqueEmail,
            password: 'SecurePass123!',
            name: 'Admin User',
            role: UserRole.ADMIN,
          });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({ email: uniqueEmail, password: 'SecurePass123!' });

        const response = await request(getApp())
          .patch('/api/v1/reports/00000000-0000-0000-0000-000000000000/status')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({ status: 'REVIEWING' })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Report not found');

        await cleanupTestUser(uniqueEmail);
      });
    });
  });
});
