/**
 * Auth Middleware Unit Tests
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import {
  authenticate,
  optionalAuth,
  authorize,
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  isTokenBlacklisted,
  addTokenToBlacklist,
  JwtPayload,
} from '@src/shared/middleware/auth';
import { UnauthorizedError } from '@src/core/errors';
import { getFromCache, setCache } from '@src/shared/db/cache';
import { NodeEnv } from '@src/config/env-schema';

vi.mock('jsonwebtoken', () => ({
  default: { sign: vi.fn(() => 'mock.token'), verify: vi.fn() },
}));

vi.mock('@src/config', () => ({
  getConfig: vi.fn(() => ({
    aws: { region: 'ap-southeast-2', accessKeyId: 'test', secretAccessKey: 'test' },
    dynamodb: { tableName: 'TestTable', tablePrefix: 'Test-', endpoint: 'http://localhost:8000' },
    jwt: {
      secret: 'test-secret-key-for-testing-only-min-32-chars',
      expiresIn: '7d',
      refreshExpiresIn: '30d',
      algorithm: 'HS256',
      issuer: 'test',
    },
    env: NodeEnv.Test,
    port: 3000,
  })),
}));

vi.mock('@src/core/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@src/shared/db/cache', () => ({
  getFromCache: vi.fn(),
  setCache: vi.fn(),
  deleteFromCache: vi.fn(),
  CacheKeys: {
    session: vi.fn(id => `session:${id}`),
  },
}));

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = { headers: {} };
    mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    mockNext = vi.fn();
  });

  describe('generateToken', () => {
    it('should generate JWT token', () => {
      const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'PARENT',
      };
      const result = generateToken(payload);
      expect(result).toBe('mock.token');
    });

    it('should include userId, email, role in token', () => {
      const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: 'user456',
        email: 'user@example.com',
        role: 'STUDENT',
      };
      generateToken(payload);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user456', email: 'user@example.com', role: 'STUDENT' }),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should add type: access to token', () => {
      const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: 'user',
        email: 'email',
        role: 'PARENT',
      };
      generateToken(payload);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'access' }),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token', () => {
      const result = generateRefreshToken('user789');
      expect(result).toBe('mock.token');
    });

    it('should include userId and type: refresh', () => {
      generateRefreshToken('user-refresh');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-refresh', type: 'refresh' }),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('verifyToken', () => {
    it('should return payload for valid token', async () => {
      const mockPayload: JwtPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'PARENT',
      };
      (jwt.verify as Mock).mockReturnValue(mockPayload);
      (getFromCache as Mock).mockResolvedValue(null);

      const result = await verifyToken('valid.jwt.token');
      expect(result).toEqual(mockPayload);
    });

    it('should throw UnauthorizedError for expired token', async () => {
      const expiredError = new Error('jwt expired');
      (expiredError as any).name = 'TokenExpiredError';
      (jwt.verify as Mock).mockImplementation(() => {
        throw expiredError;
      });

      await expect(verifyToken('expired.token')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for invalid token', async () => {
      const invalidError = new Error('jwt malformed');
      (invalidError as any).name = 'JsonWebTokenError';
      (jwt.verify as Mock).mockImplementation(() => {
        throw invalidError;
      });

      await expect(verifyToken('invalid.token')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for blacklisted token', async () => {
      const mockPayload: JwtPayload = {
        userId: 'user',
        email: 'email',
        role: 'PARENT',
        jti: 'test-jti',
      };
      (jwt.verify as Mock).mockReturnValue(mockPayload);
      (getFromCache as Mock).mockResolvedValue('revoked');

      await expect(verifyToken('blacklisted.token')).rejects.toThrow(
        new UnauthorizedError('Token has been revoked')
      );
    });
  });

  describe('verifyRefreshToken', () => {
    it('should return userId and jti for valid refresh token', () => {
      (jwt.verify as Mock).mockReturnValue({
        userId: 'user123',
        type: 'refresh',
        jti: 'jti-123',
      });
      const result = verifyRefreshToken('valid.refresh.token');
      expect(result).toEqual({ userId: 'user123', jti: 'jti-123' });
    });

    it('should throw for non-refresh token type', () => {
      (jwt.verify as Mock).mockReturnValue({ userId: 'user', type: 'access', jti: 'jti' });
      expect(() => verifyRefreshToken('access.token')).toThrow(UnauthorizedError);
    });

    it('should throw for expired refresh token', () => {
      const expiredError = new Error('refresh expired');
      (expiredError as any).name = 'TokenExpiredError';
      (jwt.verify as Mock).mockImplementation(() => {
        throw expiredError;
      });
      expect(() => verifyRefreshToken('expired.refresh')).toThrow('Refresh token has expired');
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should return true if token is blacklisted', async () => {
      (getFromCache as Mock).mockResolvedValue('revoked');
      const result = await isTokenBlacklisted('jti-123');
      expect(result).toBe(true);
    });

    it('should return false if token is not blacklisted', async () => {
      (getFromCache as Mock).mockResolvedValue(null);
      const result = await isTokenBlacklisted('jti-456');
      expect(result).toBe(false);
    });
  });

  describe('addTokenToBlacklist', () => {
    it('should set token in cache with TTL', async () => {
      (setCache as Mock).mockResolvedValue(undefined);
      await addTokenToBlacklist('jti-123');
      expect(setCache).toHaveBeenCalledWith('session:jti-123', 'SESSION', 'revoked', 86400);
    });
  });

  describe('authenticate middleware', () => {
    it('should call next() for valid token', async () => {
      const mockPayload: JwtPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'PARENT',
      };
      (jwt.verify as Mock).mockReturnValue(mockPayload);
      (getFromCache as Mock).mockResolvedValue(null);
      mockReq.headers = { authorization: 'Bearer valid.token' };
      await authenticate(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 for missing authorization header', async () => {
      mockReq.headers = {};
      await authenticate(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 for invalid token', async () => {
      const invalidError = new Error('invalid');
      (invalidError as any).name = 'JsonWebTokenError';
      (jwt.verify as Mock).mockImplementation(() => {
        throw invalidError;
      });
      (getFromCache as Mock).mockResolvedValue(null);
      mockReq.headers = { authorization: 'Bearer invalid.token' };
      await authenticate(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 for expired token', async () => {
      const expiredError = new Error('expired');
      (expiredError as any).name = 'TokenExpiredError';
      (jwt.verify as Mock).mockImplementation(() => {
        throw expiredError;
      });
      (getFromCache as Mock).mockResolvedValue(null);
      mockReq.headers = { authorization: 'Bearer expired.token' };
      await authenticate(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 for blacklisted token', async () => {
      const mockPayload: JwtPayload = {
        userId: 'user',
        email: 'email',
        role: 'PARENT',
        jti: 'test-jti',
      };
      (jwt.verify as Mock).mockReturnValue(mockPayload);
      (getFromCache as Mock).mockResolvedValue('revoked');
      mockReq.headers = { authorization: 'Bearer blacklisted.token' };
      await authenticate(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('optionalAuth middleware', () => {
    it('should set user for valid token', async () => {
      const mockPayload: JwtPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'PARENT',
      };
      (jwt.verify as Mock).mockReturnValue(mockPayload);
      (getFromCache as Mock).mockResolvedValue(null);
      mockReq.headers = { authorization: 'Bearer valid.token' };
      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);
      expect((mockReq as any).user).toEqual(mockPayload);
    });

    it('should call next() without user for missing token', async () => {
      mockReq.headers = {};
      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() without user for invalid token', async () => {
      (jwt.verify as Mock).mockImplementation(() => {
        throw new Error('invalid');
      });
      (getFromCache as Mock).mockResolvedValue(null);
      mockReq.headers = { authorization: 'Bearer invalid.token' };
      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('authorize middleware', () => {
    it('should call next() for allowed role', () => {
      (mockReq as any).user = { role: 'ADMIN' } as JwtPayload;
      const middleware = authorize('ADMIN');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 for disallowed role', () => {
      (mockReq as any).user = { role: 'STUDENT' } as JwtPayload;
      const middleware = authorize('ADMIN', 'TEACHER');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 401 for missing user', () => {
      (mockReq as any).user = undefined;
      const middleware = authorize('ADMIN');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should allow multiple roles', () => {
      (mockReq as any).user = { role: 'TEACHER' } as JwtPayload;
      const middleware = authorize('ADMIN', 'TEACHER');
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
