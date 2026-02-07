/**
 * Custom Error Classes
 * Provides structured error handling across the application
 */

export enum ErrorCode {
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_REFRESH_TOKEN_EXPIRED = 'AUTH_REFRESH_TOKEN_EXPIRED',
  AUTH_INVALID_REFRESH_TOKEN = 'AUTH_INVALID_REFRESH_TOKEN',
  AUTH_EMAIL_EXISTS = 'AUTH_EMAIL_EXISTS',
  AUTH_INVALID_CODE = 'AUTH_INVALID_CODE',
  AUTH_CODE_EXPIRED = 'AUTH_CODE_EXPIRED',
  AUTH_PARENTAL_CONSENT_REQUIRED = 'AUTH_PARENTAL_CONSENT_REQUIRED',
  AUTH_INVALID_PASSWORD = 'AUTH_INVALID_PASSWORD',

  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_CHILD_NOT_FOUND = 'USER_CHILD_NOT_FOUND',

  COURSE_NOT_FOUND = 'COURSE_NOT_FOUND',
  COURSE_DEACTIVATED = 'COURSE_DEACTIVATED',
  COURSE_EXPIRED = 'COURSE_EXPIRED',

  TEACHER_NOT_FOUND = 'TEACHER_NOT_FOUND',
  TEACHER_NOT_VERIFIED = 'TEACHER_NOT_VERIFIED',

  BOOKING_NOT_FOUND = 'BOOKING_NOT_FOUND',
  BOOKING_SLOT_UNAVAILABLE = 'BOOKING_SLOT_UNAVAILABLE',
  BOOKING_ALREADY_CONFIRMED = 'BOOKING_ALREADY_CONFIRMED',

  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_TIMEOUT = 'PAYMENT_TIMEOUT',
  PAYMENT_REFUND_FAILED = 'PAYMENT_REFUND_FAILED',

  REVIEW_NOT_FOUND = 'REVIEW_NOT_FOUND',
  REVIEW_COMPLETION_REQUIRED = 'REVIEW_COMPLETION_REQUIRED',
}

export interface ErrorDetails {
  field?: string;
  message: string;
  code?: string;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details: ErrorDetails[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    details: ErrorDetails[] = [],
    isOperational = true
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(details: ErrorDetails[]) {
    super('Validation failed', ErrorCode.VALIDATION_ERROR, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found with id: ${id}`, ErrorCode.NOT_FOUND, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, ErrorCode.UNAUTHORIZED, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, ErrorCode.FORBIDDEN, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, ErrorCode.CONFLICT, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429);
  }
}

export function createAppError(
  message: string,
  code: ErrorCode,
  details: ErrorDetails[] = []
): AppError {
  const statusCode = ERROR_STATUS_MAP[code] || 500;
  return new AppError(message, code, statusCode, details);
}

// Error status code mapping
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,

  [ErrorCode.AUTH_INVALID_TOKEN]: 401,
  [ErrorCode.AUTH_TOKEN_EXPIRED]: 401,
  [ErrorCode.AUTH_REFRESH_TOKEN_EXPIRED]: 401,
  [ErrorCode.AUTH_INVALID_REFRESH_TOKEN]: 401,
  [ErrorCode.AUTH_EMAIL_EXISTS]: 409,
  [ErrorCode.AUTH_INVALID_CODE]: 400,
  [ErrorCode.AUTH_CODE_EXPIRED]: 400,
  [ErrorCode.AUTH_PARENTAL_CONSENT_REQUIRED]: 403,
  [ErrorCode.AUTH_INVALID_PASSWORD]: 400,

  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.USER_CHILD_NOT_FOUND]: 404,

  [ErrorCode.COURSE_NOT_FOUND]: 404,
  [ErrorCode.COURSE_DEACTIVATED]: 400,
  [ErrorCode.COURSE_EXPIRED]: 400,

  [ErrorCode.TEACHER_NOT_FOUND]: 404,
  [ErrorCode.TEACHER_NOT_VERIFIED]: 400,

  [ErrorCode.BOOKING_NOT_FOUND]: 404,
  [ErrorCode.BOOKING_SLOT_UNAVAILABLE]: 400,
  [ErrorCode.BOOKING_ALREADY_CONFIRMED]: 409,

  [ErrorCode.PAYMENT_FAILED]: 400,
  [ErrorCode.PAYMENT_TIMEOUT]: 408,
  [ErrorCode.PAYMENT_REFUND_FAILED]: 400,

  [ErrorCode.REVIEW_NOT_FOUND]: 404,
  [ErrorCode.REVIEW_COMPLETION_REQUIRED]: 400,
};
