/**
 * PostgreSQL Setup for Integration Tests
 * Creates required tables, seeds test data using repositories
 * Provides helper functions for creating test users, teachers, courses
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getTestPool, getTestContext } from '../setup.integration';
import { UserRepository, type User } from '@src/modules/auth/user.repository';
import { VerificationCodeRepository } from '@src/modules/auth/verification.repository';
import { SessionRepository } from '@src/modules/auth/session.repository';
import { RoleApplicationRepository } from '@src/modules/auth/role-application.repository';
import { UserRole, UserStatus } from '@src/shared/types';

// Test user interface
export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  passwordHash: string;
}

// Test teacher interface
export interface TestTeacher {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  teachingYears: number;
  qualifications: string[];
  verified: boolean;
  teachingModes: string[];
  locations: string[];
  averageRating: number;
  totalReviews: number;
}

// Test course interface
export interface TestCourse {
  id: string;
  teacherId: string;
  title: string;
  description: string;
  category: string;
  price: number;
  teachingModes: string[];
  locations: string[];
  targetAgeGroups: string[];
  maxClassSize: number;
  status: string;
  averageRating: number;
}

// Repository instances (lazy initialized)
let _userRepository: UserRepository | null = null;
let _verificationRepository: VerificationCodeRepository | null = null;
let _sessionRepository: SessionRepository | null = null;
let _roleApplicationRepository: RoleApplicationRepository | null = null;

function getUserRepository(): UserRepository {
  if (!_userRepository) {
    _userRepository = new UserRepository(getTestPool());
  }
  return _userRepository;
}

function getVerificationRepository(): VerificationCodeRepository {
  if (!_verificationRepository) {
    _verificationRepository = new VerificationCodeRepository(getTestPool());
  }
  return _verificationRepository;
}

function getSessionRepository(): SessionRepository {
  if (!_sessionRepository) {
    _sessionRepository = new SessionRepository(getTestPool());
  }
  return _sessionRepository;
}

function getRoleApplicationRepository(): RoleApplicationRepository {
  if (!_roleApplicationRepository) {
    _roleApplicationRepository = new RoleApplicationRepository(getTestPool());
  }
  return _roleApplicationRepository;
}

/**
 * Create a test user in the database
 */
export async function createTestUser(
  overrides: {
    email?: string;
    password?: string;
    name?: string;
    role?: UserRole;
    status?: UserStatus;
  } = {}
): Promise<TestUser> {
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
    status,
    passwordHash,
  };
}

/**
 * Create a test user using the UserRepository
 */
export async function createTestUserWithRepository(
  overrides: {
    email?: string;
    password?: string;
    name?: string;
    role?: UserRole;
  } = {}
): Promise<User> {
  const email = overrides.email ?? `test-${Date.now()}@example.com`;
  const password = overrides.password ?? 'SecurePass123!';
  const name = overrides.name ?? 'Test User';
  const role = overrides.role ?? UserRole.STUDENT;

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await getUserRepository().create({
    email,
    password_hash: passwordHash,
    name,
    role,
    language: 'zh',
  });

  return user;
}

/**
 * Create a verification code for testing
 */
export async function createTestVerificationCode(
  email: string,
  code: string = '123456',
  type: string = 'REGISTER'
): Promise<void> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await getVerificationRepository().create({
    email: email.toLowerCase(),
    code,
    type,
    expires_at: expiresAt,
  });
}

/**
 * Create a session for testing
 */
export async function createTestSession(
  userId: string,
  jti: string = crypto.randomUUID()
): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await getSessionRepository().create({
    user_id: userId,
    token_jti: jti,
    token_hash: crypto.randomUUID(),
    expires_at: expiresAt,
  });
}

/**
 * Create a role application for testing
 */
export async function createTestRoleApplication(
  userId: string,
  role: UserRole = UserRole.TEACHER,
  reason?: string
): Promise<string> {
  const application = await getRoleApplicationRepository().create({
    user_id: userId,
    role,
    reason,
  });

  return application.id;
}

