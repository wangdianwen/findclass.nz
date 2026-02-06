/**
 * Verification Code Repository Unit Tests
 * Tests for email verification code management
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { Pool } from 'pg';
import { VerificationCodeRepository } from '@modules/auth/verification.repository';

// Mock the logger
vi.mock('@core/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock Pool
const mockPool = {
  query: vi.fn(),
};

describe('VerificationCodeRepository', () => {
  let repository: VerificationCodeRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new VerificationCodeRepository(mockPool as unknown as Pool);
  });

  describe('create', () => {
    it('should create a new verification code', async () => {
      const mockCode = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        code: '123456',
        type: 'email_verification',
        expires_at: new Date('2025-01-01T00:00:00Z'),
        used: false,
        created_at: new Date(),
      };

      (mockPool.query as Mock).mockResolvedValue({ rows: [mockCode] });

      const result = await repository.create({
        email: 'test@example.com',
        code: '123456',
        type: 'email_verification',
        expires_at: new Date('2025-01-01T00:00:00Z'),
      });

      expect(result).toEqual(mockCode);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO verification_codes'),
        expect.arrayContaining([
          expect.any(String), // id
          'test@example.com', // email (lowercase)
          '123456', // code
          'email_verification', // type
        ])
      );
    });

    it('should normalize email to lowercase', async () => {
      const mockCode = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        code: '123456',
        type: 'email_verification',
        expires_at: new Date(),
        used: false,
        created_at: new Date(),
      };

      (mockPool.query as Mock).mockResolvedValue({ rows: [mockCode] });

      await repository.create({
        email: 'Test@Example.COM',
        code: '123456',
        type: 'email_verification',
        expires_at: new Date(),
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['test@example.com'])
      );
    });

    it('should handle different code types', async () => {
      const codeTypes = ['email_verification', 'password_reset', 'phone_verification'];

      for (const type of codeTypes) {
        const mockCode = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          code: '123456',
          type,
          expires_at: new Date(),
          used: false,
          created_at: new Date(),
        };

        (mockPool.query as Mock).mockResolvedValue({ rows: [mockCode] });

        const result = await repository.create({
          email: 'test@example.com',
          code: '123456',
          type,
          expires_at: new Date(),
        });

        expect(result.type).toBe(type);
      }
    });
  });

  describe('verifyAndMarkUsed', () => {
    it('should return valid: true for correct code', async () => {
      const mockCode = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        code: '123456',
        type: 'email_verification',
        expires_at: new Date(Date.now() + 60000), // 1 minute from now
        used: false,
        created_at: new Date(),
      };

      (mockPool.query as Mock).mockResolvedValue({ rows: [mockCode] });

      const result = await repository.verifyAndMarkUsed(
        'test@example.com',
        '123456',
        'email_verification'
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error for non-existent code', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rows: [] });

      const result = await repository.verifyAndMarkUsed(
        'test@example.com',
        '123456',
        'email_verification'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Verification code expired or not found');
    });

    it('should return error for expired code', async () => {
      const mockCode = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        code: '123456',
        type: 'email_verification',
        expires_at: new Date(Date.now() - 60000), // 1 minute ago
        used: false,
        created_at: new Date(),
      };

      (mockPool.query as Mock).mockResolvedValue({ rows: [mockCode] });

      const result = await repository.verifyAndMarkUsed(
        'test@example.com',
        '123456',
        'email_verification'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Verification code has expired');
    });

    it('should mark code as used after verification', async () => {
      const mockCode = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        code: '123456',
        type: 'email_verification',
        expires_at: new Date(Date.now() + 60000),
        used: false,
        created_at: new Date(),
      };

      (mockPool.query as Mock).mockResolvedValue({ rows: [mockCode] });

      await repository.verifyAndMarkUsed('test@example.com', '123456', 'email_verification');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE verification_codes SET used = true'),
        [mockCode.id]
      );
    });

    it('should normalize email to lowercase', async () => {
      const mockCode = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        code: '123456',
        type: 'email_verification',
        expires_at: new Date(Date.now() + 60000),
        used: false,
        created_at: new Date(),
      };

      (mockPool.query as Mock).mockResolvedValue({ rows: [mockCode] });

      await repository.verifyAndMarkUsed('Test@Example.COM', '123456', 'email_verification');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['test@example.com'])
      );
    });
  });

  describe('getValidCode', () => {
    it('should return valid code when found', async () => {
      const mockCode = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        code: '123456',
        type: 'email_verification',
        expires_at: new Date(Date.now() + 60000),
        used: false,
        created_at: new Date(),
      };

      (mockPool.query as Mock).mockResolvedValue({ rows: [mockCode] });

      const result = await repository.getValidCode(
        'test@example.com',
        '123456',
        'email_verification'
      );

      expect(result).toEqual(mockCode);
    });

    it('should return null when code not found', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rows: [] });

      const result = await repository.getValidCode(
        'test@example.com',
        '123456',
        'email_verification'
      );

      expect(result).toBeNull();
    });

    it('should return null for expired code', async () => {
      // The SQL query filters out expired codes with expires_at > NOW()
      // So expired codes will not be returned by the query
      (mockPool.query as Mock).mockResolvedValue({ rows: [] });

      const result = await repository.getValidCode(
        'test@example.com',
        '123456',
        'email_verification'
      );

      expect(result).toBeNull();
    });

    it('should return null for used code', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rows: [] });

      const result = await repository.getValidCode(
        'test@example.com',
        '123456',
        'email_verification'
      );

      expect(result).toBeNull();
    });
  });

  describe('markAsUsed', () => {
    it('should mark code as used', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rows: [] });

      await repository.markAsUsed('550e8400-e29b-41d4-a716-446655440000');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE verification_codes SET used = true'),
        ['550e8400-e29b-41d4-a716-446655440000']
      );
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired codes for an email', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rowCount: 3 });

      const result = await repository.deleteExpired('test@example.com');

      expect(result).toBe(3);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM verification_codes'),
        ['test@example.com']
      );
    });

    it('should return 0 when no expired codes', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rowCount: 0 });

      const result = await repository.deleteExpired('test@example.com');

      expect(result).toBe(0);
    });

    it('should normalize email to lowercase', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rowCount: 1 });

      await repository.deleteExpired('Test@Example.COM');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['test@example.com'])
      );
    });
  });

  describe('deleteAllForEmail', () => {
    it('should delete all codes for an email', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rowCount: 5 });

      const result = await repository.deleteAllForEmail('test@example.com');

      expect(result).toBe(5);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM verification_codes WHERE email = $1'),
        ['test@example.com']
      );
    });

    it('should return 0 when no codes to delete', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rowCount: 0 });

      const result = await repository.deleteAllForEmail('test@example.com');

      expect(result).toBe(0);
    });
  });

  describe('hasRecentCode', () => {
    it('should return true when recent code exists', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rows: [{ 1: 1 }] });

      const result = await repository.hasRecentCode('test@example.com', 'email_verification');

      expect(result).toBe(true);
    });

    it('should return false when no recent code', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rows: [] });

      const result = await repository.hasRecentCode('test@example.com', 'email_verification');

      expect(result).toBe(false);
    });

    it('should normalize email to lowercase', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rows: [] });

      await repository.hasRecentCode('Test@Example.COM', 'password_reset');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['test@example.com'])
      );
    });
  });

  describe('getLatest', () => {
    it('should return latest code for email and type', async () => {
      const mockCode = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        code: '654321',
        type: 'email_verification',
        expires_at: new Date(),
        used: false,
        created_at: new Date(),
      };

      (mockPool.query as Mock).mockResolvedValue({ rows: [mockCode] });

      const result = await repository.getLatest('test@example.com', 'email_verification');

      expect(result).toEqual(mockCode);
    });

    it('should return null when no codes found', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rows: [] });

      const result = await repository.getLatest('test@example.com', 'email_verification');

      expect(result).toBeNull();
    });

    it('should normalize email to lowercase', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rows: [] });

      await repository.getLatest('Test@Example.COM', 'password_reset');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['test@example.com'])
      );
    });
  });

  describe('code type support', () => {
    it('should handle email_verification type', async () => {
      const mockCode = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        code: '123456',
        type: 'email_verification',
        expires_at: new Date(Date.now() + 60000),
        used: false,
        created_at: new Date(),
      };

      (mockPool.query as Mock).mockResolvedValue({ rows: [mockCode] });

      const result = await repository.create({
        email: 'test@example.com',
        code: '123456',
        type: 'email_verification',
        expires_at: new Date(Date.now() + 60000),
      });

      expect(result.type).toBe('email_verification');
    });

    it('should handle password_reset type', async () => {
      const mockCode = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        code: '123456',
        type: 'password_reset',
        expires_at: new Date(Date.now() + 60000),
        used: false,
        created_at: new Date(),
      };

      (mockPool.query as Mock).mockResolvedValue({ rows: [mockCode] });

      const result = await repository.create({
        email: 'test@example.com',
        code: '123456',
        type: 'password_reset',
        expires_at: new Date(Date.now() + 60000),
      });

      expect(result.type).toBe('password_reset');
    });

    it('should handle phone_verification type', async () => {
      const mockCode = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        code: '123456',
        type: 'phone_verification',
        expires_at: new Date(Date.now() + 60000),
        used: false,
        created_at: new Date(),
      };

      (mockPool.query as Mock).mockResolvedValue({ rows: [mockCode] });

      const result = await repository.create({
        email: 'test@example.com',
        code: '123456',
        type: 'phone_verification',
        expires_at: new Date(Date.now() + 60000),
      });

      expect(result.type).toBe('phone_verification');
    });
  });
});
