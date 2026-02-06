/**
 * Users Module - Service
 * User management business logic
 */

import { logger } from '@core/logger';
import type {
  User,
  Child,
  LearningRecord,
  LearningProgress,
  LearningStatistics,
  LearningReport,
} from '@shared/types';
import { LearningRecordType, ProgressStatus } from '@shared/types';
import { getItem, putItem, queryItems, createEntityKey } from '@shared/db/dynamodb';
import { AppError, ErrorCode } from '@core/errors';
import { v4 as uuidv4 } from 'uuid';

export async function getUserProfile(userId: string): Promise<User | null> {
  const { PK, SK } = createEntityKey('USER', userId);
  return getItem<User>({ PK, SK });
}

export async function updateUserProfile(
  userId: string,
  data: { name?: string; phone?: string; language?: string; avatarUrl?: string }
): Promise<User> {
  logger.info('Updating user profile', { userId, data });

  const { PK, SK } = createEntityKey('USER', userId);
  const user = await getItem<User>({ PK, SK });

  if (!user) {
    throw new AppError('User not found', ErrorCode.USER_NOT_FOUND, 404);
  }

  const updatedUser: User = {
    ...user,
    ...data,
    language: (data.language as 'zh' | 'en') || user.language,
    updatedAt: new Date().toISOString(),
  };

  await putItem(updatedUser as unknown as Record<string, unknown>);

  return updatedUser;
}

export async function getChildren(userId: string): Promise<Child[]> {
  const { PK } = createEntityKey('USER', userId);

  const result = await queryItems<Child>({
    keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    expressionAttributeValues: {
      ':pk': PK,
      ':sk': 'CHILD#',
    },
  });

  return result.items;
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
  return Promise.reject(
    new AppError('Child management feature not yet implemented', ErrorCode.INTERNAL_ERROR, 501)
  );
}

export async function recordParentalConsent(userId: string, childId: string): Promise<void> {
  logger.info('Recording parental consent', { userId, childId });
  return Promise.reject(
    new AppError('Parental consent feature not yet implemented', ErrorCode.INTERNAL_ERROR, 501)
  );
}

export async function getFavorites(userId: string): Promise<unknown[]> {
  logger.info('Getting favorites', { userId });
  return Promise.reject(
    new AppError('Favorites feature not yet implemented', ErrorCode.INTERNAL_ERROR, 501)
  );
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

  const { PK, SK } = createEntityKey('USER', userId);
  const user = await getItem<User>({ PK, SK });

  if (!user) {
    throw new AppError('User not found', ErrorCode.USER_NOT_FOUND, 404);
  }

  const recordId = `LRN#${uuidv4()}`;
  const { PK: recordPK, SK: recordSK } = createEntityKey('USER', userId, recordId);

  const record: LearningRecord = {
    PK: recordPK,
    SK: recordSK,
    entityType: 'LEARNING_RECORD',
    dataCategory: 'USER',
    id: recordId,
    userId,
    courseId: data.courseId,
    lessonId: data.lessonId,
    type: data.type,
    duration: data.duration,
    progress: data.progress,
    status: data.progress >= 100 ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS,
    metadata: data.metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await putItem(record as unknown as Record<string, unknown>);

  return record;
}

export async function getLearningRecords(
  userId: string,
  params?: { courseId?: string; limit?: number }
): Promise<LearningRecord[]> {
  logger.info('Getting learning records', { userId, params });

  const { PK } = createEntityKey('USER', userId);

  let keyConditionExpression = 'PK = :pk AND begins_with(SK, :sk)';
  const expressionAttributeValues: Record<string, unknown> = {
    ':pk': PK,
    ':sk': 'LRN#',
  };

  if (params?.courseId) {
    keyConditionExpression = 'PK = :pk AND SK = :sk';
    expressionAttributeValues[':sk'] = `LRN#${params.courseId}`;
  }

  const result = await queryItems<LearningRecord>({
    keyConditionExpression,
    expressionAttributeValues,
    limit: params?.limit || 50,
    scanIndexForward: false,
  });

  return result.items;
}

export async function getCourseProgress(
  userId: string,
  courseId: string
): Promise<LearningProgress | null> {
  logger.info('Getting course progress', { userId, courseId });

  const { PK } = createEntityKey('USER', userId);

  const result = await queryItems<LearningRecord>({
    keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    expressionAttributeValues: {
      ':pk': PK,
      ':sk': `LRN#${courseId}`,
    },
  });

  if (result.items.length === 0) {
    return null;
  }

  const totalDuration = result.items.reduce((sum, item) => sum + item.duration, 0);
  const completedLessons = result.items.filter(
    item => item.type === LearningRecordType.LESSON_COMPLETE
  ).length;
  const lastActivity = result.items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  const maxLessons = result.items.reduce((max, item) => Math.max(max, item.progress), 0);

  return {
    courseId,
    userId,
    totalDuration,
    completedLessons,
    totalLessons: Math.ceil(maxLessons / 10) || 0,
    progressPercentage: Math.min(100, maxLessons),
    status: maxLessons >= 100 ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS,
    lastActivityAt: lastActivity?.createdAt || new Date().toISOString(),
    startedAt:
      result.items.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )[0]?.createdAt || new Date().toISOString(),
    completedAt: maxLessons >= 100 ? new Date().toISOString() : undefined,
  };
}

