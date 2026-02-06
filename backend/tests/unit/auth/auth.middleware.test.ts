/**
 * Auth Middleware Unit Tests - PostgreSQL Version
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

// Mock config
vi.mock('../../config', () => ({
  getConfig: vi.fn(() => ({
    jwt: {
      secret: 'test-secret',
      algorithm: 'HS256',
      issuer: 'findclass.nz',
      expiresIn: '15m',
      refreshExpiresIn: '7d',
    },
  })),
}));

// Mock PostgreSQL pool
const mockPool = {
  query: vi.fn(),
  connect: vi.fn(),
};

vi.mock('@shared/db/postgres/client', () => ({
  getPool: vi.fn(() => mockPool),
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
  sign: vi.fn(),
  verify: vi.fn(),
}));

// Mock session repository
const mockSessionRepository = {
  isBlacklisted: vi.fn(),
  addToBlacklist: vi.fn(),
};

vi.mock('../../modules/auth/session.repository', () => ({
  SessionRepository: vi.fn().mockImplementation(() => mockSessionRepository),
}));

// Mock email service
vi.mock('@shared/smtp/email.service', () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

// Import after mocks are set up
import jwtLib from 'jsonwebtoken';
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
} from '@shared/middleware/auth';

describe('Auth Middleware (PostgreSQL)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

      vi.mocked(jwtLib.verify).mockReturnValue({
        userId: 'usr_123',
        email: 'test@example.com',
        role: 'PARENT',
        jti: 'test-jti',
      });
      vi.mocked(mockSessionRepository.isBlacklisted).mockResolvedValue(false);

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

      vi.mocked(jwtLib.verify).mockImplementation(() => {
        const error = new Error('Token expired') as Error & { name: string };
        error.name = 'TokenExpiredError';
        throw error;
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token format', async () => {
      const req = {
        headers: { authorization: 'InvalidFormat token' },
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
  });

  describe('optionalAuth', () => {
    it('should set user for valid token', async () => {
      const req = {
        headers: { authorization: 'Bearer valid-token' },
      } as unknown as Request;

      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      vi.mocked(jwtLib.verify).mockReturnValue({
        userId: 'usr_123',
        email: 'test@example.com',
        role: 'PARENT',
        jti: 'test-jti',
      });
      vi.mocked(mockSessionRepository.isBlacklisted).mockResolvedValue(false);

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

      vi.mocked(jwtLib.verify).mockImplementation(() => {
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

    it('should allow access for multiple allowed roles', () => {
      const req = {
        user: { role: 'MODERATOR' },
        headers: {},
      } as unknown as Request & { user: { role: string } };

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      const middleware = authorize('ADMIN', 'MODERATOR', 'SUPER_MODERATOR');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('generateToken', () => {
    it('should be defined', () => {
      expect(generateToken).toBeDefined();
      expect(typeof generateToken).toBe('function');
    });
  });

  describe('generateRefreshToken', () => {
    it('should be defined', () => {
      expect(generateRefreshToken).toBeDefined();
      expect(typeof generateRefreshToken).toBe('function');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should return userId and jti for valid refresh token', () => {
      vi.mocked(jwtLib.verify).mockReturnValue({
        userId: 'usr_123',
        type: 'refresh',
        jti: 'test-jti',
      });

      const result = verifyRefreshToken('valid-refresh-token');

      expect(result).toEqual({ userId: 'usr_123', jti: 'test-jti' });
    });

    it('should throw error for access token', () => {
      vi.mocked(jwtLib.verify).mockReturnValue({
        userId: 'usr_123',
        type: 'access',
        jti: 'test-jti',
      });

      expect(() => verifyRefreshToken('access-token')).toThrow('Invalid token type');
    });

    it('should throw error for expired token', () => {
      vi.mocked(jwtLib.verify).mockImplementation(() => {
        const error = new Error('Token expired') as Error & { name: string };
        error.name = 'TokenExpiredError';
        throw error;
      });

      expect(() => verifyRefreshToken('expired-token')).toThrow('Refresh token has expired');
    });

    it('should throw error for malformed token', () => {
      vi.mocked(jwtLib.verify).mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      expect(() => verifyRefreshToken('malformed-token')).toThrow('Refresh token verification failed');
    });
  });

  describe('rotateRefreshToken', () => {
    it('should be defined', () => {
      expect(rotateRefreshToken).toBeDefined();
    });
  });

  describe('Token Blacklist', () => {
    it('should have addTokenToBlacklist function', () => {
      expect(addTokenToBlacklist).toBeDefined();
    });

    it('should have isTokenBlacklisted function', () => {
      expect(isTokenBlacklisted).toBeDefined();
    });
  });
});
