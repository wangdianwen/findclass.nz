/**
 * Request Utilities
 * Helper functions for Express requests
 */

import type { Request } from 'express';

export function getRequestId(req: Request): string {
  return (req.headers['x-request-id'] as string) || '';
}

export function getClientIp(req: Request): string {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded && forwarded.length > 0) {
    const parts = forwarded.split(',');
    const ip = parts[0]?.trim() ?? '';
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
      return ip;
    }
  }
  return req.ip ?? '';
}

export function extractStringParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}
