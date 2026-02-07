/**
 * Users Module - Service
 * User management business logic with PostgreSQL
 */

import bcrypt from 'bcryptjs';
import { logger } from '@core/logger';
import { AppError, ErrorCode } from '@core/errors';
import { getPool } from '@shared/db/postgres/client';
import { getConfig } from '../../config';
import { UserRepository as AuthUserRepository } from '../auth/user.repository';
import { UserRepository, type User, type UserStatus } from './user.repository';
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
import { NotificationRepository } from './notification.repository';
import type { Notification } from './notification.repository';
import { ReviewRepository } from '../reviews/review.repository';
import type { Review } from '../reviews/types';

// Get pool for direct use
function getAuthUserRepository(): AuthUserRepository {
  return new AuthUserRepository(getPool());
}

function getUserRepository(): UserRepository {
  return new UserRepository(getPool());
}

function getChildRepository(): ChildRepository {
  return new ChildRepository(getPool());
}

function getLearningRecordRepository(): LearningRecordRepository {
  return new LearningRecordRepository(getPool());
}

function getNotificationRepository(): NotificationRepository {
  return new NotificationRepository(getPool());
}

function getReviewRepository(): ReviewRepository {
  return new ReviewRepository(getPool());
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

// ============ NEW METHODS FOR EXTENDED USER FEATURES ============

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  logger.info('Changing password', { userId });

  const authUser = await getAuthUserRepository().findById(userId);
  if (!authUser) {
    throw new AppError('User not found', ErrorCode.USER_NOT_FOUND, 404);
  }

  if (!authUser.password_hash) {
    throw new AppError(
      'Cannot change password for this account type',
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, authUser.password_hash);
  if (!isValidPassword) {
    throw new AppError('Current password is incorrect', ErrorCode.AUTH_INVALID_PASSWORD, 400);
  }

  // Hash new password
  const config = getConfig();
  const newPasswordHash = await bcrypt.hash(newPassword, config.auth.bcryptRounds);

  // Update password
  const pool = getPool();
  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    newPasswordHash,
    userId,
  ]);

  logger.info('Password changed successfully', { userId });
}

/**
 * Deactivate user account (soft delete)
 */
export async function deactivateAccount(userId: string): Promise<void> {
  logger.info('Deactivating account', { userId });

  const user = await getUserRepository().findById(userId);
  if (!user) {
    throw new AppError('User not found', ErrorCode.USER_NOT_FOUND, 404);
  }

  const newStatus: UserStatus = 'DEACTIVATED';

  const pool = getPool();
  await pool.query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2', [
    newStatus,
    userId,
  ]);

  logger.info('Account deactivated', { userId });
}

/**
 * Get child by ID and verify ownership
 */
export async function getChildById(childId: string, userId: string): Promise<Child | null> {
  const child = await getChildRepository().findById(childId);
  if (!child || child.user_id !== userId) {
    return null;
  }
  return child;
}

/**
 * Update child with ownership verification
 */
export async function updateChildById(
  childId: string,
  userId: string,
  data: {
    name?: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE';
    school?: string;
    grade?: string;
    subjects?: string[];
    learningGoals?: string[];
  }
): Promise<Child> {
  logger.info('Updating child', { childId, userId });

  // Verify ownership
  const child = await getChildById(childId, userId);
  if (!child) {
    throw new AppError('Child not found or unauthorized', ErrorCode.NOT_FOUND, 404);
  }

  const updated = await getChildRepository().update(childId, data);
  if (!updated) {
    throw new AppError('Failed to update child', ErrorCode.INTERNAL_ERROR, 500);
  }

  return updated;
}

/**
 * Delete child with ownership verification
 */
