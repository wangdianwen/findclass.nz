/**
 * Session Repository Unit Tests
 * Tests for JWT token blacklisting (sessions table)
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { Pool } from 'pg';
import { SessionRepository, hashToken } from '@modules/auth/session.repository';

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

describe('SessionRepository', () => {
  let repository: SessionRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new SessionRepository(mockPool as unknown as Pool);
  });

  describe('create', () => {
    it('should create a new session with correct parameters', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: 'usr_test123',
        token_jti: 'test-jti-123',
        token_hash: 'hashedtoken',
        expires_at: new Date('2025-01-01T00:00:00Z'),
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        status: 'ACTIVE',
        last_activity_at: new Date(),
        created_at: new Date(),
      };

      (mockPool.query as Mock).mockResolvedValue({ rows: [mockSession] });

      const result = await repository.create({
        user_id: 'usr_test123',
        token_jti: 'test-jti-123',
        token_hash: 'hashedtoken',
        expires_at: new Date('2025-01-01T00:00:00Z'),
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
      });

      expect(result).toEqual(mockSession);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sessions'),
        expect.arrayContaining([
          expect.any(String), // id
          'usr_test123', // user_id
          'test-jti-123', // token_jti
          'hashedtoken', // token_hash
        ])
      );
    });

    it('should handle missing optional fields', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: 'usr_test123',
        token_jti: 'test-jti-456',
        token_hash: 'hashedtoken',
        expires_at: new Date('2025-01-01T00:00:00Z'),
        status: 'ACTIVE',
        created_at: new Date(),
      };

      (mockPool.query as Mock).mockResolvedValue({ rows: [mockSession] });

      const result = await repository.create({
        user_id: 'usr_test123',
        token_jti: 'test-jti-456',
        token_hash: 'hashedtoken',
        expires_at: new Date('2025-01-01T00:00:00Z'),
      });

      expect(result).toEqual(mockSession);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sessions'),
        expect.arrayContaining([null, null]) // ip_address and user_agent should be null
      );
    });
  });

  describe('addToBlacklist', () => {
    it('should update existing session to REVOKED status', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rows: [{ id: 'existing-id' }] });

      await repository.addToBlacklist(
        'test-jti',
        'usr_test123',
        'tokenhash',
        new Date('2025-01-01T00:00:00Z')
      );

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE sessions SET status = 'REVOKED'"),
        ['test-jti']
      );
    });

    it('should insert new record when session does not exist', async () => {
      (mockPool.query as Mock)
        .mockResolvedValueOnce({ rows: [] }) // update query returns no rows
        .mockResolvedValueOnce({ rows: [] }); // insert query

      await repository.addToBlacklist(
        'new-jti',
        'usr_test123',
        'tokenhash',
        new Date('2025-01-01T00:00:00Z')
      );

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sessions'),
        expect.arrayContaining(['new-jti', 'usr_test123', 'REVOKED'])
      );
    });
  });

  describe('isBlacklisted', () => {
    it('should return true for blacklisted token', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rows: [{ 1: 1 }] });

      const result = await repository.isBlacklisted('blacklisted-jti');

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE token_jti = $1'), [
        'blacklisted-jti',
      ]);
    });

    it('should return false for non-blacklisted token', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rows: [] });

      const result = await repository.isBlacklisted('valid-jti');

      expect(result).toBe(false);
    });

    it('should return false for empty jti', async () => {
      const result = await repository.isBlacklisted('');

      expect(result).toBe(false);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should return false for undefined jti', async () => {
      const result = await repository.isBlacklisted(undefined as unknown as string);

      expect(result).toBe(false);
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('findByJti', () => {
    it('should return session when found', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: 'usr_test123',
        token_jti: 'test-jti',
        token_hash: 'hash',
        expires_at: new Date(),
        status: 'ACTIVE',
        created_at: new Date(),
      };

      (mockPool.query as Mock).mockResolvedValue({ rows: [mockSession] });

      const result = await repository.findByJti('test-jti');

      expect(result).toEqual(mockSession);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM sessions'),
        ['test-jti']
      );
    });

    it('should return null when session not found', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rows: [] });

      const result = await repository.findByJti('nonexistent-jti');

      expect(result).toBeNull();
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all active sessions for a user', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rowCount: 5 });

      const result = await repository.revokeAllUserSessions('usr_test123');

      expect(result).toBe(5);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'REVOKED'"),
        ['usr_test123']
      );
    });

    it('should return 0 when no sessions to revoke', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rowCount: 0 });

      const result = await repository.revokeAllUserSessions('usr_test123');

      expect(result).toBe(0);
    });
  });

  describe('cleanupExpired', () => {
    it('should delete all expired sessions', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rowCount: 10 });

      const result = await repository.cleanupExpired();

      expect(result).toBe(10);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sessions WHERE expires_at < NOW()')
      );
    });

    it('should return 0 when no expired sessions', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rowCount: 0 });

      const result = await repository.cleanupExpired();

      expect(result).toBe(0);
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions for a user', async () => {
      const mockSessions = [
        { id: '1', user_id: 'usr_test123', status: 'ACTIVE' },
        { id: '2', user_id: 'usr_test123', status: 'ACTIVE' },
      ];

      (mockPool.query as Mock).mockResolvedValue({ rows: mockSessions });

      const result = await repository.getActiveSessions('usr_test123');

      expect(result).toEqual(mockSessions);
      expect(result.length).toBe(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'ACTIVE' AND expires_at > NOW()"),
        ['usr_test123']
      );
    });

    it('should return empty array when no active sessions', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rows: [] });

      const result = await repository.getActiveSessions('usr_test123');

      expect(result).toEqual([]);
    });
  });

  describe('revokeSession', () => {
    it('should revoke a specific session', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rowCount: 1 });

      const result = await repository.revokeSession('session-123');

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'REVOKED'"),
        ['session-123']
      );
    });

    it('should return false when session not found', async () => {
      (mockPool.query as Mock).mockResolvedValue({ rowCount: 0 });

      const result = await repository.revokeSession('nonexistent-session');

      expect(result).toBe(false);
    });
  });
});

describe('hashToken', () => {
  it('should produce consistent hash for same input', () => {
    const token = 'test-jwt-token';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);

    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = hashToken('token-1');
    const hash2 = hashToken('token-2');

    expect(hash1).not.toBe(hash2);
  });

  it('should produce 64-character hex hash (SHA256)', () => {
    const hash = hashToken('test-token');

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should handle empty string', () => {
    const hash = hashToken('');

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
