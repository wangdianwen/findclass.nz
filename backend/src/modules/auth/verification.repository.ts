/**
 * Verification Code Repository for PostgreSQL
 * Handles email verification codes with TTL
 */

import type { Pool } from 'pg';
import crypto from 'crypto';
import { logger } from '@core/logger';

export interface VerificationCode {
  id: string;
  email: string;
  code: string;
  type: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

export interface CreateVerificationCodeDTO {
  email: string;
  code: string;
  type: string;
  expires_at: Date;
}

export class VerificationCodeRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Create a new verification code
   */
  async create(data: CreateVerificationCodeDTO): Promise<VerificationCode> {
    const id = crypto.randomUUID();
    const now = new Date();

    const result = await this.pool.query<VerificationCode>(
      `INSERT INTO verification_codes (id, email, code, type, expires_at, used, created_at)
       VALUES ($1, $2, $3, $4, $5, false, $6)
       RETURNING *`,
      [id, data.email.toLowerCase(), data.code, data.type, data.expires_at, now]
    );

    logger.debug('Verification code created', { email: data.email, type: data.type });
    return result.rows[0];
  }

  /**
   * Verify a code and mark it as used
   */
  async verifyAndMarkUsed(
    email: string,
    code: string,
    type: string
  ): Promise<{ valid: boolean; error?: string }> {
    const normalizedEmail = email.toLowerCase();

    // First check if code exists and is valid
    const result = await this.pool.query<VerificationCode>(
      `SELECT * FROM verification_codes
       WHERE email = $1 AND code = $2 AND type = $3 AND used = false
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedEmail, code, type]
    );

    if (result.rows.length === 0) {
      return { valid: false, error: 'Verification code expired or not found' };
    }

    const verification = result.rows[0];

    if (new Date(verification.expires_at) < new Date()) {
      return { valid: false, error: 'Verification code has expired' };
    }

    // Mark as used
    await this.pool.query('UPDATE verification_codes SET used = true WHERE id = $1', [
      verification.id,
    ]);

    logger.info('Verification code validated', { email: normalizedEmail, type });
    return { valid: true };
  }

  /**
   * Get valid verification code (without marking as used)
   */
  async getValidCode(email: string, code: string, type: string): Promise<VerificationCode | null> {
    const normalizedEmail = email.toLowerCase();

    const result = await this.pool.query<VerificationCode>(
      `SELECT * FROM verification_codes
       WHERE email = $1 AND code = $2 AND type = $3 AND used = false
       AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedEmail, code, type]
    );

    return result.rows[0] || null;
  }

  /**
   * Mark a code as used
   */
  async markAsUsed(id: string): Promise<void> {
    await this.pool.query('UPDATE verification_codes SET used = true WHERE id = $1', [id]);
  }

  /**
   * Delete expired codes for an email
   */
  async deleteExpired(email: string): Promise<number> {
    const normalizedEmail = email.toLowerCase();

    const result = await this.pool.query(
      `DELETE FROM verification_codes
       WHERE email = $1 AND (used = true OR expires_at < NOW())`,
      [normalizedEmail]
    );

    return result.rowCount ?? 0;
  }

  /**
   * Delete all codes for an email (used for cleanup)
   */
  async deleteAllForEmail(email: string): Promise<number> {
    const normalizedEmail = email.toLowerCase();

    const result = await this.pool.query('DELETE FROM verification_codes WHERE email = $1', [
      normalizedEmail,
    ]);

    return result.rowCount ?? 0;
  }

  /**
   * Check if there's a recent verification code (rate limiting)
   */
  async hasRecentCode(email: string, type: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase();

    const result = await this.pool.query(
      `SELECT 1 FROM verification_codes
       WHERE email = $1 AND type = $2 AND used = false AND expires_at > NOW()
       LIMIT 1`,
      [normalizedEmail, type]
    );

    return result.rows.length > 0;
  }

  /**
   * Get the latest verification code for an email
   */
  async getLatest(email: string, type: string): Promise<VerificationCode | null> {
    const normalizedEmail = email.toLowerCase();

    const result = await this.pool.query<VerificationCode>(
      `SELECT * FROM verification_codes
       WHERE email = $1 AND type = $2
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedEmail, type]
    );

    return result.rows[0] || null;
  }
}
