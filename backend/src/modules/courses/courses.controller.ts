/**
 * Courses Module - Controller
 */

import type { Request, Response, NextFunction } from 'express';
import {
  searchCourses,
  getCourseDetail,
  toggleFavorite,
  getCourseTranslation,
} from './courses.service';
import { createSuccessResponse, createPaginatedResponse } from '@shared/types/api';
import { SortBy } from './courses.types';
import type { CourseCategory, TrustLevel } from '@shared/types';
import { getRequestId, extractStringParam } from '@shared/utils/request';

export const searchCoursesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const language = (extractStringParam(req.query.language as string | string[] | undefined) ||
      req.headers['accept-language'] ||
      'zh') as 'zh' | 'en';

    const queryParams = {
      keyword: req.query.keyword as string | undefined,
      category: req.query.category as CourseCategory | undefined,
      city: req.query.city as string | undefined,
      priceMin: req.query.priceMin ? parseFloat(req.query.priceMin as string) : undefined,
      priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined,
      ratingMin: req.query.ratingMin ? parseFloat(req.query.ratingMin as string) : undefined,
      trustLevel: req.query.trustLevel as TrustLevel | undefined,
      teachingMode: req.query.teachingMode as 'ONLINE' | 'OFFLINE' | 'BOTH' | undefined,
      sortBy: (req.query.sortBy as SortBy) || SortBy.RELEVANCE,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };

    const result = await searchCourses(queryParams);

    res.json(
      createPaginatedResponse(
        result.items,
        result.pagination,
        'Courses retrieved',
        language,
        getRequestId(req)
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getCourseDetailController = async (
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
        message: 'Course ID is required',
        meta: {
          requestId: getRequestId(req),
        },
      });
      return;
    }

    const language =
      (extractStringParam(req.query.language as string | string[] | undefined) as 'zh' | 'en') ||
      'zh';
    const course = await getCourseDetail(id as string);

    if (!course) {
      res.status(404).json({
        success: false,
        code: 404,
        message: 'Course not found',
        meta: {
          requestId: getRequestId(req),
        },
      });
      return;
    }

    res.json(createSuccessResponse(course, 'Course retrieved', language, getRequestId(req)));
  } catch (error) {
    next(error);
  }
};

export const getCourseTranslationController = async (
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
        message: 'Course ID is required',
        meta: {
          requestId: getRequestId(req),
        },
      });
      return;
    }

    const targetLang =
      (extractStringParam(req.query.targetLang as string | string[] | undefined) as 'zh' | 'en') ||
      'en';

    const translation = await getCourseTranslation(id as string, targetLang);

    if (!translation) {
      res.status(404).json({
        success: false,
        code: 404,
        message: 'Course translation not found',
        meta: {
          requestId: getRequestId(req),
        },
      });
      return;
    }

    res.json(
      createSuccessResponse(translation, 'Translation retrieved', targetLang, getRequestId(req))
    );
  } catch (error) {
    next(error);
  }
};

export const toggleFavoriteController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const id = req.params.id as string;
    if (!id || !userId) {
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: !id ? 'Course ID is required' : 'User authentication required',
          details: {
            field: !id ? 'id' : 'user',
            value: id || userId,
          },
        },
      });
      return;
    }

    const result = await toggleFavorite(userId, id);

    res.json(
      createSuccessResponse(
        result,
        result.favorited ? 'Course favorited' : 'Course unfavorited',
        undefined,
        getRequestId(req)
      )
    );
  } catch (error) {
    next(error);
  }
};
