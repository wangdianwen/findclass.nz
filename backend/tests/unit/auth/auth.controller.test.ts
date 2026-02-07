/**
 * Auth Controller Unit Tests
 */

vi.mock('@src/modules/auth/auth.service', () => ({
  register: vi.fn(),
  login: vi.fn(),
  sendVerificationCode: vi.fn(),
  verifyCode: vi.fn(),
  rotateRefreshToken: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  updateCurrentUser: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  getUserRoles: vi.fn(),
  applyForRole: vi.fn(),
  approveRoleApplication: vi.fn(),
}));

vi.mock('@src/core/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@src/shared/types/api', () => ({
  createSuccessResponse: vi.fn((data, message, language, requestId) => ({
    success: true,
    data,
    message,
    meta: { requestId, language, timestamp: expect.any(String) },
  })),
}));

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  registerController,
  loginController,
  sendVerificationCodeController,
  verifyCodeController,
  refreshTokenController,
  logoutController,
  getCurrentUserController,
  updateCurrentUserController,
  passwordResetRequestController,
  passwordResetController,
  // RBAC Controllers
  getMyRolesController,
  applyRoleController,
  approveRoleApplicationController,
} from '@src/modules/auth/auth.controller';
import { UserRole } from '@src/shared/types';
import {
  createMockUser,
  createRegisterRequest,
  createLoginRequest,
  createAuthResponse,
} from '../fixtures/auth';
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
} from '@src/modules/auth/auth.service';

