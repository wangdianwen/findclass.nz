/**
 * Logger Mock
 * Mock for logger in tests
 */

import { vi } from 'vitest';

export const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  http: vi.fn(),
};

export const mockLogStream = {
  write: vi.fn(),
};

vi.mock('@core/logger', () => ({
  logger: mockLogger,
  logStream: mockLogStream,
}));

export const resetLoggerMocks = () => {
  mockLogger.info.mockReset();
  mockLogger.error.mockReset();
  mockLogger.warn.mockReset();
  mockLogger.debug.mockReset();
  mockLogger.http.mockReset();
  mockLogStream.write.mockReset();
};
