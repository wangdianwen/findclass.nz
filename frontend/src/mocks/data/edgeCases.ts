// Mock data for edge cases and error scenarios
// This file contains mock data for testing various error conditions

import type { CourseData } from '../../data/courseData';
import type { CourseDetail } from '../../types/courseDetail';
import type { Review } from '../../types/review';
import { MOCK_REVIEWS_API } from './apiData';

// ============================================
// User Status Types
// ============================================

export type UserStatus = 'active' | 'deleted' | 'banned' | 'suspended';

export interface MockUser {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  role: 'student' | 'teacher';
  createdAt: string;
}

// ============================================
// User Mock Data with Different States
// ============================================

export const MOCK_USERS: MockUser[] = [
  // Active user (正常用户)
  {
    id: 'user-active-001',
    email: 'active@example.com',
    name: '正常用户',
    status: 'active',
    role: 'student',
    createdAt: '2024-01-01T00:00:00Z',
  },
  // Deleted user (已删除用户)
  {
    id: 'user-deleted-001',
    email: 'deleted@example.com',
    name: '已删除用户',
    status: 'deleted',
    role: 'student',
    createdAt: '2023-06-01T00:00:00Z',
  },
  // Banned user (已封禁用户)
  {
    id: 'user-banned-001',
    email: 'banned@example.com',
    name: '封禁用户',
    status: 'banned',
    role: 'student',
    createdAt: '2023-01-01T00:00:00Z',
  },
];

// ============================================
// Course Status Types
// ============================================

export type CourseStatus = 'published' | 'draft' | 'unpublished' | 'deleted';

// Extended CourseData with status and flags
export interface MockCourseData extends CourseData {
  status: CourseStatus;
  publishAt?: string;
  unpublishAt?: string;
  flags?: {
    canFavorite?: boolean;
    favoriteError?: string;
    canReport?: boolean;
    reportError?: string;
    canInquiry?: boolean;
    inquiryError?: string;
  };
}

// ============================================
// Courses with Different States
// ============================================

