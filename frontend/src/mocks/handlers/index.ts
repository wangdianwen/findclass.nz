// MSW API Handlers for FindClass.nz
// These handlers intercept API requests and return mock data
// Matching the API routes defined in services/api.ts

import { http, HttpResponse } from 'msw';
import {
  MOCK_COURSES_API,
  MOCK_COURSE_DETAIL_API,
  MOCK_SIMILAR_COURSES_API,
  MOCK_FILTER_OPTIONS,
  MOCK_REVIEW_STATS_API,
  MOCK_REVIEWS_API,
  MOCK_REGIONS,
} from '../data/apiData';

// Re-export edge case handlers and data
export * from './edgeCases';
export * from '../data/edgeCases';

// API Base URL - matches services/api.ts configuration
const API_BASE = '/api/v1';

// Logger helper
const logRequest = (method: string, url: string) => {
  console.log(`[MSW] ${method} ${url}`);
};

// Helper function to generate consistent GUID for mock data
// Format: UUID v4
function generateGuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Mock course GUIDs for consistent testing (30 courses)
const COURSE_GUIDS = [
  '550e8400-e29b-41d4-a716-446655440000', // course-1: 高中数学提高班
  '550e8400-e29b-41d4-a716-446655440001', // course-2: GCSE数学冲刺
  '550e8400-e29b-41d4-a716-446655440002', // course-3: 钢琴一对一辅导
  '550e8400-e29b-41d4-a716-446655440003', // course-4: Python编程入门
  '550e8400-e29b-41d4-a716-446655440004', // course-5: 雅思英语强化
  '550e8400-e29b-41d4-a716-446655440005', // course-6: 游泳私教课程
  '550e8400-e29b-41d4-a716-446655440006', // course-7: 物理化学补习
  '550e8400-e29b-41d4-a716-446655440007', // course-8: 绘画艺术启蒙
  '550e8400-e29b-41d4-a716-446655440008', // course-9: 小提琴精品课程
  '550e8400-e29b-41d4-a716-446655440009', // course-10: NCEA化学高分班
  '550e8400-e29b-41d4-a716-446655440010', // course-11: 机器人编程进阶
  '550e8400-e29b-41d4-a716-446655440011', // course-12: 篮球青训营
  '550e8400-e29b-41d4-a716-446655440012', // course-13: 演讲与口才训练
  '550e8400-e29b-41d4-a716-446655440013', // course-14: 创意写作工作坊
  '550e8400-e29b-41d4-a716-446655440014', // course-15: A-Level物理备考
  // Pagination test courses (16-30)
  '550e8400-e29b-41d4-a716-446655440015', // course-16: 日语入门课程
  '550e8400-e29b-41d4-a716-446655440016', // course-17: 韩语发音基础
  '550e8400-e29b-41d4-a716-446655440017', // course-18: 法语初级班
  '550e8400-e29b-41d4-a716-446655440018', // course-19: 西班牙语会话
  '550e8400-e29b-41d4-a716-446655440019', // course-20: 中文汉字书法
  '550e8400-e29b-41d4-a716-446655440020', // course-21: 高考英语强化
  '550e8400-e29b-41d4-a716-446655440021', // course-22: 少儿编程启蒙
  '550e8400-e29b-41d4-a716-446655440022', // course-23: SAT数学冲刺
  '550e8400-e29b-41d4-a716-446655440023', // course-24: NCEA生物高分班
  '550e8400-e29b-41d4-a716-446655440024', // course-25: 高尔夫球初学
  '550e8400-e29b-41d4-a716-446655440025', // course-26: 瑜伽冥想课程
  '550e8400-e29b-41d4-a716-446655440026', // course-27: 尤克里里弹唱
  '550e8400-e29b-41d4-a716-446655440027', // course-28: 科学实验探索
  '550e8400-e29b-41d4-a716-446655440028', // course-29: 辩论与演讲
  '550e8400-e29b-41d4-a716-446655440029', // course-30: 历史人文探究
];

