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

    // Fetch teacher details directly from database to get all fields
    const teacherResult = await pool.query(
      `SELECT * FROM teachers WHERE id = $1`,
      [course.teacher_id]
    );

    const teacherRow = teacherResult.rows[0];

    // Parse teachingModes from string to array if needed
    let teachingModes: string[];
    const modesValue: unknown = course.teaching_modes;
    if (Array.isArray(modesValue)) {
      teachingModes = modesValue;
    } else if (typeof modesValue === 'string') {
      // Handle both "{ONLINE}" and "ONLINE" formats
      const modesStr = modesValue.replace(/[{}]/g, '');
      teachingModes = modesStr.split(',').map((m: string) => m.trim()).filter((m: string) => m);
    } else {
      teachingModes = [];
    }

    // Helper function to parse PostgreSQL array fields
    const parseArrayField = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value;
      }
      if (typeof value === 'string' && value.startsWith('{')) {
        // PostgreSQL array format: "{Sat,Sun}" or "{14:00-16:00}"
        const parsed = value.slice(1, -1).split(',');
        return parsed.length === 1 && parsed[0] === '' ? [] : parsed;
      }
      return [];
    };

    // Parse days and timeSlots from database
    const parsedDays = parseArrayField(course.days);
    const parsedTimeSlots = parseArrayField(course.time_slots);
    const parsedLocations = parseArrayField(course.locations);
    const parsedAgeGroups = parseArrayField(course.target_age_groups);
    const parsedTags = parseArrayField(course.tags);
    const parsedImages = parseArrayField(course.images);
    const parsedQualifications = parseArrayField(teacherRow?.qualifications);

    // Transform snake_case to camelCase for frontend compatibility
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      price: Number(course.price) || 0,
      lessonCount: course.lesson_count || 12,
      originalPrice: course.original_price || undefined,
      rating: Number(course.average_rating) || 0,
      reviewCount: Number(course.total_reviews) || 0,
      trustLevel: course.trust_level,
      dataSource: (course.source_type as string) === 'manual' || course.source_type === 'REGISTERED' ? 'first_party' : 'other',
      sourceWeight: 1.0,
      publishedAt: course.published_at,
      updatedAt: course.updated_at,
      subject: course.category,
      grade: parsedAgeGroups,
      teachingMode: teachingModes.includes('ONLINE') && teachingModes.includes('OFFLINE')
        ? 'bilingual'
        : teachingModes.includes('ONLINE')
        ? 'online'
        : 'offline',
      language: course.language || 'english',
      schedule: {
        days: parsedDays.length > 0 ? parsedDays : ['Sat', 'Sun'],
        timeSlots: parsedTimeSlots.length > 0 ? parsedTimeSlots : ['14:00-16:00'],
        duration: course.duration || 60,
        location: parsedLocations.length > 0
          ? parsedLocations[0]
          : 'TBD',
        address: undefined,
        showAddress: false,
      },
      teacher: teacherRow
        ? {
            id: teacherRow.id,
            name: teacherRow.display_name,
            title: teacherRow.title || undefined,
            bio: teacherRow.bio || '',
            avatar: teacherRow.avatar_url || undefined,
            verified: Boolean(teacherRow.verified),
            teachingYears: Number(teacherRow.teaching_years) || 0,
            qualifications: parsedQualifications,
          }
        : {
            // Fallback teacher object when no teacher found
            id: '',
            name: 'Unknown Teacher',
            bio: '',
            verified: false,
            teachingYears: 0,
            qualifications: [],
          },
      contact: {
        phone: course.contact_phone || undefined,
        wechat: course.contact_wechat || undefined,
        email: course.contact_email || undefined,
        wechatQrcode: course.contact_wechat_qrcode || undefined,
        showPhone: Boolean(course.show_contact_phone),
        showWechat: Boolean(course.show_contact_wechat),
        showEmail: Boolean(course.show_contact_email),
      },
      tags: parsedTags,
      images: parsedImages,
      userInteraction: {
        isFavorited: false,
        isCompared: false,
      },
      // Legacy fields for backward compatibility
      titleEn: course.title_en,
      descriptionEn: course.description_en,
      category: course.category,
      subcategory: course.subcategory,
      priceType: course.price_type,
      teachingModes: teachingModes,
      locations: parsedLocations,
      targetAgeGroups: course.target_age_groups,
      maxClassSize: course.max_class_size,
      sourceType: course.source_type,
      sourceUrl: course.source_url,
      status: course.status,
      averageRating: course.average_rating,
      totalReviews: course.total_reviews,
      currentEnrollment: course.current_enrollment,
      createdAt: course.created_at,
      teacherId: course.teacher_id,
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

  // ==================== Filter Options ====================

  function getFilterOptions(): {
    subjects: Array<{ value: string; label: string }>;
    grades: Array<{ value: string; label: string }>;
    regions: Array<{ value: string; label: string }>;
    teachingModes: Array<{ value: string; label: string }>;
    priceRanges: Array<{ value: string; label: string; min: number; max: number }>;
    sortOptions: Array<{ value: string; label: string }>;
    cities: Array<{ value: string; label: string }>;
  } {
    return {
      subjects: [
        { value: 'MATH', label: '数学' },
        { value: 'ENGLISH', label: '英语' },
        { value: 'CHINESE', label: '语文' },
        { value: 'PHYSICS', label: '物理' },
        { value: 'CHEMISTRY', label: '化学' },
        { value: 'BIOLOGY', label: '生物' },
        { value: 'PROGRAMMING', label: '编程' },
        { value: 'ART', label: '美术' },
        { value: 'MUSIC', label: '音乐' },
        { value: 'DANCE', label: '舞蹈' },
      ],
      grades: [
        { value: 'PRESCHOOL', label: '学前班' },
        { value: 'PRIMARY_1_3', label: '小学1-3年级' },
        { value: 'PRIMARY_4_6', label: '小学4-6年级' },
        { value: 'JUNIOR_HIGH', label: '初中' },
        { value: 'SENIOR_HIGH', label: '高中' },
        { value: 'UNIVERSITY', label: '大学' },
        { value: 'ADULT', label: '成人' },
      ],
      regions: [
        { value: 'AUCKLAND_CENTRAL', label: '奥克兰市中心' },
        { value: 'AUCKLAND_EAST', label: '奥克兰东部' },
        { value: 'AUCKLAND_SOUTH', label: '奥克兰南部' },
        { value: 'AUCKLAND_WEST', label: '奥克兰西部' },
        { value: 'AUCKLAND_NORTH', label: '奥克兰北部' },
        { value: 'WELLINGTON_CENTRAL', label: '惠灵顿市中心' },
        { value: 'CHRISTCHURCH_CENTRAL', label: '基督城市中心' },
      ],
      teachingModes: [
        { value: 'ONLINE', label: '线上' },
        { value: 'OFFLINE', label: '线下' },
        { value: 'BOTH', label: '线上+线下' },
      ],
      priceRanges: [
        { value: '0-50', label: '$0 - $50/课时', min: 0, max: 50 },
        { value: '50-100', label: '$50 - $100/课时', min: 50, max: 100 },
        { value: '100-150', label: '$100 - $150/课时', min: 100, max: 150 },
        { value: '150-200', label: '$150 - $200/课时', min: 150, max: 200 },
        { value: '200+', label: '$200+/课时', min: 200, max: Infinity },
      ],
      sortOptions: [
        { value: 'relevance', label: '综合排序' },
        { value: 'newest', label: '最新发布' },
        { value: 'rating', label: '评分最高' },
        { value: 'price_asc', label: '价格从低到高' },
        { value: 'price_desc', label: '价格从高到低' },
      ],
      cities: [
        { value: 'Auckland', label: '奥克兰' },
        { value: 'Wellington', label: '惠灵顿' },
        { value: 'Christchurch', label: '基督城' },
        { value: 'Hamilton', label: '汉密尔顿' },
        { value: 'Tauranga', label: '陶朗加' },
        { value: 'Dunedin', label: '但尼丁' },
      ],
    };
  }

  // ==================== Regions by City ====================

  function getRegionsByCity(city: string): Array<{ value: string; label: string }> | null {
    const cityRegionsMap: Record<string, Array<{ value: string; label: string }>> = {
      Auckland: [
        { value: 'CBD', label: '市中心' },
        { value: 'Parnell', label: 'Parnell' },
        { value: 'Newmarket', label: 'Newmarket' },
        { value: 'Remuera', label: 'Remuera' },
        { value: 'Epsom', label: 'Epsom' },
        { value: 'Mt Eden', label: 'Mt Eden' },
        { value: 'Kingsland', label: 'Kingsland' },
        { value: 'Ponsonby', label: 'Ponsonby' },
        { value: 'Herne Bay', label: 'Herne Bay' },
        { value: 'Grey Lynn', label: 'Grey Lynn' },
        { value: 'Westmere', label: 'Westmere' },
        { value: 'Pt Chevalier', label: 'Pt Chevalier' },
        { value: 'Mt Albert', label: 'Mt Albert' },
        { value: 'Sandringham', label: 'Sandringham' },
        { value: 'Balmoral', label: 'Balmoral' },
        { value: 'Three Kings', label: 'Three Kings' },
        { value: 'Royal Oak', label: 'Royal Oak' },
        { value: 'One Tree Hill', label: 'One Tree Hill' },
        { value: 'Green Lane', label: 'Green Lane' },
        { value: 'Ellerslie', label: 'Ellerslie' },
        { value: 'Penrose', label: 'Penrose' },
        { value: 'Mt Wellington', label: 'Mt Wellington' },
        { value: 'Panmure', label: 'Panmure' },
        { value: 'Glen Innes', label: 'Glen Innes' },
        { value: 'Tamaki', label: 'Tamaki' },
        { value: 'Kohimarama', label: 'Kohimarama' },
        { value: 'Mission Bay', label: 'Mission Bay' },
        { value: 'St Heliers', label: 'St Heliers' },
        { value: 'Orakei', label: 'Orakei' },
        { value: 'Glendowie', label: 'Glendowie' },
        { value: 'Howick', label: 'Howick' },
        { value: 'Meadowlands', label: 'Meadowlands' },
        { value: 'Bucklands Beach', label: 'Bucklands Beach' },
        { value: 'Half Moon Bay', label: 'Half Moon Bay' },
        { value: 'Macleans Park', label: 'Macleans Park' },
        { value: 'Dannemora', label: 'Dannemora' },
        { value: 'Shamrock Park', label: 'Shamrock Park' },
        { value: 'Cockle Bay', label: 'Cockle Bay' },
        { value: 'Wattle Downs', label: 'Wattle Downs' },
        { value: 'The Gardens', label: 'The Gardens' },
        { value: 'Rosehill', label: 'Rosehill' },
        { value: 'Papatoetoe', label: 'Papatoetoe' },
        { value: 'Hunters Corner', label: 'Hunters Corner' },
        { value: 'Middlemore', label: 'Middlemore' },
        { value: 'Otara', label: 'Otara' },
        { value: 'Clendon', label: 'Clendon' },
        { value: 'Wiri', label: 'Wiri' },
        { value: 'Manukau', label: 'Manukau' },
        { value: 'Manurewa', label: 'Manurewa' },
        { value: 'Takanini', label: 'Takanini' },
        { value: 'Papakura', label: 'Papakura' },
        { value: 'Hobsonville', label: 'Hobsonville' },
        { value: 'West Harbour', label: 'West Harbour' },
        { value: 'Massey', label: 'Massey' },
        { value: 'Henderson', label: 'Henderson' },
        { value: 'Ranui', label: 'Ranui' },
        { value: 'Swanson', label: 'Swanson' },
        { value: 'Waitakere', label: 'Waitakere' },
        { value: 'Glen Eden', label: 'Glen Eden' },
        { value: 'Huia', label: 'Huia' },
        { value: 'Laingholm', label: 'Laingholm' },
        { value: 'Titirangi', label: 'Titirangi' },
        { value: 'Green Bay', label: 'Green Bay' },
        { value: 'Kaurilands', label: 'Kaurilands' },
        { value: 'Sunnyvale', label: 'Sunnyvale' },
        { value: 'Te Atatu', label: 'Te Atatu' },
        { value: 'Whau', label: 'Whau' },
        { value: 'Avondale', label: 'Avondale' },
        { value: 'Blockhouse Bay', label: 'Blockhouse Bay' },
        { value: 'Lynfield', label: 'Lynfield' },
        { value: 'Mount Roskill', label: 'Mount Roskill' },
        { value: 'Mount Albert', label: 'Mount Albert' },
        { value: 'Sandringham', label: 'Sandringham' },
        { value: 'Balmoral', label: 'Balmoral' },
        { value: 'Mount Eden', label: 'Mount Eden' },
        { value: 'Kensington', label: 'Kensington' },
        { value: 'Glenfield', label: 'Glenfield' },
        { value: 'Northcote', label: 'Northcote' },
        { value: 'Takapuna', label: 'Takapuna' },
        { value: 'Devonport', label: 'Devonport' },
        { value: 'Milford', label: 'Milford' },
        { value: 'Mairangi Bay', label: 'Mairangi Bay' },
        { value: 'Murrays Bay', label: 'Murrays Bay' },
        { value: 'Rosedale', label: 'Rosedale' },
        { value: 'Albany', label: 'Albany' },
        { value: 'Glenfield', label: 'Glenfield' },
        { value: 'Bayswater', label: 'Bayswater' },
        { value: 'Narrow Neck', label: 'Narrow Neck' },
        { value: 'Stanley Point', label: 'Stanley Point' },
        { value: 'Point Chevalier', label: 'Point Chevalier' },
      ],
      Wellington: [
        { value: 'CBD', label: '市中心' },
        { value: 'Lambton Quay', label: 'Lambton Quay' },
        { value: 'Willis Street', label: 'Willis Street' },
        { value: 'Courtenay Place', label: 'Courtenay Place' },
        { value: 'Cuba Street', label: 'Cuba Street' },
        { value: 'Karo Drive', label: 'Karo Drive' },
        { value: 'Thorndon', label: 'Thorndon' },
        { value: 'Pipitea', label: 'Pipitea' },
        { value: 'Te Aro', label: 'Te Aro' },
        { value: 'Mount Victoria', label: 'Mount Victoria' },
        { value: 'Hataitai', label: 'Hataitai' },
        { value: 'Kilbirnie', label: 'Kilbirnie' },
        { value: 'Miramar', label: 'Miramar' },
        { value: 'Roseneath', label: 'Roseneath' },
        { value: 'Northland', label: 'Northland' },
        { value: 'Khandallah', label: 'Khandallah' },
        { value: 'Broadmeadows', label: 'Broadmeadows' },
        { value: 'Ngaio', label: 'Ngaio' },
        { value: 'Tawa', label: 'Tawa' },
        { value: 'Porirua', label: 'Porirua' },
      ],
      Christchurch: [
        { value: 'CBD', label: '市中心' },
        { value: 'Riccarton', label: 'Riccarton' },
        { value: 'Addington', label: 'Addington' },
        { value: 'Sydenham', label: 'Sydenham' },
        { value: 'Somerfield', label: 'Somerfield' },
        { value: 'Merivale', label: 'Merivale' },
        { value: 'Papanui', label: 'Papanui' },
        { value: 'Bishopdale', label: 'Bishopdale' },
        { value: 'Burnside', label: 'Burnside' },
        { value: 'Ilam', label: 'Ilam' },
        { value: 'Fendalton', label: 'Fendalton' },
        { value: 'Hagley', label: 'Hagley' },
        { value: 'Shirley', label: 'Shirley' },
        { value: 'Richmond', label: 'Richmond' },
        { value: 'Avonside', label: 'Avonside' },
        { value: 'Woolston', label: 'Woolston' },
        { value: 'Opawa', label: 'Opawa' },
        { value: 'St Martins', label: 'St Martins' },
        { value: 'Beckenham', label: 'Beckenham' },
        { value: 'Spreydon', label: 'Spreydon' },
        { value: 'Hillmorton', label: 'Hillmorton' },
        { value: 'Hoon Hay', label: 'Hoon Hay' },
        { value: 'Middleton', label: 'Middleton' },
        { value: 'Hornby', label: 'Hornby' },
        { value: 'Sockburn', label: 'Sockburn' },
      ],
      Hamilton: [
        { value: 'CBD', label: '市中心' },
        { value: 'Claudelands', label: 'Claudelands' },
        { value: 'Fairfield', label: 'Fairfield' },
        { value: 'Chartwell', label: 'Chartwell' },
        { value: 'Silverdale', label: 'Silverdale' },
        { value: 'Frankton', label: 'Frankton' },
        { value: 'Glenview', label: 'Glenview' },
        { value: 'Deanwell', label: 'Deanwell' },
        { value: 'Melrose', label: 'Melrose' },
        { value: 'Bader', label: 'Bader' },
        { value: 'Pukete', label: 'Pukete' },
        { value: 'Maeroa', label: 'Maeroa' },
        { value: 'Rotokauri', label: 'Rotokauri' },
      ],
      Tauranga: [
        { value: 'CBD', label: '市中心' },
        { value: 'Mount Maunganui', label: 'Mount Maunganui' },
        { value: 'Papamoa', label: 'Papamoa' },
        { value: 'Greerton', label: 'Greerton' },
        { value: 'Gate Pa', label: 'Gate Pa' },
        { value: 'Tauranga South', label: 'Tauranga South' },
        { value: 'Bethlehem', label: 'Bethlehem' },
        { value: 'Hairini', label: 'Hairini' },
      ],
      Dunedin: [
        { value: 'CBD', label: '市中心' },
        { value: 'Central Dunedin', label: 'Central Dunedin' },
        { value: 'North Dunedin', label: 'North Dunedin' },
        { value: 'South Dunedin', label: 'South Dunedin' },
        { value: 'Caversham', label: 'Caversham' },
        { value: 'St Kilda', label: 'St Kilda' },
        { value: 'Mornington', label: 'Mornington' },
        { value: 'Roslyn', label: 'Roslyn' },
        { value: 'Maori Hill', label: 'Maori Hill' },
        { value: 'Normanby', label: 'Normanby' },
        { value: 'Opoho', label: 'Opoho' },
        { value: 'Glenleith', label: 'Glenleith' },
        { value: 'Leith Valley', label: 'Leith Valley' },
        { value: 'Wakari', label: 'Wakari' },
        { value: 'Belleknowes', label: 'Belleknowes' },
        { value: 'Andersons Bay', label: 'Andersons Bay' },
        { value: 'Musselburgh', label: 'Musselburgh' },
        { value: 'Forbury', label: 'Forbury' },
        { value: 'Caversham Valley', label: 'Caversham Valley' },
        { value: 'Calton Hill', label: 'Calton Hill' },
        { value: 'Gordon Street', label: 'Gordon Street' },
        { value: 'Kaikorai', label: 'Kaikorai' },
        { value: 'Kenmure', label: 'Kenmure' },
        { value: 'Green Island', label: 'Green Island' },
        { value: 'Brighton', label: 'Brighton' },
        { value: 'Lawyer', label: 'Lawyer' },
      ],
    };

    // Normalize city name for matching
    const normalizedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
    return cityRegionsMap[normalizedCity] || null;
  }

  // ==================== Similar Courses ====================

  async function getSimilarCourses(courseId: string, limit: number = 5): Promise<Course[]> {
    logger.info('Getting similar courses', { courseId, limit });

    // Get the current course to find its category
    const course = await courseRepository.findById(courseId);
    if (!course) {
      return [];
    }

    // Search for courses with the same category, excluding the current course
    const result = await courseRepository.search(
      {
        category: course.category,
        status: CourseStatus.ACTIVE,
      },
      {
        limit: limit + 1, // Get one extra to exclude current course
        sortBy: 'rating',
        sortOrder: 'DESC',
      }
    );

    // Filter out the current course and return the rest
    return result.items.filter(item => item.id !== courseId).slice(0, limit);
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
    // Filter Options
    getFilterOptions,
    // Regions
    getRegionsByCity,
    // Similar Courses
    getSimilarCourses,
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
export const getFilterOptions = () => getCoursesService().getFilterOptions();
export const getRegionsByCity = (city: string) => getCoursesService().getRegionsByCity(city);
export const getSimilarCourses = (courseId: string, limit?: number) =>
  getCoursesService().getSimilarCourses(courseId, limit);
