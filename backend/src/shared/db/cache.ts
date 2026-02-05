/**
 * DynamoDB Cache & Rate Limit Service
 * Uses single table design with SYSTEM#CACHE# and SYSTEM#RATE_LIMIT# prefixes
 * All data stored in FindClass-MainTable
 */

import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import pRetry from 'p-retry';
import { logger } from '../../core/logger';
import { getDynamoDBDocClient, createSystemKey, TABLE_NAME } from './dynamodb';

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

interface SystemCacheItem {
  PK: string;
  SK: string;
  entityType: 'SYSTEM_CACHE';
  dataCategory: 'SYSTEM';
  cacheType: CacheType;
  cacheKey: string;
  cachedData: string;
  expiresAt: number;
  createdAt: number;
}

interface SystemRateLimitItem {
  PK: string;
  SK: string;
  entityType: 'SYSTEM_RATE_LIMIT';
  dataCategory: 'SYSTEM';
  keyType: RateLimitKeyType;
  keyValue: string;
  count: number;
  limit: number;
  windowSeconds: number;
  expiresAt: number;
  createdAt: number;
}

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

function getDocClient() {
  return getDynamoDBDocClient();
}

function getEffectiveTableName(): string {
  return process.env.DYNAMODB_TABLE_NAME || TABLE_NAME;
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

async function withRetry<T>(fn: () => Promise<T>, operation: string, key: string): Promise<T> {
  return pRetry(fn, {
    retries: 1,
    onFailedAttempt: (error: any) => {
      logger.warn(`${operation} retry`, {
        key,
        attempt: error.attemptNumber,
        error: error.message,
      });
    },
  });
}

export async function getFromCache<T>(key: string, cacheType: CacheType): Promise<T | null> {
  const client = getDocClient();
  const { PK, SK } = createSystemKey('CACHE', cacheType, key);
  const tableName = getEffectiveTableName();
  const now = Date.now() / 1000;

  try {
    const result = await withRetry(
      async () =>
        client.send(
          new GetCommand({
            TableName: tableName,
            Key: { PK, SK },
          })
        ),
      'CacheGet',
      key
    );

    if (!result.Item) {
      return null;
    }

    const item = result.Item as SystemCacheItem;

    if (item.expiresAt < now) {
      await client.send(
        new DeleteCommand({
          TableName: tableName,
          Key: { PK, SK },
        })
      );
      return null;
    }

    try {
      return JSON.parse(item.cachedData) as T;
    } catch {
      return item.cachedData as unknown as T;
    }
  } catch (error) {
    logger.error('Cache get failed', { key, error: (error as Error).message });
    return null;
  }
}

export async function setCache<T>(
  key: string,
  cacheType: CacheType,
  value: T,
  ttlSeconds?: number
): Promise<void> {
  const client = getDocClient();
  const { PK, SK } = createSystemKey('CACHE', cacheType, key);
  const tableName = getEffectiveTableName();
  const now = Math.floor(Date.now() / 1000);
  const ttl = ttlSeconds || DEFAULT_CACHE_TTL[cacheType];

  try {
    await withRetry(
      async () =>
        client.send(
          new PutCommand({
            TableName: tableName,
            Item: {
              PK,
              SK,
              entityType: 'SYSTEM_CACHE',
              dataCategory: 'SYSTEM',
              cacheType,
              cacheKey: key,
              cachedData: typeof value === 'string' ? value : JSON.stringify(value),
              expiresAt: now + ttl,
              createdAt: now,
            },
          })
        ),
      'CacheSet',
      key
    );
  } catch (error) {
    logger.warn('Cache set failed, continuing without cache', {
      key,
      error: (error as Error).message,
    });
  }
}

export async function deleteFromCache(key: string, cacheType: CacheType): Promise<void> {
  const client = getDocClient();
  const { PK, SK } = createSystemKey('CACHE', cacheType, key);
  const tableName = getEffectiveTableName();

  try {
    await client.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { PK, SK },
      })
    );
  } catch (error) {
    logger.warn('Cache delete failed', { key, error: (error as Error).message });
  }
}

export async function existsInCache(key: string, cacheType: CacheType): Promise<boolean> {
  const client = getDocClient();
  const { PK, SK } = createSystemKey('CACHE', cacheType, key);
  const tableName = getEffectiveTableName();
  const now = Date.now() / 1000;

  try {
    const result = await client.send(
      new GetCommand({
        TableName: tableName,
        Key: { PK, SK },
      })
    );

    if (!result.Item) {
      return false;
    }

    const item = result.Item as SystemCacheItem;
    if (item.expiresAt < now) {
      await client.send(
        new DeleteCommand({
          TableName: tableName,
          Key: { PK, SK },
        })
      );
      return false;
    }

    return true;
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
  const client = getDocClient();
  const { PK, SK } = createSystemKey('RATE_LIMIT', keyType, key);
  const tableName = getEffectiveTableName();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + windowSeconds;

  try {
    const result = await withRetry(
      async () =>
        client.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { PK, SK },
            UpdateExpression:
              'SET #et = :et, #kt = :kt, #kv = :kv, #cnt = if_not_exists(#cnt, :zero) + :one, #limit = :limit, #win = :win, #created = if_not_exists(#created, :now)',
            ExpressionAttributeNames: {
              '#et': 'entityType',
              '#kt': 'keyType',
              '#kv': 'keyValue',
              '#cnt': 'count',
              '#limit': 'limit',
              '#win': 'windowSeconds',
              '#created': 'createdAt',
            },
            ExpressionAttributeValues: {
              ':et': 'SYSTEM_RATE_LIMIT',
              ':kt': keyType,
              ':kv': key,
              ':zero': 0,
              ':one': 1,
              ':limit': limit,
              ':win': windowSeconds,
              ':now': now,
            },
            ReturnValues: 'UPDATED_NEW',
          })
        ),
      'RateLimitIncrement',
      key
    );

    const count = (result.Attributes?.count as number) || 1;
    const remaining = Math.max(0, limit - count);
    const allowed = count <= limit;

    return { count, allowed, remaining, resetAt: expiresAt };
  } catch (error) {
    logger.warn('Rate limit failed, allowing request', { key, error: (error as Error).message });
    return { count: 1, allowed: true, remaining: limit - 1, resetAt: expiresAt };
  }
}

