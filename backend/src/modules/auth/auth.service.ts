/**
 * Auth Module - Service
 * Handles authentication logic
 */

import bcrypt from 'bcryptjs';
import jwt, { Secret } from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getConfig } from '../../config';
import { logger } from '@core/logger';
import { createAppError, ErrorCode } from '@core/errors';
import { User, UserStatus, UserRole } from '@shared/types';
import {
  getItem,
  createEntityKey,
  updateItem,
  getDynamoDBDocClient,
  transactWrite,
  queryItems,
  putItem,
} from '@shared/db/dynamodb';
import {
  getFromCache,
  setCache,
  deleteFromCache,
  incrementRateLimit,
  CacheKeys,
} from '@shared/db/cache';
import { addTokenToBlacklist, isTokenBlacklisted } from '@shared/middleware/auth';
import {
  AuthResponse,
  RegisterDto,
  LoginDto,
  AuthType,
  RoleApplicationStatus,
  UserRoleInfo,
  RoleApplicationResponse,
  UserRolesResponse,
  RoleApplication,
  RoleApplicationHistory,
  RoleApplicationDetailResponse,
} from './auth.types';
import {
  generateToken as generateAccessToken,
  generateRefreshToken,
} from '@shared/middleware/auth';
import { sendVerificationEmail } from '@shared/smtp/email.service';

// Verification code configuration
const VERIFICATION_CODE_TTL = 300; // 5 minutes
const RATE_LIMIT_WINDOW = 60; // 1 minute
const RATE_LIMIT_MAX = 3; // Max 3 requests per minute

// Role application TTL (30 days for pending applications)
const ROLE_APPLICATION_TTL = 30 * 24 * 60 * 60;

// Service methods
export async function register(data: RegisterDto): Promise<{
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const { email: rawEmail, password, name, role, phone, language } = data;
  const email = rawEmail.toLowerCase();

  logger.info('Registering new user', { email, role });

  const config = getConfig();
  const bcryptRounds = config.auth.bcryptRounds;
  const passwordHash = await bcrypt.hash(password, bcryptRounds);

  const userId = `usr_${uuidv4()}`;
  const { PK, SK } = createEntityKey('USER', userId);
  const now = new Date().toISOString();

  const user: User = {
    PK,
    SK,
    entityType: 'USER',
    dataCategory: 'USER',
    id: userId,
    email,
    name,
    phone,
    passwordHash,
    role,
    status: UserStatus.ACTIVE,
    language: language || 'zh',
    createdAt: now,
    updatedAt: now,
  };

  const emailPK = `EMAIL#${email}`;
  const emailSK = 'METADATA';

  const emailItem = {
    PK: emailPK,
    SK: emailSK,
    entityType: 'EMAIL',
    dataCategory: 'USER',
    email,
    userId,
    createdAt: now,
  };

  try {
    await transactWrite([
      {
        put: {
          item: emailItem,
          conditionExpression: 'attribute_not_exists(PK)',
        },
      },
      {
        put: {
          item: user as unknown as Record<string, unknown>,
          conditionExpression: 'attribute_not_exists(PK)',
        },
      },
    ]);
  } catch (error: any) {
    if (error.name === 'TransactionCanceledException') {
      throw createAppError('Email already registered', ErrorCode.AUTH_EMAIL_EXISTS);
    }
    throw error;
  }

  logger.info('User registered successfully', { userId, email });

  const token = generateAccessToken({
    userId,
    email,
    role,
  });
  const refreshToken = generateRefreshToken(userId);

  return {
    user,
    token,
    refreshToken,
    expiresIn: 7 * 24 * 60 * 60,
  };
}

