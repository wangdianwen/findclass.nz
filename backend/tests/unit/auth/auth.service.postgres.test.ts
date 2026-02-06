/**
 * Auth Service Unit Tests - PostgreSQL Version
 */

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { Pool } from 'pg';

// Mock config first
const mockConfig = {
  auth: {
    bcryptRounds: 10,
    verificationCodeExpires: 300,
    passwordResetExpires: 900,
  },
  jwt: {
    secret: 'test-secret',
    algorithm: 'HS256',
    issuer: 'findclass.nz',
    expiresIn: '15m',
    refreshExpiresIn: '7d',
  },
};

vi.mock('../../config', () => ({
  getConfig: vi.fn(() => mockConfig),
}));

// Mock PostgreSQL pool
const mockPool = {
  query: vi.fn(),
  connect: vi.fn(),
};

vi.mock('@shared/db/postgres/client', () => ({
  getPool: vi.fn(() => mockPool),
}));

// Mock bcrypt - properly mock default export
vi.mock('bcryptjs', async () => {
  const actual = await vi.importActual<typeof import('bcryptjs')>('bcryptjs');
  return {
    default: {
      ...actual.default,
      hash: vi.fn(),
      compare: vi.fn(),
    },
    hash: vi.fn(),
    compare: vi.fn(),
  };
});

// Mock jsonwebtoken - properly mock default export
vi.mock('jsonwebtoken', async () => {
  const actual = await vi.importActual<typeof import('jsonwebtoken')>('jsonwebtoken');
  return {
    default: {
      ...actual.default,
      sign: vi.fn(),
      verify: vi.fn(),
    },
    sign: vi.fn(),
    verify: vi.fn(),
  };
});

// Mock auth middleware functions
vi.mock('@shared/middleware/auth', () => ({
  addTokenToBlacklist: vi.fn(),
  isTokenBlacklisted: vi.fn(),
  generateToken: vi.fn(payload => `mocked-token-${payload.userId}`),
  generateRefreshToken: vi.fn(userId => `mocked-refresh-${userId}`),
  verifyRefreshToken: vi.fn(),
  rotateRefreshToken: vi.fn(),
}));

// Mock email service
vi.mock('@shared/smtp/email.service', () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

// Mock repositories
const mockUserRepository = {
  findById: vi.fn(),
  findByEmail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  emailExists: vi.fn(),
  delete: vi.fn(),
  getProfile: vi.fn(),
};

const mockSessionRepository = {
  create: vi.fn(),
  addToBlacklist: vi.fn(),
  isBlacklisted: vi.fn(),
  findByJti: vi.fn(),
  revokeAllUserSessions: vi.fn(),
  cleanupExpired: vi.fn(),
  getActiveSessions: vi.fn(),
  revokeSession: vi.fn(),
};

const mockVerificationRepository = {
  create: vi.fn(),
  verifyAndMarkUsed: vi.fn(),
  getValidCode: vi.fn(),
  markAsUsed: vi.fn(),
  deleteExpired: vi.fn(),
  deleteAllForEmail: vi.fn(),
  hasRecentCode: vi.fn(),
  getLatest: vi.fn(),
};

const mockRoleApplicationRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findPendingByUserId: vi.fn(),
  findByUserId: vi.fn(),
  findPending: vi.fn(),
  findByStatus: vi.fn(),
  updateStatus: vi.fn(),
  cancel: vi.fn(),
  createHistory: vi.fn(),
  getWithHistory: vi.fn(),
  delete: vi.fn(),
  hasPendingApplication: vi.fn(),
};

// Mock repository constructors - use class syntax for Vitest 4 compatibility
vi.mock('@modules/auth/user.repository', () => ({
  UserRepository: class {
    findById = mockUserRepository.findById;
    findByEmail = mockUserRepository.findByEmail;
    create = mockUserRepository.create;
    update = mockUserRepository.update;
    emailExists = mockUserRepository.emailExists;
    delete = mockUserRepository.delete;
    getProfile = mockUserRepository.getProfile;
  },
}));

vi.mock('@modules/auth/session.repository', () => ({
  SessionRepository: class {
    create = mockSessionRepository.create;
    addToBlacklist = mockSessionRepository.addToBlacklist;
    isBlacklisted = mockSessionRepository.isBlacklisted;
    findByJti = mockSessionRepository.findByJti;
    revokeAllUserSessions = mockSessionRepository.revokeAllUserSessions;
    cleanupExpired = mockSessionRepository.cleanupExpired;
    getActiveSessions = mockSessionRepository.getActiveSessions;
    revokeSession = mockSessionRepository.revokeSession;
  },
}));

