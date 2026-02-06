/**
 * Teacher Repository for PostgreSQL
 * Handles teacher profile data, qualifications, and course relationships
 */

import type { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import type { TrustLevel, VerificationStatus } from '@shared/types';

export type TeachingMode = 'ONLINE' | 'OFFLINE' | 'BOTH';

export interface Teacher {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string;
  teaching_subjects: string[];
  teaching_modes: TeachingMode[];
  locations: string[];
  qualifications?: TeacherQualification[];
  trust_level: TrustLevel;
  verification_status: VerificationStatus;
  average_rating: number;
  total_reviews: number;
  total_students: number;
  created_at: Date;
  updated_at: Date;
}

export interface TeacherQualification {
  id: string;
  teacher_id: string;
  type: 'DEGREE' | 'CERTIFICATE' | 'EXPERIENCE';
  name: string;
  institution?: string;
  year?: number;
  file_url?: string;
  status: VerificationStatus;
  created_at: Date;
}

export interface TeacherCourse {
  id: string;
  teacher_id: string;
  course_id: string;
  course_title?: string;
  course_category?: string;
  course_price?: number;
  created_at: Date;
}

export interface CreateTeacherDTO {
  userId: string;
  displayName: string;
  bio?: string;
  teachingSubjects: string[];
  teachingModes: TeachingMode[];
  locations: string[];
  qualifications?: Array<{
    type: 'DEGREE' | 'CERTIFICATE' | 'EXPERIENCE';
    name: string;
    institution?: string;
    year?: number;
    fileUrl?: string;
  }>;
}

export interface UpdateTeacherDTO {
  displayName?: string;
  bio?: string;
  teachingSubjects?: string[];
  teachingModes?: TeachingMode[];
  locations?: string[];
  verificationStatus?: VerificationStatus;
  averageRating?: number;
}

export class TeacherRepository {
  constructor(private readonly pool: Pool) {}

  // ==================== Teacher CRUD Operations ====================

  async findById(id: string): Promise<Teacher | null> {
    const result = await this.pool.query(`SELECT * FROM teachers WHERE id = $1`, [id]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return this.mapRowToTeacher(row);
  }

  async findByUserId(userId: string): Promise<Teacher | null> {
    const result = await this.pool.query(`SELECT * FROM teachers WHERE user_id = $1`, [userId]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return this.mapRowToTeacher(row);
  }

  async findAll(filters?: {
    verificationStatus?: VerificationStatus;
    teachingSubject?: string;
    location?: string;
    minRating?: number;
    limit?: number;
    offset?: number;
  }): Promise<Teacher[]> {
    let query = `
      SELECT DISTINCT t.* FROM teachers t
      WHERE 1=1
    `;
    const params: (string | VerificationStatus | number)[] = [];

    if (filters?.verificationStatus) {
      query += ` AND t.verification_status = $${params.length + 1}`;
      params.push(filters.verificationStatus);
    }

    if (filters?.teachingSubject) {
      query += ` AND $${params.length + 1} = ANY(t.teaching_subjects)`;
      params.push(filters.teachingSubject);
    }

    if (filters?.location) {
      query += ` AND $${params.length + 1} = ANY(t.locations)`;
      params.push(filters.location);
    }

    if (filters?.minRating) {
      query += ` AND t.average_rating >= $${params.length + 1}`;
      params.push(filters.minRating);
    }

    query += ` ORDER BY t.created_at DESC`;

    if (filters?.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ` OFFSET $${params.length + 1}`;
      params.push(filters.offset);
    }

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapRowToTeacher(row));
  }

  async create(data: CreateTeacherDTO): Promise<Teacher> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO teachers (id, user_id, display_name, bio, teaching_subjects, teaching_modes, locations, trust_level, verification_status, average_rating, total_reviews, total_students, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        id,
        data.userId,
        data.displayName,
        data.bio || null,
        data.teachingSubjects,
        data.teachingModes,
        data.locations,
        'D', // Default trust level
        'PENDING', // Default verification status
        0, // Default average rating
        0, // Default total reviews
        0, // Default total students
        now,
        now,
      ]
    );

    // Create qualifications if provided
    if (data.qualifications && data.qualifications.length > 0) {
      for (const qual of data.qualifications) {
        await this.addQualification(id, {
          type: qual.type,
          name: qual.name,
          institution: qual.institution,
          year: qual.year,
          fileUrl: qual.fileUrl,
        });
      }
    }

    logger.info('Teacher created', { teacherId: id, userId: data.userId });
    return this.mapRowToTeacher(result.rows[0]);
  }

  async update(id: string, data: UpdateTeacherDTO): Promise<Teacher | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const result = await this.pool.query(
      `UPDATE teachers
       SET display_name = COALESCE($2, display_name),
           bio = COALESCE($3, bio),
           teaching_subjects = COALESCE($4, teaching_subjects),
           teaching_modes = COALESCE($5, teaching_modes),
           locations = COALESCE($6, locations),
           verification_status = COALESCE($7, verification_status),
           average_rating = COALESCE($8, average_rating),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        data.displayName,
        data.bio,
        data.teachingSubjects ? JSON.stringify(data.teachingSubjects) : null,
        data.teachingModes ? JSON.stringify(data.teachingModes) : null,
        data.locations ? JSON.stringify(data.locations) : null,
        data.verificationStatus,
        data.averageRating,
      ]
    );

    if (result.rows.length === 0) return null;

    logger.info('Teacher updated', { teacherId: id });
    return this.mapRowToTeacher(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    // Delete related qualifications first
    await this.pool.query(`DELETE FROM teacher_qualifications WHERE teacher_id = $1`, [id]);
    // Delete teacher-course relationships
    await this.pool.query(`DELETE FROM teacher_courses WHERE teacher_id = $1`, [id]);
    // Delete the teacher
    const result = await this.pool.query(`DELETE FROM teachers WHERE id = $1`, [id]);

    if (result.rowCount && result.rowCount > 0) {
      logger.info('Teacher deleted', { teacherId: id });
      return true;
    }
    return false;
  }

  // ==================== Teacher Verification ====================

  async updateVerificationStatus(
    id: string,
    status: VerificationStatus,
    trustLevel?: TrustLevel
  ): Promise<Teacher | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const result = await this.pool.query(
      `UPDATE teachers
       SET verification_status = $2,
           trust_level = COALESCE($3, trust_level),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, trustLevel]
    );

    if (result.rows.length === 0) return null;

    logger.info('Teacher verification status updated', { teacherId: id, status, trustLevel });
    return this.mapRowToTeacher(result.rows[0]);
  }

  async getVerifiedTeachers(): Promise<Teacher[]> {
    const result = await this.pool.query(
      `SELECT * FROM teachers WHERE verification_status = 'APPROVED' ORDER BY average_rating DESC`
    );
    return result.rows.map(row => this.mapRowToTeacher(row));
  }

  // ==================== Qualifications ====================

  async findQualifications(teacherId: string): Promise<TeacherQualification[]> {
    const result = await this.pool.query(
      `SELECT * FROM teacher_qualifications WHERE teacher_id = $1 ORDER BY created_at DESC`,
      [teacherId]
    );
    return result.rows.map(row => ({
      id: row.id,
      teacher_id: row.teacher_id,
      type: row.type,
      name: row.name,
      institution: row.institution,
      year: row.year,
      file_url: row.file_url,
      status: row.status,
      created_at: row.created_at,
    }));
  }

  async addQualification(
    teacherId: string,
    data: {
      type: 'DEGREE' | 'CERTIFICATE' | 'EXPERIENCE';
      name: string;
      institution?: string;
      year?: number;
      fileUrl?: string;
    }
  ): Promise<TeacherQualification> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO teacher_qualifications (id, teacher_id, type, name, institution, year, file_url, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        teacherId,
        data.type,
        data.name,
        data.institution || null,
        data.year || null,
        data.fileUrl || null,
        'PENDING', // Default status
        now,
      ]
    );

    logger.info('Teacher qualification added', { qualificationId: id, teacherId });
    return {
      id: result.rows[0].id,
      teacher_id: result.rows[0].teacher_id,
      type: result.rows[0].type,
      name: result.rows[0].name,
      institution: result.rows[0].institution,
      year: result.rows[0].year,
      file_url: result.rows[0].file_url,
      status: result.rows[0].status,
      created_at: result.rows[0].created_at,
    };
  }

  async updateQualificationStatus(
    qualificationId: string,
    status: VerificationStatus
  ): Promise<TeacherQualification | null> {
    const result = await this.pool.query(
      `UPDATE teacher_qualifications
       SET status = $2
       WHERE id = $1
       RETURNING *`,
      [qualificationId, status]
    );

    if (result.rows.length === 0) return null;

    logger.info('Qualification status updated', { qualificationId, status });
    return {
      id: result.rows[0].id,
      teacher_id: result.rows[0].teacher_id,
      type: result.rows[0].type,
      name: result.rows[0].name,
      institution: result.rows[0].institution,
      year: result.rows[0].year,
      file_url: result.rows[0].file_url,
      status: result.rows[0].status,
      created_at: result.rows[0].created_at,
    };
  }

  async deleteQualification(qualificationId: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM teacher_qualifications WHERE id = $1`, [
      qualificationId,
    ]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  // ==================== Teacher-Course Relationship ====================

  async findCourses(teacherId: string): Promise<TeacherCourse[]> {
    const result = await this.pool.query(
      `SELECT tc.*, c.title as course_title, c.category as course_category, c.price as course_price
       FROM teacher_courses tc
       LEFT JOIN courses c ON tc.course_id = c.id
       WHERE tc.teacher_id = $1
       ORDER BY tc.created_at DESC`,
      [teacherId]
    );
    return result.rows.map(row => ({
      id: row.id,
      teacher_id: row.teacher_id,
      course_id: row.course_id,
      course_title: row.course_title,
      course_category: row.course_category,
      course_price: row.course_price,
      created_at: row.created_at,
    }));
  }

  async addCourse(
    teacherId: string,
    courseId: string,
    courseTitle?: string,
    courseCategory?: string,
    coursePrice?: number
  ): Promise<TeacherCourse> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO teacher_courses (id, teacher_id, course_id, course_title, course_category, course_price, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        teacherId,
        courseId,
        courseTitle || null,
        courseCategory || null,
        coursePrice || null,
        now,
      ]
    );

    logger.info('Course added to teacher', { teacherCourseId: id, teacherId, courseId });
    return {
      id: result.rows[0].id,
      teacher_id: result.rows[0].teacher_id,
      course_id: result.rows[0].course_id,
      course_title: result.rows[0].course_title,
      course_category: result.rows[0].course_category,
      course_price: result.rows[0].course_price,
      created_at: result.rows[0].created_at,
    };
  }

  async removeCourse(teacherId: string, courseId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM teacher_courses WHERE teacher_id = $1 AND course_id = $2`,
      [teacherId, courseId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateTeacherRating(
    teacherId: string,
    averageRating: number,
    totalReviews: number
  ): Promise<Teacher | null> {
    const result = await this.pool.query(
      `UPDATE teachers
       SET average_rating = $2,
           total_reviews = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [teacherId, averageRating, totalReviews]
    );

    if (result.rows.length === 0) return null;

    logger.info('Teacher rating updated', { teacherId, averageRating, totalReviews });
    return this.mapRowToTeacher(result.rows[0]);
  }

  async incrementStudentCount(teacherId: string): Promise<Teacher | null> {
    const result = await this.pool.query(
      `UPDATE teachers
       SET total_students = total_students + 1,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [teacherId]
    );

    if (result.rows.length === 0) return null;

    return this.mapRowToTeacher(result.rows[0]);
  }

  // ==================== Count & Statistics ====================

  async count(filters?: {
    verificationStatus?: VerificationStatus;
    teachingSubject?: string;
  }): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM teachers WHERE 1=1`;
    const params: (string | VerificationStatus)[] = [];

    if (filters?.verificationStatus) {
      query += ` AND verification_status = $${params.length + 1}`;
      params.push(filters.verificationStatus);
    }

    if (filters?.teachingSubject) {
      query += ` AND $${params.length + 1} = ANY(teaching_subjects)`;
      params.push(filters.teachingSubject);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  // ==================== Helper Methods ====================

  private mapRowToTeacher(row: Record<string, unknown>): Teacher {
    return {
      id: row.id as string,
      user_id: row.user_id as string,
      display_name: row.display_name as string,
      bio: row.bio as string | undefined,
      teaching_subjects: row.teaching_subjects as string[],
      teaching_modes: row.teaching_modes as TeachingMode[],
      locations: row.locations as string[],
      trust_level: row.trust_level as TrustLevel,
      verification_status: row.verification_status as VerificationStatus,
      average_rating: Number(row.average_rating),
      total_reviews: Number(row.total_reviews),
      total_students: Number(row.total_students),
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
    };
  }
}
