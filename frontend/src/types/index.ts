// ============================================
// Global Type Definitions
// ============================================

// 通用分页类型
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 通用API响应
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// 城市和地区
export interface City {
  value: string;
  label: string;
}

export interface Region {
  value: string;
  label: string;
  cityKey: string;
}

// 筛选条件
export interface CourseFilters {
  city?: string;
  region?: string;
  subject?: string;
  grade?: string;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  teachingMode?: 'offline' | 'online';
  language?: string;
}

// 搜索建议
export interface SearchSuggestion {
  type: 'course' | 'teacher' | 'subject';
  value: string;
  count?: number;
}
