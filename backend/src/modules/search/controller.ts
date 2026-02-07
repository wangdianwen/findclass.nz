/**
 * Search Module - Controller
 * HTTP request handlers for search endpoints
 */

import type { Request, Response, NextFunction } from 'express';
import { createSuccessResponse } from '@shared/types/api';
import { logger } from '@core/logger';
import { getPopularSearches, getSearchSuggestions } from './service';
import type { GetSuggestionsQuery } from './types';

// Get popular searches
export const getPopularSearchController = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    logger.info('Get popular searches request received');

    const keywords = getPopularSearches();

    res.json(
      createSuccessResponse(
        keywords,
        'Popular searches retrieved successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    logger.error('Get popular searches error', { error });
    next(error);
  }
};

// Get search suggestions
/**
 * @swagger
 * /search/suggestions:
 *   get:
 *     tags:
 *       - Search
 *     summary: Get search suggestions
 *     description: Returns search suggestions based on query parameter
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query string
 *     responses:
 *       200:
 *         description: Search suggestions retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: [course]
 *                   teacherName:
 *                     type: string
 *                   subject:
 *                     type: string
 *       400:
 *         description: Invalid query parameter
 */
export const getSearchSuggestionsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { q } = req.query as unknown as GetSuggestionsQuery;

    logger.info('Get search suggestions request received', { query: q });

    if (!q || q.trim().length === 0) {
      // Return empty array for empty query
      res.json(
        createSuccessResponse(
          [],
          'Search suggestions retrieved successfully',
          undefined,
          req.headers['x-request-id'] as string
        )
      );
      return;
    }

    const suggestions = await getSearchSuggestions(q);

    res.json(
      createSuccessResponse(
        suggestions,
        'Search suggestions retrieved successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    logger.error('Get search suggestions error', { error });
    next(error);
  }
};
