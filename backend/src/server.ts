/**
 * Express Server Entry Point
 * Development server with hot reload
 */

import { createApp } from './app';
import { getConfig, validateConfig } from './config';
import { logger } from './core/logger';
import { checkCacheHealth, checkRateLimitsHealth } from './shared/db/cache';
import { tableExists, listTables } from './shared/db/dynamodb';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    cache: boolean;
    rateLimits: boolean;
    dynamodb: boolean;
  };
  uptime: number;
}

/**
 * Comprehensive health check for all services
 */
async function performHealthCheck(): Promise<HealthCheckResult> {
  const services = {
    cache: false,
    rateLimits: false,
    dynamodb: false,
  };

  // Check Cache
  try {
    services.cache = await checkCacheHealth();
  } catch {
    services.cache = false;
  }

  // Check Rate Limits
  try {
    services.rateLimits = await checkRateLimitsHealth();
  } catch {
    services.rateLimits = false;
  }

  // Check DynamoDB
  try {
    const config = getConfig();
    const exists = await tableExists(config.dynamodb.tableName);
    services.dynamodb = exists;
  } catch {
    services.dynamodb = false;
  }

  const allHealthy = services.cache && services.rateLimits && services.dynamodb;

  return {
    status: allHealthy
      ? 'healthy'
      : Object.values(services).some(s => s)
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

    if (config.env === 'development') {
      try {
        const tables = await listTables();
        logger.info('DynamoDB tables found', { tables });
      } catch (error) {
        logger.warn('DynamoDB connection failed', {
          error: (error as Error).message,
        });
      }
    } else {
      try {
        const tableName = await tableExists(config.dynamodb.tableName);
        if (tableName) {
          logger.info('DynamoDB connection verified', {
            tableName: config.env === 'development' ? tableName : '[REDACTED]',
          });
        } else {
          logger.error('DynamoDB table not found', {
            tableName: config.env === 'development' ? config.dynamodb.tableName : '[REDACTED]',
          });
          process.exit(1);
        }
      } catch (error) {
        logger.error('DynamoDB connection failed', { error: (error as Error).message });
        process.exit(1);
      }
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
      performHealthCheck().then(health => {
        logger.info('Initial health check', { status: health.status, services: health.services });
      });
    });

    // Periodic health check every 60 seconds
    setInterval(async () => {
      const health = await performHealthCheck();
      if (health.status === 'unhealthy') {
        logger.error('Health check failed', { services: health.services });
      } else if (health.status === 'degraded') {
        logger.warn('Health check degraded', { services: health.services });
      }
    }, 60000);

    let isShuttingDown = false;

    const shutdown = async (signal: string) => {
      if (isShuttingDown) {
        return;
      }
      isShuttingDown = true;

      logger.info(`Received ${signal}, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');
        logger.info('Shutdown complete');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();
