/**
 * Data Aggregation Module - Controller
 */

import type { Request, Response, NextFunction } from 'express';
import {
  aggregateDataFromSource,
  assessDataQuality,
  calculateTrustBadge,
  desensitizeData,
  submitFeedback,
} from './data-aggregation.service';
import { createSuccessResponse } from '@shared/types/api';

export const aggregateDataController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { source } = req.body;
    const result = await aggregateDataFromSource(source);

    res.json(
      createSuccessResponse(
        result,
        'Data aggregation completed',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

export const assessQualityController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { dataId } = req.params;
    if (!dataId) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Data ID is required',
        meta: {
          requestId: req.headers['x-request-id'],
        },
      });
      return;
    }
    const result = await assessDataQuality(dataId as string);

    res.json(
      createSuccessResponse(
        result,
        'Quality assessment completed',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

export const calculateTrustBadgeController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { entityType, entityId } = req.params;
    if (!entityType || !entityId) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Entity type and ID are required',
        meta: {
          requestId: req.headers['x-request-id'],
        },
      });
      return;
    }
    const result = await calculateTrustBadge(entityType as string, entityId as string);

    res.json(
      createSuccessResponse(
        result,
        'Trust badge calculated',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

export const desensitizeDataController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = req.body;
    const result = await desensitizeData(data);

    res.json(
      createSuccessResponse(
        result,
        'Data desensitized',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

export const submitFeedbackController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required',
        },
      });
      return;
    }
    const dto = req.body;
    const result = await submitFeedback(userId, dto);

    res
      .status(201)
      .json(
        createSuccessResponse(
          result,
          'Feedback submitted',
          undefined,
          req.headers['x-request-id'] as string
        )
      );
  } catch (error) {
    next(error);
  }
};
