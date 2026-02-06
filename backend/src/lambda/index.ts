/**
 * AWS Lambda Entry Point
 * Unified handler for all Lambda functions
 */

import type {
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
  Context,
  APIGatewayProxyEvent,
} from 'aws-lambda';
import { createApp } from '../app';
import { validateConfig } from '../config';
import { logger } from '../core/logger';
import { createErrorResponse } from '../shared/types/api';

// Create Express app for Lambda
const app = createApp();

/**
 * Create Lambda handler from Express app
 */
export function createLambdaHandler(): APIGatewayProxyHandler {
  return async (event: APIGatewayProxyEvent, _context: Context): Promise<APIGatewayProxyResult> => {
    // Configure context
    _context.callbackWaitsForEmptyEventLoop = false;

    try {
      // Validate config (only once)
      if (process.env.NODE_ENV !== 'ut') {
        validateConfig();
      }

      // Create mock request/response objects
      const requestId =
        event.headers?.['x-request-id'] ?? event.requestContext.requestId ?? `req_${Date.now()}`;

      const mockReq: {
        method: string;
        path: string;
        query: Record<string, string>;
        body: Record<string, unknown>;
        headers: Record<string, string>;
        get: (header: string) => string;
        requestContext: APIGatewayProxyEvent['requestContext'];
      } = {
        method: event.httpMethod,
        path: event.path,
        query: (event.queryStringParameters as Record<string, string>) ?? {},
        body: event.body ? JSON.parse(event.body) : {},
        headers: (event.headers ?? {}) as Record<string, string>,
        get: (header: string) => event.headers?.[header] ?? '',
        requestContext: event.requestContext,
      };

      let statusCode = 200;
      let responseBody: Record<string, unknown> = {};

      // Mock Express response
      const mockRes = {
        status: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        json: (body: Record<string, unknown>) => {
          responseBody = body;
          return mockRes;
        },
        setHeader: () => mockRes,
      };

      // Use Express app to handle request
      await new Promise<void>((resolve, reject) => {
        const mockNext = (err?: Error) => {
          if (err) reject(err);
          else resolve();
        };

        // @ts-expect-error Express types don't match perfectly
        app(mockReq, mockRes, mockNext);
      });

      // Return Lambda response
      return {
        statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify(responseBody),
      };
    } catch (error) {
      logger.error('Lambda execution error', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        event,
      });

      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Request-ID': event.headers?.['x-request-id'] || '',
        },
        body: JSON.stringify(
          createErrorResponse(
            500,
            'Internal server error',
            undefined,
            event.headers?.['x-request-id'] || ''
          )
        ),
      };
    }
  };
}

// Export individual handlers for specific Lambda functions
export const authHandler = createLambdaHandler();
export const userHandler = createLambdaHandler();
export const courseHandler = createLambdaHandler();
export const teacherHandler = createLambdaHandler();
export const bookingHandler = createLambdaHandler();
export const paymentHandler = createLambdaHandler();
export const reviewHandler = createLambdaHandler();
export const dataHandler = createLambdaHandler();
export const notificationHandler = createLambdaHandler();
export const analyticsHandler = createLambdaHandler();

// Default export
export const handler = createLambdaHandler();
