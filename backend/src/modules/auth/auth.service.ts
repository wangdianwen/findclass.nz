/**
 * Auth Module - Service
 * Handles authentication logic using PostgreSQL
 */

import bcrypt from 'bcryptjs';
import jwt, { type Secret } from 'jsonwebtoken';
import crypto from 'crypto';
import { getPool } from '@shared/db/postgres/client';
import { getConfig } from '../../config';
import { logger } from '@core/logger';
import { createAppError, ErrorCode } from '@core/errors';
import { UserStatus, UserRole } from '@shared/types';
import {
  UserRepository,
  type User,
  type CreateUserDTO,
  type UpdateUserDTO,
} from './user.repository';
import { SessionRepository, hashToken } from './session.repository';
import { VerificationCodeRepository } from './verification.repository';
import { RoleApplicationRepository, type ApplicationStatus } from './role-application.repository';
import type {
  AuthResponse,
  RegisterDto,
  LoginDto,
  UserRoleInfo,
  RoleApplicationResponse,
  UserRolesResponse,
  RoleApplicationDetailResponse,
} from './auth.types';
import { AuthType, RoleApplicationStatus } from './auth.types';
import {
  generateToken as generateAccessToken,
  generateRefreshToken,
} from '@shared/middleware/auth';
import { sendVerificationEmail } from '@shared/smtp/email.service';
import type { SocialLoginDto } from './auth.types';

// Verification code configuration
const VERIFICATION_CODE_TTL = 300; // 5 minutes

/**
 * Get repositories (creates new instances with pool client)
 */
function getRepositories() {
  const pool = getPool();
  return {
    userRepository: new UserRepository(pool),
    sessionRepository: new SessionRepository(pool),
    verificationRepository: new VerificationCodeRepository(pool),
    roleApplicationRepository: new RoleApplicationRepository(pool),
  };
}

// Service methods
export async function register(data: RegisterDto): Promise<AuthResponse> {
  const { email: rawEmail, password, name, role, phone, language } = data;
  const email = rawEmail.toLowerCase();

  logger.info('Registering new user', { email, role });

  const config = getConfig();
  const bcryptRounds = config.auth.bcryptRounds;
  const passwordHash = await bcrypt.hash(password, bcryptRounds);

  const { userRepository } = getRepositories();

  // Check if email already exists
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw createAppError('Email already registered', ErrorCode.AUTH_EMAIL_EXISTS);
  }

  const createUserDTO: CreateUserDTO = {
    email,
    password_hash: passwordHash,
    name,
    phone,
    role,
    language,
  };

  const user = await userRepository.create(createUserDTO);

  logger.info('User registered successfully', { userId: user.id, email });

  const token = generateAccessToken({
    userId: user.id,
    email,
    role,
  });
  const refreshToken = generateRefreshToken(user.id);

  return {
    user,
    accessToken: token,
    refreshToken,
    expiresIn: 7 * 24 * 60 * 60,
    tokenType: 'Bearer',
  };
}

export async function login(data: LoginDto): Promise<AuthResponse> {
  const { email, password } = data;

  logger.info('User login attempt', { email });

  const { userRepository } = getRepositories();

  // Find user by email
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw createAppError('Invalid email or password', ErrorCode.AUTH_INVALID_TOKEN);
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw createAppError('Invalid email or password', ErrorCode.AUTH_INVALID_TOKEN);
  }

  // Re-fetch user to ensure strong consistency
  const latestUser = await userRepository.findById(user.id);
  if (!latestUser) {
    throw createAppError('User not found', ErrorCode.USER_NOT_FOUND);
  }

  // Check user status
  if (latestUser.status === UserStatus.DISABLED) {
    throw createAppError('Account is disabled', ErrorCode.FORBIDDEN);
  }

  // Generate tokens
  const token = generateAccessToken({
    userId: latestUser.id,
    email: latestUser.email,
    role: latestUser.role,
  });
  const refreshToken = generateRefreshToken(latestUser.id);

  logger.info('User logged in successfully', { userId: latestUser.id, email });

  return {
    accessToken: token,
    refreshToken,
    expiresIn: 7 * 24 * 60 * 60,
    tokenType: 'Bearer',
    user: {
      id: latestUser.id,
      email: latestUser.email,
      name: latestUser.name,
      role: latestUser.role,
    },
  };
}

/**
 * Social login - authenticate user via Google or WeChat
 */
