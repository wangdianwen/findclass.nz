-- Migration: 003_add_missing_course_fields.sql
-- Description: Add missing fields for course details display
-- Created: 2026-02-08
-- PostgreSQL version: 15+

-- ============================================
-- COURSES TABLE ADDITIONS
-- ============================================

-- Lesson count (number of lessons in the course)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS lesson_count INT DEFAULT 12;

-- Course language (english, chinese, bilingual, etc.)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS language VARCHAR(20) DEFAULT 'english';

-- Course schedule days (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS days TEXT[] DEFAULT ARRAY['Sat', 'Sun'];

-- Time slots for the course (e.g., '14:00-16:00')
ALTER TABLE courses ADD COLUMN IF NOT EXISTS time_slots TEXT[] DEFAULT ARRAY['14:00-16:00'];

-- Original price (for discount display)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2);

-- Course tags (for search and categorization)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Course images (gallery URLs)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Course duration in minutes
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration INT DEFAULT 60;

-- ============================================
-- TEACHERS TABLE ADDITIONS
-- ============================================

-- Teacher title/profession (e.g., "Senior Math Teacher")
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS title VARCHAR(100);

-- Teacher avatar URL
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ============================================
-- COURSE CONTACT INFORMATION
-- ============================================

-- Contact phone
ALTER TABLE courses ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);

-- Contact WeChat ID
ALTER TABLE courses ADD COLUMN IF NOT EXISTS contact_wechat VARCHAR(100);

-- Contact email
ALTER TABLE courses ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);

-- WeChat QR code URL
ALTER TABLE courses ADD COLUMN IF NOT EXISTS contact_wechat_qrcode TEXT;

-- Contact visibility flags
ALTER TABLE courses ADD COLUMN IF NOT EXISTS show_contact_phone BOOLEAN DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS show_contact_wechat BOOLEAN DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS show_contact_email BOOLEAN DEFAULT false;

-- ============================================
-- INDEXES FOR NEW FIELDS
-- ============================================

-- Index on language for filtering
CREATE INDEX IF NOT EXISTS idx_courses_language ON courses(language);

-- Index on lesson_count for filtering
CREATE INDEX IF NOT EXISTS idx_courses_lesson_count ON courses(lesson_count);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN courses.lesson_count IS 'Number of lessons in the course';
COMMENT ON COLUMN courses.language IS 'Course language (english, chinese, bilingual, etc.)';
COMMENT ON COLUMN courses.days IS 'Course schedule days (Mon-Sun)';
COMMENT ON COLUMN courses.time_slots IS 'Time slots for the course (e.g., 14:00-16:00)';
COMMENT ON COLUMN courses.original_price IS 'Original price before discount';
COMMENT ON COLUMN courses.tags IS 'Course tags for search and categorization';
COMMENT ON COLUMN courses.images IS 'Course image gallery URLs';
COMMENT ON COLUMN courses.duration IS 'Course duration in minutes';
COMMENT ON COLUMN teachers.title IS 'Teacher title/profession';
COMMENT ON COLUMN teachers.avatar_url IS 'Teacher avatar/profile picture URL';
COMMENT ON COLUMN courses.contact_phone IS 'Contact phone number';
COMMENT ON COLUMN courses.contact_wechat IS 'Contact WeChat ID';
COMMENT ON COLUMN courses.contact_email IS 'Contact email address';
COMMENT ON COLUMN courses.contact_wechat_qrcode IS 'WeChat QR code image URL';
COMMENT ON COLUMN courses.show_contact_phone IS 'Whether to show phone contact';
COMMENT ON COLUMN courses.show_contact_wechat IS 'Whether to show WeChat contact';
COMMENT ON COLUMN courses.show_contact_email IS 'Whether to show email contact';
