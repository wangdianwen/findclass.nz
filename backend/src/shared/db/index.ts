/**
 * Database Module Exports
 * PostgreSQL replaces DynamoDB as the primary database
 */

export { Pool, type PoolClient, type QueryResult } from 'pg';
export { getPool, query, checkHealth, closePool, resetPool } from './postgres/client';

export { initializeSchema, dropAllTables, truncateAllTables } from './postgres/schema';
