/**
 * Courses Module - Routes
 */

import { Router } from 'express';
import { authenticate } from '@shared/middleware/auth';
import {
  searchCoursesController,
  getCourseDetailController,
  getCourseTranslationController,
  toggleFavoriteController,
  getFeaturedCoursesController,
  getFilterOptionsController,
  getRegionsByCityController,
  getSimilarCoursesController,
} from './courses.controller';

const router = Router();

// Public routes
router.get('/search', searchCoursesController);
router.get('/featured', getFeaturedCoursesController);
router.get('/filter/options', getFilterOptionsController);
router.get('/regions/:city', getRegionsByCityController);
router.get('/:id', getCourseDetailController);
router.get('/:id/translate', getCourseTranslationController);
router.get('/:id/similar', getSimilarCoursesController);

// Protected routes
router.post('/:id/favorite', authenticate, toggleFavoriteController);

export { router as courseRoutes };