// Teacher GUIDs (30 teachers)
const TEACHER_GUIDS = [
  '660e8400-e29b-41d4-a716-446655440000', // teacher-1: 张老师
  '660e8400-e29b-41d4-a716-446655440001', // teacher-2: 李老师
  '660e8400-e29b-41d4-a716-446655440002', // teacher-3: 王老师
  '660e8400-e29b-41d4-a716-446655440003', // teacher-4: 陈老师
  '660e8400-e29b-41d4-a716-446655440004', // teacher-5: 刘老师
  '660e8400-e29b-41d4-a716-446655440005', // teacher-6: 周教练
  '660e8400-e29b-41d4-a716-446655440006', // teacher-7: 赵老师
  '660e8400-e29b-41d4-a716-446655440007', // teacher-8: 孙老师
  '660e8400-e29b-41d4-a716-446655440008', // teacher-9: 林老师
  '660e8400-e29b-41d4-a716-446655440009', // teacher-10: 吴老师
  '660e8400-e29b-41d4-a716-446655440010', // teacher-11: 黄老师
  '660e8400-e29b-41d4-a716-446655440011', // teacher-12: 郑教练
  '660e8400-e29b-41d4-a716-446655440012', // teacher-13: 马老师
  '660e8400-e29b-41d4-a716-446655440013', // teacher-14: 冯老师
  '660e8400-e29b-41d4-a716-446655440014', // teacher-15: 杨老师
  // Pagination test teachers (16-30)
  '660e8400-e29b-41d4-a716-446655440015', // teacher-16: 山本老师
  '660e8400-e29b-41d4-a716-446655440016', // teacher-17: 金老师
  '660e8400-e29b-41d4-a716-446655440017', // teacher-18: Marie老师
  '660e8400-e29b-41d4-a716-446655440018', // teacher-19: Carlos老师
  '660e8400-e29b-41d4-a716-446655440019', // teacher-20: 陈书法家
  '660e8400-e29b-41d4-a716-446655440020', // teacher-21: 赵老师
  '660e8400-e29b-41d4-a716-446655440021', // teacher-22: 刘老师
  '660e8400-e29b-41d4-a716-446655440022', // teacher-23: 张老师
  '660e8400-e29b-41d4-a716-446655440023', // teacher-24: 吴老师
  '660e8400-e29b-41d4-a716-446655440024', // teacher-25: 王教练
  '660e8400-e29b-41d4-a716-446655440025', // teacher-26: Lisa老师
  '660e8400-e29b-41d4-a716-446655440026', // teacher-27: 高老师
  '660e8400-e29b-41d4-a716-446655440027', // teacher-28: 钱老师
  '660e8400-e29b-41d4-a716-446655440028', // teacher-29: Michael老师
  '660e8400-e29b-41d4-a716-446655440029', // teacher-30: 周老师
];

// Generate slug from title for SEO-friendly URLs
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Find course by GUID
function findCourseByGuid(guid: string) {
  const index = COURSE_GUIDS.indexOf(guid);
  return index >= 0 ? MOCK_COURSES_API[index] : null;
}

// Find teacher by GUID
function findTeacherByGuid(guid: string) {
  const index = TEACHER_GUIDS.indexOf(guid);
  return index >= 0 ? MOCK_COURSES_API[index] : null;
}

// ============================================
// Courses Handlers
// ============================================

