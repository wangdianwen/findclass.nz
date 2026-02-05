/**
 * Test Users Fixture
 * Factory functions for creating test user data with single table design
 */

import bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from '@src/shared/types';

export interface TestUser {
  user: User;
  password: string;
}

let userCounter = 0;

function generateUniqueId(): string {
  userCounter++;
  return `usr_${Date.now()}_${userCounter}`;
}

function generateUniqueEmail(): string {
  return `testuser_${Date.now()}_${userCounter}@example.com`;
}

export async function createTestUser(overrides: Partial<User> = {}): Promise<TestUser> {
  const password = 'TestPass123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const userId = generateUniqueId();
  const email = generateUniqueEmail();
  const now = new Date().toISOString();

  const user: User = {
    PK: `USER#${userId}`,
    SK: 'METADATA',
    entityType: 'USER',
    dataCategory: 'USER',
    id: userId,
    email,
    name: 'Test User',
    phone: '+6498765432',
    passwordHash,
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    language: 'zh',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };

  return { user, password };
}

export async function createTestUserWithRole(role: UserRole): Promise<TestUser> {
  return createTestUser({ role });
}

export async function createDisabledUser(): Promise<TestUser> {
  return createTestUser({ status: UserStatus.DISABLED });
}

export async function createAdminUser(): Promise<TestUser> {
  return createTestUser({ role: UserRole.ADMIN });
}

export async function createTeacherUser(): Promise<TestUser> {
  return createTestUser({ role: UserRole.TEACHER });
}

export async function createParentUser(): Promise<TestUser> {
  return createTestUser({ role: UserRole.PARENT });
}

export async function createStudentUser(): Promise<TestUser> {
  return createTestUser({ role: UserRole.STUDENT });
}

export function createRegisterDto(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    email: `test_${Date.now()}@example.com`,
    password: 'TestPass123!',
    name: 'Test User',
    role: 'STUDENT',
    phone: '+6498765432',
    language: 'zh',
    ...overrides,
  };
}

export function createLoginDto(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: 'test@example.com',
    password: 'TestPass123!',
    ...overrides,
  };
}

export function createTestUsers(count: number): Promise<TestUser>[] {
  return Array.from({ length: count }, () => createTestUser());
}

/**
 * Cleanup test user (no-op since table is cleared before each test)
 * This function exists for API compatibility with test files
 */
export async function cleanupTestUser(_email: string): Promise<void> {
  // Table data is cleared before each test via setup.integration.ts
  // No explicit cleanup needed
}
