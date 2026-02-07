-- Migration: 002_social_login_support.sql
-- Description: Add social login support to users table
-- Created: 2026-02-07

-- Add provider_id and provider_type columns for social login
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_type VARCHAR(50);

-- Create index for faster lookups by provider_id
CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users(provider_id);

-- Comment on new columns
COMMENT ON COLUMN users.provider_id IS 'Social login provider unique identifier (e.g., google:xxx, wechat:xxx)';
COMMENT ON COLUMN users.provider_type IS 'Social login provider type (google, wechat)';
