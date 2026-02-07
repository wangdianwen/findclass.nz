/**
 * Users Module - Routes
 */

import { Router } from 'express';
import { validateRequest } from '@shared/middleware/validator';
import { authenticate } from '@shared/middleware/auth';
import {
  getProfileController,
  updateProfileController,
  getChildrenController,
  addChildController,
  parentalConsentController,
  getFavoritesController,
  changePasswordController,
  deleteAccountController,
  updateChildController,
  deleteChildController,
  deleteLearningRecordController,
  markNotificationReadController,
  markAllNotificationsReadController,
  deleteNotificationController,
  getMyReviewsController,
  deleteReviewController,
} from './users.controller';
import {
  UpdateProfileDto,
  AddChildDto,
  ParentalConsentDto,
  ChangePasswordDto,
  UpdateChildDto,
} from './users.types';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/profile', getProfileController);
router.put('/profile', validateRequest(UpdateProfileDto), updateProfileController);
router.get('/children', getChildrenController);
router.post('/children', validateRequest(AddChildDto), addChildController);
router.put('/children/:id', validateRequest(UpdateChildDto), updateChildController);
router.delete('/children/:id', deleteChildController);
router.post('/parental-consent', validateRequest(ParentalConsentDto), parentalConsentController);
router.get('/favorites', getFavoritesController);

// Password and account management
router.put('/password', validateRequest(ChangePasswordDto), changePasswordController);
router.delete('/account', deleteAccountController);

// Learning history
router.delete('/history/:id', deleteLearningRecordController);

// Reviews
router.get('/reviews', getMyReviewsController);
router.delete('/reviews/:id', deleteReviewController);

// Notifications
router.put('/notifications/:id/read', markNotificationReadController);
router.put('/notifications/read-all', markAllNotificationsReadController);
router.delete('/notifications/:id', deleteNotificationController);

export { router as userRoutes };
