/**
 * Inquiries Repository for PostgreSQL
 * Handles inquiry and report data access
 */

import type { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import type {
  Inquiry,
  InquiryStatus,
  Report,
  ReportStatus,
  ReportTargetType,
  ReportReason,
  CreateInquiryDTO,
  CreateReportDTO,
  InquiryFilters,
  ReportFilters,
} from './types';

// ==================== Inquiry Repository ====================

export interface InquiryRow {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  target_type: string;
  target_id: string | null;
  subject: string | null;
  message: string;
  status: InquiryStatus;
  reply_content: string | null;
  replied_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
}

export class InquiryRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Map database row to Inquiry object
   */
  private mapRowToInquiry(row: InquiryRow): Inquiry {
    return {
      id: row.id,
      userId: row.user_id || undefined,
      userName: row.user_name || undefined,
      userEmail: row.user_email || undefined,
      userPhone: row.user_phone || undefined,
      targetType: row.target_type as 'course' | 'teacher' | 'general',
      targetId: row.target_id || undefined,
      subject: row.subject || undefined,
      message: row.message,
      status: row.status,
      replyContent: row.reply_content || undefined,
      repliedAt: row.replied_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
    };
  }

  /**
   * Find inquiry by ID
   */
  async findById(id: string): Promise<Inquiry | null> {
    const result = await this.pool.query<InquiryRow>(`SELECT * FROM inquiries WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToInquiry(result.rows[0]);
  }

  /**
   * Get all inquiries with filters and pagination
   */
  async findAll(filters?: InquiryFilters): Promise<{ inquiries: Inquiry[]; total: number }> {
    const { status, targetType, targetId, userId, page = 1, limit = 10 } = filters || {};

    let whereClause = 'WHERE 1=1';
    const params: (string | InquiryStatus)[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (targetType) {
      whereClause += ` AND target_type = $${paramIndex}`;
      params.push(targetType);
      paramIndex++;
    }

    if (targetId) {
      whereClause += ` AND target_id = $${paramIndex}`;
      params.push(targetId);
      paramIndex++;
    }

    if (userId) {
      whereClause += ` AND user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    // Count total
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM inquiries ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get inquiries with pagination
    const result = await this.pool.query<InquiryRow>(
      `SELECT * FROM inquiries ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      inquiries: result.rows.map(row => this.mapRowToInquiry(row)),
      total,
    };
  }

  /**
   * Get inquiries by user ID
   */
  async findByUserId(userId: string): Promise<Inquiry[]> {
    const result = await this.pool.query<InquiryRow>(
      `SELECT * FROM inquiries WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map(row => this.mapRowToInquiry(row));
  }

  /**
   * Create a new inquiry
   */
  async create(data: CreateInquiryDTO): Promise<Inquiry> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.pool.query<InquiryRow>(
      `INSERT INTO inquiries (
        id, user_id,
        target_type, target_id, subject, message, status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id,
        data.userId || null,
        data.targetType,
        data.targetId || null,
        data.subject || null,
        data.message,
        'PENDING',
        now,
        now,
      ]
    );

    logger.info('Inquiry created', { inquiryId: id, targetType: data.targetType });

    return this.mapRowToInquiry(result.rows[0]);
  }

  /**
   * Update inquiry status and reply
   */
  async updateReply(id: string, replyContent: string): Promise<Inquiry | null> {
    const result = await this.pool.query<InquiryRow>(
      `UPDATE inquiries
       SET reply_content = $2, status = 'REPLIED', replied_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, replyContent]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToInquiry(result.rows[0]);
  }

  /**
   * Update inquiry status
   */
  async updateStatus(id: string, status: InquiryStatus): Promise<Inquiry | null> {
    const result = await this.pool.query<InquiryRow>(
      `UPDATE inquiries
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToInquiry(result.rows[0]);
  }

  /**
   * Check if user has pending inquiry for same target (rate limiting)
   */
  async hasPendingInquiryForTarget(
    userId: string,
    targetType: string,
    targetId?: string
  ): Promise<boolean> {
    let query = `SELECT 1 FROM inquiries WHERE user_id = $1 AND target_type = $2 AND status = 'PENDING'`;
    const params: (string | undefined)[] = [userId, targetType];

    if (targetId) {
      query += ` AND target_id = $3`;
      params.push(targetId);
    }

    query += ` AND created_at > NOW() - INTERVAL '24 hours' LIMIT 1`;

    const result = await this.pool.query(query, params);
    return result.rows.length > 0;
  }
}

// ==================== Report Repository ====================

export interface ReportRow {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  target_type: string;
  target_id: string;
  reason: string;
  description: string;
  status: ReportStatus;
  admin_notes: string | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
}

export class ReportRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Map database row to Report object
   */
  private mapRowToReport(row: ReportRow): Report {
    return {
      id: row.id,
      userId: row.user_id || undefined,
      userName: row.user_name || undefined,
      userEmail: row.user_email || undefined,
      targetType: row.target_type as ReportTargetType,
      targetId: row.target_id,
      reason: row.reason as ReportReason,
      description: row.description,
      status: row.status,
      adminNotes: row.admin_notes || undefined,
      resolvedAt: row.resolved_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
    };
  }

  /**
   * Find report by ID
   */
  async findById(id: string): Promise<Report | null> {
    const result = await this.pool.query<ReportRow>(`SELECT * FROM reports WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToReport(result.rows[0]);
  }

  /**
   * Get all reports with filters and pagination
   */
  async findAll(filters?: ReportFilters): Promise<{ reports: Report[]; total: number }> {
    const { status, targetType, targetId, reason, userId, page = 1, limit = 10 } = filters || {};

    let whereClause = 'WHERE 1=1';
    const params: (string | ReportStatus | ReportReason)[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (targetType) {
      whereClause += ` AND target_type = $${paramIndex}`;
      params.push(targetType);
      paramIndex++;
    }

    if (targetId) {
      whereClause += ` AND target_id = $${paramIndex}`;
      params.push(targetId);
      paramIndex++;
    }

    if (reason) {
      whereClause += ` AND reason = $${paramIndex}`;
      params.push(reason);
      paramIndex++;
    }

    if (userId) {
      whereClause += ` AND user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    // Count total
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM reports ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get reports with pagination
    const result = await this.pool.query<ReportRow>(
      `SELECT * FROM reports ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      reports: result.rows.map(row => this.mapRowToReport(row)),
      total,
    };
  }

  /**
   * Get reports by target ID
   */
  async findByTargetId(targetType: string, targetId: string): Promise<Report[]> {
    const result = await this.pool.query<ReportRow>(
      `SELECT * FROM reports WHERE target_type = $1 AND target_id = $2 ORDER BY created_at DESC`,
      [targetType, targetId]
    );

    return result.rows.map(row => this.mapRowToReport(row));
  }

  /**
   * Get reports by user ID
   */
  async findByUserId(userId: string): Promise<Report[]> {
    const result = await this.pool.query<ReportRow>(
      `SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map(row => this.mapRowToReport(row));
  }

  /**
   * Create a new report
   */
  async create(data: CreateReportDTO): Promise<Report> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.pool.query<ReportRow>(
      `INSERT INTO reports (
        id, user_id,
        target_type, target_id, reason, description, status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id,
        data.userId || null,
        data.targetType,
        data.targetId,
        data.reason,
        data.description,
        'PENDING',
        now,
        now,
      ]
    );

    logger.info('Report created', {
      reportId: id,
      targetType: data.targetType,
      targetId: data.targetId,
    });

    return this.mapRowToReport(result.rows[0]);
  }

  /**
   * Update report status and admin notes
   */
  async updateStatus(
    id: string,
    status: ReportStatus,
    adminNotes?: string
  ): Promise<Report | null> {
    let query = `UPDATE reports SET status = $2, updated_at = NOW()`;
    const params: (string | ReportStatus | undefined)[] = [id, status];

    if (adminNotes) {
      query += `, admin_notes = $3`;
      params.push(adminNotes);
    }

    if (status === 'RESOLVED') {
      query += `, resolved_at = NOW()`;
    }

    query += ` WHERE id = $1 RETURNING *`;

    const result = await this.pool.query<ReportRow>(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToReport(result.rows[0]);
  }

  /**
   * Check if user has already reported the same target
   */
  async hasUserReportedTarget(
    userId: string,
    targetType: string,
    targetId: string
  ): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM reports
       WHERE user_id = $1 AND target_type = $2 AND target_id = $3
       AND status IN ('PENDING', 'REVIEWING')
       LIMIT 1`,
      [userId, targetType, targetId]
    );
    return result.rows.length > 0;
  }
}

// ==================== Repository Factory ====================

export class InquiryAndReportRepository {
  public inquiries: InquiryRepository;
  public reports: ReportRepository;

  constructor(pool: Pool) {
    this.inquiries = new InquiryRepository(pool);
    this.reports = new ReportRepository(pool);
  }
}
