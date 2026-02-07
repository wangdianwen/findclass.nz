/**
 * Notification Repository for PostgreSQL
 * Handles user notification data access
 */

import type { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';

export type NotificationType =
  | 'SYSTEM'
  | 'COURSE_REMINDER'
  | 'LESSON_REMINDER'
  | 'REVIEW_RESPONSE'
  | 'PROMOTION'
  | 'ACCOUNT_UPDATE';

export type NotificationStatus = 'UNREAD' | 'READ';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  status: NotificationStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CreateNotificationDTO {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, unknown>;
}

export class NotificationRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Notification | null> {
    const result = await this.pool.query(`SELECT * FROM notifications WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  async findByUserId(
    userId: string,
    options?: { status?: NotificationStatus; limit?: number; offset?: number }
  ): Promise<Notification[]> {
    let query = `SELECT * FROM notifications WHERE user_id = $1`;
    const params: (string | NotificationStatus | number)[] = [userId];

    if (options?.status) {
      query += ` AND status = $2`;
      params.push(options.status);
    }

    query += ` ORDER BY created_at DESC`;

    if (options?.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
    }

    if (options?.offset) {
      query += ` OFFSET $${params.length + 1}`;
      params.push(options.offset);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async findUnreadCount(userId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND status = 'UNREAD'`,
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  async create(data: CreateNotificationDTO): Promise<Notification> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO notifications (id, user_id, type, title, content, data, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'UNREAD', $7, $8)
       RETURNING *`,
      [
        id,
        data.userId,
        data.type,
        data.title,
        data.content,
        data.data ? JSON.stringify(data.data) : null,
        now,
        now,
      ]
    );

    logger.info('Notification created', { notificationId: id, userId: data.userId });
    return result.rows[0];
  }

  async markAsRead(id: string): Promise<Notification | null> {
    const result = await this.pool.query(
      `UPDATE notifications
       SET status = 'READ', updated_at = NOW()
       WHERE id = $1 AND status = 'UNREAD'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info('Notification marked as read', { notificationId: id });
    return this.findById(id);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.pool.query(
      `UPDATE notifications
       SET status = 'READ', updated_at = NOW()
       WHERE user_id = $1 AND status = 'UNREAD'`,
      [userId]
    );

    const updatedCount = result.rowCount || 0;
    logger.info('All notifications marked as read', { userId, count: updatedCount });
    return updatedCount;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM notifications WHERE id = $1`, [id]);
    if (result.rowCount && result.rowCount > 0) {
      logger.info('Notification deleted', { notificationId: id });
      return true;
    }
    return false;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.pool.query(`DELETE FROM notifications WHERE user_id = $1`, [userId]);
    logger.info('Notifications deleted by user', { userId, count: result.rowCount });
    return result.rowCount || 0;
  }
}
