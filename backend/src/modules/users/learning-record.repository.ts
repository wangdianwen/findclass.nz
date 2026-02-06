/**
 * Learning Record Repository for PostgreSQL
 * Handles user learning records and progress
 */

import type { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';

export type LearningRecordType =
  | 'LESSON_START'
  | 'LESSON_COMPLETE'
  | 'VIDEO_WATCH'
  | 'QUIZ_COMPLETE'
  | 'HOMEWORK_SUBMIT';
export type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface LearningRecord {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id?: string;
  type: LearningRecordType;
  duration: number;
  progress: number;
  status: ProgressStatus;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateLearningRecordDTO {
  courseId: string;
  lessonId?: string;
  type: LearningRecordType;
  duration: number;
  progress: number;
  metadata?: Record<string, unknown>;
}

export interface LearningProgress {
  courseId: string;
  userId: string;
  totalDuration: number;
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
  status: ProgressStatus;
  lastActivityAt: string;
  startedAt: string;
  completedAt?: string;
}

export interface LearningStatistics {
  userId: string;
  totalLearningTime: number;
  totalCourses: number;
  completedCourses: number;
  totalLessons: number;
  completedLessons: number;
  averageProgress: number;
  lastActivityAt: string;
  weeklyData: Array<{
    date: string;
    duration: number;
    lessonsCompleted: number;
  }>;
}

export class LearningRecordRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<LearningRecord | null> {
    const result = await this.pool.query(`SELECT * FROM learning_records WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  async findByUserId(
    userId: string,
    options?: { courseId?: string; limit?: number }
  ): Promise<LearningRecord[]> {
    let query = `SELECT * FROM learning_records WHERE user_id = $1`;
    const params: (string | number)[] = [userId];

    if (options?.courseId) {
      query += ` AND course_id = $2`;
      params.push(options.courseId);
    }

    query += ` ORDER BY created_at DESC`;

    if (options?.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async create(userId: string, data: CreateLearningRecordDTO): Promise<LearningRecord> {
    const id = uuidv4();
    const now = new Date();
    const status: ProgressStatus = data.progress >= 100 ? 'COMPLETED' : 'IN_PROGRESS';

    const result = await this.pool.query(
      `INSERT INTO learning_records (id, user_id, course_id, lesson_id, type, duration, progress, status, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        id,
        userId,
        data.courseId,
        data.lessonId,
        data.type,
        data.duration,
        data.progress,
        status,
        data.metadata ? JSON.stringify(data.metadata) : null,
        now,
        now,
      ]
    );

    logger.info('Learning record created', { recordId: id, userId, courseId: data.courseId });
    return result.rows[0];
  }

  async getProgress(userId: string, courseId: string): Promise<LearningProgress | null> {
    const records = await this.findByUserId(userId, { courseId });

    if (records.length === 0) return null;

    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
    const completedLessons = records.filter(r => r.type === 'LESSON_COMPLETE').length;

    const sortedByDate = [...records].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const startedAt = sortedByDate[0]?.created_at
      ? new Date(sortedByDate[0].created_at).toISOString()
      : new Date().toISOString();

    const sortedByDesc = [...records].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const lastActivityAt = sortedByDesc[0]?.created_at
      ? new Date(sortedByDesc[0].created_at).toISOString()
      : new Date().toISOString();

    const maxProgress = Math.max(...records.map(r => r.progress), 0);
    const status: ProgressStatus = maxProgress >= 100 ? 'COMPLETED' : 'IN_PROGRESS';

    return {
      courseId,
      userId,
      totalDuration,
      completedLessons,
      totalLessons: Math.ceil(maxProgress / 10) || 0,
      progressPercentage: Math.min(100, maxProgress),
      status,
      lastActivityAt,
      startedAt,
      completedAt: maxProgress >= 100 ? new Date().toISOString() : undefined,
    };
  }

  async getStatistics(userId: string): Promise<LearningStatistics> {
    const records = await this.findByUserId(userId);

    const totalLearningTime = records.reduce((sum, r) => sum + r.duration, 0);
    const uniqueCourses = new Set(records.map(r => r.course_id)).size;
    const completedCourses = new Set(records.filter(r => r.progress >= 100).map(r => r.course_id))
      .size;
    const completedLessons = records.filter(r => r.type === 'LESSON_COMPLETE').length;

    // Weekly data (last 7 days)
    const weeklyData: Array<{ date: string; duration: number; lessonsCompleted: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayRecords = records.filter(r => r.created_at.toISOString().startsWith(dateStr));
      weeklyData.push({
        date: dateStr,
        duration: dayRecords.reduce((sum, r) => sum + r.duration, 0),
        lessonsCompleted: dayRecords.filter(r => r.type === 'LESSON_COMPLETE').length,
      });
    }

    const progressSum =
      uniqueCourses > 0 ? records.reduce((sum, r) => sum + r.progress, 0) / uniqueCourses : 0;

    const sortedByDesc = [...records].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const lastActivityAt = sortedByDesc[0]?.created_at
      ? new Date(sortedByDesc[0].created_at).toISOString()
      : new Date().toISOString();

    return {
      userId,
      totalLearningTime,
      totalCourses: uniqueCourses,
      completedCourses,
      totalLessons: completedLessons,
      completedLessons,
      averageProgress: Math.min(100, progressSum),
      lastActivityAt,
      weeklyData,
    };
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM learning_records WHERE id = $1`, [id]);
    if (result.rowCount && result.rowCount > 0) {
      logger.info('Learning record deleted', { recordId: id });
      return true;
    }
    return false;
  }
}
