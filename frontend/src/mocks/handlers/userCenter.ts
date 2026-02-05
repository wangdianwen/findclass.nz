// MSW Handlers for User Center APIs
// These handlers mock user-related API endpoints for the user center

import { http, HttpResponse } from 'msw';

const API_BASE = '/api/v1';

// Logger helper
const logRequest = (method: string, url: string) => {
  console.log(`[MSW-User] ${method} ${url}`);
};

// ============================================
// Mock User Data
// ============================================

export const MOCK_USER_PROFILE = {
  id: 'user-001',
  email: 'user@example.com',
  name: '测试用户',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
  role: 'student',
  isTeacher: false,
  gender: 'male',
  phone: '021-123-4567',
  wechat: 'user123',
  showEmail: true,
  showPhone: false,
  showWechat: true,
  showRealName: false,
  createdAt: '2024-01-01T00:00:00Z',
};

export const MOCK_CHILDREN = [
  {
    id: 'child-001',
    name: '张小明',
    gender: 'male',
    grade: 'secondary-7',
    gradeLabel: 'Year 7',
  },
  {
    id: 'child-002',
    name: '张小红',
    gender: 'female',
    grade: 'primary-3',
    gradeLabel: 'Year 3',
  },
];

export const MOCK_LEARNING_HISTORY = [
  {
    id: 'history-001',
    courseId: '1',
    courseTitle: '高中数学提高班',
    institution: 'Auckland Education Center',
    lastViewedAt: '2026-01-28T10:30:00Z',
    status: 'completed',
    learnerId: undefined,
  },
  {
    id: 'history-002',
    courseId: '2',
    courseTitle: 'GCSE数学冲刺',
    institution: 'Science Academy',
    lastViewedAt: '2026-01-27T15:45:00Z',
    status: 'in_progress',
    learnerId: undefined,
  },
  {
    id: 'history-003',
    courseId: 'course-4',
    courseTitle: 'Python编程入门',
    institution: 'Online Academy',
    lastViewedAt: '2026-01-25T10:30:00Z',
    status: 'not_started',
    learnerId: 'child-001',
  },
];

export const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-001',
    type: 'system',
    title: 'Welcome to FindClass!',
    content: 'Thank you for joining us. Start exploring courses now!',
    read: false,
    createdAt: '2026-01-28T09:00:00Z',
  },
  {
    id: 'notif-002',
    type: 'course',
    title: 'New Course Available',
    content: 'A new Mathematics course matches your interests.',
    read: false,
    createdAt: '2026-01-27T14:00:00Z',
  },
  {
    id: 'notif-003',
    type: 'promotion',
    title: 'Spring Sale',
    content: 'Get 20% off on all courses this week!',
    read: true,
    createdAt: '2026-01-20T10:00:00Z',
  },
];

export const MOCK_USER_REVIEWS = [
  {
    id: 'review-user-001',
    teacherId: 'teacher-001',
    teacherName: '张老师',
    courseTitle: '高中数学提高班',
    overallRating: 5,
    content: '老师讲解非常清晰，孩子进步很大！',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'review-user-002',
    teacherId: 'teacher-002',
    teacherName: '李老师',
    courseTitle: 'GCSE数学冲刺',
    overallRating: 4,
    content: '课程内容丰富，只是进度稍微快了一点。',
    createdAt: '2026-01-10T15:30:00Z',
  },
];

// ============================================
// User Profile Handlers
// ============================================

export const userProfileHandlers = [
  // GET /api/v1/user/profile - Get user profile
  http.get(`${API_BASE}/user/profile`, ({ request }) => {
    logRequest('GET', request.url);

    // Check auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: MOCK_USER_PROFILE,
    });
  }),

  // PUT /api/v1/user/profile - Update user profile
  http.put(`${API_BASE}/user/profile`, async ({ request }) => {
    logRequest('PUT', request.url);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return HttpResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: '请求参数错误' } },
        { status: 400 }
      );
    }

    // Simulate update
    return HttpResponse.json({
      success: true,
      data: { ...MOCK_USER_PROFILE, ...(body as Record<string, unknown>) },
      message: 'Profile updated successfully',
    });
  }),

  // PUT /api/v1/user/password - Change password
  http.put(`${API_BASE}/user/password`, async ({ request }) => {
    logRequest('PUT', request.url);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return HttpResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: '请求参数错误' } },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword) {
      return HttpResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: '请填写完整信息' } },
        { status: 400 }
      );
    }

    // Mock: reject if current password is 'wrong'
    if (currentPassword === 'wrong') {
      return HttpResponse.json(
        { success: false, error: { code: 'WRONG_PASSWORD', message: '当前密码错误' } },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  }),

  // DELETE /api/v1/user/account - Delete account
  http.delete(`${API_BASE}/user/account`, async ({ request }) => {
    logRequest('DELETE', request.url);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  }),

  // POST /api/v1/user/avatar - Upload avatar
  http.post(`${API_BASE}/user/avatar`, async ({ request }) => {
    logRequest('POST', request.url);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
      },
      message: 'Avatar uploaded successfully',
    });
  }),
];