export async function socialLogin(data: SocialLoginDto): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}> {
  const { provider, socialToken, avatar, name } = data;

  logger.info('Social login attempt', { provider });

  const { userRepository } = getRepositories();
  const config = getConfig();

  // Verify social token based on provider
  // In production, this would call Google/WeChat APIs to verify the token
  // For now, we'll use the socialToken as a unique identifier
  const providerId = `${provider}:${socialToken}`;

  // Check if user already exists with this social provider
  let user = await userRepository.findByProviderId(providerId);

  if (!user) {
    // Check if user exists by email if we have additional info
    // For new social login users, create a placeholder account
    logger.info('Creating new user via social login', { provider });

    const createUserDTO: CreateUserDTO = {
      email: `${providerId}@social.local`, // Placeholder email
      password_hash: await bcrypt.hash(
        crypto.randomBytes(32).toString('hex'),
        config.auth.bcryptRounds
      ),
      name: name || `${provider} User`,
      role: UserRole.PARENT,
      avatar_url: avatar,
      provider_id: providerId,
      provider_type: provider,
    };

    user = await userRepository.create(createUserDTO);

    logger.info('Social login user created', { userId: user.id, provider });
  } else {
    // Update user's avatar if provided
    if (avatar && avatar !== user.avatar_url) {
      await userRepository.update(user.id, { avatar_url: avatar });
      user = { ...user, avatar_url: avatar };
    }

    logger.info('Social login user authenticated', { userId: user.id, provider });
  }

  // Check user status
  if (user.status === UserStatus.DISABLED) {
    throw createAppError('Account is disabled', ErrorCode.FORBIDDEN);
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = generateRefreshToken(user.id);

  logger.info('Social login successful', { userId: user.id, provider });

  return {
    accessToken,
    refreshToken,
    expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
    tokenType: 'Bearer',
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { userRepository } = getRepositories();
  return userRepository.findByEmail(email);
}

export async function getUserById(userId: string): Promise<User | null> {
  const { userRepository } = getRepositories();
  return userRepository.findById(userId);
}

export async function updateUserPassword(userId: string, newPasswordHash: string): Promise<void> {
  const { userRepository } = getRepositories();

  await userRepository.update(userId, {
    name: undefined, // Won't update name
    phone: undefined,
    avatar_url: undefined,
    role: undefined,
    status: undefined,
  } as UpdateUserDTO);

  // Actually update the password directly
  const pool = getPool();
  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    newPasswordHash,
    userId,
  ]);
}

/**
 * Generate a cryptographically secure numeric verification code
 */
export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Send verification code to email
 */
export async function sendVerificationCode(
  email: string,
  type: AuthType
): Promise<{ expiresIn: number }> {
  logger.info('Sending verification code', { email, type });

  try {
    const { verificationRepository } = getRepositories();

    // Check rate limit - find recent code
    const hasRecentCode = await verificationRepository.hasRecentCode(email, type);
    if (hasRecentCode) {
      throw createAppError(
        'Rate limit exceeded. Please try again later.',
        ErrorCode.RATE_LIMIT_EXCEEDED
      );
    }

    // Generate and store code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL * 1000);

    await verificationRepository.create({
      email,
      code,
      type,
      expires_at: expiresAt,
    });

    // Send verification email via AWS SES
    const emailSent = await sendVerificationEmail({
      email,
      code,
      type,
      expiresIn: VERIFICATION_CODE_TTL,
    });

    if (!emailSent) {
      logger.warn('Failed to send verification email, but code was generated', { email, type });
    }

    logger.info('Verification code sent', {
      email,
      type,
      emailSent,
    });

    return { expiresIn: VERIFICATION_CODE_TTL };
  } catch (error) {
    if (error instanceof Error && 'isOperational' in error) {
      throw error;
    }
    logger.error('Failed to send verification code', { email, type, error });
    throw createAppError(
      'Service temporarily unavailable. Please try again later.',
      ErrorCode.INTERNAL_ERROR
    );
  }
}

/**
 * Verify the code entered by user
 */
export async function verifyCode(email: string, code: string, type: AuthType): Promise<boolean> {
  const { verificationRepository } = getRepositories();

  const result = await verificationRepository.verifyAndMarkUsed(email, code, type);

  if (!result.valid) {
    throw createAppError(result.error || 'Verification code expired', ErrorCode.AUTH_CODE_EXPIRED);
  }

  logger.info('Verification code validated successfully', { email, type });
  return true;
}

/**
 * Rotate refresh token - invalidate old and generate new tokens
 */
