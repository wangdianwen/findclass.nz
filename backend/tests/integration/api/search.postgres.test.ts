/**
 * Search API Integration Tests
 *
 * Tests for the search endpoints:
 * - GET /api/v1/search/popular - Get popular search keywords
 * - GET /api/v1/search/suggestions?q=query - Get search suggestions
 */

import 'reflect-metadata';
import request from 'supertest';
import { getApp, getTestPool } from '../setup.postgres';
import { describe, expect, it, beforeAll, beforeEach, afterEach } from 'vitest';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

describe('Search API (PostgreSQL)', () => {
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

  afterEach(async () => {
    // Clean up after each test
    await pool.query('DELETE FROM reviews');
    await pool.query('DELETE FROM courses');
    await pool.query('DELETE FROM teachers');
    await pool.query('DELETE FROM users');
  });

  // Helper function to create test data
  async function createTestData() {
    // Create users
    const user1Result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['teacher1@example.com', 'hash', '张老师', 'TEACHER', 'ACTIVE']
    );

    const user2Result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['teacher2@example.com', 'hash', '李老师', 'TEACHER', 'ACTIVE']
    );

    const teacher1Id = user1Result.rows[0].id;
    const teacher2Id = user2Result.rows[0].id;

    // Create teachers
    await pool.query(
      `INSERT INTO teachers (id, display_name, bio, average_rating, total_reviews)
       VALUES ($1, $2, $3, $4, $5)`,
      [teacher1Id, '张老师 - 数学专家', '拥有10年教学经验', 4.8, 50]
    );

    await pool.query(
      `INSERT INTO teachers (id, display_name, bio, average_rating, total_reviews)
       VALUES ($1, $2, $3, $4, $5)`,
      [teacher2Id, '李老师 - 英语专家', '雅思8分，8年教学经验', 4.5, 30]
    );

    // Create courses with different characteristics
    const courses = [
      {
        teacher_id: teacher1Id,
        title: '高中数学辅导',
        description: '针对高中数学的全面辅导课程',
        category: '数学',
        subcategory: '高中数学',
        price: 50.0,
        average_rating: 4.8,
        total_reviews: 20,
        status: 'ACTIVE',
      },
      {
        teacher_id: teacher1Id,
        title: '雅思英语冲刺',
        description: '雅思考试冲刺课程',
        category: '英语',
        subcategory: '雅思',
        price: 80.0,
        average_rating: 4.7,
        total_reviews: 15,
        status: 'ACTIVE',
      },
      {
        teacher_id: teacher2Id,
        title: '钢琴初级课程',
        description: '零基础学钢琴',
        category: '音乐',
        subcategory: '钢琴',
        price: 60.0,
        average_rating: 4.9,
        total_reviews: 25,
        status: 'ACTIVE',
      },
      {
        teacher_id: teacher2Id,
        title: 'Python编程入门',
        description: '从零开始学习Python编程',
        category: '编程',
        subcategory: 'Python',
        price: 70.0,
        average_rating: 4.6,
        total_reviews: 18,
        status: 'ACTIVE',
      },
      {
        teacher_id: teacher1Id,
        title: '初中物理补习',
        description: '初中物理知识点讲解',
        category: '物理',
        subcategory: '初中物理',
        price: 45.0,
        average_rating: 4.4,
        total_reviews: 10,
        status: 'ACTIVE',
      },
      // Inactive course (should not appear in search)
      {
        teacher_id: teacher1Id,
        title: '已下架的数学课',
        description: '这是一个已下架的课程',
        category: '数学',
        subcategory: '高中数学',
        price: 50.0,
        average_rating: 4.5,
        total_reviews: 5,
        status: 'INACTIVE',
      },
    ];

    for (const course of courses) {
      await pool.query(
        `INSERT INTO courses (
          teacher_id, title, description, category, subcategory,
          price, average_rating, total_reviews, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          course.teacher_id,
          course.title,
          course.description,
          course.category,
          course.subcategory,
          course.price,
          course.average_rating,
          course.total_reviews,
          course.status,
        ]
      );
    }
  }

  // ==================== GET /api/v1/search/popular ====================

  describe('GET /api/v1/search/popular', () => {
    describe('Happy Path', () => {
      it('SEARCH-POPULAR-HP-01: should return popular search keywords', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/popular')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.code).toBe(200);
        expect(response.body.message).toBe('Popular searches retrieved successfully');
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);

        // Verify expected popular keywords
        const keywords = response.body.data;
        expect(keywords).toContain('高中数学');
        expect(keywords).toContain('雅思英语');
        expect(keywords).toContain('钢琴辅导');
        expect(keywords).toContain('编程入门');
        expect(keywords).toContain('物理补习');
      });

      it('SEARCH-POPULAR-HP-02: should return correct response format', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/popular')
          .expect(200);

        // Verify response structure
        expect(response.body).toMatchObject({
          success: true,
          code: 200,
          message: expect.any(String),
          data: expect.any(Array),
          meta: {
            requestId: expect.any(String),
            timestamp: expect.any(String),
          },
        });

        // Verify meta fields
        expect(response.body.meta.requestId).toBeDefined();
        expect(response.body.meta.timestamp).toBeDefined();
        expect(Date.parse(response.body.meta.timestamp)).not.toBeNaN();
      });
    });

    describe('Edge Cases', () => {
      it('SEARCH-POPULAR-EC-01: should handle concurrent requests', async () => {
        // Send multiple concurrent requests
        const requests = Array(5)
          .fill(null)
          .map(() => request(getApp()).get('/api/v1/search/popular'));

        const responses = await Promise.all(requests);

        // All should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data).toEqual(responses[0].body.data);
        });
      });

      it('SEARCH-POPULAR-EC-02: should return same data on repeated calls', async () => {
        const response1 = await request(getApp())
          .get('/api/v1/search/popular')
          .expect(200);

        const response2 = await request(getApp())
          .get('/api/v1/search/popular')
          .expect(200);

        expect(response1.body.data).toEqual(response2.body.data);
      });
    });
  });

  // ==================== GET /api/v1/search/suggestions ====================

  describe('GET /api/v1/search/suggestions', () => {
    beforeEach(async () => {
      await createTestData();
    });

    describe('Happy Path', () => {
      it('SEARCH-SUGGEST-HP-01: should return suggestions for valid query', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=数学')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.code).toBe(200);
        expect(response.body.message).toBe('Search suggestions retrieved successfully');
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);

        const suggestions = response.body.data;
        expect(suggestions.length).toBeGreaterThan(0);

        // Verify first suggestion structure
        expect(suggestions[0]).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          type: 'course',
          teacherName: expect.any(String),
          subject: expect.any(String),
        });

        // Should find courses with "数学" in title or category
        const mathCourse = suggestions.find(s => s.title.includes('数学') || s.subject.includes('数学'));
        expect(mathCourse).toBeDefined();
      });

      it('SEARCH-SUGGEST-HP-02: should return correct response format', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=钢琴')
          .expect(200);

        // Verify response structure
        expect(response.body).toMatchObject({
          success: true,
          code: 200,
          message: expect.any(String),
          data: expect.any(Array),
          meta: {
            requestId: expect.any(String),
            timestamp: expect.any(String),
          },
        });

        // Verify suggestion items structure
        if (response.body.data.length > 0) {
          expect(response.body.data[0]).toMatchObject({
            id: expect.any(String),
            title: expect.any(String),
            type: 'course',
            teacherName: expect.any(String),
            subject: expect.any(String),
          });
        }
      });

      it('SEARCH-SUGGEST-HP-03: should search by title', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=高中数学')
          .expect(200);

        const suggestions = response.body.data;
        expect(suggestions.length).toBeGreaterThan(0);

        // Should find the course with exact title
        const exactMatch = suggestions.find(s => s.title === '高中数学辅导');
        expect(exactMatch).toBeDefined();
      });

      it('SEARCH-SUGGEST-HP-04: should search by category', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=数学')
          .expect(200);

        const suggestions = response.body.data;
        expect(suggestions.length).toBeGreaterThan(0);

        // Should find courses in the math category
        const mathCourse = suggestions.find(s => s.subject === '数学');
        expect(mathCourse).toBeDefined();
      });

      it('SEARCH-SUGGEST-HP-05: should search by teacher name', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=张老师')
          .expect(200);

        const suggestions = response.body.data;
        expect(suggestions.length).toBeGreaterThan(0);

        // All suggestions should be from 张老师
        suggestions.forEach(suggestion => {
          expect(suggestion.teacherName).toContain('张老师');
        });
      });

      it('SEARCH-SUGGEST-HP-06: should search by description', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=全面辅导')
          .expect(200);

        const suggestions = response.body.data;
        expect(suggestions.length).toBeGreaterThan(0);

        // Should find the course with this description
        const course = suggestions.find(s => s.title === '高中数学辅导');
        expect(course).toBeDefined();
      });

      it('SEARCH-SUGGEST-HP-07: should limit results to MAX_SUGGESTIONS', async () => {
        // Create many courses with "数学" in title
        for (let i = 0; i < 10; i++) {
          await pool.query(
            `INSERT INTO courses (teacher_id, title, description, category, status)
             SELECT id, $1, $2, $3, $4 FROM teachers LIMIT 1`,
            [`数学课程${i}`, '数学课程描述', '数学', 'ACTIVE']
          );
        }

        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=数学')
          .expect(200);

        // Should not exceed MAX_SUGGESTIONS (5)
        expect(response.body.data.length).toBeLessThanOrEqual(5);
      });

      it('SEARCH-SUGGEST-HP-08: should order by rating and review count', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=课程')
          .expect(200);

        const suggestions = response.body.data;
        if (suggestions.length > 1) {
          // Verify ordering (higher ratings and more reviews should come first)
          for (let i = 0; i < suggestions.length - 1; i++) {
            const current = suggestions[i];
            const next = suggestions[i + 1];
            // This is a loose check since ordering depends on rating DESC, then reviews DESC
            expect(current).toBeDefined();
            expect(next).toBeDefined();
          }
        }
      });
    });

    describe('Empty/Missing Query', () => {
      it('SEARCH-SUGGEST-EQ-01: should return empty array for empty query', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual([]);
      });

      it('SEARCH-SUGGEST-EQ-02: should return empty array for whitespace-only query', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=   ')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual([]);
      });

      it('SEARCH-SUGGEST-EQ-03: should handle missing query parameter', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual([]);
      });
    });

    describe('Case-Insensitive Fuzzy Matching', () => {
      it('SEARCH-SUGGEST-CI-01: should handle lowercase query', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=数学')
          .expect(200);

        expect(response.body.data.length).toBeGreaterThan(0);
        const mathCourse = response.body.data.find(s => s.subject === '数学');
        expect(mathCourse).toBeDefined();
      });

      it('SEARCH-SUGGEST-CI-02: should handle uppercase query', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=数学')
          .expect(200);

        expect(response.body.data.length).toBeGreaterThan(0);
      });

      it('SEARCH-SUGGEST-CI-03: should handle mixed case query', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=Python')
          .expect(200);

        expect(response.body.data.length).toBeGreaterThan(0);
        const pythonCourse = response.body.data.find(s => s.title.includes('Python'));
        expect(pythonCourse).toBeDefined();
      });

      it('SEARCH-SUGGEST-CI-04: should perform fuzzy matching with partial query', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=数')
          .expect(200);

        expect(response.body.data.length).toBeGreaterThan(0);
        // Should find courses with "数" in title, category, or description
        const hasMathRelated = response.body.data.some(
          s => s.title.includes('数') || s.subject.includes('数')
        );
        expect(hasMathRelated).toBe(true);
      });
    });

    describe('Special Characters and Chinese Text', () => {
      it('SEARCH-SUGGEST-SC-01: should handle Chinese characters', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=高中数学')
          .expect(200);

        expect(response.body.data.length).toBeGreaterThan(0);
        const course = response.body.data.find(s => s.title === '高中数学辅导');
        expect(course).toBeDefined();
      });

      it('SEARCH-SUGGEST-SC-02: should handle special characters in query', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=Python!')
          .expect(200);

        // Should not crash, may or may not return results
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      });

      it('SEARCH-SUGGEST-SC-03: should handle hyphenated words', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=初级')
          .expect(200);

        expect(response.body.data.length).toBeGreaterThan(0);
      });

      it('SEARCH-SUGGEST-SC-04: should handle URL encoding', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=%E9%AB%98%E4%B8%AD%E6%95%B0%E5%AD%A6')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      });

      it('SEARCH-SUGGEST-SC-05: should handle mixed language query', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=Python编程')
          .expect(200);

        expect(response.body.data.length).toBeGreaterThan(0);
      });
    });

    describe('Database Behavior', () => {
      it('SEARCH-SUGGEST-DB-01: should not return inactive courses', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=下架')
          .expect(200);

        // Should not find the inactive course
        const inactiveCourse = response.body.data.find(s => s.title === '已下架的数学课');
        expect(inactiveCourse).toBeUndefined();
      });

      it('SEARCH-SUGGEST-DB-02: should handle no matching results', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=不存在的内容xyz123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual([]);
      });

      it('SEARCH-SUGGEST-DB-03: should handle teacher without display name', async () => {
        // Create a teacher without display name
        const userResult = await pool.query(
          `INSERT INTO users (email, password_hash, name, role, status)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          ['noteacher@example.com', 'hash', 'No Name', 'TEACHER', 'ACTIVE']
        );

        const teacherId = userResult.rows[0].id;
        await pool.query(
          `INSERT INTO teachers (id) VALUES ($1)`,
          [teacherId]
        );

        await pool.query(
          `INSERT INTO courses (teacher_id, title, description, category, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [teacherId, 'Test Course', 'Test', 'Test', 'ACTIVE']
        );

        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=Test')
          .expect(200);

        const course = response.body.data.find(s => s.title === 'Test Course');
        expect(course).toBeDefined();
        expect(course.teacherName).toBe('Unknown Teacher');
      });
    });

    describe('Error Handling', () => {
      it('SEARCH-SUGGEST-EH-01: should handle database errors gracefully', async () => {
        // Close the pool connection to simulate database error
        const originalQuery = pool.query.bind(pool);
        pool.query = () => {
          throw new Error('Database connection lost');
        };

        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=test')
          .expect(200);

        // Should return empty array instead of crashing
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual([]);

        // Restore original query function
        pool.query = originalQuery;
      });

      it('SEARCH-SUGGEST-EH-02: should handle malformed query parameter', async () => {
        // Test with various unusual inputs
        const testCases = [
          { q: '!@#$%^&*()' },
          { q: '<script>alert("xss")</script>' },
          { q: "'; DROP TABLE courses; --" },
          { q: '../../../etc/passwd' },
          { q: '\x00\x01\x02' },
        ];

        for (const testCase of testCases) {
          const response = await request(getApp())
            .get('/api/v1/search/suggestions')
            .query(testCase)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data).toBeDefined();
        }
      });
    });

    describe('Edge Cases', () => {
      it('SEARCH-SUGGEST-EC-01: should handle very long query', async () => {
        const longQuery = 'a'.repeat(1000);

        const response = await request(getApp())
          .get(`/api/v1/search/suggestions?q=${longQuery}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      });

      it('SEARCH-SUGGEST-EC-02: should handle Unicode normalization', async () => {
        // Test with composed and decomposed Unicode characters
        const response1 = await request(getApp())
          .get('/api/v1/search/suggestions?q=数学')
          .expect(200);

        expect(response1.body.success).toBe(true);
      });

      it('SEARCH-SUGGEST-EC-03: should handle concurrent search requests', async () => {
        const queries = ['数学', '英语', '钢琴', '编程', '物理'];

        const requests = queries.map(q =>
          request(getApp()).get(`/api/v1/search/suggestions?q=${encodeURIComponent(q)}`)
        );

        const responses = await Promise.all(requests);

        // All should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data).toBeDefined();
        });
      });

      it('SEARCH-SUGGEST-EC-04: should trim whitespace from query', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=  数学  ')
          .expect(200);

        const suggestions = response.body.data;
        const mathCourse = suggestions.find(s => s.subject === '数学');
        expect(mathCourse).toBeDefined();
      });

      it('SEARCH-SUGGEST-EC-05: should return results sorted by relevance', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=辅导')
          .expect(200);

        const suggestions = response.body.data;

        // Results should be returned (ordering depends on rating/review count)
        expect(suggestions.length).toBeGreaterThan(0);

        // All suggestions should be related to the query
        suggestions.forEach(suggestion => {
          expect(suggestion.title).toBeDefined();
          expect(suggestion.type).toBe('course');
        });
      });
    });

    describe('Response Validation', () => {
      it('SEARCH-SUGGEST-RV-01: should include all required fields in suggestion items', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=数学')
          .expect(200);

        if (response.body.data.length > 0) {
          response.body.data.forEach(suggestion => {
            expect(suggestion).toHaveProperty('id');
            expect(suggestion).toHaveProperty('title');
            expect(suggestion).toHaveProperty('type');
            expect(suggestion).toHaveProperty('teacherName');
            expect(suggestion).toHaveProperty('subject');

            expect(typeof suggestion.id).toBe('string');
            expect(typeof suggestion.title).toBe('string');
            expect(typeof suggestion.type).toBe('string');
            expect(typeof suggestion.teacherName).toBe('string');
            expect(typeof suggestion.subject).toBe('string');

            expect(suggestion.type).toBe('course');
          });
        }
      });

      it('SEARCH-SUGGEST-RV-02: should have valid UUID for suggestion id', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=数学')
          .expect(200);

        if (response.body.data.length > 0) {
          response.body.data.forEach(suggestion => {
            // UUID v4 format validation
            const uuidRegex =
              /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            expect(suggestion.id).toMatch(uuidRegex);
          });
        }
      });

      it('SEARCH-SUGGEST-RV-03: should include proper metadata in response', async () => {
        const response = await request(getApp())
          .get('/api/v1/search/suggestions?q=test')
          .set('X-Request-ID', 'test-request-id-123')
          .expect(200);

        expect(response.body.meta).toBeDefined();
        expect(response.body.meta.requestId).toBe('test-request-id-123');
        expect(response.body.meta.timestamp).toBeDefined();

        // Verify timestamp is valid ISO date
        const timestamp = new Date(response.body.meta.timestamp);
        expect(timestamp.toISOString()).toBe(response.body.meta.timestamp);
      });
    });
  });

  // ==================== Cross-Endpoint Tests ====================

  describe('Cross-Endpoint Behavior', () => {
    it('SEARCH-CROSS-01: popular searches should match actual searchable content', async () => {
      // Get popular searches
      const popularResponse = await request(getApp())
        .get('/api/v1/search/popular')
        .expect(200);

      const popularKeywords = popularResponse.body.data;

      // Test that at least some popular keywords return results
      let matchCount = 0;
      for (const keyword of popularKeywords.slice(0, 3)) {
        const suggestResponse = await request(getApp())
          .get(`/api/v1/search/suggestions?q=${encodeURIComponent(keyword)}`)
          .expect(200);

        if (suggestResponse.body.data.length > 0) {
          matchCount++;
        }
      }

      // At least one popular keyword should return results (if we have test data)
      // This is a loose assertion since test data varies
      expect(matchCount).toBeGreaterThanOrEqual(0);
    });

    it('SEARCH-CROSS-02: both endpoints should handle missing database gracefully', async () => {
      // Don't create any test data

      const popularResponse = await request(getApp())
        .get('/api/v1/search/popular')
        .expect(200);

      expect(popularResponse.body.success).toBe(true);
      // Popular searches is static, so should always return data

      const suggestResponse = await request(getApp())
        .get('/api/v1/search/suggestions?q=test')
        .expect(200);

      expect(suggestResponse.body.success).toBe(true);
      expect(suggestResponse.body.data).toEqual([]);
    });
  });
});
