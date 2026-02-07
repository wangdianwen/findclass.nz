/**
 * Inquiries Module - Routes
 * API routes for inquiries functionality
 */

import { Router } from 'express';
import { authenticate, optionalAuth } from '@shared/middleware/auth';
import {
  createInquiryController,
  getInquiryController,
  replyInquiryController,
  updateInquiryStatusController,
} from './controller';

const router = Router();

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

export { router as inquiryRoutes };