/**
 * Create a disabled user for testing
 */
export async function createDisabledUser(): Promise<TestUser> {
  return createTestUser({ status: UserStatus.DISABLED });
}

/**
 * Create an admin user for testing
 */
export async function createAdminUser(): Promise<TestUser> {
  return createTestUser({ role: UserRole.ADMIN });
}

/**
 * Create a teacher user for testing
 */
export async function createTeacherUser(): Promise<TestUser> {
  return createTestUser({ role: UserRole.TEACHER });
}

/**
 * Create a parent user for testing
 */
export async function createParentUser(): Promise<TestUser> {
  return createTestUser({ role: UserRole.PARENT });
}

/**
 * Create a student user for testing
 */
export async function createStudentUser(): Promise<TestUser> {
  return createTestUser({ role: UserRole.STUDENT });
}

/**
 * Create a teacher profile for testing
 */
export async function createTestTeacher(
  userId: string,
  overrides: {
    displayName?: string;
    bio?: string;
    teachingYears?: number;
    qualifications?: string[];
    verified?: boolean;
    teachingModes?: string[];
    locations?: string[];
  } = {}
): Promise<TestTeacher> {
  const pool = getTestPool();

  const displayName = overrides.displayName ?? '张老师';
  const bio = overrides.bio ?? '我是数学老师，有10年教学经验';
  const teachingYears = overrides.teachingYears ?? 10;
  const qualifications = overrides.qualifications ?? [
    'Bachelor of Education',
    'Math Certification',
  ];
  const verified = overrides.verified ?? false;
  const teachingModes = overrides.teachingModes ?? ['ONLINE', 'OFFLINE'];
  const locations = overrides.locations ?? ['Auckland', 'Wellington'];

  const result = await pool.query(
    `INSERT INTO teachers (id, display_name, bio, teaching_years, qualifications, verified, teaching_modes, locations, average_rating, total_reviews)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 4.5, 10)
     RETURNING id`,
    [userId, displayName, bio, teachingYears, qualifications, verified, teachingModes, locations]
  );

  return {
    id: userId,
    userId,
    displayName,
    bio,
    teachingYears,
    qualifications,
    verified,
    teachingModes,
    locations,
    averageRating: 4.5,
    totalReviews: 10,
  };
}

/**
 * Create a course for testing
 */
export async function createTestCourse(
  teacherId: string,
  overrides: {
    title?: string;
    description?: string;
    category?: string;
    price?: number;
    teachingModes?: string[];
    locations?: string[];
    targetAgeGroups?: string[];
    maxClassSize?: number;
    status?: string;
  } = {}
): Promise<TestCourse> {
  const pool = getTestPool();

  const title = overrides.title ?? 'Math Grade 9-10';
  const description = overrides.description ?? 'High school math tutoring';
  const category = overrides.category ?? 'Mathematics';
  const price = overrides.price ?? 50.0;
  const teachingModes = overrides.teachingModes ?? ['ONLINE', 'OFFLINE'];
  const locations = overrides.locations ?? ['Auckland'];
  const targetAgeGroups = overrides.targetAgeGroups ?? ['13-15'];
  const maxClassSize = overrides.maxClassSize ?? 6;
  const status = overrides.status ?? 'ACTIVE';

  const result = await pool.query(
    `INSERT INTO courses (teacher_id, title, description, category, price, price_type, teaching_modes, locations, target_age_groups, max_class_size, status, average_rating, total_reviews)
     VALUES ($1, $2, $3, $4, $5, 'per_lesson', $6, $7, $8, $9, $10, 4.8, 5)
     RETURNING id`,
    [
      teacherId,
      title,
      description,
      category,
      price,
      teachingModes,
      locations,
      targetAgeGroups,
      maxClassSize,
      status,
    ]
  );

  return {
    id: result.rows[0].id,
    teacherId,
    title,
    description,
    category,
    price,
    teachingModes,
    locations,
    targetAgeGroups,
    maxClassSize,
    status,
    averageRating: 4.8,
  };
}

