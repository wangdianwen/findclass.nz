/**
 * Reviews Repository for PostgreSQL
 * Handles review data access with user and course joins
 */

import type { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import type {
  Review,
  ReviewStatus,
  ReviewFilters,
  ReviewStatistics,
  CreateReviewDTO,
} from './types';

export interface ReviewRow {
  id: string;
  user_id: string;
  course_id: string | null;
  teacher_id: string;
  booking_id: string | null;
  overall_rating: number;
  teaching_rating: number | null;
  course_rating: number | null;
  communication_rating: number | null;
  punctuality_rating: number | null;
  title: string | null;
  content: string;
  status: ReviewStatus;
  helpful_count: number;
  reply_content: string | null;
  reply_created_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
}

export interface UserRow {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface CourseRow {
  id: string;
  title: string | null;
}

export class ReviewRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Map database row to Review object with joined user and course data
   */
  private mapRowToReview(
    row: ReviewRow,
    userName?: string,
    userAvatar?: string,
    courseName?: string
  ): Review {
    return {
      id: row.id,
      userId: row.user_id,
      userName: userName || 'Anonymous',
      userAvatar: userAvatar || undefined,
      courseId: row.course_id || undefined,
      courseName: courseName || undefined,
      teacherId: row.teacher_id,
      bookingId: row.booking_id || undefined,
      overallRating: Number(row.overall_rating),
      teachingRating: row.teaching_rating ? Number(row.teaching_rating) : undefined,
      courseRating: row.course_rating ? Number(row.course_rating) : undefined,
      communicationRating: row.communication_rating ? Number(row.communication_rating) : undefined,
      punctualityRating: row.punctuality_rating ? Number(row.punctuality_rating) : undefined,
      title: row.title || undefined,
      content: row.content,
      tags: [], // Tags are not stored in the main reviews table
      status: row.status,
      helpfulCount: row.helpful_count,
      reply: row.reply_content
        ? {
            id: `${row.id}-reply`,
            reviewId: row.id,
            teacherId: row.teacher_id,
            content: row.reply_content,
            createdAt: row.reply_created_at as Date,
          }
        : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
    };
  }

  /**
   * Find review by ID
   */
  async findById(id: string): Promise<Review | null> {
    const reviewResult = await this.pool.query<ReviewRow>(`SELECT * FROM reviews WHERE id = $1`, [
      id,
    ]);

    if (reviewResult.rows.length === 0) {
      return null;
    }

    const row = reviewResult.rows[0];

    // Join with users table to get reviewer info
    const userResult = await this.pool.query<UserRow>(
      `SELECT id, name, avatar_url FROM users WHERE id = $1`,
      [row.user_id]
    );

    const courseName = row.course_id ? await this.getCourseName(row.course_id) : undefined;

    const userName = userResult.rows[0]?.name || 'Anonymous';
    const userAvatar = userResult.rows[0]?.avatar_url || undefined;

    return this.mapRowToReview(row, userName, userAvatar, courseName);
  }

  /**
   * Get course name by ID
   */
  private async getCourseName(courseId: string): Promise<string | undefined> {
    const result = await this.pool.query<CourseRow>(`SELECT title FROM courses WHERE id = $1`, [
      courseId,
    ]);
    return result.rows[0]?.title || undefined;
  }

  /**
   * Get all reviews with filters and pagination
   */
  async findAll(filters?: ReviewFilters): Promise<{ reviews: Review[]; total: number }> {
    const {
      teacherId,
      courseId,
      status,
      minRating,
      maxRating,
      page = 1,
      limit = 10,
      sortBy = 'recent',
    } = filters || {};

    let whereClause = 'WHERE 1=1';
    const params: (string | ReviewStatus | number)[] = [];
    let paramIndex = 1;

    if (teacherId) {
      whereClause += ` AND r.teacher_id = $${paramIndex}`;
      params.push(teacherId);
      paramIndex++;
    }

    if (courseId) {
      whereClause += ` AND r.course_id = $${paramIndex}`;
      params.push(courseId);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND r.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (minRating !== undefined) {
      whereClause += ` AND r.overall_rating >= $${paramIndex}`;
      params.push(minRating);
      paramIndex++;
    }

    if (maxRating !== undefined) {
      whereClause += ` AND r.overall_rating <= $${paramIndex}`;
      params.push(maxRating);
      paramIndex++;
    }

    // Only show approved reviews for public listings
    if (!status) {
      whereClause += ` AND r.status = 'APPROVED'`;
    }

    // Sorting
    const orderClause =
      sortBy === 'helpful'
        ? 'ORDER BY r.helpful_count DESC, r.created_at DESC'
        : 'ORDER BY r.created_at DESC';

    // Count total
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM reviews r ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get reviews with pagination
    const reviewsResult = await this.pool.query<ReviewRow>(
      `SELECT r.* FROM reviews r
       ${whereClause}
       ${orderClause}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Get user names and course names for all reviews
    const reviews: Review[] = await Promise.all(
      reviewsResult.rows.map(async row => {
        const userResult = await this.pool.query<UserRow>(
          `SELECT name, avatar_url FROM users WHERE id = $1`,
          [row.user_id]
        );
        const userName = userResult.rows[0]?.name || 'Anonymous';
        const userAvatar = userResult.rows[0]?.avatar_url || undefined;

        const courseName = row.course_id ? await this.getCourseName(row.course_id) : undefined;

        return this.mapRowToReview(row, userName, userAvatar, courseName);
      })
    );

    return { reviews, total };
  }

  /**
   * Get reviews by user ID
   */
  async findByUserId(userId: string): Promise<Review[]> {
    const result = await this.pool.query<ReviewRow>(
      `SELECT * FROM reviews WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    return Promise.all(
      result.rows.map(async row => {
        const courseName = row.course_id ? await this.getCourseName(row.course_id) : undefined;
        return this.mapRowToReview(row, 'User', undefined, courseName);
      })
    );
  }

  /**
   * Get reviews by teacher ID
   */
  async findByTeacherId(
    teacherId: string,
    page = 1,
    limit = 10,
    status?: ReviewStatus
  ): Promise<{ reviews: Review[]; total: number }> {
    const whereClause = status ? `WHERE teacher_id = $1 AND status = $2` : `WHERE teacher_id = $1`;

    const params: (string | ReviewStatus)[] = [teacherId];
    if (status) params.push(status);

    // Count total
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM reviews ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get reviews with pagination
    const reviewsResult = await this.pool.query<ReviewRow>(
      `SELECT * FROM reviews ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const reviews: Review[] = await Promise.all(
      reviewsResult.rows.map(async row => {
        const userResult = await this.pool.query<UserRow>(
          `SELECT name, avatar_url FROM users WHERE id = $1`,
          [row.user_id]
        );
        const userName = userResult.rows[0]?.name || 'Anonymous';
        const userAvatar = userResult.rows[0]?.avatar_url || undefined;

        const courseName = row.course_id ? await this.getCourseName(row.course_id) : undefined;

        return this.mapRowToReview(row, userName, userAvatar, courseName);
      })
    );

    return { reviews, total };
  }

  /**
   * Create a new review
   */
  async create(userId: string, data: CreateReviewDTO): Promise<Review> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.pool.query<ReviewRow>(
      `INSERT INTO reviews (
        id, user_id, course_id, teacher_id, booking_id,
        overall_rating, teaching_rating, course_rating, communication_rating, punctuality_rating,
        title, content, status, helpful_count,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        id,
        userId,
        data.courseId || null,
        data.teacherId,
        data.bookingId || null,
        data.overallRating,
        data.teachingRating || null,
        data.courseRating || null,
        data.communicationRating || null,
        data.punctualityRating || null,
        data.title || null,
        data.content,
        'PENDING', // Default status
        0, // Default helpful count
        now,
        now,
      ]
    );

    logger.info('Review created', { reviewId: id, userId, teacherId: data.teacherId });

    // Return the created review with user info
    const row = result.rows[0];
    const userResult = await this.pool.query<UserRow>(
      `SELECT name, avatar_url FROM users WHERE id = $1`,
      [userId]
    );
    const userName = userResult.rows[0]?.name || 'Anonymous';
    const userAvatar = userResult.rows[0]?.avatar_url || undefined;

    const courseName = data.courseId ? await this.getCourseName(data.courseId) : undefined;

    return this.mapRowToReview(row, userName, userAvatar, courseName);
  }

  /**
   * Update review status
   */
  async updateStatus(id: string, status: ReviewStatus): Promise<Review | null> {
    const result = await this.pool.query<ReviewRow>(
      `UPDATE reviews
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Add reply to review
   */
  async addReply(reviewId: string, teacherId: string, content: string): Promise<Review | null> {
    const result = await this.pool.query<ReviewRow>(
      `UPDATE reviews
       SET reply_content = $2, reply_created_at = NOW()
       WHERE id = $1 AND teacher_id = $3
       RETURNING *`,
      [reviewId, content, teacherId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.findById(reviewId);
  }

  /**
   * Increment helpful count
   */
  async incrementHelpfulCount(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = $1`,
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Get teacher review statistics
   */
  async getTeacherStats(teacherId: string): Promise<ReviewStatistics | null> {
    // Get overall stats
    const statsResult = await this.pool.query<{
      total_reviews: number;
      avg_overall: number;
      avg_teaching: number | null;
      avg_course: number | null;
      avg_communication: number | null;
      avg_punctuality: number | null;
    }>(
      `SELECT
         COUNT(*) as total_reviews,
         AVG(overall_rating) as avg_overall,
         AVG(teaching_rating) as avg_teaching,
         AVG(course_rating) as avg_course,
         AVG(communication_rating) as avg_communication,
         AVG(punctuality_rating) as avg_punctuality
       FROM reviews
       WHERE teacher_id = $1 AND status = 'APPROVED'`,
      [teacherId]
    );

    const stats = statsResult.rows[0];

    if (!stats || Number(stats.total_reviews) === 0) {
      return {
        teacherId,
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    // Get rating distribution
    const distributionResult = await this.pool.query<{ rating: number; count: number }>(
      `SELECT overall_rating as rating, COUNT(*) as count
       FROM reviews
       WHERE teacher_id = $1 AND status = 'APPROVED'
       GROUP BY overall_rating`,
      [teacherId]
    );

    const distribution: ReviewStatistics['ratingDistribution'] = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    for (const row of distributionResult.rows) {
      const rating = Math.round(Number(row.rating)) as 1 | 2 | 3 | 4 | 5;
      distribution[rating] = Number(row.count);
    }

    return {
      teacherId,
      totalReviews: Number(stats.total_reviews),
      averageRating: Number(stats.avg_overall) || 0,
      ratingDistribution: distribution,
      teachingAvg: stats.avg_teaching ? Number(stats.avg_teaching) : undefined,
      courseAvg: stats.avg_course ? Number(stats.avg_course) : undefined,
      communicationAvg: stats.avg_communication ? Number(stats.avg_communication) : undefined,
      punctualityAvg: stats.avg_punctuality ? Number(stats.avg_punctuality) : undefined,
    };
  }

  /**
   * Check if user has already reviewed this teacher
   */
  async hasUserReviewedTeacher(userId: string, teacherId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM reviews WHERE user_id = $1 AND teacher_id = $2 LIMIT 1`,
      [userId, teacherId]
    );
    return result.rows.length > 0;
  }

  /**
   * Check if user has already reviewed this course
   */
  async hasUserReviewedCourse(userId: string, courseId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM reviews WHERE user_id = $1 AND course_id = $2 LIMIT 1`,
      [userId, courseId]
    );
    return result.rows.length > 0;
  }
}
