/**
 * Authentication Middleware
 * JWT-based authentication for protected routes
 * Uses PostgreSQL for token blacklist
 */

import type { Request, Response, NextFunction } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { getPool } from '@shared/db/postgres/client';
import { getConfig } from '../../config';
import { logger } from '../../core/logger';
import { UnauthorizedError, ErrorCode } from '../../core/errors';
import { createErrorResponse } from '../types/api';
import { getUserById } from '../../modules/auth/auth.service';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  type?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
  iss?: string;
  jti?: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

interface SessionRow {
  id: string;
  token_jti: string;
  status: string;
  expires_at: Date;
}

/**
 * Add token to blacklist using PostgreSQL
 */
export async function addTokenToBlacklist(jti: string): Promise<void> {
  const pool = getPool();

  // First try to update if exists
  const updateResult = await pool.query(
    `UPDATE sessions SET status = 'REVOKED' WHERE token_jti = $1 RETURNING id`,
    [jti]
  );

  if (updateResult.rows.length === 0) {
    // Insert new record (for tokens that weren't stored)
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO sessions (id, token_jti, status, expires_at, created_at)
       VALUES ($1, $2, 'REVOKED', NOW() + interval '1 day', NOW())
       ON CONFLICT (token_jti) DO NOTHING`,
      [id, jti]
    );
  }

  logger.info('Token added to blacklist', { jti });
}

/**
 * Check if token is blacklisted using PostgreSQL
 */
export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  if (!jti) return false;

  const pool = getPool();

  try {
    const result = await pool.query<SessionRow>(
      `SELECT 1 FROM sessions
       WHERE token_jti = $1
       AND status = 'REVOKED'
       AND expires_at > NOW()
       LIMIT 1`,
      [jti]
    );

    return result.rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Revoke all tokens for a user
 */
export function revokeAllUserTokens(_userId: string): Promise<void> {
  logger.warn('All user tokens revoked - implement with user-specific token storage if needed');
  return Promise.resolve();
}

/**
 * Extract token from Authorization header
 */
function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    return null;
  }

  const scheme = parts[0];
  const token = parts[1];
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token;
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<JwtPayload> {
  const config = getConfig();

  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      algorithms: [config.jwt.algorithm],
      issuer: config.jwt.issuer,
    }) as JwtPayload;

    const isBlacklisted = await isTokenBlacklisted(decoded.jti || '');
    if (isBlacklisted) {
      throw new UnauthorizedError('Token has been revoked');
    }

    return decoded;
  } catch (error) {
    const err = error as Error & { name?: string };
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token has expired');
    }
    if (err.name === 'JsonWebTokenError') {
      throw new UnauthorizedError('Invalid token');
    }
    throw new UnauthorizedError('Authentication failed');
  }
}

/**
 * Authentication middleware
 * Requires valid JWT token
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      throw new UnauthorizedError('No authentication token provided');
    }

    const payload = await verifyToken(token);
    req.user = payload;

    logger.debug('User authenticated', { userId: payload.userId });
    next();
  } catch (error) {
    const requestId = req.headers['x-request-id'] as string;

    if (error instanceof UnauthorizedError) {
      res.status(401).json(createErrorResponse(error.code, error.message, undefined, requestId));
    } else {
      logger.error('Authentication middleware error', { error });
      res
        .status(500)
        .json(
          createErrorResponse(
            ErrorCode.INTERNAL_ERROR,
            'Authentication failed',
            undefined,
            requestId
          )
        );
    }
  }
}

/**
 * Optional authentication middleware
 * Sets user if token is valid, continues without error if not
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req.headers.authorization);

    if (token) {
      const payload = await verifyToken(token);
      req.user = payload;
    }

    next();
  } catch {
    // Continue without authentication
    next();
  }
}

/**
 * Role-based authorization middleware
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const requestId = req.headers['x-request-id'] as string;

      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!allowedRoles.includes(req.user.role)) {
        res
          .status(403)
          .json(
            createErrorResponse(
              ErrorCode.FORBIDDEN,
              'Access denied. Insufficient permissions.',
              undefined,
              requestId
            )
          );
        return;
      }

      next();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        res
          .status(401)
          .json(
            createErrorResponse(
              error.code,
              error.message,
              undefined,
              req.headers['x-request-id'] as string
            )
          );
      } else {
        logger.error('Authorization middleware error', { error });
        next(error as Error);
      }
    }
  };
}

/**
 * Generate JWT token
 */
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const config = getConfig();
  const jti = crypto.randomUUID();

  const signOptions: SignOptions = {
    algorithm: config.jwt.algorithm as jwt.Algorithm,
    expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'],
    issuer: config.jwt.issuer,
    jwtid: jti,
  };

  return jwt.sign(
    {
      ...payload,
      type: 'access',
    },
    config.jwt.secret,
    signOptions
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: string): string {
  const config = getConfig();
  const jti = crypto.randomUUID();

  const signOptions: SignOptions = {
    algorithm: config.jwt.algorithm as jwt.Algorithm,
    expiresIn: config.jwt.refreshExpiresIn as SignOptions['expiresIn'],
    issuer: config.jwt.issuer,
    jwtid: jti,
  };

  return jwt.sign(
    {
      userId,
      type: 'refresh',
    },
    config.jwt.secret,
    signOptions
  );
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { userId: string; jti: string } {
  const config = getConfig();

  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      algorithms: [config.jwt.algorithm as jwt.Algorithm],
      issuer: config.jwt.issuer,
    }) as {
      userId: string;
      type: string;
      jti: string;
    };

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }

    return { userId: decoded.userId, jti: decoded.jti };
  } catch (error) {
    const err = error as Error & { name?: string };
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Refresh token has expired');
    }
    if (err.name === 'JsonWebTokenError') {
      throw new UnauthorizedError('Invalid refresh token');
    }
    throw new UnauthorizedError('Refresh token verification failed');
  }
}

/**
 * Refresh token result with rotation
 */
export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
}

/**
 * Rotate refresh token
 * Generates new access and refresh tokens, invalidates old refresh token
 */
export async function rotateRefreshToken(oldRefreshToken: string): Promise<RefreshTokenResult> {
  const decoded = verifyRefreshToken(oldRefreshToken);

  // Fetch user info to get email and role
  const user = await getUserById(decoded.userId);
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const newAccessToken = generateToken({
    userId: decoded.userId,
    email: user.email,
    role: user.role,
  });

  const newRefreshToken = generateRefreshToken(decoded.userId);

  await addTokenToBlacklist(decoded.jti);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}