vi.mock('@modules/auth/verification.repository', () => ({
  VerificationCodeRepository: class {
    create = mockVerificationRepository.create;
    verifyAndMarkUsed = mockVerificationRepository.verifyAndMarkUsed;
    getValidCode = mockVerificationRepository.getValidCode;
    markAsUsed = mockVerificationRepository.markAsUsed;
    deleteExpired = mockVerificationRepository.deleteExpired;
    deleteAllForEmail = mockVerificationRepository.deleteAllForEmail;
    hasRecentCode = mockVerificationRepository.hasRecentCode;
    getLatest = mockVerificationRepository.getLatest;
  },
}));

vi.mock('@modules/auth/role-application.repository', () => ({
  RoleApplicationRepository: class {
    create = mockRoleApplicationRepository.create;
    findById = mockRoleApplicationRepository.findById;
    findPendingByUserId = mockRoleApplicationRepository.findPendingByUserId;
    findByUserId = mockRoleApplicationRepository.findByUserId;
    findPending = mockRoleApplicationRepository.findPending;
    findByStatus = mockRoleApplicationRepository.findByStatus;
    updateStatus = mockRoleApplicationRepository.updateStatus;
    cancel = mockRoleApplicationRepository.cancel;
    createHistory = mockRoleApplicationRepository.createHistory;
    getWithHistory = mockRoleApplicationRepository.getWithHistory;
    delete = mockRoleApplicationRepository.delete;
    hasPendingApplication = mockRoleApplicationRepository.hasPendingApplication;
  },
}));

// Import after mocks are set up
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendVerificationEmail } from '@shared/smtp/email.service';
import { addTokenToBlacklist, generateToken, generateRefreshToken } from '@shared/middleware/auth';
import { UserRole, UserStatus } from '@shared/types';
import { AuthType } from '@modules/auth/auth.types';
import {
  register,
  login,
  getUserByEmail,
  getUserById,
  sendVerificationCode,
  verifyCode,
  logout,
  generateVerificationCode,
  requestPasswordReset,
} from '@modules/auth/auth.service';