export async function rotateRefreshToken(oldRefreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const config = getConfig();

  // Verify old refresh token
  let decoded: { userId: string; type: string; jti: string };
  try {
    decoded = jwt.verify(oldRefreshToken, config.jwt.secret as Secret, {
      algorithms: ['HS256'],
    }) as { userId: string; type: string; jti: string };
  } catch {
    throw createAppError('Invalid refresh token', ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
  }

  if (decoded.type !== 'refresh') {
    throw createAppError('Invalid token type', ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
  }

  // Check if token is blacklisted
  const { sessionRepository } = getRepositories();
  const isBlacklisted = await sessionRepository.isBlacklisted(decoded.jti);
  if (isBlacklisted) {
    throw createAppError('Token has been revoked', ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
  }

  // Get user
  const user = await getUserById(decoded.userId);
  if (!user) {
    throw createAppError('User not found', ErrorCode.USER_NOT_FOUND);
  }

  if (user.status === UserStatus.DISABLED) {
    throw createAppError('Account is disabled', ErrorCode.FORBIDDEN);
  }

  // Add old token to blacklist
  await sessionRepository.addToBlacklist(
    decoded.jti,
    user.id,
    hashToken(oldRefreshToken),
    new Date()
  );

  // Generate new tokens
  const newAccessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const newRefreshToken = generateRefreshToken(user.id);

  logger.info('Tokens rotated successfully', { userId: user.id });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: parseInt(config.jwt.expiresIn, 10),
  };
}

/**
 * Logout - revoke all user tokens
 */
export async function logout(
  userId: string,
  refreshToken?: string,
  accessToken?: string
): Promise<void> {
  logger.info('User logout', {
    userId,
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
  });

  const { sessionRepository } = getRepositories();

  if (accessToken) {
    try {
      const config = getConfig();
      const decoded = jwt.verify(accessToken, config.jwt.secret as Secret) as { jti?: string };
      if (decoded.jti) {
        await sessionRepository.addToBlacklist(
          decoded.jti,
          userId,
          hashToken(accessToken),
          new Date()
        );
      }
    } catch {
      // Token might be invalid, ignore
    }
  }

  if (refreshToken) {
    try {
      const config = getConfig();
      const decoded = jwt.verify(refreshToken, config.jwt.secret as Secret) as { jti?: string };
      if (decoded.jti) {
        await sessionRepository.addToBlacklist(
          decoded.jti,
          userId,
          hashToken(refreshToken),
          new Date()
        );
      }
    } catch {
      // Token might be invalid, ignore
    }
  }
}

/**
 * Get current user by user ID
 */
export async function getCurrentUser(userId: string): Promise<User | null> {
  if (!userId) {
    return null;
  }
  return getUserById(userId);
}

/**
 * Update current user profile
 */
export async function updateCurrentUser(
  userId: string,
  data: {
    name?: string;
    phone?: string;
    profile?: {
      avatar?: string;
      wechat?: string;
    };
  }
): Promise<User> {
  const { userRepository } = getRepositories();

  const updateData: UpdateUserDTO = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.phone !== undefined) {
    updateData.phone = data.phone;
  }

  if (data.profile?.avatar !== undefined) {
    updateData.avatar_url = data.profile.avatar;
  }

  const updatedUser = await userRepository.update(userId, updateData);

  if (!updatedUser) {
    throw createAppError('User not found after update', ErrorCode.USER_NOT_FOUND);
  }

  logger.info('User profile updated', { userId });
  return updatedUser;
}

/**
 * Request password reset - send verification code
 * Security: Always returns success to prevent user enumeration
 */
export async function requestPasswordReset(email: string): Promise<{ expiresIn: number }> {
  logger.info('Password reset requested', { email });

  const user = await getUserByEmail(email);

  // Only send verification code if user exists
  if (user) {
    const result = await sendVerificationCode(email, AuthType.FORGOT_PASSWORD);
    return result;
  }

  // Log internally for monitoring, but don't expose to caller
  logger.info('Password reset for non-existent email (no email sent)', { email });

  // Return success to prevent user enumeration
  return { expiresIn: VERIFICATION_CODE_TTL };
}

/**
 * Reset password with verification code
 */
export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  logger.info('Password reset attempt', { email });

  const isValid = await verifyCode(email, code, AuthType.FORGOT_PASSWORD);
  if (!isValid) {
    throw createAppError('Invalid or expired verification code', ErrorCode.AUTH_INVALID_CODE);
  }

  const user = await getUserByEmail(email);
  if (user) {
    const config = getConfig();
    const newPasswordHash = await bcrypt.hash(newPassword, config.auth.bcryptRounds);
    await updateUserPassword(user.id, newPasswordHash);
    logger.info('Password reset successful', { userId: user.id });
  } else {
    logger.info('Password reset for non-existent user (security: no error)', { email });
  }
}

