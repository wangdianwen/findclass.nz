/**
 * Inquiries Module - Reports Routes
 * API routes for reports functionality
 */

import { Router } from 'express';
import { authenticate, optionalAuth } from '@shared/middleware/auth';
import {
  createReportController,
  getReportController,
  updateReportStatusController,
} from './controller';

const router = Router();

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

export { router as reportRoutes };