// Test data factories
function createMockUser(
  overrides: Partial<{
    id: string;
    email: string;
    name: string;
    password_hash: string;
    role: UserRole;
    status: UserStatus;
    language: string;
    phone: string;
    created_at: Date;
    updated_at: Date;
  }> = {}
) {
  return {
    id: 'usr_test123',
    email: 'test@example.com',
    name: 'Test User',
    password_hash: 'hashedPassword',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    language: 'zh',
    phone: undefined as string | undefined,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function createMockActiveUser() {
  return createMockUser({ status: UserStatus.ACTIVE });
}

function createMockDisabledUser() {
  return createMockUser({ status: UserStatus.DISABLED });
}

describe('AuthService (PostgreSQL)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset bcrypt mocks
    (bcrypt.hash as Mock).mockReset();
    (bcrypt.compare as Mock).mockReset();
    (jwt.sign as Mock).mockReset();
    (jwt.verify as Mock).mockReset();
  });

  describe('register', () => {
    it('should register new user successfully', async () => {
      const newUserEmail = 'newuser@example.com';
      const newUserName = 'New User';
      const mockUser = createMockUser({ email: newUserEmail, name: newUserName });
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);
      (bcrypt.hash as Mock).mockResolvedValue('hashedPassword');

      const result = await register({
        email: newUserEmail,
        password: 'password123',
        name: newUserName,
        role: UserRole.STUDENT,
      });

      expect(result).toBeDefined();
      expect(result.user.email).toBe(newUserEmail);
      expect(result.user.name).toBe(newUserName);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(newUserEmail);
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it('should throw error when email already exists', async () => {
      const existingUser = createMockUser();
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(
        register({
          email: existingUser.email,
          password: 'password123',
          name: existingUser.name,
          role: existingUser.role,
        })
      ).rejects.toThrow('Email already registered');
    });

    it('should register student user successfully', async () => {
      const mockUser = createMockUser({ role: UserRole.STUDENT });
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);
      (bcrypt.hash as Mock).mockResolvedValue('hashedPassword');

      const result = await register({
        email: 'student@example.com',
        password: 'password123',
        name: 'Student User',
        role: UserRole.STUDENT,
      });

      expect(result).toBeDefined();
      expect(result.user.role).toBe(UserRole.STUDENT);
    });

    it('should hash password with bcrypt', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(createMockUser());
      (bcrypt.hash as Mock).mockResolvedValue('hashedPassword');

      await register({
        email: 'test@example.com',
        password: 'plainPassword',
        name: 'Test User',
        role: UserRole.STUDENT,
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('plainPassword', 10);
    });

    it('should normalize email to lowercase', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(createMockUser());
      (bcrypt.hash as Mock).mockResolvedValue('hashedPassword');

      await register({
        email: 'Test@Example.COM',
        password: 'password123',
        name: 'Test User',
        role: UserRole.STUDENT,
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('login', () => {
    it('should return user and token on successful login', async () => {
      const mockUser = createMockActiveUser();
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as Mock).mockResolvedValue(true);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await login({ email: mockUser.email, password: 'password123' });

      expect(result).toBeDefined();
      expect(result.user.email).toBe(mockUser.email);
      expect(result.token).toBe('mocked-token-usr_test123');
    });

    it('should throw error for non-existent user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        login({ email: 'nonexistent@example.com', password: 'password123' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for disabled user', async () => {
      const disabledUser = createMockDisabledUser();
      mockUserRepository.findByEmail.mockResolvedValue(disabledUser);
      (bcrypt.compare as Mock).mockResolvedValue(true);
      mockUserRepository.findById.mockResolvedValue(disabledUser);

      await expect(login({ email: disabledUser.email, password: 'password123' })).rejects.toThrow(
        'Account is disabled'
      );
    });

    it('should throw error for incorrect password', async () => {
      const mockUser = createMockActiveUser();
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as Mock).mockResolvedValue(false);

      await expect(login({ email: mockUser.email, password: 'wrongpassword' })).rejects.toThrow(
        'Invalid email or password'
      );
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = createMockUser();
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await getUserByEmail(mockUser.email);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(mockUser.email);
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = createMockUser();
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await getUserById(mockUser.id);

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await getUserById('nonexistent');

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

    it('should generate codes between 100000 and 999999', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateVerificationCode();
        const numericCode = parseInt(code, 10);
        expect(numericCode).toBeGreaterThanOrEqual(100000);
        expect(numericCode).toBeLessThanOrEqual(999999);
      }
    });
  });

  describe('sendVerificationCode', () => {
    it('should return expiresIn on successful code generation', async () => {
      mockVerificationRepository.hasRecentCode.mockResolvedValue(false);
      mockVerificationRepository.create.mockResolvedValue({} as any);
      (sendVerificationEmail as Mock).mockResolvedValue(true);

      const result = await sendVerificationCode('test@example.com', AuthType.REGISTER);

      expect(result).toBeDefined();
      expect(result.expiresIn).toBe(300);
      expect(mockVerificationRepository.create).toHaveBeenCalled();
      expect(sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw error when rate limit exceeded', async () => {
      mockVerificationRepository.hasRecentCode.mockResolvedValue(true);

      await expect(sendVerificationCode('test@example.com', AuthType.REGISTER)).rejects.toThrow(
        'Rate limit exceeded'
      );
    });

    it('should continue even if email sending fails', async () => {
      mockVerificationRepository.hasRecentCode.mockResolvedValue(false);
      mockVerificationRepository.create.mockResolvedValue({} as any);
      (sendVerificationEmail as Mock).mockResolvedValue(false);

      const result = await sendVerificationCode('test@example.com', AuthType.REGISTER);

      expect(result).toBeDefined();
      expect(result.expiresIn).toBe(300);
    });
  });

  describe('verifyCode', () => {
    it('should return true for valid code', async () => {
      mockVerificationRepository.verifyAndMarkUsed.mockResolvedValue({ valid: true });

      const result = await verifyCode('test@example.com', '123456', AuthType.REGISTER);

      expect(result).toBe(true);
      expect(mockVerificationRepository.verifyAndMarkUsed).toHaveBeenCalledWith(
        'test@example.com',
        '123456',
        AuthType.REGISTER
      );
    });

    it('should throw error for invalid code', async () => {
      mockVerificationRepository.verifyAndMarkUsed.mockResolvedValue({
        valid: false,
        error: 'Invalid code',
      });

      await expect(verifyCode('test@example.com', '654321', AuthType.REGISTER)).rejects.toThrow(
        'Invalid code'
      );
    });
  });

  describe('logout', () => {
    it('should complete without error when no tokens provided', async () => {
      await expect(logout('user123')).resolves.not.toThrow();
    });

    it('should handle logout gracefully with tokens', async () => {
      await expect(logout('user123', 'refresh-token', 'access-token')).resolves.not.toThrow();
    });
  });

  describe('requestPasswordReset', () => {
    it('should return expiresIn for existing user', async () => {
      const mockUser = createMockUser();
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockVerificationRepository.hasRecentCode.mockResolvedValue(false);
      mockVerificationRepository.create.mockResolvedValue({} as any);
      (sendVerificationEmail as Mock).mockResolvedValue(true);

      const result = await requestPasswordReset('test@example.com');

      expect(result).toBeDefined();
      expect(result.expiresIn).toBe(300);
    });

    it('should return expiresIn even for non-existent email', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await requestPasswordReset('nonexistent@example.com');

      expect(result).toBeDefined();
      expect(result.expiresIn).toBe(300);
    });
  });
});
