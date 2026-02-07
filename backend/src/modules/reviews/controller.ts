/**
 * Reviews Module - Controller
 * HTTP request handlers for reviews
 */

import type { Request, Response, NextFunction } from 'express';
import {
  getReviews,
  getReviewById,
  getTeacherReviewStats,
  createReview,
  updateReviewStatus,
  addReviewReply,
  markReviewHelpful,
} from './service';
import { createSuccessResponse } from '@shared/types/api';
import { getRequestId, extractStringParam } from '@shared/utils/request';
import { UnauthorizedError, AppError, ErrorCode } from '@core/errors';
import type { CreateReviewDTO } from './types';

/**
 * GET /reviews - Get reviews list with filters and pagination
 */
export const getReviewsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = getRequestId(req);

    // Extract query parameters - need to cast to handle Express types
    const teacherId = extractStringParam(req.query.teacherId as string | string[] | undefined);
    const courseId = extractStringParam(req.query.courseId as string | string[] | undefined);
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10;
    const sortBy = (req.query.sortBy as 'recent' | 'helpful') || 'recent';

    const {
      reviews,
      total,
      page: currentPage,
      pageSize: currentLimit,
      totalPages,
    } = await getReviews({
      teacherId,
      courseId,
      page,
      limit,
      sortBy,
    });

    // Format response to match MSW mock structure
    const responseData = reviews.map(review => ({
      id: review.id,
      teacherId: review.teacherId,
      courseId: review.courseId,
      studentName: review.userName,
      rating: review.overallRating,
      content: review.content,
      createdAt: review.createdAt.toISOString(),
    }));

    res.json({
      success: true,
      code: 200,
      message: 'Reviews retrieved',
      data: responseData,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
      pagination: {
        page: currentPage,
        pageSize: currentLimit,
        total,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /reviews/stats/:teacherId - Get teacher review statistics
 */
export const getReviewStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = getRequestId(req);
    const teacherId = req.params.teacherId as string;

    if (!teacherId) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Teacher ID is required',
        meta: { requestId },
      });
      return;
    }

    const stats = await getTeacherReviewStats(teacherId);

    if (!stats) {
      res.status(404).json({
        success: false,
        code: 404,
        message: 'Teacher not found or no reviews',
        meta: { requestId },
      });
      return;
    }

    // Format response to match MSW mock structure
    res.json({
      success: true,
      code: 200,
      message: 'Review statistics retrieved',
      data: {
        teacherId: stats.teacherId,
        average: stats.averageRating,
        distribution: {
          '5': stats.ratingDistribution[5],
          '4': stats.ratingDistribution[4],
          '3': stats.ratingDistribution[3],
          '2': stats.ratingDistribution[2],
          '1': stats.ratingDistribution[1],
        },
        total: stats.totalReviews,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /reviews/:id - Get a single review
 */
export const getReviewController = async (
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
        message: 'Review ID is required',
        meta: { requestId },
      });
      return;
    }

    const review = await getReviewById(id);

    if (!review) {
      res.status(404).json({
        success: false,
        code: 404,
        message: 'Review not found',
        meta: { requestId },
      });
      return;
    }

    res.json(createSuccessResponse(review, 'Review retrieved', undefined, requestId));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /reviews - Create a new review
 */
export const createReviewController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = getRequestId(req);
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        code: 401,
        message: 'Authentication required',
        meta: { requestId },
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'You must be logged in to create a review',
        },
      });
      return;
    }

    const {
      teacherId,
      courseId,
      overallRating,
      teachingRating,
      courseRating,
      communicationRating,
      punctualityRating,
      title,
      content,
    } = req.body;

    // Validate required fields
    if (!teacherId) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Teacher ID is required',
        meta: { requestId },
      });
      return;
    }

    if (!overallRating || overallRating < 1 || overallRating > 5) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Rating must be between 1 and 5',
        meta: { requestId },
      });
      return;
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Review content is required',
        meta: { requestId },
      });
      return;
    }

    const dto: CreateReviewDTO = {
      teacherId,
      courseId,
      overallRating,
      teachingRating,
      courseRating,
      communicationRating,
      punctualityRating,
      title,
      content: content.trim(),
    };

    const review = await createReview(userId, dto);

    // Format response to match MSW mock structure
    res.status(201).json({
      success: true,
      code: 201,
      message: 'Review created successfully',
      data: {
        id: review.id,
        teacherId: review.teacherId,
        courseId: review.courseId,
        rating: review.overallRating,
        content: review.content,
        createdAt: review.createdAt.toISOString(),
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      res.status(401).json({
        success: false,
        code: 401,
        message: error.message,
        meta: { requestId: getRequestId(req) },
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: error.message,
        },
      });
      return;
    }
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
 * PATCH /reviews/:id/status - Update review status (admin only)
 */
export const updateReviewStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = getRequestId(req);
    const id = req.params.id as string;
    const { status } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Review ID is required',
        meta: { requestId },
      });
      return;
    }

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Status must be APPROVED or REJECTED',
        meta: { requestId },
      });
      return;
    }

    const review = await updateReviewStatus(id, status);

    if (!review) {
      res.status(404).json({
        success: false,
        code: 404,
        message: 'Review not found',
        meta: { requestId },
      });
      return;
    }

    res.json(createSuccessResponse(review, 'Review status updated', undefined, requestId));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /reviews/:id/reply - Add reply to review (teacher only)
 */
export const addReplyController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const requestId = getRequestId(req);
    const userId = req.user?.userId;
    const id = req.params.id as string;
    const { content } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        code: 401,
        message: 'Authentication required',
        meta: { requestId },
      });
      return;
    }

    if (!id) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Review ID is required',
        meta: { requestId },
      });
      return;
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Reply content is required',
        meta: { requestId },
      });
      return;
    }

    const review = await addReviewReply(id, userId, content.trim());

    if (!review) {
      res.status(404).json({
        success: false,
        code: 404,
        message: 'Review not found or you cannot reply to this review',
        meta: { requestId },
      });
      return;
    }

    res.json(createSuccessResponse(review, 'Reply added successfully', undefined, requestId));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /reviews/:id/helpful - Mark review as helpful
 */
export const markHelpfulController = async (
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
        message: 'Review ID is required',
        meta: { requestId },
      });
      return;
    }

    const success = await markReviewHelpful(id);

    if (!success) {
      res.status(404).json({
        success: false,
        code: 404,
        message: 'Review not found',
        meta: { requestId },
      });
      return;
    }

    res.json(
      createSuccessResponse({ marked: true }, 'Review marked as helpful', undefined, requestId)
    );
  } catch (error) {
    next(error);
  }
};
