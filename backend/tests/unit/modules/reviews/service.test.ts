/**
 * Reviews Service Unit Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Pool } from 'pg';

// Mock PostgreSQL pool
const mockPool = {
  query: vi.fn(),
  connect: vi.fn(),
};

vi.mock('@shared/db/postgres/client', () => ({
  getPool: vi.fn(() => mockPool),
}));

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
import * as reviewsService from '@modules/reviews/service';
import { ReviewRepository } from '@modules/reviews/review.repository';
import type { Review, ReviewStatistics, CreateReviewDTO, ReviewStatus } from '@modules/reviews/types';
import { AppError, ErrorCode } from '@core/errors';

describe('Reviews Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Mock Data ====================

  function createMockReview(overrides: Partial<Review> = {}): Review {
    return {
      id: 'rev_test123',
      userId: 'usr_test123',
      userName: 'Test User',
      userAvatar: 'https://example.com/avatar.jpg',
      courseId: 'crs_test123',
      courseName: 'Math Course',
      teacherId: 'tch_test123',
      bookingId: 'bkg_test123',
      overallRating: 5,
      teachingRating: 5,
      courseRating: 4,
      communicationRating: 5,
      punctualityRating: 4,
      title: 'Excellent teacher',
      content: 'Great teaching style, very knowledgeable',
      tags: [],
      status: 'APPROVED' as ReviewStatus,
      helpfulCount: 10,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      ...overrides,
    };
  }

  function createMockReviewStats(overrides: Partial<ReviewStatistics> = {}): ReviewStatistics {
    return {
      teacherId: 'tch_test123',
      totalReviews: 50,
      averageRating: 4.5,
      ratingDistribution: { 5: 30, 4: 15, 3: 4, 2: 1, 1: 0 },
      teachingAvg: 4.6,
      courseAvg: 4.4,
      communicationAvg: 4.7,
      punctualityAvg: 4.3,
      ...overrides,
    };
  }

  // ==================== getReviews ====================

  describe('getReviews', () => {
    it('should return reviews with pagination metadata', async () => {
      const mockReviews = [
        createMockReview({ id: 'rev_1' }),
        createMockReview({ id: 'rev_2' }),
        createMockReview({ id: 'rev_3' }),
      ];

      // Mock repository findAll method
      vi.spyOn(ReviewRepository.prototype, 'findAll').mockResolvedValue({
        reviews: mockReviews,
        total: 3,
      });

      const result = await reviewsService.getReviews({ page: 1, limit: 10 });

      expect(result.reviews).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should calculate totalPages correctly', async () => {
      const mockReviews = Array.from({ length: 10 }, (_, i) => createMockReview({ id: `rev_${i}` }));

      vi.spyOn(ReviewRepository.prototype, 'findAll').mockResolvedValue({
        reviews: mockReviews,
        total: 25,
      });

      const result = await reviewsService.getReviews({ page: 1, limit: 10 });

      expect(result.totalPages).toBe(3);
    });

    it('should use default pagination values when not provided', async () => {
      vi.spyOn(ReviewRepository.prototype, 'findAll').mockResolvedValue({
        reviews: [],
        total: 0,
      });

      const result = await reviewsService.getReviews();

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should pass filters to repository', async () => {
      const findAllSpy = vi
        .spyOn(ReviewRepository.prototype, 'findAll')
        .mockResolvedValue({ reviews: [], total: 0 });

      await reviewsService.getReviews({
        teacherId: 'tch_test123',
        status: 'APPROVED',
        minRating: 4,
      });

      expect(findAllSpy).toHaveBeenCalledWith({
        teacherId: 'tch_test123',
        status: 'APPROVED',
        minRating: 4,
      });
    });

    it('should handle empty results', async () => {
      vi.spyOn(ReviewRepository.prototype, 'findAll').mockResolvedValue({
        reviews: [],
        total: 0,
      });

      const result = await reviewsService.getReviews();

      expect(result.reviews).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should handle last page with fewer items', async () => {
      const mockReviews = Array.from({ length: 5 }, (_, i) => createMockReview({ id: `rev_${i}` }));

      vi.spyOn(ReviewRepository.prototype, 'findAll').mockResolvedValue({
        reviews: mockReviews,
        total: 25,
      });

      const result = await reviewsService.getReviews({ page: 3, limit: 10 });

      expect(result.reviews).toHaveLength(5);
      expect(result.totalPages).toBe(3);
    });
  });

  // ==================== getReviewById ====================

  describe('getReviewById', () => {
    it('should return review when found', async () => {
      const mockReview = createMockReview();

      vi.spyOn(ReviewRepository.prototype, 'findById').mockResolvedValue(mockReview);

      const result = await reviewsService.getReviewById('rev_test123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('rev_test123');
      expect(result?.userId).toBe('usr_test123');
    });

    it('should return null when review not found', async () => {
      vi.spyOn(ReviewRepository.prototype, 'findById').mockResolvedValue(null);

      const result = await reviewsService.getReviewById('nonexistent');

      expect(result).toBeNull();
    });

    it('should call repository with correct review ID', async () => {
      const findByIdSpy = vi
        .spyOn(ReviewRepository.prototype, 'findById')
        .mockResolvedValue(createMockReview());

      await reviewsService.getReviewById('rev_test123');

      expect(findByIdSpy).toHaveBeenCalledWith('rev_test123');
    });
  });

  // ==================== getTeacherReviews ====================

  describe('getTeacherReviews', () => {
    it('should return teacher reviews with pagination', async () => {
      const mockReviews = [
        createMockReview({ id: 'rev_1' }),
        createMockReview({ id: 'rev_2' }),
      ];

      vi.spyOn(ReviewRepository.prototype, 'findByTeacherId').mockResolvedValue({
        reviews: mockReviews,
        total: 2,
      });

      const result = await reviewsService.getTeacherReviews('tch_test123', 1, 10);

      expect(result.reviews).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should calculate totalPages correctly for teacher reviews', async () => {
      vi.spyOn(ReviewRepository.prototype, 'findByTeacherId').mockResolvedValue({
        reviews: [],
        total: 25,
      });

      const result = await reviewsService.getTeacherReviews('tch_test123', 2, 10);

      expect(result.totalPages).toBe(3);
    });

    it('should use default pagination values when not provided', async () => {
      vi.spyOn(ReviewRepository.prototype, 'findByTeacherId').mockResolvedValue({
        reviews: [],
        total: 0,
      });

      const result = await reviewsService.getTeacherReviews('tch_test123');

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should pass teacherId, page, and limit to repository', async () => {
      const findByTeacherIdSpy = vi
        .spyOn(ReviewRepository.prototype, 'findByTeacherId')
        .mockResolvedValue({ reviews: [], total: 0 });

      await reviewsService.getTeacherReviews('tch_test123', 2, 20);

      expect(findByTeacherIdSpy).toHaveBeenCalledWith('tch_test123', 2, 20);
    });

    it('should handle empty results for teacher', async () => {
      vi.spyOn(ReviewRepository.prototype, 'findByTeacherId').mockResolvedValue({
        reviews: [],
        total: 0,
      });

      const result = await reviewsService.getTeacherReviews('tch_no_reviews');

      expect(result.reviews).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ==================== getUserReviews ====================

  describe('getUserReviews', () => {
    it('should return user reviews ordered by created_at DESC', async () => {
      const mockReviews = [
        createMockReview({ id: 'rev_2', createdAt: new Date('2024-01-02T10:00:00Z') }),
        createMockReview({ id: 'rev_1', createdAt: new Date('2024-01-01T10:00:00Z') }),
      ];

      vi.spyOn(ReviewRepository.prototype, 'findByUserId').mockResolvedValue(mockReviews);

      const result = await reviewsService.getUserReviews('usr_test123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('rev_2');
      expect(result[1].id).toBe('rev_1');
    });

    it('should return empty array when user has no reviews', async () => {
      vi.spyOn(ReviewRepository.prototype, 'findByUserId').mockResolvedValue([]);

      const result = await reviewsService.getUserReviews('usr_no_reviews');

      expect(result).toEqual([]);
    });

    it('should call repository with correct userId', async () => {
      const findByUserIdSpy = vi
        .spyOn(ReviewRepository.prototype, 'findByUserId')
        .mockResolvedValue([]);

      await reviewsService.getUserReviews('usr_test123');

      expect(findByUserIdSpy).toHaveBeenCalledWith('usr_test123');
    });
  });

  // ==================== getTeacherReviewStats ====================

  describe('getTeacherReviewStats', () => {
    it('should return teacher statistics when reviews exist', async () => {
      const mockStats = createMockReviewStats();

      vi.spyOn(ReviewRepository.prototype, 'getTeacherStats').mockResolvedValue(mockStats);

      const result = await reviewsService.getTeacherReviewStats('tch_test123');

      expect(result).toBeDefined();
      expect(result?.teacherId).toBe('tch_test123');
      expect(result?.totalReviews).toBe(50);
      expect(result?.averageRating).toBe(4.5);
      expect(result?.ratingDistribution).toEqual({ 5: 30, 4: 15, 3: 4, 2: 1, 1: 0 });
    });

    it('should return zero stats when teacher has no reviews', async () => {
      const mockStats: ReviewStatistics = {
        teacherId: 'tch_test123',
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };

      vi.spyOn(ReviewRepository.prototype, 'getTeacherStats').mockResolvedValue(mockStats);

      const result = await reviewsService.getTeacherReviewStats('tch_test123');

      expect(result).toBeDefined();
      expect(result?.totalReviews).toBe(0);
      expect(result?.averageRating).toBe(0);
    });

    it('should return null when stats not found', async () => {
      vi.spyOn(ReviewRepository.prototype, 'getTeacherStats').mockResolvedValue(null);

      const result = await reviewsService.getTeacherReviewStats('tch_no_reviews');

      expect(result).toBeNull();
    });

    it('should call repository with correct teacherId', async () => {
      const getTeacherStatsSpy = vi
        .spyOn(ReviewRepository.prototype, 'getTeacherStats')
        .mockResolvedValue(createMockReviewStats());

      await reviewsService.getTeacherReviewStats('tch_test123');

      expect(getTeacherStatsSpy).toHaveBeenCalledWith('tch_test123');
    });
  });

  // ==================== createReview ====================

  describe('createReview', () => {
    it('should create review successfully with valid data', async () => {
      const mockReview = createMockReview();
      const createDto: CreateReviewDTO = {
        teacherId: 'tch_test123',
        courseId: 'crs_test123',
        overallRating: 5,
        teachingRating: 5,
        courseRating: 4,
        title: 'Excellent teacher',
        content: 'Great teaching style',
      };

      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedTeacher').mockResolvedValue(false);
      vi.spyOn(ReviewRepository.prototype, 'create').mockResolvedValue(mockReview);

      const result = await reviewsService.createReview('usr_test123', createDto);

      expect(result).toBeDefined();
      expect(result.teacherId).toBe('tch_test123');
    });

    it('should throw error when user has already reviewed teacher', async () => {
      const createDto: CreateReviewDTO = {
        teacherId: 'tch_test123',
        overallRating: 5,
        content: 'Great teacher',
      };

      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedTeacher').mockResolvedValue(true);

      await expect(reviewsService.createReview('usr_test123', createDto)).rejects.toThrow(
        'You have already reviewed this teacher'
      );

      try {
        await reviewsService.createReview('usr_test123', createDto);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe(ErrorCode.CONFLICT);
        expect((error as AppError).statusCode).toBe(409);
      }
    });

    it('should throw error when rating is less than 1', async () => {
      const createDto: CreateReviewDTO = {
        teacherId: 'tch_test123',
        overallRating: 0,
        content: 'Great teacher',
      };

      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedTeacher').mockResolvedValue(false);

      await expect(reviewsService.createReview('usr_test123', createDto)).rejects.toThrow(
        'Rating must be between 1 and 5'
      );

      try {
        await reviewsService.createReview('usr_test123', createDto);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe(ErrorCode.VALIDATION_ERROR);
        expect((error as AppError).statusCode).toBe(400);
        if ((error as AppError).details) {
          expect((error as AppError).details[0].field).toBe('overallRating');
        }
      }
    });

    it('should throw error when rating is greater than 5', async () => {
      const createDto: CreateReviewDTO = {
        teacherId: 'tch_test123',
        overallRating: 6,
        content: 'Great teacher',
      };

      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedTeacher').mockResolvedValue(false);

      await expect(reviewsService.createReview('usr_test123', createDto)).rejects.toThrow(
        'Rating must be between 1 and 5'
      );
    });

    it('should throw error when content is empty', async () => {
      const createDto: CreateReviewDTO = {
        teacherId: 'tch_test123',
        overallRating: 5,
        content: '   ',
      };

      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedTeacher').mockResolvedValue(false);

      await expect(reviewsService.createReview('usr_test123', createDto)).rejects.toThrow(
        'Review content is required'
      );

      try {
        await reviewsService.createReview('usr_test123', createDto);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).details?.[0].field).toBe('content');
      }
    });

    it('should throw error when content exceeds 2000 characters', async () => {
      const createDto: CreateReviewDTO = {
        teacherId: 'tch_test123',
        overallRating: 5,
        content: 'a'.repeat(2001),
      };

      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedTeacher').mockResolvedValue(false);

      await expect(reviewsService.createReview('usr_test123', createDto)).rejects.toThrow(
        'Review content must be less than 2000 characters'
      );

      try {
        await reviewsService.createReview('usr_test123', createDto);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).details?.[0].field).toBe('content');
      }
    });

    it('should accept content with exactly 2000 characters', async () => {
      const mockReview = createMockReview();
      const createDto: CreateReviewDTO = {
        teacherId: 'tch_test123',
        overallRating: 5,
        content: 'a'.repeat(2000),
      };

      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedTeacher').mockResolvedValue(false);
      vi.spyOn(ReviewRepository.prototype, 'create').mockResolvedValue(mockReview);

      const result = await reviewsService.createReview('usr_test123', createDto);

      expect(result).toBeDefined();
    });

    it('should accept valid rating at boundary values', async () => {
      const mockReview = createMockReview();

      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedTeacher').mockResolvedValue(false);
      vi.spyOn(ReviewRepository.prototype, 'create').mockResolvedValue(mockReview);

      // Test rating = 1
      await reviewsService.createReview('usr_test123', {
        teacherId: 'tch_test123',
        overallRating: 1,
        content: 'Minimum rating',
      });

      // Test rating = 5
      await reviewsService.createReview('usr_test123', {
        teacherId: 'tch_test123',
        overallRating: 5,
        content: 'Maximum rating',
      });

      expect(ReviewRepository.prototype.create).toHaveBeenCalledTimes(2);
    });

    it('should trim content before validation', async () => {
      const mockReview = createMockReview({ content: 'Great teacher' });
      const createDto: CreateReviewDTO = {
        teacherId: 'tch_test123',
        overallRating: 5,
        content: '  Great teacher  ',
      };

      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedTeacher').mockResolvedValue(false);
      vi.spyOn(ReviewRepository.prototype, 'create').mockResolvedValue(mockReview);

      const result = await reviewsService.createReview('usr_test123', createDto);

      expect(result).toBeDefined();
    });

    it('should pass userId and createDto to repository', async () => {
      const mockReview = createMockReview();
      const createDto: CreateReviewDTO = {
        teacherId: 'tch_test123',
        overallRating: 5,
        content: 'Great teacher',
      };

      const createSpy = vi.spyOn(ReviewRepository.prototype, 'create').mockResolvedValue(mockReview);
      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedTeacher').mockResolvedValue(false);

      await reviewsService.createReview('usr_test123', createDto);

      expect(createSpy).toHaveBeenCalledWith('usr_test123', createDto);
    });
  });

  // ==================== updateReviewStatus ====================

  describe('updateReviewStatus', () => {
    it('should update review status to APPROVED successfully', async () => {
      const mockReview = createMockReview({ status: 'APPROVED' });

      vi.spyOn(ReviewRepository.prototype, 'findById').mockResolvedValue(mockReview);
      vi.spyOn(ReviewRepository.prototype, 'updateStatus').mockResolvedValue(mockReview);

      const result = await reviewsService.updateReviewStatus('rev_test123', 'APPROVED');

      expect(result).toBeDefined();
      expect(result?.status).toBe('APPROVED');
    });

    it('should update review status to REJECTED successfully', async () => {
      const mockReview = createMockReview({ status: 'REJECTED' });

      vi.spyOn(ReviewRepository.prototype, 'findById').mockResolvedValue(mockReview);
      vi.spyOn(ReviewRepository.prototype, 'updateStatus').mockResolvedValue(mockReview);

      const result = await reviewsService.updateReviewStatus('rev_test123', 'REJECTED');

      expect(result).toBeDefined();
      expect(result?.status).toBe('REJECTED');
    });

    it('should throw error when review not found', async () => {
      vi.spyOn(ReviewRepository.prototype, 'findById').mockResolvedValue(null);

      await expect(
        reviewsService.updateReviewStatus('nonexistent', 'APPROVED')
      ).rejects.toThrow('Review not found');

      try {
        await reviewsService.updateReviewStatus('nonexistent', 'APPROVED');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe(ErrorCode.NOT_FOUND);
        expect((error as AppError).statusCode).toBe(404);
      }
    });

    it('should call repository with correct reviewId and status', async () => {
      const mockReview = createMockReview();
      const updateStatusSpy = vi
        .spyOn(ReviewRepository.prototype, 'updateStatus')
        .mockResolvedValue(mockReview);
      vi.spyOn(ReviewRepository.prototype, 'findById').mockResolvedValue(mockReview);

      await reviewsService.updateReviewStatus('rev_test123', 'APPROVED');

      expect(updateStatusSpy).toHaveBeenCalledWith('rev_test123', 'APPROVED');
    });
  });

  // ==================== addReviewReply ====================

  describe('addReviewReply', () => {
    it('should add reply successfully as teacher', async () => {
      const mockReview = createMockReview({
        reply: {
          id: 'rev_test123-reply',
          reviewId: 'rev_test123',
          teacherId: 'tch_test123',
          content: 'Thank you for your feedback!',
          createdAt: new Date('2024-01-02T10:00:00Z'),
        },
      });

      vi.spyOn(ReviewRepository.prototype, 'findById').mockResolvedValue(mockReview);
      vi.spyOn(ReviewRepository.prototype, 'addReply').mockResolvedValue(mockReview);

      const result = await reviewsService.addReviewReply(
        'rev_test123',
        'tch_test123',
        'Thank you for your feedback!'
      );

      expect(result).toBeDefined();
      expect(result?.reply?.content).toBe('Thank you for your feedback!');
    });

    it('should throw error when review not found', async () => {
      vi.spyOn(ReviewRepository.prototype, 'findById').mockResolvedValue(null);

      await expect(
        reviewsService.addReviewReply('nonexistent', 'tch_test123', 'Reply content')
      ).rejects.toThrow('Review not found');

      try {
        await reviewsService.addReviewReply('nonexistent', 'tch_test123', 'Reply content');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe(ErrorCode.NOT_FOUND);
        expect((error as AppError).statusCode).toBe(404);
      }
    });

    it('should throw error when teacher is not the review owner', async () => {
      const mockReview = createMockReview({ teacherId: 'tch_other' });

      vi.spyOn(ReviewRepository.prototype, 'findById').mockResolvedValue(mockReview);

      await expect(
        reviewsService.addReviewReply('rev_test123', 'tch_test123', 'Reply content')
      ).rejects.toThrow('You can only reply to reviews for your own teacher profile');

      try {
        await reviewsService.addReviewReply('rev_test123', 'tch_test123', 'Reply content');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe(ErrorCode.FORBIDDEN);
        expect((error as AppError).statusCode).toBe(403);
      }
    });

    it('should call repository with correct parameters', async () => {
      const mockReview = createMockReview();
      const addReplySpy = vi
        .spyOn(ReviewRepository.prototype, 'addReply')
        .mockResolvedValue(mockReview);
      vi.spyOn(ReviewRepository.prototype, 'findById').mockResolvedValue(mockReview);

      await reviewsService.addReviewReply('rev_test123', 'tch_test123', 'Reply content');

      expect(addReplySpy).toHaveBeenCalledWith('rev_test123', 'tch_test123', 'Reply content');
    });
  });

  // ==================== markReviewHelpful ====================

  describe('markReviewHelpful', () => {
    it('should mark review as helpful successfully', async () => {
      vi.spyOn(ReviewRepository.prototype, 'incrementHelpfulCount').mockResolvedValue(true);

      const result = await reviewsService.markReviewHelpful('rev_test123');

      expect(result).toBe(true);
    });

    it('should return false when review not found', async () => {
      vi.spyOn(ReviewRepository.prototype, 'incrementHelpfulCount').mockResolvedValue(false);

      const result = await reviewsService.markReviewHelpful('nonexistent');

      expect(result).toBe(false);
    });

    it('should call repository with correct reviewId', async () => {
      const incrementHelpfulCountSpy = vi
        .spyOn(ReviewRepository.prototype, 'incrementHelpfulCount')
        .mockResolvedValue(true);

      await reviewsService.markReviewHelpful('rev_test123');

      expect(incrementHelpfulCountSpy).toHaveBeenCalledWith('rev_test123');
    });
  });

  // ==================== canUserReviewTeacher ====================

  describe('canUserReviewTeacher', () => {
    it('should return allowed: true when user has not reviewed teacher', async () => {
      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedTeacher').mockResolvedValue(false);

      const result = await reviewsService.canUserReviewTeacher('usr_test123', 'tch_test123');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return allowed: false when user has already reviewed teacher', async () => {
      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedTeacher').mockResolvedValue(true);

      const result = await reviewsService.canUserReviewTeacher('usr_test123', 'tch_test123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('You have already reviewed this teacher');
    });

    it('should call repository with correct userId and teacherId', async () => {
      const hasUserReviewedTeacherSpy = vi
        .spyOn(ReviewRepository.prototype, 'hasUserReviewedTeacher')
        .mockResolvedValue(false);

      await reviewsService.canUserReviewTeacher('usr_test123', 'tch_test123');

      expect(hasUserReviewedTeacherSpy).toHaveBeenCalledWith('usr_test123', 'tch_test123');
    });
  });

  // ==================== canUserReviewCourse ====================

  describe('canUserReviewCourse', () => {
    it('should return allowed: true when user has not reviewed course', async () => {
      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedCourse').mockResolvedValue(false);

      const result = await reviewsService.canUserReviewCourse('usr_test123', 'crs_test123');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return allowed: false when user has already reviewed course', async () => {
      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedCourse').mockResolvedValue(true);

      const result = await reviewsService.canUserReviewCourse('usr_test123', 'crs_test123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('You have already reviewed this course');
    });

    it('should call repository with correct userId and courseId', async () => {
      const hasUserReviewedCourseSpy = vi
        .spyOn(ReviewRepository.prototype, 'hasUserReviewedCourse')
        .mockResolvedValue(false);

      await reviewsService.canUserReviewCourse('usr_test123', 'crs_test123');

      expect(hasUserReviewedCourseSpy).toHaveBeenCalledWith('usr_test123', 'crs_test123');
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle undefined optional rating fields', async () => {
      const mockReview = createMockReview({
        teachingRating: undefined,
        courseRating: undefined,
      });
      const createDto: CreateReviewDTO = {
        teacherId: 'tch_test123',
        overallRating: 5,
        content: 'Great teacher',
      };

      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedTeacher').mockResolvedValue(false);
      vi.spyOn(ReviewRepository.prototype, 'create').mockResolvedValue(mockReview);

      const result = await reviewsService.createReview('usr_test123', createDto);

      expect(result).toBeDefined();
      expect(result.teachingRating).toBeUndefined();
      expect(result.courseRating).toBeUndefined();
    });

    it('should handle reviews without courseId', async () => {
      const mockReview = createMockReview({ courseId: undefined, courseName: undefined });
      const createDto: CreateReviewDTO = {
        teacherId: 'tch_test123',
        overallRating: 5,
        content: 'Great teacher',
      };

      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedTeacher').mockResolvedValue(false);
      vi.spyOn(ReviewRepository.prototype, 'create').mockResolvedValue(mockReview);

      const result = await reviewsService.createReview('usr_test123', createDto);

      expect(result).toBeDefined();
      expect(result.courseId).toBeUndefined();
    });

    it('should handle reviews without title', async () => {
      const mockReview = createMockReview({ title: undefined });
      const createDto: CreateReviewDTO = {
        teacherId: 'tch_test123',
        overallRating: 5,
        content: 'Great teacher',
      };

      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedTeacher').mockResolvedValue(false);
      vi.spyOn(ReviewRepository.prototype, 'create').mockResolvedValue(mockReview);

      const result = await reviewsService.createReview('usr_test123', createDto);

      expect(result).toBeDefined();
      expect(result.title).toBeUndefined();
    });

    it('should handle special characters in content', async () => {
      const mockReview = createMockReview();
      const createDto: CreateReviewDTO = {
        teacherId: 'tch_test123',
        overallRating: 5,
        content: 'Great teacher! 👍\n\n highly recommended!!!',
      };

      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedTeacher').mockResolvedValue(false);
      vi.spyOn(ReviewRepository.prototype, 'create').mockResolvedValue(mockReview);

      const result = await reviewsService.createReview('usr_test123', createDto);

      expect(result).toBeDefined();
    });
  });

  // ==================== Integration Tests ====================

  describe('Integration Scenarios', () => {
    it('should complete full review lifecycle', async () => {
      const mockReview = createMockReview({ status: 'PENDING' as ReviewStatus });
      const createDto: CreateReviewDTO = {
        teacherId: 'tch_test123',
        overallRating: 5,
        content: 'Great teacher',
      };

      // 1. Check if user can review
      vi.spyOn(ReviewRepository.prototype, 'hasUserReviewedTeacher').mockResolvedValue(false);

      // 2. Create review
      vi.spyOn(ReviewRepository.prototype, 'create').mockResolvedValue(mockReview);

      const createdReview = await reviewsService.createReview('usr_test123', createDto);
      expect(createdReview.status).toBe('PENDING');

      // 3. Approve review
      const approvedReview = createMockReview({ status: 'APPROVED' as ReviewStatus });
      vi.spyOn(ReviewRepository.prototype, 'findById').mockResolvedValue(approvedReview);
      vi.spyOn(ReviewRepository.prototype, 'updateStatus').mockResolvedValue(approvedReview);

      const updatedReview = await reviewsService.updateReviewStatus('rev_test123', 'APPROVED');
      expect(updatedReview?.status).toBe('APPROVED');

      // 4. Teacher replies
      const repliedReview = createMockReview({
        status: 'APPROVED' as ReviewStatus,
        reply: {
          id: 'rev_test123-reply',
          reviewId: 'rev_test123',
          teacherId: 'tch_test123',
          content: 'Thank you!',
          createdAt: new Date(),
        },
      });
      vi.spyOn(ReviewRepository.prototype, 'findById').mockResolvedValue(repliedReview);
      vi.spyOn(ReviewRepository.prototype, 'addReply').mockResolvedValue(repliedReview);

      const finalReview = await reviewsService.addReviewReply(
        'rev_test123',
        'tch_test123',
        'Thank you!'
      );
      expect(finalReview?.reply?.content).toBe('Thank you!');

      // 5. Mark as helpful
      vi.spyOn(ReviewRepository.prototype, 'incrementHelpfulCount').mockResolvedValue(true);
      const result = await reviewsService.markReviewHelpful('rev_test123');
      expect(result).toBe(true);
    });
  });
});
