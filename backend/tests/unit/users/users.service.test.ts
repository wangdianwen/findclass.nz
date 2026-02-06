/**
 * Users Service Unit Tests - PostgreSQL Version
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock PostgreSQL pool
const mockPool = {
  query: vi.fn(),
  connect: vi.fn(),
};

vi.mock('@shared/db/postgres/client', () => ({
  getPool: vi.fn(() => mockPool),
}));

// Mock logger
vi.mock('@core/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks are set up
import {
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
} from '@modules/users/users.service';

describe('Users Service (PostgreSQL)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return user when user exists', async () => {
      const mockUser = {
        id: 'usr_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'PARENT',
        status: 'ACTIVE',
        language: 'en',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await getUserProfile('usr_123');

      expect(result).toEqual(mockUser);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE id = $1'),
        ['usr_123']
      );
    });

    it('should return null when user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await getUserProfile('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const existingUser = {
        id: 'usr_123',
        email: 'test@example.com',
        name: 'Old Name',
        role: 'PARENT',
        status: 'ACTIVE',
        language: 'en',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updatedUser = {
        ...existingUser,
        name: 'New Name',
        phone: '1234567890',
        language: 'zh',
      };

      // Mock to return appropriate values based on query type
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [existingUser] });
        }
        if (query.includes('UPDATE users')) {
          return Promise.resolve({ rows: [updatedUser] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await updateUserProfile('usr_123', {
        name: 'New Name',
        phone: '1234567890',
        language: 'zh',
      });

      expect(result).toBeDefined();
      expect(result?.name).toBe('New Name');
      expect(result?.phone).toBe('1234567890');
      expect(result?.language).toBe('zh');
    });

    it('should throw error when user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        updateUserProfile('nonexistent', { name: 'New Name' })
      ).rejects.toThrow('User not found');
    });
  });

  describe('getChildren', () => {
    it('should return children list for user', async () => {
      const mockChildren = [
        {
          id: 'child_1',
          user_id: 'usr_123',
          name: 'Child One',
          date_of_birth: '2015-01-01',
          gender: 'MALE',
          school: 'Test School',
          grade: '5',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'child_2',
          user_id: 'usr_123',
          name: 'Child Two',
          date_of_birth: '2018-01-01',
          gender: 'FEMALE',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockChildren });

      const result = await getChildren('usr_123');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Child One');
      expect(result[1].name).toBe('Child Two');
    });

    it('should return empty array when no children', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await getChildren('usr_123');

      expect(result).toEqual([]);
    });
  });

  describe('addChild', () => {
    it('should add child successfully', async () => {
      const mockUser = {
        id: 'usr_123',
        email: 'test@example.com',
        name: 'Parent',
        role: 'PARENT',
        status: 'ACTIVE',
        language: 'en',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockChild = {
        id: 'child_1',
        user_id: 'usr_123',
        name: 'New Child',
        date_of_birth: '2015-01-01',
        gender: 'MALE',
        school: 'Test School',
        grade: '5',
        created_at: new Date(),
        updated_at: new Date(),
      };

      // First query for findById (user check)
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });
      // Second query for insert
      mockPool.query.mockResolvedValueOnce({ rows: [mockChild] });

      const result = await addChild('usr_123', {
        name: 'New Child',
        dateOfBirth: '2015-01-01',
        gender: 'MALE',
        school: 'Test School',
        grade: '5',
      });

      expect(result.name).toBe('New Child');
      expect(result.gender).toBe('MALE');
    });

    it('should throw error when user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        addChild('nonexistent', {
          name: 'Child',
          dateOfBirth: '2015-01-01',
          gender: 'MALE',
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('recordLearning', () => {
    it('should record learning activity successfully', async () => {
      const mockUser = {
        id: 'usr_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'PARENT',
        status: 'ACTIVE',
        language: 'en',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockRecord = {
        id: 'lrn_1',
        user_id: 'usr_123',
        course_id: 'course_1',
        lesson_id: 'lesson_1',
        type: 'LESSON_START',
        duration: 30,
        progress: 0,
        status: 'IN_PROGRESS',
        created_at: new Date(),
        updated_at: new Date(),
      };

      // User check
      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });
      // Insert learning record
      mockPool.query.mockResolvedValueOnce({ rows: [mockRecord] });

      const result = await recordLearning('usr_123', {
        courseId: 'course_1',
        lessonId: 'lesson_1',
        type: 'LESSON_START',
        duration: 30,
        progress: 0,
      });

      expect(result.course_id).toBe('course_1');
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should throw error when user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        recordLearning('nonexistent', {
          courseId: 'course_1',
          type: 'LESSON_START',
          duration: 30,
          progress: 0,
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('getLearningRecords', () => {
    it('should return learning records for user', async () => {
      const mockRecords = [
        {
          id: 'lrn_1',
          user_id: 'usr_123',
          course_id: 'course_1',
          type: 'LESSON_START',
          duration: 30,
          progress: 0,
          status: 'IN_PROGRESS',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'lrn_2',
          user_id: 'usr_123',
          course_id: 'course_1',
          type: 'LESSON_COMPLETE',
          duration: 60,
          progress: 100,
          status: 'COMPLETED',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockRecords });

      const result = await getLearningRecords('usr_123');

      expect(result).toHaveLength(2);
    });

    it('should filter by courseId when provided', async () => {
      const mockRecords = [
        {
          id: 'lrn_1',
          user_id: 'usr_123',
          course_id: 'course_1',
          type: 'LESSON_START',
          duration: 30,
          progress: 0,
          status: 'IN_PROGRESS',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockRecords });

      const result = await getLearningRecords('usr_123', { courseId: 'course_1' });

      expect(result).toHaveLength(1);
      expect(result[0].course_id).toBe('course_1');
    });
  });

  describe('getCourseProgress', () => {
    it('should return course progress when records exist', async () => {
      const mockRecords = [
        {
          id: 'lrn_1',
          user_id: 'usr_123',
          course_id: 'course_1',
          lesson_id: 'lesson_1',
          type: 'LESSON_COMPLETE',
          duration: 60,
          progress: 100,
          status: 'COMPLETED',
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-15'),
        },
        {
          id: 'lrn_2',
          user_id: 'usr_123',
          course_id: 'course_1',
          lesson_id: 'lesson_2',
          type: 'LESSON_START',
          duration: 30,
          progress: 50,
          status: 'IN_PROGRESS',
          created_at: new Date('2024-01-20'),
          updated_at: new Date('2024-01-20'),
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockRecords });

      const result = await getCourseProgress('usr_123', 'course_1');

      expect(result).not.toBeNull();
      expect(result?.courseId).toBe('course_1');
      expect(result?.userId).toBe('usr_123');
      expect(result?.completedLessons).toBe(1);
      expect(result?.progressPercentage).toBe(100);
      expect(result?.status).toBe('COMPLETED');
    });

    it('should return null when no records exist', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await getCourseProgress('usr_123', 'course_nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getLearningStatistics', () => {
    it('should return learning statistics', async () => {
      const mockRecords = [
        {
          id: 'lrn_1',
          user_id: 'usr_123',
          course_id: 'course_1',
          type: 'LESSON_COMPLETE',
          duration: 60,
          progress: 100,
          status: 'COMPLETED',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'lrn_2',
          user_id: 'usr_123',
          course_id: 'course_2',
          type: 'LESSON_COMPLETE',
          duration: 120,
          progress: 100,
          status: 'COMPLETED',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockRecords });

      const result = await getLearningStatistics('usr_123');

      expect(result.userId).toBe('usr_123');
      expect(result.totalLearningTime).toBe(180);
      expect(result.totalCourses).toBe(2);
      expect(result.completedCourses).toBe(2);
      expect(result.completedLessons).toBe(2);
      expect(result.weeklyData).toHaveLength(7);
    });

    it('should return empty statistics when no records', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await getLearningStatistics('usr_123');

      expect(result.totalLearningTime).toBe(0);
      expect(result.totalCourses).toBe(0);
      expect(result.completedCourses).toBe(0);
      expect(result.completedLessons).toBe(0);
      expect(result.weeklyData).toHaveLength(7);
    });
  });

  describe('deleteChild', () => {
    it('should return true when child deleted', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      const result = await deleteChild('child_1');

      expect(result).toBe(true);
    });

    it('should return false when child not found', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 0 });

      const result = await deleteChild('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getFavorites', () => {
    it('should return empty array for now', async () => {
      const result = await getFavorites('usr_123');

      expect(result).toEqual([]);
    });
  });

  describe('generateLearningReport', () => {
    it('should generate learning report', async () => {
      const mockRecords = [
        {
          id: 'lrn_1',
          user_id: 'usr_123',
          course_id: 'course_1',
          type: 'LESSON_COMPLETE',
          duration: 60,
          progress: 100,
          status: 'COMPLETED',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockRecords });

      const result = await generateLearningReport('usr_123');

      expect(result.userId).toBe('usr_123');
      expect(result.generatedAt).toBeDefined();
      expect(result.period).toBeDefined();
      expect(result.statistics).toBeDefined();
      expect(result.courseProgress).toBeDefined();
      expect(result.achievements).toEqual([]);
    });
  });
});
