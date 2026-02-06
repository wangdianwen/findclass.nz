-- Migration: 001_initial_schema.sql
-- Description: Initial PostgreSQL schema for FindClass.nz
-- Created: 2026-02-07
-- PostgreSQL version: 15+

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

-- User roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('PARENT', 'STUDENT', 'TEACHER', 'INSTITUTION', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User status
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('ACTIVE', 'PENDING_PARENTAL_CONSENT', 'DISABLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Trust level for courses and teachers
DO $$ BEGIN
    CREATE TYPE trust_level AS ENUM ('S', 'A', 'B', 'C', 'D');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Verification status
DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Course status
DO $$ BEGIN
    CREATE TYPE course_status AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Review status
DO $$ BEGIN
    CREATE TYPE review_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Application status for role applications
DO $$ BEGIN
    CREATE TYPE application_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Session status for token blacklist
DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('ACTIVE', 'REVOKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Teaching mode
DO $$ BEGIN
    CREATE TYPE teaching_mode AS ENUM ('ONLINE', 'OFFLINE', 'BOTH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Gender
DO $$ BEGIN
    CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Learning record type
DO $$ BEGIN
    CREATE TYPE learning_record_type AS ENUM (
        'COURSE_START',
        'COURSE_COMPLETE',
        'LESSON_COMPLETE',
        'QUIZ_COMPLETE',
        'VIDEO_WATCH',
        'ASSIGNMENT_SUBMIT',
        'NOTES_CREATE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Progress status
DO $$ BEGIN
    CREATE TYPE progress_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABLES
-- ============================================

-- Users table
-- Core user table with authentication and profile information
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
);

-- Teachers table
-- 1:1 relationship with users, stores teacher-specific profile data
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
);

-- Courses table
-- Stores course information created by teachers
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
);

-- Reviews table
-- Stores reviews for courses and teachers
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
);

-- Children table
-- Stores child/student information linked to parent accounts
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
);

-- Learning records table
-- Tracks learning progress and activities for users
CREATE TABLE IF NOT EXISTS learning_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id VARCHAR(100),
    type learning_record_type NOT NULL,
    duration INT DEFAULT 0,
    progress INT DEFAULT 0,
    status progress_status DEFAULT 'NOT_STARTED',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table (token blacklist)
-- Stores JWT tokens for logout/token invalidation
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
);

-- Verification codes table
-- Stores verification codes for email authentication
CREATE TABLE IF NOT EXISTS verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    type VARCHAR(50) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role applications table
-- Tracks user applications for role upgrades (e.g., student -> teacher)
CREATE TABLE IF NOT EXISTS role_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    reason TEXT,
    status application_status DEFAULT 'PENDING',
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role application history table
-- Audit log for role application status changes
CREATE TABLE IF NOT EXISTS role_application_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES role_applications(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    performed_by UUID REFERENCES users(id),
    performed_by_name VARCHAR(100),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Teachers indexes
CREATE INDEX IF NOT EXISTS idx_teachers_verified ON teachers(verified);
CREATE INDEX IF NOT EXISTS idx_teachers_verification_status ON teachers(verification_status);
CREATE INDEX IF NOT EXISTS idx_teachers_rating ON teachers(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_teachers_created_at ON teachers(created_at DESC);

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_price ON courses(price);
CREATE INDEX IF NOT EXISTS idx_courses_rating ON courses(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_courses_trust_level ON courses(trust_level);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_published_at ON courses(published_at DESC);

-- Full-text search index for courses (English)
CREATE INDEX IF NOT EXISTS idx_courses_search_english
ON courses USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Full-text search index for courses (Chinese)
CREATE INDEX IF NOT EXISTS idx_courses_search_chinese
ON courses USING gin(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_course_id ON reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_teacher_id ON reviews(teacher_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_overall_rating ON reviews(overall_rating DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Children indexes
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_children_status ON children(status);
CREATE INDEX IF NOT EXISTS idx_children_grade ON children(grade);

-- Learning records indexes
CREATE INDEX IF NOT EXISTS idx_learning_records_user_id ON learning_records(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_course_id ON learning_records(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_type ON learning_records(type);
CREATE INDEX IF NOT EXISTS idx_learning_records_status ON learning_records(status);
CREATE INDEX IF NOT EXISTS idx_learning_records_created_at ON learning_records(created_at DESC);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_jti ON sessions(token_jti);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);

-- Verification codes indexes
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_codes_type ON verification_codes(type);

-- Role applications indexes
CREATE INDEX IF NOT EXISTS idx_role_applications_user_id ON role_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_role_applications_status ON role_applications(status);
CREATE INDEX IF NOT EXISTS idx_role_applications_role ON role_applications(role);
CREATE INDEX IF NOT EXISTS idx_role_applications_applied_at ON role_applications(applied_at DESC);

-- Role application history indexes
CREATE INDEX IF NOT EXISTS idx_role_application_history_application_id ON role_application_history(application_id);
CREATE INDEX IF NOT EXISTS idx_role_application_history_action ON role_application_history(action);
CREATE INDEX IF NOT EXISTS idx_role_application_history_performed_by ON role_application_history(performed_by);
CREATE INDEX IF NOT EXISTS idx_role_application_history_created_at ON role_application_history(created_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TRIGGERS
-- ============================================

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at
    BEFORE UPDATE ON teachers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_children_updated_at
    BEFORE UPDATE ON children
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_records_updated_at
    BEFORE UPDATE ON learning_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_applications_updated_at
    BEFORE UPDATE ON role_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'Core user table with authentication and profile information';
COMMENT ON TABLE teachers IS 'Teacher-specific profile data (1:1 with users)';
COMMENT ON TABLE courses IS 'Course information created by teachers';
COMMENT ON TABLE reviews IS 'Reviews for courses and teachers';
COMMENT ON TABLE children IS 'Child/student information linked to parent accounts';
COMMENT ON TABLE learning_records IS 'Learning progress and activities tracking';
COMMENT ON TABLE sessions IS 'JWT token blacklist for logout functionality';
COMMENT ON TABLE verification_codes IS 'Email verification codes';
COMMENT ON TABLE role_applications IS 'User applications for role upgrades';
COMMENT ON TABLE role_application_history IS 'Audit log for role application status changes';

COMMENT ON COLUMN users.password_hash IS 'Bcrypt hash of user password';
COMMENT ON COLUMN users.status IS 'PENDING_PARENTAL_CONSENT requires guardian approval for students under 16';
COMMENT ON COLUMN courses.trust_level IS 'Course quality trust level (S=A highest, D=lowest)';
COMMENT ON COLUMN sessions.token_jti IS 'JWT ID claim for token identification in blacklist';