export const MOCK_COURSES_WITH_STATUS: MockCourseData[] = [
  // Normal published course
  {
    id: '1',
    title: '高中数学提高班',
    price: 50,
    lessonCount: 12,
    lessonDuration: 90,
    rating: 4.9,
    reviewCount: 128,
    city: 'auckland',
    region: 'Auckland CBD',
    subject: '数学',
    grade: '高中',
    teacherName: '张老师',
    trustLevel: 'S',
    teachingMode: 'offline',
    language: '中文授课',
    schedule: '周末下午',
    status: 'published',
  },
  // Draft course (草稿，未发布)
  {
    id: 'course-draft-001',
    title: '草稿课程测试',
    price: 40,
    lessonCount: 10,
    lessonDuration: 60,
    rating: 0,
    reviewCount: 0,
    city: 'auckland',
    region: 'Epsom',
    subject: '数学',
    grade: '初中',
    teacherName: '李老师',
    trustLevel: 'A',
    teachingMode: 'offline',
    language: '中英双语',
    schedule: '平日晚上',
    status: 'draft',
  },
  // Unpublished course (已下架)
  {
    id: 'course-unpublished-001',
    title: '已下架课程',
    price: 35,
    lessonCount: 8,
    lessonDuration: 60,
    rating: 4.5,
    reviewCount: 20,
    city: 'wellington',
    region: 'Karori',
    subject: '美术',
    grade: '小学',
    teacherName: '孙老师',
    trustLevel: 'A',
    teachingMode: 'offline',
    language: '中文授课',
    schedule: '周末下午',
    status: 'unpublished',
  },
  // Course that cannot be favorited (special restrictions)
  {
    id: 'course-nofavorite-001',
    title: '不可收藏课程',
    price: 100,
    lessonCount: 20,
    lessonDuration: 90,
    rating: 5.0,
    reviewCount: 50,
    city: 'auckland',
    region: 'Newmarket',
    subject: '音乐',
    grade: '成人',
    teacherName: 'VIP教师',
    trustLevel: 'S',
    teachingMode: 'offline',
    language: '英文授课',
    schedule: '灵活时间',
    status: 'published',
    // Custom flag for special handling
    flags: {
      canFavorite: false,
      favoriteError: 'VIP课程不支持收藏功能',
      canReport: false,
      reportError: '该课程暂不支持举报',
    },
  },
  // Course that cannot be reported
  {
    id: 'course-noreport-001',
    title: '不可举报测试课程',
    price: 45,
    lessonCount: 12,
    lessonDuration: 60,
    rating: 4.7,
    reviewCount: 35,
    city: 'christchurch',
    region: 'Riccarton',
    subject: '理科',
    grade: '高中',
    teacherName: '赵老师',
    trustLevel: 'A',
    teachingMode: 'offline',
    language: '中文授课',
    schedule: '平日晚上',
    status: 'published',
    flags: {
      canReport: false,
      reportError: '该课程已通过官方认证，无需举报',
    },
  },
  // Course with disabled inquiry
  {
    id: 'course-noinquiry-001',
    title: '暂停咨询课程',
    price: 55,
    lessonCount: 15,
    lessonDuration: 90,
    rating: 4.8,
    reviewCount: 45,
    city: 'online',
    region: 'Online',
    subject: '编程',
    grade: '初中',
    teacherName: '陈老师',
    trustLevel: 'A',
    teachingMode: 'online',
    language: '中文授课',
    schedule: '平日晚上',
    status: 'published',
    flags: {
      canInquiry: false,
      inquiryError: '该课程当前暂停咨询服务，请稍后再试',
    },
  },
  // Course with user interaction disabled
  {
    id: 'course-nointeraction-001',
    title: '用户互动受限课程',
    price: 60,
    lessonCount: 10,
    lessonDuration: 60,
    rating: 4.6,
    reviewCount: 28,
    city: 'auckland',
    region: 'Remuera',
    subject: '英语',
    grade: '成人',
    teacherName: '刘老师',
    trustLevel: 'S',
    teachingMode: 'offline',
    language: '英文授课',
    schedule: '周末上午',
    status: 'published',
    flags: {
      canFavorite: false,
      favoriteError: '该课程暂时无法收藏',
      canInquiry: false,
      inquiryError: '教师暂未开启咨询服务',
      canReport: false,
      reportError: '该课程不支持举报功能',
    },
  },
];

// ============================================
// Course Detail with Extended Properties
// ============================================

