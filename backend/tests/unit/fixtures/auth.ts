/**
 * Test Fixtures
 * Factory functions for creating test data
 */

import { User, UserRole, UserStatus } from '@src/shared/types';
import { JwtPayload } from '@src/shared/middleware/auth';

// User fixtures
export function createMockUser(overrides: Partial<User> = {}): User {
  const now = new Date().toISOString();
  return {
    PK: 'USER#usr_test123',
    SK: 'METADATA',
    entityType: 'USER',
    dataCategory: 'USER',
    id: 'usr_test123',
    email: 'test@example.com',
    name: 'Test User',
    phone: '+64123456789',
    passwordHash: '$2a$10$hashedpassword',
    role: UserRole.PARENT,
    status: UserStatus.ACTIVE,
    language: 'zh',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockUserWithRole(role: UserRole, overrides: Partial<User> = {}): User {
  return createMockUser({
    id: `usr_${role.toLowerCase()}_test`,
    email: `${role.toLowerCase()}@example.com`,
    name: `${role} Test User`,
    role,
    ...overrides,
  });
}

export function createMockActiveUser(overrides: Partial<User> = {}): User {
  return createMockUser({
    status: UserStatus.ACTIVE,
    ...overrides,
  });
}

export function createMockDisabledUser(overrides: Partial<User> = {}): User {
  return createMockUser({
    status: UserStatus.DISABLED,
    email: 'disabled@example.com',
    id: 'usr_disabled_test',
    ...overrides,
  });
}

export function createMockPendingUser(overrides: Partial<User> = {}): User {
  return createMockUser({
    status: UserStatus.PENDING_PARENTAL_CONSENT,
    email: 'pending@example.com',
    id: 'usr_pending_test',
    ...overrides,
  });
}

export function createMockStudentUser(overrides: Partial<User> = {}): User {
  return createMockUserWithRole(UserRole.STUDENT, overrides);
}

export function createMockTeacherUser(overrides: Partial<User> = {}): User {
  return createMockUserWithRole(UserRole.TEACHER, overrides);
}

export function createMockAdminUser(overrides: Partial<User> = {}): User {
  return createMockUserWithRole(UserRole.ADMIN, overrides);
}

// JWT fixtures
export function createMockJwtPayload(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    userId: 'usr_test123',
    email: 'test@example.com',
    role: 'PARENT',
    type: 'access',
    iss: 'findclass.nz',
    jti: 'test-jti-123',
    ...overrides,
  };
}

export function createMockRefreshTokenPayload(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    userId: 'usr_test123',
    email: 'test@example.com',
    role: 'PARENT',
    type: 'refresh',
    iss: 'findclass.nz',
    jti: 'test-refresh-jti-123',
    ...overrides,
  };
}

// Auth request/response fixtures
export function createRegisterRequest(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    role: 'PARENT',
    phone: '+6498765432',
    language: 'zh',
    ...overrides,
  };
}

export function createLoginRequest(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    email: 'test@example.com',
    password: 'password123',
    ...overrides,
  };
}

export function createAuthResponse(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    token: 'mock.jwt.token',
    refreshToken: 'mock.refresh.token',
    expiresIn: 604800,
    user: {
      id: 'usr_test123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'PARENT',
    },
    ...overrides,
  };
}
