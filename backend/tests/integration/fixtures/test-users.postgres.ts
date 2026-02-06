/**
 * Test Fixtures for PostgreSQL
 * Helper functions for creating and cleaning up test data
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { getTestPool } from '../setup.postgres';
import { UserRole, UserStatus } from '@src/shared/types';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  passwordHash: string;
}

/**
 * Create a test user in the database
 */
export async function createTestUser(overrides: {
  email?: string;
  password?: string;
  name?: string;
  role?: UserRole;
  status?: UserStatus;
} = {}): Promise<TestUser> {
  const pool = getTestPool();
  const email = overrides.email ?? `test-${Date.now()}@example.com`;
  const password = overrides.password ?? 'SecurePass123!';
  const name = overrides.name ?? 'Test User';
  const role = overrides.role ?? UserRole.STUDENT;
  const status = overrides.status ?? UserStatus.ACTIVE;

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, status, language)
     VALUES ($1, $2, $3, $4, $5, 'zh')
     RETURNING id`,
    [email.toLowerCase(), passwordHash, name, role, status]
  );

  return {
    id: result.rows[0].id,
    email,
    password,
    name,
    role,
    passwordHash,
  };
}

/**
 * Clean up test user by email
 */
export async function cleanupTestUser(email: string) {
  const pool = getTestPool();
  await pool.query('DELETE FROM users WHERE email LIKE $1', [`%${email}%`]);
}

/**
 * Clean up all test data
 */
export async function cleanupAllTestData() {
  const pool = getTestPool();
  await pool.query('DELETE FROM role_application_history');
  await pool.query('DELETE FROM role_applications');
  await pool.query('DELETE FROM sessions');
  await pool.query('DELETE FROM verification_codes');
  await pool.query('DELETE FROM users');
}

/**
 * Create a verification code for testing
 */
export async function createTestVerificationCode(
  email: string,
  code: string = '123456',
  type: string = 'REGISTER'
) {
  const pool = getTestPool();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await pool.query(
    `INSERT INTO verification_codes (email, code, type, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [email.toLowerCase(), code, type, expiresAt]
  );
}

/**
 * Create a session for testing
 */
export async function createTestSession(userId: string, jti: string = 'test-jti') {
  const pool = getTestPool();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await pool.query(
    `INSERT INTO sessions (user_id, token_jti, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, jti, 'test-hash', expiresAt]
  );
}

/**
 * Create a role application for testing
 */
export async function createTestRoleApplication(
  userId: string,
  role: UserRole = UserRole.TEACHER
) {
  const pool = getTestPool();

  const result = await pool.query(
    `INSERT INTO role_applications (user_id, role, status)
     VALUES ($1, $2, 'PENDING')
     RETURNING id`,
    [userId, role]
  );

  return result.rows[0].id;
}
