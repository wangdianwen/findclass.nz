/**
 * Teachers Module - Controller
 */

import type { Request, Response, NextFunction } from 'express';
import {
  getTeacherProfile,
  submitTeacherOnboarding,
  uploadQualification,
} from './teachers.service';
import { createSuccessResponse } from '@shared/types/api';
import { getRequestId } from '@shared/utils/request';

export const getTeacherController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Teacher ID is required',
        meta: {
          requestId: getRequestId(req),
        },
      });
      return;
    }
    const teacher = await getTeacherProfile(id as string);

    if (!teacher) {
      res.status(404).json({
        success: false,
        code: 404,
        message: 'Teacher not found',
        meta: {
          requestId: getRequestId(req),
        },
      });
      return;
    }

    res.json(createSuccessResponse(teacher, 'Teacher retrieved', undefined, getRequestId(req)));
  } catch (error) {
    next(error);
  }
};

export const teacherOnboardingController = async (
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
    const result = await submitTeacherOnboarding(userId, dto);

    res
      .status(201)
      .json(
        createSuccessResponse(
          result,
          'Onboarding application submitted',
          undefined,
          getRequestId(req)
        )
      );
  } catch (error) {
    next(error);
  }
};

export const uploadQualificationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({
        success: false,
        code: 400,
        message: 'Teacher ID is required',
        meta: {
          requestId: getRequestId(req),
        },
      });
      return;
    }

    const dto = req.body;
    const result = await uploadQualification(id as string, dto);

    res
      .status(201)
      .json(createSuccessResponse(result, 'Qualification uploaded', undefined, getRequestId(req)));
  } catch (error) {
    next(error);
  }
};
