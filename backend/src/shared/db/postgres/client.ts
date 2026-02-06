/**
 * PostgreSQL Client Configuration
 * Uses connection pooling with pg library
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '../../core/logger';

let pool: Pool | null = null;

/**
 * Get or create PostgreSQL connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString: databaseUrl,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection fails
      maxUses: 7500, // Close and replace a client after 7500 queries
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
    });

    pool.on('connect', () => {
      logger.debug('New PostgreSQL client connected');
    });

    logger.info('PostgreSQL connection pool created');
  }

  return pool;
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  return getPool().connect();
}

/**
 * Execute a query using the pool
 */
export async function query<T = unknown>(
  text: string,
  values?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await getPool().query<T>(text, values);
  const duration = Date.now() - start;

  logger.debug('Executed query', {
    text: text.substring(0, 100),
    duration,
    rowCount: result.rowCount,
  });

  return result;
}

/**
 * Execute a transaction with multiple statements
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if PostgreSQL is healthy
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const result = await query('SELECT 1');
    return result.rowCount === 1;
  } catch {
    return false;
  }
}

/**
 * Close the connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('PostgreSQL connection pool closed');
  }
}

/**
 * Reset the pool (useful for testing)
 */
export function resetPool(): void {
  pool = null;
}