/**
 * Clean up test user by email
 */
export async function cleanupTestUser(email: string): Promise<void> {
  const pool = getTestPool();
  await pool.query('DELETE FROM users WHERE email LIKE $1', [`%${email}%`]);
}

/**
 * Clean up test data in correct order (respecting foreign keys)
 */
export async function cleanupTestData(): Promise<void> {
  const pool = getTestPool();

  try {
    await pool.query('DELETE FROM role_application_history');
  } catch {
    /* table might not exist */
  }
  try {
    await pool.query('DELETE FROM role_applications');
  } catch {
    /* table might not exist */
  }
  try {
    await pool.query('DELETE FROM sessions');
  } catch {
    /* table might not exist */
  }
  try {
    await pool.query('DELETE FROM verification_codes');
  } catch {
    /* table might not exist */
  }
  try {
    await pool.query('DELETE FROM reviews');
  } catch {
    /* table might not exist */
  }
  try {
    await pool.query('DELETE FROM learning_records');
  } catch {
    /* table might not exist */
  }
  try {
    await pool.query('DELETE FROM children');
  } catch {
    /* table might not exist */
  }
  try {
    await pool.query('DELETE FROM courses');
  } catch {
    /* table might not exist */
  }
  try {
    await pool.query('DELETE FROM teachers');
  } catch {
    /* table might not exist */
  }
  try {
    await pool.query('DELETE FROM users');
  } catch {
    /* table might not exist */
  }
}

/**
 * Generate a unique email for testing
 */
export function generateUniqueEmail(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/**
 * Generate test password
 */
export function generateTestPassword(): string {
  return `SecurePass${Math.random().toString(36).slice(2, 8)}!`;
}

/**
 * Get MailHog API URL
 */
export function getMailHogAPIUrl(): string {
  const ctx = getTestContext();
  if (!ctx) {
    throw new Error('Test containers not started');
  }
  return `http://${ctx.mailhog.host}:${ctx.mailhog.apiPort}`;
}

/**
 * Get SMTP connection string
 */
export function getSMTPConnectionString(): string {
  const ctx = getTestContext();
  if (!ctx) {
    throw new Error('Test containers not started');
  }
  return `smtp://${ctx.mailhog.host}:${ctx.mailhog.smtpPort}`;
}

/**
 * Fetch emails from MailHog
 */
export async function getMailHogEmails(): Promise<any[]> {
  try {
    const response = await fetch(`${getMailHogAPIUrl()}/api/v2/messages`);
    if (!response.ok) {
      throw new Error(`MailHog API error: ${response.status}`);
    }
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Failed to fetch emails from MailHog:', error);
    return [];
  }
}

/**
 * Verify email was sent
 */
export async function verifyEmailSent(
  expectedRecipient: string,
  expectedSubject?: string
): Promise<{ found: boolean; email: any }> {
  const emails = await getMailHogEmails();

  for (const email of emails) {
    const recipients = email.To?.mail || '';
    if (recipients.toLowerCase().includes(expectedRecipient.toLowerCase())) {
      if (!expectedSubject || email.Subject?.includes(expectedSubject)) {
        return { found: true, email };
      }
    }
  }

  return { found: false, email: null };
}

/**
 * Clear all emails from MailHog
 */
export async function clearMailHogEmails(): Promise<void> {
  try {
    const response = await fetch(`${getMailHogAPIUrl()}/api/v1/messages`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to clear emails: ${response.status}`);
    }
  } catch (error) {
    console.warn('Failed to clear MailHog emails:', error);
  }
}

/**
 * Create bulk test users for testing lists/pagination
 */
export async function createBulkTestUsers(
  count: number,
  role: UserRole = UserRole.STUDENT
): Promise<TestUser[]> {
  const users: TestUser[] = [];

  for (let i = 0; i < count; i++) {
    const user = await createTestUser({
      email: `bulk-${i}-${Date.now()}@example.com`,
      role,
    });
    users.push(user);
  }

  return users;
}
