/**
 * Teachers Module - Service
 * Teacher profile management with PostgreSQL
 */

import { getPool } from '@shared/db/postgres/client';
import { logger } from '@core/logger';
import type { TrustLevel, VerificationStatus } from '@shared/types';
import { AppError, ErrorCode } from '@core/errors';
import type { TeachingMode } from './teacher.repository';
import {
  TeacherRepository,
  type Teacher,
  type TeacherQualification,
  type TeacherCourse,
} from './teacher.repository';

// ==================== Types ====================

export interface TeacherProfile {
  id: string;
  displayName: string;
  bio?: string;
  teachingSubjects: string[];
  teachingModes: TeachingMode[];
  locations: string[];
  qualifications?: TeacherQualification[];
  trustLevel: TrustLevel;
  verificationStatus: VerificationStatus;
  averageRating: number;
  totalReviews: number;
  totalStudents: number;
  courses?: TeacherCourse[];
  createdAt: Date;
  updatedAt: Date;
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
}

export interface AddQualificationDTO {
  type: 'DEGREE' | 'CERTIFICATE' | 'EXPERIENCE';
  name: string;
  institution?: string;
  year?: number;
  fileUrl?: string;
}

export interface TeacherFilters {
  verificationStatus?: VerificationStatus;
  teachingSubject?: string;
  location?: string;
  minRating?: number;
  limit?: number;
  offset?: number;
}

// ==================== Repository Factory ====================

function getTeacherRepository(): TeacherRepository {
  const pool = getPool();
  return new TeacherRepository(pool);
}

// ==================== CRUD Operations ====================

export async function getTeacherById(teacherId: string): Promise<Teacher | null> {
  logger.info('Getting teacher by ID', { teacherId });
  const repository = getTeacherRepository();
  return repository.findById(teacherId);
}

export async function getTeacherProfile(teacherId: string): Promise<TeacherProfile | null> {
  logger.info('Getting teacher profile', { teacherId });
  const repository = getTeacherRepository();

  const teacher = await repository.findById(teacherId);
  if (!teacher) {
    return null;
  }

  // Fetch qualifications and courses in parallel
  const [qualifications, courses] = await Promise.all([
    repository.findQualifications(teacherId),
    repository.findCourses(teacherId),
  ]);

  return {
    id: teacher.id,
    displayName: teacher.display_name,
    bio: teacher.bio,
    teachingSubjects: teacher.teaching_subjects,
    teachingModes: teacher.teaching_modes,
    locations: teacher.locations,
    qualifications,
    trustLevel: teacher.trust_level,
    verificationStatus: teacher.verification_status,
    averageRating: teacher.average_rating,
    totalReviews: teacher.total_reviews,
    totalStudents: teacher.total_students,
    courses,
    createdAt: teacher.created_at,
    updatedAt: teacher.updated_at,
  };
}

export async function getTeacherByUserId(userId: string): Promise<Teacher | null> {
  logger.info('Getting teacher by user ID', { userId });
  const repository = getTeacherRepository();
  return repository.findByUserId(userId);
}

export async function createTeacher(data: CreateTeacherDTO): Promise<Teacher> {
  logger.info('Creating teacher', { userId: data.userId, displayName: data.displayName });
  const repository = getTeacherRepository();

  // Check if teacher already exists for this user
  const existingTeacher = await repository.findByUserId(data.userId);
  if (existingTeacher) {
    throw new AppError('Teacher profile already exists for this user', ErrorCode.CONFLICT, 409);
  }

  const teachingModes = data.teachingModes.map(mode => mode);

  const teacher = await repository.create({
    userId: data.userId,
    displayName: data.displayName,
    bio: data.bio,
    teachingSubjects: data.teachingSubjects,
    teachingModes,
    locations: data.locations,
    qualifications: data.qualifications,
  });

  logger.info('Teacher created successfully', { teacherId: teacher.id });
  return teacher;
}