/**
 * RBAC Service Methods
 */

/**
 * Get user's current role and pending role applications
 */
export async function getUserRoles(userId: string): Promise<UserRolesResponse> {
  logger.info('Getting user roles', { userId });

  const user = await getUserById(userId);
  if (!user) {
    throw createAppError('User not found', ErrorCode.USER_NOT_FOUND);
  }

  const { roleApplicationRepository } = getRepositories();

  // Get pending role application
  const pendingApplication = await roleApplicationRepository.findPendingByUserId(userId);

  // Get all role applications for history
  const applications = await roleApplicationRepository.findByUserId(userId);

  // Build role history from applications
  const roles: UserRoleInfo[] = [];

  // Add current role
  roles.push({
    role: user.role,
    status: RoleApplicationStatus.APPROVED,
    appliedAt: user.created_at.toISOString(),
    processedAt: user.created_at.toISOString(),
  });

  // Add processed role change applications
  for (const app of applications) {
    if (app.status !== 'PENDING') {
      roles.push({
        role: app.role,
        status: app.status as RoleApplicationStatus,
        appliedAt: app.applied_at.toISOString(),
        processedAt: app.reviewed_at?.toISOString(),
      });
    }
  }

  return {
    currentRole: user.role,
    roles,
    pendingApplication: pendingApplication
      ? {
          applicationId: pendingApplication.id,
          role: pendingApplication.role,
          status: pendingApplication.status as RoleApplicationStatus,
          appliedAt: pendingApplication.applied_at.toISOString(),
        }
      : undefined,
  };
}

/**
 * Apply for a new role
 */
export async function applyForRole(
  userId: string,
  role: UserRole,
  reason?: string
): Promise<RoleApplicationResponse> {
  logger.info('Applying for role', { userId, role });

  const user = await getUserById(userId);
  if (!user) {
    throw createAppError('User not found', ErrorCode.USER_NOT_FOUND);
  }

  // Check if already has the role
  if (user.role === role) {
    throw createAppError(`You already have the ${role} role`, ErrorCode.VALIDATION_ERROR);
  }

  const { roleApplicationRepository } = getRepositories();

  // Check if there's already a pending application
  const hasPending = await roleApplicationRepository.hasPendingApplication(userId);
  if (hasPending) {
    throw createAppError('You already have a pending role application', ErrorCode.VALIDATION_ERROR);
  }

  const application = await roleApplicationRepository.create({
    user_id: userId,
    role,
    reason,
  });

  logger.info('Role application submitted', { userId, role, applicationId: application.id });

  return {
    applicationId: application.id,
    role: application.role,
    status: application.status as RoleApplicationStatus,
    appliedAt: application.applied_at.toISOString(),
  };
}

/**
 * Approve or reject a role application
 */
export async function approveRoleApplication(
  applicationId: string,
  adminId: string,
  approved: boolean,
  comment?: string
): Promise<void> {
  logger.info('Approving role application', { applicationId, adminId, approved });

  const adminUser = await getUserById(adminId);
  if (!adminUser) {
    throw createAppError('Admin user not found', ErrorCode.USER_NOT_FOUND);
  }

  if (adminUser.role !== UserRole.ADMIN) {
    throw createAppError('Only administrators can process role applications', ErrorCode.FORBIDDEN);
  }

  const { roleApplicationRepository, userRepository } = getRepositories();

  const application = await roleApplicationRepository.findById(applicationId);
  if (!application) {
    throw createAppError('Role application not found', ErrorCode.NOT_FOUND);
  }

  if (application.status !== 'PENDING') {
    throw createAppError('Application is not in pending status', ErrorCode.VALIDATION_ERROR);
  }

  const newStatus: ApplicationStatus = approved ? 'APPROVED' : 'REJECTED';

  // Update application status
  await roleApplicationRepository.updateStatus(applicationId, newStatus, adminId, comment);

  // If approved, update user's role
  if (approved) {
    await userRepository.update(application.user_id, { role: application.role });
  }

  logger.info('Role application processed', {
    applicationId,
    adminId,
    approved,
    newStatus,
    comment,
  });
}

/**
 * Cancel a pending role application
 */
export async function cancelRoleApplication(applicationId: string, userId: string): Promise<void> {
  logger.info('Cancelling role application', { applicationId, userId });

  const { roleApplicationRepository } = getRepositories();

  const cancelled = await roleApplicationRepository.cancel(applicationId, userId);

  if (!cancelled) {
    throw createAppError('Role application not found or cannot be cancelled', ErrorCode.NOT_FOUND);
  }

  logger.info('Role application cancelled', { applicationId, userId });
}

