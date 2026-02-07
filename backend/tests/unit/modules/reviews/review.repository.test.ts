/**
 * Reviews Repository Unit Tests - PostgreSQL Version
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';

// Mock logger
vi.mock('@core/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks are set up
import {
  ReviewRepository,
  type ReviewRow,
  type UserRow,
  type CourseRow,
} from '@modules/reviews/review.repository';
import type { Review, ReviewStatistics, CreateReviewDTO, ReviewStatus, ReviewFilters } from '@modules/reviews/types';

describe('ReviewRepository (PostgreSQL)', () => {
  let mockPool: any;
  let repository: ReviewRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {
      query: vi.fn(),
    };
    repository = new ReviewRepository(mockPool as unknown as Pool);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Mock Data ====================

  function createMockReviewRow(overrides: Partial<ReviewRow> = {}): ReviewRow {
    return {
      id: 'rev_test123',
      user_id: 'usr_test123',
      course_id: 'crs_test123',
      teacher_id: 'tch_test123',
      booking_id: 'bkg_test123',
      overall_rating: 5,
      teaching_rating: 5,
      course_rating: 4,
      communication_rating: 5,
      punctuality_rating: 4,
      title: 'Excellent teacher',
      content: 'Great teaching style, very knowledgeable',
      status: 'APPROVED' as ReviewStatus,
      helpful_count: 10,
      reply_content: null,
      reply_created_at: null,
      created_at: new Date('2024-01-01T10:00:00Z'),
      updated_at: new Date('2024-01-01T10:00:00Z'),
      ...overrides,
    };
  }

  function createMockUserRow(overrides: Partial<UserRow> = {}): UserRow {
    return {
      id: 'usr_test123',
      name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      ...overrides,
    };
  }

  function createMockCourseRow(overrides: Partial<CourseRow> = {}): CourseRow {
    return {
      id: 'crs_test123',
      title: 'Math Course',
      ...overrides,
    };
  }

  // ==================== findById ====================

  describe('findById', () => {
    it('should return review with user and course data when found', async () => {
      const mockReviewRow = createMockReviewRow();
      const mockUserRow = createMockUserRow();
      const mockCourseRow = createMockCourseRow();

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM reviews WHERE id = $1')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT id, name, avatar_url FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [mockUserRow] });
        }
        if (query.includes('SELECT title FROM courses WHERE id = $1')) {
          return Promise.resolve({ rows: [mockCourseRow] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findById('rev_test123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('rev_test123');
      expect(result?.userId).toBe('usr_test123');
      expect(result?.userName).toBe('Test User');
      expect(result?.userAvatar).toBe('https://example.com/avatar.jpg');
      expect(result?.courseId).toBe('crs_test123');
      expect(result?.courseName).toBe('Math Course');
      expect(result?.teacherId).toBe('tch_test123');
      expect(result?.overallRating).toBe(5);
      expect(result?.content).toBe('Great teaching style, very knowledgeable');
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM reviews WHERE id = $1', ['rev_test123']);
    });

    it('should return null when review not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM reviews WHERE id = $1', ['nonexistent']);
    });

    it('should handle review without user data (Anonymous)', async () => {
      const mockReviewRow = createMockReviewRow();
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM reviews WHERE id = $1')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT id, name, avatar_url FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findById('rev_test123');

      expect(result?.userName).toBe('Anonymous');
      expect(result?.userAvatar).toBeUndefined();
    });

    it('should handle review without course', async () => {
      const mockReviewRow = createMockReviewRow({ course_id: null });
      const mockUserRow = createMockUserRow();

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM reviews WHERE id = $1')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT id, name, avatar_url FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [mockUserRow] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findById('rev_test123');

      expect(result?.courseId).toBeUndefined();
      expect(result?.courseName).toBeUndefined();
    });

    it('should handle review with reply', async () => {
      const mockReviewRow = createMockReviewRow({
        reply_content: 'Thank you for your feedback!',
        reply_created_at: new Date('2024-01-02T10:00:00Z'),
      });
      const mockUserRow = createMockUserRow();

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM reviews WHERE id = $1')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT id, name, avatar_url FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [mockUserRow] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findById('rev_test123');

      expect(result?.reply).toBeDefined();
      expect(result?.reply?.id).toBe('rev_test123-reply');
      expect(result?.reply?.reviewId).toBe('rev_test123');
      expect(result?.reply?.teacherId).toBe('tch_test123');
      expect(result?.reply?.content).toBe('Thank you for your feedback!');
      expect(result?.reply?.createdAt).toEqual(new Date('2024-01-02T10:00:00Z'));
    });

    it('should map all rating fields correctly', async () => {
      const mockReviewRow = createMockReviewRow();
      const mockUserRow = createMockUserRow();

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM reviews WHERE id = $1')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT id, name, avatar_url FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [mockUserRow] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findById('rev_test123');

      expect(result?.overallRating).toBe(5);
      expect(result?.teachingRating).toBe(5);
      expect(result?.courseRating).toBe(4);
      expect(result?.communicationRating).toBe(5);
      expect(result?.punctualityRating).toBe(4);
    });

    it('should handle null optional rating fields', async () => {
      const mockReviewRow = createMockReviewRow({
        teaching_rating: null,
        course_rating: null,
        communication_rating: null,
        punctuality_rating: null,
      });
      const mockUserRow = createMockUserRow();

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM reviews WHERE id = $1')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT id, name, avatar_url FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [mockUserRow] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findById('rev_test123');

      expect(result?.teachingRating).toBeUndefined();
      expect(result?.courseRating).toBeUndefined();
      expect(result?.communicationRating).toBeUndefined();
      expect(result?.punctualityRating).toBeUndefined();
    });

    it('should handle review without title', async () => {
      const mockReviewRow = createMockReviewRow({ title: null });
      const mockUserRow = createMockUserRow();

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM reviews WHERE id = $1')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT id, name, avatar_url FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [mockUserRow] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findById('rev_test123');

      expect(result?.title).toBeUndefined();
    });
  });

  // ==================== findAll ====================

  describe('findAll', () => {
    it('should return all approved reviews with pagination when no filters provided', async () => {
      const mockRows = [
        createMockReviewRow({ id: 'rev_1' }),
        createMockReviewRow({ id: 'rev_2' }),
        createMockReviewRow({ id: 'rev_3' }),
      ];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '3' }] });
        }
        if (query.includes('SELECT r.* FROM reviews r')) {
          return Promise.resolve({ rows: mockRows });
        }
        if (query.includes('SELECT name, avatar_url FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [{ name: 'Test User', avatar_url: null }] });
        }
        if (query.includes('SELECT title FROM courses WHERE id = $1')) {
          return Promise.resolve({ rows: [{ title: 'Math Course' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findAll({ page: 1, limit: 10 });

      expect(result.reviews).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.reviews[0].id).toBe('rev_1');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'APPROVED'"),
        expect.any(Array)
      );
    });

    it('should filter by teacherId', async () => {
      const mockRows = [createMockReviewRow({ id: 'rev_1', teacher_id: 'tch_filter123' })];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        if (query.includes('SELECT r.* FROM reviews r')) {
          return Promise.resolve({ rows: mockRows });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findAll({ teacherId: 'tch_filter123' });

      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].teacherId).toBe('tch_filter123');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('r.teacher_id = $'),
        expect.arrayContaining(['tch_filter123'])
      );
    });

    it('should filter by courseId', async () => {
      const mockRows = [createMockReviewRow({ id: 'rev_1', course_id: 'crs_filter123' })];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        if (query.includes('SELECT r.* FROM reviews r')) {
          return Promise.resolve({ rows: mockRows });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findAll({ courseId: 'crs_filter123' });

      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].courseId).toBe('crs_filter123');
    });

    it('should filter by status', async () => {
      const mockRows = [createMockReviewRow({ id: 'rev_1', status: 'PENDING' as ReviewStatus })];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        if (query.includes('SELECT r.* FROM reviews r')) {
          return Promise.resolve({ rows: mockRows });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findAll({ status: 'PENDING' });

      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].status).toBe('PENDING');
    });

    it('should filter by minRating', async () => {
      const mockRows = [createMockReviewRow({ id: 'rev_1', overall_rating: 4 })];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        if (query.includes('SELECT r.* FROM reviews r')) {
          return Promise.resolve({ rows: mockRows });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findAll({ minRating: 4 });

      expect(result.reviews).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('r.overall_rating >= $'),
        expect.arrayContaining([4])
      );
    });

    it('should filter by maxRating', async () => {
      const mockRows = [createMockReviewRow({ id: 'rev_1', overall_rating: 3 })];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        if (query.includes('SELECT r.* FROM reviews r')) {
          return Promise.resolve({ rows: mockRows });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findAll({ maxRating: 3 });

      expect(result.reviews).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('r.overall_rating <= $'),
        expect.arrayContaining([3])
      );
    });

    it('should apply multiple filters together', async () => {
      const mockRows = [
        createMockReviewRow({
          id: 'rev_1',
          teacher_id: 'tch_test123',
          course_id: 'crs_test123',
          status: 'APPROVED' as ReviewStatus,
          overall_rating: 4,
        }),
      ];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        if (query.includes('SELECT r.* FROM reviews r')) {
          return Promise.resolve({ rows: mockRows });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findAll({
        teacherId: 'tch_test123',
        courseId: 'crs_test123',
        minRating: 3,
        maxRating: 5,
      });

      expect(result.reviews).toHaveLength(1);
    });

    it('should sort by helpful when sortBy is "helpful"', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        if (query.includes('SELECT r.* FROM reviews r')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await repository.findAll({ sortBy: 'helpful' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY r.helpful_count DESC, r.created_at DESC'),
        expect.any(Array)
      );
    });

    it('should sort by recent when sortBy is "recent"', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        if (query.includes('SELECT r.* FROM reviews r')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await repository.findAll({ sortBy: 'recent' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY r.created_at DESC'),
        expect.any(Array)
      );
    });

    it('should calculate offset correctly for pagination', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '25' }] });
        }
        if (query.includes('SELECT r.* FROM reviews r')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await repository.findAll({ page: 2, limit: 10 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $'),
        expect.arrayContaining([10, 10]) // limit 10, offset 10
      );
    });

    it('should return empty array when no reviews match', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '0' }] });
        }
        if (query.includes('SELECT r.* FROM reviews r')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findAll({ teacherId: 'nonexistent' });

      expect(result.reviews).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should load user and course data for all reviews', async () => {
      const mockRows = [
        createMockReviewRow({ id: 'rev_1', user_id: 'usr_1', course_id: 'crs_1' }),
        createMockReviewRow({ id: 'rev_2', user_id: 'usr_2', course_id: 'crs_2' }),
      ];

      mockPool.query.mockImplementation((query: string, params: any[]) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '2' }] });
        }
        if (query.includes('SELECT r.* FROM reviews r')) {
          return Promise.resolve({ rows: mockRows });
        }
        if (query.includes('SELECT name, avatar_url FROM users WHERE id = $1')) {
          const userId = params[0];
          return Promise.resolve({
            rows: [{ name: `User ${userId}`, avatar_url: null }],
          });
        }
        if (query.includes('SELECT title FROM courses WHERE id = $1')) {
          const courseId = params[0];
          return Promise.resolve({
            rows: [{ title: `Course ${courseId}` }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findAll();

      expect(result.reviews).toHaveLength(2);
      expect(result.reviews[0].userName).toBeDefined();
      expect(result.reviews[1].userName).toBeDefined();
    });
  });

  // ==================== findByUserId ====================

  describe('findByUserId', () => {
    it('should return user reviews ordered by created_at DESC', async () => {
      const mockRows = [
        createMockReviewRow({ id: 'rev_2', created_at: new Date('2024-01-02T10:00:00Z') }),
        createMockReviewRow({ id: 'rev_1', created_at: new Date('2024-01-01T10:00:00Z') }),
      ];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM reviews WHERE user_id = $1')) {
          return Promise.resolve({ rows: mockRows });
        }
        if (query.includes('SELECT title FROM courses WHERE id = $1')) {
          return Promise.resolve({ rows: [{ title: 'Math Course' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findByUserId('usr_test123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('rev_2');
      expect(result[1].id).toBe('rev_1');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM reviews WHERE user_id = $1 ORDER BY created_at DESC',
        ['usr_test123']
      );
    });

    it('should return empty array when user has no reviews', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.findByUserId('usr_no_reviews');

      expect(result).toEqual([]);
    });

    it('should return all reviews for user regardless of status', async () => {
      const mockRows = [
        createMockReviewRow({ id: 'rev_1', status: 'PENDING' as ReviewStatus }),
        createMockReviewRow({ id: 'rev_2', status: 'APPROVED' as ReviewStatus }),
        createMockReviewRow({ id: 'rev_3', status: 'REJECTED' as ReviewStatus }),
      ];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM reviews WHERE user_id = $1')) {
          return Promise.resolve({ rows: mockRows });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findByUserId('usr_test123');

      expect(result).toHaveLength(3);
    });

    it('should handle reviews without courses', async () => {
      const mockRows = [createMockReviewRow({ id: 'rev_1', course_id: null })];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM reviews WHERE user_id = $1')) {
          return Promise.resolve({ rows: mockRows });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findByUserId('usr_test123');

      expect(result).toHaveLength(1);
      expect(result[0].courseId).toBeUndefined();
      expect(result[0].courseName).toBeUndefined();
    });
  });

  // ==================== findByTeacherId ====================

  describe('findByTeacherId', () => {
    it('should return teacher reviews with pagination', async () => {
      const mockRows = [
        createMockReviewRow({ id: 'rev_1', teacher_id: 'tch_test123' }),
        createMockReviewRow({ id: 'rev_2', teacher_id: 'tch_test123' }),
      ];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '2' }] });
        }
        if (query.includes('SELECT * FROM reviews')) {
          return Promise.resolve({ rows: mockRows });
        }
        if (query.includes('SELECT name, avatar_url FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [{ name: 'Test User', avatar_url: null }] });
        }
        if (query.includes('SELECT title FROM courses WHERE id = $1')) {
          return Promise.resolve({ rows: [{ title: 'Math Course' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findByTeacherId('tch_test123', 1, 10);

      expect(result.reviews).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE teacher_id = $1'),
        ['tch_test123']
      );
    });

    it('should filter by status when provided', async () => {
      const mockRows = [createMockReviewRow({ id: 'rev_1', status: 'PENDING' as ReviewStatus })];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        if (query.includes('SELECT * FROM reviews')) {
          return Promise.resolve({ rows: mockRows });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findByTeacherId('tch_test123', 1, 10, 'PENDING');

      expect(result.reviews).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE teacher_id = $1 AND status = $2'),
        ['tch_test123', 'PENDING']
      );
    });

    it('should return all statuses when status not provided', async () => {
      const mockRows = [
        createMockReviewRow({ id: 'rev_1', status: 'PENDING' as ReviewStatus }),
        createMockReviewRow({ id: 'rev_2', status: 'APPROVED' as ReviewStatus }),
      ];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '2' }] });
        }
        if (query.includes('SELECT * FROM reviews')) {
          return Promise.resolve({ rows: mockRows });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findByTeacherId('tch_test123');

      expect(result.reviews).toHaveLength(2);
    });

    it('should paginate correctly', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '25' }] });
        }
        if (query.includes('SELECT * FROM reviews')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findByTeacherId('tch_test123', 2, 10);

      expect(result.total).toBe(25);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $'),
        expect.arrayContaining(['tch_test123', 10, 10])
      );
    });

    it('should return empty array when teacher has no reviews', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '0' }] });
        }
        if (query.includes('SELECT * FROM reviews')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.findByTeacherId('tch_no_reviews');

      expect(result.reviews).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ==================== create ====================

  describe('create', () => {
    it('should create review successfully', async () => {
      // Mock with PENDING status as returned by database
      const mockReviewRow = createMockReviewRow({ status: 'PENDING' as ReviewStatus, helpful_count: 0 });
      const mockUserRow = createMockUserRow();
      const mockCourseRow = createMockCourseRow();

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('INSERT INTO reviews')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT name, avatar_url FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [mockUserRow] });
        }
        if (query.includes('SELECT title FROM courses WHERE id = $1')) {
          return Promise.resolve({ rows: [mockCourseRow] });
        }
        return Promise.resolve({ rows: [] });
      });

      const createDto: CreateReviewDTO = {
        teacherId: 'tch_test123',
        courseId: 'crs_test123',
        overallRating: 5,
        teachingRating: 5,
        courseRating: 4,
        title: 'Excellent teacher',
        content: 'Great teaching style',
      };

      const result = await repository.create('usr_test123', createDto);

      expect(result).toBeDefined();
      expect(result.teacherId).toBe('tch_test123');
      expect(result.overallRating).toBe(5);
      expect(result.status).toBe('PENDING');
      expect(result.helpfulCount).toBe(0);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reviews'),
        expect.arrayContaining([
          expect.any(String), // id (UUID)
          'usr_test123',
          'crs_test123',
          'tch_test123',
          5, // overallRating
          5, // teachingRating
          4, // courseRating
          null, // communicationRating
          null, // punctualityRating
          'Excellent teacher',
          'Great teaching style',
          'PENDING',
          0, // helpful_count
          expect.any(Date), // created_at
          expect.any(Date), // updated_at
        ])
      );
    });

    it('should create review without optional fields', async () => {
      const mockReviewRow = createMockReviewRow({
        course_id: null,
        booking_id: null,
        teaching_rating: null,
        course_rating: null,
        communication_rating: null,
        punctuality_rating: null,
        title: null,
      });
      const mockUserRow = createMockUserRow();

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('INSERT INTO reviews')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT name, avatar_url FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [mockUserRow] });
        }
        return Promise.resolve({ rows: [] });
      });

      const createDto: CreateReviewDTO = {
        teacherId: 'tch_test123',
        overallRating: 5,
        content: 'Great teacher',
      };

      const result = await repository.create('usr_test123', createDto);

      expect(result).toBeDefined();
      expect(result.courseId).toBeUndefined();
      expect(result.bookingId).toBeUndefined();
    });

    it('should set initial status to PENDING', async () => {
      const mockReviewRow = createMockReviewRow({ status: 'PENDING' as ReviewStatus });
      const mockUserRow = createMockUserRow();

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('INSERT INTO reviews')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT name, avatar_url FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [mockUserRow] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.create('usr_test123', {
        teacherId: 'tch_test123',
        overallRating: 5,
        content: 'Test',
      });

      expect(result.status).toBe('PENDING');
    });

    it('should set helpful_count to 0 initially', async () => {
      const mockReviewRow = createMockReviewRow({ helpful_count: 0 });
      const mockUserRow = createMockUserRow();

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('INSERT INTO reviews')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT name, avatar_url FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [mockUserRow] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.create('usr_test123', {
        teacherId: 'tch_test123',
        overallRating: 5,
        content: 'Test',
      });

      expect(result.helpfulCount).toBe(0);
    });

    it('should generate UUID for new review', async () => {
      const mockReviewRow = createMockReviewRow({ id: 'rev_new_uuid' });
      const mockUserRow = createMockUserRow();

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('INSERT INTO reviews')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT name, avatar_url FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [mockUserRow] });
        }
        return Promise.resolve({ rows: [] });
      });

      await repository.create('usr_test123', {
        teacherId: 'tch_test123',
        overallRating: 5,
        content: 'Test',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reviews'),
        expect.arrayContaining([expect.any(String)])
      );
    });
  });

  // ==================== updateStatus ====================

  describe('updateStatus', () => {
    it('should update review status successfully', async () => {
      const mockReviewRow = createMockReviewRow({ status: 'APPROVED' as ReviewStatus });
      const mockUserRow = createMockUserRow();

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('UPDATE reviews')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT * FROM reviews WHERE id = $1')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT id, name, avatar_url FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [mockUserRow] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.updateStatus('rev_test123', 'APPROVED');

      expect(result).toBeDefined();
      expect(result?.status).toBe('APPROVED');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE reviews'),
        expect.arrayContaining(['rev_test123', 'APPROVED'])
      );
    });

    it('should update updated_at timestamp', async () => {
      const mockReviewRow = createMockReviewRow();
      const mockUserRow = createMockUserRow();

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('UPDATE reviews')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT * FROM reviews WHERE id = $1')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT id, name, avatar_url FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [mockUserRow] });
        }
        return Promise.resolve({ rows: [] });
      });

      await repository.updateStatus('rev_test123', 'APPROVED');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = NOW()'),
        expect.any(Array)
      );
    });

    it('should return null when review not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.updateStatus('nonexistent', 'APPROVED');

      expect(result).toBeNull();
    });

    it('should handle all valid status values', async () => {
      const statuses: ReviewStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

      for (const status of statuses) {
        const mockReviewRow = createMockReviewRow({ status });
        const mockUserRow = createMockUserRow();

        mockPool.query.mockImplementation((query: string) => {
          if (query.includes('UPDATE reviews')) {
            return Promise.resolve({ rows: [mockReviewRow] });
          }
          if (query.includes('SELECT * FROM reviews WHERE id = $1')) {
            return Promise.resolve({ rows: [mockReviewRow] });
          }
          if (query.includes('SELECT id, name, avatar_url FROM users WHERE id = $1')) {
            return Promise.resolve({ rows: [mockUserRow] });
          }
          return Promise.resolve({ rows: [] });
        });

        const result = await repository.updateStatus('rev_test123', status);

        expect(result?.status).toBe(status);
      }
    });
  });

  // ==================== addReply ====================

  describe('addReply', () => {
    it('should add reply to review successfully', async () => {
      const mockReviewRow = createMockReviewRow({
        reply_content: 'Thank you for your feedback!',
        reply_created_at: new Date('2024-01-02T10:00:00Z'),
      });
      const mockUserRow = createMockUserRow();

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('UPDATE reviews')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT * FROM reviews WHERE id = $1')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT id, name, avatar_url FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [mockUserRow] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.addReply('rev_test123', 'tch_test123', 'Thank you for your feedback!');

      expect(result).toBeDefined();
      expect(result?.reply?.content).toBe('Thank you for your feedback!');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE reviews'),
        expect.arrayContaining(['rev_test123', 'Thank you for your feedback!', 'tch_test123'])
      );
    });

    it('should set reply_created_at timestamp', async () => {
      const mockReviewRow = createMockReviewRow({ reply_created_at: new Date('2024-01-02T10:00:00Z') });
      const mockUserRow = createMockUserRow();

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('UPDATE reviews')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT * FROM reviews WHERE id = $1')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        if (query.includes('SELECT id, name, avatar_url FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [mockUserRow] });
        }
        return Promise.resolve({ rows: [] });
      });

      await repository.addReply('rev_test123', 'tch_test123', 'Reply content');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('reply_created_at = NOW()'),
        expect.any(Array)
      );
    });

    it('should verify teacher_id matches', async () => {
      const mockReviewRow = createMockReviewRow({ teacher_id: 'tch_test123' });

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('UPDATE reviews')) {
          return Promise.resolve({ rows: [mockReviewRow] });
        }
        return Promise.resolve({ rows: [] });
      });

      await repository.addReply('rev_test123', 'tch_test123', 'Reply content');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND teacher_id = $'),
        expect.arrayContaining(['rev_test123', 'Reply content', 'tch_test123'])
      );
    });

    it('should return null when review not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.addReply('nonexistent', 'tch_test123', 'Reply content');

      expect(result).toBeNull();
    });

    it('should return null when teacher_id does not match', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.addReply('rev_test123', 'tch_wrong', 'Reply content');

      expect(result).toBeNull();
    });
  });

  // ==================== incrementHelpfulCount ====================

  describe('incrementHelpfulCount', () => {
    it('should increment helpful count successfully', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      const result = await repository.incrementHelpfulCount('rev_test123');

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = $1',
        ['rev_test123']
      );
    });

    it('should return false when review not found', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 0 });

      const result = await repository.incrementHelpfulCount('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false when rowCount is null', async () => {
      mockPool.query.mockResolvedValue({ rowCount: null });

      const result = await repository.incrementHelpfulCount('rev_test123');

      expect(result).toBe(false);
    });
  });

  // ==================== getTeacherStats ====================

  describe('getTeacherStats', () => {
    it('should return teacher statistics when reviews exist', async () => {
      const statsRow = {
        total_reviews: '50',
        avg_overall: '4.5',
        avg_teaching: '4.6',
        avg_course: '4.4',
        avg_communication: '4.7',
        avg_punctuality: '4.3',
      };

      const distributionRows = [
        { rating: 5, count: '30' },
        { rating: 4, count: '15' },
        { rating: 3, count: '4' },
        { rating: 2, count: '1' },
        { rating: 1, count: '0' },
      ];

      mockPool.query.mockImplementation((query: string) => {
        // Match the exact stats query with AVG aggregations
        if (query.includes('AVG(overall_rating)') && query.includes('AVG(teaching_rating)')) {
          return Promise.resolve({ rows: [statsRow] });
        }
        // Match the distribution query
        if (query.includes('SELECT overall_rating as rating, COUNT(*) as count')) {
          return Promise.resolve({ rows: distributionRows });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.getTeacherStats('tch_test123');

      expect(result).toEqual({
        teacherId: 'tch_test123',
        totalReviews: 50,
        averageRating: 4.5,
        ratingDistribution: { 5: 30, 4: 15, 3: 4, 2: 1, 1: 0 },
        teachingAvg: 4.6,
        courseAvg: 4.4,
        communicationAvg: 4.7,
        punctualityAvg: 4.3,
      });
    });

    it('should return zero stats when no reviews exist', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT COUNT(*) as total_reviews')) {
          return Promise.resolve({ rows: [{ total_reviews: '0' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.getTeacherStats('tch_test123');

      expect(result).toEqual({
        teacherId: 'tch_test123',
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      });
    });

    it('should only count APPROVED reviews', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes("status = 'APPROVED'")) {
          return Promise.resolve({ rows: [{ total_reviews: '10', avg_overall: '4.5' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await repository.getTeacherStats('tch_test123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'APPROVED'"),
        ['tch_test123']
      );
    });

    it('should handle missing distribution values', async () => {
      const statsRow = {
        total_reviews: '5',
        avg_overall: '4.0',
        avg_teaching: null,
        avg_course: null,
        avg_communication: null,
        avg_punctuality: null,
      };

      const distributionRows = [{ rating: 4, count: '5' }];

      mockPool.query.mockImplementation((query: string) => {
        // Match the exact stats query with AVG aggregations
        if (query.includes('AVG(overall_rating)') && query.includes('AVG(teaching_rating)')) {
          return Promise.resolve({ rows: [statsRow] });
        }
        // Match the distribution query
        if (query.includes('SELECT overall_rating as rating, COUNT(*) as count')) {
          return Promise.resolve({ rows: distributionRows });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.getTeacherStats('tch_test123');

      expect(result?.ratingDistribution).toEqual({ 5: 0, 4: 5, 3: 0, 2: 0, 1: 0 });
      expect(result?.teachingAvg).toBeUndefined();
      expect(result?.courseAvg).toBeUndefined();
    });

    it('should handle null average ratings', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT COUNT(*) as total_reviews')) {
          return Promise.resolve({
            rows: [{ total_reviews: '0', avg_overall: null, avg_teaching: null, avg_course: null }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await repository.getTeacherStats('tch_test123');

      expect(result?.averageRating).toBe(0);
    });
  });

  // ==================== hasUserReviewedTeacher ====================

  describe('hasUserReviewedTeacher', () => {
    it('should return true when user has reviewed teacher', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ exists: true }] });

      const result = await repository.hasUserReviewedTeacher('usr_test123', 'tch_test123');

      expect(result).toBe(true);
    });

    it('should return false when user has not reviewed teacher', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.hasUserReviewedTeacher('usr_test123', 'tch_test123');

      expect(result).toBe(false);
    });

    it('should check by user_id and teacher_id', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.hasUserReviewedTeacher('usr_test123', 'tch_test123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT 1 FROM reviews WHERE user_id = $1 AND teacher_id = $2 LIMIT 1',
        ['usr_test123', 'tch_test123']
      );
    });

    it('should limit results to 1', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.hasUserReviewedTeacher('usr_test123', 'tch_test123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1'),
        expect.any(Array)
      );
    });
  });

  // ==================== hasUserReviewedCourse ====================

  describe('hasUserReviewedCourse', () => {
    it('should return true when user has reviewed course', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ exists: true }] });

      const result = await repository.hasUserReviewedCourse('usr_test123', 'crs_test123');

      expect(result).toBe(true);
    });

    it('should return false when user has not reviewed course', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.hasUserReviewedCourse('usr_test123', 'crs_test123');

      expect(result).toBe(false);
    });

    it('should check by user_id and course_id', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.hasUserReviewedCourse('usr_test123', 'crs_test123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT 1 FROM reviews WHERE user_id = $1 AND course_id = $2 LIMIT 1',
        ['usr_test123', 'crs_test123']
      );
    });

    it('should limit results to 1', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.hasUserReviewedCourse('usr_test123', 'crs_test123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 1'),
        expect.any(Array)
      );
    });
  });

  // ==================== Error Cases ====================

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection refused'));

      await expect(repository.findById('rev_test123')).rejects.toThrow('Connection refused');
    });

    it('should handle query errors gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('Syntax error'));

      await expect(repository.findAll()).rejects.toThrow('Syntax error');
    });
  });
});
