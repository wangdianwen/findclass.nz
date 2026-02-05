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
} from './courses.controller';

const router = Router();

// Public routes
router.get('/search', searchCoursesController);
router.get('/:id', getCourseDetailController);
router.get('/:id/translate', getCourseTranslationController);

// Protected routes
router.post('/:id/favorite', authenticate, toggleFavoriteController);

export { router as courseRoutes };
