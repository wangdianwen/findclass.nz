/**
 * Courses Module - Service
 * Course management business logic with PostgreSQL
 */

import { logger } from '@core/logger';
import { AppError, ErrorCode } from '@core/errors';
import type { Pool } from 'pg';
import { CourseRepository } from './course.repository';
import type {
  Course,
  CreateCourseDTO,
  UpdateCourseDTO,
  CourseStatistics,
} from './course.repository';
import { TeacherRepository } from '@modules/teachers/teacher.repository';
import { SortBy } from './courses.types';
import type { CourseCategory, PriceType, TrustLevel } from '@shared/types';
import { CourseSourceType, CourseStatus } from '@shared/types';
import { getPool } from '@shared/db/postgres/client';

// Factory function to create service with dependencies
export function createCoursesService(pool: Pool) {
  const courseRepository = new CourseRepository(pool);
  const teacherRepository = new TeacherRepository(pool);

  // ==================== Course CRUD Operations ====================

  async function getCourseById(courseId: string): Promise<Course | null> {
    logger.info('Getting course by ID', { courseId });
    return courseRepository.findById(courseId);
  }

  async function getCourseDetail(courseId: string): Promise<unknown | null> {
    logger.info('Getting course detail', { courseId });

    const course = await courseRepository.findById(courseId);
    if (!course) {
      return null;
    }

    // Fetch teacher details
    const teacher = await teacherRepository.findById(course.teacher_id);

    return {
      ...course,
      teacher: teacher
        ? {
            id: teacher.id,
            displayName: teacher.display_name,
            bio: teacher.bio,
            verificationStatus: teacher.verification_status,
            averageRating: teacher.average_rating,
            totalReviews: teacher.total_reviews,
          }
        : null,
      timeSlots: [],
      reviews: {
        averageRating: course.average_rating || 0,
        totalReviews: course.total_reviews || 0,
        distribution: {},
      },
    };
  }

  async function createCourse(data: {
    teacherId: string;
    title: string;
    titleEn?: string;
    description: string;
    descriptionEn?: string;
    category: CourseCategory;
    subcategory?: string;
    price: number;
    priceType: PriceType;
    teachingModes: ('ONLINE' | 'OFFLINE' | 'BOTH')[];
    locations: string[];
    targetAgeGroups: string[];
    maxClassSize: number;
    sourceType?: string;
    sourceUrl?: string;
  }): Promise<Course> {
    logger.info('Creating course', { data });

    // Verify teacher exists
    const teacher = await teacherRepository.findById(data.teacherId);
    if (!teacher) {
      throw new AppError('Teacher not found', ErrorCode.NOT_FOUND, 404);
    }

    const createData: CreateCourseDTO = {
      teacherId: data.teacherId,
      title: data.title,
      titleEn: data.titleEn,
      description: data.description,
      descriptionEn: data.descriptionEn,
      category: data.category,
      subcategory: data.subcategory,
      price: data.price,
      priceType: data.priceType,
      teachingModes: data.teachingModes,
      locations: data.locations,
      targetAgeGroups: data.targetAgeGroups,
      maxClassSize: data.maxClassSize,
      sourceType: (data.sourceType as CourseSourceType) || CourseSourceType.REGISTERED,
      sourceUrl: data.sourceUrl,
    };

    const course = await courseRepository.create(createData);

    // Link course to teacher
    await teacherRepository.addCourse(
      data.teacherId,
      course.id,
      course.title,
      course.category,
      course.price
    );

    return course;
  }

  async function updateCourse(
    courseId: string,
    data: {
      title?: string;
      titleEn?: string;
      description?: string;
      descriptionEn?: string;
      category?: CourseCategory;
      subcategory?: string;
      price?: number;
      priceType?: PriceType;
      teachingModes?: ('ONLINE' | 'OFFLINE' | 'BOTH')[];
      locations?: string[];
      targetAgeGroups?: string[];
      maxClassSize?: number;
      sourceType?: CourseSourceType;
      sourceUrl?: string;
      status?: CourseStatus;
    }
  ): Promise<Course | null> {
    logger.info('Updating course', { courseId, data });

    const existing = await courseRepository.findById(courseId);
    if (!existing) {
      throw new AppError('Course not found', ErrorCode.NOT_FOUND, 404);
    }

    const updateData: UpdateCourseDTO = {
      title: data.title,
      titleEn: data.titleEn,
      description: data.description,
      descriptionEn: data.descriptionEn,
      category: data.category,
      subcategory: data.subcategory,
      price: data.price,
      priceType: data.priceType,
      teachingModes: data.teachingModes,
      locations: data.locations,
      targetAgeGroups: data.targetAgeGroups,
      maxClassSize: data.maxClassSize,
      sourceType: data.sourceType,
      sourceUrl: data.sourceUrl,
      status: data.status,
    };

    return courseRepository.update(courseId, updateData);
  }

  async function deleteCourse(courseId: string): Promise<boolean> {
    logger.info('Deleting course', { courseId });

    const existing = await courseRepository.findById(courseId);
    if (!existing) {
      throw new AppError('Course not found', ErrorCode.NOT_FOUND, 404);
    }

    // Remove course-teacher relationship
    await teacherRepository.removeCourse(existing.teacher_id, courseId);

    return courseRepository.delete(courseId);
  }

  async function getCoursesByTeacher(teacherId: string): Promise<Course[]> {
    logger.info('Getting courses by teacher', { teacherId });
    return courseRepository.findByTeacherId(teacherId);
  }

  // ==================== Course Search ====================

  async function searchCourses(params: {
    keyword?: string;
    category?: CourseCategory;
    city?: string;
    priceMin?: number;
    priceMax?: number;
    ratingMin?: number;
    trustLevel?: TrustLevel;
    teachingMode?: 'ONLINE' | 'OFFLINE' | 'BOTH';
    sortBy?: SortBy;
    page?: number;
    limit?: number;
  }): Promise<{
    items: Array<{
      id: string;
      title: string;
      titleEn?: string;
      price: number;
      priceType: string;
      category: string;
      teachingModes: string[];
      location: string;
      trustLevel: string;
      sourceType: string;
      averageRating?: number;
      totalReviews?: number;
      teacher?: {
        id: string;
        displayName: string;
        verificationStatus: string;
      };
      publishedAt?: Date;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const {
      keyword,
      category,
      city,
      priceMin,
      priceMax,
      ratingMin,
      trustLevel,
      teachingMode,
      sortBy = SortBy.RELEVANCE,
      page = 1,
      limit = 20,
    } = params;

    logger.info('Searching courses', { params });

    // Map sortBy enum to repository sort options
    const sortOptions: Record<
      string,
      'newest' | 'price_asc' | 'price_desc' | 'rating' | 'relevance'
    > = {
      [SortBy.RELEVANCE]: 'relevance',
      [SortBy.NEWEST]: 'newest',
      [SortBy.PRICE_ASC]: 'price_asc',
      [SortBy.PRICE_DESC]: 'price_desc',
      [SortBy.RATING]: 'rating',
    };

    // Search courses using repository
    const result = await courseRepository.search(
      {
        keyword,
        category,
        city,
        priceMin,
        priceMax,
        ratingMin,
        trustLevel,
        teachingMode,
        status: CourseStatus.ACTIVE,
      },
      {
        page,
        limit,
        sortBy: sortOptions[sortBy] || 'newest',
      }
    );

    // Fetch teacher details for all courses
    const teacherIds = [...new Set(result.items.map(course => course.teacher_id))];
    const teachers =
      teacherIds.length > 0 ? await teacherRepository.findAll({ limit: teacherIds.length }) : [];
    const teacherMap = new Map(teachers.map(t => [t.id, t]));

    // Map courses to response format
    const items = result.items.map(course => {
      const teacher = teacherMap.get(course.teacher_id);
      return {
        id: course.id,
        title: course.title,
        titleEn: course.title_en,
        price: course.price,
        priceType: course.price_type,
        category: course.category,
        teachingModes: course.teaching_modes,
        location: course.locations[0] || '',
        trustLevel: course.trust_level,
        sourceType: course.source_type,
        averageRating: course.average_rating,
        totalReviews: course.total_reviews,
        teacher: teacher
          ? {
              id: teacher.id,
              displayName: teacher.display_name,
              verificationStatus: teacher.verification_status,
            }
          : undefined,
        publishedAt: course.published_at || course.created_at,
      };
    });

    return {
      items,
      pagination: result.pagination,
    };
  }

  // ==================== Course Statistics ====================

  async function getCourseStatistics(teacherId?: string): Promise<CourseStatistics> {
    logger.info('Getting course statistics', { teacherId });
    return courseRepository.getStatistics(teacherId);
  }

  async function getFeaturedCourses(limit: number = 10): Promise<Course[]> {
    logger.info('Getting featured courses', { limit });

    // Get top-rated active courses
    return courseRepository
      .search({ status: CourseStatus.ACTIVE }, { limit, sortBy: 'rating', sortOrder: 'DESC' })
      .then(result => result.items);
  }

  async function getRecentCourses(limit: number = 10): Promise<Course[]> {
    logger.info('Getting recent courses', { limit });

    return courseRepository
      .search({ status: CourseStatus.ACTIVE }, { limit, sortBy: 'newest', sortOrder: 'DESC' })
      .then(result => result.items);
  }

  // ==================== Course Enrollment ====================

  async function incrementEnrollment(courseId: string): Promise<Course | null> {
    logger.info('Incrementing course enrollment', { courseId });
    return courseRepository.incrementEnrollment(courseId);
  }

  async function decrementEnrollment(courseId: string): Promise<Course | null> {
    logger.info('Decrementing course enrollment', { courseId });
    return courseRepository.decrementEnrollment(courseId);
  }

  // ==================== Course Rating ====================

  async function updateCourseRating(
    courseId: string,
    averageRating: number,
    totalReviews: number
  ): Promise<Course | null> {
    logger.info('Updating course rating', { courseId, averageRating, totalReviews });
    return courseRepository.updateRatingStats(courseId, averageRating, totalReviews);
  }

  // ==================== Favorites ====================

  async function toggleFavorite(
    _userId: string,
    _courseId: string
  ): Promise<{ favorited: boolean }> {
    // Placeholder - implement favorite toggle with favorites table
    logger.info('Toggling favorite', { userId: _userId, courseId: _courseId });
    return Promise.resolve({ favorited: true });
  }

  // ==================== Translations ====================

  async function getCourseTranslation(
    courseId: string,
    targetLang: 'zh' | 'en'
  ): Promise<{ title: string; description: string; translatedAt: string } | null> {
    logger.info('Getting course translation', { courseId, targetLang });

    const course = await courseRepository.findById(courseId);
    if (!course) {
      return null;
    }

    return {
      title: targetLang === 'en' ? course.title_en || course.title : course.title,
      description:
        targetLang === 'en' ? course.description_en || course.description : course.description,
      translatedAt: new Date().toISOString(),
    };
  }

  return {
    // Course CRUD
    getCourseById,
    getCourseDetail,
    createCourse,
    updateCourse,
    deleteCourse,
    getCoursesByTeacher,
    // Search
    searchCourses,
    // Statistics
    getCourseStatistics,
    getFeaturedCourses,
    getRecentCourses,
    // Enrollment
    incrementEnrollment,
    decrementEnrollment,
    // Rating
    updateCourseRating,
    // Favorites
    toggleFavorite,
    // Translations
    getCourseTranslation,
  };
}

// Re-export types for convenience
export type CoursesService = ReturnType<typeof createCoursesService>;

// Instantiate service with real pool for controller imports
let coursesService: ReturnType<typeof createCoursesService> | null = null;

export function getCoursesService(): ReturnType<typeof createCoursesService> {
  if (!coursesService) {
    coursesService = createCoursesService(getPool());
  }
  return coursesService;
}

// Export individual functions for direct import (uses singleton instance)
export const getCourseById = (courseId: string) => getCoursesService().getCourseById(courseId);
export const getCourseDetail = (courseId: string) => getCoursesService().getCourseDetail(courseId);
export const createCourse = (
  data: Parameters<ReturnType<typeof createCoursesService>['createCourse']>[0]
) => getCoursesService().createCourse(data);
export const updateCourse = (
  courseId: string,
  data: Parameters<ReturnType<typeof createCoursesService>['updateCourse']>[1]
) => getCoursesService().updateCourse(courseId, data);
export const deleteCourse = (courseId: string) => getCoursesService().deleteCourse(courseId);
export const getCoursesByTeacher = (teacherId: string) =>
  getCoursesService().getCoursesByTeacher(teacherId);
export const searchCourses = (
  params: Parameters<ReturnType<typeof createCoursesService>['searchCourses']>[0]
) => getCoursesService().searchCourses(params);
export const getCourseStatistics = (teacherId?: string) =>
  getCoursesService().getCourseStatistics(teacherId);
export const getFeaturedCourses = (limit?: number) => getCoursesService().getFeaturedCourses(limit);
export const getRecentCourses = (limit?: number) => getCoursesService().getRecentCourses(limit);
export const incrementEnrollment = (courseId: string) =>
  getCoursesService().incrementEnrollment(courseId);
export const decrementEnrollment = (courseId: string) =>
  getCoursesService().decrementEnrollment(courseId);
export const updateCourseRating = (courseId: string, averageRating: number, totalReviews: number) =>
  getCoursesService().updateCourseRating(courseId, averageRating, totalReviews);
export const toggleFavorite = (userId: string, courseId: string) =>
  getCoursesService().toggleFavorite(userId, courseId);
export const getCourseTranslation = (courseId: string, targetLang: 'zh' | 'en') =>
  getCoursesService().getCourseTranslation(courseId, targetLang);
