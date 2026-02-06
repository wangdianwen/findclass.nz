/**
 * Courses Service Unit Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryItems, getItem, createEntityKey, batchGetItems } from '@src/shared/db/dynamodb';

import { getFromCache, setCache } from '@src/shared/db/cache';

vi.mock('@src/shared/db/dynamodb', () => ({
  queryItems: vi.fn(),
  getItem: vi.fn(),
  createEntityKey: vi.fn(),
  batchGetItems: vi.fn(),
}));

vi.mock('@src/shared/db/cache', () => ({
  getFromCache: vi.fn(),
  setCache: vi.fn(),
  CacheKeys: {
    search: vi.fn(),
    facet: vi.fn(),
    course: vi.fn(),
    teacher: vi.fn(),
    user: vi.fn(),
    translation: vi.fn(),
    csrf: vi.fn(),
    captcha: vi.fn(),
    verify: vi.fn(),
    rateLimitEmail: vi.fn(),
    rateLimitIP: vi.fn(),
    rateLimitToken: vi.fn(),
    session: vi.fn(),
    roleApplication: vi.fn(),
  },
}));

import {
  searchCourses,
  getCourseById,
  getTeacherById,
  getCourseDetail,
  toggleFavorite,
  getCourseTranslation,
} from '@src/modules/courses/courses.service';
import { SortBy } from '@src/modules/courses/courses.types';
import {
  Teacher,
  Course,
  TrustLevel,
  VerificationStatus,
  CourseCategory,
  PriceType,
  CourseSourceType,
  CourseStatus,
} from '@src/shared/types';

const mockTeacher: Teacher = {
  PK: 'TEACHER#t123',
  SK: 'METADATA',
  entityType: 'TEACHER',
  dataCategory: 'TEACHER',
  id: 't123',
  userId: 'usr_t123',
  displayName: 'John Teacher',
  bio: 'Experienced math teacher',
  teachingSubjects: ['Mathematics', 'Calculus'],
  teachingModes: ['ONLINE', 'BOTH'],
  locations: ['Auckland', 'Wellington'],
  trustLevel: TrustLevel.A,
  verificationStatus: VerificationStatus.APPROVED,
  averageRating: 4.8,
  totalReviews: 150,
  totalStudents: 50,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockCourse: Course = {
  PK: 'COURSE#c123',
  SK: 'METADATA',
  entityType: 'COURSE',
  dataCategory: 'COURSE',
  id: 'c123',
  teacherId: 't123',
  title: 'High School Mathematics',
  titleEn: 'High School Mathematics',
  description: 'Complete math course for high school students',
  descriptionEn: 'Complete math course for high school students',
  price: 99.99,
  priceType: PriceType.PER_SESSION,
  category: CourseCategory.MATH,
  teachingModes: ['ONLINE', 'BOTH'],
  locations: ['Auckland', 'Wellington'],
  targetAgeGroups: ['14-18'],
  maxClassSize: 20,
  currentEnrollment: 10,
  sourceType: CourseSourceType.REGISTERED,
  qualityScore: 85,
  trustLevel: TrustLevel.A,
  averageRating: 4.5,
  totalReviews: 30,
  publishedAt: new Date().toISOString(),
  status: CourseStatus.ACTIVE,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('CoursesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchCourses', () => {
    it('should return cached results if available', async () => {
      const cachedResult = {
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
      vi.mocked(getFromCache).mockResolvedValue(cachedResult);

      const result = await searchCourses({ keyword: 'math' });

      expect(result).toEqual(cachedResult);
      expect(queryItems).not.toHaveBeenCalled();
    });

    it('should search courses with no filters', async () => {
      vi.mocked(getFromCache).mockResolvedValue(null);
      vi.mocked(queryItems).mockResolvedValue({ items: [mockCourse], lastKey: undefined });
      vi.mocked(createEntityKey).mockReturnValue({ PK: 'TEACHER#t123', SK: 'METADATA' });
      vi.mocked(batchGetItems).mockResolvedValue([mockTeacher]);

      const result = await searchCourses({});

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.teacher).toBeDefined();
    });

    it('should filter courses by category', async () => {
      vi.mocked(getFromCache).mockResolvedValue(null);
      vi.mocked(queryItems).mockResolvedValue({ items: [mockCourse], lastKey: undefined });
      vi.mocked(createEntityKey).mockReturnValue({ PK: 'TEACHER#t123', SK: 'METADATA' });
      vi.mocked(batchGetItems).mockResolvedValue([mockTeacher]);

      const result = await searchCourses({ category: CourseCategory.MATH });

      expect(queryItems).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should filter courses by price range', async () => {
      vi.mocked(getFromCache).mockResolvedValue(null);
      vi.mocked(queryItems).mockResolvedValue({ items: [mockCourse], lastKey: undefined });
      vi.mocked(createEntityKey).mockReturnValue({ PK: 'TEACHER#t123', SK: 'METADATA' });
      vi.mocked(batchGetItems).mockResolvedValue([mockTeacher]);

      const result = await searchCourses({ priceMin: 50, priceMax: 150 });

      expect(result).toBeDefined();
      expect(result.items[0]?.price).toBeGreaterThanOrEqual(50);
    });

    it('should sort courses by newest', async () => {
      vi.mocked(getFromCache).mockResolvedValue(null);
      const olderCourse = { ...mockCourse, createdAt: new Date('2024-01-01').toISOString() };
      const newerCourse = {
        ...mockCourse,
        id: 'c456',
        createdAt: new Date('2024-06-01').toISOString(),
      };
      vi.mocked(queryItems).mockResolvedValue({
        items: [olderCourse, newerCourse],
        lastKey: undefined,
      });
      vi.mocked(createEntityKey).mockReturnValue({ PK: 'TEACHER#t123', SK: 'METADATA' });
      vi.mocked(batchGetItems).mockResolvedValue([mockTeacher]);

      const result = await searchCourses({ sortBy: SortBy.NEWEST });

      expect(result.items[0]?.id).toBe('c456');
    });

    it('should sort courses by price ascending', async () => {
      vi.mocked(getFromCache).mockResolvedValue(null);
      const expensiveCourse = { ...mockCourse, id: 'c1', price: 200 };
      const cheapCourse = { ...mockCourse, id: 'c2', price: 50 };
      vi.mocked(queryItems).mockResolvedValue({
        items: [expensiveCourse, cheapCourse],
        lastKey: undefined,
      });
      vi.mocked(createEntityKey).mockReturnValue({ PK: 'TEACHER#t123', SK: 'METADATA' });
      vi.mocked(batchGetItems).mockResolvedValue([mockTeacher]);

      const result = await searchCourses({ sortBy: SortBy.PRICE_ASC });

      expect(result.items[0]?.price).toBe(50);
      expect(result.items[1]?.price).toBe(200);
    });

    it('should sort courses by rating', async () => {
      vi.mocked(getFromCache).mockResolvedValue(null);
      const lowRated = { ...mockCourse, id: 'c1', averageRating: 3 };
      const highRated = { ...mockCourse, id: 'c2', averageRating: 5 };
      vi.mocked(queryItems).mockResolvedValue({
        items: [lowRated, highRated],
        lastKey: undefined,
      });
      vi.mocked(createEntityKey).mockReturnValue({ PK: 'TEACHER#t123', SK: 'METADATA' });
      vi.mocked(batchGetItems).mockResolvedValue([mockTeacher]);

      const result = await searchCourses({ sortBy: SortBy.RATING });

      expect(result.items[0]?.averageRating).toBe(5);
    });

    it('should paginate results correctly', async () => {
      vi.mocked(getFromCache).mockResolvedValue(null);
      const courses = Array.from({ length: 25 }, (_, i) => ({ ...mockCourse, id: `c${i}` }));
      vi.mocked(queryItems).mockResolvedValue({ items: courses, lastKey: undefined });
      vi.mocked(createEntityKey).mockReturnValue({ PK: 'TEACHER#t123', SK: 'METADATA' });
      vi.mocked(batchGetItems).mockResolvedValue([mockTeacher]);

      const result = await searchCourses({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(10);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNextPage).toBe(true);
    });

    it('should handle empty results', async () => {
      vi.mocked(getFromCache).mockResolvedValue(null);
      vi.mocked(queryItems).mockResolvedValue({ items: [], lastKey: undefined });

      const result = await searchCourses({ keyword: 'nonexistent' });

      expect(result.items).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.hasNextPage).toBe(false);
    });

    it('should cache search results', async () => {
      vi.mocked(getFromCache).mockResolvedValue(null);
      vi.mocked(queryItems).mockResolvedValue({ items: [mockCourse], lastKey: undefined });
      vi.mocked(createEntityKey).mockReturnValue({ PK: 'TEACHER#t123', SK: 'METADATA' });
      vi.mocked(batchGetItems).mockResolvedValue([mockTeacher]);
      vi.mocked(setCache).mockResolvedValue(undefined);

      await searchCourses({ keyword: 'math' });

      expect(setCache).toHaveBeenCalled();
    });
  });

  describe('getCourseById', () => {
    it('should return course when found', async () => {
      vi.mocked(getItem).mockResolvedValue(mockCourse);
      vi.mocked(createEntityKey).mockReturnValue({ PK: 'COURSE#c123', SK: 'METADATA' });

      const result = await getCourseById('c123');

      expect(result).toEqual(mockCourse);
      expect(getItem).toHaveBeenCalled();
    });

    it('should return null when course not found', async () => {
      vi.mocked(getItem).mockResolvedValue(null);
      vi.mocked(createEntityKey).mockReturnValue({ PK: 'COURSE#nonexistent', SK: 'METADATA' });

      const result = await getCourseById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getTeacherById', () => {
    it('should return teacher when found', async () => {
      vi.mocked(getItem).mockResolvedValue(mockTeacher);
      vi.mocked(createEntityKey).mockReturnValue({ PK: 'TEACHER#t123', SK: 'METADATA' });

      const result = await getTeacherById('t123');

      expect(result).toEqual(mockTeacher);
    });

    it('should return null when teacher not found', async () => {
      vi.mocked(getItem).mockResolvedValue(null);
      vi.mocked(createEntityKey).mockReturnValue({ PK: 'TEACHER#nonexistent', SK: 'METADATA' });

      const result = await getTeacherById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getCourseDetail', () => {
    it('should return null when course not found', async () => {
      vi.mocked(getItem).mockResolvedValue(null);
      vi.mocked(createEntityKey).mockReturnValue({ PK: 'COURSE#nonexistent', SK: 'METADATA' });

      const result = await getCourseDetail('nonexistent');

      expect(result).toBeNull();
    });

    it('should return course detail with teacher', async () => {
      vi.mocked(getItem).mockResolvedValueOnce(mockCourse).mockResolvedValueOnce(mockTeacher);
      vi.mocked(createEntityKey)
        .mockReturnValueOnce({ PK: 'COURSE#c123', SK: 'METADATA' })
        .mockReturnValueOnce({ PK: 'TEACHER#t123', SK: 'METADATA' });

      const result = await getCourseDetail('c123');

      expect(result).toBeDefined();
      expect((result as { teacher: { id: string } }).teacher.id).toBe('t123');
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle favorite status', async () => {
      const result = await toggleFavorite('usr_123', 'c123');

      expect(result).toBeDefined();
      expect(result.favorited).toBe(true);
    });
  });

  describe('getCourseTranslation', () => {
    it('should return cached translation if available', async () => {
      const cachedTranslation = {
        title: '数学',
        description: '完整的高中数学课程',
        translatedAt: new Date().toISOString(),
      };
      vi.mocked(getFromCache).mockResolvedValue(cachedTranslation);

      const result = await getCourseTranslation('c123', 'zh');

      expect(result).toEqual(cachedTranslation);
    });

    it('should return English translation when target is en', async () => {
      vi.mocked(getFromCache).mockResolvedValue(null);
      vi.mocked(getItem).mockResolvedValue(mockCourse);
      vi.mocked(createEntityKey).mockReturnValue({ PK: 'COURSE#c123', SK: 'METADATA' });

      const result = await getCourseTranslation('c123', 'en');

      expect(result).toBeDefined();
      expect(result?.title).toBe(mockCourse.titleEn || mockCourse.title);
    });

    it('should return null when course not found', async () => {
      vi.mocked(getFromCache).mockResolvedValue(null);
      vi.mocked(getItem).mockResolvedValue(null);
      vi.mocked(createEntityKey).mockReturnValue({ PK: 'COURSE#nonexistent', SK: 'METADATA' });

      const result = await getCourseTranslation('nonexistent', 'zh');

      expect(result).toBeNull();
    });

    it('should cache translation', async () => {
      vi.mocked(getFromCache).mockResolvedValue(null);
      vi.mocked(getItem).mockResolvedValue(mockCourse);
      vi.mocked(createEntityKey).mockReturnValue({ PK: 'COURSE#c123', SK: 'METADATA' });
      vi.mocked(setCache).mockResolvedValue(undefined);

      await getCourseTranslation('c123', 'zh');

      expect(setCache).toHaveBeenCalled();
    });
  });
});
