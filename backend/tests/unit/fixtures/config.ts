/**
 * Config Test Fixtures
 * Factory functions for creating test config data
 */

import { NodeEnv } from '@config/env-schema';

// Development environment variables
export function createDevEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: NodeEnv.Development,
    PORT: '3000',
    API_VERSION: 'v1',
    FRONTEND_URL: 'http://localhost:3000',
    AWS_REGION: 'ap-southeast-2',
    AWS_ACCESS_KEY_ID: 'local',
    AWS_SECRET_ACCESS_KEY: 'local',
    DATABASE_URL: 'postgresql://findclass:findclass_dev@localhost:5432/findclass',
    JWT_SECRET: 'dev-secret-key-at-least-32-characters-long',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    JWT_ALGORITHM: 'HS256',
    JWT_ISSUER: 'findclass.nz-api',
    BCRYPT_ROUNDS: '10',
    VERIFICATION_CODE_EXPIRES: '600',
    PASSWORD_RESET_EXPIRES: '3600',
    LOG_LEVEL: 'debug',
    LOG_FORMAT: 'json',
    LOG_FILE_PATH: './logs',
    CORS_ORIGIN: 'http://localhost:3000',
    CORS_METHODS: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    CORS_CREDENTIALS: 'true',
    // SMTP configuration
    SMTP_HOST: 'localhost',
    SMTP_PORT: '1025',
    SMTP_API_PORT: '8025',
    SMTP_SECURE: 'false',
    SMTP_USER: '',
    SMTP_PASS: '',
    FROM_EMAIL: 'no-reply@findclass.nz',
    FROM_NAME: 'FindClass NZ',
  };
}

// Production environment variables
export function createProdEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: NodeEnv.Production,
    PORT: '3000',
    API_VERSION: 'v1',
    FRONTEND_URL: 'https://findclass.nz',
    AWS_REGION: 'ap-southeast-2',
    AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
    AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/findclass',
    JWT_SECRET: 'a-very-long-secure-production-secret-key-at-least-64-characters',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    JWT_ALGORITHM: 'HS256',
    JWT_ISSUER: 'findclass.nz-api',
    BCRYPT_ROUNDS: '12',
    VERIFICATION_CODE_EXPIRES: '600',
    PASSWORD_RESET_EXPIRES: '3600',
    LOG_LEVEL: 'info',
    LOG_FORMAT: 'json',
    LOG_FILE_PATH: './logs',
    CORS_ORIGIN: 'https://findclass.nz',
    CORS_METHODS: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    CORS_CREDENTIALS: 'true',
    // SMTP configuration (required for prod)
    SMTP_HOST: 'smtp.sendpulse.com',
    SMTP_PORT: '587',
    SMTP_API_PORT: '8205',
    SMTP_SECURE: 'false',
    SMTP_USER: '',
    SMTP_PASS: '',
    FROM_EMAIL: 'no-reply@findclass.nz',
    FROM_NAME: 'FindClass NZ',
    // S3/SQS (required)
    S3_ENDPOINT: 'https://s3.ap-southeast-2.amazonaws.com',
    S3_BUCKET_UPLOADS: 'findclass-uploads',
    S3_BUCKET_STATIC: 'findclass-static',
    SQS_ENDPOINT: 'https://sqs.ap-southeast-2.amazonaws.com',
    SQS_QUEUE_NOTIFICATIONS: 'findclass-notifications',
    SQS_QUEUE_ANALYTICS: 'findclass-analytics',
    // LocalStack (optional)
    LOCALSTACK_ENDPOINT: 'https://localhost:4566',
    SEED_SAMPLE_DATA: 'false',
    // Rate limits (optional with defaults)
    RATE_LIMIT_WINDOW_MS: '60000',
    RATE_LIMIT_MAX_REQUESTS: '100',
    RATE_LIMIT_MAX_REQUESTS_AUTHENTICATED: '1000',
    RATE_LIMIT_EMAIL_WINDOW: '60',
    RATE_LIMIT_EMAIL_MAX: '1',
    RATE_LIMIT_IP_WINDOW: '3600',
    RATE_LIMIT_IP_MAX: '100',
    RATE_LIMIT_LOCKOUT_SECONDS: '900',
    RATE_LIMIT_MAX_ATTEMPTS: '5',
    // Upload (optional)
    MAX_FILE_SIZE: '5242880',
    UPLOAD_DIR: './uploads',
  };
}

// Invalid environment variables (missing required fields)
export function createInvalidEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'invalid-env',
    PORT: 'invalid',
    JWT_SECRET: 'short',
  };
}

// Test environment variables with custom overrides
export function createCustomEnv(overrides: Partial<NodeJS.ProcessEnv>): NodeJS.ProcessEnv {
  return {
    ...createDevEnv(),
    ...overrides,
  };
}