describe('AuthController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      body: {},
      headers: {
        'x-request-id': 'test-request-id',
      },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('registerController', () => {
    it('should register user and return 201', async () => {
      // Given
      const mockUser = createMockUser();
      (register as Mock).mockResolvedValue({
        user: mockUser,
        requiresParentalConsent: false,
      });

      mockReq.body = createRegisterRequest({
        language: 'zh',
      });

      // When
      await registerController(mockReq as Request, mockRes as Response, mockNext);

      // Then
      expect(register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: UserRole.PARENT,
        phone: '+6498765432',
        language: 'zh',
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next on error', async () => {
      // Given
      (register as Mock).mockRejectedValue(new Error('Registration failed'));

      mockReq.body = createRegisterRequest();

      // When
      await registerController(mockReq as Request, mockRes as Response, mockNext);

      // Then
      expect(mockNext).toHaveBeenCalledWith(new Error('Registration failed'));
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should pass requestId to response', async () => {
      // Given
      const mockUser = createMockUser();
      (register as Mock).mockResolvedValue({
        user: mockUser,
        requiresParentalConsent: false,
      });

      mockReq.body = createRegisterRequest();
      mockReq.headers = { 'x-request-id': 'custom-request-id' };

      // When
      await registerController(mockReq as Request, mockRes as Response, mockNext);

      // Then
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            requestId: 'custom-request-id',
          }),
        })
      );
    });

    it('should pass language to response', async () => {
      // Given
      const mockUser = createMockUser();
      (register as Mock).mockResolvedValue({
        user: mockUser,
        requiresParentalConsent: false,
      });

      mockReq.body = createRegisterRequest({ language: 'en' });

      // When
      await registerController(mockReq as Request, mockRes as Response, mockNext);

      // Then
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            language: 'en',
          }),
        })
      );
    });

    it('should return success message', async () => {
      // Given
      const mockUser = createMockUser();
      (register as Mock).mockResolvedValue({
        user: mockUser,
        requiresParentalConsent: false,
      });

      mockReq.body = createRegisterRequest();

      // When
      await registerController(mockReq as Request, mockRes as Response, mockNext);

      // Then
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Registration successful',
        })
      );
    });

    it('should return requiresParentalConsent flag', async () => {
      const mockUser = createMockUser();
      (register as Mock).mockResolvedValue({
        user: mockUser,
        requiresParentalConsent: true,
      });

      mockReq.body = createRegisterRequest();

      await registerController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requiresParentalConsent: true,
          }),
        })
      );
    });

    it('should handle student role registration', async () => {
      const mockUser = createMockUser({ role: UserRole.STUDENT });
      (register as Mock).mockResolvedValue({
        user: mockUser,
        requiresParentalConsent: false,
      });

      mockReq.body = createRegisterRequest({ role: 'STUDENT' });

      await registerController(mockReq as Request, mockRes as Response, mockNext);

      expect(register).toHaveBeenCalledWith(expect.objectContaining({ role: 'STUDENT' }));
    });

    it('should handle teacher role registration', async () => {
      const mockUser = createMockUser({ role: UserRole.TEACHER });
      (register as Mock).mockResolvedValue({
        user: mockUser,
        requiresParentalConsent: false,
      });

      mockReq.body = createRegisterRequest({ role: 'TEACHER' });

      await registerController(mockReq as Request, mockRes as Response, mockNext);

      expect(register).toHaveBeenCalledWith(expect.objectContaining({ role: 'TEACHER' }));
    });

    it('should preserve phone number from request', async () => {
      const mockUser = createMockUser();
      (register as Mock).mockResolvedValue({
        user: mockUser,
        requiresParentalConsent: false,
      });

      mockReq.body = createRegisterRequest({ phone: '+6498765432' });

      await registerController(mockReq as Request, mockRes as Response, mockNext);

      expect(register).toHaveBeenCalledWith(expect.objectContaining({ phone: '+6498765432' }));
    });

    it('should handle missing language (undefined)', async () => {
      const mockUser = createMockUser();
      (register as Mock).mockResolvedValue({
        user: mockUser,
        requiresParentalConsent: false,
      });

      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: UserRole.PARENT,
      };

      await registerController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            language: undefined,
          }),
        })
      );
    });
  });

  describe('loginController', () => {
    it('should login user and return 200', async () => {
      const mockAuthResponse = createAuthResponse();
      (login as Mock).mockResolvedValue(mockAuthResponse);

      mockReq.body = createLoginRequest();

      await loginController(mockReq as Request, mockRes as Response, mockNext);

      expect(login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next on error', async () => {
      (login as Mock).mockRejectedValue(new Error('Login failed'));

      mockReq.body = createLoginRequest({ password: 'wrongpassword' });

      await loginController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Login failed'));
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return response with undefined language', async () => {
      const mockAuthResponse = createAuthResponse();
      (login as Mock).mockResolvedValue(mockAuthResponse);

      mockReq.body = createLoginRequest();

      await loginController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            language: undefined,
          }),
        })
      );
    });

    it('should return success message', async () => {
      const mockAuthResponse = createAuthResponse();
      (login as Mock).mockResolvedValue(mockAuthResponse);

      mockReq.body = createLoginRequest();

      await loginController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login successful',
        })
      );
    });

    it('should pass requestId to response', async () => {
      const mockAuthResponse = createAuthResponse();
      (login as Mock).mockResolvedValue(mockAuthResponse);

      mockReq.body = createLoginRequest();
      mockReq.headers = { 'x-request-id': 'login-request-id' };

      await loginController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            requestId: 'login-request-id',
          }),
        })
      );
    });

    it('should return user data in response', async () => {
      const mockAuthResponse = createAuthResponse();
      (login as Mock).mockResolvedValue(mockAuthResponse);

      mockReq.body = createLoginRequest();

      await loginController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: 'usr_test123',
              email: 'test@example.com',
              name: 'Test User',
              role: 'PARENT',
            }),
          }),
        })
      );
    });

    it('should return token and refreshToken', async () => {
      const mockAuthResponse = createAuthResponse();
      (login as Mock).mockResolvedValue(mockAuthResponse);

      mockReq.body = createLoginRequest();

      await loginController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            token: 'mock.jwt.token',
            refreshToken: 'mock.refresh.token',
          }),
        })
      );
    });

    it('should return expiresIn value', async () => {
      const mockAuthResponse = createAuthResponse();
      (login as Mock).mockResolvedValue(mockAuthResponse);

      mockReq.body = createLoginRequest();

      await loginController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresIn: 604800,
          }),
        })
      );
    });

    it('should not set status for successful login (default 200)', async () => {
      const mockAuthResponse = createAuthResponse();
      (login as Mock).mockResolvedValue(mockAuthResponse);

      mockReq.body = createLoginRequest();

      await loginController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Request Validation', () => {
    it('should pass all request body fields to service', async () => {
      const mockUser = createMockUser();
      (register as Mock).mockResolvedValue({
        user: mockUser,
        requiresParentalConsent: false,
      });

      mockReq.body = {
        email: 'full@test.com',
        password: 'securePassword123',
        name: 'Full Test User',
        role: UserRole.TEACHER,
        phone: '+641234567890',
        language: 'en',
      };

      await registerController(mockReq as Request, mockRes as Response, mockNext);

      expect(register).toHaveBeenCalledWith({
        email: 'full@test.com',
        password: 'securePassword123',
        name: 'Full Test User',
        role: UserRole.TEACHER,
        phone: '+641234567890',
        language: 'en',
      });
    });
  });

  describe('sendVerificationCodeController', () => {
    it('should send verification code and return 200', async () => {
      (sendVerificationCode as Mock).mockResolvedValue({ expiresIn: 300 });

      mockReq.body = { email: 'test@example.com', type: 'register' };

      await sendVerificationCodeController(mockReq as Request, mockRes as Response, mockNext);

      expect(sendVerificationCode).toHaveBeenCalledWith('test@example.com', 'register');
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next on error', async () => {
      (sendVerificationCode as Mock).mockRejectedValue(new Error('Rate limit exceeded'));

      mockReq.body = { email: 'test@example.com', type: 'register' };

      await sendVerificationCodeController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Rate limit exceeded'));
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should return expiresIn in response', async () => {
      (sendVerificationCode as Mock).mockResolvedValue({ expiresIn: 300 });

      mockReq.body = { email: 'test@example.com', type: 'login' };

      await sendVerificationCodeController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresIn: 300,
          }),
        })
      );
    });

    it('should pass requestId to response', async () => {
      (sendVerificationCode as Mock).mockResolvedValue({ expiresIn: 300 });

      mockReq.body = { email: 'test@example.com', type: 'register' };
      mockReq.headers = { 'x-request-id': 'verify-request-id' };

      await sendVerificationCodeController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            requestId: 'verify-request-id',
          }),
        })
      );
    });

    it('should handle different verification types', async () => {
      (sendVerificationCode as Mock).mockResolvedValue({ expiresIn: 300 });

      mockReq.body = { email: 'test@example.com', type: 'password_reset' };

      await sendVerificationCodeController(mockReq as Request, mockRes as Response, mockNext);

      expect(sendVerificationCode).toHaveBeenCalledWith('test@example.com', 'password_reset');
    });
  });

  describe('verifyCodeController', () => {
    it('should verify code and return 200', async () => {
      (verifyCode as Mock).mockResolvedValue(true);

      mockReq.body = { email: 'test@example.com', code: '123456', type: 'register' };

      await verifyCodeController(mockReq as Request, mockRes as Response, mockNext);

      expect(verifyCode).toHaveBeenCalledWith('test@example.com', '123456', 'register');
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next on error for expired code', async () => {
      (verifyCode as Mock).mockRejectedValue(new Error('Verification code expired'));

      mockReq.body = { email: 'test@example.com', code: '123456', type: 'register' };

      await verifyCodeController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Verification code expired'));
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should call next on error for invalid code', async () => {
      (verifyCode as Mock).mockRejectedValue(new Error('Invalid verification code'));

      mockReq.body = { email: 'test@example.com', code: 'wrong', type: 'register' };

      await verifyCodeController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Invalid verification code'));
    });

    it('should return verified: true in response', async () => {
      (verifyCode as Mock).mockResolvedValue(true);

      mockReq.body = { email: 'test@example.com', code: '123456', type: 'register' };

      await verifyCodeController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            verified: true,
          }),
        })
      );
    });

    it('should return success message', async () => {
      (verifyCode as Mock).mockResolvedValue(true);

      mockReq.body = { email: 'test@example.com', code: '123456', type: 'login' };

      await verifyCodeController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Verification successful',
        })
      );
    });
  });

  describe('refreshTokenController', () => {
    it('should refresh token and return 200', async () => {
      (rotateRefreshToken as Mock).mockResolvedValue({
        accessToken: 'new.jwt.token',
        refreshToken: 'new.refresh.token',
        expiresIn: 604800,
      });

      mockReq.body = { refreshToken: 'old.refresh.token' };

      await refreshTokenController(mockReq as Request, mockRes as Response, mockNext);

      expect(rotateRefreshToken).toHaveBeenCalledWith('old.refresh.token');
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next on error for invalid token', async () => {
      (rotateRefreshToken as Mock).mockRejectedValue(new Error('Invalid refresh token'));

      mockReq.body = { refreshToken: 'invalid.token' };

      await refreshTokenController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Invalid refresh token'));
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should return new accessToken and refreshToken', async () => {
      (rotateRefreshToken as Mock).mockResolvedValue({
        accessToken: 'new.jwt.token',
        refreshToken: 'new.refresh.token',
        expiresIn: 604800,
      });

      mockReq.body = { refreshToken: 'old.refresh.token' };

      await refreshTokenController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accessToken: 'new.jwt.token',
            refreshToken: 'new.refresh.token',
            tokenType: 'Bearer',
          }),
        })
      );
    });

    it('should return expiresIn value', async () => {
      (rotateRefreshToken as Mock).mockResolvedValue({
        accessToken: 'new.jwt.token',
        refreshToken: 'new.refresh.token',
        expiresIn: 604800,
      });

      mockReq.body = { refreshToken: 'old.refresh.token' };

      await refreshTokenController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresIn: 604800,
          }),
        })
      );
    });

    it('should return success message', async () => {
      (rotateRefreshToken as Mock).mockResolvedValue({
        accessToken: 'new.jwt.token',
        refreshToken: 'new.refresh.token',
        expiresIn: 604800,
      });

      mockReq.body = { refreshToken: 'old.refresh.token' };

      await refreshTokenController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token refreshed successfully',
        })
      );
    });
  });

  describe('getCurrentUserController', () => {
    it('should return user profile and return 200', async () => {
      const mockUser = createMockUser();
      (getCurrentUser as Mock).mockResolvedValue(mockUser);

      mockReq.user = { userId: 'usr_test123' };

      await getCurrentUserController(mockReq as Request, mockRes as Response, mockNext);

      expect(getCurrentUser).toHaveBeenCalledWith('usr_test123');
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next on error when user not found', async () => {
      (getCurrentUser as Mock).mockResolvedValue(null);

      mockReq.user = { userId: 'usr_test123' };

      await getCurrentUserController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should call next when unauthorized', async () => {
      mockReq.user = undefined;

      await getCurrentUserController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(getCurrentUser).not.toHaveBeenCalled();
    });

    it('should return user data in response', async () => {
      const mockUser = createMockUser();
      (getCurrentUser as Mock).mockResolvedValue(mockUser);

      mockReq.user = { userId: 'usr_test123' };

      await getCurrentUserController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: 'usr_test123',
              email: 'test@example.com',
              name: 'Test User',
            }),
          }),
        })
      );
    });

    it('should pass requestId to response', async () => {
      const mockUser = createMockUser();
      (getCurrentUser as Mock).mockResolvedValue(mockUser);

      mockReq.user = { userId: 'usr_test123' };
      mockReq.headers = { 'x-request-id': 'profile-request-id' };

      await getCurrentUserController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            requestId: 'profile-request-id',
          }),
        })
      );
    });
  });

  describe('updateCurrentUserController', () => {
    it('should update user and return 200', async () => {
      const updatedUser = createMockUser({ name: 'Updated Name' });
      (updateCurrentUser as Mock).mockResolvedValue(updatedUser);

      mockReq.user = { userId: 'usr_test123' };
      mockReq.body = { name: 'Updated Name' };

      await updateCurrentUserController(mockReq as Request, mockRes as Response, mockNext);

      expect(updateCurrentUser).toHaveBeenCalledWith('usr_test123', { name: 'Updated Name' });
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next on error', async () => {
      (updateCurrentUser as Mock).mockRejectedValue(new Error('Update failed'));

      mockReq.user = { userId: 'usr_test123' };
      mockReq.body = { name: 'Updated Name' };

      await updateCurrentUserController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Update failed'));
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should return updated user in response', async () => {
      const updatedUser = createMockUser({ name: 'New Name' });
      (updateCurrentUser as Mock).mockResolvedValue(updatedUser);

      mockReq.user = { userId: 'usr_test123' };
      mockReq.body = { name: 'New Name' };

      await updateCurrentUserController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user: expect.objectContaining({
              name: 'New Name',
            }),
          }),
        })
      );
    });

    it('should update phone number', async () => {
      const updatedUser = createMockUser({ phone: '+6498765432' });
      (updateCurrentUser as Mock).mockResolvedValue(updatedUser);

      mockReq.user = { userId: 'usr_test123' };
      mockReq.body = { phone: '+6498765432' };

      await updateCurrentUserController(mockReq as Request, mockRes as Response, mockNext);

      expect(updateCurrentUser).toHaveBeenCalledWith('usr_test123', { phone: '+6498765432' });
    });

    it('should update profile avatar', async () => {
      const updatedUser = createMockUser();
      (updateCurrentUser as Mock).mockResolvedValue(updatedUser);

      mockReq.user = { userId: 'usr_test123' };
      mockReq.body = { profile: { avatar: 'https://example.com/avatar.jpg' } };

      await updateCurrentUserController(mockReq as Request, mockRes as Response, mockNext);

      expect(updateCurrentUser).toHaveBeenCalledWith('usr_test123', {
        profile: { avatar: 'https://example.com/avatar.jpg' },
      });
    });

    it('should call next when unauthorized', async () => {
      mockReq.user = undefined;

      await updateCurrentUserController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(updateCurrentUser).not.toHaveBeenCalled();
    });
  });

  describe('passwordResetRequestController', () => {
    it('should send password reset code and return 200', async () => {
      (requestPasswordReset as Mock).mockResolvedValue({ expiresIn: 600 });

      mockReq.body = { email: 'test@example.com' };

      await passwordResetRequestController(mockReq as Request, mockRes as Response, mockNext);

      expect(requestPasswordReset).toHaveBeenCalledWith('test@example.com');
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next on error', async () => {
      (requestPasswordReset as Mock).mockRejectedValue(new Error('Rate limit exceeded'));

      mockReq.body = { email: 'test@example.com' };

      await passwordResetRequestController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Rate limit exceeded'));
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should return expiresIn in response', async () => {
      (requestPasswordReset as Mock).mockResolvedValue({ expiresIn: 300 });

      mockReq.body = { email: 'test@example.com' };

      await passwordResetRequestController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresIn: 300,
          }),
        })
      );
    });

    it('should return success message', async () => {
      (requestPasswordReset as Mock).mockResolvedValue({ expiresIn: 600 });

      mockReq.body = { email: 'test@example.com' };

      await passwordResetRequestController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Password reset code sent to your email',
        })
      );
    });
  });

  describe('passwordResetController', () => {
    it('should reset password and return 200', async () => {
      (resetPassword as Mock).mockResolvedValue(undefined);

      mockReq.body = {
        email: 'test@example.com',
        code: '123456',
        newPassword: 'newPassword123',
      };

      await passwordResetController(mockReq as Request, mockRes as Response, mockNext);

      expect(resetPassword).toHaveBeenCalledWith('test@example.com', '123456', 'newPassword123');
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next on invalid code', async () => {
      (resetPassword as Mock).mockRejectedValue(new Error('Invalid verification code'));

      mockReq.body = {
        email: 'test@example.com',
        code: 'wrong',
        newPassword: 'newPassword123',
      };

      await passwordResetController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Invalid verification code'));
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should return success response', async () => {
      (resetPassword as Mock).mockResolvedValue(undefined);

      mockReq.body = {
        email: 'test@example.com',
        code: '123456',
        newPassword: 'newPassword123',
      };

      await passwordResetController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            success: true,
          }),
          message: 'Password reset successfully',
        })
      );
    });

    it('should call next on expired code', async () => {
      (resetPassword as Mock).mockRejectedValue(new Error('Code expired'));

      mockReq.body = {
        email: 'test@example.com',
        code: 'expired',
        newPassword: 'newPassword123',
      };

      await passwordResetController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Code expired'));
    });
  });

  /**
   * RBAC Controller Tests
   */

  describe('getMyRolesController', () => {
    it('should return user roles and return 200', async () => {
      // Given
      (getUserRoles as Mock).mockResolvedValue({
        currentRole: 'PARENT',
        roles: [
          {
            role: 'PARENT',
            status: 'APPROVED',
            appliedAt: '2025-01-01T00:00:00.000Z',
          },
        ],
      });

      mockReq.user = { userId: 'usr_test123' };

      await getMyRolesController(mockReq as Request, mockRes as Response, mockNext);

      expect(getUserRoles).toHaveBeenCalledWith('usr_test123');
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next on error when user not found', async () => {
      (getUserRoles as Mock).mockRejectedValue(new Error('User not found'));

      mockReq.user = { userId: 'usr_test123' };

      await getMyRolesController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('User not found'));
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should call next when unauthorized', async () => {
      mockReq.user = undefined;

      await getMyRolesController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(getUserRoles).not.toHaveBeenCalled();
    });

    it('should return roles data in response', async () => {
      const mockRoles = {
        currentRole: 'PARENT',
        roles: [
          {
            role: 'PARENT',
            status: 'APPROVED',
            appliedAt: '2025-01-01T00:00:00.000Z',
          },
        ],
      };
      (getUserRoles as Mock).mockResolvedValue(mockRoles);

      mockReq.user = { userId: 'usr_test123' };

      await getMyRolesController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentRole: 'PARENT',
            roles: expect.any(Array),
          }),
        })
      );
    });

    it('should pass requestId to response', async () => {
      (getUserRoles as Mock).mockResolvedValue({
        currentRole: 'PARENT',
        roles: [],
      });

      mockReq.user = { userId: 'usr_test123' };
      mockReq.headers = { 'x-request-id': 'roles-request-id' };

      await getMyRolesController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            requestId: 'roles-request-id',
          }),
        })
      );
    });

    it('should return pending application if exists', async () => {
      const mockRoles = {
        currentRole: 'PARENT',
        roles: [
          {
            role: 'PARENT',
            status: 'APPROVED',
            appliedAt: '2025-01-01T00:00:00.000Z',
          },
        ],
        pendingApplication: {
          applicationId: 'app_123',
          role: 'TEACHER',
          status: 'PENDING',
          appliedAt: '2025-01-15T00:00:00.000Z',
        },
      };
      (getUserRoles as Mock).mockResolvedValue(mockRoles);

      mockReq.user = { userId: 'usr_test123' };

      await getMyRolesController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pendingApplication: expect.objectContaining({
              role: 'TEACHER',
              status: 'PENDING',
            }),
          }),
        })
      );
    });
  });

  describe('applyRoleController', () => {
    it('should apply for role and return 201', async () => {
      // Given
      (applyForRole as Mock).mockResolvedValue({
        applicationId: 'app_123',
        role: 'TEACHER',
        status: 'PENDING',
        appliedAt: '2025-01-15T00:00:00.000Z',
      });

      mockReq.user = { userId: 'usr_test123' };
      mockReq.body = { role: 'TEACHER', reason: 'I want to teach' };

      await applyRoleController(mockReq as Request, mockRes as Response, mockNext);

      expect(applyForRole).toHaveBeenCalledWith('usr_test123', 'TEACHER', 'I want to teach');
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next on error', async () => {
      (applyForRole as Mock).mockRejectedValue(new Error('Application failed'));

      mockReq.user = { userId: 'usr_test123' };
      mockReq.body = { role: 'TEACHER' };

      await applyRoleController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Application failed'));
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should call next when unauthorized', async () => {
      mockReq.user = undefined;
      mockReq.body = { role: 'TEACHER' };

      await applyRoleController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(applyForRole).not.toHaveBeenCalled();
    });

    it('should return application data in response', async () => {
      const mockApplication = {
        applicationId: 'app_456',
        role: 'TEACHER',
        status: 'PENDING',
        appliedAt: '2025-01-15T00:00:00.000Z',
      };
      (applyForRole as Mock).mockResolvedValue(mockApplication);

      mockReq.user = { userId: 'usr_test123' };
      mockReq.body = { role: 'TEACHER', reason: 'Passionate about teaching' };

      await applyRoleController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            applicationId: 'app_456',
            role: 'TEACHER',
            status: 'PENDING',
          }),
        })
      );
    });

    it('should return success message', async () => {
      (applyForRole as Mock).mockResolvedValue({
        applicationId: 'app_123',
        role: 'TEACHER',
        status: 'PENDING',
        appliedAt: '2025-01-15T00:00:00.000Z',
      });

      mockReq.user = { userId: 'usr_test123' };
      mockReq.body = { role: 'TEACHER' };

      await applyRoleController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Role application submitted successfully',
        })
      );
    });

    it('should apply without reason', async () => {
      (applyForRole as Mock).mockResolvedValue({
        applicationId: 'app_789',
        role: 'ADMIN',
        status: 'PENDING',
        appliedAt: '2025-01-15T00:00:00.000Z',
      });

      mockReq.user = { userId: 'usr_test123' };
      mockReq.body = { role: 'ADMIN' };

      await applyRoleController(mockReq as Request, mockRes as Response, mockNext);

      expect(applyForRole).toHaveBeenCalledWith('usr_test123', 'ADMIN', undefined);
    });
  });

  describe('approveRoleApplicationController', () => {
    it('should approve application and return 200', async () => {
      // Given
      (approveRoleApplication as Mock).mockResolvedValue(undefined);

      mockReq.user = { userId: 'admin_user' };
      mockReq.params = { id: 'app_123' };
      mockReq.body = { approved: true, comment: 'Approved' };

      await approveRoleApplicationController(mockReq as Request, mockRes as Response, mockNext);

      expect(approveRoleApplication).toHaveBeenCalledWith(
        'app_123',
        'admin_user',
        true,
        'Approved'
      );
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject application and return 200', async () => {
      // Given
      (approveRoleApplication as Mock).mockResolvedValue(undefined);

      mockReq.user = { userId: 'admin_user' };
      mockReq.params = { id: 'app_456' };
      mockReq.body = { approved: false, comment: 'Missing qualifications' };

      await approveRoleApplicationController(mockReq as Request, mockRes as Response, mockNext);

      expect(approveRoleApplication).toHaveBeenCalledWith(
        'app_456',
        'admin_user',
        false,
        'Missing qualifications'
      );
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should call next on error', async () => {
      (approveRoleApplication as Mock).mockRejectedValue(new Error('Approval failed'));

      mockReq.user = { userId: 'admin_user' };
      mockReq.params = { id: 'app_123' };
      mockReq.body = { approved: true };

      await approveRoleApplicationController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Approval failed'));
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should call next when unauthorized', async () => {
      mockReq.user = undefined;
      mockReq.params = { id: 'app_123' };
      mockReq.body = { approved: true };

      await approveRoleApplicationController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(approveRoleApplication).not.toHaveBeenCalled();
    });

    it('should return success response for approval', async () => {
      (approveRoleApplication as Mock).mockResolvedValue(undefined);

      mockReq.user = { userId: 'admin_user' };
      mockReq.params = { id: 'app_123' };
      mockReq.body = { approved: true };

      await approveRoleApplicationController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            success: true,
          }),
          message: 'Application approved',
        })
      );
    });

    it('should return rejection message', async () => {
      (approveRoleApplication as Mock).mockResolvedValue(undefined);

      mockReq.user = { userId: 'admin_user' };
      mockReq.params = { id: 'app_456' };
      mockReq.body = { approved: false, comment: 'Not qualified' };

      await approveRoleApplicationController(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Application rejected',
        })
      );
    });

    it('should approve without comment', async () => {
      (approveRoleApplication as Mock).mockResolvedValue(undefined);

      mockReq.user = { userId: 'admin_user' };
      mockReq.params = { id: 'app_789' };
      mockReq.body = { approved: true };

      await approveRoleApplicationController(mockReq as Request, mockRes as Response, mockNext);

      expect(approveRoleApplication).toHaveBeenCalledWith('app_789', 'admin_user', true, undefined);
    });
  });
});
