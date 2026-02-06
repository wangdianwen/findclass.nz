/**
 * Base Repository Pattern for PostgreSQL
 * Provides generic CRUD operations with type safety
 */

import { PoolClient, QueryResult } from 'pg';
import { logger } from '../../core/logger';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SortParams {
  column: string;
  direction: 'ASC' | 'DESC';
}

/**
 * Base Repository with generic CRUD operations
 */
export abstract class BaseRepository<T, CreateDTO, UpdateDTO> {
  protected constructor(
    protected readonly tableName: string,
    protected readonly client: PoolClient
  ) {}

  /**
   * Find a single record by ID
   */
  async findById(id: string): Promise<T | null> {
    const result = await this.client.query<T>(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find all records with optional filters
   */
  async findAll(filters?: Partial<T> & PaginationParams & SortParams): Promise<T[]> {
    let query = `SELECT * FROM ${this.tableName}`;
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters && Object.keys(filters).length > 0) {
      const conditions: string[] = [];

      for (const [key, value] of Object.entries(filters)) {
        if (key === 'page' || key === 'limit' || key === 'column' || key === 'direction') {
          continue;
        }

        if (value !== undefined && value !== null) {
          conditions.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    if (filters?.column) {
      query += ` ORDER BY ${filters.column} ${filters.direction || 'ASC'}`;
    }

    const result = await this.client.query<T>(query, values);
    return result.rows;
  }

  /**
   * Find records with pagination
   */
  async findPaginated(
    filters?: Partial<T>,
    pagination?: PaginationParams,
    sort?: SortParams
  ): Promise<PaginatedResult<T>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = '';
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters && Object.keys(filters).length > 0) {
      const conditions: string[] = [];

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          conditions.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }

      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
    const countResult = await this.client.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated data
    const orderClause = sort
      ? `ORDER BY ${sort.column} ${sort.direction}`
      : 'ORDER BY created_at DESC';

    const dataQuery = `
      SELECT * FROM ${this.tableName}
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const dataResult = await this.client.query<T>(dataQuery, [...values, limit, offset]);

    return {
      data: dataResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create a new record
   */
  async create(data: CreateDTO): Promise<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`);

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await this.client.query<T>(query, values);
    return result.rows[0];
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: UpdateDTO): Promise<T | null> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClauses = columns.map((col, i) => `${col} = $${i + 1}`);
    const paramIndex = columns.length + 1;

    const query = `
      UPDATE ${this.tableName}
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.client.query<T>(query, [...values, id]);
    return result.rows[0] || null;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.client.query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Count records with optional filters
   */
  async count(filters?: Partial<T>): Promise<number> {
    let query = `SELECT COUNT(*) as total FROM ${this.tableName}`;
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters && Object.keys(filters).length > 0) {
      const conditions: string[] = [];

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          conditions.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    const result = await this.client.query(query, values);
    return parseInt(result.rows[0].total, 10);
  }

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.client.query(
      `SELECT 1 FROM ${this.tableName} WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows.length > 0;
  }

  /**
   * Execute a raw query
   */
  protected async rawQuery<U = unknown>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<U>> {
    return this.client.query<U>(text, values);
  }

  /**
   * Log query for debugging
   */
  protected logQuery(operation: string, details?: Record<string, unknown>): void {
    logger.debug(`Repository ${this.tableName}: ${operation}`, details);
  }
}

/**
 * Repository factory for creating repositories with pool
 */
export class RepositoryFactory {
  constructor(private readonly poolClient: PoolClient) {}

  create<T, CreateDTO, UpdateDTO>(
    tableName: string
  ): BaseRepository<T, CreateDTO, UpdateDTO> {
    return new (class extends BaseRepository<T, CreateDTO, UpdateDTO> {
      constructor() {
        super(tableName, poolClient);
      }
    })() as BaseRepository<T, CreateDTO, UpdateDTO>;
  }
}