export async function login(data: LoginDto): Promise<AuthResponse> {
  const { email, password } = data;

  logger.info('User login attempt', { email });

  // Find user by email
  const user = await getUserByEmail(email);
  if (!user) {
    throw createAppError('Invalid email or password', ErrorCode.AUTH_INVALID_TOKEN);
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw createAppError('Invalid email or password', ErrorCode.AUTH_INVALID_TOKEN);
  }

  // Re-fetch user by primary key to ensure strong consistency (e.g., after status update)
  const latestUser = await getUserById(user.id);
  if (!latestUser) {
    throw createAppError('User not found', ErrorCode.USER_NOT_FOUND);
  }

  // Check user status using latest data
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
    token,
    refreshToken,
    expiresIn: 7 * 24 * 60 * 60, // 7 days
    user: {
      id: latestUser.id,
      email: latestUser.email,
      name: latestUser.name,
      role: latestUser.role,
    },
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase();

  try {
    const emailPK = `EMAIL#${normalizedEmail}`;
    const emailItem = await getItem<{ userId: string }>({
      PK: emailPK,
      SK: 'METADATA',
    });

    if (emailItem && emailItem.userId) {
      const { PK, SK } = createEntityKey('USER', emailItem.userId);
      const user = await getItem<User>({ PK, SK });
      return user;
    }
  } catch (error) {
    logger.error('Email lookup failed.', { email, error });
  }

  return null;
}

export async function getUserById(userId: string): Promise<User | null> {
  const { PK, SK } = createEntityKey('USER', userId);
  return getItem<User>({ PK, SK });
}

