/**
 * Course Repository for PostgreSQL
 * Handles course CRUD operations, search, and statistics
 */

import type { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import type { CourseCategory, PriceType } from '@shared/types';
import { CourseSourceType, CourseStatus, TrustLevel } from '@shared/types';

export interface Course {
  id: string;
  teacher_id: string;
  title: string;
  title_en?: string;
  description: string;
  description_en?: string;
  category: CourseCategory;
  subcategory?: string;
  price: number;
  price_type: PriceType;
  teaching_modes: ('ONLINE' | 'OFFLINE' | 'BOTH')[];
  locations: string[];
  target_age_groups: string[];
  max_class_size: number;
  current_enrollment: number;
  source_type: CourseSourceType;
  source_url?: string;
  quality_score: number;
  trust_level: TrustLevel;
  average_rating?: number;
  total_reviews?: number;
  published_at?: Date;
  expires_at?: Date;
  status: CourseStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCourseDTO {
  teacherId: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  category: CourseCategory;
  subcategory?: string;
  price: number;
  priceType: PriceType;
  teachingModes: ('ONLINE' | 'OFFLINE' | 'BOTH')[];
  locations: string[];
  targetAgeGroups: string[];
  maxClassSize: number;
  sourceType?: CourseSourceType;
  sourceUrl?: string;
}

export interface UpdateCourseDTO {
  title?: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  category?: CourseCategory;
  subcategory?: string;
  price?: number;
  priceType?: PriceType;
  teachingModes?: ('ONLINE' | 'OFFLINE' | 'BOTH')[];
  locations?: string[];
  targetAgeGroups?: string[];
  maxClassSize?: number;
  sourceType?: CourseSourceType;
  sourceUrl?: string;
  status?: CourseStatus;
}

export interface CourseSearchFilters {
  keyword?: string;
  category?: CourseCategory;
  teacherId?: string;
  city?: string;
  priceMin?: number;
  priceMax?: number;
  ratingMin?: number;
  trustLevel?: TrustLevel;
  teachingMode?: 'ONLINE' | 'OFFLINE' | 'BOTH';
  status?: CourseStatus;
}

export interface CourseSearchOptions {
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'relevance';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CourseStatistics {
  totalCourses: number;
  activeCourses: number;
  averageRating: number;
  totalReviews: number;
  averagePrice: number;
  categoryDistribution: Array<{ category: string; count: number }>;
}

export class CourseRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Find course by ID
   */
  async findById(id: string): Promise<Course | null> {
    const result = await this.pool.query<Course>(`SELECT * FROM courses WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find all courses by teacher ID
   */
  async findByTeacherId(teacherId: string): Promise<Course[]> {
    const result = await this.pool.query<Course>(
      `SELECT * FROM courses WHERE teacher_id = $1 ORDER BY created_at DESC`,
      [teacherId]
    );
    return result.rows;
  }

  /**
   * Create a new course
   */
  async create(data: CreateCourseDTO): Promise<Course> {
    const id = `course_${uuidv4()}`;
    const now = new Date();

    const result = await this.pool.query<Course>(
      `INSERT INTO courses (
        id, teacher_id, title, title_en, description, description_en,
        category, subcategory, price, price_type, teaching_modes,
        locations, target_age_groups, max_class_size, current_enrollment,
        source_type, source_url, quality_score, trust_level, status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        id,
        data.teacherId,
        data.title,
        data.titleEn || null,
        data.description,
        data.descriptionEn || null,
        data.category,
        data.subcategory || null,
        data.price,
        data.priceType,
        JSON.stringify(data.teachingModes),
        JSON.stringify(data.locations),
        JSON.stringify(data.targetAgeGroups),
        data.maxClassSize,
        0, // current_enrollment
        data.sourceType || CourseSourceType.REGISTERED,
        data.sourceUrl || null,
        0, // quality_score - to be calculated
        TrustLevel.B, // default trust level
        CourseStatus.ACTIVE,
        now,
        now,
      ]
    );

    logger.info('Course created', { courseId: id, teacherId: data.teacherId });
    return result.rows[0];
  }

  /**
   * Update course by ID
   */
  async update(id: string, data: UpdateCourseDTO): Promise<Course | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }

    if (data.titleEn !== undefined) {
      updates.push(`title_en = $${paramIndex++}`);
      values.push(data.titleEn);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (data.descriptionEn !== undefined) {
      updates.push(`description_en = $${paramIndex++}`);
      values.push(data.descriptionEn);
    }

    if (data.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(data.category);
    }

    if (data.subcategory !== undefined) {
      updates.push(`subcategory = $${paramIndex++}`);
      values.push(data.subcategory);
    }

    if (data.price !== undefined) {
      updates.push(`price = $${paramIndex++}`);
      values.push(data.price);
    }

    if (data.priceType !== undefined) {
      updates.push(`price_type = $${paramIndex++}`);
      values.push(data.priceType);
    }

    if (data.teachingModes !== undefined) {
      updates.push(`teaching_modes = $${paramIndex++}`);
      values.push(JSON.stringify(data.teachingModes));
    }

    if (data.locations !== undefined) {
      updates.push(`locations = $${paramIndex++}`);
      values.push(JSON.stringify(data.locations));
    }

    if (data.targetAgeGroups !== undefined) {
      updates.push(`target_age_groups = $${paramIndex++}`);
      values.push(JSON.stringify(data.targetAgeGroups));
    }

    if (data.maxClassSize !== undefined) {
      updates.push(`max_class_size = $${paramIndex++}`);
      values.push(data.maxClassSize);
    }

    if (data.sourceType !== undefined) {
      updates.push(`source_type = $${paramIndex++}`);
      values.push(data.sourceType);
    }

    if (data.sourceUrl !== undefined) {
      updates.push(`source_url = $${paramIndex++}`);
      values.push(data.sourceUrl);
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

    const result = await this.pool.query<Course>(
      `UPDATE courses SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length > 0) {
      logger.info('Course updated', { courseId: id });
    }

    return result.rows[0] || null;
  }

  /**
   * Delete course by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM courses WHERE id = $1', [id]);
    if (result.rowCount && result.rowCount > 0) {
      logger.info('Course deleted', { courseId: id });
      return true;
    }
    return false;
  }

  /**
   * Search courses with filters and pagination
   */
  async search(
    filters: CourseSearchFilters,
    options: CourseSearchOptions = {}
  ): Promise<PaginatedResult<Course>> {
    const {
      keyword,
      category,
      teacherId,
      city,
      priceMin,
      priceMax,
      ratingMin,
      trustLevel,
      teachingMode,
      status,
    } = filters;

    const { page = 1, limit = 20, sortBy = 'newest', sortOrder = 'DESC' } = options;

    let query = `FROM courses WHERE 1=1`;
    const params: unknown[] = [];
    let paramIndex = 1;

    // Keyword search (title or description)
    if (keyword && keyword.trim()) {
      query += ` AND (
        title ILIKE $${paramIndex} OR
        title_en ILIKE $${paramIndex} OR
        description ILIKE $${paramIndex} OR
        description_en ILIKE $${paramIndex}
      )`;
      params.push(`%${keyword}%`);
      paramIndex++;
    }

    // Category filter
    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Teacher filter
    if (teacherId) {
      query += ` AND teacher_id = $${paramIndex}`;
      params.push(teacherId);
      paramIndex++;
    }

    // City/location filter
    if (city) {
      query += ` AND $${paramIndex} = ANY(locations)`;
      params.push(city);
      paramIndex++;
    }

    // Price range filter
    if (priceMin !== undefined) {
      query += ` AND price >= $${paramIndex}`;
      params.push(priceMin);
      paramIndex++;
    }

    if (priceMax !== undefined) {
      query += ` AND price <= $${paramIndex}`;
      params.push(priceMax);
      paramIndex++;
    }

    // Rating filter
    if (ratingMin !== undefined) {
      query += ` AND average_rating >= $${paramIndex}`;
      params.push(ratingMin);
      paramIndex++;
    }

    // Trust level filter
    if (trustLevel) {
      query += ` AND trust_level = $${paramIndex}`;
      params.push(trustLevel);
      paramIndex++;
    }

    // Teaching mode filter
    if (teachingMode) {
      query += ` AND $${paramIndex} = ANY(teaching_modes)`;
      params.push(teachingMode);
      paramIndex++;
    }

    // Status filter
    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    } else {
      // Default to active courses
      query += ` AND status = $${paramIndex}`;
      params.push(CourseStatus.ACTIVE);
      paramIndex++;
    }

    // Count total results
    const countQuery = `SELECT COUNT(*) as count ${query}`;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Build sort clause
    let orderClause = 'ORDER BY created_at DESC';
    switch (sortBy) {
      case 'price_asc':
        orderClause = 'ORDER BY price ASC';
        break;
      case 'price_desc':
        orderClause = 'ORDER BY price DESC';
        break;
      case 'rating':
        orderClause = 'ORDER BY average_rating DESC NULLS LAST';
        break;
      case 'newest':
      default:
        orderClause = `ORDER BY created_at ${sortOrder}`;
        break;
    }

    // Add pagination
    const offset = (page - 1) * limit;
    const paginatedQuery = `
      SELECT * ${query}
      ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await this.pool.query<Course>(paginatedQuery, params);

    const totalPages = Math.ceil(total / limit);

    return {
      items: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get course statistics
   */
  async getStatistics(teacherId?: string): Promise<CourseStatistics> {
    let whereClause = '';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (teacherId) {
      whereClause = `WHERE teacher_id = $${paramIndex}`;
      params.push(teacherId);
      paramIndex++;
    }

    // Get aggregated statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_courses,
        COUNT(*) FILTER (WHERE status = ${teacherId ? '$1' : "'ACTIVE'"}) as active_courses,
        AVG(average_rating) FILTER (WHERE average_rating IS NOT NULL) as avg_rating,
        SUM(total_reviews) as total_reviews,
        AVG(price) as avg_price
      FROM courses
      ${whereClause}
    `;

    const statsResult = await this.pool.query(statsQuery, params);

    // Get category distribution
    const categoryQuery = `
      SELECT category, COUNT(*) as count
      FROM courses
      ${whereClause}
      GROUP BY category
      ORDER BY count DESC
    `;

    const categoryResult = await this.pool.query(categoryQuery, params);

    return {
      totalCourses: parseInt(statsResult.rows[0].total_courses, 10),
      activeCourses: parseInt(statsResult.rows[0].active_courses, 10),
      averageRating: parseFloat(statsResult.rows[0].avg_rating) || 0,
      totalReviews: parseInt(statsResult.rows[0].total_reviews, 10) || 0,
      averagePrice: parseFloat(statsResult.rows[0].avg_price) || 0,
      categoryDistribution: categoryResult.rows.map(row => ({
        category: row.category,
        count: parseInt(row.count, 10),
      })),
    };
  }

  /**
   * Update course rating statistics
   */
  async updateRatingStats(
    courseId: string,
    averageRating: number,
    totalReviews: number
  ): Promise<Course | null> {
    const result = await this.pool.query<Course>(
      `UPDATE courses
       SET average_rating = $1, total_reviews = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [averageRating, totalReviews, courseId]
    );

    if (result.rows.length > 0) {
      logger.info('Course rating stats updated', { courseId, averageRating, totalReviews });
    }

    return result.rows[0] || null;
  }

  /**
   * Increment enrollment count
   */
  async incrementEnrollment(courseId: string): Promise<Course | null> {
    const result = await this.pool.query<Course>(
      `UPDATE courses
       SET current_enrollment = current_enrollment + 1, updated_at = NOW()
       WHERE id = $1 AND current_enrollment < max_class_size
       RETURNING *`,
      [courseId]
    );

    if (result.rows.length > 0) {
      logger.info('Course enrollment incremented', { courseId });
    }

    return result.rows[0] || null;
  }

  /**
   * Decrement enrollment count
   */
  async decrementEnrollment(courseId: string): Promise<Course | null> {
    const result = await this.pool.query<Course>(
      `UPDATE courses
       SET current_enrollment = GREATEST(current_enrollment - 1, 0), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [courseId]
    );

    if (result.rows.length > 0) {
      logger.info('Course enrollment decremented', { courseId });
    }

    return result.rows[0] || null;
  }

  /**
   * Check if course exists
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.pool.query('SELECT 1 FROM courses WHERE id = $1 LIMIT 1', [id]);
    return result.rows.length > 0;
  }

  /**
   * Get courses by IDs
   */
  async findByIds(ids: string[]): Promise<Course[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const result = await this.pool.query<Course>(
      `SELECT * FROM courses WHERE id IN (${placeholders})`,
      ids
    );
    return result.rows;
  }
}
