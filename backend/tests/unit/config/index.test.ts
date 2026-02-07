/**
 * Config Index Unit Tests
 * Tests for configuration retrieval and validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NodeEnv, envSchema, type AppConfig } from '@config/env-schema';
import { createDevEnv, createProdEnv } from '../fixtures/config';

// Mock dotenv before importing config module
vi.mock('dotenv', () => ({
  default: {
    config: vi.fn().mockReturnValue({ parsed: {} }),
  },
}));

// Mock path module
vi.mock('path', () => ({
  default: {
    resolve: vi.fn().mockReturnValue('/mock/env'),
    join: vi.fn().mockImplementation((...args) => args.join('/')),
  },
  resolve: vi.fn(),
  join: vi.fn(),
}));

describe('Config Module', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('envSchema validation', () => {
    it('should validate development environment', () => {
      const env = createDevEnv();
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe(NodeEnv.Development);
      }
    });

    it('should validate production environment', () => {
      const env = createProdEnv();
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe(NodeEnv.Production);
      }
    });
  });

  describe('configuration structure', () => {
    it('should have all required config sections', () => {
      const env = createDevEnv();
      const parsed = envSchema.parse(env);

      // Build expected config structure
      const config: AppConfig = {
        env: parsed.NODE_ENV,
        port: parsed.PORT,
        apiVersion: parsed.API_VERSION,
        frontendUrl: parsed.FRONTEND_URL,
        auth: {
          bcryptRounds: parsed.BCRYPT_ROUNDS,
          verificationCodeExpires: parsed.VERIFICATION_CODE_EXPIRES,
          passwordResetExpires: parsed.PASSWORD_RESET_EXPIRES,
        },
        aws: {
          region: parsed.AWS_REGION,
          accessKeyId: parsed.AWS_ACCESS_KEY_ID,
          secretAccessKey: parsed.AWS_SECRET_ACCESS_KEY,
        },
        dynamodb: null, // Deprecated: DynamoDB removed
        smtp: {
          host: parsed.SMTP_HOST,
          port: parsed.SMTP_PORT,
          apiPort: parsed.SMTP_API_PORT,
          secure: parsed.SMTP_SECURE,
          user: parsed.SMTP_USER,
          pass: parsed.SMTP_PASS,
          fromEmail: parsed.FROM_EMAIL,
          fromName: parsed.FROM_NAME,
        },
        jwt: {
          secret: parsed.JWT_SECRET,
          expiresIn: parsed.JWT_EXPIRES_IN,
          refreshExpiresIn: parsed.JWT_REFRESH_EXPIRES_IN,
          algorithm: parsed.JWT_ALGORITHM,
          issuer: parsed.JWT_ISSUER,
        },
        cors: {
          origin: parsed.CORS_ORIGIN,
          methods: parsed.CORS_METHODS,
          credentials: parsed.CORS_CREDENTIALS,
        },
        rateLimit: {
          windowMs: parsed.RATE_LIMIT_WINDOW_MS,
          maxRequests: parsed.RATE_LIMIT_MAX_REQUESTS,
          maxRequestsAuthenticated: parsed.RATE_LIMIT_MAX_REQUESTS_AUTHENTICATED,
          emailWindowSeconds: parsed.RATE_LIMIT_EMAIL_WINDOW,
          emailMaxRequests: parsed.RATE_LIMIT_EMAIL_MAX,
          ipWindowSeconds: parsed.RATE_LIMIT_IP_WINDOW,
          ipMaxRequests: parsed.RATE_LIMIT_IP_MAX,
          lockoutSeconds: parsed.RATE_LIMIT_LOCKOUT_SECONDS,
          maxAttemptsBeforeLockout: parsed.RATE_LIMIT_MAX_ATTEMPTS,
        },
        logging: {
          level: parsed.LOG_LEVEL,
          format: parsed.LOG_FORMAT,
          filePath: parsed.LOG_FILE_PATH,
        },
      };

      expect(config).toBeDefined();
      expect(config.env).toBe(NodeEnv.Development);
      expect(config.port).toBe(3000);
      expect(config.auth).toBeDefined();
      expect(config.aws).toBeDefined();
      expect(config.dynamodb).toBeNull(); // DynamoDB removed
      expect(config.smtp).toBeDefined();
      expect(config.jwt).toBeDefined();
      expect(config.cors).toBeDefined();
      expect(config.rateLimit).toBeDefined();
      expect(config.logging).toBeDefined();
    });
  });

  describe('auth config', () => {
    it('should have correct auth configuration', () => {
      const env = createDevEnv();
      const parsed = envSchema.parse(env);

      expect(parsed.BCRYPT_ROUNDS).toBe(10);
      expect(parsed.VERIFICATION_CODE_EXPIRES).toBe(600);
      expect(parsed.PASSWORD_RESET_EXPIRES).toBe(3600);
    });

    it('should respect custom bcrypt rounds', () => {
      const env = { ...createDevEnv(), BCRYPT_ROUNDS: '12' };
      const parsed = envSchema.parse(env);

      expect(parsed.BCRYPT_ROUNDS).toBe(12);
    });
  });

  describe('aws config', () => {
    it('should have correct aws configuration', () => {
      const env = createDevEnv();
      const parsed = envSchema.parse(env);

      expect(parsed.AWS_REGION).toBe('ap-southeast-2');
      expect(parsed.AWS_ACCESS_KEY_ID).toBe('local');
      expect(parsed.AWS_SECRET_ACCESS_KEY).toBe('local');
    });

    it('should use production aws credentials when provided', () => {
      const env = createProdEnv();
      const parsed = envSchema.parse(env);

      expect(parsed.AWS_ACCESS_KEY_ID).toBe('AKIAIOSFODNN7EXAMPLE');
      expect(parsed.AWS_SECRET_ACCESS_KEY).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    });
  });

  describe('jwt config', () => {
    it('should have correct jwt configuration', () => {
      const env = createDevEnv();
      const parsed = envSchema.parse(env);

      expect(parsed.JWT_SECRET).toBeDefined();
      expect(parsed.JWT_EXPIRES_IN).toBe('15m');
      expect(parsed.JWT_REFRESH_EXPIRES_IN).toBe('7d');
      expect(parsed.JWT_ALGORITHM).toBe('HS256');
      expect(parsed.JWT_ISSUER).toBe('findclass.nz-api');
    });

    it('should respect custom jwt settings', () => {
      const env = {
        ...createDevEnv(),
        JWT_EXPIRES_IN: '1h',
        JWT_REFRESH_EXPIRES_IN: '30d',
        JWT_ALGORITHM: 'HS512',
      };
      const parsed = envSchema.parse(env);

      expect(parsed.JWT_EXPIRES_IN).toBe('1h');
      expect(parsed.JWT_REFRESH_EXPIRES_IN).toBe('30d');
      expect(parsed.JWT_ALGORITHM).toBe('HS512');
    });
  });

  describe('cors config', () => {
    it('should have correct cors configuration', () => {
      const env = createDevEnv();
      const parsed = envSchema.parse(env);

      expect(parsed.CORS_ORIGIN).toBe('http://localhost:3000');
      expect(parsed.CORS_METHODS).toBe('GET,POST,PUT,DELETE,PATCH,OPTIONS');
      expect(parsed.CORS_CREDENTIALS).toBe(true);
    });
  });

  describe('rate limit config', () => {
    it('should have correct rate limit configuration', () => {
      const env = createDevEnv();
      const parsed = envSchema.parse(env);

      expect(parsed.RATE_LIMIT_WINDOW_MS).toBe(60000);
      expect(parsed.RATE_LIMIT_MAX_REQUESTS).toBe(100);
      expect(parsed.RATE_LIMIT_MAX_REQUESTS_AUTHENTICATED).toBe(1000);
    });
  });

  describe('logging config', () => {
    it('should have correct logging configuration', () => {
      const env = createDevEnv();
      const parsed = envSchema.parse(env);

      expect(parsed.LOG_LEVEL).toBe('debug');
      expect(parsed.LOG_FORMAT).toBe('json');
      expect(parsed.LOG_FILE_PATH).toBe('./logs');
    });
  });

  describe('smtp config', () => {
    it('should have correct smtp configuration', () => {
      const env = createDevEnv();
      const parsed = envSchema.parse(env);

      expect(parsed.SMTP_HOST).toBe('localhost');
      expect(parsed.SMTP_PORT).toBe(1025);
      expect(parsed.SMTP_API_PORT).toBe(8025);
      expect(parsed.SMTP_SECURE).toBe(false);
      expect(parsed.FROM_EMAIL).toBe('no-reply@findclass.nz');
      expect(parsed.FROM_NAME).toBe('FindClass NZ');
    });
  });
});
