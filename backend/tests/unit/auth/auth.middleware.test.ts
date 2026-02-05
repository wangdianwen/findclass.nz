/**
 * Auth Middleware Unit Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { Request, Response, NextFunction } from 'express';

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
  sign: vi.fn(),
  verify: vi.fn(),
}));

vi.mock('@src/modules/auth/auth.service', () => ({
  getUserById: vi.fn(),
}));

import { getUserById } from '@src/modules/auth/auth.service';

import jwt from 'jsonwebtoken';
import { getFromCache, setCache } from '@src/shared/db/cache';

import {
  authenticate,
  optionalAuth,
  authorize,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  rotateRefreshToken,
  addTokenToBlacklist,
  isTokenBlacklisted,
} from '@src/shared/middleware/auth';
import { resetLoggerMocks } from '../mocks/logger.mock';

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLoggerMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('authenticate', () => {
    it('should call next() for valid token', async () => {
      const req = {
        headers: { authorization: 'Bearer valid-token' },
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      (jwt.verify as Mock).mockReturnValue({
        userId: 'usr_123',
        email: 'test@example.com',
        role: 'PARENT',
      });
      (getFromCache as Mock).mockResolvedValue(null);

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe('usr_123');
    });

    it('should return 401 for missing token', async () => {
      const req = {
        headers: {},
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for expired token', async () => {
      const req = {
        headers: { authorization: 'Bearer expired-token' },
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      (jwt.verify as Mock).mockImplementation(() => {
        const error = new Error('Token expired') as Error & { name: string };
        error.name = 'TokenExpiredError';
        throw error;
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for blacklisted token', async () => {
      const req = {
        headers: { authorization: 'Bearer blacklisted-token' },
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      (jwt.verify as Mock).mockReturnValue({
        userId: 'usr_123',
        jti: 'test-jti',
      });
      (getFromCache as Mock).mockResolvedValue('revoked');

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should set user for valid token', async () => {
      const req = {
        headers: { authorization: 'Bearer valid-token' },
      } as unknown as Request;

      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      (jwt.verify as Mock).mockReturnValue({
        userId: 'usr_123',
        email: 'test@example.com',
        role: 'PARENT',
      });
      (getFromCache as Mock).mockResolvedValue(null);

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user?.userId).toBe('usr_123');
    });

    it('should continue without error for missing token', async () => {
      const req = {
        headers: {},
      } as unknown as Request;

      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('should continue without error for invalid token', async () => {
      const req = {
        headers: { authorization: 'Bearer invalid-token' },
      } as unknown as Request;

      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      (jwt.verify as Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });
  });

  describe('authorize', () => {
    it('should allow access for permitted role', () => {
      const req = {
        user: { role: 'ADMIN' },
        headers: {},
      } as unknown as Request & { user: { role: string } };

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      const middleware = authorize('ADMIN', 'MODERATOR');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for unpermitted role', () => {
      const req = {
        user: { role: 'USER' },
        headers: {},
      } as unknown as Request & { user: { role: string } };

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      const middleware = authorize('ADMIN', 'MODERATOR');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated request', () => {
      const req = {
        user: undefined,
        headers: {},
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      const middleware = authorize('ADMIN');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      (jwt.sign as Mock).mockReturnValue('generated-token');

      const token = generateToken({
        userId: 'usr_123',
        email: 'test@example.com',
        role: 'PARENT',
      });

      expect(token).toBe('generated-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'usr_123',
          email: 'test@example.com',
          role: 'PARENT',
          type: 'access',
        }),
        expect.any(String),
        expect.objectContaining({
          algorithm: 'HS256',
          expiresIn: '15m',
        })
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token', () => {
      (jwt.sign as Mock).mockReturnValue('refresh-token');

      const token = generateRefreshToken('usr_123');

      expect(token).toBe('refresh-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'usr_123',
          type: 'refresh',
        }),
        expect.any(String),
        expect.objectContaining({
          expiresIn: '7d',
        })
      );
    });
  });

  describe('verifyRefreshToken', () => {
    it('should return userId and jti for valid refresh token', () => {
      (jwt.verify as Mock).mockReturnValue({
        userId: 'usr_123',
        type: 'refresh',
        jti: 'test-jti',
      });

      const result = verifyRefreshToken('valid-refresh-token');

      expect(result).toEqual({ userId: 'usr_123', jti: 'test-jti' });
    });

    it('should throw error for access token', () => {
      (jwt.verify as Mock).mockReturnValue({
        userId: 'usr_123',
        type: 'access',
        jti: 'test-jti',
      });

      expect(() => verifyRefreshToken('access-token')).toThrow('Invalid token type');
    });

    it('should throw error for expired token', () => {
      (jwt.verify as Mock).mockImplementation(() => {
        const error = new Error('Token expired') as Error & { name: string };
        error.name = 'TokenExpiredError';
        throw error;
      });

      expect(() => verifyRefreshToken('expired-token')).toThrow('Refresh token has expired');
    });
  });

  describe('rotateRefreshToken', () => {
    it('should generate new tokens and blacklist old one', async () => {
      (jwt.verify as Mock).mockReturnValue({
        userId: 'usr_123',
        type: 'refresh',
        jti: 'old-jti',
      });
      (jwt.sign as Mock).mockReturnValue('new-token');
      (setCache as Mock).mockResolvedValue(undefined);
      (getUserById as Mock).mockResolvedValue({
        id: 'usr_123',
        email: 'user@example.com',
        role: 'PARENT',
      });

      const result = await rotateRefreshToken('old-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-token',
        refreshToken: 'new-token',
      });
      expect(setCache).toHaveBeenCalled();
      expect(getUserById).toHaveBeenCalledWith('usr_123');
    });
  });

  describe('Token Blacklist', () => {
    it('should add token to blacklist', async () => {
      (setCache as Mock).mockResolvedValue(undefined);

      await addTokenToBlacklist('test-jti');

      expect(setCache).toHaveBeenCalledWith('session:test-jti', 'SESSION', 'revoked', 86400);
    });

    it('should check if token is blacklisted', async () => {
      (getFromCache as Mock).mockResolvedValue('revoked');

      const isBlacklisted = await isTokenBlacklisted('test-jti');

      expect(isBlacklisted).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      (getFromCache as Mock).mockResolvedValue(null);

      const isBlacklisted = await isTokenBlacklisted('valid-jti');

      expect(isBlacklisted).toBe(false);
    });
  });
});