export const coursesHandlers = [
  // GET /api/v1/courses/featured - Featured courses (MUST be before /courses/:id)
  http.get(`${API_BASE}/courses/featured`, ({ request }) => {
    logRequest('GET', request.url);
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '6');

    const featuredCourses = MOCK_COURSES_API.slice(0, limit).map((course, index) => ({
      ...course,
      id: COURSE_GUIDS[index],
      slug: generateSlug(course.title),
    }));

    return HttpResponse.json(featuredCourses);
  }),

  // GET /api/v1/courses - List all courses with optional filtering
  http.get(`${API_BASE}/courses`, ({ request }) => {
    logRequest('GET', request.url);

    const url = new URL(request.url);

    // Parse query parameters for filtering
    const city = url.searchParams.get('city');
    const subject = url.searchParams.get('subject');
    const grade = url.searchParams.get('grade');
    const region = url.searchParams.get('region');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let filteredCourses = [...MOCK_COURSES_API];

    // Apply filters
    if (city && city !== 'all') {
      filteredCourses = filteredCourses.filter(c => c.city === city);
    }
    if (subject && subject !== 'all') {
      filteredCourses = filteredCourses.filter(c => c.subject === subject);
    }
    if (grade && grade !== 'all') {
      filteredCourses = filteredCourses.filter(c => c.grade === grade);
    }
    if (region && region !== 'all') {
      filteredCourses = filteredCourses.filter(c => c.region === region);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCourses = filteredCourses.slice(startIndex, endIndex);

    // Add GUID and slug to each course
    const coursesWithGuid = paginatedCourses.map((course, index) => ({
      ...course,
      id: COURSE_GUIDS[startIndex + index] || generateGuid(),
      slug: generateSlug(course.title),
    }));

    console.log('[MSW] Returning courses:', {
      count: coursesWithGuid.length,
      total: filteredCourses.length,
    });

    return HttpResponse.json({
      data: coursesWithGuid,
      total: filteredCourses.length,
    });
  }),

  // GET /api/v1/courses/:id - Get course detail (MUST be after /courses/featured)
  // Format: /api/v1/courses/{guid} or /api/v1/courses/{numeric-id} (for E2E tests)
  http.get(`${API_BASE}/courses/:id`, ({ params, request }) => {
    logRequest('GET', request.url);
    const { id } = params;

    // Extract ID from path
    const idStr = String(id).split('/')[0];

    // E2E Test support: map numeric IDs (1-30) to valid GUIDs
    let guid = idStr;
    const numericId = parseInt(idStr, 10);
    if (!isNaN(numericId) && numericId >= 1 && numericId <= 30) {
      guid = COURSE_GUIDS[numericId - 1];
    }

    // Find course by GUID
    const course = findCourseByGuid(guid);

    if (course) {
      const index = COURSE_GUIDS.indexOf(guid);
      return HttpResponse.json({
        ...MOCK_COURSE_DETAIL_API,
        id: guid,
        slug: generateSlug(course.title),
        title: course.title,
        price: course.price,
        rating: course.rating,
        reviewCount: course.reviewCount,
        trustLevel: course.trustLevel,
        teacher: {
          ...MOCK_COURSE_DETAIL_API.teacher,
          id: TEACHER_GUIDS[index] || generateGuid(),
          name: course.teacherName,
        },
      });
    }

    return HttpResponse.json({ message: 'Course not found' }, { status: 404 });
  }),

  // GET /api/v1/courses/search - Search courses
  http.get(`${API_BASE}/courses/search`, ({ request }) => {
    logRequest('GET', request.url);
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase() || '';

    // E2E Test: No results scenario
    if (q === '不存在的课程' || q === 'nosuchcourse') {
      return HttpResponse.json({
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
        message: 'No courses found',
      });
    }

    if (!q) {
      return HttpResponse.json([]);
    }

    const results = MOCK_COURSES_API.filter(
      c =>
        c.title.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.teacherName.toLowerCase().includes(q)
    ).map((course, index) => ({
      ...course,
      id: COURSE_GUIDS[index] || generateGuid(),
      slug: generateSlug(course.title),
    }));

    return HttpResponse.json({
      data: results,
      pagination: { page: 1, pageSize: 10, total: results.length, totalPages: 1 },
    });
  }),

  // GET /api/v1/courses/filter/options - Get filter options
  http.get(`${API_BASE}/courses/filter/options`, ({ request }) => {
    logRequest('GET', request.url);
    return HttpResponse.json(MOCK_FILTER_OPTIONS);
  }),

  // GET /api/v1/courses/regions/:city - Get regions by city
  http.get(`${API_BASE}/courses/regions/:city`, ({ params, request }) => {
    logRequest('GET', request.url);
    const { city } = params;
    const regions = MOCK_REGIONS[city as keyof typeof MOCK_REGIONS] || [];

    return HttpResponse.json(regions);
  }),

  // GET /api/v1/courses/:id/similar - Get similar courses
  http.get(`${API_BASE}/courses/:id/similar`, ({ request }) => {
    logRequest('GET', request.url);
    return HttpResponse.json(MOCK_SIMILAR_COURSES_API);
  }),
];

