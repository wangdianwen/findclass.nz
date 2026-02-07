/**
 * Inquiries Module - Routes
 * API routes for inquiries and reports functionality
 */

import { Router } from 'express';
import { authenticate, optionalAuth } from '@shared/middleware/auth';
import {
  createInquiryController,
  getInquiryController,
  replyInquiryController,
  updateInquiryStatusController,
  createReportController,
  getReportController,
  updateReportStatusController,
} from './controller';

const router = Router();

// ==================== Inquiry Routes ====================

/**
 * POST /inquiries
 * Create a new inquiry
 * Body: targetType (course|teacher|general), targetId?, subject?, message
 * Note: Authentication is optional - users can submit inquiries without login
 */
router.post('/', optionalAuth, createInquiryController);

/**
 * GET /inquiries/:id
 * Get inquiry by ID
 * Requires authentication
 */
router.get('/:id', authenticate, getInquiryController);

/**
 * POST /inquiries/:id/reply
 * Reply to an inquiry (admin only)
 * Body: replyContent
 */
router.post('/:id/reply', authenticate, replyInquiryController);

/**
 * PATCH /inquiries/:id/status
 * Update inquiry status (admin only)
 * Body: status (PENDING|READ|REPLIED|CLOSED)
 */
router.patch('/:id/status', authenticate, updateInquiryStatusController);

// ==================== Report Routes ====================

/**
 * POST /reports
 * Create a new report
 * Body: targetType (course|teacher|review|user|comment|other), targetId, reason, description
 * Note: Authentication is optional - users can submit reports without login
 */
router.post('/', optionalAuth, createReportController);

/**
 * GET /reports/:id
 * Get report by ID
 * Requires authentication
 */
router.get('/:id', authenticate, getReportController);

/**
 * PATCH /reports/:id/status
 * Update report status (admin only)
 * Body: status (PENDING|REVIEWING|RESOLVED|DISMISSED), adminNotes?
 */
router.patch('/:id/status', authenticate, updateReportStatusController);

export { router as inquiryRoutes };
