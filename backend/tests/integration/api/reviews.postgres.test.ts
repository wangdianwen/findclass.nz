/**
 * Reviews API - Integration Tests
 *
 * Test Cases:
 * - GET /api/v1/reviews - List reviews with filters (teacherId, courseId, rating, status)
 * - GET /api/v1/reviews/stats/:teacherId - Get teacher review statistics
 * - POST /api/v1/reviews - Create a new review (authenticated)
 *
 * Test Type: Integration Test (PostgreSQL)
 * Path: tests/integration/api/reviews.api.test.ts
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp, getTestPool } from '../setup.postgres';
import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { createTestUser } from '../fixtures/test-users.postgres';
import { UserRole } from '@src/shared/types';

describe('Reviews API Integration Tests', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = getTestPool();
  });

  beforeEach(async () => {
    // Clean up before each test
    await pool.query('DELETE FROM reviews');
    await pool.query('DELETE FROM courses');
    await pool.query('DELETE FROM teachers');
    await pool.query('DELETE FROM users');
  });

  // ==================== Test Fixtures ====================

  interface TestTeacher {
    id: string;
    userId: string;
  }

  interface TestCourse {
    id: string;
  }

  async function createTestTeacher(name?: string): Promise<TestTeacher> {
    const user = await createTestUser({
      name: name || 'Test Teacher',
      role: UserRole.TEACHER,
    });

    const teacherResult = await pool.query(
      `INSERT INTO teachers (id, display_name, bio, verified, teaching_years)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [user.id, user.name, 'Test teacher bio', true, 5]
    );

    return {
      id: teacherResult.rows[0].id,
      userId: user.id,
    };
  }

  async function createTestCourse(teacherId: string, title?: string): Promise<TestCourse> {
    const result = await pool.query(
      `INSERT INTO courses (teacher_id, title, description, category, price)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [teacherId, title || 'Test Course', 'Test course description', 'Math', 50.0]
    );

    return { id: result.rows[0].id };
  }

  async function createTestReview(
    userId: string,
    teacherId: string,
    overrides: {
      courseId?: string;
      rating?: number;
      status?: string;
      helpfulCount?: number;
      content?: string;
    } = {}
  ): Promise<string> {
    const {
      courseId,
      rating = 5,
      status = 'APPROVED',
      helpfulCount = 0,
      content = 'Great teacher!',
    } = overrides;

    const result = await pool.query(
      `INSERT INTO reviews (
        user_id, teacher_id, course_id, overall_rating,
        content, status, helpful_count, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id`,
      [userId, teacherId, courseId || null, rating, content, status, helpfulCount]
    );

    return result.rows[0].id;
  }

  // ==================== GET /api/v1/reviews ====================

  describe('GET /api/v1/reviews - List Reviews', () => {
    describe('Happy Path', () => {
      it('should return empty array when no reviews exist', async () => {
        const response = await request(getApp()).get('/api/v1/reviews').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual([]);
        expect(response.body.pagination).toBeDefined();
        expect(response.body.pagination.total).toBe(0);
      });

      it('should return list of reviews with default pagination', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({ name: 'Student One' });

        // Create multiple reviews
        await createTestReview(student.id, teacher.id, { rating: 5, content: 'Excellent!' });
        await createTestReview(student.id, teacher.id, { rating: 4, content: 'Very good' });

        const response = await request(getApp()).get('/api/v1/reviews').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.pagination.total).toBe(2);
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.pageSize).toBe(10);
        expect(response.body.pagination.totalPages).toBe(1);
        expect(response.body.data[0]).toMatchObject({
          teacherId: teacher.id,
          rating: 4,
          content: 'Very good',
        });
      });

      it('should filter reviews by teacherId', async () => {
        const teacher1 = await createTestTeacher('Teacher One');
        const teacher2 = await createTestTeacher('Teacher Two');
        const student = await createTestUser({ name: 'Student' });

        await createTestReview(student.id, teacher1.id, { rating: 5, content: 'Great teacher!' });
        await createTestReview(student.id, teacher2.id, { rating: 3, content: 'Okay teacher' });

        const response = await request(getApp())
          .get(`/api/v1/reviews?teacherId=${teacher1.id}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].teacherId).toBe(teacher1.id);
        expect(response.body.data[0].content).toBe('Great teacher!');
      });

      it('should filter reviews by courseId', async () => {
        const teacher = await createTestTeacher();
        const course1 = await createTestCourse(teacher.id, 'Math 101');
        const course2 = await createTestCourse(teacher.id, 'English 101');
        const student = await createTestUser({ name: 'Student' });

        await createTestReview(student.id, teacher.id, {
          courseId: course1.id,
          rating: 5,
          content: 'Great math course',
        });
        await createTestReview(student.id, teacher.id, {
          courseId: course2.id,
          rating: 4,
          content: 'Good english course',
        });

        const response = await request(getApp())
          .get(`/api/v1/reviews?courseId=${course1.id}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].courseId).toBe(course1.id);
        expect(response.body.data[0].content).toBe('Great math course');
      });

      it('should support pagination with page and pageSize', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({ name: 'Student' });

        // Create 15 reviews
        for (let i = 0; i < 15; i++) {
          await createTestReview(student.id, teacher.id, {
            rating: (i % 5) + 1,
            content: `Review ${i + 1}`,
          });
        }

        const response = await request(getApp())
          .get('/api/v1/reviews?page=2&pageSize=5')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(5);
        expect(response.body.pagination.page).toBe(2);
        expect(response.body.pagination.pageSize).toBe(5);
        expect(response.body.pagination.total).toBe(15);
        expect(response.body.pagination.totalPages).toBe(3);
        expect(response.body.pagination.hasNextPage).toBe(true);
        expect(response.body.pagination.hasPrevPage).toBe(true);
      });

      it('should sort reviews by helpful', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({ name: 'Student' });

        await createTestReview(student.id, teacher.id, {
          rating: 5,
          helpfulCount: 10,
          content: 'Most helpful',
        });
        await createTestReview(student.id, teacher.id, {
          rating: 4,
          helpfulCount: 5,
          content: 'Somewhat helpful',
        });
        await createTestReview(student.id, teacher.id, {
          rating: 3,
          helpfulCount: 20,
          content: 'Super helpful',
        });

        const response = await request(getApp())
          .get('/api/v1/reviews?sortBy=helpful')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(3);
        expect(response.body.data[0].content).toBe('Super helpful');
        expect(response.body.data[1].content).toBe('Most helpful');
        expect(response.body.data[2].content).toBe('Somewhat helpful');
      });

      it('should only return approved reviews by default', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({ name: 'Student' });

        await createTestReview(student.id, teacher.id, {
          rating: 5,
          status: 'APPROVED',
          content: 'Approved review',
        });
        await createTestReview(student.id, teacher.id, {
          rating: 4,
          status: 'PENDING',
          content: 'Pending review',
        });
        await createTestReview(student.id, teacher.id, {
          rating: 3,
          status: 'REJECTED',
          content: 'Rejected review',
        });

        const response = await request(getApp()).get('/api/v1/reviews').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].content).toBe('Approved review');
      });
    });

    describe('Failed Cases', () => {
      it('should return zero stats for non-existent teacher', async () => {
        const fakeTeacherId = '00000000-0000-0000-0000-000000000000';
        const response = await request(getApp())
          .get(`/api/v1/reviews/stats/${fakeTeacherId}`)
          .expect(200);

        // API returns zero stats instead of 404 for non-existent teachers
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          teacherId: fakeTeacherId,
          total: 0,
          average: 0,
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle pagination beyond available data', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({ name: 'Student' });

        await createTestReview(student.id, teacher.id, { rating: 5, content: 'Only review' });

        const response = await request(getApp())
          .get('/api/v1/reviews?page=10&pageSize=5')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(0);
        expect(response.body.pagination.total).toBe(1);
        expect(response.body.pagination.page).toBe(10);
        expect(response.body.pagination.hasNextPage).toBe(false);
      });

      it('should handle large pageSize', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({ name: 'Student' });

        for (let i = 0; i < 50; i++) {
          await createTestReview(student.id, teacher.id, {
            rating: (i % 5) + 1,
            content: `Review ${i + 1}`,
          });
        }

        const response = await request(getApp())
          .get('/api/v1/reviews?pageSize=100')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(50);
        expect(response.body.pagination.total).toBe(50);
      });

      it('should handle zero pageSize gracefully', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({ name: 'Student' });

        await createTestReview(student.id, teacher.id, { rating: 5 });

        const response = await request(getApp())
          .get('/api/v1/reviews?pageSize=0')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(0);
      });
    });
  });

  // ==================== GET /api/v1/reviews/stats/:teacherId ====================

  describe('GET /api/v1/reviews/stats/:teacherId - Teacher Statistics', () => {
    describe('Happy Path', () => {
      it('should return zero stats for teacher with no reviews', async () => {
        const teacher = await createTestTeacher();

        const response = await request(getApp())
          .get(`/api/v1/reviews/stats/${teacher.id}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          teacherId: teacher.id,
          total: 0,
          average: 0,
          distribution: {
            '1': 0,
            '2': 0,
            '3': 0,
            '4': 0,
            '5': 0,
          },
        });
      });

      it('should calculate correct statistics for approved reviews only', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({ name: 'Student' });

        // Create reviews with different ratings and statuses
        await createTestReview(student.id, teacher.id, { rating: 5, status: 'APPROVED' });
        await createTestReview(student.id, teacher.id, { rating: 4, status: 'APPROVED' });
        await createTestReview(student.id, teacher.id, { rating: 5, status: 'APPROVED' });
        await createTestReview(student.id, teacher.id, { rating: 3, status: 'PENDING' });
        await createTestReview(student.id, teacher.id, { rating: 1, status: 'REJECTED' });

        const response = await request(getApp())
          .get(`/api/v1/reviews/stats/${teacher.id}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          teacherId: teacher.id,
          total: 3,
        });
        // Check average is approximately correct (PostgreSQL returns high precision)
        expect(parseFloat(response.body.data.average)).toBeCloseTo(4.67, 1);
        expect(response.body.data.distribution).toMatchObject({
          '1': 0,
          '2': 0,
          '3': 0,
          '4': 1,
          '5': 2,
        });
      });

      it('should calculate correct rating distribution', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({ name: 'Student' });

        await createTestReview(student.id, teacher.id, { rating: 5, status: 'APPROVED' });
        await createTestReview(student.id, teacher.id, { rating: 5, status: 'APPROVED' });
        await createTestReview(student.id, teacher.id, { rating: 4, status: 'APPROVED' });
        await createTestReview(student.id, teacher.id, { rating: 4, status: 'APPROVED' });
        await createTestReview(student.id, teacher.id, { rating: 4, status: 'APPROVED' });
        await createTestReview(student.id, teacher.id, { rating: 3, status: 'APPROVED' });
        await createTestReview(student.id, teacher.id, { rating: 2, status: 'APPROVED' });
        await createTestReview(student.id, teacher.id, { rating: 1, status: 'APPROVED' });

        const response = await request(getApp())
          .get(`/api/v1/reviews/stats/${teacher.id}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.total).toBe(8);
        expect(response.body.data.distribution).toMatchObject({
          '1': 1,
          '2': 1,
          '3': 1,
          '4': 3,
          '5': 2,
        });
      });

      it('should return average with proper rounding', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({ name: 'Student' });

        await createTestReview(student.id, teacher.id, { rating: 5, status: 'APPROVED' });
        await createTestReview(student.id, teacher.id, { rating: 5, status: 'APPROVED' });
        await createTestReview(student.id, teacher.id, { rating: 4, status: 'APPROVED' });

        const response = await request(getApp())
          .get(`/api/v1/reviews/stats/${teacher.id}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.average).toBeCloseTo(4.67, 1);
      });
    });

    describe('Failed Cases', () => {
      it('should return zero stats for non-existent teacher', async () => {
        const fakeTeacherId = '00000000-0000-0000-0000-000000000000';

        const response = await request(getApp())
          .get(`/api/v1/reviews/stats/${fakeTeacherId}`)
          .expect(200);

        // API returns zero stats instead of 404 for non-existent teachers
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          teacherId: fakeTeacherId,
          total: 0,
          average: 0,
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle teacher with only pending/rejected reviews', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({ name: 'Student' });

        await createTestReview(student.id, teacher.id, { rating: 5, status: 'PENDING' });
        await createTestReview(student.id, teacher.id, { rating: 4, status: 'REJECTED' });

        const response = await request(getApp())
          .get(`/api/v1/reviews/stats/${teacher.id}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.total).toBe(0);
        expect(response.body.data.average).toBe(0);
        expect(response.body.data.distribution).toMatchObject({
          '1': 0,
          '2': 0,
          '3': 0,
          '4': 0,
          '5': 0,
        });
      });
    });
  });

  // ==================== POST /api/v1/reviews ====================

  describe('POST /api/v1/reviews - Create Review', () => {
    describe('Happy Path', () => {
      it('should create review with minimum required fields', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({
          name: 'Student User',
          role: UserRole.STUDENT,
        });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({
            email: student.email,
            password: student.password,
          })
          .expect(200);

        const response = await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            teacherId: teacher.id,
            overallRating: 5,
            content: 'Excellent teacher! Very knowledgeable.',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.code).toBe(201);
        expect(response.body.data).toMatchObject({
          teacherId: teacher.id,
          rating: 5,
          content: 'Excellent teacher! Very knowledgeable.',
        });
        expect(response.body.data.id).toBeDefined();
        expect(response.body.data.createdAt).toBeDefined();
      });

      it('should create review with all optional fields', async () => {
        const teacher = await createTestTeacher();
        const course = await createTestCourse(teacher.id);
        const student = await createTestUser({
          name: 'Student User',
          role: UserRole.STUDENT,
        });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({
            email: student.email,
            password: student.password,
          })
          .expect(200);

        const response = await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            teacherId: teacher.id,
            courseId: course.id,
            overallRating: 5,
            teachingRating: 5,
            courseRating: 4,
            communicationRating: 5,
            punctualityRating: 4,
            title: 'Amazing experience',
            content: 'Great teacher and course!',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          teacherId: teacher.id,
          rating: 5,
        });

        // Verify review exists in database
        const dbResult = await pool.query('SELECT * FROM reviews WHERE id = $1', [
          response.body.data.id,
        ]);
        expect(dbResult.rows).toHaveLength(1);
        // PostgreSQL DECIMAL type returns values as strings, need to parse
        expect(parseFloat(dbResult.rows[0].teaching_rating as string)).toBe(5);
        expect(parseFloat(dbResult.rows[0].course_rating as string)).toBe(4);
      });

      it('should create review with courseId', async () => {
        const teacher = await createTestTeacher();
        const course = await createTestCourse(teacher.id, 'Advanced Math');
        const student = await createTestUser({
          name: 'Student User',
          role: UserRole.STUDENT,
        });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({
            email: student.email,
            password: student.password,
          })
          .expect(200);

        const response = await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            teacherId: teacher.id,
            courseId: course.id,
            overallRating: 5,
            content: 'Excellent course!',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBeDefined();

        // Verify courseId is stored
        const dbResult = await pool.query('SELECT course_id FROM reviews WHERE id = $1', [
          response.body.data.id,
        ]);
        expect(dbResult.rows[0].course_id).toBe(course.id);
      });
    });

    describe('Authentication & Authorization', () => {
      it('should reject review creation without authentication', async () => {
        const teacher = await createTestTeacher();

        const response = await request(getApp())
          .post('/api/v1/reviews')
          .send({
            teacherId: teacher.id,
            overallRating: 5,
            content: 'Great teacher!',
          })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe(401);
        expect(response.body.message).toMatch(/authentication/i);
      });

      it('should reject review creation with invalid token', async () => {
        const teacher = await createTestTeacher();

        const response = await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', 'Bearer invalid-token')
          .send({
            teacherId: teacher.id,
            overallRating: 5,
            content: 'Great teacher!',
          })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe(401);
      });
    });

    describe('Validation Errors', () => {
      it('should reject review without teacherId', async () => {
        const student = await createTestUser({
          name: 'Student User',
          role: UserRole.STUDENT,
        });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({
            email: student.email,
            password: student.password,
          })
          .expect(200);

        const response = await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            overallRating: 5,
            content: 'Great teacher!',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe(400);
        expect(response.body.message).toBe('Teacher ID is required');
      });

      it('should reject review without overallRating', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({
          name: 'Student User',
          role: UserRole.STUDENT,
        });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({
            email: student.email,
            password: student.password,
          })
          .expect(200);

        const response = await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            teacherId: teacher.id,
            content: 'Great teacher!',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe(400);
        expect(response.body.message).toBe('Rating must be between 1 and 5');
      });

      it('should reject review with invalid rating (too high)', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({
          name: 'Student User',
          role: UserRole.STUDENT,
        });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({
            email: student.email,
            password: student.password,
          })
          .expect(200);

        const response = await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            teacherId: teacher.id,
            overallRating: 6,
            content: 'Great teacher!',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Rating must be between 1 and 5');
      });

      it('should reject review with invalid rating (too low)', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({
          name: 'Student User',
          role: UserRole.STUDENT,
        });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({
            email: student.email,
            password: student.password,
          })
          .expect(200);

        const response = await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            teacherId: teacher.id,
            overallRating: 0,
            content: 'Great teacher!',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Rating must be between 1 and 5');
      });

      it('should reject review without content', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({
          name: 'Student User',
          role: UserRole.STUDENT,
        });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({
            email: student.email,
            password: student.password,
          })
          .expect(200);

        const response = await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            teacherId: teacher.id,
            overallRating: 5,
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe(400);
        expect(response.body.message).toBe('Review content is required');
      });

      it('should reject review with empty content', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({
          name: 'Student User',
          role: UserRole.STUDENT,
        });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({
            email: student.email,
            password: student.password,
          })
          .expect(200);

        const response = await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            teacherId: teacher.id,
            overallRating: 5,
            content: '   ',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Review content is required');
      });

      it('should reject review with content exceeding max length', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({
          name: 'Student User',
          role: UserRole.STUDENT,
        });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({
            email: student.email,
            password: student.password,
          })
          .expect(200);

        const longContent = 'a'.repeat(2001);

        const response = await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            teacherId: teacher.id,
            overallRating: 5,
            content: longContent,
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('less than 2000 characters');
      });
    });

    describe('Duplicate Prevention', () => {
      it('should prevent duplicate review for same teacher', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({
          name: 'Student User',
          role: UserRole.STUDENT,
        });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({
            email: student.email,
            password: student.password,
          })
          .expect(200);

        // Create first review
        await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            teacherId: teacher.id,
            overallRating: 5,
            content: 'First review',
          })
          .expect(201);

        // Try to create second review
        const response = await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            teacherId: teacher.id,
            overallRating: 4,
            content: 'Second review',
          })
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe(409);
        expect(response.body.message).toBe('You have already reviewed this teacher');
      });

      it('should allow review for different teacher', async () => {
        const teacher1 = await createTestTeacher('Teacher One');
        const teacher2 = await createTestTeacher('Teacher Two');
        const student = await createTestUser({
          name: 'Student User',
          role: UserRole.STUDENT,
        });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({
            email: student.email,
            password: student.password,
          })
          .expect(200);

        // Create review for teacher1
        await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            teacherId: teacher1.id,
            overallRating: 5,
            content: 'Review for teacher1',
          })
          .expect(201);

        // Create review for teacher2 (should succeed)
        const response = await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            teacherId: teacher2.id,
            overallRating: 4,
            content: 'Review for teacher2',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('should trim content whitespace', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({
          name: 'Student User',
          role: UserRole.STUDENT,
        });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({
            email: student.email,
            password: student.password,
          })
          .expect(200);

        const response = await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            teacherId: teacher.id,
            overallRating: 5,
            content: '   Great teacher!   ',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.content).toBe('Great teacher!');

        // Verify in database
        const dbResult = await pool.query('SELECT content FROM reviews WHERE id = $1', [
          response.body.data.id,
        ]);
        expect(dbResult.rows[0].content).toBe('Great teacher!');
      });

      it('should handle special characters in content', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({
          name: 'Student User',
          role: UserRole.STUDENT,
        });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({
            email: student.email,
            password: student.password,
          })
          .expect(200);

        const response = await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            teacherId: teacher.id,
            overallRating: 5,
            content: '老师非常好！Amazing teacher! 🌟',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.content).toBe('老师非常好！Amazing teacher! 🌟');
      });

      it('should create review with minimal valid rating (1)', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({
          name: 'Student User',
          role: UserRole.STUDENT,
        });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({
            email: student.email,
            password: student.password,
          })
          .expect(200);

        const response = await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            teacherId: teacher.id,
            overallRating: 1,
            content: 'Poor experience',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.rating).toBe(1);
      });

      it('should create review with max valid rating (5)', async () => {
        const teacher = await createTestTeacher();
        const student = await createTestUser({
          name: 'Student User',
          role: UserRole.STUDENT,
        });

        const loginResponse = await request(getApp())
          .post('/api/v1/auth/login')
          .send({
            email: student.email,
            password: student.password,
          })
          .expect(200);

        const response = await request(getApp())
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
          .send({
            teacherId: teacher.id,
            overallRating: 5,
            content: 'Excellent experience',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.rating).toBe(5);
      });
    });
  });
});
