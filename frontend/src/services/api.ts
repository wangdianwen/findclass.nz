// ============================================
// API Services
// ============================================

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import type { CourseData } from '@/data/courseData';
import type { CourseDetail } from '@/types/courseDetail';
import { ApiException, ErrorCodes, getErrorMessage } from './errors';

// API 配置
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// 请求拦截器
// ============================================

apiClient.interceptors.request.use(
  config => {
    // 从 localStorage 获取认证 token
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加请求时间戳（用于调试）
    config.headers['X-Request-Time'] = Date.now().toString();

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ============================================
// 响应拦截器
// ============================================

apiClient.interceptors.response.use(
  response => {
    // 成功响应
    const { data } = response;

    // 如果后端返回统一格式
    if (data && typeof data === 'object' && 'success' in data) {
      const apiResponse = data as {
        success: boolean;
        data?: unknown;
        error?: { code: string; message: string };
      };
      if (!apiResponse.success && apiResponse.error) {
        throw new ApiException(apiResponse.error.code, apiResponse.error.message);
      }
    }

    return response;
  },
  (error: AxiosError) => {
    // 错误处理
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 0;
      const message = error.message || 'Unknown error';

      // 网络错误
      if (error.code === 'ECONNABORTED' || message.includes('timeout')) {
        throw new ApiException(ErrorCodes.TIMEOUT, getErrorMessage(ErrorCodes.TIMEOUT), status);
      }

      if (!error.response) {
        // 网络错误（无响应）
        throw new ApiException(ErrorCodes.NETWORK_ERROR, getErrorMessage(ErrorCodes.NETWORK_ERROR));
      }

      // 服务器错误
      const errorCode = getErrorCodeFromStatus(status);
      throw new ApiException(errorCode, getErrorMessage(errorCode), status);
    }

    // 未知错误
    throw new ApiException(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
);

// HTTP Status to Error Code 映射
function getErrorCodeFromStatus(status: number): (typeof ErrorCodes)[keyof typeof ErrorCodes] {
  if (status >= 500) {
    return ErrorCodes.INTERNAL_ERROR;
  }
  if (status >= 400) {
    switch (status) {
      case 400:
        return ErrorCodes.BAD_REQUEST;
      case 401:
        return ErrorCodes.UNAUTHORIZED;
      case 403:
        return ErrorCodes.FORBIDDEN;
      case 404:
        return ErrorCodes.NOT_FOUND;
      default:
        return ErrorCodes.BAD_REQUEST;
    }
  }
  return ErrorCodes.UNKNOWN_ERROR;
}

// ============================================
// API 请求封装
// ============================================

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request(config);
  return response.data as T;
}

// ============================================
// 课程相关API
// ============================================

export const courseApi = {
  // 获取课程列表
  async getCourses(params?: {
    city?: string;
    region?: string;
    subject?: string;
    grade?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: CourseData[]; total: number }> {
    const response = await request<{
      data: { items: CourseData[]; pagination: { total: number } };
    }>({
      method: 'GET',
      url: '/courses/search',
      params,
    });
    // Transform API response to component-expected format
    return {
      data: response.data.items,
      total: response.data.pagination.total,
    };
  },

  // 获取课程详情
  async getCourseById(id: string): Promise<CourseDetail> {
    const response = await apiClient.request<{
      success: boolean;
      code: number;
      message: string;
      data: CourseDetail;
      meta: { requestId: string; timestamp: string };
    }>({
      method: 'GET',
      url: `/courses/${id}`,
    });
    // Extract the course detail from the API response
    return response.data.data;
  },

  // 搜索课程
  async searchCourses(keyword: string): Promise<CourseData[]> {
    return request({
      method: 'GET',
      url: '/courses/search',
      params: { keyword },
    });
  },

  // 获取热门课程
  async getFeaturedCourses(limit: number = 6): Promise<CourseData[]> {
    return request({
      method: 'GET',
      url: '/courses/featured',
      params: { limit },
    });
  },

  // 获取相似课程
  async getSimilarCourses(id: string): Promise<CourseData[]> {
    return request({
      method: 'GET',
      url: `/courses/${id}/similar`,
    });
  },
};

// ============================================
// 评论相关API
// ============================================

import type { Review, ReviewStatistics } from '@/types/review';

export const reviewApi = {
  // 获取评论列表
  async getReviews(params?: {
    teacherId?: string;
    courseId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: Review[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    return request({
      method: 'GET',
      url: '/reviews',
      params,
    });
  },

  // 获取评论统计
  async getReviewStats(teacherId: string): Promise<ReviewStatistics> {
    return request({
      method: 'GET',
      url: `/reviews/stats/${teacherId}`,
    });
  },

  // 创建评论
  async createReview(data: {
    teacherId: string;
    courseId?: string;
    bookingId?: string;
    overallRating: number;
    content: string;
  }): Promise<Review> {
    return request({
      method: 'POST',
      url: '/reviews',
      data,
    });
  },
};

// ============================================
// 用户相关 API
// ============================================

export const userApi = {
  // 收藏/取消收藏课程
  async toggleFavorite(courseId: string): Promise<{ isFavorited: boolean; message: string }> {
    return request({
      method: 'POST',
      url: `/courses/${courseId}/favorite`,
    });
  },

  // 获取收藏列表
  async getFavorites(): Promise<{ courseIds: string[] }> {
    return request({
      method: 'GET',
      url: '/users/favorites',
    });
  },

  // 检查是否已收藏
  async checkFavorite(courseId: string): Promise<{ isFavorited: boolean }> {
    return request({
      method: 'GET',
      url: `/users/favorites/${courseId}`,
    });
  },
};

// ============================================
// 咨询相关 API
// ============================================

export const inquiryApi = {
  // 发送咨询
  async sendInquiry(data: {
    courseId: string;
    teacherId: string;
    subject: string;
    message: string;
  }): Promise<{ success: boolean; message: string; inquiryId: string }> {
    return request({
      method: 'POST',
      url: '/inquiries',
      data,
    });
  },

  // 提交举报（复用咨询表单结构）
  async submitReport(data: {
    targetType: 'course' | 'teacher' | 'review';
    targetId: string;
    reason: string;
    description: string;
  }): Promise<{ success: boolean; message: string; reportId: string }> {
    return request({
      method: 'POST',
      url: '/reports',
      data,
    });
  },
};

// ============================================
// 教师相关API
// ============================================

export const tutorApi = {
  async getTutors(params?: { city?: string; subject?: string }): Promise<unknown[]> {
    return request({
      method: 'GET',
      url: '/tutors',
      params,
    });
  },

  async getTutorById(id: string): Promise<unknown> {
    return request({
      method: 'GET',
      url: `/tutors/${id}`,
    });
  },
};

// ============================================
// 搜索相关API
// ============================================

export const searchApi = {
  async getPopularSearches(): Promise<string[]> {
    return request({
      method: 'GET',
      url: '/search/popular',
    });
  },

  async getSuggestions(keyword: string): Promise<string[]> {
    return request({
      method: 'GET',
      url: '/search/suggestions',
      params: { q: keyword },
    });
  },
};

// ============================================
// 认证相关API
// ============================================

// Token 数据
export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

// 登录请求参数
export interface LoginParams {
  email: string;
  password: string;
}

// 登录响应
export interface LoginResponse {
  success: boolean;
  data?: TokenData;
  message: string;
}

// 注册请求参数
export interface RegisterParams {
  email: string;
  password: string;
  code: string;
}

// 注册响应
export interface RegisterResponse {
  success: boolean;
  data?: TokenData;
  message: string;
}

// 刷新 Token 请求参数
export interface RefreshTokenParams {
  refreshToken: string;
}

// 刷新 Token 响应
export interface RefreshTokenResponse {
  success: boolean;
  data?: Pick<TokenData, 'accessToken' | 'expiresIn' | 'tokenType'>;
  message?: string;
}

// 重置密码请求参数
export interface ResetPasswordParams {
  email: string;
  password: string;
  code: string;
}

// 重置密码响应
export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

// 发送验证码响应
export interface SendCodeResponse {
  success: boolean;
  message: string;
}

export const authApi = {
  // 登录
  async login(params: LoginParams): Promise<LoginResponse> {
    return request({
      method: 'POST',
      url: '/auth/login',
      data: params,
    });
  },

  // 注册
  async register(params: RegisterParams): Promise<RegisterResponse> {
    return request({
      method: 'POST',
      url: '/auth/register',
      data: params,
    });
  },

  // 刷新 Token
  async refresh(params: RefreshTokenParams): Promise<RefreshTokenResponse> {
    return request({
      method: 'POST',
      url: '/auth/refresh',
      data: params,
    });
  },

  // 重置密码
  async resetPassword(params: ResetPasswordParams): Promise<ResetPasswordResponse> {
    return request({
      method: 'POST',
      url: '/auth/reset-password',
      data: params,
    });
  },

  // 发送验证码
  async sendVerificationCode(email: string): Promise<SendCodeResponse> {
    return request({
      method: 'POST',
      url: '/auth/send-code',
      data: { email },
    });
  },

  // 社交登录 (Google, WeChat 等)
  async socialLogin(provider: 'google' | 'wechat', credential?: string): Promise<LoginResponse> {
    return request({
      method: 'POST',
      url: '/auth/social-login',
      data: { provider, credential },
    });
  },

  // 获取当前用户信息
  async getMe(): Promise<{
    success: boolean;
    data: {
      id: string;
      email: string;
      name: string;
      avatar: string;
      role: string;
      isTeacher: boolean;
      teacherInfo: {
        id: string;
        bio: string;
        teachingYears: number;
        verified: boolean;
        rating: number;
        reviewCount: number;
        subjects: string[];
        teachingModes: string[];
        studentsCount: number;
        coursesCount: number;
      } | null;
      createdAt: string;
    };
    message?: string;
  }> {
    return request({
      method: 'GET',
      url: '/auth/me',
    });
  },
};

// ============================================
// User Center API
// ============================================

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: string;
  isTeacher: boolean;
  gender?: string;
  phone?: string;
  wechat?: string;
  showEmail?: boolean;
  showPhone?: boolean;
  showWechat?: boolean;
  showRealName?: boolean;
  createdAt: string;
}

export interface Child {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  grade: string;
  gradeLabel?: string;
}

export interface LearningRecord {
  id: string;
  courseId: string;
  courseTitle: string;
  institution: string;
  lastViewedAt: string;
  status: 'completed' | 'in_progress' | 'not_started';
  learnerId?: string;
}

export interface NotificationItem {
  id: string;
  type: 'system' | 'course' | 'promotion' | 'reminder';
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface UserReview {
  id: string;
  teacherId: string;
  teacherName: string;
  courseTitle: string;
  overallRating: number;
  content: string;
  createdAt: string;
}

export const userCenterApi = {
  // Get user profile
  async getProfile(): Promise<{ success: boolean; data: UserProfile }> {
    return request({
      method: 'GET',
      url: '/user/profile',
    });
  },

  // Update user profile
  async updateProfile(
    data: Partial<UserProfile>
  ): Promise<{ success: boolean; data: UserProfile; message?: string }> {
    return request({
      method: 'PUT',
      url: '/user/profile',
      data,
    });
  },

  // Change password
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    return request({
      method: 'PUT',
      url: '/user/password',
      data: { currentPassword, newPassword },
    });
  },

  // Delete account
  async deleteAccount(): Promise<{ success: boolean; message: string }> {
    return request({
      method: 'DELETE',
      url: '/user/account',
    });
  },

  // Upload avatar
  async uploadAvatar(
    file: File
  ): Promise<{ success: boolean; data: { url: string }; message: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    return request({
      method: 'POST',
      url: '/user/avatar',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Children management
  async getChildren(): Promise<{ success: boolean; data: Child[] }> {
    return request({
      method: 'GET',
      url: '/user/children',
    });
  },

  async addChild(
    data: Omit<Child, 'id'>
  ): Promise<{ success: boolean; data: Child; message: string }> {
    return request({
      method: 'POST',
      url: '/user/children',
      data,
    });
  },

  async updateChild(
    id: string,
    data: Partial<Child>
  ): Promise<{ success: boolean; data: Child; message: string }> {
    return request({
      method: 'PUT',
      url: `/user/children/${id}`,
      data,
    });
  },

  async deleteChild(id: string): Promise<{ success: boolean; message: string }> {
    return request({
      method: 'DELETE',
      url: `/user/children/${id}`,
    });
  },

  // Learning history
  async getLearningHistory(): Promise<{ success: boolean; data: LearningRecord[] }> {
    return request({
      method: 'GET',
      url: '/user/history',
    });
  },

  async removeHistoryItem(id: string): Promise<{ success: boolean; message: string }> {
    return request({
      method: 'DELETE',
      url: `/user/history/${id}`,
    });
  },

  // Notifications
  async getNotifications(): Promise<{
    success: boolean;
    data: NotificationItem[];
    unreadCount: number;
  }> {
    return request({
      method: 'GET',
      url: '/user/notifications',
    });
  },

  async markNotificationRead(id: string): Promise<{ success: boolean; message: string }> {
    return request({
      method: 'PUT',
      url: `/user/notifications/${id}/read`,
    });
  },

  async markAllNotificationsRead(): Promise<{ success: boolean; message: string }> {
    return request({
      method: 'PUT',
      url: '/user/notifications/read-all',
    });
  },

  async deleteNotification(id: string): Promise<{ success: boolean; message: string }> {
    return request({
      method: 'DELETE',
      url: `/user/notifications/${id}`,
    });
  },

  // User reviews
  async getUserReviews(): Promise<{ success: boolean; data: UserReview[]; total: number }> {
    return request({
      method: 'GET',
      url: '/user/reviews',
    });
  },

  async deleteUserReview(id: string): Promise<{ success: boolean; message: string }> {
    return request({
      method: 'DELETE',
      url: `/user/reviews/${id}`,
    });
  },
};

// ============================================
// Upload API
// ============================================

export const uploadApi = {
  // Upload avatar
  async uploadAvatar(
    file: File
  ): Promise<{ success: boolean; data: { url: string }; message: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    return request({
      method: 'POST',
      url: '/upload/avatar',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Upload qualification
  async uploadQualification(
    file: File,
    type: string
  ): Promise<{ success: boolean; data: { url: string; type: string }; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return request({
      method: 'POST',
      url: `/upload/qualification/${type}`,
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ============================================
// 默认导出
// ============================================

export default {
  courses: courseApi,
  tutors: tutorApi,
  search: searchApi,
  auth: authApi,
  userCenter: userCenterApi,
  upload: uploadApi,
};
