/**
 * Auth Module - Controller
 * HTTP request handlers for authentication
 */

import type { Request, Response, NextFunction } from 'express';
import {
  register,
  login,
  sendVerificationCode,
  verifyCode,
  rotateRefreshToken,
  logout,
  getCurrentUser,
  updateCurrentUser,
  requestPasswordReset,
  resetPassword,
  getUserRoles,
  applyForRole,
  approveRoleApplication,
  cancelRoleApplication,
  getPendingRoleApplications,
  getApplicationHistory,
  getApplicationDetail,
  getUserApplications,
} from './auth.service';
import { createSuccessResponse } from '@shared/types/api';
import { logger } from '@core/logger';
import { createAppError, ErrorCode } from '@core/errors';
import type {
  SendVerificationCodeDto,
  VerifyCodeDto,
  RefreshTokenDto,
  AuthResponse,
  PasswordResetRequestDto,
  PasswordResetDto,
  UpdateProfileDto,
  ApplyRoleDto,
  ApproveRoleDto,
  GetPendingApplicationsDto,
} from './auth.types';
import { UserRole } from '@shared/types';

// Register controller
/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     description: Creates a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterResponse'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 */
export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = req.body;
    logger.info('Register controller: calling register()', { email: dto.email });
    const result = await register(dto);
    logger.info('Register controller: register() succeeded', { email: dto.email });

    res
      .status(201)
      .json(
        createSuccessResponse(
          result,
          'Registration successful',
          dto.language,
          req.headers['x-request-id'] as string
        )
      );
  } catch (error) {
    logger.error('Register controller caught error', { error });
    next(error);
  }
};

// Login controller
/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User login
 *     description: Authenticates user and returns access/refresh tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 */
export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = req.body;
    const result = await login(dto);

    res.json(
      createSuccessResponse(
        result,
        'Login successful',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    next(error);
  }
};

// Send verification code
/**
 * @swagger
 * /auth/send-verification-code:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Send verification code
 *     description: Sends a 6-digit verification code to the specified email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendVerificationCodeRequest'
 *     responses:
 *       200:
 *         description: Verification code sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerificationCodeResponse'
 *       429:
 *         description: Rate limit exceeded
 */
export const sendVerificationCodeController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = req.body as SendVerificationCodeDto;
    logger.info('Verification code requested', { email: dto.email, type: dto.type });

    const result = await sendVerificationCode(dto.email, dto.type);

    res.json(
      createSuccessResponse(
        result,
        'Verification code sent successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    logger.error('Send verification code error', { error });
    next(error);
  }
};

// Verify code
/**
 * @swagger
 * /auth/verify-code:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Verify verification code
 *     description: Verifies a 6-digit verification code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyCodeRequest'
 *     responses:
 *       200:
 *         description: Code verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifyCodeResponse'
 *       400:
 *         description: Invalid or expired code
 */
export const verifyCodeController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = req.body as VerifyCodeDto;
    logger.info('Verifying code', { email: dto.email, type: dto.type });

    await verifyCode(dto.email, dto.code, dto.type);

    res.json(
      createSuccessResponse(
        { verified: true },
        'Verification successful',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    logger.error('Verify code error', { error });
    next(error);
  }
};

// Refresh token
/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Refresh access token
 *     description: Exchanges a valid refresh token for new access and refresh tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid or expired refresh token
 */
export const refreshTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto = req.body as RefreshTokenDto;
    logger.info('Token refresh requested');

    const result = await rotateRefreshToken(dto.refreshToken);

    const response: AuthResponse = {
      token: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: {
        id: '',
        email: '',
        name: '',
        role: UserRole.PARENT,
      },
    };

    res.json(
      createSuccessResponse(
        response,
        'Token refreshed successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    logger.error('Token refresh error', { error });
    next(error);
  }
};

// Logout controller
/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User logout
 *     description: Invalidates the current access token and refresh token
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogoutResponse'
 */
export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId || '';
    const refreshToken = req.body?.refreshToken;
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    logger.info('Logout requested', { userId });

    await logout(userId, refreshToken, accessToken);

    res.json(
      createSuccessResponse(
        { message: 'Logged out successfully' },
        'Logged out successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    logger.error('Logout error', { error });
    next(error);
  }
};