/**
 * Get pending role applications (admin only)
 */
export async function getPendingRoleApplications(
  adminId: string,
  limit: number = 50
): Promise<
  Array<{
    id: string;
    userId: string;
    role: UserRole;
    status: RoleApplicationStatus;
    reason?: string;
    appliedAt: string;
  }>
> {
  logger.info('Getting pending role applications', { adminId, limit });

  // Verify admin permissions
  const adminUser = await getUserById(adminId);
  if (!adminUser) {
    throw createAppError('Admin user not found', ErrorCode.USER_NOT_FOUND);
  }

  if (adminUser.role !== UserRole.ADMIN) {
    throw createAppError('Only administrators can view pending applications', ErrorCode.FORBIDDEN);
  }

  const { roleApplicationRepository } = getRepositories();
  const applications = await roleApplicationRepository.findPending(limit);

  return applications.map(app => ({
    id: app.id,
    userId: app.user_id,
    role: app.role,
    status: app.status as RoleApplicationStatus,
    reason: app.reason,
    appliedAt: app.applied_at.toISOString(),
  }));
}

/**
 * Get application history
 */
export async function getApplicationHistory(applicationId: string): Promise<
  Array<{
    id: string;
    applicationId: string;
    action: string;
    performedBy?: string;
    note?: string;
    createdAt: string;
  }>
> {
  logger.info('Getting application history', { applicationId });

  const { roleApplicationRepository } = getRepositories();
  const application = await roleApplicationRepository.getWithHistory(applicationId);

  if (!application) {
    throw createAppError('Role application not found', ErrorCode.NOT_FOUND);
  }

  return application.history.map(h => ({
    id: h.id,
    applicationId: h.application_id,
    action: h.action,
    performedBy: h.performed_by,
    note: h.comment,
    createdAt: h.created_at.toISOString(),
  }));
}

/**
 * Get detailed application with history
 */
export async function getApplicationDetail(
  applicationId: string
): Promise<RoleApplicationDetailResponse> {
  logger.info('Getting application detail', { applicationId });

  const { roleApplicationRepository } = getRepositories();
  const application = await roleApplicationRepository.getWithHistory(applicationId);

  if (!application) {
    throw createAppError('Role application not found', ErrorCode.NOT_FOUND);
  }

  const processedByName = application.reviewed_by
    ? (await getUserById(application.reviewed_by))?.name
    : undefined;

  return {
    applicationId: application.id,
    userId: application.user_id,
    role: application.role,
    status: application.status as RoleApplicationStatus,
    reason: application.reason,
    appliedAt: application.applied_at.toISOString(),
    processedAt: application.reviewed_at?.toISOString(),
    processedBy: application.reviewed_by,
    processedByName,
    comment: application.comment,
    history: application.history.map(h => ({
      id: h.id,
      applicationId: h.application_id,
      action: h.action,
      performedBy: h.performed_by || '',
      note: h.comment || undefined,
      createdAt: h.created_at.toISOString(),
    })),
  };
}

/**
 * Get user's role applications
 */
export async function getUserApplications(
  userId: string
): Promise<RoleApplicationDetailResponse[]> {
  logger.info('Getting user applications', { userId });

  const { roleApplicationRepository } = getRepositories();
  const applications = await roleApplicationRepository.findByUserId(userId);

  const detailedApplications: RoleApplicationDetailResponse[] = [];

  for (const app of applications) {
    const history = await roleApplicationRepository.getWithHistory(app.id);
    detailedApplications.push({
      applicationId: app.id,
      userId: app.user_id,
      role: app.role,
      status: app.status as RoleApplicationStatus,
      reason: app.reason,
      appliedAt: app.applied_at.toISOString(),
      processedAt: app.reviewed_at?.toISOString(),
      processedBy: app.reviewed_by,
      comment: app.comment,
      history:
        history?.history.map(h => ({
          id: h.id,
          applicationId: h.application_id,
          action: h.action,
          performedBy: h.performed_by || '',
          note: h.comment || undefined,
          createdAt: h.created_at.toISOString(),
        })) || [],
    });
  }

  return detailedApplications.sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
  );
}

/**
 * Check if user has a specific role
 */
export function userHasRole(user: User, requiredRole: UserRole): boolean {
  return user.role === requiredRole;
}

/**
 * Check if user has any of the specified roles
 */
export function userHasAnyRole(user: User, roles: UserRole[]): boolean {
  return roles.includes(user.role);
}

/**
 * Check if user is admin
 */
export function userIsAdmin(user: User): boolean {
  return user.role === UserRole.ADMIN;
}
