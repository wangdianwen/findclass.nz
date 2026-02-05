/**
 * Courses Module - Controller
 */

import { Request, Response, NextFunction } from 'express';
import {
  searchCourses,
  getCourseDetail,
  toggleFavorite,
  getCourseTranslation,
} from './courses.service';
import { createSuccessResponse, createPaginatedResponse } from '@shared/types/api';
import { SearchCoursesDto } from './courses.types';
import { getRequestId, extractStringParam } from '@shared/utils/request';

export const searchCoursesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const queryParams = {
      ...req.query,
      keyword: req.query.keyword as string,
      category: req.query.category as string,
      priceMin: req.query.priceMin ? parseFloat(req.query.priceMin as string) : undefined,
      priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined,
      teachingMode: req.query.teachingMode as string,
      location: req.query.location as string,
      trustLevel: req.query.trustLevel as string,
      language: req.query.language as string,
      sortBy: req.query.sortBy as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };

    const result = await searchCourses(queryParams as SearchCoursesDto);

    res.json(
      createPaginatedResponse(
        result.items,
        result.pagination,
        'Courses retrieved',
        queryParams.language as 'zh' | 'en' | undefined,
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
    const { id } = req.params;
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

    const result = await toggleFavorite(userId as string, id as string);

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