// ============================================
// Children Handlers
// ============================================

export const childrenHandlers = [
  // GET /api/v1/user/children - Get children list
  http.get(`${API_BASE}/user/children`, ({ request }) => {
    logRequest('GET', request.url);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: MOCK_CHILDREN,
    });
  }),

  // POST /api/v1/user/children - Add child
  http.post(`${API_BASE}/user/children`, async ({ request }) => {
    logRequest('POST', request.url);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return HttpResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: '请求参数错误' } },
        { status: 400 }
      );
    }

    const newChild = {
      id: `child-${Date.now()}`,
      ...(body as Record<string, unknown>),
    };

    return HttpResponse.json({
      success: true,
      data: newChild,
      message: 'Child added successfully',
    });
  }),

  // PUT /api/v1/user/children/:id - Update child
  http.put(`${API_BASE}/user/children/:id`, async ({ params, request }) => {
    logRequest('PUT', request.url);
    const { id } = params;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return HttpResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: '请求参数错误' } },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: { id, ...(body as Record<string, unknown>) },
      message: 'Child updated successfully',
    });
  }),

  // DELETE /api/v1/user/children/:id - Delete child
  http.delete(`${API_BASE}/user/children/:id`, ({ params, request }) => {
    logRequest('DELETE', request.url);
    const { id: _id } = params;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Child deleted successfully',
    });
  }),
];

// ============================================
// Learning History Handlers
// ============================================

export const learningHistoryHandlers = [
  // GET /api/v1/user/history - Get learning history
  http.get(`${API_BASE}/user/history`, ({ request }) => {
    logRequest('GET', request.url);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: MOCK_LEARNING_HISTORY,
    });
  }),

  // DELETE /api/v1/user/history/:id - Remove history item
  http.delete(`${API_BASE}/user/history/:id`, ({ params, request }) => {
    logRequest('DELETE', request.url);
    const { id: _id } = params;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'History item removed successfully',
    });
  }),
];

// ============================================
// Notifications Handlers
// ============================================

export const notificationHandlers = [
  // GET /api/v1/user/notifications - Get notifications
  http.get(`${API_BASE}/user/notifications`, ({ request }) => {
    logRequest('GET', request.url);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: MOCK_NOTIFICATIONS,
      unreadCount: MOCK_NOTIFICATIONS.filter(n => !n.read).length,
    });
  }),

  // PUT /api/v1/user/notifications/:id/read - Mark notification as read
  http.put(`${API_BASE}/user/notifications/:id/read`, ({ params, request }) => {
    logRequest('PUT', request.url);
    const { id: _id } = params;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Notification marked as read',
    });
  }),

  // PUT /api/v1/user/notifications/read-all - Mark all as read
  http.put(`${API_BASE}/user/notifications/read-all`, ({ request }) => {
    logRequest('PUT', request.url);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'All notifications marked as read',
    });
  }),

  // DELETE /api/v1/user/notifications/:id - Delete notification
  http.delete(`${API_BASE}/user/notifications/:id`, ({ params, request }) => {
    logRequest('DELETE', request.url);
    const { id: _id } = params;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  }),
];

// ============================================
// User Reviews Handlers
// ============================================

export const userReviewsHandlers = [
  // GET /api/v1/user/reviews - Get user's reviews
  http.get(`${API_BASE}/user/reviews`, ({ request }) => {
    logRequest('GET', request.url);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: MOCK_USER_REVIEWS,
      total: MOCK_USER_REVIEWS.length,
    });
  }),

  // DELETE /api/v1/user/reviews/:id - Delete user's review
  http.delete(`${API_BASE}/user/reviews/:id`, ({ params, request }) => {
    logRequest('DELETE', request.url);
    const { id: _id } = params;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: 'Review deleted successfully',
    });
  }),
];

// ============================================
// Combined User Center Handlers
// ============================================

export const userCenterHandlers = [
  ...userProfileHandlers,
  ...childrenHandlers,
  ...learningHistoryHandlers,
  ...notificationHandlers,
  ...userReviewsHandlers,
];
