/**
 * PostgreSQL Cache & Rate Limit Service
 * Uses PostgreSQL tables for caching and rate limiting
 * All data stored in the findclass database
 */

import { Client } from 'pg';
import { logger } from '../../core/logger';
import { getConfig } from '../../config';

export type CacheType =
  | 'SEARCH'
  | 'FACET'
  | 'CSRF'
  | 'CAPTCHA'
  | 'VERIFY'
  | 'SESSION'
  | 'FACET_DATA'
  | 'TRANSLATION'
  | 'GENERAL'
  | 'ROLE_APP';

export type RateLimitKeyType = 'email' | 'ip' | 'token' | 'user';

const DEFAULT_CACHE_TTL: Record<CacheType, number> = {
  SEARCH: 300,
  FACET: 3600,
  CSRF: 3600,
  CAPTCHA: 300,
  VERIFY: 600,
  SESSION: 86400,
  FACET_DATA: 1800,
  TRANSLATION: 86400 * 7,
  GENERAL: 3600,
  ROLE_APP: 86400 * 30, // 30 days for role applications
};

let pool: Client | null = null;

function getPool(): Client {
  if (!pool) {
    const config = getConfig();
    pool = new Client({
      connectionString: config.database.url,
    });
    pool.on('error', err => {
      logger.error('PostgreSQL pool error', { error: err.message });
    });
  }
  return pool;
}

