/**
 * Request Validator
 * Middleware for request validation using class-validator
 */

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../core/logger';
import { ValidationError } from '../../core/errors';
import { createErrorResponse } from '../types/api';

// Generic needed for runtime type transformation
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function validateRequest<T extends object>(DtoClass: new () => T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = plainToInstance(DtoClass, req.body);

      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length > 0) {
        const details = errors.map(error => ({
          field: error.property,
          message: Object.values(error.constraints || {}).join(', '),
        }));

        throw new ValidationError(details);
      }

      req.body = dto;
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        res
          .status(400)
          .json(
            createErrorResponse(
              error.code,
              error.message,
              error.details,
              req.headers['x-request-id'] as string
            )
          );
      } else {
        logger.error('Validation middleware error', { error: (error as Error).message });
        next(error);
      }
    }
  };
}
