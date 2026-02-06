/**
 * Database Migration Runner
 * Runs migrations incrementally without deleting existing data
 */

import { Pool } from 'pg';
import { logger } from '@core/logger';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_TABLE = 'migrations';
const MIGRATIONS_DIR = join(__dirname, 'migrations');

interface MigrationRecord {
  id: number;
  name: string;
  executed_at: Date;
}

/**
 * Ensure migrations tracking table exists
 */
async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  logger.info('Migrations table ready');
}

/**
 * Get list of already executed migrations
 */
async function getExecutedMigrations(pool: Pool): Promise<Set<string>> {
  const result = await pool.query<MigrationRecord>(
    `SELECT id, name, executed_at FROM ${MIGRATIONS_TABLE} ORDER BY id`
  );
  return new Set(result.rows.map(row => row.name));
}

/**
 * Get list of migration files in order
 */
function getMigrationFiles(): string[] {
  try {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();
    return files;
  } catch (error) {
    logger.error('Failed to read migrations directory', { error });
    return [];
  }
}

/**
 * Run a single migration file
 */
async function runMigration(pool: Pool, filename: string): Promise<void> {
  const filepath = join(MIGRATIONS_DIR, filename);
  const sql = readFileSync(filepath, 'utf-8');

  logger.info(`Running migration: ${filename}`);

  // Run in transaction to ensure atomicity
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
      [filename]
    );
    await client.query('COMMIT');
    logger.info(`Migration completed: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Migration failed: ${filename}`, { error });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(pool: Pool): Promise<{
  executed: string[];
  skipped: string[];
}> {
  logger.info('Starting database migrations...');

  // Ensure migrations table exists
  await ensureMigrationsTable(pool);

  // Get already executed migrations
  const executed = await getExecutedMigrations(pool);
  const files = getMigrationFiles();

  const pending: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    if (executed.has(file)) {
      skipped.push(file);
    } else {
      pending.push(file);
    }
  }

  // Run pending migrations
  for (const file of pending) {
    await runMigration(pool, file);
  }

  logger.info('Migrations completed', {
    executed: pending.length,
    skipped: skipped.length,
  });

  return { executed: pending, skipped };
}

/**
 * Get migration status
 */
export async function getMigrationStatus(pool: Pool): Promise<{
  executed: MigrationRecord[];
  pending: string[];
}> {
  await ensureMigrationsTable(pool);

  const executed = await getExecutedMigrations(pool);
  const files = getMigrationFiles();

  const pending = files.filter(file => !executed.has(file));

  const result = await pool.query<MigrationRecord>(
    `SELECT id, name, executed_at FROM ${MIGRATIONS_TABLE} ORDER BY id`
  );

  return {
    executed: result.rows,
    pending,
  };
}

// Run migrations if executed directly
if (require.main === module) {
  import('dotenv').then(dotenv => {
    dotenv.config({ path: join(__dirname, '..', '..', '.env') });
    import('../../config/env-loader').then(({ getConfig }) => {
      const config = getConfig();
      const pool = new Pool({ connectionString: config.database.url });

      runMigrations(pool)
        .then(({ executed, skipped }) => {
          console.log('Migrations completed:', { executed, skipped });
          process.exit(0);
        })
        .catch(error => {
          console.error('Migration failed:', error);
          process.exit(1);
        });
    });
  });
}
