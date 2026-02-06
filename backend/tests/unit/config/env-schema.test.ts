/**
 * Env Schema Unit Tests
 * Tests for Zod validation and type inference
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { envSchema, NodeEnv, type RawEnv } from '../../../src/config/env-schema';
import { createDevEnv, createProdEnv, createInvalidEnv, createCustomEnv } from '../fixtures/config';

describe('NodeEnv Enum', () => {
  describe('values', () => {
    it('should have correct development value', () => {
      expect(NodeEnv.Development).toBe('development');
    });

    it('should have correct production value', () => {
      expect(NodeEnv.Production).toBe('production');
    });

    it('should have correct test value', () => {
      expect(NodeEnv.Test).toBe('test');
    });
  });

  describe('type safety', () => {
    it('should accept all valid environments', () => {
      const validEnvs = [NodeEnv.Development, NodeEnv.Production, NodeEnv.Test];
      expect(validEnvs).toHaveLength(3);
    });
  });
});

describe('envSchema', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('valid environments', () => {
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

    it('should use default values when provided', () => {
      const env = createDevEnv();
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe(NodeEnv.Development);
        expect(result.data.PORT).toBe(3000);
        expect(result.data.API_VERSION).toBe('v1');
      }
    });
  });

  describe('validation errors', () => {
    it('should fail for invalid NODE_ENV', () => {
      const env = createInvalidEnv();
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = result.error.format();
        expect(formatted.NODE_ENV?._errors).toBeDefined();
        expect(formatted.NODE_ENV?._errors?.length).toBeGreaterThan(0);
      }
    });

    it('should fail for invalid PORT', () => {
      const env = createCustomEnv({ PORT: 'not-a-number' });
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = result.error.format();
        expect(formatted.PORT?._errors).toBeDefined();
      }
    });

    it('should fail for short JWT_SECRET', () => {
      const env = createCustomEnv({ JWT_SECRET: 'short' });
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = result.error.format();
        expect(formatted.JWT_SECRET?._errors).toBeDefined();
      }
    });

    it('should fail for invalid email format', () => {
      const env = createCustomEnv({ FROM_EMAIL: 'not-an-email' });
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = result.error.format();
        expect(formatted.FROM_EMAIL?._errors).toBeDefined();
      }
    });
  });

  describe('type coercion', () => {
    it('should coerce string numbers to actual numbers', () => {
      const env = createCustomEnv({ PORT: '4000', BCRYPT_ROUNDS: '12' });
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe(4000);
        expect(result.data.BCRYPT_ROUNDS).toBe(12);
      }
    });

    it('should coerce boolean strings', () => {
      const env = createCustomEnv({ CORS_CREDENTIALS: 'false', SEED_SAMPLE_DATA: 'true' });
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.CORS_CREDENTIALS).toBe(false);
        expect(result.data.SEED_SAMPLE_DATA).toBe(true);
      }
    });
  });

  describe('AWS configuration', () => {
    it('should accept valid AWS region', () => {
      const env = createCustomEnv({ AWS_REGION: 'us-east-1' });
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.AWS_REGION).toBe('us-east-1');
      }
    });

    it('should accept localhost DynamoDB endpoint for development', () => {
      const env = createCustomEnv({ DYNAMODB_ENDPOINT: 'http://localhost:4566' });
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DYNAMODB_ENDPOINT).toBe('http://localhost:4566');
      }
    });
  });

  describe('JWT configuration', () => {
    it('should accept HS256 algorithm', () => {
      const env = createCustomEnv({ JWT_ALGORITHM: 'HS256' });
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.JWT_ALGORITHM).toBe('HS256');
      }
    });

    it('should accept HS384 algorithm', () => {
      const env = createCustomEnv({ JWT_ALGORITHM: 'HS384' });
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.JWT_ALGORITHM).toBe('HS384');
      }
    });

    it('should accept HS512 algorithm', () => {
      const env = createCustomEnv({ JWT_ALGORITHM: 'HS512' });
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.JWT_ALGORITHM).toBe('HS512');
      }
    });

    it('should reject invalid algorithm', () => {
      const env = createCustomEnv({ JWT_ALGORITHM: 'RS256' });
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(false);
    });
  });

  describe('rate limit configuration', () => {
    it('should accept valid rate limit values', () => {
      const env = createCustomEnv({
        RATE_LIMIT_WINDOW_MS: '60000',
        RATE_LIMIT_MAX_REQUESTS: '100',
        RATE_LIMIT_EMAIL_WINDOW: '60',
        RATE_LIMIT_EMAIL_MAX: '5',
      });
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.RATE_LIMIT_WINDOW_MS).toBe(60000);
        expect(result.data.RATE_LIMIT_MAX_REQUESTS).toBe(100);
        expect(result.data.RATE_LIMIT_EMAIL_WINDOW).toBe(60);
        expect(result.data.RATE_LIMIT_EMAIL_MAX).toBe(5);
      }
    });
  });

  describe('SMTP configuration', () => {
    it('should accept valid SMTP settings', () => {
      const env = createCustomEnv({
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',
        SMTP_USER: 'user',
        SMTP_PASS: 'pass',
        FROM_EMAIL: 'no-reply@example.com',
        FROM_NAME: 'Test Service',
      });
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.SMTP_HOST).toBe('smtp.example.com');
        expect(result.data.SMTP_PORT).toBe(587);
        expect(result.data.FROM_EMAIL).toBe('no-reply@example.com');
      }
    });
  });

  describe('CORS configuration', () => {
    it('should accept wildcard origin in development', () => {
      const env = createCustomEnv({ CORS_ORIGIN: '*' });
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.CORS_ORIGIN).toBe('*');
      }
    });

    it('should accept multiple CORS methods', () => {
      const env = createCustomEnv({ CORS_METHODS: 'GET,POST,PUT,DELETE,OPTIONS' });
      const result = envSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.CORS_METHODS).toBe('GET,POST,PUT,DELETE,OPTIONS');
      }
    });
  });
});

describe('RawEnv Type Inference', () => {
  it('should correctly infer all fields', () => {
    const env = createDevEnv();
    const result = envSchema.parse(env);

    // Verify type inference works correctly
    const typedEnv = result as RawEnv;

    expect(typedEnv.NODE_ENV).toBe(NodeEnv.Development);
    expect(typedEnv.PORT).toBe(3000);
    expect(typedEnv.AWS_REGION).toBe('ap-southeast-2');
    expect(typeof typedEnv.JWT_SECRET).toBe('string');
  });
});
