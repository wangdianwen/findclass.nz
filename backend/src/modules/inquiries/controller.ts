/**
 * Inquiries Module - Controller
 * HTTP request handlers for inquiries and reports
 */

import type { Request, Response, NextFunction } from 'express';
import {
  createInquiry,
  createReport,
  getInquiryById,
  getReportById,
  replyToInquiry,
  updateInquiryStatus,
  updateReportStatus,
} from './service';
import { createSuccessResponse } from '@shared/types/api';
import { getRequestId } from '@shared/utils/request';
import { AppError, ErrorCode } from '@core/errors';
import type { CreateInquiryDTO, CreateReportDTO, InquiryStatus, ReportStatus } from './types';

// ==================== Inquiry Controllers ====================

/**
 * POST /inquiries - Create a new inquiry
 */
export const createInquiryController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = getRequestId(req);

    // Extract authenticated user info if available (only userId is available in JWT)
    const userId = req.user?.userId;

    // Extract body fields
    const targetType = req.body.targetType as 'course' | 'teacher' | 'general';
    const targetId = req.body.targetId as string | undefined;
    const subject = req.body.subject as string | undefined;
    const message = req.body.message as string;

    // Validate required fields
    if (!targetType) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Target type is required',
        meta: { requestId },
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Target type is required',
        },
      });
      return;
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Message is required',
        meta: { requestId },
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Message is required',
        },
      });
      return;
    }

    const dto: CreateInquiryDTO = {
      userId,
      targetType,
      targetId,
      subject,
      message: message.trim(),
    };

    const inquiry = await createInquiry(dto);

    // Format response to match MSW mock structure
    res.status(201).json({
      success: true,
      code: 201,
      message: 'Inquiry sent successfully',
      data: {
        inquiryId: inquiry.id,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        code: error.statusCode,
        message: error.message,
        meta: { requestId: getRequestId(req) },
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
      return;
    }
    next(error);
  }
};

/**
 * GET /inquiries/:id - Get inquiry by ID
 */
export const getInquiryController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = getRequestId(req);
    const id = req.params.id as string;

    if (!id) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Inquiry ID is required',
        meta: { requestId },
      });
      return;
    }

    const inquiry = await getInquiryById(id);

    if (!inquiry) {
      res.status(404).json({
        success: false,
        code: 404,
        message: 'Inquiry not found',
        meta: { requestId },
      });
      return;
    }

    res.json(createSuccessResponse(inquiry, 'Inquiry retrieved', undefined, requestId));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /inquiries/:id/reply - Reply to an inquiry (admin only)
 */
export const replyInquiryController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = getRequestId(req);
    const id = req.params.id as string;
    const replyContent = req.body.replyContent as string;

    if (!id) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Inquiry ID is required',
        meta: { requestId },
      });
      return;
    }

    if (!replyContent || typeof replyContent !== 'string' || replyContent.trim().length === 0) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Reply content is required',
        meta: { requestId },
      });
      return;
    }

    const inquiry = await replyToInquiry(id, replyContent.trim());

    if (!inquiry) {
      res.status(404).json({
        success: false,
        code: 404,
        message: 'Inquiry not found',
        meta: { requestId },
      });
      return;
    }

    res.json(createSuccessResponse(inquiry, 'Reply sent successfully', undefined, requestId));
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        code: error.statusCode,
        message: error.message,
        meta: { requestId: getRequestId(req) },
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }
    next(error);
  }
};

/**
 * PATCH /inquiries/:id/status - Update inquiry status (admin only)
 */
export const updateInquiryStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = getRequestId(req);
    const id = req.params.id as string;
    const status = req.body.status as string;

    if (!id) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Inquiry ID is required',
        meta: { requestId },
      });
      return;
    }

    if (!status || !['PENDING', 'READ', 'REPLIED', 'CLOSED'].includes(status)) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Invalid status. Must be PENDING, READ, REPLIED, or CLOSED.',
        meta: { requestId },
      });
      return;
    }

    const inquiry = await updateInquiryStatus(id, status as InquiryStatus);

    if (!inquiry) {
      res.status(404).json({
        success: false,
        code: 404,
        message: 'Inquiry not found',
        meta: { requestId },
      });
      return;
    }

    res.json(createSuccessResponse(inquiry, 'Inquiry status updated', undefined, requestId));
  } catch (error) {
    next(error);
  }
};

// ==================== Report Controllers ====================

/**
 * POST /reports - Create a new report
 */
export const createReportController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = getRequestId(req);

    // Extract authenticated user info if available (only userId is available in JWT)
    const userId = req.user?.userId;

    // Extract body fields
    const targetType = req.body.targetType as
      | 'course'
      | 'teacher'
      | 'review'
      | 'user'
      | 'comment'
      | 'other';
    const targetId = req.body.targetId as string;
    const reason = req.body.reason as
      | 'spam'
      | 'inappropriate_content'
      | 'fake_information'
      | 'harassment'
      | 'fraud'
      | 'copyright'
      | 'other';
    const description = req.body.description as string;

    // Validate required fields
    if (!targetType) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Target type is required',
        meta: { requestId },
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Target type is required',
        },
      });
      return;
    }

    if (!targetId) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Target ID is required',
        meta: { requestId },
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Target ID is required',
        },
      });
      return;
    }

    if (!reason) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Reason is required',
        meta: { requestId },
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Reason is required',
        },
      });
      return;
    }

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Description must be at least 10 characters',
        meta: { requestId },
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Description must be at least 10 characters',
        },
      });
      return;
    }

    const dto: CreateReportDTO = {
      userId,
      targetType,
      targetId,
      reason,
      description: description.trim(),
    };

    const report = await createReport(dto);

    // Format response to match MSW mock structure
    res.status(201).json({
      success: true,
      code: 201,
      message: 'Report submitted successfully',
      data: {
        reportId: report.id,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        code: error.statusCode,
        message: error.message,
        meta: { requestId: getRequestId(req) },
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
      return;
    }
    next(error);
  }
};

/**
 * GET /reports/:id - Get report by ID
 */
export const getReportController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = getRequestId(req);
    const id = req.params.id as string;

    if (!id) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Report ID is required',
        meta: { requestId },
      });
      return;
    }

    const report = await getReportById(id);

    if (!report) {
      res.status(404).json({
        success: false,
        code: 404,
        message: 'Report not found',
        meta: { requestId },
      });
      return;
    }

    res.json(createSuccessResponse(report, 'Report retrieved', undefined, requestId));
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /reports/:id/status - Update report status (admin only)
 */
export const updateReportStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = getRequestId(req);
    const id = req.params.id as string;
    const status = req.body.status as string;
    const adminNotes = req.body.adminNotes as string | undefined;

    if (!id) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Report ID is required',
        meta: { requestId },
      });
      return;
    }

    if (!status || !['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'].includes(status)) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Invalid status. Must be PENDING, REVIEWING, RESOLVED, or DISMISSED.',
        meta: { requestId },
      });
      return;
    }

    const report = await updateReportStatus(id, status as ReportStatus, adminNotes);

    if (!report) {
      res.status(404).json({
        success: false,
        code: 404,
        message: 'Report not found',
        meta: { requestId },
      });
      return;
    }

    res.json(createSuccessResponse(report, 'Report status updated', undefined, requestId));
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        code: error.statusCode,
        message: error.message,
        meta: { requestId: getRequestId(req) },
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }
    next(error);
  }
};
