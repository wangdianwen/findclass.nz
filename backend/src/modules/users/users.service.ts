/**
 * Users Module - Service
 * User management business logic with PostgreSQL
 */

import { logger } from '@core/logger';
import type {
  User,
  Child,
  LearningRecord,
  LearningProgress,
  LearningStatistics,
  LearningReport,
  LearningRecordType,
} from '@shared/types';
import { ProgressStatus } from '@shared/types';
import { AppError, ErrorCode } from '@core/errors';
import { ChildRepository } from './child.repository';
import type { CreateLearningRecordDTO } from './learning-record.repository';
import { LearningRecordRepository } from './learning-record.repository';
import { UserRepository } from './user.repository';
import type { Pool } from 'pg';

// Factory function to create service with dependencies
export function createUsersService(pool: Pool) {
  const userRepository = new UserRepository(pool);
  const childRepository = new ChildRepository(pool);
  const learningRecordRepository = new LearningRecordRepository(pool);

  async function getUserProfile(userId: string): Promise<User | null> {
    logger.info('Getting user profile', { userId });
    return userRepository.findById(userId);
  }

  async function updateUserProfile(
    userId: string,
    data: { name?: string; phone?: string; language?: string; avatarUrl?: string }
  ): Promise<User> {
    logger.info('Updating user profile', { userId, data });

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', ErrorCode.USER_NOT_FOUND, 404);
    }

    const updatedUser = await userRepository.update(userId, {
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

  async function getChildren(userId: string): Promise<Child[]> {
    logger.info('Getting children', { userId });
    return childRepository.findByUserId(userId);
  }

  async function addChild(
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

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', ErrorCode.USER_NOT_FOUND, 404);
    }

    return childRepository.create(userId, {
      name: data.name,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      school: data.school,
      grade: data.grade,
      subjects: data.subjects,
      learningGoals: data.learningGoals,
    });
  }

  async function updateChild(
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
    return childRepository.update(childId, data);
  }

  async function deleteChild(childId: string): Promise<boolean> {
    logger.info('Deleting child', { childId });
    return childRepository.delete(childId);
  }

  async function recordParentalConsent(userId: string, childId: string): Promise<void> {
    logger.info('Recording parental consent', { userId, childId });

    const child = await childRepository.findById(childId);
    if (!child) {
      throw new AppError('Child not found', ErrorCode.USER_NOT_FOUND, 404);
    }

    if (child.user_id !== userId) {
      throw new AppError('Unauthorized', ErrorCode.FORBIDDEN, 403);
    }

    await childRepository.update(childId, { learningGoals: ['PARENTAL_CONSENT_GIVEN'] });
  }

  async function getFavorites(userId: string): Promise<unknown[]> {
    logger.info('Getting favorites', { userId });
    // Favorites feature not yet implemented
    return [];
  }

  async function recordLearning(
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

    const user = await userRepository.findById(userId);
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

    return learningRecordRepository.create(userId, createData);
  }

  async function getLearningRecords(
    userId: string,
    params?: { courseId?: string; limit?: number }
  ): Promise<LearningRecord[]> {
    logger.info('Getting learning records', { userId, params });
    return learningRecordRepository.findByUserId(userId, {
      courseId: params?.courseId,
      limit: params?.limit,
    });
  }

  async function getCourseProgress(
    userId: string,
    courseId: string
  ): Promise<LearningProgress | null> {
    logger.info('Getting course progress', { userId, courseId });
    return learningRecordRepository.getProgress(userId, courseId);
  }

  async function getLearningStatistics(userId: string): Promise<LearningStatistics> {
    logger.info('Getting learning statistics', { userId });
    return learningRecordRepository.getStatistics(userId);
  }

  async function generateLearningReport(
    userId: string,
    period?: { start: string; end: string }
  ): Promise<LearningReport> {
    logger.info('Generating learning report', { userId, period });

    const statistics = await getLearningStatistics(userId);

    const records = await learningRecordRepository.findByUserId(userId);
    const courseProgressMap = new Map<string, LearningProgress>();

    for (const record of records) {
      if (!courseProgressMap.has(record.course_id)) {
        const progress = await getCourseProgress(userId, record.course_id);
        if (progress) {
          courseProgressMap.set(record.course_id, progress);
        }
      }
    }

    const startDate =
      period?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
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

  return {
    getUserProfile,
    updateUserProfile,
    getChildren,
    addChild,
    updateChild,
    deleteChild,
    recordParentalConsent,
    getFavorites,
    recordLearning,
    getLearningRecords,
    getCourseProgress,
    getLearningStatistics,
    generateLearningReport,
  };
}

// Re-export types for convenience
export type UsersService = ReturnType<typeof createUsersService>;
