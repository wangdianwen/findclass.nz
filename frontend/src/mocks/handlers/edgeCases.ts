// MSW Handlers for Edge Cases and Error Scenarios
// These handlers simulate various error conditions for testing

import { http, HttpResponse } from 'msw';
import {
  MOCK_USERS,
  MOCK_COURSES_WITH_STATUS,
  MOCK_COURSE_DETAIL_WITH_STATUS,
  ERROR_RESPONSES,
  type UserStatus,
} from '../data/edgeCases';

const API_BASE = '/api/v1';

// Logger helper
const logRequest = (method: string, url: string) => {
  console.log(`[MSW-Edge] ${method} ${url}`);
};

// ============================================
// User Status Handlers
// ============================================

export const userStatusHandlers = [
  // GET /api/v1/users/:id - Get user by ID with status
  http.get(`${API_BASE}/users/:id`, ({ params, request }) => {
    logRequest('GET', request.url);
    const { id } = params;
    const userId = String(id);

    // Check for special user IDs that trigger different statuses
    if (userId.includes('deleted')) {
      return HttpResponse.json(
        ERROR_RESPONSES.userNotFound,
        { status: 404 }
      );
    }

    if (userId.includes('banned')) {
      return HttpResponse.json(
        ERROR_RESPONSES.userBanned,
        { status: 403 }
      );
    }

    // Find user in mock data
    const user = MOCK_USERS.find(u => u.id === userId);
    if (user) {
      return HttpResponse.json({
        success: true,
        data: user,
      });
    }

    // Default active user
    return HttpResponse.json({
      success: true,
      data: {
        id: userId,
        email: 'user@example.com',
        name: '测试用户',
        status: 'active' as UserStatus,
        role: 'student',
        createdAt: '2024-01-01T00:00:00Z',
      },
    });
  }),

  // POST /api/v1/user/favorites with banned user
  http.post(`${API_BASE}/user/favorites`, async ({ request }) => {
    logRequest('POST', request.url);

    // Check Authorization header for banned user
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.includes('banned')) {
      return HttpResponse.json(
        ERROR_RESPONSES.userBanned,
        { status: 403 }
      );
    }

    // Normal response
    return HttpResponse.json({
      isFavorited: true,
      message: 'Course added to favorites',
    });
  }),

  // POST /api/v1/inquiries with banned user
  http.post(`${API_BASE}/inquiries`, async ({ request }) => {
    logRequest('POST', request.url);

    const authHeader = request.headers.get('Authorization');
    if (authHeader?.includes('banned')) {
      return HttpResponse.json(
        ERROR_RESPONSES.userBanned,
        { status: 403 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Inquiry sent successfully',
      inquiryId: `inquiry-${Date.now()}`,
    });
  }),

  // POST /api/v1/reports with banned user
  http.post(`${API_BASE}/reports`, async ({ request }) => {
    logRequest('POST', request.url);

    const authHeader = request.headers.get('Authorization');
    if (authHeader?.includes('banned')) {
      return HttpResponse.json(
        ERROR_RESPONSES.userBanned,
        { status: 403 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Report submitted successfully',
      reportId: `report-${Date.now()}`,
    });
  }),
];

// ============================================
// Course Status Handlers
// ============================================

export const courseStatusHandlers = [
  // GET /api/v1/courses/:id with various statuses
  http.get(`${API_BASE}/courses/:id`, ({ params, request }) => {
    logRequest('GET', request.url);
    const { id } = params;
    const courseId = String(id);

    // Check for special course IDs
    if (courseId === 'not-found') {
      return HttpResponse.json(
        ERROR_RESPONSES.courseNotFound,
        { status: 404 }
      );
    }

    if (courseId === 'course-draft-001') {
      return HttpResponse.json(
        ERROR_RESPONSES.courseNotPublished,
        { status: 403 }
      );
    }

    // Find in edge case data
    const courseDetail = MOCK_COURSE_DETAIL_WITH_STATUS[courseId];
    if (courseDetail) {
      return HttpResponse.json(courseDetail);
    }

    // Default: not found
    return HttpResponse.json(
      ERROR_RESPONSES.courseNotFound,
      { status: 404 }
    );
  }),

  // GET /api/v1/courses - List courses with status filtering
  http.get(`${API_BASE}/courses`, ({ request }) => {
    logRequest('GET', request.url);

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const includeUnpublished = url.searchParams.get('includeUnpublished') === 'true';

    let courses = [...MOCK_COURSES_WITH_STATUS];

    // Filter by status
    if (status && status !== 'all') {
      courses = courses.filter(c => c.status === status);
    }

    // If not including unpublished, filter them out
    if (!includeUnpublished) {
      courses = courses.filter(c => c.status === 'published');
    }

    // Generate GUIDs for courses
    const coursesWithGuid = courses.map((course, index) => ({
      ...course,
      id: `course-${course.id}-${index}`,
    }));

    return HttpResponse.json({
      data: coursesWithGuid,
      total: coursesWithGuid.length,
    });
  }),
];

// ============================================
// Favorite Restriction Handlers
// ============================================

export const favoriteRestrictionHandlers = [
  // POST /api/v1/user/favorites - With restrictions
  http.post(`${API_BASE}/user/favorites`, async ({ request }) => {
    logRequest('POST', request.url);

    const body = await request.json().catch(() => null) as { courseId?: string } | null;
    const courseId = body?.courseId || '';

    // Check if course has favorite restrictions
    const restrictedCourse = MOCK_COURSES_WITH_STATUS.find(
      (c) => c.id === courseId && c.flags?.canFavorite === false
    );

    if (restrictedCourse && restrictedCourse.flags) {
      return HttpResponse.json(
        ERROR_RESPONSES.actionNotAllowed(restrictedCourse.flags.favoriteError || '无法收藏'),
        { status: 403 }
      );
    }

    return HttpResponse.json({
      isFavorited: true,
      message: 'Course added to favorites',
    });
  }),

  // GET /api/v1/user/favorites/:courseId - Check favorite status
  http.get(`${API_BASE}/user/favorites/:courseId`, ({ params, request }) => {
    logRequest('GET', request.url);
    const { courseId } = params;
    const id = String(courseId);

    // Check for restricted courses
    const restrictedCourse = MOCK_COURSES_WITH_STATUS.find(
      c => c.id === id && c.flags?.canFavorite === false
    );

    if (restrictedCourse && restrictedCourse.flags) {
      return HttpResponse.json({
        isFavorited: false,
        canFavorite: false,
        message: restrictedCourse.flags.favoriteError,
      });
    }

    return HttpResponse.json({ isFavorited: false });
  }),
];

// ============================================
// Report Restriction Handlers
// ============================================

export const reportRestrictionHandlers = [
  // POST /api/v1/reports - With restrictions
  http.post(`${API_BASE}/reports`, async ({ request }) => {
    logRequest('POST', request.url);

    const body = await request.json().catch(() => null) as {
      targetId?: string;
      targetType?: string;
      reason?: string;
      description?: string;
    } | null;

    const targetId = body?.targetId || '';

    // Check if course has report restrictions
    const restrictedCourse = MOCK_COURSES_WITH_STATUS.find(
      (c) => c.id === targetId && c.flags?.canReport === false
    );

    if (restrictedCourse && restrictedCourse.flags) {
      return HttpResponse.json(
        ERROR_RESPONSES.actionNotAllowed(restrictedCourse.flags.reportError || '无法举报'),
        { status: 403 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Report submitted successfully',
      reportId: `report-${Date.now()}`,
    });
  }),
];

// ============================================
// Inquiry Restriction Handlers
// ============================================

export const inquiryRestrictionHandlers = [
  // POST /api/v1/inquiries - With restrictions
  http.post(`${API_BASE}/inquiries`, async ({ request }) => {
    logRequest('POST', request.url);

    const body = await request.json().catch(() => null) as {
      courseId?: string;
      teacherId?: string;
      subject?: string;
      message?: string;
    } | null;

    const courseId = body?.courseId || '';

    // Check if course has inquiry restrictions
    const restrictedCourse = MOCK_COURSES_WITH_STATUS.find(
      (c) => c.id === courseId && c.flags?.canInquiry === false
    );

    if (restrictedCourse && restrictedCourse.flags) {
      return HttpResponse.json(
        ERROR_RESPONSES.actionNotAllowed(restrictedCourse.flags.inquiryError || '无法咨询'),
        { status: 403 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Inquiry sent successfully',
      inquiryId: `inquiry-${Date.now()}`,
    });
  }),
];

// ============================================
// Review Error Handlers
// ============================================

export const reviewErrorHandlers = [
  // GET /api/v1/reviews - With error scenarios
  http.get(`${API_BASE}/reviews`, ({ request }) => {
    logRequest('GET', request.url);

    const url = new URL(request.url);
    const fail = url.searchParams.get('fail');
    const empty = url.searchParams.get('empty');

    // Simulate load failure
    if (fail === 'true') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'REVIEW_LOAD_ERROR',
            message: '评论加载失败，请稍后重试',
          },
        },
        { status: 500 }
      );
    }

    // Return empty reviews
    if (empty === 'true') {
      return HttpResponse.json({
        data: [],
        pagination: {
          page: 1,
          pageSize: 5,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Return normal reviews
    return HttpResponse.json({
      data: [],
      pagination: {
        page: 1,
        pageSize: 5,
        total: 0,
        totalPages: 0,
      },
    });
  }),

  // POST /api/v1/reviews - With validation errors
  http.post(`${API_BASE}/reviews`, async ({ request }) => {
    logRequest('POST', request.url);

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;

    if (!body) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: '请求参数错误',
          },
        },
        { status: 400 }
      );
    }

    // Simulate rate limiting
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.includes('ratelimit')) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: '操作过于频繁，请稍后再试',
          },
        },
        { status: 429 }
      );
    }

    return HttpResponse.json(
      {
        id: `review-${Date.now()}`,
        ...(body as Record<string, unknown>),
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),
];

// ============================================
// Combined Edge Case Handlers
// Note: courseStatusHandlers is NOT included here to avoid conflict with coursesHandlers
// ============================================

export const edgeCaseHandlers = [
  ...userStatusHandlers,
  // ...courseStatusHandlers, // Removed - conflicts with coursesHandlers in index.ts
  ...favoriteRestrictionHandlers,
  ...reportRestrictionHandlers,
  ...inquiryRestrictionHandlers,
  ...reviewErrorHandlers,
];
