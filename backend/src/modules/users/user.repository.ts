/**
 * User Repository for PostgreSQL
 * Handles user profile data
 */

import type { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';

export type UserRole = 'PARENT' | 'TEACHER' | 'STUDENT' | 'ADMIN';
export type UserStatus =
  | 'PENDING_PARENTAL_CONSENT'
  | 'PENDING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DEACTIVATED';

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  status: UserStatus;
  language: 'zh' | 'en';
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDTO {
  email: string;
  name?: string;
  phone?: string;
  avatar_url?: string;
  role?: UserRole;
  status?: UserStatus;
  language?: 'zh' | 'en';
}

export interface UpdateUserDTO {
  name?: string;
  phone?: string;
  avatar_url?: string;
  language?: 'zh' | 'en';
}

export class UserRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    return result.rows[0] || null;
  }

  async findByRole(role: UserRole): Promise<User[]> {
    const result = await this.pool.query(
      `SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC`,
      [role]
    );
    return result.rows;
  }

  async create(data: CreateUserDTO): Promise<User> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO users (id, email, name, phone, avatar_url, role, status, language, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        data.email,
        data.name || null,
        data.phone || null,
        data.avatar_url || null,
        data.role || 'STUDENT',
        data.status || 'PENDING',
        data.language || 'en',
        now,
        now,
      ]
    );

    logger.info('User created', { userId: id, email: data.email });
    return result.rows[0];
  }

  async update(id: string, data: UpdateUserDTO): Promise<User | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const result = await this.pool.query(
      `UPDATE users
       SET name = COALESCE($2, name),
           phone = COALESCE($3, phone),
           avatar_url = COALESCE($4, avatar_url),
           language = COALESCE($5, language),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, data.name, data.phone, data.avatar_url, data.language]
    );

    if (result.rows.length === 0) return null;

    logger.info('User updated', { userId: id });
    return result.rows[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM users WHERE id = $1`, [id]);
    if (result.rowCount && result.rowCount > 0) {
      logger.info('User deleted', { userId: id });
      return true;
    }
    return false;
  }

  async count(filters?: { role?: UserRole; status?: UserStatus }): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM users WHERE 1=1`;
    const params: (string | UserRole | UserStatus)[] = [];

    if (filters?.role) {
      query += ` AND role = $${params.length + 1}`;
      params.push(filters.role);
    }

    if (filters?.status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }
}
