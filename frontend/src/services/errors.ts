// ============================================
// API Error Types
// ============================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export class ApiException extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

// 常见错误码
export const ErrorCodes = {
  // 通用错误
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',

  // 客户端错误 (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // 服务端错误 (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVER_UNAVAILABLE: 'SERVER_UNAVAILABLE',

  // 业务错误
  COURSE_NOT_FOUND: 'COURSE_NOT_FOUND',
  TUTOR_NOT_FOUND: 'TUTOR_NOT_FOUND',
  SEARCH_NO_RESULTS: 'SEARCH_NO_RESULTS',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================
// Error Message Map
// ============================================

const errorMessages: Record<ErrorCode, string> = {
  [ErrorCodes.NETWORK_ERROR]: '网络连接失败，请检查网络设置',
  [ErrorCodes.TIMEOUT]: '请求超时，请稍后重试',
  [ErrorCodes.UNKNOWN_ERROR]: '发生了未知错误，请稍后重试',

  [ErrorCodes.BAD_REQUEST]: '请求参数有误',
  [ErrorCodes.UNAUTHORIZED]: '请先登录',
  [ErrorCodes.FORBIDDEN]: '您没有权限执行此操作',
  [ErrorCodes.NOT_FOUND]: '请求的资源不存在',
  [ErrorCodes.VALIDATION_ERROR]: '数据验证失败',

  [ErrorCodes.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCodes.SERVER_UNAVAILABLE]: '服务暂时不可用',

  [ErrorCodes.COURSE_NOT_FOUND]: '课程不存在或已下架',
  [ErrorCodes.TUTOR_NOT_FOUND]: '教师不存在',
  [ErrorCodes.SEARCH_NO_RESULTS]: '未找到相关结果',
};

// 获取错误消息
export function getErrorMessage(code: ErrorCode): string {
  return errorMessages[code] || '发生了错误';
}

// HTTP Status to Error Code 映射 - 供 API 服务使用
export function getErrorCodeFromStatus(status: number): ErrorCode {
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

export default errorMessages;
