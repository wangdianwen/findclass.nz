/**
 * Integration Test Setup
 * Starts Docker containers (PostgreSQL + MailHog)
 * Uses testcontainers for PostgreSQL container management
 */

import { resolve } from 'path';

// MUST be the first statement - before ANY imports
process.env.NODE_ENV = 'test';
process.env.NODE_CONFIG_DIR = resolve(process.cwd(), 'src/config/env');

import 'reflect-metadata';
import { config } from 'dotenv';

const configDir = resolve(process.cwd(), 'src/config/env');
config({ path: resolve(configDir, '.env.base') });
config({ path: resolve(configDir, '.env.test') });

import { GenericContainer, type StartedGenericContainer, Wait } from 'testcontainers';
import { Pool } from 'pg';
import { beforeAll, afterAll } from 'vitest';
import { createApp } from '@src/app';
import { initializeSchema, truncateAllTables } from '@src/shared/db/postgres/schema';
import { getPool, resetPool } from '@src/shared/db/postgres/client';

const POSTGRES_IMAGE = 'postgres:15-alpine';
const MAILHOG_IMAGE = 'mailhog/mailhog:latest';

const POSTGRES_USER = 'test_user';
const POSTGRES_PASSWORD = 'test_password';
const POSTGRES_DB = 'findclass_test';

// Global state
let containersStarted = false;
let testContext: {
  postgres: {
    container: StartedGenericContainer;
    pool: Pool;
    host: string;
    port: number;
    connectionString: string;
  };
  mailhog: {
    container: StartedGenericContainer;
    host: string;
    smtpPort: number;
    apiPort: number;
  };
} | null = null;

let _app: ReturnType<typeof createApp> | null = null;

export const getApp = () => _app;
export const getTestPool = (): Pool => {
  if (!testContext?.postgres.pool) {
    throw new Error('PostgreSQL pool not initialized');
  }
  return testContext!.postgres.pool;
};

export const getTestContext = () => testContext;
export const isContainersStarted = () => containersStarted;

async function startContainers() {
  if (containersStarted && testContext) return testContext;

  console.log('🚀 Starting integration test containers...');

  // MailHog
  console.log('📧 Starting MailHog...');
  const mailhog = await new GenericContainer(MAILHOG_IMAGE)
    .withExposedPorts({ container: 1025, host: 1025 }, { container: 8025, host: 8025 })
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(60000)
    .start();

  const host = mailhog.getHost();
  console.log(`✅ MailHog started: ${host}:1025 (SMTP), ${host}:8025 (API)`);

  // PostgreSQL
  console.log('🗄️  Starting PostgreSQL...');
  const postgres = await new GenericContainer(POSTGRES_IMAGE)
    .withExposedPorts({ container: 5432, host: 5432 })
    .withEnvironment({
      POSTGRES_USER,
      POSTGRES_PASSWORD,
      POSTGRES_DB,
    })
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(120000)
    .start();

  const postgresPort = postgres.getMappedPort(5432);
  const connectionUri = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${host}:${postgresPort}/${POSTGRES_DB}`;
  console.log(`✅ PostgreSQL started: ${connectionUri}`);

  // Reset the pool to ensure new connection
  resetPool();

  // Set DATABASE_URL for the app
  process.env.DATABASE_URL = connectionUri;

  // Create pool for tests
  const pool = new Pool({ connectionString: connectionUri });

  // Initialize schema
  console.log('📦 Initializing database schema...');
  await initializeSchema();
  console.log('✅ Schema initialized');

  testContext = {
    postgres: {
      container: postgres,
      pool,
      host,
      port: postgresPort,
      connectionString: connectionUri,
    },
    mailhog: {
      container: mailhog,
      host,
      smtpPort: 1025,
      apiPort: 8025,
    },
  };
  containersStarted = true;
  console.log('✅ Containers ready');
  return testContext;
}

async function stopContainers() {
  if (!containersStarted) return;
  console.log('🛑 Stopping containers...');

  try {
    const ctx = testContext;
    if (ctx?.postgres.pool) {
      await ctx.postgres.pool.end();
    }
    if (ctx?.postgres.container) {
      await ctx.postgres.container.stop();
    }
    if (ctx?.mailhog.container) {
      await ctx.mailhog.container.stop();
    }
    console.log('✅ Containers stopped');
  } catch (e) {
    console.warn('⚠️  Stop error:', e);
  }

  containersStarted = false;
  testContext = null;
  resetPool();
}

async function clearTableData(pool: Pool) {
  await truncateAllTables();
}

// Integration test hooks
beforeAll(async () => {
  await startContainers();
  const ctx = testContext;
  if (ctx) {
    await clearTableData(ctx.postgres.pool);
  }
  _app = createApp();
}, 180000);

afterAll(async () => {
  await stopContainers();
});

// Cleanup on process exit
async function exitHandler() {
  await stopContainers();
  process.exit(0);
}

process.on('SIGINT', () => {
  void exitHandler();
});

process.on('SIGTERM', () => {
  void exitHandler();
});

process.on('beforeExit', () => {
  void stopContainers();
});
