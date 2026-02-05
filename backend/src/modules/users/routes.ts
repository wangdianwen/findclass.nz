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
} from './users.controller';
import { UpdateProfileDto, AddChildDto, ParentalConsentDto } from './users.types';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/profile', getProfileController);
router.put('/profile', validateRequest(UpdateProfileDto), updateProfileController);
router.get('/children', getChildrenController);
router.post('/children', validateRequest(AddChildDto), addChildController);
router.post('/parental-consent', validateRequest(ParentalConsentDto), parentalConsentController);
router.get('/favorites', getFavoritesController);

export { router as userRoutes };
