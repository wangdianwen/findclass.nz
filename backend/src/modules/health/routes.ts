/**
 * Health Module - Routes
 * Health check endpoints
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { checkCacheHealth, checkRateLimitsHealth } from '@shared/db/cache';

const router = Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'EduSearch NZ Backend',
    version: process.env.npm_package_version || '1.0.0',
  });
});

/**
 * GET /health/ready
 * Readiness check - verifies all dependencies are available
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, boolean> = {
    server: true,
  };

  try {
    // Check Cache
    try {
      checks.cache = await checkCacheHealth();
    } catch {
      checks.cache = false;
    }

    // Check Rate Limits
    try {
      checks.rateLimits = await checkRateLimitsHealth();
    } catch {
      checks.rateLimits = false;
    }

    const allHealthy = Object.values(checks).every(v => v);

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      checks,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /health/live
 * Liveness check - verifies the service is running
 */
router.get('/live', (_req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export { router as healthRoutes };