export async function initCacheDb(): Promise<void> {
  const client = getPool();
  await client.connect();
  logger.info('PostgreSQL cache connection established');

  // Create cache table
  await client.query(`
    CREATE TABLE IF NOT EXISTS cache (
      key VARCHAR(255) PRIMARY KEY,
      value TEXT NOT NULL,
      cache_type VARCHAR(50) NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Create index for cleanup
  await client.query(`
    CREATE INDEX IF NOT EXISTS cache_expires_idx ON cache (expires_at)
  `);

  // Create rate_limit table
  await client.query(`
    CREATE TABLE IF NOT EXISTS rate_limit (
      key VARCHAR(255) PRIMARY KEY,
      key_type VARCHAR(50) NOT NULL,
      count INTEGER DEFAULT 0,
      limit_count INTEGER NOT NULL,
      window_seconds INTEGER NOT NULL,
      window_start TIMESTAMP WITH TIME ZONE NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Create indexes for rate limit cleanup
  await client.query(`
    CREATE INDEX IF NOT EXISTS rate_limit_expires_idx ON rate_limit (expires_at)
  `);

  logger.info('Cache database tables initialized');
}

export function generateCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}:${parts.join(':')}`;
}

export const CacheKeys = {
  search: (query: string) => generateCacheKey('search', query),
  facet: (query: string) => generateCacheKey('facet', query),
  course: (id: string) => generateCacheKey('course', id),
  teacher: (id: string) => generateCacheKey('teacher', id),
  user: (id: string) => generateCacheKey('user', id),
  translation: (text: string, targetLang: string) =>
    generateCacheKey('trans', targetLang, text.substring(0, 50)),
  csrf: (sessionId: string) => generateCacheKey('csrf', sessionId),
  captcha: (sessionId: string) => generateCacheKey('captcha', sessionId),
  verify: (email: string, type: string) => generateCacheKey('verify', email, type),
  rateLimitEmail: (email: string) => generateCacheKey('rate', 'email', email),
  rateLimitIP: (ip: string) => generateCacheKey('rate', 'ip', ip),
  rateLimitToken: (token: string) => generateCacheKey('rate', 'token', token),
  session: (sessionId: string) => generateCacheKey('session', sessionId),
  roleApplication: (userId: string) => generateCacheKey('roleapp', userId),
};

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export async function getFromCache<T>(key: string, cacheType: CacheType): Promise<T | null> {
  const client = getPool();
  const now = new Date();

  try {
    const result = await client.query(
      `SELECT value FROM cache WHERE key = $1 AND cache_type = $2 AND expires_at > $3`,
      [key, cacheType, now]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return row.value as unknown as T;
    }
  } catch (error) {
    logger.error('Cache get failed', { key, error: (error as Error).message });
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export async function setCache<T>(
  key: string,
  cacheType: CacheType,
  value: T,
  ttlSeconds?: number
): Promise<void> {
  const client = getPool();
  const now = new Date();
  const ttl = ttlSeconds || DEFAULT_CACHE_TTL[cacheType];
  const expiresAt = new Date(now.getTime() + ttl * 1000);

  try {
    await client.query(
      `INSERT INTO cache (key, value, cache_type, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         cache_type = EXCLUDED.cache_type,
         expires_at = EXCLUDED.expires_at,
         created_at = NOW()`,
      [key, JSON.stringify(value), cacheType, expiresAt]
    );
  } catch (error) {
    logger.error('Cache set failed', { key, error: (error as Error).message });
  }
}

export async function deleteFromCache(key: string, cacheType: CacheType): Promise<void> {
  const client = getPool();

  try {
    await client.query(`DELETE FROM cache WHERE key = $1 AND cache_type = $2`, [key, cacheType]);
  } catch (error) {
    logger.warn('Cache delete failed', { key, error: (error as Error).message });
  }
}

export async function existsInCache(key: string, cacheType: CacheType): Promise<boolean> {
  const client = getPool();
  const now = new Date();

  try {
    const result = await client.query(
      `SELECT 1 FROM cache WHERE key = $1 AND cache_type = $2 AND expires_at > $3`,
      [key, cacheType, now]
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

export async function incrementRateLimit(
  key: string,
  keyType: RateLimitKeyType,
  limit: number,
  windowSeconds: number
): Promise<{ count: number; allowed: boolean; remaining: number; resetAt: number }> {
  const client = getPool();
  const now = new Date();
  const windowStart = new Date(now.getTime() - (now.getTime() % (windowSeconds * 1000)));
  const expiresAt = new Date(windowStart.getTime() + windowSeconds * 1000 * 2); // 2x window for cleanup

  try {
    const result = await client.query(
      `INSERT INTO rate_limit (key, key_type, count, limit_count, window_seconds, window_start, expires_at)
       VALUES ($1, $2, 1, $3, $4, $5, $6)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE
           WHEN rate_limit.window_start = EXCLUDED.window_start
           THEN rate_limit.count + 1
           ELSE 1
         END,
         limit_count = EXCLUDED.limit_count,
         window_seconds = EXCLUDED.window_seconds,
         window_start = EXCLUDED.window_start,
         expires_at = EXCLUDED.expires_at
       RETURNING count, window_start`,
      [key, keyType, limit, windowSeconds, windowStart, expiresAt]
    );

    const row = result.rows[0];
    const count = row.count;
    const remaining = Math.max(0, limit - count);
    const allowed = count <= limit;
    const resetAt = windowStart.getTime() + windowSeconds * 1000;

    return { count, allowed, remaining, resetAt };
  } catch (error) {
    logger.warn('Rate limit failed, allowing request', { key, error: (error as Error).message });
    return {
      count: 1,
      allowed: true,
      remaining: limit - 1,
      resetAt: now.getTime() + windowSeconds * 1000,
    };
  }
}

export async function getRateLimit(
  key: string,
  keyType: RateLimitKeyType
): Promise<{ count: number; limit: number; remaining: number; resetAt: number } | null> {
  const client = getPool();
  const now = new Date();

  try {
    const result = await client.query(
      `SELECT count, limit_count, window_seconds, window_start FROM rate_limit
       WHERE key = $1 AND key_type = $2 AND expires_at > $3`,
      [key, keyType, now]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const remaining = Math.max(0, row.limit_count - row.count);
    return {
      count: row.count,
      limit: row.limit_count,
      remaining,
      resetAt: new Date(row.window_start).getTime() + row.window_seconds * 1000,
    };
  } catch {
    return null;
  }
}

export async function resetRateLimit(key: string, keyType: RateLimitKeyType): Promise<void> {
  const client = getPool();

  try {
    await client.query(`DELETE FROM rate_limit WHERE key = $1 AND key_type = $2`, [key, keyType]);
  } catch (error) {
    logger.warn('Rate limit reset failed', { key, error: (error as Error).message });
  }
}

export async function setRateLimitLock(
  key: string,
  keyType: RateLimitKeyType,
  ttlSeconds: number
): Promise<void> {
  const client = getPool();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  try {
    await client.query(
      `INSERT INTO rate_limit (key, key_type, count, limit_count, window_seconds, window_start, expires_at)
       VALUES ($1, $2, 0, 0, 0, $3, $4)
       ON CONFLICT (key) DO UPDATE SET
         expires_at = EXCLUDED.expires_at`,
      [key, keyType, now, expiresAt]
    );
  } catch (error) {
    logger.warn('Rate limit lock failed', { key, error: (error as Error).message });
  }
}

export async function isRateLimitLocked(key: string): Promise<boolean> {
  const client = getPool();
  const now = new Date();

  try {
    const result = await client.query(
      `SELECT 1 FROM rate_limit WHERE key = $1 AND expires_at > $2`,
      [key, now]
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

export async function checkCacheHealth(): Promise<boolean> {
  const client = getPool();

  try {
    await client.query(`SELECT 1 FROM cache LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

export async function checkRateLimitsHealth(): Promise<boolean> {
  const client = getPool();

  try {
    await client.query(`SELECT 1 FROM rate_limit LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

export async function clearCacheByPattern(pattern: string): Promise<number> {
  const client = getPool();

  try {
    const result = await client.query(`DELETE FROM cache WHERE key LIKE $1`, [`%${pattern}%`]);
    return result.rowCount || 0;
  } catch {
    return 0;
  }
}

export async function cleanupExpiredCache(): Promise<number> {
  const client = getPool();

  try {
    const result = await client.query(`DELETE FROM cache WHERE expires_at < NOW()`);
    return result.rowCount || 0;
  } catch {
    return 0;
  }
}

export async function cleanupExpiredRateLimits(): Promise<number> {
  const client = getPool();

  try {
    const result = await client.query(`DELETE FROM rate_limit WHERE expires_at < NOW()`);
    return result.rowCount || 0;
  } catch {
    return 0;
  }
}
