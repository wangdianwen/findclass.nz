/**
 * Teachers Module - Routes
 */

import { Router } from 'express';
import { authenticate } from '@shared/middleware/auth';
import {
  getTeacherController,
  listTeachersController,
  teacherOnboardingController,
  uploadQualificationController,
} from './teachers.controller';
import { TeacherOnboardingDto } from './teachers.types';
import { validateRequest } from '@shared/middleware/validator';

const router = Router();

// Public routes
router.get('/', listTeachersController);
router.get('/:id', getTeacherController);

// Protected routes
router.post(
  '/onboarding',
  authenticate,
  validateRequest(TeacherOnboardingDto),
  teacherOnboardingController
);
router.post('/:id/qualifications', authenticate, uploadQualificationController);

export { router as teacherRoutes };
