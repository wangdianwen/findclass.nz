/**
 * Auth Module - Routes
 * Express routes for authentication endpoints
 */

import { Router } from 'express';
import { validateRequest } from '@shared/middleware/validator';
import { authenticate, authorize } from '@shared/middleware/auth';
import {
  RegisterDto,
  LoginDto,
  SendVerificationCodeDto,
  VerifyCodeDto,
  RefreshTokenDto,
  PasswordResetRequestDto,
  PasswordResetDto,
  UpdateProfileDto,
  ApplyRoleDto,
  ApproveRoleDto,
  SocialLoginDto,
} from './auth.types';
import {
  registerController,
  loginController,
  socialLoginController,
  sendVerificationCodeController,
  verifyCodeController,
  refreshTokenController,
  logoutController,
  getCurrentUserController,
  updateCurrentUserController,
  passwordResetRequestController,
  passwordResetController,
  getMyRolesController,
  applyRoleController,
  approveRoleApplicationController,
  cancelRoleApplicationController,
  getPendingRoleApplicationsController,
  getApplicationDetailController,
  getApplicationHistoryController,
  getMyApplicationsController,
} from './auth.controller';

const router = Router();

// Public routes
router.post('/register', validateRequest(RegisterDto), registerController);
router.post('/login', validateRequest(LoginDto), loginController);
router.post('/social-login', validateRequest(SocialLoginDto), socialLoginController);
router.post(
  '/send-verification-code',
  validateRequest(SendVerificationCodeDto),
  sendVerificationCodeController
);
router.post('/verify-code', validateRequest(VerifyCodeDto), verifyCodeController);
router.post('/refresh', validateRequest(RefreshTokenDto), refreshTokenController);
router.post(
  '/password/reset-request',
  validateRequest(PasswordResetRequestDto),
  passwordResetRequestController
);
router.post('/password/reset', validateRequest(PasswordResetDto), passwordResetController);

// Protected routes
router.post('/logout', authenticate, logoutController);
router.get('/me', authenticate, getCurrentUserController);
router.put('/me', authenticate, validateRequest(UpdateProfileDto), updateCurrentUserController);

// RBAC routes
router.get('/roles', authenticate, getMyRolesController);
router.post('/roles/apply', authenticate, validateRequest(ApplyRoleDto), applyRoleController);

// User's own application management
router.delete('/roles/applications/:id', authenticate, cancelRoleApplicationController);

// Admin routes - require ADMIN role
router.post(
  '/roles/applications/:id/approve',
  authenticate,
  authorize('ADMIN'),
  validateRequest(ApproveRoleDto),
  approveRoleApplicationController
);

router.get(
  '/roles/applications/pending',
  authenticate,
  authorize('ADMIN'),
  getPendingRoleApplicationsController
);

// User routes - my applications (must be before :id route)
router.get('/roles/applications/my', authenticate, getMyApplicationsController);

// Admin routes - application detail and history
router.get(
  '/roles/applications/:id',
  authenticate,
  authorize('ADMIN'),
  getApplicationDetailController
);

router.get(
  '/roles/applications/:id/history',
  authenticate,
  authorize('ADMIN'),
  getApplicationHistoryController
);

export { router as authRoutes };
