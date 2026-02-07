/**
 * API Response Types
 * Standardized API response format following RFC 7807 Problem Details
 */

import { randomUUID } from 'crypto';
import { ErrorCode, ERROR_STATUS_MAP } from '../../core/errors';
export { ErrorCode };

export interface ApiResponse<T = unknown> {
  success: boolean;
  code: number;
  message: string;
  data?: T;
  meta: ApiMeta;
  error?: ApiProblem;
}

export interface ApiProblem {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code?: string;
  errors?: ApiError[];
}

export interface ApiError {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiMeta {
  requestId: string;
  timestamp: string;
  locale?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Response factory functions
export function createSuccessResponse<T>(
  data: T,
  message = 'OK',
  locale?: string,
  requestId = generateRequestId()
): ApiResponse<T> {
  return {
    success: true,
    code: 200,
    message,
    data,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      locale,
    },
  };
}

export function createPaginatedResponse<T>(
  items: T[],
  pagination: PaginationInfo,
  message = 'OK',
  locale?: string,
  requestId = generateRequestId()
): ApiResponse<PaginatedResponse<T>> {
  return {
    success: true,
    code: 200,
    message,
    data: {
      items,
      pagination,
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      locale,
    },
  };
}

export function createErrorResponse(
  code: number | ErrorCode,
  message: string,
  errors?: ApiError[],
  requestId?: string
): ApiResponse {
  const requestIdValue = requestId || generateRequestId();
  const timestamp = new Date().toISOString();

  let statusCode: number;
  let errorCodeString: string | undefined;

  if (typeof code === 'number') {
    statusCode = code;
  } else {
    statusCode = ERROR_STATUS_MAP[code] || 500;
    errorCodeString = code;
  }

  const problemType = `https://api.example.com/problems/${errorCodeString?.toLowerCase() || 'error'}`;
  const problemTitle = HTTP_STATUS_MESSAGES[statusCode] || 'Error';

  const response: ApiResponse = {
    success: false,
    code: statusCode,
    message,
    meta: {
      requestId: requestIdValue,
      timestamp,
    },
    error: {
      type: problemType,
      title: problemTitle,
      status: statusCode,
      detail: message,
      instance: undefined,
      code: errorCodeString,
      errors,
    },
  };

  return response;
}

// HTTP status code to message mapping
export const HTTP_STATUS_MESSAGES: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

function generateRequestId(): string {
  return randomUUID();
}