// Get current user controller
/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile data
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
export const getCurrentUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    logger.info('Get current user', { userId });

    if (!userId) {
      throw createAppError('Unauthorized', ErrorCode.UNAUTHORIZED);
    }

    const user = await getCurrentUser(userId);
    if (!user) {
      throw createAppError('User not found', ErrorCode.USER_NOT_FOUND);
    }

    res.json(
      createSuccessResponse(
        { user },
        'User retrieved successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    logger.error('Get current user error', { error });
    next(error);
  }
};

// Update current user controller
/**
 * @swagger
 * /auth/me:
 *   put:
 *     tags:
 *       - Authentication
 *     summary: Update current user profile
 *     description: Updates the authenticated user's profile data
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: User profile updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
export const updateCurrentUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const dto = req.body as UpdateProfileDto;

    logger.info('Update current user', { userId });

    if (!userId) {
      throw createAppError('Unauthorized', ErrorCode.UNAUTHORIZED);
    }

    const updatedUser = await updateCurrentUser(userId, dto);

    res.json(
      createSuccessResponse(
        { user: updatedUser },
        'User updated successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    logger.error('Update current user error', { error });
    next(error);
  }
};

// Password reset request controller
/**
 * @swagger
 * /auth/password/reset-request:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request password reset
 *     description: |
 *       Initiates password reset process by sending a verification code.
 *       Security: Always returns success to prevent user enumeration.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordResetRequest'
 *     responses:
 *       200:
 *         description: Password reset code sent (or success if email not found)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerificationCodeResponse'
 *       429:
 *         description: Rate limit exceeded
 */
export const passwordResetRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body as PasswordResetRequestDto;
    logger.info('Password reset request', { email });

    const result = await requestPasswordReset(email);

    res.json(
      createSuccessResponse(
        result,
        'Password reset code sent to your email',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    logger.error('Password reset request error', { error });
    next(error);
  }
};

// Password reset controller
/**
 * @swagger
 * /auth/password/reset:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Reset password
 *     description: Resets user password using verification code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordResetRequest'
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PasswordResetResponse'
 *       400:
 *         description: Invalid or expired verification code
 */
export const passwordResetController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body as PasswordResetDto;
    logger.info('Password reset attempt', { email });

    await resetPassword(email, code, newPassword);

    res.json(
      createSuccessResponse(
        { success: true },
        'Password reset successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    logger.error('Password reset error', { error });
    next(error);
  }
};

/**
 * RBAC Controllers
 */

// Get current user's roles
/**
 * @swagger
 * /auth/roles:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current user's roles
 *     description: Returns the authenticated user's current role and role application history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User roles retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserRolesResponse'
 *       401:
 *         description: Unauthorized
 */
export const getMyRolesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    logger.info('Get my roles', { userId });

    if (!userId) {
      throw createAppError('Unauthorized', ErrorCode.UNAUTHORIZED);
    }

    const roles = await getUserRoles(userId);

    res.json(
      createSuccessResponse(
        roles,
        'Roles retrieved successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    logger.error('Get roles error', { error });
    next(error);
  }
};

// Apply for a new role
/**
 * @swagger
 * /auth/roles/apply:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Apply for a new role
 *     description: Submit a role application request
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApplyRoleRequest'
 *     responses:
 *       201:
 *         description: Role application submitted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoleApplicationResponse'
 *       400:
 *         description: Bad request
 */
export const applyRoleController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { role, reason } = req.body as ApplyRoleDto;

    logger.info('Apply role', { userId, role });

    if (!userId) {
      throw createAppError('Unauthorized', ErrorCode.UNAUTHORIZED);
    }

    const application = await applyForRole(userId, role, reason);

    res
      .status(201)
      .json(
        createSuccessResponse(
          application,
          'Role application submitted successfully',
          undefined,
          req.headers['x-request-id'] as string
        )
      );
  } catch (error) {
    logger.error('Apply role error', { error });
    next(error);
  }
};

