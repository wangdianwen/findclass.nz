/**
 * Teachers Service Unit Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { getItem, queryItems, createEntityKey } from '@src/shared/db/dynamodb';

import {
  getTeacherById,
  getTeacherProfile,
  submitTeacherOnboarding,
  uploadQualification,
} from '@src/modules/teachers/teachers.service';
import { Teacher, TrustLevel, VerificationStatus } from '@src/shared/types';
import { resetLoggerMocks } from '../mocks/logger.mock';

const mockTeacher: Teacher = {
  PK: 'TEACHER#t123',
  SK: 'METADATA',
  entityType: 'TEACHER',
  dataCategory: 'TEACHER',
  id: 't123',
  userId: 'usr_t123',
  displayName: 'John Teacher',
  bio: 'Experienced math teacher with 10 years of experience',
  teachingSubjects: ['Mathematics', 'Calculus', 'Statistics'],
  teachingModes: ['ONLINE', 'BOTH'],
  locations: ['Auckland', 'Wellington', 'Christchurch'],
  trustLevel: TrustLevel.A,
  verificationStatus: VerificationStatus.APPROVED,
  averageRating: 4.8,
  totalReviews: 150,
  totalStudents: 50,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('TeachersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLoggerMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTeacherById', () => {
    it('should return teacher when found', async () => {
      (getItem as Mock).mockResolvedValue(mockTeacher);
      (createEntityKey as Mock).mockReturnValue({ PK: 'TEACHER#t123', SK: 'METADATA' });

      const result = await getTeacherById('t123');

      expect(result).toEqual(mockTeacher);
      expect(getItem).toHaveBeenCalledWith({ PK: 'TEACHER#t123', SK: 'METADATA' });
    });

    it('should return null when teacher not found', async () => {
      (getItem as Mock).mockResolvedValue(null);
      (createEntityKey as Mock).mockReturnValue({ PK: 'TEACHER#nonexistent', SK: 'METADATA' });

      const result = await getTeacherById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getTeacherProfile', () => {
    it('should return null when teacher not found', async () => {
      (getItem as Mock).mockResolvedValue(null);
      (createEntityKey as Mock).mockReturnValue({ PK: 'TEACHER#nonexistent', SK: 'METADATA' });

      const result = await getTeacherProfile('nonexistent');

      expect(result).toBeNull();
    });

    it('should return teacher profile with courses', async () => {
      const mockCourse = {
        PK: 'TEACHER#t123',
        SK: 'COURSE#c1',
        entityType: 'COURSE',
        id: 'c1',
        title: 'Math 101',
        price: 50,
        category: 'MATH',
      };

      (getItem as Mock).mockResolvedValueOnce(mockTeacher);
      (createEntityKey as Mock).mockReturnValue({ PK: 'TEACHER#t123', SK: 'METADATA' });
      (queryItems as Mock).mockResolvedValue({ items: [mockCourse] });

      const result = (await getTeacherProfile('t123')) as {
        id: string;
        displayName: string;
        verificationStatus: string;
        courses: unknown[];
      };

      expect(result).toBeDefined();
      expect(result).toMatchObject({
        id: 't123',
        displayName: 'John Teacher',
        verificationStatus: VerificationStatus.APPROVED,
      });
      expect(result.courses).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'c1' })])
      );
    });

    it('should handle teacher with no courses', async () => {
      (getItem as Mock).mockResolvedValueOnce(mockTeacher);
      (createEntityKey as Mock).mockReturnValue({ PK: 'TEACHER#t123', SK: 'METADATA' });
      (queryItems as Mock).mockResolvedValue({ items: [] });

      const result = (await getTeacherProfile('t123')) as { courses: unknown[] };

      expect(result).toBeDefined();
      expect(result.courses).toEqual([]);
    });
  });

  describe('submitTeacherOnboarding', () => {
    it('should throw not implemented error', async () => {
      await expect(
        submitTeacherOnboarding('usr_123', {
          displayName: 'New Teacher',
          bio: 'New teacher bio',
          teachingSubjects: ['English'],
          teachingModes: ['ONLINE'],
          locations: ['Auckland'],
        })
      ).rejects.toThrow('Teacher onboarding feature not yet implemented');
    });
  });

  describe('uploadQualification', () => {
    it('should throw not implemented error', async () => {
      await expect(
        uploadQualification('t123', {
          type: 'DEGREE',
          name: 'Bachelor of Education',
          institution: 'University of Auckland',
          year: 2020,
        })
      ).rejects.toThrow('Qualification upload feature not yet implemented');
    });
  });
});