export async function getRateLimit(
  key: string,
  keyType: RateLimitKeyType
): Promise<{ count: number; limit: number; remaining: number; resetAt: number } | null> {
  const client = getDocClient();
  const { PK, SK } = createSystemKey('RATE_LIMIT', keyType, key);
  const tableName = getEffectiveTableName();
  const now = Date.now() / 1000;

  try {
    const result = await client.send(
      new GetCommand({
        TableName: tableName,
        Key: { PK, SK },
      })
    );

    if (!result.Item) {
      return null;
    }

    const item = result.Item as SystemRateLimitItem;

    if (item.expiresAt < now) {
      await client.send(
        new DeleteCommand({
          TableName: tableName,
          Key: { PK, SK },
        })
      );
      return null;
    }

    const remaining = Math.max(0, item.limit - item.count);
    return { count: item.count, limit: item.limit, remaining, resetAt: item.expiresAt };
  } catch {
    return null;
  }
}

export async function resetRateLimit(key: string, keyType: RateLimitKeyType): Promise<void> {
  const client = getDocClient();
  const { PK, SK } = createSystemKey('RATE_LIMIT', keyType, key);
  const tableName = getEffectiveTableName();

  try {
    await client.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { PK, SK },
      })
    );
  } catch (error) {
    logger.warn('Rate limit reset failed', { key, error: (error as Error).message });
  }
}

export async function setRateLimitLock(
  key: string,
  keyType: RateLimitKeyType,
  ttlSeconds: number
): Promise<void> {
  const client = getDocClient();
  const { PK, SK } = createSystemKey('RATE_LIMIT', 'LOCK', key);
  const tableName = getEffectiveTableName();
  const now = Math.floor(Date.now() / 1000);

  try {
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK,
          SK,
          entityType: 'SYSTEM_RATE_LIMIT',
          dataCategory: 'SYSTEM',
          keyType,
          keyValue: key,
          locked: true,
          expiresAt: now + ttlSeconds,
          createdAt: now,
        },
      })
    );
  } catch (error) {
    logger.warn('Rate limit lock failed', { key, error: (error as Error).message });
  }
}

export async function isRateLimitLocked(key: string): Promise<boolean> {
  const client = getDocClient();
  const { PK, SK } = createSystemKey('RATE_LIMIT', 'LOCK', key);
  const tableName = getEffectiveTableName();
  const now = Date.now() / 1000;

  try {
    const result = await client.send(
      new GetCommand({
        TableName: tableName,
        Key: { PK, SK },
      })
    );

    if (!result.Item) {
      return false;
    }

    const item = result.Item as SystemRateLimitItem & { locked?: boolean };
    if (item.expiresAt < now) {
      await client.send(
        new DeleteCommand({
          TableName: tableName,
          Key: { PK, SK },
        })
      );
      return false;
    }

    return item.locked === true;
  } catch {
    return false;
  }
}

export async function checkCacheHealth(): Promise<boolean> {
  try {
    const client = getDocClient();
    const tableName = getEffectiveTableName();
    await client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: 'begins_with(PK, :prefix)',
        ExpressionAttributeValues: {
          ':prefix': 'SYSTEM#CACHE#',
        },
        Limit: 1,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export async function checkRateLimitsHealth(): Promise<boolean> {
  try {
    const client = getDocClient();
    const tableName = getEffectiveTableName();
    await client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: 'begins_with(PK, :prefix)',
        ExpressionAttributeValues: {
          ':prefix': 'SYSTEM#RATE_LIMIT#',
        },
        Limit: 1,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export async function clearCacheByPattern(pattern: string): Promise<number> {
  const client = getDocClient();
  const tableName = getEffectiveTableName();
  let deletedCount = 0;
  let lastKey: Record<string, string> | undefined;

  do {
    try {
      const result = await client.send(
        new ScanCommand({
          TableName: tableName,
          FilterExpression: 'begins_with(PK, :pattern)',
          ExpressionAttributeValues: {
            ':pattern': `SYSTEM#CACHE#${pattern}`,
          },
          ExclusiveStartKey: lastKey,
          Limit: 100,
        })
      );

      const items = result.Items || [];

      for (const item of items) {
        await client.send(
          new DeleteCommand({
            TableName: tableName,
            Key: { PK: item.PK as string, SK: item.SK as string },
          })
        );
        deletedCount++;
      }

      lastKey = result.LastEvaluatedKey as Record<string, string> | undefined;
    } catch {
      break;
    }
  } while (lastKey);

  return deletedCount;
}
