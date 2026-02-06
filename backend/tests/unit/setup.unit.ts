/**
 * Unified Test Setup
 * Vitest configuration that detects test type based on file path
 */

process.env.NODE_ENV = 'test';

// Mock logger functions
const mockLoggerInfo = () => {};
const mockLoggerError = () => {};
const mockLoggerWarn = () => {};
const mockLoggerDebug = () => {};
const mockLoggerHttp = () => {};

// Export mock functions for tests to use
export const putItem = () => {};
export const getItem = () => {};
export const updateItem = () => {};
export const deleteItem = () => {};
export const queryItems = () => {};
export const scanItems = () => {};
export const batchGetItems = () => {};
export const batchWriteItems = () => {};
export const transactWrite = () => {};

// Mock logger
export const mockLogger = {
  info: mockLoggerInfo,
  error: mockLoggerError,
  warn: mockLoggerWarn,
  debug: mockLoggerDebug,
  http: mockLoggerHttp,
};

// Setup vi mocks if available
const setupViMocks = () => {
  if (typeof vi !== 'undefined' && vi.fn) {
    mockLogger.info = vi.fn();
    mockLogger.error = vi.fn();
    mockLogger.warn = vi.fn();
    mockLogger.debug = vi.fn();
    mockLogger.http = vi.fn();
  }
};

// Reset mocks
const resetMocks = () => {
  if (typeof mockLogger.info === 'function' && mockLogger.info.mockReset) {
    mockLogger.info.mockReset();
    mockLogger.error.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.debug.mockReset();
    mockLogger.http.mockReset();
  }
};

// Initialize mocks
setupViMocks();

// Mock external dependencies for unit tests
vi.mock('@core/logger', () => ({
  logger: mockLogger,
}));

vi.mock('@src/shared/db/dynamodb', () => ({
  putItem: () => {},
  getItem: () => {},
  queryItems: () => {},
  updateItem: () => {},
  deleteItem: () => {},
  scanItems: () => {},
  batchGetItems: () => {},
  batchWriteItems: () => {},
  transactWrite: () => {},
  tableExists: () => {},
  listTables: () => {},
  createEntityKey: (type: string, id: string, sortKey?: string) => ({
    PK: `${type}#${id}`,
    SK: sortKey || 'METADATA',
  }),
  createSystemKey: (category: string, type: string, key: string) => ({
    PK: `SYSTEM#${category}#${type}`,
    SK: key,
  }),
  getTableName: () => 'FindClass-TestTable',
  resetClient: () => {},
  TABLE_NAME: 'FindClass-TestTable',
  getDynamoDBDocClient: () => {},
}));

vi.mock('@src/shared/db/cache', () => ({
  getFromCache: () => {},
  setCache: () => {},
  deleteFromCache: () => {},
  existsInCache: () => {},
  incrementRateLimit: () => {},
  getRateLimit: () => {},
  resetRateLimit: () => {},
  setRateLimitLock: () => {},
  isRateLimitLocked: () => {},
  checkCacheHealth: () => {},
  checkRateLimitsHealth: () => {},
  clearCacheByPattern: () => {},
  CacheKeys: {
    search: (query: string) => `search:${query}`,
    facet: (query: string) => `facet:${query}`,
    course: (id: string) => `course:${id}`,
    teacher: (id: string) => `teacher:${id}`,
    user: (id: string) => `user:${id}`,
    translation: (text: string, targetLang: string) =>
      `trans:${targetLang}:${text.substring(0, 50)}`,
    csrf: (sessionId: string) => `csrf:${sessionId}`,
    captcha: (sessionId: string) => `captcha:${sessionId}`,
    verify: (email: string, type: string) => `verify:${email}:${type}`,
    rateLimitEmail: (email: string) => `rate:email:${email}`,
    rateLimitIP: (ip: string) => `rate:ip:${ip}`,
    rateLimitToken: (token: string) => `rate:token:${token}`,
    session: (sessionId: string) => `session:${sessionId}`,
    roleApplication: (userId: string) => `roleapp:${userId}`,
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  resetMocks();
});

afterAll(() => {
  vi.clearAllMocks();
});
