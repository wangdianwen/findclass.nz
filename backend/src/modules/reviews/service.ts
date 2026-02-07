/**
 * Reviews Module - Service
 * Business logic for reviews operations
 */

import { getPool } from '@shared/db/postgres/client';
import { logger } from '@core/logger';
import { AppError, ErrorCode } from '@core/errors';
import { ReviewRepository } from './review.repository';
import type { Review, ReviewStatistics, CreateReviewDTO, ReviewFilters } from './types';

// ==================== Repository Factory ====================

function getReviewRepository(): ReviewRepository {
  const pool = getPool();
  return new ReviewRepository(pool);
}

// ==================== Query Operations ====================

/**
 * Get reviews with filters and pagination
 */
export async function getReviews(filters?: ReviewFilters): Promise<{
  reviews: Review[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  logger.info('Getting reviews', { filters });

  const repository = getReviewRepository();
  const { reviews, total } = await repository.findAll(filters);

  const page = filters?.page || 1;
  const limit = filters?.limit || 10;
  const totalPages = Math.ceil(total / limit);

  return {
    reviews,
    total,
    page,
    pageSize: limit,
    totalPages,
  };
}

/**
 * Get a single review by ID
 */
export async function getReviewById(reviewId: string): Promise<Review | null> {
  logger.info('Getting review by ID', { reviewId });

  const repository = getReviewRepository();
  return repository.findById(reviewId);
}

/**
 * Get reviews by teacher ID
 */
export async function getTeacherReviews(
  teacherId: string,
  page = 1,
  limit = 10
): Promise<{
  reviews: Review[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  logger.info('Getting teacher reviews', { teacherId, page, limit });

  const repository = getReviewRepository();
  const { reviews, total } = await repository.findByTeacherId(teacherId, page, limit);

  const totalPages = Math.ceil(total / limit);

  return {
    reviews,
    total,
    page,
    pageSize: limit,
    totalPages,
  };
}

/**
 * Get reviews by user ID
 */
export async function getUserReviews(userId: string): Promise<Review[]> {
  logger.info('Getting user reviews', { userId });

  const repository = getReviewRepository();
  return repository.findByUserId(userId);
}

/**
 * Get teacher review statistics
 */
export async function getTeacherReviewStats(teacherId: string): Promise<ReviewStatistics | null> {
  logger.info('Getting teacher review stats', { teacherId });

  const repository = getReviewRepository();
  return repository.getTeacherStats(teacherId);
}

// ==================== Mutation Operations ====================

/**
 * Create a new review
 */
export async function createReview(userId: string, data: CreateReviewDTO): Promise<Review> {
  logger.info('Creating review', { userId, teacherId: data.teacherId });

  const repository = getReviewRepository();

  // Check if user has already reviewed this teacher
  const hasReviewed = await repository.hasUserReviewedTeacher(userId, data.teacherId);
  if (hasReviewed) {
    throw new AppError('You have already reviewed this teacher', ErrorCode.CONFLICT, 409);
  }

  // Validate rating
  if (data.overallRating < 1 || data.overallRating > 5) {
    throw new AppError('Rating must be between 1 and 5', ErrorCode.VALIDATION_ERROR, 400, [
      { field: 'overallRating', message: 'Rating must be between 1 and 5' },
    ]);
  }

  // Validate content
  if (!data.content || data.content.trim().length === 0) {
    throw new AppError('Review content is required', ErrorCode.VALIDATION_ERROR, 400, [
      { field: 'content', message: 'Content is required' },
    ]);
  }

  if (data.content.length > 2000) {
    throw new AppError(
      'Review content must be less than 2000 characters',
      ErrorCode.VALIDATION_ERROR,
      400,
      [{ field: 'content', message: 'Content must be less than 2000 characters' }]
    );
  }

  // Create the review
  const review = await repository.create(userId, data);

  logger.info('Review created successfully', { reviewId: review.id });

  return review;
}

/**
 * Update review status (admin only)
 */
export async function updateReviewStatus(
  reviewId: string,
  status: 'APPROVED' | 'REJECTED'
): Promise<Review | null> {
  logger.info('Updating review status', { reviewId, status });

  const repository = getReviewRepository();

  const review = await repository.findById(reviewId);
  if (!review) {
    throw new AppError('Review not found', ErrorCode.NOT_FOUND, 404);
  }

  return repository.updateStatus(reviewId, status);
}

/**
 * Add reply to review (teacher only)
 */
export async function addReviewReply(
  reviewId: string,
  teacherId: string,
  content: string
): Promise<Review | null> {
  logger.info('Adding review reply', { reviewId, teacherId });

  const repository = getReviewRepository();

  const review = await repository.findById(reviewId);
  if (!review) {
    throw new AppError('Review not found', ErrorCode.NOT_FOUND, 404);
  }

  if (review.teacherId !== teacherId) {
    throw new AppError(
      'You can only reply to reviews for your own teacher profile',
      ErrorCode.FORBIDDEN,
      403
    );
  }

  return repository.addReply(reviewId, teacherId, content);
}

/**
 * Increment helpful count
 */
export async function markReviewHelpful(reviewId: string): Promise<boolean> {
  logger.info('Marking review helpful', { reviewId });

  const repository = getReviewRepository();
  return repository.incrementHelpfulCount(reviewId);
}

// ==================== Validation Helpers ====================

/**
 * Check if user can review a teacher
 */
export async function canUserReviewTeacher(
  userId: string,
  teacherId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const repository = getReviewRepository();

  const hasReviewed = await repository.hasUserReviewedTeacher(userId, teacherId);
  if (hasReviewed) {
    return { allowed: false, reason: 'You have already reviewed this teacher' };
  }

  return { allowed: true };
}

/**
 * Check if user can review a course
 */
export async function canUserReviewCourse(
  userId: string,
  courseId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const repository = getReviewRepository();

  const hasReviewed = await repository.hasUserReviewedCourse(userId, courseId);
  if (hasReviewed) {
    return { allowed: false, reason: 'You have already reviewed this course' };
  }

  return { allowed: true };
}
