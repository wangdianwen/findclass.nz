/**
 * Express Server Entry Point
 * Development server with hot reload
 */

import { createApp } from './app';
import { getConfig, validateConfig } from './config';
import { logger } from './core/logger';
import { runMigrations } from './db/migrate';
import { getPool } from './shared/db/postgres/client';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    postgres: boolean;
  };
  uptime: number;
}

/**
 * Comprehensive health check for all services
 */
async function performHealthCheck(): Promise<HealthCheckResult> {
  const services = {
    postgres: false,
  };

  // Check PostgreSQL
  try {
    const pool = getPool();
    const result = await pool.query('SELECT 1');
    services.postgres = result.rows.length > 0;
  } catch {
    services.postgres = false;
  }

  const allHealthy = services.postgres;

  return {
    status: allHealthy
      ? 'healthy'
      : services.postgres
        ? 'degraded'
        : 'unhealthy',
    timestamp: new Date().toISOString(),
    services,
    uptime: process.uptime(),
  };
}

async function startServer(): Promise<void> {
  try {
    validateConfig();
    logger.info('Configuration validated successfully');

    const config = getConfig();

    // Run database migrations on startup
    logger.info('Running database migrations...');
    try {
      const pool = getPool();
      const { executed, skipped } = await runMigrations(pool);
      logger.info('Database migrations completed', {
        executed: executed.length,
        skipped: skipped.length,
      });
    } catch (error) {
      logger.error('Database migration failed', { error: (error as Error).message });
      process.exit(1);
    }

    const app = createApp();

    const server = app.listen(config.port, () => {
      logger.info(`Server started`, {
        env: config.env,
        port: config.port,
        apiVersion: config.apiVersion,
        url: `http://localhost:${config.port}/api/${config.apiVersion}`,
      });
      logger.info('Available routes:');
      logger.info('  GET  /health');
      logger.info('  POST /api/v1/auth/register');
      logger.info('  POST /api/v1/auth/login');
      logger.info('  GET  /api/v1/courses/search');
      logger.info('  GET  /api/v1/courses/:id');

      // Initial health check
      void performHealthCheck().then(health => {
        logger.info('Initial health check', { status: health.status, services: health.services });
      });
    });

    // Periodic health check every 60 seconds
    setInterval(() => {
      void performHealthCheck().then(health => {
        if (health.status === 'unhealthy') {
          logger.error('Health check failed', { services: health.services });
        } else if (health.status === 'degraded') {
          logger.warn('Health check degraded', { services: health.services });
        }
      });
    }, 60000);

    let isShuttingDown = false;

    const shutdown = (signal: string) => {
      if (isShuttingDown) {
        return;
      }
      isShuttingDown = true;

      logger.info(`Received ${signal}, shutting down gracefully...`);

      server.close(() => {
        logger.info('HTTP server closed');
        logger.info('Shutdown complete');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => {
      shutdown('SIGTERM');
    });
    process.on('SIGINT', () => {
      shutdown('SIGINT');
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

void startServer();
