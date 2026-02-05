/**
 * Unified Test Setup
 * Vitest configuration that detects test type based on file path
 */

import { NodeEnv } from '@src/config/env-schema';
import { afterAll, afterEach, vi } from 'vitest';

process.env.NODE_ENV = NodeEnv.Test;

// Export mock functions for tests to use
export const putItem = vi.fn();
export const getItem = vi.fn();
export const updateItem = vi.fn();
export const deleteItem = vi.fn();
export const queryItems = vi.fn();
export const scanItems = vi.fn();
export const batchGetItems = vi.fn();
export const batchWriteItems = vi.fn();
export const transactWrite = vi.fn();

// Mock logger
export const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  http: vi.fn(),
};

vi.mock('@core/logger', () => ({
  logger: mockLogger,
}));

// Unit tests should have all dependencies mocked
// AIT tests should use real services (TestContainers)
// Mock external dependencies for unit tests
vi.mock('@src/shared/db/dynamodb', () => ({
  putItem: vi.fn(),
  getItem: vi.fn(),
  queryItems: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  scanItems: vi.fn(),
  batchGetItems: vi.fn(),
  batchWriteItems: vi.fn(),
  transactWrite: vi.fn(),
  tableExists: vi.fn(),
  listTables: vi.fn(),
  createEntityKey: vi.fn((type, id, sortKey) => ({
    PK: `${type}#${id}`,
    SK: sortKey || 'METADATA',
  })),
  createSystemKey: vi.fn((category, type, key) => ({
    PK: `SYSTEM#${category}#${type}`,
    SK: key,
  })),
  getTableName: vi.fn(),
  resetClient: vi.fn(),
  TABLE_NAME: 'FindClass-TestTable',
  getDynamoDBDocClient: vi.fn(),
}));

vi.mock('@src/shared/db/cache', () => ({
  getFromCache: vi.fn(),
  setCache: vi.fn(),
  deleteFromCache: vi.fn(),
  existsInCache: vi.fn(),
  incrementRateLimit: vi.fn(),
  getRateLimit: vi.fn(),
  resetRateLimit: vi.fn(),
  setRateLimitLock: vi.fn(),
  isRateLimitLocked: vi.fn(),
  checkCacheHealth: vi.fn(),
  checkRateLimitsHealth: vi.fn(),
  clearCacheByPattern: vi.fn(),
  CacheKeys: {
    search: vi.fn((query: string) => `search:${query}`),
    facet: vi.fn((query: string) => `facet:${query}`),
    course: vi.fn((id: string) => `course:${id}`),
    teacher: vi.fn((id: string) => `teacher:${id}`),
    user: vi.fn((id: string) => `user:${id}`),
    translation: vi.fn(
      (text: string, targetLang: string) => `trans:${targetLang}:${text.substring(0, 50)}`
    ),
    csrf: vi.fn((sessionId: string) => `csrf:${sessionId}`),
    captcha: vi.fn((sessionId: string) => `captcha:${sessionId}`),
    verify: vi.fn((email: string, type: string) => `verify:${email}:${type}`),
    rateLimitEmail: vi.fn((email: string) => `rate:email:${email}`),
    rateLimitIP: vi.fn((ip: string) => `rate:ip:${ip}`),
    rateLimitToken: vi.fn((token: string) => `rate:token:${token}`),
    session: vi.fn((sessionId: string) => `session:${sessionId}`),
    roleApplication: vi.fn((userId: string) => `roleapp:${userId}`),
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  // Reset logger mocks
  mockLogger.info.mockReset();
  mockLogger.error.mockReset();
  mockLogger.warn.mockReset();
  mockLogger.debug.mockReset();
  mockLogger.http.mockReset();
});

afterAll(() => {
  vi.clearAllMocks();
});
