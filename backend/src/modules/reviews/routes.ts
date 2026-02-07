/**
 * Reviews Module - Routes
 * API routes for reviews functionality
 */

import { Router } from 'express';
import { authenticate, optionalAuth } from '@shared/middleware/auth';
import {
  getReviewsController,
  getReviewStatsController,
  getReviewController,
  createReviewController,
  updateReviewStatusController,
  addReplyController,
  markHelpfulController,
} from './controller';

const router = Router();

// Public routes
/**
 * GET /reviews
 * Get reviews list with filters and pagination
 * Query params: teacherId, courseId, page, pageSize, sortBy
 */
router.get('/', optionalAuth, getReviewsController);

/**
 * GET /reviews/stats/:teacherId
 * Get teacher review statistics
 */
router.get('/stats/:teacherId', optionalAuth, getReviewStatsController);

/**
 * GET /reviews/:id
 * Get a single review by ID
 */
router.get('/:id', optionalAuth, getReviewController);

// Protected routes (require authentication)

/**
 * POST /reviews
 * Create a new review
 * Body: teacherId, courseId?, overallRating, teachingRating?, courseRating?, communicationRating?, punctualityRating?, title?, content
 */
router.post('/', authenticate, createReviewController);

/**
 * PATCH /reviews/:id/status
 * Update review status (admin only)
 * Body: status (APPROVED | REJECTED)
 */
router.patch('/:id/status', authenticate, updateReviewStatusController);

/**
 * POST /reviews/:id/reply
 * Add reply to review (teacher only)
 * Body: content
 */
router.post('/:id/reply', authenticate, addReplyController);

/**
 * POST /reviews/:id/helpful
 * Mark review as helpful
 */
router.post('/:id/helpful', authenticate, markHelpfulController);

export { router as reviewRoutes };
