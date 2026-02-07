/**
 * Teachers Module - Controller
 */

import type { Request, Response, NextFunction } from 'express';
import {
  getTeacherProfile,
  submitTeacherOnboarding,
  uploadQualification,
  listTeachers,
} from './teachers.service';
import { createSuccessResponse, createPaginatedResponse } from '@shared/types/api';
import { getRequestId, extractStringParam } from '@shared/utils/request';
import type { TeacherFilters } from './teachers.service';
import type { VerificationStatus } from '@shared/types';

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

// List teachers with pagination and filtering
export const listTeachersController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { city, subject, status, page = '1', limit = '20' } = req.query as Record<string, string>;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    const filters: TeacherFilters = {
      location: extractStringParam(city) || extractStringParam(subject),
      teachingSubject: extractStringParam(subject),
      verificationStatus: extractStringParam(status) as VerificationStatus | undefined,
      limit: limitNum,
      offset,
    };

    const [teachers, total] = await Promise.all([
      listTeachers(filters),
      // Import countTeachers from service
      (async () => {
        const { countTeachers } = await import('./teachers.service');
        return countTeachers({
          verificationStatus: filters.verificationStatus,
          teachingSubject: filters.teachingSubject,
        });
      })(),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json(
      createPaginatedResponse(
        teachers,
        {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        'Teachers retrieved successfully',
        undefined,
        getRequestId(req)
      )
    );
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
