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
config({ path: resolve(configDir, '.env.base') });
config({ path: resolve(configDir, '.env.test') });

import { GenericContainer, type StartedGenericContainer, Wait } from 'testcontainers';
import { Pool } from 'pg';
import { beforeAll, afterAll } from 'vitest';
import { createApp } from '@src/app';
import { initializeSchema } from '@src/shared/db/postgres/schema';

const POSTGRES_IMAGE = 'postgres:15-alpine';
const POSTGRES_USER = 'test_user';
const POSTGRES_PASSWORD = 'test_password';
const POSTGRES_DB = 'findclass_test';

// Global state
let postgresContainer: StartedGenericContainer | null = null;
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
    console.log('✅ PostgreSQL container stopped');
  } catch (e) {
    console.warn('⚠️  Stop error:', e);
  }
  postgresContainer = null;
  _pool = null;
}

async function cleanupTestData(pool: Pool) {
  // Clean up test data in correct order (respecting foreign keys)
  try {
    await pool.query('DELETE FROM role_application_history');
  } catch { /* table might not exist */ }
  try {
    await pool.query('DELETE FROM role_applications');
  } catch { /* table might not exist */ }
  try {
    await pool.query('DELETE FROM sessions');
  } catch { /* table might not exist */ }
  try {
    await pool.query('DELETE FROM verification_codes');
  } catch { /* table might not exist */ }
  try {
    await pool.query('DELETE FROM users');
  } catch { /* table might not exist */ }
}

// Integration test hooks
beforeAll(async () => {
  const { pool } = await startPostgres();
  await cleanupTestData(pool);
  _app = createApp();
}, 180000);

afterAll(async () => {
  await stopPostgres();
});

// Cleanup on process exit
async function exitHandler() {
  await stopPostgres();
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