export async function updateTeacher(teacherId: string, data: UpdateTeacherDTO): Promise<Teacher> {
  logger.info('Updating teacher', { teacherId, data });
  const repository = getTeacherRepository();

  const teacher = await repository.findById(teacherId);
  if (!teacher) {
    throw new AppError('Teacher not found', ErrorCode.NOT_FOUND, 404);
  }

  const updatedTeacher = await repository.update(teacherId, {
    displayName: data.displayName,
    bio: data.bio,
    teachingSubjects: data.teachingSubjects,
    teachingModes: data.teachingModes as TeachingMode[],
    locations: data.locations,
  });

  if (!updatedTeacher) {
    throw new AppError('Failed to update teacher', ErrorCode.INTERNAL_ERROR, 500);
  }

  return updatedTeacher;
}

export async function deleteTeacher(teacherId: string): Promise<boolean> {
  logger.info('Deleting teacher', { teacherId });
  const repository = getTeacherRepository();

  const teacher = await repository.findById(teacherId);
  if (!teacher) {
    throw new AppError('Teacher not found', ErrorCode.NOT_FOUND, 404);
  }

  const result = await repository.delete(teacherId);
  if (!result) {
    throw new AppError('Failed to delete teacher', ErrorCode.INTERNAL_ERROR, 500);
  }

  logger.info('Teacher deleted successfully', { teacherId });
  return true;
}

export async function listTeachers(filters?: TeacherFilters): Promise<Teacher[]> {
  logger.info('Listing teachers', { filters });
  const repository = getTeacherRepository();
  return repository.findAll(filters);
}

// ==================== Verification Operations ====================

export async function updateVerificationStatus(
  teacherId: string,
  status: VerificationStatus,
  trustLevel?: TrustLevel
): Promise<Teacher> {
  logger.info('Updating teacher verification status', { teacherId, status, trustLevel });
  const repository = getTeacherRepository();

  const teacher = await repository.findById(teacherId);
  if (!teacher) {
    throw new AppError('Teacher not found', ErrorCode.NOT_FOUND, 404);
  }

  const updatedTeacher = await repository.updateVerificationStatus(teacherId, status, trustLevel);

  if (!updatedTeacher) {
    throw new AppError('Failed to update verification status', ErrorCode.INTERNAL_ERROR, 500);
  }

  return updatedTeacher;
}

export async function getVerifiedTeachers(): Promise<Teacher[]> {
  logger.info('Getting verified teachers');
  const repository = getTeacherRepository();
  return repository.getVerifiedTeachers();
}

// ==================== Qualifications Management ====================

export async function getQualifications(teacherId: string): Promise<TeacherQualification[]> {
  logger.info('Getting teacher qualifications', { teacherId });
  const repository = getTeacherRepository();

  const teacher = await repository.findById(teacherId);
  if (!teacher) {
    throw new AppError('Teacher not found', ErrorCode.NOT_FOUND, 404);
  }

  return repository.findQualifications(teacherId);
}

export async function addQualification(
  teacherId: string,
  data: AddQualificationDTO
): Promise<TeacherQualification> {
  logger.info('Adding qualification', { teacherId, data });
  const repository = getTeacherRepository();

  const teacher = await repository.findById(teacherId);
  if (!teacher) {
    throw new AppError('Teacher not found', ErrorCode.NOT_FOUND, 404);
  }

  const qualification = await repository.addQualification(teacherId, {
    type: data.type,
    name: data.name,
    institution: data.institution,
    year: data.year,
    fileUrl: data.fileUrl,
  });

  logger.info('Qualification added successfully', {
    qualificationId: qualification.id,
    teacherId,
  });
  return qualification;
}

export async function updateQualificationStatus(
  qualificationId: string,
  status: VerificationStatus
): Promise<TeacherQualification | null> {
  logger.info('Updating qualification status', { qualificationId, status });
  const repository = getTeacherRepository();
  return repository.updateQualificationStatus(qualificationId, status);
}

export async function deleteQualification(qualificationId: string): Promise<boolean> {
  logger.info('Deleting qualification', { qualificationId });
  const repository = getTeacherRepository();

  const result = await repository.deleteQualification(qualificationId);
  if (!result) {
    throw new AppError('Qualification not found', ErrorCode.NOT_FOUND, 404);
  }

  logger.info('Qualification deleted successfully', { qualificationId });
  return true;
}

// ==================== Teacher-Course Relationships ====================

