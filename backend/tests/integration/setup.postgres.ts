/**
 * PostgreSQL Integration Test Setup
 * Starts PostgreSQL container for integration tests
 */

import { resolve } from 'path';

// MUST be the first statement - before ANY imports
process.env.NODE_ENV = 'test';
process.env.NODE_CONFIG_DIR = resolve(process.cwd(), 'src/config/env');

import 'reflect-metadata';
import { config } from 'dotenv';

const configDir = resolve(process.cwd(), 'src/config/env');
// Clear DATABASE_URL before loading env files so testcontainers can set it
delete process.env.DATABASE_URL;
config({ path: resolve(configDir, '.env.base') });
config({ path: resolve(configDir, '.env.test') });

import { GenericContainer, type StartedGenericContainer, Wait } from 'testcontainers';
import { Pool } from 'pg';
import { beforeAll, afterAll } from 'vitest';
import { createApp } from '@src/app';
import { initializeSchema } from '@src/shared/db/postgres/schema';
import { resetPool } from '@src/shared/db/postgres/client';

const POSTGRES_IMAGE = 'postgres:15-alpine';
const MAILDEV_IMAGE = 'maildev/maildev:2.1.0';
const POSTGRES_USER = 'test_user';
const POSTGRES_PASSWORD = 'test_password';
const POSTGRES_DB = 'findclass_test';

// Global state
let postgresContainer: StartedGenericContainer | null = null;
let maildevContainer: StartedGenericContainer | null = null;
let _app: ReturnType<typeof createApp> | null = null;
let _pool: Pool | null = null;

export const getApp = () => _app;
export const getTestPool = () => _pool;

async function startPostgres() {
  if (postgresContainer) return { container: postgresContainer, pool: _pool! };

  console.log('🚀 Starting PostgreSQL container...');

  const container = await new GenericContainer(POSTGRES_IMAGE)
    .withExposedPorts({ container: 5432, host: 5432 })
    .withEnvironment({
      POSTGRES_USER,
      POSTGRES_PASSWORD,
      POSTGRES_DB,
    })
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(120000)
    .start();

  const connectionUri = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${container.getHost()}:${container.getMappedPort(5432)}/${POSTGRES_DB}`;
  console.log(`✅ PostgreSQL started: ${connectionUri}`);

  // Set DATABASE_URL for the app
  process.env.DATABASE_URL = connectionUri;

  // Reset the pool to ensure new connection
  resetPool();

  // Create pool for tests
  _pool = new Pool({ connectionString: connectionUri });

  // Initialize schema
  console.log('📦 Initializing database schema...');
  await initializeSchema();
  console.log('✅ Schema initialized');

  postgresContainer = container;
  return { container, pool: _pool };
}

async function stopPostgres() {
  if (!postgresContainer) return;

  console.log('🛑 Stopping PostgreSQL container...');
  try {
    await _pool?.end();
    await postgresContainer.stop();
    resetPool();
    console.log('✅ PostgreSQL container stopped');
  } catch (e) {
    console.warn('⚠️  Stop error:', e);
  }
  postgresContainer = null;
  _pool = null;
}

async function startMailDev() {
  if (maildevContainer) return maildevContainer;

  console.log('🚀 Starting MailDev container...');

  const container = await new GenericContainer(MAILDEV_IMAGE)
    .withExposedPorts({ container: 1025, host: 1025 }) // SMTP
    .withExposedPorts({ container: 1080, host: 1080 }) // Web UI
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(120000)
    .start();

  console.log(`✅ MailDev started: ${container.getHost()}:${container.getMappedPort(1025)} (SMTP)`);
  console.log(`✅ MailDev Web UI: http://${container.getHost()}:${container.getMappedPort(1080)}`);

  // Set SMTP environment variables for the app
  process.env.SMTP_HOST = container.getHost();
  process.env.SMTP_PORT = container.getMappedPort(1025).toString();
  process.env.SMTP_API_PORT = container.getMappedPort(1080).toString();
  process.env.SMTP_SECURE = 'false';

  maildevContainer = container;
  return maildevContainer;
}

async function stopMailDev() {
  if (!maildevContainer) return;

  console.log('🛑 Stopping MailDev container...');
  try {
    await maildevContainer.stop();
    console.log('✅ MailDev container stopped');
  } catch (e) {
    console.warn('⚠️  MailDev stop error:', e);
  }
  maildevContainer = null;
}

async function cleanupTestData(pool: Pool) {
  // Clean up test data in correct order (respecting foreign keys)
  try {
    await pool.query('DELETE FROM role_application_history');
  } catch {
    /* table might not exist */
  }
  try {
    await pool.query('DELETE FROM role_applications');
  } catch {
    /* table might not exist */
  }
  try {
    await pool.query('DELETE FROM sessions');
  } catch {
    /* table might not exist */
  }
  try {
    await pool.query('DELETE FROM verification_codes');
  } catch {
    /* table might not exist */
  }
  try {
    await pool.query('DELETE FROM users');
  } catch {
    /* table might not exist */
  }
}

// Integration test hooks
beforeAll(async () => {
  await startMailDev();
  const { pool } = await startPostgres();
  await cleanupTestData(pool);
  _app = createApp();
}, 180000);

afterAll(async () => {
  await stopPostgres();
  await stopMailDev();
});

// Cleanup on process exit
async function exitHandler() {
  await stopPostgres();
  await stopMailDev();
  process.exit(0);
}

process.on('SIGINT', () => {
  void exitHandler();
});

process.on('SIGTERM', () => {
  void exitHandler();
});

process.on('beforeExit', () => {
  void stopPostgres();
});
