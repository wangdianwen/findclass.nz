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
    DYNAMODB_ENDPOINT: 'http://localhost:4566',
    DYNAMODB_TABLE_NAME: 'FindClass-MainTable',
    DYNAMODB_PORT: '8000',
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
    DYNAMODB_ENDPOINT: 'https://dynamodb.ap-southeast-2.amazonaws.com',
    DYNAMODB_TABLE_NAME: 'FindClass-MainTable',
    DYNAMODB_PORT: '443',
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
