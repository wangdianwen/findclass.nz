/**
 * Courses Service Unit Tests - PostgreSQL Version
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Pool } from 'pg';

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
import { createCoursesService } from '@modules/courses/courses.service';
import {
  CourseCategory,
  CourseSourceType,
  CourseStatus,
  PriceType,
  TrustLevel,
  VerificationStatus,
} from '@shared/types';
import { SortBy } from '@modules/courses/courses.types';

describe('Courses Service (PostgreSQL)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Mock Data ====================

  const mockTeacher = {
    id: 'teacher_123',
    user_id: 'user_123',
    display_name: 'Test Teacher',
    bio: 'Experienced teacher',
    teaching_subjects: ['MATH'],
    teaching_modes: ['ONLINE', 'OFFLINE'],
    locations: ['Auckland'],
    trust_level: TrustLevel.A,
    verification_status: VerificationStatus.APPROVED,
    average_rating: 4.8,
    total_reviews: 50,
    total_students: 200,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockCourse = {
    id: 'course_123',
    teacher_id: 'teacher_123',
    title: 'Math Course',
    title_en: 'Math Course EN',
    description: 'A comprehensive math course',
    description_en: 'A comprehensive math course in English',
    category: CourseCategory.MATH,
    subcategory: 'Algebra',
    price: 50,
    price_type: PriceType.PER_HOUR,
    teaching_modes: ['ONLINE'],
    locations: ['Auckland'],
    target_age_groups: ['10-15'],
    max_class_size: 20,
    current_enrollment: 5,
    source_type: CourseSourceType.REGISTERED,
    source_url: undefined,
    quality_score: 85,
    trust_level: TrustLevel.A,
    average_rating: 4.5,
    total_reviews: 10,
    published_at: new Date(),
    expires_at: undefined,
    status: CourseStatus.ACTIVE,
    created_at: new Date(),
    updated_at: new Date(),
  };

  // ==================== getCourseById ====================

  describe('getCourseById', () => {
    it('should return course when course exists', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockCourse] });

      const { getCourseById } = createCoursesService(mockPool as unknown as Pool);
      const result = await getCourseById('course_123');

      expect(result).toEqual(mockCourse);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM courses WHERE id = $1'),
        ['course_123']
      );
    });

    it('should return null when course not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const { getCourseById } = createCoursesService(mockPool as unknown as Pool);
      const result = await getCourseById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ==================== getCourseDetail ====================

  describe('getCourseDetail', () => {
    it('should return course with teacher details when course exists', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM courses WHERE id = $1')) {
          return Promise.resolve({ rows: [mockCourse] });
        }
        if (query.includes('SELECT * FROM teachers WHERE id = $1')) {
          return Promise.resolve({ rows: [mockTeacher] });
        }
        return Promise.resolve({ rows: [] });
      });

      const { getCourseDetail } = createCoursesService(mockPool as unknown as Pool);
      const result = await getCourseDetail('course_123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('course_123');
      expect(result?.teacher).toBeDefined();
      expect(result?.teacher?.id).toBe('teacher_123');
      expect(result?.teacher?.displayName).toBe('Test Teacher');
      expect(result?.timeSlots).toEqual([]);
      expect(result?.reviews).toBeDefined();
    });

    it('should return null when course not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const { getCourseDetail } = createCoursesService(mockPool as unknown as Pool);
      const result = await getCourseDetail('nonexistent');

      expect(result).toBeNull();
    });

    it('should return teacher as null when teacher not found', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM courses WHERE id = $1')) {
          return Promise.resolve({ rows: [mockCourse] });
        }
        if (query.includes('SELECT * FROM teachers WHERE id = $1')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const { getCourseDetail } = createCoursesService(mockPool as unknown as Pool);
      const result = await getCourseDetail('course_123');

      expect(result).toBeDefined();
      expect(result?.teacher).toBeNull();
    });
  });

  // ==================== createCourse ====================

  describe('createCourse', () => {
    it('should create course successfully', async () => {
      const createInput = {
        teacherId: 'teacher_123',
        title: 'New Math Course',
        titleEn: 'New Math Course EN',
        description: 'A new math course',
        descriptionEn: 'A new math course in English',
        category: CourseCategory.MATH as CourseCategory,
        subcategory: 'Calculus',
        price: 75,
        priceType: PriceType.PER_HOUR as PriceType,
        teachingModes: ['ONLINE', 'OFFLINE'] as ('ONLINE' | 'OFFLINE' | 'BOTH')[],
        locations: ['Wellington'],
        targetAgeGroups: ['15-18'],
        maxClassSize: 15,
        sourceType: CourseSourceType.REGISTERED,
        sourceUrl: undefined,
      };

      const createdCourse = {
        ...mockCourse,
        id: 'course_new_123',
        title: createInput.title,
        description: createInput.description,
        price: createInput.price,
      };

      const teacherCourseLink = {
        id: 'tc_123',
        teacher_id: 'teacher_123',
        course_id: 'course_new_123',
        course_title: createInput.title,
        course_category: CourseCategory.MATH,
        course_price: createInput.price,
        created_at: new Date(),
      };

      // Mock teacher check
      mockPool.query.mockResolvedValueOnce({ rows: [mockTeacher] });
      // Mock course creation - INSERT query returns the created course
      mockPool.query.mockResolvedValueOnce({ rows: [createdCourse] });
      // Mock addCourse - must return rows with proper structure
      mockPool.query.mockResolvedValueOnce({ rows: [teacherCourseLink] });

      const { createCourse } = createCoursesService(mockPool as unknown as Pool);
      const result = await createCourse(createInput);

      expect(result).toBeDefined();
      expect(result.title).toBe('New Math Course');
      expect(result.price).toBe(75);
    });

    it('should throw error when teacher not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const { createCourse } = createCoursesService(mockPool as unknown as Pool);

      await expect(
        createCourse({
          teacherId: 'nonexistent',
          title: 'Test Course',
          description: 'Test description',
          category: CourseCategory.MATH,
          price: 50,
          priceType: PriceType.PER_HOUR,
          teachingModes: ['ONLINE'],
          locations: ['Auckland'],
          targetAgeGroups: ['10-15'],
          maxClassSize: 20,
        })
      ).rejects.toThrow('Teacher not found');
    });
  });

  // ==================== updateCourse ====================

  describe('updateCourse', () => {
    it('should update course successfully', async () => {
      const updatedCourse = {
        ...mockCourse,
        title: 'Updated Math Course',
        price: 60,
      };

      // The update method in repository calls findById internally, so we need 3 mocks:
      // 1. Service findById for existence check
      // 2. Repository update's findById call
      // 3. Repository UPDATE query
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockCourse] }) // Service: findById
        .mockResolvedValueOnce({ rows: [mockCourse] }) // Repository: findById in update
        .mockResolvedValueOnce({ rows: [updatedCourse] }); // Repository: UPDATE

      const { updateCourse } = createCoursesService(mockPool as unknown as Pool);
      const result = await updateCourse('course_123', {
        title: 'Updated Math Course',
        price: 60,
      });

      expect(result).toBeDefined();
      expect(result?.title).toBe('Updated Math Course');
      expect(result?.price).toBe(60);
    });

    it('should throw error when course not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const { updateCourse } = createCoursesService(mockPool as unknown as Pool);

      await expect(updateCourse('nonexistent', { title: 'New Title' })).rejects.toThrow(
        'Course not found'
      );
    });

    it('should update multiple fields', async () => {
      const updatedCourse = {
        ...mockCourse,
        title: 'New Title',
        description: 'New description',
        price: 100,
        status: CourseStatus.INACTIVE,
      };

      // 3 mocks: Service findById, Repository findById, Repository UPDATE
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockCourse] }) // Service: findById
        .mockResolvedValueOnce({ rows: [mockCourse] }) // Repository: findById in update
        .mockResolvedValueOnce({ rows: [updatedCourse] }); // Repository: UPDATE

      const { updateCourse } = createCoursesService(mockPool as unknown as Pool);
      const result = await updateCourse('course_123', {
        title: 'New Title',
        description: 'New description',
        price: 100,
        status: CourseStatus.INACTIVE,
      });

      expect(result).toBeDefined();
      expect(result?.title).toBe('New Title');
      expect(result?.description).toBe('New description');
      expect(result?.price).toBe(100);
      expect(result?.status).toBe(CourseStatus.INACTIVE);
    });
  });

  // ==================== deleteCourse ====================

  describe('deleteCourse', () => {
    it('should return true when course deleted successfully', async () => {
      // Mock findById for existence check
      mockPool.query.mockResolvedValueOnce({ rows: [mockCourse] });
      // Mock removeCourse
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // Mock delete
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const { deleteCourse } = createCoursesService(mockPool as unknown as Pool);
      const result = await deleteCourse('course_123');

      expect(result).toBe(true);
    });

    it('should throw error when course not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const { deleteCourse } = createCoursesService(mockPool as unknown as Pool);

      await expect(deleteCourse('nonexistent')).rejects.toThrow('Course not found');
    });
  });

  // ==================== getCoursesByTeacher ====================

  describe('getCoursesByTeacher', () => {
    it('should return courses for teacher', async () => {
      const mockCourses = [
        mockCourse,
        { ...mockCourse, id: 'course_456', title: 'Physics Course' },
      ];

      mockPool.query.mockResolvedValue({ rows: mockCourses });

      const { getCoursesByTeacher } = createCoursesService(mockPool as unknown as Pool);
      const result = await getCoursesByTeacher('teacher_123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('course_123');
      expect(result[1].id).toBe('course_456');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM courses WHERE teacher_id = $1'),
        ['teacher_123']
      );
    });

    it('should return empty array when teacher has no courses', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const { getCoursesByTeacher } = createCoursesService(mockPool as unknown as Pool);
      const result = await getCoursesByTeacher('teacher_no_courses');

      expect(result).toEqual([]);
    });
  });

  // ==================== searchCourses ====================

  describe('searchCourses', () => {
    it('should search courses with keyword', async () => {
      const mockCourses = [mockCourse];

      // Mock search query
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        if (query.includes('SELECT *') && query.includes('FROM courses')) {
          return Promise.resolve({ rows: mockCourses });
        }
        if (query.includes('FROM teachers')) {
          return Promise.resolve({ rows: [mockTeacher] });
        }
        return Promise.resolve({ rows: [] });
      });

      const { searchCourses } = createCoursesService(mockPool as unknown as Pool);
      const result = await searchCourses({
        keyword: 'math',
        category: CourseCategory.MATH,
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should search courses with filters', async () => {
      const mockCourses = [mockCourse];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        if (query.includes('SELECT *') && query.includes('FROM courses')) {
          return Promise.resolve({ rows: mockCourses });
        }
        if (query.includes('FROM teachers')) {
          return Promise.resolve({ rows: [mockTeacher] });
        }
        return Promise.resolve({ rows: [] });
      });

      const { searchCourses } = createCoursesService(mockPool as unknown as Pool);
      const result = await searchCourses({
        keyword: 'math',
        category: CourseCategory.MATH,
        city: 'Auckland',
        priceMin: 0,
        priceMax: 100,
        ratingMin: 4.0,
        trustLevel: TrustLevel.A,
        teachingMode: 'ONLINE',
        sortBy: SortBy.RATING,
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasNextPage).toBe(false);
    });

    it('should return empty results when no courses match', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '0' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const { searchCourses } = createCoursesService(mockPool as unknown as Pool);
      const result = await searchCourses({
        keyword: 'nonexistent',
        category: CourseCategory.MUSIC,
      });

      expect(result.items).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      const mockCourses = Array.from({ length: 20 }, (_, i) => ({
        ...mockCourse,
        id: `course_${i}`,
      }));

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '50' }] });
        }
        if (query.includes('SELECT *') && query.includes('FROM courses')) {
          return Promise.resolve({ rows: mockCourses });
        }
        if (query.includes('FROM teachers')) {
          return Promise.resolve({ rows: [mockTeacher] });
        }
        return Promise.resolve({ rows: [] });
      });

      const { searchCourses } = createCoursesService(mockPool as unknown as Pool);
      const result = await searchCourses({
        page: 2,
        limit: 20,
      });

      expect(result.items).toHaveLength(20);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPrevPage).toBe(true);
    });

    it('should include teacher info in search results', async () => {
      const mockCourses = [mockCourse];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        if (query.includes('SELECT *') && query.includes('FROM courses')) {
          return Promise.resolve({ rows: mockCourses });
        }
        if (query.includes('FROM teachers')) {
          return Promise.resolve({ rows: [mockTeacher] });
        }
        return Promise.resolve({ rows: [] });
      });

      const { searchCourses } = createCoursesService(mockPool as unknown as Pool);
      const result = await searchCourses({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].teacher).toBeDefined();
      expect(result.items[0].teacher?.id).toBe('teacher_123');
      expect(result.items[0].teacher?.displayName).toBe('Test Teacher');
    });
  });

  // ==================== getCourseStatistics ====================

  describe('getCourseStatistics', () => {
    it('should return statistics for all courses', async () => {
      let queryCallCount = 0;

      mockPool.query.mockImplementation((query: string) => {
        queryCallCount++;
        // First query is the stats aggregation query
        if (queryCallCount === 1) {
          return Promise.resolve({
            rows: [
              {
                total_courses: '10',
                active_courses: '8',
                avg_rating: '4.5',
                total_reviews: '100',
                avg_price: '60',
              },
            ],
          });
        }
        // Second query is the category distribution query
        if (query.includes('GROUP BY category')) {
          return Promise.resolve({
            rows: [
              { category: 'MATH', count: '5' },
              { category: 'MUSIC', count: '3' },
              { category: 'ART', count: '2' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const { getCourseStatistics } = createCoursesService(mockPool as unknown as Pool);
      const result = await getCourseStatistics();

      expect(result.totalCourses).toBe(10);
      expect(result.activeCourses).toBe(8);
      expect(result.averageRating).toBe(4.5);
      expect(result.totalReviews).toBe(100);
      expect(result.averagePrice).toBe(60);
      expect(result.categoryDistribution).toHaveLength(3);
    });

    it('should return statistics for specific teacher', async () => {
      let queryCallCount = 0;

      mockPool.query.mockImplementation((query: string) => {
        queryCallCount++;
        // First query is the stats aggregation query with teacher filter
        if (queryCallCount === 1) {
          return Promise.resolve({
            rows: [
              {
                total_courses: '5',
                active_courses: '4',
                avg_rating: '4.8',
                total_reviews: '50',
                avg_price: '75',
              },
            ],
          });
        }
        // Second query is the category distribution query with teacher filter
        if (query.includes('GROUP BY category')) {
          return Promise.resolve({
            rows: [
              { category: 'MATH', count: '3' },
              { category: 'PHYSICS', count: '2' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const { getCourseStatistics } = createCoursesService(mockPool as unknown as Pool);
      const result = await getCourseStatistics('teacher_123');

      expect(result.totalCourses).toBe(5);
      expect(result.activeCourses).toBe(4);
      expect(result.categoryDistribution).toHaveLength(2);
    });

    it('should return zeros when no courses exist', async () => {
      let queryCallCount = 0;

      mockPool.query.mockImplementation((query: string) => {
        queryCallCount++;
        // First query is the stats aggregation query
        if (queryCallCount === 1) {
          return Promise.resolve({
            rows: [
              {
                total_courses: '0',
                active_courses: '0',
                avg_rating: null,
                total_reviews: '0',
                avg_price: null,
              },
            ],
          });
        }
        // Second query is the category distribution query
        if (query.includes('GROUP BY category')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const { getCourseStatistics } = createCoursesService(mockPool as unknown as Pool);
      const result = await getCourseStatistics();

      expect(result.totalCourses).toBe(0);
      expect(result.activeCourses).toBe(0);
      expect(result.averageRating).toBe(0);
      expect(result.totalReviews).toBe(0);
      expect(result.averagePrice).toBe(0);
      expect(result.categoryDistribution).toEqual([]);
    });
  });

  // ==================== getFeaturedCourses ====================

  describe('getFeaturedCourses', () => {
    it('should return featured courses', async () => {
      const mockCourses = [
        { ...mockCourse, id: 'course_1', average_rating: 4.9 },
        { ...mockCourse, id: 'course_2', average_rating: 4.8 },
      ];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '2' }] });
        }
        if (query.includes('SELECT *') && query.includes('FROM courses')) {
          return Promise.resolve({ rows: mockCourses });
        }
        return Promise.resolve({ rows: [] });
      });

      const { getFeaturedCourses } = createCoursesService(mockPool as unknown as Pool);
      const result = await getFeaturedCourses(10);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('course_1');
    });

    it('should use default limit', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '0' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const { getFeaturedCourses } = createCoursesService(mockPool as unknown as Pool);
      await getFeaturedCourses();

      // Verify the query was called with default limit
      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  // ==================== getRecentCourses ====================

  describe('getRecentCourses', () => {
    it('should return recent courses', async () => {
      const mockCourses = [
        { ...mockCourse, id: 'course_new' },
        { ...mockCourse, id: 'course_new2' },
      ];

      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '2' }] });
        }
        if (query.includes('SELECT *') && query.includes('FROM courses')) {
          return Promise.resolve({ rows: mockCourses });
        }
        return Promise.resolve({ rows: [] });
      });

      const { getRecentCourses } = createCoursesService(mockPool as unknown as Pool);
      const result = await getRecentCourses(10);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('course_new');
    });

    it('should return empty array when no recent courses', async () => {
      mockPool.query.mockImplementation((query: string) => {
        if (query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '0' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const { getRecentCourses } = createCoursesService(mockPool as unknown as Pool);
      const result = await getRecentCourses(10);

      expect(result).toEqual([]);
    });
  });

  // ==================== incrementEnrollment ====================

  describe('incrementEnrollment', () => {
    it('should increment enrollment successfully', async () => {
      const updatedCourse = {
        ...mockCourse,
        current_enrollment: 6,
      };

      mockPool.query.mockResolvedValue({ rows: [updatedCourse] });

      const { incrementEnrollment } = createCoursesService(mockPool as unknown as Pool);
      const result = await incrementEnrollment('course_123');

      expect(result).toBeDefined();
      expect(result?.current_enrollment).toBe(6);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('current_enrollment = current_enrollment + 1'),
        ['course_123']
      );
    });

    it('should return null when course not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const { incrementEnrollment } = createCoursesService(mockPool as unknown as Pool);
      const result = await incrementEnrollment('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when class is full (enrollment equals max class size)', async () => {
      // When class is full, the query condition `current_enrollment < max_class_size` fails
      // so no rows are returned
      mockPool.query.mockResolvedValue({ rows: [] });

      const { incrementEnrollment } = createCoursesService(mockPool as unknown as Pool);
      const result = await incrementEnrollment('course_full');

      expect(result).toBeNull();
    });
  });

  // ==================== decrementEnrollment ====================

  describe('decrementEnrollment', () => {
    it('should decrement enrollment successfully', async () => {
      const updatedCourse = {
        ...mockCourse,
        current_enrollment: 4,
      };

      mockPool.query.mockResolvedValue({ rows: [updatedCourse] });

      const { decrementEnrollment } = createCoursesService(mockPool as unknown as Pool);
      const result = await decrementEnrollment('course_123');

      expect(result).toBeDefined();
      expect(result?.current_enrollment).toBe(4);
    });

    it('should not go below zero', async () => {
      const emptyCourse = { ...mockCourse, current_enrollment: 0 };
      mockPool.query.mockResolvedValue({ rows: [emptyCourse] });

      const { decrementEnrollment } = createCoursesService(mockPool as unknown as Pool);
      const result = await decrementEnrollment('course_empty');

      expect(result).toBeDefined();
      expect(result?.current_enrollment).toBe(0);
    });

    it('should return null when course not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const { decrementEnrollment } = createCoursesService(mockPool as unknown as Pool);
      const result = await decrementEnrollment('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ==================== updateCourseRating ====================

  describe('updateCourseRating', () => {
    it('should update course rating successfully', async () => {
      const updatedCourse = {
        ...mockCourse,
        average_rating: 4.8,
        total_reviews: 15,
      };

      mockPool.query.mockResolvedValue({ rows: [updatedCourse] });

      const { updateCourseRating } = createCoursesService(mockPool as unknown as Pool);
      const result = await updateCourseRating('course_123', 4.8, 15);

      expect(result).toBeDefined();
      expect(result?.average_rating).toBe(4.8);
      expect(result?.total_reviews).toBe(15);
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE courses'), [
        4.8,
        15,
        'course_123',
      ]);
    });

    it('should return null when course not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const { updateCourseRating } = createCoursesService(mockPool as unknown as Pool);
      const result = await updateCourseRating('nonexistent', 4.5, 10);

      expect(result).toBeNull();
    });
  });

  // ==================== toggleFavorite ====================

  describe('toggleFavorite', () => {
    it('should return favorited status', async () => {
      const { toggleFavorite } = createCoursesService(mockPool as unknown as Pool);
      const result = await toggleFavorite('user_123', 'course_123');

      expect(result).toEqual({ favorited: true });
    });
  });

  // ==================== getCourseTranslation ====================

  describe('getCourseTranslation', () => {
    it('should return Chinese translation', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockCourse] });

      const { getCourseTranslation } = createCoursesService(mockPool as unknown as Pool);
      const result = await getCourseTranslation('course_123', 'zh');

      expect(result).toBeDefined();
      expect(result?.title).toBe('Math Course');
      expect(result?.description).toBe('A comprehensive math course');
      expect(result?.translatedAt).toBeDefined();
    });

    it('should return English translation when available', async () => {
      mockPool.query.mockResolvedValue({ rows: [mockCourse] });

      const { getCourseTranslation } = createCoursesService(mockPool as unknown as Pool);
      const result = await getCourseTranslation('course_123', 'en');

      expect(result).toBeDefined();
      expect(result?.title).toBe('Math Course EN');
      expect(result?.description).toBe('A comprehensive math course in English');
    });

    it('should fallback to Chinese when English not available', async () => {
      const courseWithoutEn = { ...mockCourse, title_en: undefined, description_en: undefined };
      mockPool.query.mockResolvedValue({ rows: [courseWithoutEn] });

      const { getCourseTranslation } = createCoursesService(mockPool as unknown as Pool);
      const result = await getCourseTranslation('course_123', 'en');

      expect(result).toBeDefined();
      expect(result?.title).toBe('Math Course');
      expect(result?.description).toBe('A comprehensive math course');
    });

    it('should return null when course not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const { getCourseTranslation } = createCoursesService(mockPool as unknown as Pool);
      const result = await getCourseTranslation('nonexistent', 'zh');

      expect(result).toBeNull();
    });
  });

  // ==================== Error Cases ====================

  describe('Error Handling', () => {
    it('should throw error for invalid course ID format', async () => {
      mockPool.query.mockRejectedValue(new Error('invalid input syntax for uuid'));

      const { getCourseById } = createCoursesService(mockPool as unknown as Pool);

      await expect(getCourseById('invalid-id')).rejects.toThrow();
    });

    it('should handle database connection errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection refused'));

      const { getCourseById } = createCoursesService(mockPool as unknown as Pool);

      await expect(getCourseById('course_123')).rejects.toThrow('Connection refused');
    });

    it('should handle transaction errors gracefully', async () => {
      // Mock teacher check passes
      mockPool.query.mockResolvedValueOnce({ rows: [mockTeacher] });
      // Mock create fails
      mockPool.query.mockRejectedValueOnce(new Error('Duplicate key'));

      const { createCourse } = createCoursesService(mockPool as unknown as Pool);

      await expect(
        createCourse({
          teacherId: 'teacher_123',
          title: 'Duplicate Course',
          description: 'Test',
          category: CourseCategory.MATH,
          price: 50,
          priceType: PriceType.PER_HOUR,
          teachingModes: ['ONLINE'],
          locations: ['Auckland'],
          targetAgeGroups: ['10-15'],
          maxClassSize: 20,
        })
      ).rejects.toThrow('Duplicate key');
    });
  });
});
