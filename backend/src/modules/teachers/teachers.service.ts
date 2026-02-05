/**
 * Teachers Module - Service
 */

import { logger } from '@core/logger';
import { Teacher } from '@shared/types';
import { getItem, createEntityKey, queryItems } from '@shared/db/dynamodb';
import { AppError, ErrorCode } from '@core/errors';

export async function getTeacherById(teacherId: string): Promise<Teacher | null> {
  const { PK, SK } = createEntityKey('TEACHER', teacherId);
  return getItem<Teacher>({ PK, SK });
}

export async function getTeacherProfile(teacherId: string): Promise<unknown | null> {
  const teacher = await getTeacherById(teacherId);
  if (!teacher) {
    return null;
  }

  const { PK } = createEntityKey('TEACHER', teacherId);

  const coursesResult = await queryItems({
    keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    expressionAttributeValues: {
      ':pk': PK,
      ':sk': 'COURSE#',
    },
  });

  return {
    id: teacher.id,
    displayName: teacher.displayName,
    bio: teacher.bio,
    teachingSubjects: teacher.teachingSubjects,
    teachingModes: teacher.teachingModes,
    locations: teacher.locations,
    trustLevel: teacher.trustLevel,
    verificationStatus: teacher.verificationStatus,
    averageRating: teacher.averageRating,
    totalReviews: teacher.totalReviews,
    totalStudents: teacher.totalStudents,
    courses: coursesResult.items.map((course: unknown) => ({
      id: (course as { id: string }).id,
      title: (course as { title: string }).title,
      price: (course as { price: number }).price,
      category: (course as { category: string }).category,
    })),
    joinedAt: teacher.createdAt,
  };
}

export async function submitTeacherOnboarding(
  userId: string,
  data: {
    displayName: string;
    bio: string;
    teachingSubjects: string[];
    teachingModes: string[];
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

  throw new AppError(
    'Teacher onboarding feature not yet implemented',
    ErrorCode.INTERNAL_ERROR,
    501
  );
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

  throw new AppError(
    'Qualification upload feature not yet implemented',
    ErrorCode.INTERNAL_ERROR,
    501
  );
}
