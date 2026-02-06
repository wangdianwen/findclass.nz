/**
 * Role Application Repository for PostgreSQL
 * Handles role change applications
 */

import type { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import type { UserRole } from '@shared/types';

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type HistoryAction = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface RoleApplication {
  id: string;
  user_id: string;
  role: UserRole;
  status: ApplicationStatus;
  reason?: string;
  comment?: string;
  reviewed_by?: string;
  applied_at: Date;
  reviewed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRoleApplicationDTO {
  user_id: string;
  role: UserRole;
  reason?: string;
}

export interface RoleApplicationHistory {
  id: string;
  application_id: string;
  action: HistoryAction;
  comment?: string;
  performed_by?: string;
  created_at: Date;
}

export class RoleApplicationRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Create a new role application
   */
  async create(data: CreateRoleApplicationDTO): Promise<RoleApplication> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.pool.query<RoleApplication>(
      `INSERT INTO role_applications (id, user_id, role, status, reason, applied_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, data.user_id, data.role, 'PENDING', data.reason || null, now, now, now]
    );

    // Create history record
    await this.createHistory(id, 'SUBMITTED', undefined, data.user_id);

    logger.info('Role application created', {
      applicationId: id,
      userId: data.user_id,
      role: data.role,
    });
    return result.rows[0];
  }

  /**
   * Find application by ID
   */
  async findById(id: string): Promise<RoleApplication | null> {
    const result = await this.pool.query<RoleApplication>(
      'SELECT * FROM role_applications WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find pending application for a user
   */
  async findPendingByUserId(userId: string): Promise<RoleApplication | null> {
    const result = await this.pool.query<RoleApplication>(
      `SELECT * FROM role_applications
       WHERE user_id = $1 AND status = 'PENDING'
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Find all applications for a user
   */
  async findByUserId(userId: string): Promise<RoleApplication[]> {
    const result = await this.pool.query<RoleApplication>(
      `SELECT * FROM role_applications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Find pending applications (for admin)
   */
  async findPending(limit: number = 50): Promise<RoleApplication[]> {
    const result = await this.pool.query<RoleApplication>(
      `SELECT * FROM role_applications
       WHERE status = 'PENDING'
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Find applications by status
   */
  async findByStatus(status: ApplicationStatus, limit: number = 50): Promise<RoleApplication[]> {
    const result = await this.pool.query<RoleApplication>(
      `SELECT * FROM role_applications
       WHERE status = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [status, limit]
    );
    return result.rows;
  }

  /**
   * Update application status (approve/reject)
   */
  async updateStatus(
    id: string,
    status: ApplicationStatus,
    reviewedBy: string,
    comment?: string
  ): Promise<RoleApplication | null> {
    const now = new Date();

    // Cast status to HistoryAction for the history action
    const historyAction: HistoryAction =
      status === 'APPROVED' ? 'APPROVED' : status === 'REJECTED' ? 'REJECTED' : 'CANCELLED';

    const result = await this.pool.query<RoleApplication>(
      `UPDATE role_applications
       SET status = $1, reviewed_by = $2, reviewed_at = $3, comment = $4, updated_at = $5
       WHERE id = $6
       RETURNING *`,
      [status, reviewedBy, now, comment || null, now, id]
    );

    if (result.rows.length > 0) {
      // Create history record
      await this.createHistory(id, historyAction, comment, reviewedBy);
      logger.info('Role application status updated', { applicationId: id, status, reviewedBy });
    }

    return result.rows[0] || null;
  }

  /**
   * Cancel an application
   */
  async cancel(id: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE role_applications
       SET status = 'CANCELLED', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'PENDING'`,
      [id, userId]
    );

    if (result.rowCount && result.rowCount > 0) {
      await this.createHistory(id, 'CANCELLED', 'Cancelled by user', userId);
      logger.info('Role application cancelled', { applicationId: id, userId });
    }

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Create history record
   */
  async createHistory(
    applicationId: string,
    action: HistoryAction,
    comment?: string,
    performedBy?: string
  ): Promise<RoleApplicationHistory> {
    const id = uuidv4();
    const now = new Date();

    // Note: In a real implementation, you might want a separate history table
    // For now, we'll just log this action
    logger.debug('Role application history created', { applicationId, action, performedBy });

    return {
      id,
      application_id: applicationId,
      action,
      comment,
      performed_by: performedBy,
      created_at: now,
    };
  }

  /**
   * Get application with history
   */
  async getWithHistory(
    id: string
  ): Promise<(RoleApplication & { history: RoleApplicationHistory[] }) | null> {
    const application = await this.findById(id);

    if (!application) {
      return null;
    }

    // For now, return empty history - in a real implementation, query from history table
    return {
      ...application,
      history: [],
    };
  }

  /**
   * Delete an application
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM role_applications WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Check if user has a pending application
   */
  async hasPendingApplication(userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM role_applications
       WHERE user_id = $1 AND status = 'PENDING'
       LIMIT 1`,
      [userId]
    );
    return result.rows.length > 0;
  }
}