export async function deleteChildById(childId: string, userId: string): Promise<void> {
  logger.info('Deleting child', { childId, userId });

  // Verify ownership
  const child = await getChildById(childId, userId);
  if (!child) {
    throw new AppError('Child not found or unauthorized', ErrorCode.NOT_FOUND, 404);
  }

  const deleted = await getChildRepository().delete(childId);
  if (!deleted) {
    throw new AppError('Failed to delete child', ErrorCode.INTERNAL_ERROR, 500);
  }
}

/**
 * Delete learning record by ID
 */
export async function deleteLearningRecordById(recordId: string, userId: string): Promise<void> {
  logger.info('Deleting learning record', { recordId, userId });

  const record = await getLearningRecordRepository().findById(recordId);
  if (!record) {
    throw new AppError('Learning record not found', ErrorCode.NOT_FOUND, 404);
  }

  if (record.user_id !== userId) {
    throw new AppError('Unauthorized to delete this record', ErrorCode.FORBIDDEN, 403);
  }

  const deleted = await getLearningRecordRepository().delete(recordId);
  if (!deleted) {
    throw new AppError('Failed to delete learning record', ErrorCode.INTERNAL_ERROR, 500);
  }
}

// ============ NOTIFICATION METHODS ============

/**
 * Get user notifications
 */
export async function getNotifications(
  userId: string,
  options?: { status?: 'UNREAD' | 'READ'; limit?: number; offset?: number }
): Promise<Notification[]> {
  logger.info('Getting notifications', { userId, options });
  return getNotificationRepository().findByUserId(userId, options);
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return getNotificationRepository().findUnreadCount(userId);
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<void> {
  logger.info('Marking notification as read', { notificationId, userId });

  const notification = await getNotificationRepository().findById(notificationId);
  if (!notification) {
    throw new AppError('Notification not found', ErrorCode.NOT_FOUND, 404);
  }

  if (notification.user_id !== userId) {
    throw new AppError('Unauthorized to modify this notification', ErrorCode.FORBIDDEN, 403);
  }

  const updated = await getNotificationRepository().markAsRead(notificationId);
  if (!updated) {
    throw new AppError('Notification already read or not found', ErrorCode.NOT_FOUND, 404);
  }
}

/**
 * Mark all notifications as read for user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  logger.info('Marking all notifications as read', { userId });
  return getNotificationRepository().markAllAsRead(userId);
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  logger.info('Deleting notification', { notificationId, userId });

  const notification = await getNotificationRepository().findById(notificationId);
  if (!notification) {
    throw new AppError('Notification not found', ErrorCode.NOT_FOUND, 404);
  }

  if (notification.user_id !== userId) {
    throw new AppError('Unauthorized to delete this notification', ErrorCode.FORBIDDEN, 403);
  }

  const deleted = await getNotificationRepository().delete(notificationId);
  if (!deleted) {
    throw new AppError('Failed to delete notification', ErrorCode.INTERNAL_ERROR, 500);
  }
}

// ============ REVIEW METHODS ============

/**
 * Get reviews by user ID
 */
export async function getMyReviews(userId: string): Promise<{ reviews: Review[]; total: number }> {
  logger.info('Getting user reviews', { userId });

  const reviews = await getReviewRepository().findByUserId(userId);
  return {
    reviews,
    total: reviews.length,
  };
}

/**
 * Delete review by ID
 */
export async function deleteReviewById(reviewId: string, userId: string): Promise<void> {
  logger.info('Deleting review', { reviewId, userId });

  const review = await getReviewRepository().findById(reviewId);
  if (!review) {
    throw new AppError('Review not found', ErrorCode.NOT_FOUND, 404);
  }

  if (review.userId !== userId) {
    throw new AppError('Unauthorized to delete this review', ErrorCode.FORBIDDEN, 403);
  }

  // Use soft delete by updating status to DELETED
  const pool = getPool();
  await pool.query(`UPDATE reviews SET status = 'DELETED', updated_at = NOW() WHERE id = $1`, [
    reviewId,
  ]);

  logger.info('Review deleted', { reviewId });
}
