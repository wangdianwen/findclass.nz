/**
 * Upload Module - Routes
 */

import { Router } from 'express';
import { authenticate } from '@shared/middleware/auth';
import { uploadAvatarController, uploadQualificationController } from './controller';
import { uploadAvatar, uploadQualification } from './middleware/multer.config';

const router = Router();

// All upload routes require authentication
router.use(authenticate);

// Avatar upload endpoint
router.post('/avatar', uploadAvatar.single('avatar'), uploadAvatarController);

// Qualification upload endpoint
router.post(
  '/qualification/:type',
  uploadQualification.single('file'),
  uploadQualificationController
);

export { router as uploadRoutes };
