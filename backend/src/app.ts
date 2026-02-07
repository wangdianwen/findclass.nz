/**
 * Express Application
 * Main Express app configuration
 */

import express from 'express';
import type { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import path from 'path';
import { getConfig } from './config';
import { logger, logStream } from './core/logger';
import { AppError, ErrorCode } from './core/errors';
import { createErrorResponse } from './shared/types/api';
import type { AuthenticatedRequest } from './shared/middleware/auth';
import { initializeSchema } from './shared/db/postgres/schema';

// Import routes
import { authRoutes } from './modules/auth/routes';
import { userRoutes } from './modules/users/routes';
import { courseRoutes } from './modules/courses/routes';
import { teacherRoutes } from './modules/teachers/routes';
import { healthRoutes } from './modules/health/routes';
import { uploadRoutes } from './modules/upload/routes';
import { reviewRoutes } from './modules/reviews/routes';
import { searchRoutes } from './modules/search/routes';
import { inquiryRoutes } from './modules/inquiries/routes';
import { reportRoutes } from './modules/inquiries/reports.routes';
import { NodeEnv } from './config/env-schema';

// Initialize database schema
async function initializeDatabase(): Promise<void> {
  try {
    logger.info('Initializing database schema...');
    await initializeSchema();
    logger.info('Database schema initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database schema', { error });
    throw error;
  }
}

// Initialize on module load (will run before app starts accepting requests)
// Note: In production, consider running migrations separately
initializeDatabase().catch((err: unknown) => {
  logger.error('Database initialization failed', {
    error: err instanceof Error ? err.message : String(err),
  });
  // Don't exit in test environment
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

// Create Express application
export function createApp(): Application {
  const app = express();
  const config = getConfig();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: config.cors.origin,
      methods: config.cors.methods.split(','),
      credentials: config.cors.credentials,
    })
  );

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request logging
  if (config.env !== 'ut') {
    app.use(morgan('combined', { stream: logStream }));
  }

  // Rate limiting - General API (disabled in test)
  const generalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
      success: false,
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'Too many requests, please try again later.',
      meta: {
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: true,
  });

  // Stricter rate limiting for auth endpoints (disabled in test)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: {
      success: false,
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'Too many authentication attempts, please try again later.',
      meta: {
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: true,
  });

  // Disable rate limiting in test and staging environments for easier integration testing
  // Check both config.env and process.env for reliability
  const isTestEnv = config.env === NodeEnv.Test ||
                       process.env.NODE_ENV === 'test' ||
                       process.env.NODE_ENV === 'staging';

  if (isTestEnv) {
    // In test/staging, use very relaxed limits for auth endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10000, // Very high limit for testing
      message: {
        success: false,
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Too many authentication attempts, please try again later.',
        meta: {
          requestId: '',
          timestamp: new Date().toISOString(),
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipFailedRequests: true,
    });
    app.use('/api', generalLimiter);
    app.use(`/api/${config.apiVersion}/auth`, authLimiter);
  } else {
    // Production rate limiting
    app.use('/api', generalLimiter);
    app.use(`/api/${config.apiVersion}/auth`, authLimiter);
  }

  // Request ID middleware - Use cryptographically secure UUID
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-ID', requestId);
    req.headers['x-request-id'] = requestId as string;
    next();
  });

  // Health check route (no rate limit)
  app.use('/health', healthRoutes);

  // Static file serving for uploaded files
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadDir));

  // API routes
  app.use(`/api/${config.apiVersion}/auth`, authRoutes);
  app.use(`/api/${config.apiVersion}/users`, userRoutes);
  app.use(`/api/${config.apiVersion}/courses`, courseRoutes);
  app.use(`/api/${config.apiVersion}/teachers`, teacherRoutes);
  app.use(`/api/${config.apiVersion}/upload`, uploadRoutes);
  app.use(`/api/${config.apiVersion}/reviews`, reviewRoutes);
  app.use(`/api/${config.apiVersion}/search`, searchRoutes);
  app.use(`/api/${config.apiVersion}/inquiries`, inquiryRoutes);
  app.use(`/api/${config.apiVersion}/reports`, reportRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res
      .status(404)
      .json(
        createErrorResponse(
          404,
          'The requested resource was not found',
          undefined,
          req.headers['x-request-id'] as string
        )
      );
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    const errorMsg = err.message;
    const errorStack = err.stack;

    logger.error('Unhandled error', {
      error: errorMsg,
      stack: config.env === 'development' ? errorStack : undefined,
      path: req.path,
      method: req.method,
      requestId: req.headers['x-request-id'],
      userId: (req as AuthenticatedRequest).user?.userId,
    });

    const requestId = req.headers['x-request-id'] as string;

    if (err instanceof AppError) {
      res
        .status(err.statusCode)
        .json(createErrorResponse(err.code, err.message, err.details, requestId));
    } else {
      const statusCode = 500;
      const message = config.env === 'production' ? 'An unexpected error occurred' : err.message;

      const errorResponse = createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        message,
        undefined,
        requestId
      );
      res.status(statusCode).json(errorResponse);
    }
  });

  return app;
}

export default createApp;