// ============================================
// Reviews Handlers
// ============================================

export const reviewsHandlers = [
  // GET /api/v1/reviews - List reviews with filtering
  http.get(`${API_BASE}/reviews`, ({ request }) => {
    logRequest('GET', request.url);
    const url = new URL(request.url);
    const teacherId = url.searchParams.get('teacherId');
    const courseId = url.searchParams.get('courseId');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '5');

    let filteredReviews = [...MOCK_REVIEWS_API];

    if (teacherId) {
      filteredReviews = filteredReviews.filter(r => r.teacherId === teacherId);
    }
    if (courseId) {
      filteredReviews = filteredReviews.filter(r => r.courseId === courseId);
    }

    // Pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedReviews = filteredReviews.slice(startIndex, endIndex);

    return HttpResponse.json({
      data: paginatedReviews,
      pagination: {
        page,
        pageSize,
        total: filteredReviews.length,
        totalPages: Math.ceil(filteredReviews.length / pageSize),
      },
    });
  }),

  // GET /api/v1/reviews/stats/:teacherId - Get review statistics
  http.get(`${API_BASE}/reviews/stats/:teacherId`, ({ params, request }) => {
    logRequest('GET', request.url);
    const { teacherId } = params;

    return HttpResponse.json({
      ...MOCK_REVIEW_STATS_API,
      teacherId,
    });
  }),

  // POST /api/v1/reviews - Create a review
  http.post(`${API_BASE}/reviews`, async ({ request }) => {
    logRequest('POST', request.url);
    const body = await request.json();

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
// Tutors/Teachers Handlers
// ============================================

export const tutorsHandlers = [
  // GET /api/v1/tutors - List tutors with filtering
  http.get(`${API_BASE}/tutors`, ({ request }) => {
    logRequest('GET', request.url);
    const url = new URL(request.url);
    const city = url.searchParams.get('city');
    const subject = url.searchParams.get('subject');

    let tutors = MOCK_COURSES_API.map((c, index) => ({
      id: TEACHER_GUIDS[index] || generateGuid(),
      name: c.teacherName,
      city: c.city,
      subject: c.subject,
      rating: c.rating,
      reviewCount: c.reviewCount,
      trustLevel: c.trustLevel,
      teachingMode: c.teachingMode,
    }));

    if (city && city !== 'all') {
      tutors = tutors.filter(t => t.city === city);
    }
    if (subject && subject !== 'all') {
      tutors = tutors.filter(t => t.subject === subject);
    }

    return HttpResponse.json(tutors);
  }),

  // GET /api/v1/tutors/:id - Get tutor detail
  http.get(`${API_BASE}/tutors/:id`, ({ params, request }) => {
    logRequest('GET', request.url);
    const { id } = params;

    // Extract GUID from path
    const guid = String(id).split('/')[0];

    // Find teacher by GUID
    const course = findTeacherByGuid(guid);

    if (!course) {
      return HttpResponse.json({ message: 'Teacher not found' }, { status: 404 });
    }

    return HttpResponse.json({
      id: guid,
      name: course.teacherName,
      bio: '经验丰富的新西兰注册教师，专注于帮助学生提高成绩。',
      city: course.city,
      subject: course.subject,
      rating: course.rating,
      reviewCount: course.reviewCount,
      trustLevel: course.trustLevel,
      teachingMode: course.teachingMode,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${course.teacherName}`,
      verified: true,
      teachingYears: 5,
    });
  }),
];

// ============================================
// Search Handlers
// ============================================

export const searchHandlers = [
  // GET /api/v1/search/popular - Get popular searches
  http.get(`${API_BASE}/search/popular`, ({ request }) => {
    logRequest('GET', request.url);
    return HttpResponse.json(['高中数学', '雅思英语', '钢琴辅导', '编程入门', '物理补习']);
  }),

  // GET /api/v1/search/suggestions - Get search suggestions
  http.get(`${API_BASE}/search/suggestions`, ({ request }) => {
    logRequest('GET', request.url);
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.toLowerCase() || '';

    if (!query) {
      return HttpResponse.json([]);
    }

    const suggestions = MOCK_COURSES_API.filter(
      c =>
        c.title.toLowerCase().includes(query) ||
        c.subject.toLowerCase().includes(query) ||
        c.teacherName.toLowerCase().includes(query)
    )
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        title: c.title,
        type: 'course',
        teacherName: c.teacherName,
        subject: c.subject,
      }));

    return HttpResponse.json(suggestions);
  }),
];

// ============================================
// Auth Handlers
// ============================================

export const authHandlers = [
  // POST /api/v1/auth/login - Login with email and password
  // If email contains "teacher", returns teacher token and user info
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    logRequest('POST', request.url);
    const body = (await request.json().catch(() => null)) as {
      email?: string;
      password?: string;
    } | null;

    if (!body) {
      return HttpResponse.json({ success: false, message: '请求参数错误' }, { status: 400 });
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Validate password (mock: 'wrong' will fail)
    if (body.password === 'wrong') {
      return HttpResponse.json({
        success: false,
        message: '密码错误',
      });
    }

    // Check if email contains "teacher" to determine user role
    const isTeacherEmail = String(body.email || '')
      .toLowerCase()
      .includes('teacher');
    const tokenRole = isTeacherEmail ? '-teacher' : '';

    return HttpResponse.json({
      success: true,
      data: {
        accessToken: `mock-access-token${tokenRole}-${Date.now()}`,
        refreshToken: `mock-refresh-token${tokenRole}-${Date.now()}`,
        expiresIn: 86400,
        tokenType: 'Bearer',
      },
      message: '登录成功',
    });
  }),

  // POST /api/v1/auth/register - Register new user
  // If email contains "teacher", registers as teacher
  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    logRequest('POST', request.url);
    const body = (await request.json().catch(() => null)) as {
      email?: string;
      password?: string;
      code?: string;
    } | null;

    if (!body) {
      return HttpResponse.json({ success: false, message: '请求参数错误' }, { status: 400 });
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Validate code
    if (body.code === '000000') {
      return HttpResponse.json({
        success: false,
        message: '验证码错误',
      });
    }

    // Check if email already exists (mock)
    if (String(body.email || '').includes('existing')) {
      return HttpResponse.json({ success: false, message: '该邮箱已被注册' }, { status: 409 });
    }

    // Check if email contains "teacher" to determine user role
    const isTeacherEmail = String(body.email || '')
      .toLowerCase()
      .includes('teacher');
    const tokenRole = isTeacherEmail ? '-teacher' : '';

    return HttpResponse.json({
      success: true,
      data: {
        accessToken: `mock-access-token${tokenRole}-${Date.now()}`,
        refreshToken: `mock-refresh-token${tokenRole}-${Date.now()}`,
        expiresIn: 86400,
        tokenType: 'Bearer',
      },
      message: '注册成功',
    });
  }),

  // POST /api/v1/auth/refresh - Refresh access token
  http.post(`${API_BASE}/auth/refresh`, async ({ request }) => {
    logRequest('POST', request.url);
    const body = (await request.json().catch(() => null)) as { refreshToken?: string } | null;

    if (!body?.refreshToken) {
      return HttpResponse.json({ success: false, message: '无效的刷新令牌' }, { status: 401 });
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Validate refresh token format (mock)
    if (!String(body.refreshToken).includes('mock-refresh-token')) {
      return HttpResponse.json({ success: false, message: '无效的刷新令牌' }, { status: 401 });
    }

    return HttpResponse.json({
      success: true,
      data: {
        accessToken: 'mock-access-token-' + Date.now(),
        expiresIn: 86400,
        tokenType: 'Bearer',
      },
    });
  }),

  // POST /api/v1/auth/reset-password - Reset password
  http.post(`${API_BASE}/auth/reset-password`, async ({ request }) => {
    logRequest('POST', request.url);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (!body) {
      return HttpResponse.json({ success: false, message: '请求参数错误' }, { status: 400 });
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Validate code
    if (body.code === '000000') {
      return HttpResponse.json({
        success: false,
        message: '验证码错误',
      });
    }

    return HttpResponse.json({
      success: true,
      message: '密码重置成功',
    });
  }),

  // POST /api/v1/auth/send-code - Send verification code
  http.post(`${API_BASE}/auth/send-code`, async ({ request }) => {
    logRequest('POST', request.url);
    const body = (await request.json().catch(() => null)) as { email?: string } | null;

    if (!body || !body.email) {
      return HttpResponse.json({ success: false, message: '请输入邮箱地址' }, { status: 400 });
    }

    // Note: Email format validation is done by frontend
    // This handler only handles business logic validation

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Rate limit check (mock)
    if (body.email.includes('ratelimit')) {
      return HttpResponse.json(
        { success: false, message: '发送过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: '验证码已发送',
    });
  }),

  // GET /api/v1/auth/me - Get current user info
  // Requires Authorization header with Bearer token
  // Determines user role based on token content:
  // - Token contains "teacher" -> returns teacher user
  // - Otherwise -> returns student user
  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    logRequest('GET', request.url);

    // Check for Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    // Check if token contains "teacher" to determine user role
    const isTeacherUser = authHeader.includes('teacher');

    if (isTeacherUser) {
      // Teacher user
      return HttpResponse.json({
        success: true,
        data: {
          id: 'user-teacher-001',
          email: 'teacher@example.com',
          name: '张老师',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher',
          role: 'teacher',
          isTeacher: true,
          teacherInfo: {
            id: '660e8400-e29b-41d4-a716-446655440000',
            bio: '经验丰富的新西兰注册教师，专注于帮助学生提高成绩。',
            teachingYears: 5,
            verified: true,
            rating: 4.8,
            reviewCount: 128,
            subjects: ['数学', '物理'],
            teachingModes: ['线上', '线下'],
            studentsCount: 50,
            coursesCount: 6,
          },
          createdAt: '2024-01-01T00:00:00Z',
        },
      });
    }

    // Regular student user
    return HttpResponse.json({
      success: true,
      data: {
        id: 'user-student-001',
        email: 'user@example.com',
        name: '测试用户',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
        role: 'student',
        isTeacher: false,
        teacherInfo: null,
        createdAt: '2024-01-01T00:00:00Z',
      },
    });
  }),
];

// ============================================
// Social Login Handlers
// ============================================

export const socialLoginHandlers = [
  // POST /api/v1/auth/social-login - Social login (Google, WeChat)
  http.post(`${API_BASE}/auth/social-login`, async ({ request }) => {
    logRequest('POST', request.url);
    const body = (await request.json().catch(() => null)) as {
      provider?: string;
      credential?: string;
    } | null;

    if (!body || !body.provider) {
      return HttpResponse.json(
        { success: false, message: 'Provider is required' },
        { status: 400 }
      );
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Validate Google credential
    if (body.provider === 'google' && !body.credential) {
      return HttpResponse.json(
        { success: false, message: 'Google credential is required' },
        { status: 400 }
      );
    }

    // Determine user role based on email in credential (mock)
    // Google credential contains user info in JWT format
    let isTeacherUser = false;
    let userEmail = 'google-user@example.com';
    let userName = 'Google User';

    if (body.credential) {
      // Decode mock JWT to get user info (simplified)
      try {
        const parts = body.credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          userEmail = payload.email || userEmail;
          userName = payload.name || userName;
          isTeacherUser = String(userEmail).toLowerCase().includes('teacher');
        }
      } catch {
        // Invalid token, use defaults
      }
    }

    // Mock WeChat login
    if (body.provider === 'wechat') {
      userEmail = 'wechat-user@example.com';
      userName = 'WeChat User';
      isTeacherUser = false;
    }

    const tokenRole = isTeacherUser ? '-teacher' : '';

    return HttpResponse.json({
      success: true,
      data: {
        accessToken: `mock-social-token${tokenRole}-${Date.now()}`,
        refreshToken: `mock-social-refresh${tokenRole}-${Date.now()}`,
        expiresIn: 86400,
        tokenType: 'Bearer',
      },
      message: 'Social login successful',
    });
  }),
];

// ============================================
// User Handlers (Favorites)
// ============================================

export const userHandlers = [
  // POST /api/v1/user/favorites - Toggle favorite
  http.post(`${API_BASE}/user/favorites`, async ({ request }) => {
    logRequest('POST', request.url);
    const body = (await request.json().catch(() => null)) as { courseId?: string } | null;

    if (!body?.courseId) {
      return HttpResponse.json(
        { success: false, message: 'courseId is required' },
        { status: 400 }
      );
    }

    // Simulate toggle
    return HttpResponse.json({
      isFavorited: true,
      message: 'Course added to favorites',
    });
  }),

  // GET /api/v1/user/favorites - Get favorites
  http.get(`${API_BASE}/user/favorites`, ({ request }) => {
    logRequest('GET', request.url);
    return HttpResponse.json({
      courseIds: ['1', '2', '3'],
    });
  }),

  // GET /api/v1/user/favorites/:courseId - Check if favorited
  http.get(`${API_BASE}/user/favorites/:courseId`, ({ params, request }) => {
    logRequest('GET', request.url);
    const { courseId } = params;

    // Mock: courses 1, 2, 3 are favorited
    const isFavorited = ['1', '2', '3'].includes(String(courseId));

    return HttpResponse.json({ isFavorited });
  }),
];

// ============================================
// Inquiry Handlers
// ============================================

export const inquiryHandlers = [
  // POST /api/v1/inquiries - Send inquiry
  http.post(`${API_BASE}/inquiries`, async ({ request }) => {
    logRequest('POST', request.url);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (!body) {
      return HttpResponse.json(
        { success: false, message: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return HttpResponse.json({
      success: true,
      message: 'Inquiry sent successfully',
      inquiryId: `inquiry-${Date.now()}`,
    });
  }),

  // POST /api/v1/reports - Submit report
  http.post(`${API_BASE}/reports`, async ({ request }) => {
    logRequest('POST', request.url);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (!body) {
      return HttpResponse.json(
        { success: false, message: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    const { targetType, targetId, reason, description } = body as {
      targetType?: string;
      targetId?: string;
      reason?: string;
      description?: string;
    };

    if (!targetType || !targetId || !reason || !description) {
      return HttpResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return HttpResponse.json({
      success: true,
      message: 'Report submitted successfully',
      reportId: `report-${Date.now()}`,
    });
  }),
];

// ============================================
// Combined Handlers
// ============================================

export const handlers = [
  ...coursesHandlers,
  ...reviewsHandlers,
  ...tutorsHandlers,
  ...searchHandlers,
  ...authHandlers,
  ...socialLoginHandlers,
  ...userHandlers,
  ...inquiryHandlers,
];

// Re-export edge case handlers for testing specific error scenarios
// Note: courseStatusHandlers is NOT re-exported to avoid conflict with coursesHandlers
export {
  userStatusHandlers,
  favoriteRestrictionHandlers,
  reportRestrictionHandlers,
  inquiryRestrictionHandlers,
  reviewErrorHandlers,
} from './edgeCases';
export * from '../data/edgeCases';

// Re-export user center handlers
export { userCenterHandlers } from './userCenter';