// Approve or reject a role application (admin only)
/**
 * @swagger
 * /auth/roles/applications/{id}/approve:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Approve or reject a role application
 *     description: Admin endpoint to process role applications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApproveRoleRequest'
 *     responses:
 *       200:
 *         description: Application processed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
export const approveRoleApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminId = req.user?.userId;
    const applicationId = req.params.id as string;
    const { approved, comment } = req.body as ApproveRoleDto;

    logger.info('Approve role application', { adminId, applicationId, approved });

    if (!adminId || !applicationId) {
      throw createAppError('Unauthorized', ErrorCode.UNAUTHORIZED);
    }

    await approveRoleApplication(applicationId, adminId, approved, comment);

    res.json(
      createSuccessResponse(
        { success: true },
        approved ? 'Application approved' : 'Application rejected',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    logger.error('Approve role application error', { error });
    next(error);
  }
};

// Cancel a role application
/**
 * @swagger
 * /auth/roles/applications/{id}:
 *   delete:
 *     tags:
 *       - Authentication
 *     summary: Cancel a role application
 *     description: Cancels a pending role application
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application cancelled
 *       400:
 *         description: Application cannot be cancelled
 *       403:
 *         description: Forbidden - not your application
 *       404:
 *         description: Application not found
 */
export const cancelRoleApplicationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const applicationId = req.params.id as string;

    logger.info('Cancel role application', { userId, applicationId });

    if (!userId || !applicationId) {
      throw createAppError('Unauthorized', ErrorCode.UNAUTHORIZED);
    }

    await cancelRoleApplication(applicationId, userId);

    res.json(
      createSuccessResponse(
        { success: true },
        'Application cancelled successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    logger.error('Cancel role application error', { error });
    next(error);
  }
};

// Get pending role applications (admin only)
/**
 * @swagger
 * /auth/roles/applications/pending:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get pending role applications
 *     description: Returns a list of pending role applications (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *     responses:
 *       200:
 *         description: Pending applications list
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
export const getPendingRoleApplicationsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminId = req.user?.userId;
    const query = req.query as unknown as GetPendingApplicationsDto;
    const limit = query.limit || 50;

    logger.info('Get pending role applications', { adminId, limit });

    if (!adminId) {
      throw createAppError('Unauthorized', ErrorCode.UNAUTHORIZED);
    }

    const applications = await getPendingRoleApplications(adminId, limit);

    res.json(
      createSuccessResponse(
        { applications },
        'Pending applications retrieved successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    logger.error('Get pending role applications error', { error });
    next(error);
  }
};

// Get application detail with history (admin only)
export const getApplicationDetailController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminId = req.user?.userId;
    const applicationId = req.params.id as string;

    logger.info('Get application detail', { adminId, applicationId });

    if (!adminId) {
      throw createAppError('Unauthorized', ErrorCode.UNAUTHORIZED);
    }

    // Verify admin permission
    const adminUser = await getCurrentUser(adminId);
    if (!adminUser || adminUser.role !== UserRole.ADMIN) {
      throw createAppError('Only administrators can view application details', ErrorCode.FORBIDDEN);
    }

    const detail = await getApplicationDetail(applicationId);

    res.json(
      createSuccessResponse(
        detail,
        'Application detail retrieved successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    logger.error('Get application detail error', { error });
    next(error);
  }
};

// Get application history (admin only)
export const getApplicationHistoryController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminId = req.user?.userId;
    const applicationId = req.params.id as string;

    logger.info('Get application history', { adminId, applicationId });

    if (!adminId) {
      throw createAppError('Unauthorized', ErrorCode.UNAUTHORIZED);
    }

    // Verify admin permission
    const adminUser = await getCurrentUser(adminId);
    if (!adminUser || adminUser.role !== UserRole.ADMIN) {
      throw createAppError('Only administrators can view application history', ErrorCode.FORBIDDEN);
    }

    const history = await getApplicationHistory(applicationId);

    res.json(
      createSuccessResponse(
        { history },
        'Application history retrieved successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    logger.error('Get application history error', { error });
    next(error);
  }
};

// Get my role applications
export const getMyApplicationsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    logger.info('Get my applications', { userId });

    if (!userId) {
      throw createAppError('Unauthorized', ErrorCode.UNAUTHORIZED);
    }

    const applications = await getUserApplications(userId);

    res.json(
      createSuccessResponse(
        { applications },
        'Applications retrieved successfully',
        undefined,
        req.headers['x-request-id'] as string
      )
    );
  } catch (error) {
    logger.error('Get my applications error', { error });
    next(error);
  }
};
