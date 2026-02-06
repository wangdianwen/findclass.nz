/**
 * Database Module Exports
 * PostgreSQL replaces DynamoDB as the primary database
 */

export { Pool, type PoolClient, type QueryResult } from 'pg';
export {
  getPool,
  getClient,
  query,
  transaction,
  checkHealth,
  closePool,
  resetPool,
} from './postgres/client';

export {
  BaseRepository,
  RepositoryFactory,
  type PaginationParams,
  type PaginatedResult,
  type SortParams,
} from './postgres/repository';

export {
  initializeSchema,
  dropAllTables,
  truncateAllTables,
} from './postgres/schema';
