/**
 * Child Repository for PostgreSQL
 * Handles user children records
 */

import type { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';

export interface Child {
  id: string;
  user_id: string;
  name: string;
  date_of_birth: string;
  gender: 'MALE' | 'FEMALE';
  school?: string;
  grade?: string;
  subjects?: string[];
  learning_goals?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface CreateChildDTO {
  name: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE';
  school?: string;
  grade?: string;
  subjects?: string[];
  learningGoals?: string[];
}

export interface UpdateChildDTO extends Partial<CreateChildDTO> {}

export class ChildRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Child | null> {
    const result = await this.pool.query(`SELECT * FROM children WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  async findByUserId(userId: string): Promise<Child[]> {
    const result = await this.pool.query(
      `SELECT * FROM children WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId]
    );
    return result.rows;
  }

  async create(userId: string, data: CreateChildDTO): Promise<Child> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO children (id, user_id, name, date_of_birth, gender, school, grade, subjects, learning_goals, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        id,
        userId,
        data.name,
        data.dateOfBirth,
        data.gender,
        data.school,
        data.grade,
        data.subjects ? JSON.stringify(data.subjects) : null,
        data.learningGoals ? JSON.stringify(data.learningGoals) : null,
        now,
        now,
      ]
    );

    logger.info('Child created', { childId: id, userId });
    return result.rows[0];
  }

  async update(id: string, data: UpdateChildDTO): Promise<Child | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const result = await this.pool.query(
      `UPDATE children
       SET name = COALESCE($2, name),
           date_of_birth = COALESCE($3, date_of_birth),
           gender = COALESCE($4, gender),
           school = COALESCE($5, school),
           grade = COALESCE($6, grade),
           subjects = COALESCE($7, subjects),
           learning_goals = COALESCE($8, learning_goals),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        data.name,
        data.dateOfBirth,
        data.gender,
        data.school,
        data.grade,
        data.subjects ? JSON.stringify(data.subjects) : null,
        data.learningGoals ? JSON.stringify(data.learningGoals) : null,
      ]
    );

    if (result.rows.length === 0) return null;

    logger.info('Child updated', { childId: id });
    return result.rows[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM children WHERE id = $1`, [id]);
    if (result.rowCount && result.rowCount > 0) {
      logger.info('Child deleted', { childId: id });
      return true;
    }
    return false;
  }
}
