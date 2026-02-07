/**
 * Search Module - Routes
 * Express routes for search endpoints
 */

import { Router } from 'express';
import { getPopularSearchController, getSearchSuggestionsController } from './controller';

const router = Router();

// GET /search/popular - Get popular search keywords
router.get('/popular', getPopularSearchController);

// GET /search/suggestions - Get search suggestions
router.get('/suggestions', getSearchSuggestionsController);

export { router as searchRoutes };