export async function updateUserPassword(userId: string, newPasswordHash: string): Promise<void> {
  const { PK, SK } = createEntityKey('USER', userId);

  await updateItem({ PK, SK }, 'SET passwordHash = :passwordHash, updatedAt = :updatedAt', {
    ':passwordHash': newPasswordHash,
    ':updatedAt': new Date().toISOString(),
  });
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    const config = getConfig();
    const decoded = jwt.verify(token, config.jwt.secret as Secret, {
      algorithms: ['HS256'],
    }) as {
      userId: string;
    };
    return getUserById(decoded.userId);
  } catch {
    return null;
  }
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
    // Check rate limit using DynamoDB (key includes type for independent rate limiting)
    const rateLimitKey = `${email}:${type}`;
    const rateLimitResult = await incrementRateLimit(
      rateLimitKey,
      'email',
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW
    );

    if (!rateLimitResult.allowed) {
      throw createAppError(
        'Rate limit exceeded. Please try again later.',
        ErrorCode.RATE_LIMIT_EXCEEDED
      );
    }

    // Generate and store code using DynamoDB TTL cache
    const code = generateVerificationCode();
    const codeKey = CacheKeys.verify(email, type);

    await setCache(codeKey, 'VERIFY', code, VERIFICATION_CODE_TTL);

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
  const codeKey = CacheKeys.verify(email, type);

  const storedCode = await getFromCache<string>(codeKey, 'VERIFY');

  if (!storedCode) {
    throw createAppError('Verification code expired or not found', ErrorCode.AUTH_CODE_EXPIRED);
  }

  if (storedCode !== code) {
    throw createAppError('Invalid verification code', ErrorCode.AUTH_INVALID_CODE);
  }

  // Delete the used code
  await deleteFromCache(codeKey, 'VERIFY');

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

  // Check if token is blacklisted (with retry for eventual consistency)
  const isBlacklisted = await isTokenBlacklisted(decoded.jti);
  if (isBlacklisted) {
    throw createAppError('Token has been revoked', ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
  }

  // Get user
  const user = await getUserById(decoded.userId);
  if (!user) {
    throw createAppError('User not found', ErrorCode.USER_NOT_FOUND);
  }

  if (user.status === UserStatus.DISABLED || user.status === ('DELETED' as any)) {
    throw createAppError('Account is disabled', ErrorCode.FORBIDDEN);
  }

  // Add old token to blacklist
  await addTokenToBlacklist(decoded.jti);

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

  if (accessToken) {
    try {
      const config = getConfig();
      const decoded = jwt.verify(accessToken, config.jwt.secret as Secret) as { jti?: string };
      if (decoded.jti) {
        await addTokenToBlacklist(decoded.jti);
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
        await addTokenToBlacklist(decoded.jti);
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
  const { PK, SK } = createEntityKey('USER', userId);

  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, unknown> = {
    ':updatedAt': new Date().toISOString(),
  };
  const expressionAttributeNames: Record<string, string> = {};

  if (data.name !== undefined) {
    updateExpressions.push('#n = :name');
    expressionAttributeValues[':name'] = data.name;
    expressionAttributeNames['#n'] = 'name';
  }

  if (data.phone !== undefined) {
    updateExpressions.push('phone = :phone');
    expressionAttributeValues[':phone'] = data.phone;
  }

  if (data.profile !== undefined) {
    updateExpressions.push('profile = :profile');
    expressionAttributeValues[':profile'] = data.profile;
  }

  updateExpressions.push('updatedAt = :updatedAt');

  const command = new UpdateCommand({
    TableName: process.env.DYNAMODB_TABLE_NAME || 'FindClass-MainTable',
    Key: { PK, SK },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeValues: expressionAttributeValues,
    ExpressionAttributeNames:
      Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
    ReturnValues: 'ALL_NEW',
  });

  await getDynamoDBDocClient().send(command);

  const updatedUser = await getUserById(userId);
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
  // This prevents unnecessary email sending while still preventing user enumeration
  if (user) {
    const result = await sendVerificationCode(email, AuthType.FORGOT_PASSWORD);
    return result;
  }

  // Log internally for monitoring, but don't expose to caller
  logger.info('Password reset for non-existent email (no email sent)', { email });

  // Return success to prevent user enumeration, but with a fake expiresIn
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

  // Get pending role application
  const { PK } = createEntityKey('USER', userId);
  const pendingApplications = await queryItems<{
    id: string;
    role: UserRole;
    status: RoleApplicationStatus;
    appliedAt: string;
    reason?: string;
    comment?: string;
    processedAt?: string;
  }>({
    keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    expressionAttributeValues: {
      ':pk': PK,
      ':sk': 'ROLE#',
    },
  });

  const pendingApplication = pendingApplications.items?.find(
    app => app.status === RoleApplicationStatus.PENDING
  );

  // Build role history from applications
  const roles: UserRoleInfo[] = [];
  const processedApplications =
    pendingApplications.items?.filter(app => app.status !== RoleApplicationStatus.PENDING) || [];

  // Add current role
  roles.push({
    role: user.role,
    status: RoleApplicationStatus.APPROVED,
    appliedAt: user.createdAt,
    processedAt: user.createdAt,
  });

  // Add processed role change applications
  for (const app of processedApplications) {
    roles.push({
      role: app.role,
      status: app.status,
      appliedAt: app.appliedAt,
      processedAt: app.processedAt,
      comment: app.comment,
    });
  }

  return {
    currentRole: user.role,
    roles,
    pendingApplication: pendingApplication
      ? {
          applicationId: pendingApplication.id,
          role: pendingApplication.role,
          status: pendingApplication.status,
          appliedAt: pendingApplication.appliedAt,
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

  // Check if there's already a pending application (check both cache and DynamoDB)
  const cachedAppId = await getFromCache<string>(CacheKeys.roleApplication(userId), 'ROLE_APP');

  if (cachedAppId) {
    throw createAppError('You already have a pending role application', ErrorCode.VALIDATION_ERROR);
  }

  const { PK } = createEntityKey('USER', userId);
  const existingApplications = await queryItems<{
    id: string;
    role: UserRole;
    status: RoleApplicationStatus;
  }>({
    keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    expressionAttributeValues: {
      ':pk': PK,
      ':sk': 'ROLE#',
    },
  });

  const pendingApp = existingApplications.items?.find(
    app => app.status === RoleApplicationStatus.PENDING
  );

  if (pendingApp) {
    throw createAppError('You already have a pending role application', ErrorCode.VALIDATION_ERROR);
  }

  const applicationId = `role_${uuidv4()}`;
  const now = new Date().toISOString();

  const application = {
    PK: `USER#${userId}`,
    SK: `ROLE#${applicationId}`,
    entityType: 'ROLE_APPLICATION',
    dataCategory: 'USER',
    id: applicationId,
    userId,
    role,
    status: RoleApplicationStatus.PENDING,
    reason,
    appliedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await setCache(
    CacheKeys.roleApplication(userId),
    'ROLE_APP',
    applicationId,
    ROLE_APPLICATION_TTL
  );

  // Save role application to DynamoDB
  await putItem(application);

  logger.info('Role application submitted', { userId, role, applicationId });

  return {
    applicationId,
    role,
    status: RoleApplicationStatus.PENDING,
    appliedAt: now,
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

  // Scan to find the application by id (since we don't know the user PK)
  // In production, use a GSI on 'id' or store userId in a separate index
  const { scanItems } = await import('@shared/db/dynamodb');

  const scanResult = await scanItems<RoleApplication>({
    filterExpression: 'entityType = :entityType AND id = :id',
    expressionAttributeValues: {
      ':entityType': 'ROLE_APPLICATION',
      ':id': applicationId,
    },
  });

  const application = scanResult.items[0];

  if (!application) {
    throw createAppError('Role application not found', ErrorCode.NOT_FOUND);
  }

  if (application.status !== RoleApplicationStatus.PENDING) {
    throw createAppError('Application is not in pending status', ErrorCode.VALIDATION_ERROR);
  }

  const now = new Date().toISOString();
  const newStatus = approved ? RoleApplicationStatus.APPROVED : RoleApplicationStatus.REJECTED;

  // Update application status (use expressionAttributeNames to avoid reserved keyword issues)
  await updateItem(
    { PK: application.PK, SK: application.SK },
    'SET #s = :status, #c = :comment, processedBy = :processedBy, processedAt = :processedAt, updatedAt = :updatedAt',
    {
      ':status': newStatus,
      ':comment': comment || (approved ? 'Approved' : 'Rejected'),
      ':processedBy': adminId,
      ':processedAt': now,
      ':updatedAt': now,
    },
    undefined,
    { '#s': 'status', '#c': 'comment' }
  );

  // If approved, update user's role
  if (approved) {
    const { PK: userPK, SK: userSK } = createEntityKey('USER', application.userId);
    await updateItem(
      { PK: userPK, SK: userSK },
      'SET #r = :role, updatedAt = :updatedAt',
      {
        ':role': application.role,
        ':updatedAt': now,
      },
      undefined,
      { '#r': 'role' }
    );
  }

  // Create history record
  const historyRecord = {
    PK: `ENTITY#ROLE_APPLICATION#${applicationId}`,
    SK: `HISTORY#${applicationId}#${now}`,
    entityType: 'ROLE_APPLICATION_HISTORY',
    dataCategory: 'APPLICATION',
    applicationId,
    action: newStatus,
    comment: comment || (approved ? 'Approved' : 'Rejected'),
    performedBy: adminId,
    performedAt: now,
    createdAt: now,
  };
  await putItem(historyRecord);

  logger.info('Role application processed', {
    applicationId,
    adminId,
    approved,
    newStatus,
    comment,
    processedAt: now,
  });
}

/**
 * Cancel a pending role application
 */
export async function cancelRoleApplication(applicationId: string, userId: string): Promise<void> {
  logger.info('Cancelling role application', { applicationId, userId });

  // First find the application to check ownership
  const { scanItems } = await import('@shared/db/dynamodb');

  const scanResult = await scanItems<RoleApplication>({
    filterExpression: 'entityType = :entityType AND id = :id',
    expressionAttributeValues: {
      ':entityType': 'ROLE_APPLICATION',
      ':id': applicationId,
    },
  });

  const application = scanResult.items[0];

  if (!application) {
    throw createAppError('Role application not found', ErrorCode.NOT_FOUND);
  }

  if (application.userId !== userId) {
    throw createAppError('You can only cancel your own applications', ErrorCode.FORBIDDEN);
  }

  if (application.status !== RoleApplicationStatus.PENDING) {
    throw createAppError('Only pending applications can be cancelled', ErrorCode.VALIDATION_ERROR);
  }

  // Delete the application
  const { deleteItem } = await import('@shared/db/dynamodb');
  await deleteItem({ PK: application.PK, SK: application.SK });

  // Clear cache
  const { deleteFromCache } = await import('@shared/db/cache');
  const { CacheKeys } = await import('@shared/db/cache');
  await deleteFromCache(CacheKeys.roleApplication(userId), 'ROLE_APP');

  logger.info('Role application cancelled', { applicationId, userId });
}

/**
 * Get pending role applications (admin only)
 * Uses GSI for efficient queries on status field
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

  // Query applications with PENDING status using GSI
  // For MVP, we'll scan the RoleApplication entity type
  const { scanItems } = await import('@shared/db/dynamodb');

  const pendingApps = await scanItems<RoleApplication>({
    filterExpression: 'entityType = :entityType AND #status = :status',
    expressionAttributeValues: {
      ':entityType': 'ROLE_APPLICATION',
      ':status': RoleApplicationStatus.PENDING,
    },
    expressionAttributeNames: {
      '#status': 'status',
    },
    limit,
  });

  return (pendingApps.items || []).map(app => ({
    id: app.id,
    userId: app.userId,
    role: app.role,
    status: app.status,
    reason: app.reason,
    appliedAt: app.appliedAt,
  }));
}

/**
 * Get application history (admin only)
 */
export async function getApplicationHistory(
  applicationId: string
): Promise<RoleApplicationHistory[]> {
  logger.info('Getting application history', { applicationId });

  // Find the application first
  const { scanItems } = await import('@shared/db/dynamodb');

  const appResult = await scanItems<RoleApplication>({
    filterExpression: 'entityType = :entityType AND id = :id',
    expressionAttributeValues: {
      ':entityType': 'ROLE_APPLICATION',
      ':id': applicationId,
    },
  });

  const application = appResult.items[0];
  if (!application) {
    throw createAppError('Role application not found', ErrorCode.NOT_FOUND);
  }

  // Query history items
  const historyResult = await scanItems<RoleApplicationHistory>({
    filterExpression: 'entityType = :entityType AND begins_with(SK, :sk)',
    expressionAttributeValues: {
      ':entityType': 'ROLE_APPLICATION_HISTORY',
      ':sk': `HISTORY#${applicationId}`,
    },
  });

  return (historyResult.items || []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Get detailed application with history (admin only)
 */
export async function getApplicationDetail(
  applicationId: string
): Promise<RoleApplicationDetailResponse> {
  logger.info('Getting application detail', { applicationId });

  const { scanItems } = await import('@shared/db/dynamodb');

  // Find the application
  const appResult = await scanItems<RoleApplication & { userName?: string }>({
    filterExpression: 'entityType = :entityType AND id = :id',
    expressionAttributeValues: {
      ':entityType': 'ROLE_APPLICATION',
      ':id': applicationId,
    },
  });

  const application = appResult.items[0];
  if (!application) {
    throw createAppError('Role application not found', ErrorCode.NOT_FOUND);
  }

  // Get history
  const history = await getApplicationHistory(applicationId);

  return {
    applicationId: application.id,
    userId: application.userId,
    role: application.role,
    status: application.status,
    reason: application.reason,
    appliedAt: application.appliedAt,
    processedAt: application.processedAt,
    processedBy: application.processedBy,
    processedByName: application.processedBy
      ? (await getUserById(application.processedBy))?.name
      : undefined,
    comment: application.comment,
    history,
  };
}

/**
 * Get user's role applications
 */
export async function getUserApplications(
  userId: string
): Promise<RoleApplicationDetailResponse[]> {
  logger.info('Getting user applications', { userId });

  const { PK } = createEntityKey('USER', userId);

  const applicationsResult = await queryItems<RoleApplication>({
    keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    expressionAttributeValues: {
      ':pk': PK,
      ':sk': 'ROLE#',
    },
  });

  const applications = applicationsResult.items || [];

  // Get history for each application
  const detailedApplications: RoleApplicationDetailResponse[] = [];

  for (const app of applications) {
    const history = await getApplicationHistory(app.id);
    detailedApplications.push({
      applicationId: app.id,
      userId: app.userId,
      role: app.role,
      status: app.status,
      reason: app.reason,
      appliedAt: app.appliedAt,
      processedAt: app.processedAt,
      processedBy: app.processedBy,
      comment: app.comment,
      history,
    });
  }

  // Sort by appliedAt descending
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
