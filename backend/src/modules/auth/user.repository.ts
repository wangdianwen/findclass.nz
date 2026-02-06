/**
 * User Repository for PostgreSQL
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import { UserStatus, UserRole } from '@shared/types';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  status: UserStatus;
  language: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDTO {
  email: string;
  password_hash: string;
  name: string;
  phone?: string;
  role: UserRole;
  language?: string;
}

export interface UpdateUserDTO {
  name?: string;
  phone?: string;
  avatar_url?: string;
  role?: UserRole;
  status?: UserStatus;
}

export class UserRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserDTO): Promise<User> {
    const id = `usr_${uuidv4()}`;
    const now = new Date();

    const result = await this.pool.query<User>(
      `INSERT INTO users (id, email, password_hash, name, phone, role, language, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        data.email.toLowerCase(),
        data.password_hash,
        data.name,
        data.phone || null,
        data.role,
        data.language || 'zh',
        UserStatus.ACTIVE,
        now,
        now,
      ]
    );

    logger.info('User created', { userId: id, email: data.email });
    return result.rows[0];
  }

  /**
   * Update user by ID
   */
  async update(id: string, data: UpdateUserDTO): Promise<User | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(data.phone);
    }

    if (data.avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(data.avatar_url);
    }

    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    values.push(id);

    const result = await this.pool.query<User>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length > 0) {
      logger.info('User updated', { userId: id });
    }

    return result.rows[0] || null;
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM users WHERE email = $1 LIMIT 1',
      [email.toLowerCase()]
    );
    return result.rows.length > 0;
  }

  /**
   * Delete user by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get user profile (formatted for API response)
   */
  async getProfile(id: string): Promise<{
    id: string;
    email: string;
    name: string;
    phone?: string;
    role: UserRole;
    profile?: { avatar?: string; wechat?: string };
    settings?: { language: string; notifications: boolean };
    created_at: Date;
    updated_at: Date;
  } | null> {
    const result = await this.pool.query(
      `SELECT id, email, name, phone, role, avatar_url, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      profile: user.avatar_url ? { avatar: user.avatar_url } : undefined,
      settings: { language: user.language || 'zh', notifications: true },
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}