export async function getTeacherCourses(teacherId: string): Promise<TeacherCourse[]> {
  logger.info('Getting teacher courses', { teacherId });
  const repository = getTeacherRepository();

  const teacher = await repository.findById(teacherId);
  if (!teacher) {
    throw new AppError('Teacher not found', ErrorCode.NOT_FOUND, 404);
  }

  return repository.findCourses(teacherId);
}

export async function addCourseToTeacher(
  teacherId: string,
  courseId: string,
  courseTitle?: string,
  courseCategory?: string,
  coursePrice?: number
): Promise<TeacherCourse> {
  logger.info('Adding course to teacher', { teacherId, courseId });
  const repository = getTeacherRepository();

  const teacher = await repository.findById(teacherId);
  if (!teacher) {
    throw new AppError('Teacher not found', ErrorCode.NOT_FOUND, 404);
  }

  const teacherCourse = await repository.addCourse(
    teacherId,
    courseId,
    courseTitle,
    courseCategory,
    coursePrice
  );

  logger.info('Course added to teacher successfully', {
    teacherCourseId: teacherCourse.id,
    teacherId,
    courseId,
  });
  return teacherCourse;
}

export async function removeCourseFromTeacher(
  teacherId: string,
  courseId: string
): Promise<boolean> {
  logger.info('Removing course from teacher', { teacherId, courseId });
  const repository = getTeacherRepository();

  const teacher = await repository.findById(teacherId);
  if (!teacher) {
    throw new AppError('Teacher not found', ErrorCode.NOT_FOUND, 404);
  }

  const result = await repository.removeCourse(teacherId, courseId);
  if (!result) {
    throw new AppError('Course relationship not found', ErrorCode.NOT_FOUND, 404);
  }

  logger.info('Course removed from teacher successfully', { teacherId, courseId });
  return true;
}

// ==================== Onboarding ====================

export async function submitTeacherOnboarding(
  userId: string,
  data: {
    displayName: string;
    bio: string;
    teachingSubjects: string[];
    teachingModes: TeachingMode[];
    locations: string[];
    qualifications?: Array<{
      type: string;
      name: string;
      institution?: string;
      year?: number;
    }>;
  }
): Promise<{ teacherId: string; status: string; estimatedReviewTime: string }> {
  logger.info('Teacher onboarding submitted', { userId, data });
  const repository = getTeacherRepository();

  const teacher = await repository.create({
    userId,
    displayName: data.displayName,
    bio: data.bio,
    teachingSubjects: data.teachingSubjects,
    teachingModes: data.teachingModes.map(m => m),
    locations: data.locations,
    qualifications: data.qualifications?.map(q => ({
      type: q.type as 'DEGREE' | 'CERTIFICATE' | 'EXPERIENCE',
      name: q.name,
      institution: q.institution,
      year: q.year,
    })),
  });

  return {
    teacherId: teacher.id,
    status: teacher.verification_status,
    estimatedReviewTime: '3-5 business days',
  };
}

export async function uploadQualification(
  teacherId: string,
  data: {
    type: string;
    name: string;
    institution?: string;
    year?: number;
  }
): Promise<{ qualificationId: string; status: string }> {
  logger.info('Qualification uploaded', { teacherId, data });
  const repository = getTeacherRepository();

  const qualification = await repository.addQualification(teacherId, {
    type: data.type as 'DEGREE' | 'CERTIFICATE' | 'EXPERIENCE',
    name: data.name,
    institution: data.institution,
    year: data.year,
  });

  return {
    qualificationId: qualification.id,
    status: qualification.status,
  };
}

// ==================== Statistics & Ratings ====================

export async function updateTeacherRating(
  teacherId: string,
  averageRating: number,
  totalReviews: number
): Promise<Teacher | null> {
  logger.info('Updating teacher rating', { teacherId, averageRating, totalReviews });
  const repository = getTeacherRepository();
  return repository.updateTeacherRating(teacherId, averageRating, totalReviews);
}

export async function incrementStudentCount(teacherId: string): Promise<Teacher | null> {
  logger.info('Incrementing student count', { teacherId });
  const repository = getTeacherRepository();
  return repository.incrementStudentCount(teacherId);
}

export async function countTeachers(filters?: {
  verificationStatus?: VerificationStatus;
  teachingSubject?: string;
}): Promise<number> {
  logger.info('Counting teachers', { filters });
  const repository = getTeacherRepository();
  return repository.count(filters);
}
