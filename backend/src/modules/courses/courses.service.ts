/**
 * Courses Module - Service
 * Course search and management business logic
 */

import crypto from 'crypto';
import { logger } from '@core/logger';
import type { Course, Teacher } from '@shared/types';
import { queryItems, getItem, createEntityKey, batchGetItems } from '@shared/db/dynamodb';
import { getFromCache, setCache, CacheKeys } from '@shared/db/cache';
import type { CourseSearchResult, SearchCoursesDto } from './courses.types';
import { SortBy } from './courses.types';

const CACHE_TTL = 300; // 5 minutes

/**
 * Generate stable cache key from search params
 * Handles object key ordering and creates consistent hash
 */
function generateSearchCacheKey(prefix: string, params: Record<string, unknown>): string {
  // Sort keys alphabetically for consistent ordering
  const sortedParams: Record<string, unknown> = {};
  const sortedKeys = Object.keys(params).sort();

  for (const key of sortedKeys) {
    const value = params[key];
    if (value !== undefined && value !== null) {
      // Handle arrays by sorting their elements
      if (Array.isArray(value)) {
        sortedParams[key] = [...value].sort();
      } else {
        sortedParams[key] = value;
      }
    }
  }

  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(sortedParams))
    .digest('hex')
    .substring(0, 32);

  return `${prefix}:${hash}`;
}

/**
 * Batch fetch teachers by IDs to avoid N+1 query problem
 */
async function batchFetchTeachers(teacherIds: string[]): Promise<Map<string, Teacher>> {
  if (teacherIds.length === 0) {
    return new Map();
  }

  // Deduplicate teacher IDs
  const uniqueIds = [...new Set(teacherIds)];

  // Build keys for batch get
  const keys = uniqueIds.map(id => {
    const { PK, SK } = createEntityKey('TEACHER', id);
    return { PK, SK };
  });

  const teachers = await batchGetItems<Teacher>(keys);
  const teacherMap = new Map<string, Teacher>();

  for (const teacher of teachers) {
    if (teacher.id) {
      teacherMap.set(teacher.id, teacher);
    }
  }

  return teacherMap;
}

export async function searchCourses(params: SearchCoursesDto): Promise<CourseSearchResult> {
  const {
    keyword,
    category,
    priceMin,
    priceMax,
    teachingMode,
    location,
    trustLevel,
    sortBy = SortBy.RELEVANCE,
    page = 1,
    limit = 20,
  } = params;

  logger.info('Searching courses', { params });

  // Try cache first with stable key generation
  const cacheParams = {
    keyword,
    category,
    priceMin,
    priceMax,
    teachingMode,
    location,
    trustLevel,
    sortBy,
    page,
    limit,
  };
  const cacheKey = generateSearchCacheKey('course:search', cacheParams);
  const cached = await getFromCache<CourseSearchResult>(cacheKey, 'SEARCH');
  if (cached) {
    logger.debug('Returning cached search results');
    return cached;
  }

  // Build query expression
  const expressionParts: string[] = ['entityType = :entityType'];
  const values: Record<string, unknown> = {
    ':entityType': 'COURSE',
  };

  if (category) {
    expressionParts.push('begins_with(GSI3PK, :category)');
    values[':category'] = `CAT#${category}`;
  }

  if (trustLevel) {
    expressionParts.push('trustLevel = :trustLevel');
    values[':trustLevel'] = trustLevel;
  }

  // Query DynamoDB
  const result = await queryItems<Course>({
    indexName: 'GSI3-CourseSearch',
    keyConditionExpression: expressionParts.join(' AND '),
    expressionAttributeValues: values,
    limit: limit * 2, // Fetch extra for filtering
    projectionExpression:
      'id,title,titleEn,price,category,teachingModes,locations,trustLevel,averageRating,totalReviews,teacherId,createdAt',
  });

  // Filter results
  let filteredItems = result.items;

  // Keyword filtering (basic - in production would use DynamoDB search or external search service)
  if (keyword && keyword.length <= 100) {
    const keywordLower = keyword.toLowerCase();
    filteredItems = filteredItems.filter(
      course =>
        (course.title && course.title.toLowerCase().includes(keywordLower)) ||
        (course.description && course.description.toLowerCase().includes(keywordLower))
    );
  }

  // Price filtering
  if (priceMin !== undefined) {
    filteredItems = filteredItems.filter(course => course.price >= priceMin);
  }
  if (priceMax !== undefined) {
    filteredItems = filteredItems.filter(course => course.price <= priceMax);
  }

  // Location filtering
  if (location) {
    filteredItems = filteredItems.filter(course =>
      course.locations.some(loc => loc.toLowerCase().includes(location.toLowerCase()))
    );
  }

  // Teaching mode filtering
  if (teachingMode) {
    filteredItems = filteredItems.filter(course => course.teachingModes.includes(teachingMode));
  }

  // Sort results
  switch (sortBy) {
    case SortBy.NEWEST:
      filteredItems.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
    case SortBy.PRICE_ASC:
      filteredItems.sort((a, b) => a.price - b.price);
      break;
    case SortBy.PRICE_DESC:
      filteredItems.sort((a, b) => b.price - a.price);
      break;
    case SortBy.RATING:
      filteredItems.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
      break;
  }

  // Pagination
  const startIndex = (page - 1) * limit;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + limit);

  // Fetch teacher details for all courses in a single batch operation
  const teacherIds = [...new Set(paginatedItems.map(course => course.teacherId))];
  const teacherMap = await batchFetchTeachers(teacherIds);

  const itemsWithTeachers = paginatedItems.map(course => {
    const teacher = teacherMap.get(course.teacherId);
    return {
      id: course.id,
      title: course.title,
      titleEn: course.titleEn,
      price: course.price,
      priceType: course.priceType,
      category: course.category,
      teachingModes: course.teachingModes,
      location: course.locations[0] || '',
      trustLevel: course.trustLevel,
      sourceType: course.sourceType,
      averageRating: course.averageRating,
      totalReviews: course.totalReviews,
      teacher: teacher
        ? {
            id: teacher.id,
            displayName: teacher.displayName,
            verificationStatus: teacher.verificationStatus,
          }
        : undefined,
      publishedAt: course.publishedAt || course.createdAt,
    };
  });

  const total = filteredItems.length;
  const totalPages = Math.ceil(total / limit);

  const resultData: CourseSearchResult = {
    items: itemsWithTeachers,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };

  // Cache results
  await setCache(cacheKey, 'SEARCH', resultData, CACHE_TTL);

  return resultData;
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const { PK, SK } = createEntityKey('COURSE', courseId);
  return getItem<Course>({ PK, SK });
}