export async function getLearningStatistics(userId: string): Promise<LearningStatistics> {
  logger.info('Getting learning statistics', { userId });

  const { PK } = createEntityKey('USER', userId);

  const result = await queryItems<LearningRecord>({
    keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    expressionAttributeValues: {
      ':pk': PK,
      ':sk': 'LRN#',
    },
  });

  const records = result.items;

  const totalLearningTime = records.reduce((sum, item) => sum + item.duration, 0);
  const uniqueCourses = new Set(records.map(item => item.courseId)).size;
  const completedCourses = new Set(
    records.filter(item => item.progress >= 100).map(item => item.courseId)
  ).size;
  const completedLessons = records.filter(
    item => item.type === LearningRecordType.LESSON_COMPLETE
  ).length;

  const weeklyData: LearningStatistics['weeklyData'] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayRecords = records.filter(r => r.createdAt.startsWith(dateStr));
    weeklyData.push({
      date: dateStr,
      duration: dayRecords.reduce((sum, item) => sum + item.duration, 0),
      lessonsCompleted: dayRecords.filter(item => item.type === LearningRecordType.LESSON_COMPLETE)
        .length,
    });
  }

  const progressSum =
    uniqueCourses > 0 ? records.reduce((sum, item) => sum + item.progress, 0) / uniqueCourses : 0;

  const lastActivity = records.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  return {
    userId,
    totalLearningTime,
    totalCourses: uniqueCourses,
    completedCourses,
    totalLessons: completedLessons,
    completedLessons,
    averageProgress: Math.min(100, progressSum),
    lastActivityAt: lastActivity?.createdAt || new Date().toISOString(),
    weeklyData,
  };
}

export async function generateLearningReport(
  userId: string,
  period?: { start: string; end: string }
): Promise<LearningReport> {
  logger.info('Generating learning report', { userId, period });

  const statistics = await getLearningStatistics(userId);

  const { PK } = createEntityKey('USER', userId);

  const result = await queryItems<LearningRecord>({
    keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    expressionAttributeValues: {
      ':pk': PK,
      ':sk': 'LRN#',
    },
  });

  const courseProgressMap = new Map<string, LearningProgress>();

  for (const record of result.items) {
    const existing = courseProgressMap.get(record.courseId);
    if (!existing) {
      const progress = await getCourseProgress(userId, record.courseId);
      if (progress) {
        courseProgressMap.set(record.courseId, progress);
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
