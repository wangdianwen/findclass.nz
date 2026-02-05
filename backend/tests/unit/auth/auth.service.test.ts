/**
 * Auth Service Unit Tests
 * Following JavaScript Testing Patterns and TDD Best Practices
 */

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

// Mock external dependencies
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
  hash: vi.fn(),
  compare: vi.fn(),
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
  sign: vi.fn(),
  verify: vi.fn(),
}));

vi.mock('@src/shared/middleware/auth', () => ({
  addTokenToBlacklist: vi.fn(),
  isTokenBlacklisted: vi.fn(),
  generateToken: vi.fn(payload => `mocked-token-${payload.userId}`),
  generateRefreshToken: vi.fn(userId => `mocked-refresh-${userId}`),
}));

vi.mock('@shared/smtp/email.service', () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Import mocked functions from the mocked module
import {
  putItem,
  getItem,
  updateItem,
  queryItems,
  createEntityKey,
  getTableName,
  transactWrite,
} from '@src/shared/db/dynamodb';

import {
  getFromCache,
  setCache,
  deleteFromCache,
  incrementRateLimit,
  CacheKeys,
} from '@src/shared/db/cache';

import { resetLoggerMocks } from '../mocks/logger.mock';

import {
  register,
  login,
  getUserByEmail,
  getUserById,
  updateUserPassword,
  verifyToken,
  sendVerificationCode,
  verifyCode,
  rotateRefreshToken,
  logout,
  generateVerificationCode,
} from '@src/modules/auth/auth.service';
import { UserRole } from '@src/shared/types';
import { AuthType } from '@src/modules/auth/auth.types';

import {
  createMockUser,
  createMockActiveUser,
  createMockDisabledUser,
  createMockStudentUser,
  createMockTeacherUser,
  createMockAdminUser,
} from '../fixtures/auth';
import { addTokenToBlacklist, isTokenBlacklisted } from '@src/shared/middleware/auth';
import { sendVerificationEmail } from '@shared/smtp/email.service';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLoggerMocks();
    (getTableName as Mock).mockReturnValue('test-table');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('register', () => {
    it('should register new user successfully', async () => {
      // Given - prepare test data
      (getItem as Mock).mockResolvedValue(null);
      (bcrypt.hash as Mock).mockResolvedValue('hashedPassword');
      (transactWrite as Mock).mockResolvedValue(undefined);
      (createEntityKey as Mock).mockReturnValue({ PK: 'USER#usr_12345678', SK: 'METADATA' });

      // When - execute the test
      const result = await register({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: UserRole.STUDENT,
      });

      // Then - verify the result
      expect(result).toBeDefined();
      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.name).toBe('New User');
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });

    it('should throw error when email already exists', async () => {
      // Given - prepare existing user
      const existingUser = createMockUser();
      (transactWrite as Mock).mockRejectedValue({ name: 'TransactionCanceledException' });

      // When & Then - verify error
      await expect(
        register({
          email: existingUser.email,
          password: 'password123',
          name: existingUser.name,
          role: existingUser.role,
        })
      ).rejects.toThrow('Email already registered');
    });

    it.each([
      { userFactory: createMockStudentUser, roleName: 'student', role: UserRole.STUDENT },
      { userFactory: createMockTeacherUser, roleName: 'teacher', role: UserRole.TEACHER },
      { userFactory: createMockAdminUser, roleName: 'admin', role: UserRole.ADMIN },
    ])(
      'should register $roleName user successfully',
      async ({ userFactory: _userFactory, role }) => {
        // Given
        (getItem as Mock).mockResolvedValue(null);
        (bcrypt.hash as Mock).mockResolvedValue('hashedPassword');
        (transactWrite as Mock).mockResolvedValue(undefined);
        (createEntityKey as Mock).mockReturnValue({
          PK: `USER#usr_${role.toLowerCase()}`,
          SK: 'METADATA',
        });

        // When
        const result = await register({
          email: `${role.toLowerCase()}@example.com`,
          password: 'password123',
          name: `${role} User`,
          role,
        });

        // Then
        expect(result).toBeDefined();
        expect(result.user.role).toBe(role);
        expect(result.token).toBeDefined();
      }
    );

    it('should set default language to zh when not provided', async () => {
      // Given
      (getItem as Mock).mockResolvedValue(null);
      (bcrypt.hash as Mock).mockResolvedValue('hashedPassword');
      (transactWrite as Mock).mockResolvedValue(undefined);
      (createEntityKey as Mock).mockReturnValue({ PK: 'USER#usr_test', SK: 'METADATA' });

      // When
      const result = await register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: UserRole.STUDENT,
      });

      // Then
      expect(result.user.language).toBe('zh');
    });

    it('should use provided language when specified', async () => {
      // Given
      (getItem as Mock).mockResolvedValue(null);
      (bcrypt.hash as Mock).mockResolvedValue('hashedPassword');
      (transactWrite as Mock).mockResolvedValue(undefined);
      (createEntityKey as Mock).mockReturnValue({ PK: 'USER#usr_test', SK: 'METADATA' });

      // When
      const result = await register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: UserRole.STUDENT,
        language: 'en',
      });

      // Then
      expect(result.user.language).toBe('en');
    });

    it('should hash password with bcrypt', async () => {
      // Given
      (getItem as Mock).mockResolvedValue(null);
      (bcrypt.hash as Mock).mockResolvedValue('hashedPassword');
      (transactWrite as Mock).mockResolvedValue(undefined);
      (createEntityKey as Mock).mockReturnValue({ PK: 'USER#usr_test', SK: 'METADATA' });

      // When
      await register({
        email: 'test@example.com',
        password: 'plainPassword',
        name: 'Test User',
        role: UserRole.STUDENT,
      });

      // Then - verify password is hashed
      expect(bcrypt.hash).toHaveBeenCalledWith('plainPassword', 10);
    });

    it('should generate correct entity keys', async () => {
      // Given
      (getItem as Mock).mockResolvedValue(null);
      (bcrypt.hash as Mock).mockResolvedValue('hashedPassword');
      (transactWrite as Mock).mockResolvedValue(undefined);

      const result = await register({
        email: 'test456@example.com',
        password: 'password123',
        name: 'Test User',
        role: UserRole.STUDENT,
      });

      expect(result.user.PK).toContain('USER#');
    });
  });

  describe('login', () => {
    it('should return user and token on successful login', async () => {
      // Given
      const mockUser = createMockActiveUser();
      (getItem as Mock).mockResolvedValue(null);
      (getItem as Mock).mockResolvedValueOnce({ userId: mockUser.id, email: mockUser.email });
      (getItem as Mock).mockResolvedValueOnce(mockUser);
      (getItem as Mock).mockResolvedValueOnce(mockUser);
      (bcrypt.compare as Mock).mockResolvedValue(true);

      // When
      const result = await login({ email: mockUser.email, password: 'password123' });

      // Then
      expect(result).toBeDefined();
      expect(result.user.email).toBe(mockUser.email);
      expect(result.token).toBe('mocked-token-usr_test123');
    });

    it('should throw error for non-existent user', async () => {
      // Given
      (getItem as Mock).mockResolvedValue(null);

      // When & Then
      await expect(
        login({ email: 'nonexistent@example.com', password: 'password123' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for disabled user', async () => {
      // Given
      const disabledUser = createMockDisabledUser();
      (getItem as Mock).mockResolvedValue(null);
      (getItem as Mock).mockResolvedValueOnce({
        userId: disabledUser.id,
        email: disabledUser.email,
      });
      (getItem as Mock).mockResolvedValueOnce(disabledUser);
      (getItem as Mock).mockResolvedValueOnce(disabledUser);
      (bcrypt.compare as Mock).mockResolvedValue(true);

      // When & Then
      await expect(login({ email: disabledUser.email, password: 'password123' })).rejects.toThrow(
        'Account is disabled'
      );
    });

    it('should throw error for incorrect password', async () => {
      // Given
      const mockUser = createMockActiveUser();
      (getItem as Mock).mockResolvedValue({ userId: mockUser.id });
      (getItem as Mock).mockResolvedValueOnce({ userId: mockUser.id });
      (getItem as Mock).mockResolvedValueOnce(mockUser);
      (bcrypt.compare as Mock).mockResolvedValue(false);

      // When & Then
      await expect(login({ email: mockUser.email, password: 'wrongpassword' })).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should call bcrypt.compare with correct parameters', async () => {
      // Given
      const mockUser = createMockActiveUser();
      (getItem as Mock).mockResolvedValue({ userId: mockUser.id });
      (getItem as Mock).mockResolvedValueOnce({ userId: mockUser.id });
      (getItem as Mock).mockResolvedValueOnce(mockUser);
      (bcrypt.compare as Mock).mockResolvedValue(true);
      (jwt.sign as Mock).mockReturnValue('mocked-jwt-token');

      await login({ email: mockUser.email, password: 'password123' });

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.passwordHash);
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found via EMAIL# entity', async () => {
      // Given
      const mockUser = createMockUser();
      (getItem as Mock).mockResolvedValue({ userId: mockUser.id, email: mockUser.email });
      (getItem as Mock).mockResolvedValueOnce({ userId: mockUser.id, email: mockUser.email });
      (getItem as Mock).mockResolvedValueOnce(mockUser);

      // When
      const result = await getUserByEmail(mockUser.email);

      // Then
      expect(result).toEqual(mockUser);
      expect(getItem).toHaveBeenCalled();
    });

    it('should return null when user not found', async () => {
      // Given
      (getItem as Mock).mockResolvedValue(null);

      // When
      const result = await getUserByEmail('nonexistent@example.com');

      // Then
      expect(result).toBeNull();
    });

    it('should use correct EMAIL# key format', async () => {
      // Given
      const mockUser = createMockUser();
      (getItem as Mock).mockResolvedValue({ userId: mockUser.id });
      (getItem as Mock).mockResolvedValueOnce({ userId: mockUser.id });

      // When
      await getUserByEmail(mockUser.email);

      // Then
      expect(getItem).toHaveBeenCalledWith(
        expect.objectContaining({ PK: `EMAIL#${mockUser.email.toLowerCase()}`, SK: 'METADATA' })
      );
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = createMockUser();
      (getItem as Mock).mockResolvedValue(mockUser);

      const result = await getUserById(mockUser.id);

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      (getItem as Mock).mockResolvedValue(null);

      const result = await getUserById('nonexistent');

      expect(result).toBeNull();
    });

    it('should call getItem with correct parameters', async () => {
      const mockUser = createMockUser();
      (getItem as Mock).mockResolvedValue(mockUser);

      await getUserById(mockUser.id);

      expect(getItem).toHaveBeenCalled();
    });
  });

  describe('updateUserPassword', () => {
    it('should update password successfully', async () => {
      const mockUser = createMockActiveUser();
      (updateItem as Mock).mockResolvedValue({});

      await expect(updateUserPassword(mockUser.id, 'hashedNewPassword')).resolves.not.toThrow();
      expect(updateItem).toHaveBeenCalled();
    });

    it('should update password for non-existent user without error', async () => {
      (updateItem as Mock).mockResolvedValue({});

      await expect(updateUserPassword('nonexistent', 'hashedPassword')).resolves.not.toThrow();
    });
  });

  describe('verifyToken', () => {
    it('should return user when token is valid', async () => {
      const mockUser = createMockUser();
      (jwt.verify as Mock).mockReturnValue({ userId: mockUser.id });
      (getItem as Mock).mockResolvedValue(mockUser);

      const result = await verifyToken('valid-token');

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockUser.id);
    });

    it('should return null for invalid token', async () => {
      (jwt.verify as Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await verifyToken('invalid-token');
      expect(result).toBeNull();
    });
  });

  describe('generateVerificationCode', () => {
    it('should return a 6-digit string', () => {
      const code = generateVerificationCode();

      expect(code).toBeDefined();
      expect(typeof code).toBe('string');
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should return numeric codes between 100000 and 999999', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateVerificationCode();
        const numericCode = parseInt(code, 10);
        expect(numericCode).toBeGreaterThanOrEqual(100000);
        expect(numericCode).toBeLessThanOrEqual(999999);
      }
    });

    it('should generate unique codes (statistically)', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        codes.add(generateVerificationCode());
      }
      expect(codes.size).toBeGreaterThan(900);
    });
  });

  describe('sendVerificationCode', () => {
    it('should return expiresIn on successful code generation', async () => {
      (incrementRateLimit as Mock).mockResolvedValue({
        count: 1,
        allowed: true,
        remaining: 2,
        resetAt: Date.now() / 1000 + 60,
      });
      (setCache as Mock).mockResolvedValue(undefined);
      (sendVerificationEmail as Mock).mockResolvedValue(true);

      const result = await sendVerificationCode('test@example.com', AuthType.REGISTER);

      expect(result).toBeDefined();
      expect(result.expiresIn).toBe(300);
      expect(setCache).toHaveBeenCalled();
      expect(sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw error when rate limit exceeded', async () => {
      (incrementRateLimit as Mock).mockResolvedValue({
        count: 3,
        allowed: false,
        remaining: 0,
        resetAt: Date.now() / 1000 + 60,
      });

      await expect(sendVerificationCode('test@example.com', AuthType.REGISTER)).rejects.toThrow(
        'Rate limit exceeded'
      );
    });

    it('should increment rate limit counter', async () => {
      (incrementRateLimit as Mock).mockResolvedValue({
        count: 2,
        allowed: true,
        remaining: 1,
        resetAt: Date.now() / 1000 + 60,
      });
      (setCache as Mock).mockResolvedValue(undefined);
      (sendVerificationEmail as Mock).mockResolvedValue(true);

      await sendVerificationCode('test@example.com', AuthType.REGISTER);

      expect(incrementRateLimit).toHaveBeenCalled();
    });

    it('should use different keys for different verification types', async () => {
      (incrementRateLimit as Mock).mockResolvedValue({
        count: 1,
        allowed: true,
        remaining: 2,
        resetAt: Date.now() / 1000 + 60,
      });
      (setCache as Mock).mockResolvedValue(undefined);
      (sendVerificationEmail as Mock).mockResolvedValue(true);

      await sendVerificationCode('test@example.com', AuthType.REGISTER);

      const setCalls = (setCache as Mock).mock.calls;
      const verifyCall = setCalls.find((call: unknown[]) =>
        (call[0] as string).includes('verify:test@example.com:REGISTER')
      );
      expect(verifyCall).toBeDefined();
    });

    it('should store code with 5 minute TTL', async () => {
      (incrementRateLimit as Mock).mockResolvedValue({
        count: 1,
        allowed: true,
        remaining: 2,
        resetAt: Date.now() / 1000 + 60,
      });
      (setCache as Mock).mockResolvedValue(undefined);
      (sendVerificationEmail as Mock).mockResolvedValue(true);

      await sendVerificationCode('test@example.com', AuthType.FORGOT_PASSWORD);

      const setCalls = (setCache as Mock).mock.calls;
      const codeCall = setCalls.find((call: unknown[]) =>
        (call[0] as string).includes('verify:test@example.com:FORGOT_PASSWORD')
      );
      expect(codeCall).toBeDefined();
      expect(codeCall?.[3]).toBe(300);
    });

    it('should allow first request when no rate limit exists', async () => {
      (incrementRateLimit as Mock).mockResolvedValue({
        count: 1,
        allowed: true,
        remaining: 2,
        resetAt: Date.now() / 1000 + 60,
      });
      (setCache as Mock).mockResolvedValue(undefined);
      (sendVerificationEmail as Mock).mockResolvedValue(true);

      const result = await sendVerificationCode('test@example.com', AuthType.REGISTER);

      expect(result).toBeDefined();
      expect(setCache).toHaveBeenCalled();
    });

    it('should continue even if email sending fails', async () => {
      (incrementRateLimit as Mock).mockResolvedValue({
        count: 1,
        allowed: true,
        remaining: 2,
        resetAt: Date.now() / 1000 + 60,
      });
      (setCache as Mock).mockResolvedValue(undefined);
      (sendVerificationEmail as Mock).mockResolvedValue(false);

      const result = await sendVerificationCode('test@example.com', AuthType.REGISTER);

      expect(result).toBeDefined();
      expect(result.expiresIn).toBe(300);
    });
  });

  describe('verifyCode', () => {
    it('should return true for valid code', async () => {
      (getFromCache as Mock).mockResolvedValue('123456');
      (deleteFromCache as Mock).mockResolvedValue(undefined);

      const result = await verifyCode('test@example.com', '123456', AuthType.REGISTER);

      expect(result).toBe(true);
      expect(deleteFromCache).toHaveBeenCalled();
    });

    it('should throw error for expired code', async () => {
      (getFromCache as Mock).mockResolvedValue(null);

      await expect(verifyCode('test@example.com', '123456', AuthType.REGISTER)).rejects.toThrow(
        'Verification code expired'
      );
    });

    it('should throw error for invalid code', async () => {
      (getFromCache as Mock).mockResolvedValue('123456');

      await expect(verifyCode('test@example.com', '654321', AuthType.REGISTER)).rejects.toThrow(
        'Invalid verification code'
      );
    });

    it('should use correct key for different verification types', async () => {
      (getFromCache as Mock).mockResolvedValue('654321');
      (deleteFromCache as Mock).mockResolvedValue(undefined);

      await verifyCode('test@example.com', '654321', AuthType.FORGOT_PASSWORD);

      expect(CacheKeys.verify).toHaveBeenCalledWith('test@example.com', AuthType.FORGOT_PASSWORD);
    });

    it('should delete code after successful verification', async () => {
      (getFromCache as Mock).mockResolvedValue('999999');
      (deleteFromCache as Mock).mockResolvedValue(undefined);

      await verifyCode('test@example.com', '999999', AuthType.REGISTER);

      expect(deleteFromCache).toHaveBeenCalled();
    });

    it('should throw error for empty code', async () => {
      (getFromCache as Mock).mockResolvedValue('123456');

      await expect(verifyCode('test@example.com', '', AuthType.REGISTER)).rejects.toThrow(
        'Invalid verification code'
      );
    });
  });

  describe('rotateRefreshToken', () => {
    it('should return new tokens on successful rotation', async () => {
      const mockUser = createMockActiveUser();
      (jwt.verify as Mock).mockReturnValue({
        userId: mockUser.id,
        type: 'refresh',
        jti: 'old-jti',
      });
      (getItem as Mock).mockResolvedValue(mockUser);
      (isTokenBlacklisted as Mock).mockResolvedValue(false);
      (addTokenToBlacklist as Mock).mockResolvedValue(undefined);

      const result = await rotateRefreshToken('valid-refresh-token');

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mocked-token-usr_test123');
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBe(15);
    });

    it('should throw error for invalid refresh token', async () => {
      (jwt.verify as Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(rotateRefreshToken('invalid-token')).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error when token type is not refresh', async () => {
      (jwt.verify as Mock).mockReturnValue({ userId: 'user123', type: 'access', jti: 'jti123' });

      await expect(rotateRefreshToken('access-token-mistakenly-used')).rejects.toThrow(
        'Invalid token type'
      );
    });

    it('should throw error when user not found', async () => {
      (jwt.verify as Mock).mockReturnValue({
        userId: 'nonexistent',
        type: 'refresh',
        jti: 'jti123',
      });
      (getItem as Mock).mockResolvedValue(null);

      await expect(rotateRefreshToken('valid-refresh-token')).rejects.toThrow('User not found');
    });

    it('should blacklist old token', async () => {
      const mockUser = createMockActiveUser();
      (jwt.verify as Mock).mockReturnValue({
        userId: mockUser.id,
        type: 'refresh',
        jti: 'old-jti',
      });
      (getItem as Mock).mockResolvedValue(mockUser);
      (isTokenBlacklisted as Mock).mockResolvedValue(false);
      (addTokenToBlacklist as Mock).mockResolvedValue(undefined);

      await rotateRefreshToken('old-refresh-token');

      expect(addTokenToBlacklist).toHaveBeenCalledWith('old-jti');
    });

    it('should call addTokenToBlacklist for blacklisting', async () => {
      const mockUser = createMockActiveUser();
      (jwt.verify as Mock).mockReturnValue({ userId: mockUser.id, type: 'refresh', jti: 'jti123' });
      (getItem as Mock).mockResolvedValue(mockUser);
      (isTokenBlacklisted as Mock).mockResolvedValue(false);
      (addTokenToBlacklist as Mock).mockResolvedValue(undefined);

      await rotateRefreshToken('refresh-token');

      expect(addTokenToBlacklist).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should complete without error when no refresh token provided', async () => {
      await expect(logout('user123')).resolves.not.toThrow();
    });

    it('should blacklist valid refresh token', async () => {
      (jwt.verify as Mock).mockReturnValue({ jti: 'token-jti' });
      (addTokenToBlacklist as Mock).mockResolvedValue(undefined);

      await logout('user123', 'valid-refresh-token');

      expect(addTokenToBlacklist).toHaveBeenCalledWith('token-jti');
    });

    it('should not throw for invalid refresh token', async () => {
      (jwt.verify as Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(logout('user123', 'invalid-token')).resolves.not.toThrow();
    });

    it('should not call blacklist when jti is undefined in token', async () => {
      (jwt.verify as Mock).mockReturnValue({});

      await logout('user123', 'token-without-jti');

      expect(addTokenToBlacklist).not.toHaveBeenCalled();
    });

    it('should handle empty refresh token string', async () => {
      await logout('user123', '');

      expect(addTokenToBlacklist).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only refresh token', async () => {
      await logout('user123', '   ');

      expect(addTokenToBlacklist).not.toHaveBeenCalled();
    });
  });

  describe('register additional edge cases', () => {
    it('should include phone number when provided', async () => {
      (getItem as Mock).mockResolvedValue(null);
      (bcrypt.hash as Mock).mockResolvedValue('hashedPassword');
      (transactWrite as Mock).mockResolvedValue(undefined);
      (createEntityKey as Mock).mockReturnValue({ PK: 'USER#usr_test', SK: 'METADATA' });

      const result = await register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: UserRole.STUDENT,
        phone: '+64-21-123-4567',
      });

      expect(result.user.phone).toBe('+64-21-123-4567');
      expect(result.token).toBeDefined();
    });

    it('should handle register with missing optional phone', async () => {
      (getItem as Mock).mockResolvedValue(null);
      (bcrypt.hash as Mock).mockResolvedValue('hashedPassword');
      (transactWrite as Mock).mockResolvedValue(undefined);
      (createEntityKey as Mock).mockReturnValue({ PK: 'USER#usr_test', SK: 'METADATA' });

      const result = await register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: UserRole.TEACHER,
      });

      expect(result.user.phone).toBeUndefined();
      expect(result.user.role).toBe(UserRole.TEACHER);
      expect(result.token).toBeDefined();
    });

    it('should generate UUID-like user ID', async () => {
      (getItem as Mock).mockResolvedValue(null);
      (bcrypt.hash as Mock).mockResolvedValue('hashedPassword');
      (transactWrite as Mock).mockResolvedValue(undefined);

      const result = await register({
        email: 'uuid_test@example.com',
        password: 'password123',
        name: 'UUID Test',
        role: UserRole.PARENT,
      });

      expect(result.user.id).toMatch(/^usr_[a-f0-9-]{36}$/);
      expect(result.token).toBeDefined();
    });

    it('should return token with correct expiresIn', async () => {
      (getItem as Mock).mockResolvedValue(null);
      (bcrypt.hash as Mock).mockResolvedValue('hashedPassword');
      (transactWrite as Mock).mockResolvedValue(undefined);
      (createEntityKey as Mock).mockReturnValue({ PK: 'USER#usr_test', SK: 'METADATA' });

      const result = await register({
        email: 'consent_test@example.com',
        password: 'password123',
        name: 'Consent Test',
        role: UserRole.STUDENT,
      });

      expect(result.expiresIn).toBe(604800);
      expect(result.token).toBeDefined();
    });

    it('should create user with correct entity keys', async () => {
      (getItem as Mock).mockResolvedValue(null);
      (bcrypt.hash as Mock).mockResolvedValue('hashedPassword');
      (transactWrite as Mock).mockResolvedValue(undefined);

      const result = await register({
        email: 'gsi_test@example.com',
        password: 'password123',
        name: 'GSI Test',
        role: UserRole.STUDENT,
      });

      expect(result.user.email).toBe('gsi_test@example.com');
      expect(result.user.id).toBeDefined();
      expect(result.token).toBeDefined();
    });
  });

  describe('login additional edge cases', () => {
    it('should use getUserByEmail for user lookup', async () => {
      const mockUser = createMockActiveUser();
      (getItem as Mock).mockResolvedValue({ userId: mockUser.id });
      (getItem as Mock).mockResolvedValueOnce({ userId: mockUser.id });
      (getItem as Mock).mockResolvedValueOnce(mockUser);
      (bcrypt.compare as Mock).mockResolvedValue(true);

      const result = await login({ email: mockUser.email, password: 'password123' });

      expect(result).toBeDefined();
      expect(getItem).toHaveBeenCalled();
    });

    it('should return correct expiresIn value', async () => {
      const mockUser = createMockActiveUser();
      (getItem as Mock).mockResolvedValue({ userId: mockUser.id });
      (getItem as Mock).mockResolvedValueOnce({ userId: mockUser.id });
      (getItem as Mock).mockResolvedValueOnce(mockUser);
      (bcrypt.compare as Mock).mockResolvedValue(true);

      const result = await login({ email: mockUser.email, password: 'password123' });

      expect(result.expiresIn).toBe(604800);
    });

    it('should include all user fields in response', async () => {
      const mockUser = createMockActiveUser();
      (getItem as Mock).mockResolvedValue(null);
      (getItem as Mock).mockResolvedValueOnce({ userId: mockUser.id, email: mockUser.email });
      (getItem as Mock).mockResolvedValueOnce(mockUser);
      (getItem as Mock).mockResolvedValueOnce(mockUser);
      (bcrypt.compare as Mock).mockResolvedValue(true);

      const result = await login({ email: mockUser.email, password: 'password123' });

      expect(result.user.id).toBeDefined();
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user.name).toBe(mockUser.name);
      expect(result.user.role).toBe(mockUser.role);
    });

    it('should handle very long password without error', async () => {
      const mockUser = createMockActiveUser();
      (getItem as Mock).mockResolvedValue(null);
      (getItem as Mock).mockResolvedValueOnce({ userId: mockUser.id, email: mockUser.email });
      (getItem as Mock).mockResolvedValueOnce(mockUser);
      (getItem as Mock).mockResolvedValueOnce(mockUser);
      (bcrypt.compare as Mock).mockResolvedValue(true);

      const longPassword = 'a'.repeat(1000);
      const result = await login({ email: mockUser.email, password: longPassword });

      expect(result).toBeDefined();
    });
  });

  describe('getUserByEmail additional edge cases', () => {
    it('should return null when getItem throws error', async () => {
      (getItem as Mock).mockRejectedValue(new Error('DynamoDB Error'));

      const result = await getUserByEmail('test@example.com');

      expect(result).toBeNull();
      expect(getItem).toHaveBeenCalled();
    });

    it('should handle empty email string', async () => {
      (getItem as Mock).mockResolvedValue(null);

      const result = await getUserByEmail('');

      expect(result).toBeNull();
    });

    it('should handle special characters in email', async () => {
      const mockUser = createMockUser();
      (getItem as Mock).mockResolvedValue({ userId: mockUser.id, email: mockUser.email });
      (getItem as Mock).mockResolvedValueOnce({ userId: mockUser.id, email: mockUser.email });
      (getItem as Mock).mockResolvedValueOnce(mockUser);

      const result = await getUserByEmail('test+special@example.com');

      expect(result).toEqual(mockUser);
    });

    it('should use correct EMAIL# key format', async () => {
      const mockUser = createMockUser();
      (getItem as Mock).mockResolvedValue({ userId: mockUser.id });
      (getItem as Mock).mockResolvedValueOnce({ userId: mockUser.id });
      (getItem as Mock).mockResolvedValueOnce(mockUser);

      await getUserByEmail(mockUser.email);

      expect(getItem).toHaveBeenCalledWith(
        expect.objectContaining({ PK: `EMAIL#${mockUser.email.toLowerCase()}`, SK: 'METADATA' })
      );
    });

    it('should return null when email item not found', async () => {
      (getItem as Mock).mockResolvedValue(null);

      const result = await getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('updateUserPassword additional edge cases', () => {
    it('should call updateItem with correct SET expression', async () => {
      const mockUser = createMockActiveUser();
      (updateItem as Mock).mockResolvedValue({});

      await updateUserPassword(mockUser.id, 'newHashedPassword');

      expect(updateItem).toHaveBeenCalledWith(
        expect.any(Object),
        'SET passwordHash = :passwordHash, updatedAt = :updatedAt',
        expect.objectContaining({
          ':passwordHash': 'newHashedPassword',
        })
      );
    });

    it('should generate updatedAt timestamp', async () => {
      const mockUser = createMockActiveUser();
      (updateItem as Mock).mockResolvedValue({});
      const beforeCall = new Date().toISOString();

      await updateUserPassword(mockUser.id, 'newHash');

      const callArgs = (updateItem as Mock).mock.calls[0][2];
      expect(callArgs[':updatedAt']).toBeDefined();
      expect(callArgs[':updatedAt'] >= beforeCall).toBe(true);
    });
  });

  describe('verifyToken additional edge cases', () => {
    it('should return null when jwt.verify throws specific errors', async () => {
      (jwt.verify as Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const result = await verifyToken('expired-token');
      expect(result).toBeNull();
    });

    it('should return null for malformed token', async () => {
      (jwt.verify as Mock).mockImplementation(() => {
        throw new Error('invalid token');
      });

      const result = await verifyToken('not-a-valid-jwt');
      expect(result).toBeNull();
    });

    it('should handle token with missing userId', async () => {
      (jwt.verify as Mock).mockReturnValue({});
      (getItem as Mock).mockResolvedValue(null);

      const result = await verifyToken('token-without-userId');
      expect(result).toBeNull();
    });

    it('should call getUserById with correct userId from token', async () => {
      const mockUser = createMockUser();
      (jwt.verify as Mock).mockReturnValue({ userId: mockUser.id });
      (getItem as Mock).mockResolvedValue(mockUser);

      await verifyToken('valid-token');

      expect(getItem).toHaveBeenCalledWith(expect.objectContaining({ PK: `USER#${mockUser.id}` }));
    });
  });

  describe('generateVerificationCode additional edge cases', () => {
    it('should always return string type', () => {
      const code = generateVerificationCode();
      expect(typeof code).toBe('string');
    });

    it('should not return codes with leading zeros', () => {
      for (let i = 0; i < 1000; i++) {
        const code = generateVerificationCode();
        expect(code.charAt(0)).not.toBe('0');
      }
    });

    it('should return 6-digit codes that are numeric only', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateVerificationCode();
        expect(code).toMatch(/^[0-9]{6}$/);
      }
    });

    it('should generate codes with uniform distribution characteristics', () => {
      const firstDigits: Record<string, number> = {};
      for (let i = 0; i < 1000; i++) {
        const code = generateVerificationCode();
        const firstDigit = code.charAt(0);
        firstDigits[firstDigit] = (firstDigits[firstDigit] || 0) + 1;
      }
      const nonZeroFirstDigits = Object.entries(firstDigits).filter(([d]) => d !== '0');
      expect(nonZeroFirstDigits.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('sendVerificationCode additional edge cases', () => {
    it('should handle null rate limit (first request)', async () => {
      (incrementRateLimit as Mock).mockResolvedValue({
        count: 1,
        allowed: true,
        remaining: 2,
        resetAt: Date.now() / 1000 + 60,
      });
      (setCache as Mock).mockResolvedValue(undefined);
      (sendVerificationEmail as Mock).mockResolvedValue(true);

      await sendVerificationCode('first@example.com', AuthType.REGISTER);

      expect(incrementRateLimit).toHaveBeenCalled();
    });

    it('should handle zero rate limit', async () => {
      (incrementRateLimit as Mock).mockResolvedValue({
        count: 1,
        allowed: true,
        remaining: 0,
        resetAt: Date.now() / 1000 + 60,
      });
      (setCache as Mock).mockResolvedValue(undefined);
      (sendVerificationEmail as Mock).mockResolvedValue(true);

      await sendVerificationCode('zero@example.com', AuthType.LOGIN);

      expect(setCache).toHaveBeenCalled();
    });

    it('should use correct rate limit key format', async () => {
      (incrementRateLimit as Mock).mockResolvedValue({
        count: 1,
        allowed: true,
        remaining: 2,
        resetAt: Date.now() / 1000 + 60,
      });
      (setCache as Mock).mockResolvedValue(undefined);
      (sendVerificationEmail as Mock).mockResolvedValue(true);

      await sendVerificationCode('ratelimit@example.com', AuthType.FORGOT_PASSWORD);

      expect(incrementRateLimit).toHaveBeenCalledWith(
        'ratelimit@example.com:FORGOT_PASSWORD',
        'email',
        3,
        60
      );
    });

    it('should store code with correct key format', async () => {
      (incrementRateLimit as Mock).mockResolvedValue({
        count: 1,
        allowed: true,
        remaining: 2,
        resetAt: Date.now() / 1000 + 60,
      });
      (setCache as Mock).mockResolvedValue(undefined);
      (sendVerificationEmail as Mock).mockResolvedValue(true);

      await sendVerificationCode('code@example.com', AuthType.REGISTER);

      expect(setCache).toHaveBeenCalledWith(
        'verify:code@example.com:REGISTER',
        'VERIFY',
        expect.any(String),
        300
      );
    });

    it('should call sendVerificationEmail with correct parameters', async () => {
      (incrementRateLimit as Mock).mockResolvedValue({
        count: 1,
        allowed: true,
        remaining: 2,
        resetAt: Date.now() / 1000 + 60,
      });
      (setCache as Mock).mockResolvedValue(undefined);
      (sendVerificationEmail as Mock).mockResolvedValue(true);

      await sendVerificationCode('email@example.com', AuthType.REGISTER);

      expect(sendVerificationEmail).toHaveBeenCalledWith({
        email: 'email@example.com',
        code: expect.any(String),
        type: 'REGISTER',
        expiresIn: 300,
      });
    });
  });

  describe('verifyCode additional edge cases', () => {
    it('should handle case-sensitive code comparison', async () => {
      (getFromCache as Mock).mockResolvedValue('ABC123');
      (deleteFromCache as Mock).mockResolvedValue(undefined);

      await expect(verifyCode('test@example.com', 'abc123', AuthType.REGISTER)).rejects.toThrow(
        'Invalid verification code'
      );
    });

    it('should handle code with spaces', async () => {
      (getFromCache as Mock).mockResolvedValue('123 456');
      (deleteFromCache as Mock).mockResolvedValue(undefined);

      await verifyCode('test@example.com', '123 456', AuthType.REGISTER);

      expect(deleteFromCache).toHaveBeenCalled();
    });

    it('should handle very long codes', async () => {
      (getFromCache as Mock).mockResolvedValue('123456789012');
      (deleteFromCache as Mock).mockResolvedValue(undefined);

      await expect(verifyCode('test@example.com', '123456', AuthType.REGISTER)).rejects.toThrow(
        'Invalid verification code'
      );
    });

    it('should throw for whitespace-only code', async () => {
      (getFromCache as Mock).mockResolvedValue('123456');

      await expect(verifyCode('test@example.com', '   ', AuthType.REGISTER)).rejects.toThrow(
        'Invalid verification code'
      );
    });
  });

  describe('rotateRefreshToken additional edge cases', () => {
    it('should throw for expired refresh token', async () => {
      (jwt.verify as Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(rotateRefreshToken('expired-refresh-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should generate different access and refresh tokens', async () => {
      const mockUser = createMockActiveUser();
      (jwt.verify as Mock).mockReturnValue({
        userId: mockUser.id,
        type: 'refresh',
        jti: 'jti123',
      });
      (getItem as Mock).mockResolvedValue(mockUser);
      (jwt.sign as Mock).mockImplementation((payload, secret, options) => {
        return `${options?.issuer}-token-${payload.type}`;
      });
      (setCache as Mock).mockResolvedValue(undefined);

      const result = await rotateRefreshToken('refresh-token');

      expect(result.accessToken).not.toBe(result.refreshToken);
    });

    it('should use correct secret from config', async () => {
      const mockUser = createMockActiveUser();
      (jwt.verify as Mock).mockReturnValue({
        userId: mockUser.id,
        type: 'refresh',
        jti: 'jti123',
      });
      (getItem as Mock).mockResolvedValue(mockUser);
      (isTokenBlacklisted as Mock).mockResolvedValue(false);
      (addTokenToBlacklist as Mock).mockResolvedValue(undefined);

      await rotateRefreshToken('refresh-token');

      expect(addTokenToBlacklist).toHaveBeenCalledWith('jti123');
    });

    it('should include user email in new access token', async () => {
      const mockUser = createMockActiveUser();
      (jwt.verify as Mock).mockReturnValue({
        userId: mockUser.id,
        type: 'refresh',
        jti: 'jti123',
      });
      (getItem as Mock).mockResolvedValue(mockUser);
      (isTokenBlacklisted as Mock).mockResolvedValue(false);
      (addTokenToBlacklist as Mock).mockResolvedValue(undefined);

      await rotateRefreshToken('refresh-token');

      expect(addTokenToBlacklist).toHaveBeenCalledWith('jti123');
    });

    it('should include user role in new access token', async () => {
      const mockUser = createMockActiveUser();
      (jwt.verify as Mock).mockReturnValue({
        userId: mockUser.id,
        type: 'refresh',
        jti: 'jti123',
      });
      (getItem as Mock).mockResolvedValue(mockUser);
      (isTokenBlacklisted as Mock).mockResolvedValue(false);
      (addTokenToBlacklist as Mock).mockResolvedValue(undefined);

      await rotateRefreshToken('refresh-token');

      expect(addTokenToBlacklist).toHaveBeenCalledWith('jti123');
    });
  });
});