export async function getTeacherById(teacherId: string): Promise<Teacher | null> {
  const { PK, SK } = createEntityKey('TEACHER', teacherId);
  return getItem<Teacher>({ PK, SK });
}

export async function getCourseDetail(courseId: string): Promise<unknown | null> {
  const course = await getCourseById(courseId);
  if (!course) {
    return null;
  }

  // Fetch teacher
  const teacher = await getTeacherById(course.teacherId);

  // Placeholder for reviews, time slots, etc.
  return {
    ...course,
    teacher: teacher
      ? {
          id: teacher.id,
          displayName: teacher.displayName,
          bio: teacher.bio,
          verificationStatus: teacher.verificationStatus,
          averageRating: teacher.averageRating,
          totalReviews: teacher.totalReviews,
        }
      : null,
    timeSlots: [],
    reviews: {
      averageRating: course.averageRating || 0,
      totalReviews: course.totalReviews || 0,
      distribution: {},
    },
  };
}

export async function toggleFavorite(
  userId: string,
  courseId: string
): Promise<{ favorited: boolean }> {
  // Placeholder - implement favorite toggle
  logger.info('Toggling favorite', { userId, courseId });
  return Promise.resolve({ favorited: true });
}

export async function getCourseTranslation(
  courseId: string,
  targetLang: 'zh' | 'en'
): Promise<{ title: string; description: string; translatedAt: string } | null> {
  // Check cache
  const cacheKeyKey = CacheKeys.translation('', targetLang); // Would need full text
  const cached = await getFromCache<{ title: string; description: string; translatedAt: string }>(
    cacheKeyKey,
    'GENERAL'
  );
  if (cached) {
    return cached;
  }

  const course = await getCourseById(courseId);
  if (!course) {
    return null;
  }

  // Placeholder - implement translation using Google Translate API
  const result = {
    title: targetLang === 'en' ? course.titleEn || course.title : course.title,
    description:
      targetLang === 'en' ? course.descriptionEn || course.description : course.description,
    translatedAt: new Date().toISOString(),
  };

  // Cache translation (30 days)
  await setCache(cacheKeyKey, 'GENERAL', result, 30 * 24 * 60 * 60);

  return result;
}
