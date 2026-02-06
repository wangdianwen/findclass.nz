/**
 * Users Module - Service
 * User management business logic with PostgreSQL
 */

import { logger } from '@core/logger';
import { AppError, ErrorCode } from '@core/errors';
import { getPool } from '@shared/db/postgres/client';
import { UserRepository } from './user.repository';
import type { User } from './user.repository';
import { ChildRepository } from './child.repository';
import type { Child } from './child.repository';
import type { CreateLearningRecordDTO } from './learning-record.repository';
import { LearningRecordRepository } from './learning-record.repository';
import type {
  LearningRecord,
  LearningProgress,
  LearningStatistics,
  LearningRecordType,
} from './learning-record.repository';

// Get pool for direct use
function getUserRepository(): UserRepository {
  return new UserRepository(getPool());
}

function getChildRepository(): ChildRepository {
  return new ChildRepository(getPool());
}

function getLearningRecordRepository(): LearningRecordRepository {
  return new LearningRecordRepository(getPool());
}

export async function getUserProfile(userId: string): Promise<User | null> {
  logger.info('Getting user profile', { userId });
  return getUserRepository().findById(userId);
}

export async function updateUserProfile(
  userId: string,
  data: { name?: string; phone?: string; language?: string; avatarUrl?: string }
): Promise<User> {
  logger.info('Updating user profile', { userId, data });

  const user = await getUserRepository().findById(userId);
  if (!user) {
    throw new AppError('User not found', ErrorCode.USER_NOT_FOUND, 404);
  }

  const updatedUser = await getUserRepository().update(userId, {
    name: data.name,
    phone: data.phone,
    avatar_url: data.avatarUrl,
    language: data.language as 'zh' | 'en',
  });

  if (!updatedUser) {
    throw new AppError('Failed to update user', ErrorCode.INTERNAL_ERROR, 500);
  }

  return updatedUser;
}

export async function getChildren(userId: string): Promise<Child[]> {
  logger.info('Getting children', { userId });
  return getChildRepository().findByUserId(userId);
}

export async function addChild(
  userId: string,
  data: {
    name: string;
    dateOfBirth: string;
    gender: 'MALE' | 'FEMALE';
    school?: string;
    grade?: string;
    subjects?: string[];
    learningGoals?: string[];
  }
): Promise<Child> {
  logger.info('Adding child', { userId, data });

  const user = await getUserRepository().findById(userId);
  if (!user) {
    throw new AppError('User not found', ErrorCode.USER_NOT_FOUND, 404);
  }

  return getChildRepository().create(userId, {
    name: data.name,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    school: data.school,
    grade: data.grade,
    subjects: data.subjects,
    learningGoals: data.learningGoals,
  });
}

export async function updateChild(
  childId: string,
  data: {
    name?: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE';
    school?: string;
    grade?: string;
    subjects?: string[];
    learningGoals?: string[];
  }
): Promise<Child | null> {
  logger.info('Updating child', { childId, data });
  return getChildRepository().update(childId, data);
}

export async function deleteChild(childId: string): Promise<boolean> {
  logger.info('Deleting child', { childId });
  return getChildRepository().delete(childId);
}

export async function recordParentalConsent(userId: string, childId: string): Promise<void> {
  logger.info('Recording parental consent', { userId, childId });

  const child = await getChildRepository().findById(childId);
  if (!child) {
    throw new AppError('Child not found', ErrorCode.USER_NOT_FOUND, 404);
  }

  if (child.user_id !== userId) {
    throw new AppError('Unauthorized', ErrorCode.FORBIDDEN, 403);
  }

  await getChildRepository().update(childId, { learningGoals: ['PARENTAL_CONSENT_GIVEN'] });
}

export function getFavorites(userId: string): Promise<unknown[]> {
  logger.info('Getting favorites', { userId });
  // Favorites feature not yet implemented
  return Promise.resolve([]);
}

export async function recordLearning(
  userId: string,
  data: {
    courseId: string;
    lessonId?: string;
    type: LearningRecordType;
    duration: number;
    progress: number;
    metadata?: LearningRecord['metadata'];
  }
): Promise<LearningRecord> {
  logger.info('Recording learning activity', { userId, data });

  const user = await getUserRepository().findById(userId);
  if (!user) {
    throw new AppError('User not found', ErrorCode.USER_NOT_FOUND, 404);
  }

  const createData: CreateLearningRecordDTO = {
    courseId: data.courseId,
    lessonId: data.lessonId,
    type: data.type,
    duration: data.duration,
    progress: data.progress,
    metadata: data.metadata,
  };

  return getLearningRecordRepository().create(userId, createData);
}

export async function getLearningRecords(
  userId: string,
  params?: { courseId?: string; limit?: number }
): Promise<LearningRecord[]> {
  logger.info('Getting learning records', { userId, params });
  return getLearningRecordRepository().findByUserId(userId, {
    courseId: params?.courseId,
    limit: params?.limit,
  });
}

export async function getCourseProgress(
  userId: string,
  courseId: string
): Promise<LearningProgress | null> {
  logger.info('Getting course progress', { userId, courseId });
  return getLearningRecordRepository().getProgress(userId, courseId);
}

export async function getLearningStatistics(userId: string): Promise<LearningStatistics> {
  logger.info('Getting learning statistics', { userId });
  return getLearningRecordRepository().getStatistics(userId);
}

// Learning Report interface
export interface LearningReport {
  userId: string;
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  statistics: LearningStatistics;
  courseProgress: LearningProgress[];
  achievements: string[];
}

export async function generateLearningReport(
  userId: string,
  period?: { start: string; end: string }
): Promise<LearningReport> {
  logger.info('Generating learning report', { userId, period });

  const statistics = await getLearningStatistics(userId);

  const records = await getLearningRecordRepository().findByUserId(userId);
  const courseProgressMap = new Map<string, LearningProgress>();

  for (const record of records) {
    if (!courseProgressMap.has(record.course_id)) {
      const progress = await getCourseProgress(userId, record.course_id);
      if (progress) {
        courseProgressMap.set(record.course_id, progress);
      }
    }
  }

  const startDate = period?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = period?.end || new Date().toISOString();

  return {
    userId,
    generatedAt: new Date().toISOString(),
    period: {
      start: startDate,
      end: endDate,
    },
    statistics,
    courseProgress: Array.from(courseProgressMap.values()),
    achievements: [],
  };
}
