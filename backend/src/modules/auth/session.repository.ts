/**
 * Session Repository for PostgreSQL
 * Handles token blacklist (sessions table)
 */

import type { Pool } from 'pg';
import crypto from 'crypto';
import { logger } from '@core/logger';

export interface Session {
  id: string;
  user_id: string;
  token_jti: string;
  token_hash: string;
  expires_at: Date;
  ip_address?: string;
  user_agent?: string;
  status: 'ACTIVE' | 'REVOKED';
  last_activity_at?: Date;
  created_at: Date;
}

export interface CreateSessionDTO {
  user_id: string;
  token_jti: string;
  token_hash: string;
  expires_at: Date;
  ip_address?: string;
  user_agent?: string;
}

export class SessionRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Create a new session (for token blacklist)
   */
  async create(data: CreateSessionDTO): Promise<Session> {
    const id = crypto.randomUUID();
    const now = new Date();

    const result = await this.pool.query<Session>(
      `INSERT INTO sessions (id, user_id, token_jti, token_hash, expires_at, ip_address, user_agent, status, last_activity_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        data.user_id,
        data.token_jti,
        data.token_hash,
        data.expires_at,
        data.ip_address || null,
        data.user_agent || null,
        'ACTIVE',
        now,
        now,
      ]
    );

    logger.debug('Session created', { sessionId: id, userId: data.user_id });
    return result.rows[0];
  }

  /**
   * Add token to blacklist (revoke session)
   */
  async addToBlacklist(
    jti: string,
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date();

    // First try to update if exists
    const updateResult = await this.pool.query(
      `UPDATE sessions SET status = 'REVOKED' WHERE token_jti = $1 RETURNING id`,
      [jti]
    );

    if (updateResult.rows.length === 0) {
      // Insert new record
      await this.pool.query(
        `INSERT INTO sessions (id, user_id, token_jti, token_hash, expires_at, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, userId, jti, tokenHash, expiresAt, 'REVOKED', now]
      );
    }

    logger.info('Token added to blacklist', { jti, userId });
  }

  /**
   * Check if token is blacklisted
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    if (!jti) return false;

    const result = await this.pool.query(
      `SELECT 1 FROM sessions
       WHERE token_jti = $1
       AND status = 'REVOKED'
       AND expires_at > NOW()
       LIMIT 1`,
      [jti]
    );

    return result.rows.length > 0;
  }

  /**
   * Find session by JTI
   */
  async findByJti(jti: string): Promise<Session | null> {
    const result = await this.pool.query<Session>('SELECT * FROM sessions WHERE token_jti = $1', [
      jti,
    ]);
    return result.rows[0] || null;
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await this.pool.query(
      `UPDATE sessions
       SET status = 'REVOKED', last_activity_at = NOW()
       WHERE user_id = $1 AND status = 'ACTIVE'`,
      [userId]
    );

    logger.info('All sessions revoked for user', { userId, count: result.rowCount });
    return result.rowCount ?? 0;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.pool.query('DELETE FROM sessions WHERE expires_at < NOW()');

    logger.info('Cleaned up expired sessions', { count: result.rowCount });
    return result.rowCount ?? 0;
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId: string): Promise<Session[]> {
    const result = await this.pool.query<Session>(
      `SELECT * FROM sessions
       WHERE user_id = $1 AND status = 'ACTIVE' AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE sessions SET status = 'REVOKED', last_activity_at = NOW() WHERE id = $1`,
      [sessionId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

/**
 * Generate a hash for storing token in blacklist
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
