/**
 * PostgreSQL Schema Initialization
 * Creates all tables and indexes for the application
 */

import { query } from './client';
import { logger } from '../../../core/logger';

export async function initializeSchema(): Promise<void> {
  logger.info('Initializing PostgreSQL schema...');

  // Enable UUID extension
  await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Create enums
  await query(`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('PARENT', 'STUDENT', 'TEACHER', 'INSTITUTION', 'ADMIN');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await query(`
    DO $$ BEGIN
      CREATE TYPE user_status AS ENUM ('ACTIVE', 'PENDING_PARENTAL_CONSENT', 'DISABLED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await query(`
    DO $$ BEGIN
      CREATE TYPE trust_level AS ENUM ('S', 'A', 'B', 'C', 'D');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await query(`
    DO $$ BEGIN
      CREATE TYPE verification_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await query(`
    DO $$ BEGIN
      CREATE TYPE course_status AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await query(`
    DO $$ BEGIN
      CREATE TYPE review_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await query(`
    DO $$ BEGIN
      CREATE TYPE application_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await query(`
    DO $$ BEGIN
      CREATE TYPE session_status AS ENUM ('ACTIVE', 'REVOKED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await query(`
    DO $$ BEGIN
      CREATE TYPE teaching_mode AS ENUM ('ONLINE', 'OFFLINE', 'BOTH');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await query(`
    DO $$ BEGIN
      CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(50),
      avatar_url VARCHAR(500),
      role user_role DEFAULT 'STUDENT',
      status user_status DEFAULT 'PENDING_PARENTAL_CONSENT',
      language VARCHAR(10) DEFAULT 'zh',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create teachers table (1:1 with users)
  await query(`
    CREATE TABLE IF NOT EXISTS teachers (
      id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      display_name VARCHAR(100),
      bio TEXT,
      teaching_years INT DEFAULT 0,
      qualifications TEXT[],
      verified BOOLEAN DEFAULT FALSE,
      verification_status verification_status DEFAULT 'PENDING',
      teaching_modes teaching_mode[],
      locations TEXT[],
      average_rating DECIMAL(2,1) DEFAULT 0,
      total_reviews INT DEFAULT 0,
      total_students INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create courses table
  await query(`
    CREATE TABLE IF NOT EXISTS courses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      subcategory VARCHAR(100),
      price DECIMAL(10,2),
      price_type VARCHAR(50),
      teaching_modes teaching_mode[],
      locations TEXT[],
      target_age_groups TEXT[],
      max_class_size INT DEFAULT 1,
      current_enrollment INT DEFAULT 0,
      source_type VARCHAR(50),
      source_url VARCHAR(500),
      quality_score INT DEFAULT 0,
      trust_level trust_level DEFAULT 'C',
      average_rating DECIMAL(2,1) DEFAULT 0,
      total_reviews INT DEFAULT 0,
      status course_status DEFAULT 'ACTIVE',
      published_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create reviews table
  await query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
      teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
      booking_id VARCHAR(100),
      overall_rating DECIMAL(2,1) NOT NULL,
      teaching_rating DECIMAL(2,1),
      course_rating DECIMAL(2,1),
      communication_rating DECIMAL(2,1),
      punctuality_rating DECIMAL(2,1),
      title VARCHAR(200),
      content TEXT,
      status review_status DEFAULT 'PENDING',
      helpful_count INT DEFAULT 0,
      reply_content TEXT,
      reply_created_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create children table
  await query(`
    CREATE TABLE IF NOT EXISTS children (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      date_of_birth DATE,
      gender gender,
      school VARCHAR(200),
      grade VARCHAR(50),
      subjects TEXT[],
      learning_goals TEXT[],
      has_consent BOOLEAN DEFAULT FALSE,
      consent_date TIMESTAMPTZ,
      consent_method VARCHAR(100),
      status VARCHAR(20) DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create learning_records table
  await query(`
    CREATE TABLE IF NOT EXISTS learning_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
      lesson_id VARCHAR(100),
      type VARCHAR(50) NOT NULL,
      duration INT DEFAULT 0,
      progress INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'NOT_STARTED',
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create role_applications table
  await query(`
    CREATE TABLE IF NOT EXISTS role_applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL,
      status application_status DEFAULT 'PENDING',
      applied_at TIMESTAMPTZ DEFAULT NOW(),
      reviewed_by UUID REFERENCES users(id),
      reviewed_at TIMESTAMPTZ,
      review_notes TEXT
    )
  `);

  // Create sessions table (for token blacklist)
  await query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      token_jti VARCHAR(100) UNIQUE NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      ip_address VARCHAR(50),
      user_agent TEXT,
      status session_status DEFAULT 'ACTIVE',
      last_activity_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create verification_codes table
  await query(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL,
      code VARCHAR(10) NOT NULL,
      type VARCHAR(50) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create rate_limits table
  await query(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key_type VARCHAR(50) NOT NULL,
      key_value VARCHAR(255) NOT NULL,
      count INT DEFAULT 1,
      limit_count INT NOT NULL,
      window_seconds INT NOT NULL,
      reset_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(key_type, key_value)
    )
  `);

  // Create inquiries table
  await query(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      user_name VARCHAR(100),
      user_email VARCHAR(255),
      user_phone VARCHAR(50),
      target_type VARCHAR(50) NOT NULL,
      target_id UUID,
      subject VARCHAR(200),
      message TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'PENDING',
      reply_content TEXT,
      replied_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create reports table
  await query(`
    CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      user_name VARCHAR(100),
      user_email VARCHAR(255),
      target_type VARCHAR(50) NOT NULL,
      target_id VARCHAR(255) NOT NULL,
      reason VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'PENDING',
      admin_notes TEXT,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create indexes
  await createIndexes();

  logger.info('PostgreSQL schema initialized successfully');
}

async function createIndexes(): Promise<void> {
  // Users indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`);

  // Teachers indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_teachers_verified ON teachers(verified)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_teachers_rating ON teachers(average_rating DESC)`);

  // Courses indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_courses_price ON courses(price)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_courses_rating ON courses(average_rating DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_courses_trust ON courses(trust_level)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_courses_created ON courses(created_at DESC)`);

  // Full-text search index for courses
  await query(`
    CREATE INDEX IF NOT EXISTS idx_courses_search
    ON courses USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')))
  `);

  // Reviews indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_reviews_course ON reviews(course_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_reviews_teacher ON reviews(teacher_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(overall_rating DESC)`);

  // Children indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_children_user ON children(user_id)`);

  // Learning records indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_learning_records_user ON learning_records(user_id)`);
  await query(
    `CREATE INDEX IF NOT EXISTS idx_learning_records_course ON learning_records(course_id)`
  );

  // Role applications indexes
  await query(
    `CREATE INDEX IF NOT EXISTS idx_role_applications_user ON role_applications(user_id)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_role_applications_status ON role_applications(status)`
  );

  // Sessions indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sessions_token_jti ON sessions(token_jti)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`);

  // Verification codes indexes
  await query(
    `CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at)`
  );

  // Rate limits indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at)`);

  // Inquiries indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_inquiries_user ON inquiries(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status)`);
  await query(
    `CREATE INDEX IF NOT EXISTS idx_inquiries_target ON inquiries(target_type, target_id)`
  );
  await query(`CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at DESC)`);

  // Reports indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_reports_reason ON reports(reason)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC)`);

  logger.info('Database indexes created');
}

/**
 * Drop all tables (for testing purposes)
 */
export async function dropAllTables(): Promise<void> {
  logger.warn('Dropping all tables...');

  await query('DROP TABLE IF EXISTS reports CASCADE');
  await query('DROP TABLE IF EXISTS inquiries CASCADE');
  await query('DROP TABLE IF EXISTS rate_limits CASCADE');
  await query('DROP TABLE IF EXISTS verification_codes CASCADE');
  await query('DROP TABLE IF EXISTS sessions CASCADE');
  await query('DROP TABLE IF EXISTS role_applications CASCADE');
  await query('DROP TABLE IF EXISTS learning_records CASCADE');
  await query('DROP TABLE IF EXISTS reviews CASCADE');
  await query('DROP TABLE IF EXISTS children CASCADE');
  await query('DROP TABLE IF EXISTS courses CASCADE');
  await query('DROP TABLE IF EXISTS teachers CASCADE');
  await query('DROP TABLE IF EXISTS users CASCADE');

  logger.info('All tables dropped');
}

/**
 * Truncate all tables (for testing purposes)
 */
export async function truncateAllTables(): Promise<void> {
  logger.info('Truncating all tables...');

  const tables = [
    'reports',
    'inquiries',
    'rate_limits',
    'verification_codes',
    'sessions',
    'role_applications',
    'learning_records',
    'reviews',
    'children',
    'courses',
    'teachers',
    'users',
  ];

  for (const table of tables) {
    await query(`TRUNCATE TABLE ${table} CASCADE`);
  }

  logger.info('All tables truncated');
}