export const MOCK_COURSE_DETAIL_WITH_STATUS: Record<string, CourseDetail & {
  status: CourseStatus;
  flags?: MockCourseData['flags'];
}> = {
  '1': {
    id: '1',
    title: '高中数学提高班',
    description: '<p>课程描述...</p>',
    price: 50,
    lessonCount: 12,
    originalPrice: 60,
    rating: 4.9,
    reviewCount: 128,
    trustLevel: 'S',
    dataSource: 'first_party',
    sourceWeight: 1.5,
    publishedAt: '2025-01-10T10:00:00Z',
    updatedAt: '2026-01-15T14:30:00Z',
    subject: '数学',
    grade: ['高中'],
    teachingMode: 'offline',
    language: 'chinese',
    schedule: {
      days: ['Sat', 'Sun'],
      timeSlots: ['14:00-16:00'],
      duration: 120,
      location: 'Auckland CBD',
      address: '123 Queen Street, Auckland',
      showAddress: true,
    },
    teacher: {
      id: 'teacher-001',
      name: '张老师',
      title: '奥克兰大学数学硕士',
      bio: '8年新西兰高中数学教学经验...',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zhang',
      verified: true,
      teachingYears: 8,
      qualifications: ['奥克兰大学数学硕士'],
    },
    contact: {
      phone: '021-***-4567',
      wechat: 'wx******1234',
      email: 'te***@example.com',
      showPhone: true,
      showWechat: true,
      showEmail: true,
    },
    tags: ['数学辅导', 'NCEA'],
    userInteraction: {
      isFavorited: false,
      isCompared: false,
    },
    images: [
      'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',
    ],
    status: 'published',
  },
  'course-draft-001': {
    id: 'course-draft-001',
    title: '草稿课程测试',
    description: '<p>草稿课程的描述...</p>',
    price: 40,
    lessonCount: 10,
    rating: 0,
    reviewCount: 0,
    trustLevel: 'A',
    dataSource: 'first_party',
    sourceWeight: 1.0,
    publishedAt: '',
    updatedAt: '2026-01-20T10:00:00Z',
    subject: '数学',
    grade: ['初中'],
    teachingMode: 'offline',
    language: 'chinese',
    schedule: {
      days: ['Mon', 'Wed', 'Fri'],
      timeSlots: ['18:00-19:00'],
      duration: 60,
      location: 'Epsom',
      address: '456 Main Street, Epsom',
      showAddress: true,
    },
    teacher: {
      id: 'teacher-002',
      name: '李老师',
      title: '数学教师',
      bio: '多年教学经验...',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Li',
      verified: false,
      teachingYears: 3,
      qualifications: [],
    },
    contact: {
      phone: '',
      wechat: '',
      email: '',
      showPhone: false,
      showWechat: false,
      showEmail: false,
    },
    tags: [],
    userInteraction: {
      isFavorited: false,
      isCompared: false,
    },
    images: [],
    status: 'draft',
  },
  'course-nofavorite-001': {
    id: 'course-nofavorite-001',
    title: '不可收藏课程',
    description: '<p>VIP课程不支持收藏...</p>',
    price: 100,
    lessonCount: 20,
    rating: 5.0,
    reviewCount: 50,
    trustLevel: 'S',
    dataSource: 'first_party',
    sourceWeight: 1.5,
    publishedAt: '2025-06-01T10:00:00Z',
    updatedAt: '2026-01-10T14:30:00Z',
    subject: '音乐',
    grade: ['成人'],
    teachingMode: 'offline',
    language: 'english',
    schedule: {
      days: ['Sat'],
      timeSlots: ['10:00-11:00'],
      duration: 60,
      location: 'Newmarket',
      address: '789 Music Lane, Newmarket',
      showAddress: true,
    },
    teacher: {
      id: 'teacher-vip',
      name: 'VIP教师',
      title: '音乐大师',
      bio: '国际知名音乐教师...',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VIP',
      verified: true,
      teachingYears: 20,
      qualifications: ['音乐博士', '皇家音乐学院认证'],
    },
    contact: {
      phone: '021-999-9999',
      wechat: 'vip-teacher',
      email: 'vip@example.com',
      showPhone: true,
      showWechat: true,
      showEmail: true,
    },
    tags: ['VIP', '音乐大师课'],
    userInteraction: {
      isFavorited: false,
      isCompared: false,
    },
    images: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    ],
    status: 'published',
    flags: {
      canFavorite: false,
      favoriteError: 'VIP课程不支持收藏功能',
      canReport: false,
      reportError: '该课程暂不支持举报',
    },
  },
};

// ============================================
// Review Scenarios
// ============================================

export const MOCK_REVIEW_SCENARIOS = {
  // Normal reviews
  normal: MOCK_REVIEWS_API,

  // Empty reviews (course has no reviews)
  empty: [] as Review[],

  // Failed to load reviews (simulated error)
  loadError: null as Review[] | null,
};

// ============================================
// Error Response Templates
// ============================================

export const ERROR_RESPONSES = {
  // User not found
  userNotFound: {
    success: false,
    error: {
      code: 'USER_NOT_FOUND',
      message: '用户不存在或已被删除',
    },
  },

  // User banned
  userBanned: {
    success: false,
    error: {
      code: 'USER_BANNED',
      message: '该账户已被封禁，请联系客服',
    },
  },

  // Course not found
  courseNotFound: {
    success: false,
    error: {
      code: 'COURSE_NOT_FOUND',
      message: '课程不存在或已被删除',
    },
  },

  // Course not published
  courseNotPublished: {
    success: false,
    error: {
      code: 'COURSE_NOT_PUBLISHED',
      message: '课程尚未发布',
    },
  },

  // Action not allowed
  actionNotAllowed: (message: string) => ({
    success: false,
    error: {
      code: 'ACTION_NOT_ALLOWED',
      message,
    },
  }),

  // Server error
  serverError: {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '服务器错误，请稍后重试',
    },
  },

  // Unauthorized
  unauthorized: {
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: '请先登录再进行此操作',
    },
  },
};
