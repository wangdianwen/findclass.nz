/**
 * Upload Module - Controller
 */

import type { Request, Response, NextFunction } from 'express';
import { createSuccessResponse } from '@shared/types/api';
import { logger } from '../../core/logger';
import { uploadService } from './service';
import type { AuthenticatedUploadRequest } from './types';

const getRequestId = (req: Request): string => (req.headers['x-request-id'] as string) || 'unknown';

/**
 * Handle avatar upload
 * POST /upload/avatar
 */
export const uploadAvatarController = (
  req: AuthenticatedUploadRequest,
  res: Response,
  _next: NextFunction
): void => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'No file uploaded',
        meta: { requestId: getRequestId(req), timestamp: new Date().toISOString() },
      });
      return;
    }

    const { filename, originalname, size } = req.file;

    const result = uploadService.processAvatarUpload(filename, originalname, size);

    res
      .status(200)
      .json(
        createSuccessResponse(
          { url: result.url },
          'Avatar uploaded successfully',
          getRequestId(req)
        )
      );
  } catch (error) {
    logger.error('Avatar upload failed', {
      error: error instanceof Error ? error.message : String(error),
      requestId: getRequestId(req),
    });

    res.status(500).json({
      success: false,
      code: 500,
      message: 'Failed to upload avatar',
      meta: { requestId: getRequestId(req), timestamp: new Date().toISOString() },
    });
  }
};

/**
 * Handle qualification upload
 * POST /upload/qualification/:type
 */
export const uploadQualificationController = (
  req: AuthenticatedUploadRequest,
  res: Response,
  _next: NextFunction
): void => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'No file uploaded',
        meta: { requestId: getRequestId(req), timestamp: new Date().toISOString() },
      });
      return;
    }

    const type = req.params.type as string;
    const { filename, originalname, size } = req.file;

    if (!type) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Qualification type is required',
        meta: { requestId: getRequestId(req), timestamp: new Date().toISOString() },
      });
      return;
    }

    const result = uploadService.processQualificationUpload(filename, originalname, size, type);

    res
      .status(200)
      .json(
        createSuccessResponse(
          { url: result.url, type },
          'Qualification uploaded successfully',
          getRequestId(req)
        )
      );
  } catch (error) {
    logger.error('Qualification upload failed', {
      error: error instanceof Error ? error.message : String(error),
      requestId: getRequestId(req),
    });

    res.status(500).json({
      success: false,
      code: 500,
      message: 'Failed to upload qualification',
      meta: { requestId: getRequestId(req), timestamp: new Date().toISOString() },
    });
  }
};
