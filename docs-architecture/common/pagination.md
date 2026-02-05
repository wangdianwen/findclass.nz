---
title: 技术实现 - 分页规范
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 1
priority: P0
status: complete
related_feature: ../../05-product-design/mvp/feature-api-design.md
---

# 技术实现: 分页规范

> **对应产品文档**: [feature-api-design.md](../../05-product-design/mvp/feature-api-design.md) | **优先级**: P0 | **排期**: Phase 1 | **状态**: 已实现

---

## 一、技术架构

### 1.1 分页架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         分页架构层级                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [API Request]                                                    │
│         │                                                           │
│         ▼                                                           │
│   [Pagination Validator]                                           │
│         │                                                           │
│         ▼                                                           │
│   [Pagination Strategy] ──→ [Page Strategy] / [Cursor Strategy]   │
│         │                                                           │
│         ▼                                                           │
│   [Database Query]                                                 │
│         │                                                           │
│         ▼                                                           │
│   [Response Builder]                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 分页方式对比

| 特性 | 页码分页 | 游标分页 |
|------|----------|----------|
| **适用场景** | 需要随机跳转页面 | 实时数据流、不重复数据 |
| **URL示例** | `/api/courses?page=2&size=20` | `/api/feed?cursor=xxx&limit=20` |
| **性能** | O(n) 偏移开销 | O(1) 无偏移开销 |
| **支持随机跳转** | ✅ 支持 | ❌ 不支持 |
| **数据一致性** | 可能跳过/重复数据 | 严格一致 |
| **实现复杂度** | 简单 | 较复杂 |

### 1.3 技术选型

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| **页码分页** | OFFSET + LIMIT | 传统分页方式 |
| **游标分页** | 基于键值的游标 | DynamoDB 原生支持 |
| **分页计算** | PaginationCalculator | 统一计算逻辑 |

---

## 二、数据模型设计 (TypeScript)

### 2.1 页码分页参数

```typescript
// pagination/page-params.ts

/**
 * 页码分页请求参数
 */
export interface PageParams {
  /** 页码，从1开始 */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
}

/**
 * 页码分页请求参数（带验证）
 */
export interface ValidatedPageParams {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
}

/**
 * 页码分页配置
 */
export interface PageConfig {
  /** 默认页码 */
  defaultPage: number;
  /** 默认每页数量 */
  defaultPageSize: number;
  /** 最大每页数量 */
  maxPageSize: number;
  /** 最小每页数量 */
  minPageSize: number;
}

/**
 * 默认页码分页配置
 */
export const DEFAULT_PAGE_CONFIG: PageConfig = {
  defaultPage: 1,
  defaultPageSize: 20,
  maxPageSize: 100,
  minPageSize: 1,
};
```

### 2.2 游标分页参数

```typescript
// pagination/cursor-params.ts

/**
 * 游标分页请求参数
 */
export interface CursorParams {
  /** 游标值，首次请求不传 */
  cursor?: string;
  /** 每页数量 */
  limit?: number;
}

/**
 * 游标分页配置
 */
export interface CursorConfig {
  /** 默认每页数量 */
  defaultLimit: number;
  /** 最大每页数量 */
  maxLimit: number;
  /** 最小每页数量 */
  minLimit: number;
  /** 游标编码方式 */
  encodeStrategy: 'base64' | 'json' | 'opaque';
}

/**
 * 默认游标分页配置
 */
export const DEFAULT_CURSOR_CONFIG: CursorConfig = {
  defaultLimit: 20,
  maxLimit: 100,
  minLimit: 1,
  encodeStrategy: 'base64',
};
```

### 2.3 页码分页响应

```typescript
// pagination/page-response.ts

/**
 * 页码分页响应数据
 */
export interface PageResponseData<T> {
  /** 数据列表 */
  list: T[];
  /** 分页信息 */
  pagination: PagePaginationInfo;
}

/**
 * 页码分页信息
 */
export interface PagePaginationInfo {
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总记录数 */
  total: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNextPage: boolean;
  /** 是否有上一页 */
  hasPrevPage: boolean;
  /** 当前页记录起始索引 */
  startIndex: number;
  /** 当前页记录结束索引 */
  endIndex: number;
}

/**
 * 创建分页信息的工厂函数
 */
export function createPagePaginationInfo(
  page: number,
  pageSize: number,
  total: number
): PagePaginationInfo {
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(page * pageSize, total);

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    startIndex,
    endIndex,
  };
}
```

### 2.4 游标分页响应

```typescript
// pagination/cursor-response.ts

/**
 * 游标分页响应数据
 */
export interface CursorResponseData<T> {
  /** 数据列表 */
  list: T[];
  /** 分页信息 */
  pagination: CursorPaginationInfo;
}

/**
 * 游标分页信息
 */
export interface CursorPaginationInfo {
  /** 当前游标 */
  cursor?: string;
  /** 是否有更多数据 */
  hasMore: boolean;
  /** 下一页游标 */
  nextCursor?: string;
  /** 本次返回数量 */
  count: number;
}

/**
 * 游标分页元信息
 */
export interface CursorMetadata {
  /** 游标字段名 */
  cursorField: string;
  /** 排序方向 */
  sortDirection: 'asc' | 'desc';
  /** 最后一条记录的值 */
  lastValue: unknown;
}
```

### 2.5 统一分页接口

```typescript
// pagination/unified.ts

/**
 * 统一分页请求参数
 */
export type UnifiedPaginationParams = PageParams | CursorParams;

/**
 * 统一分页响应类型
 */
export type UnifiedPaginationResponse<T> =
  | { type: 'page'; data: PageResponseData<T> }
  | { type: 'cursor'; data: CursorResponseData<T> };

/**
 * 分页类型枚举
 */
export enum PaginationType {
  PAGE = 'page',
  CURSOR = 'cursor',
}

/**
 * 分页策略配置
 */
export interface PaginationStrategyConfig {
  /** 分页类型 */
  type: PaginationType;
  /** 页码配置（页码分页时需要） */
  pageConfig?: PageConfig;
  /** 游标配置（游标分页时需要） */
  cursorConfig?: CursorConfig;
}
```

---

## 三、业务逻辑实现

### 3.1 分页计算器

```typescript
// pagination/pagination-calculator.ts
import {
  PageParams,
  ValidatedPageParams,
  PageConfig,
  DEFAULT_PAGE_CONFIG,
} from './page-params';
import { CursorParams, CursorConfig, DEFAULT_CURSOR_CONFIG } from './cursor-params';

export class PaginationCalculator {
  /**
   * 验证并标准化页码参数
   */
  static validatePageParams(
    params: PageParams,
    config: Partial<PageConfig> = {}
  ): ValidatedPageParams {
    const finalConfig = { ...DEFAULT_PAGE_CONFIG, ...config };

    const page = Math.max(1, params.page || finalConfig.defaultPage);
    const pageSize = Math.min(
      Math.max(finalConfig.minPageSize, params.pageSize || finalConfig.defaultPageSize),
      finalConfig.maxPageSize
    );
    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    return { page, pageSize, offset, limit };
  }

  /**
   * 验证并标准化游标参数
   */
  static validateCursorParams(
    params: CursorParams,
    config: Partial<CursorConfig> = {}
  ): { cursor: string | undefined; limit: number } {
    const finalConfig = { ...DEFAULT_CURSOR_CONFIG, ...config };

    const limit = Math.min(
      Math.max(finalConfig.minLimit, params.limit || finalConfig.defaultLimit),
      finalConfig.maxLimit
    );

    return {
      cursor: params.cursor,
      limit,
    };
  }

  /**
   * 计算分页范围
   */
  static calculateRange(page: number, pageSize: number, total: number): {
    start: number;
    end: number;
  } {
    const start = Math.max(0, (page - 1) * pageSize);
    const end = Math.min(page * pageSize, total);
    return { start, end };
  }

  /**
   * 检查页码是否有效
   */
  static isValidPage(page: number, pageSize: number, total: number): boolean {
    const totalPages = Math.ceil(total / pageSize);
    return page >= 1 && page <= totalPages;
  }

  /**
   * 生成页码数组（用于分页器UI）
   */
  static generatePageNumbers(
    currentPage: number,
    totalPages: number,
    displayRange: number = 5
  ): (number | '...')[] {
    const pages: (number | '...')[] = [];

    if (totalPages <= displayRange * 2 + 1) {
      // 全部显示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 省略中间
      const startPage = Math.max(1, currentPage - displayRange);
      const endPage = Math.min(totalPages, currentPage + displayRange);

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push('...');
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  }
}
```

### 3.2 游标编码器

```typescript
// pagination/cursor-encoder.ts

export class CursorEncoder {
  /**
   * Base64 编码
   */
  static encodeBase64(value: string): string {
    return Buffer.from(value).toString('base64');
  }

  /**
   * Base64 解码
   */
  static decodeBase64(cursor: string): string {
    return Buffer.from(cursor, 'base64').toString('utf-8');
  }

  /**
   * JSON 编码
   */
  static encodeJson(value: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(value)).toString('base64');
  }

  /**
   * JSON 解码
   */
  static decodeJson<T = Record<string, unknown>>(cursor: string): T {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
  }

  /**
   * 创建复合游标
   */
  static createCompositeCursor(
    values: (string | number | boolean | undefined)[],
    separator: string = '|'
  ): string {
    const filtered = values.filter(v => v !== undefined);
    return this.encodeBase64(filtered.join(separator));
  }

  /**
   * 解析复合游标
   */
  static parseCompositeCursor(
    cursor: string,
    separator: string = '|'
  ): (string | number | boolean)[] {
    const decoded = this.decodeBase64(cursor);
    return decoded.split(separator);
  }

  /**
   * 为记录创建游标
   */
  static createCursorFromRecord<T>(
    record: T,
    cursorFields: (keyof T)[]
  ): string {
    const values = cursorFields.map(field => {
      const value = record[field];
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
      }
      return undefined;
    });
    return this.createCompositeCursor(values);
  }
}
```

### 3.3 DynamoDB 分页器

```typescript
// pagination/dynamodb-paginator.ts

import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

interface DynamoDBPaginationOptions {
  tableName: string;
  indexName?: string;
  keyConditionExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, unknown>;
  scanIndexForward?: boolean;
  limit?: number;
  cursor?: string;
  filterExpression?: string;
}

/**
 * DynamoDB 分页器
 */
export class DynamoDBPaginator {
  private client: DynamoDBDocumentClient;

  constructor(client: DynamoDBDocumentClient) {
    this.client = client;
  }

  /**
   * 查询分页
   */
  async query<T = Record<string, unknown>>(
    options: DynamoDBPaginationOptions
  ): Promise<{
    items: T[];
    cursor?: string;
    hasMore: boolean;
  }> {
    const command = new QueryCommand({
      TableName: options.tableName,
      IndexName: options.indexName,
      KeyConditionExpression: options.keyConditionExpression,
      ExpressionAttributeNames: options.expressionAttributeNames,
      ExpressionAttributeValues: options.expressionAttributeValues as Record<string, import('@aws-sdk/client-dynamodb').AttributeValue>,
      FilterExpression: options.filterExpression,
      ScanIndexForward: options.scanIndexForward ?? false,
      Limit: (options.limit || 20) + 1, // 多取一条判断是否有更多
      ExclusiveStartKey: options.cursor
        ? this.decodeExclusiveStartKey(options.cursor)
        : undefined,
    });

    const response = await this.client.send(command);

    const items = response.Items as T[];
    const hasMore = response.LastEvaluatedKey !== undefined;

    // 如果有多余的一条，移除它
    if (items.length > (options.limit || 20)) {
      items.pop();
    }

    return {
      items,
      cursor: hasMore ? this.encodeLastEvaluatedKey(response.LastEvaluatedKey) : undefined,
      hasMore,
    };
  }

  /**
   * 扫描分页
   */
  async scan<T = Record<string, unknown>>(
    options: DynamoDBPaginationOptions
  ): Promise<{
    items: T[];
    cursor?: string;
    hasMore: boolean;
  }> {
    const command = new ScanCommand({
      TableName: options.tableName,
      IndexName: options.indexName,
      FilterExpression: options.filterExpression,
      ExpressionAttributeNames: options.expressionAttributeNames,
      ExpressionAttributeValues: options.expressionAttributeValues as Record<string, import('@aws-sdk/client-dynamodb').AttributeValue>,
      Limit: (options.limit || 20) + 1,
      ExclusiveStartKey: options.cursor
        ? this.decodeExclusiveStartKey(options.cursor)
        : undefined,
    });

    const response = await this.client.send(command);

    const items = response.Items as T[];
    const hasMore = response.LastEvaluatedKey !== undefined;

    if (items.length > (options.limit || 20)) {
      items.pop();
    }

    return {
      items,
      cursor: hasMore ? this.encodeLastEvaluatedKey(response.LastEvaluatedKey) : undefined,
      hasMore,
    };
  }

  /**
   * 编码 LastEvaluatedKey 为游标
   */
  private encodeLastEvaluatedKey(
    key?: Record<string, import('@aws-sdk/client-dynamodb').AttributeValue>
  ): string | undefined {
    if (!key) return undefined;
    return Buffer.from(JSON.stringify(key)).toString('base64');
  }

  /**
   * 解码游标为 LastEvaluatedKey
   */
  private decodeExclusiveStartKey(
    cursor: string
  ): Record<string, import('@aws-sdk/client-dynamodb').AttributeValue> | undefined {
    if (!cursor) return undefined;
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    } catch {
      return undefined;
    }
  }
}
```

### 3.4 分页路由处理器

```typescript
// pagination/pagination-handler.ts

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PaginationCalculator } from './pagination-calculator';
import { CursorEncoder } from './cursor-encoder';
import { ResponseBuilder } from '../response/response-builder';

type PaginationHandlerOptions<T> = {
  /** 查询数据的函数 */
  fetchData: (params: { offset: number; limit: number; cursor?: string }) => Promise<{ items: T[]; total?: number }>;
  /** 返回数据类型 */
  responseType: 'page' | 'cursor';
  /** 自定义响应转换 */
  transform?: (item: T) => unknown;
};

export class PaginationHandler {
  /**
   * 处理页码分页请求
   */
  static async handlePageRequest<T>(
    event: APIGatewayProxyEvent,
    options: Omit<PaginationHandlerOptions<T>, 'responseType' | 'responseType'>
  ): Promise<APIGatewayProxyResult> {
    const params = PaginationCalculator.validatePageParams({
      page: event.queryStringParameters?.page
        ? parseInt(event.queryStringParameters.page)
        : undefined,
      pageSize: event.queryStringParameters?.pageSize
        ? parseInt(event.queryStringParameters.pageSize)
        : undefined,
    });

    const result = await options.fetchData({
      offset: params.offset,
      limit: params.limit,
    });

    const responseBuilder = new ResponseBuilder(
      event.requestContext.requestId || 'unknown',
      event.path,
      event.httpMethod
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        responseBuilder.page(result.items, params.page, params.pageSize, result.total || result.items.length)
      ),
    };
  }

  /**
   * 处理游标分页请求
   */
  static async handleCursorRequest<T>(
    event: APIGatewayProxyEvent,
    options: Omit<PaginationHandlerOptions<T>, 'responseType'>
  ): Promise<APIGatewayProxyResult> {
    const params = PaginationCalculator.validateCursorParams({
      cursor: event.queryStringParameters?.cursor,
      limit: event.queryStringParameters?.limit
        ? parseInt(event.queryStringParameters.limit)
        : undefined,
    });

    const result = await options.fetchData({
      offset: 0,
      limit: params.limit,
      cursor: params.cursor,
    });

    const responseBuilder = new ResponseBuilder(
      event.requestContext.requestId || 'unknown',
      event.path,
      event.httpMethod
    );

    // 计算下一游标
    let nextCursor: string | undefined;
    if (result.items.length > params.limit) {
      const lastItem = result.items[params.limit - 1];
      nextCursor = CursorEncoder.encodeBase64(JSON.stringify(lastItem));
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        responseBuilder.cursor(result.items, params.cursor, result.items.length > params.limit, nextCursor)
      ),
    };
  }
}
```

---

## 四、API 设计

### 4.1 页码分页 API

#### 请求示例
```
GET /api/v1/courses?page=2&pageSize=10
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，从1开始，默认1 |
| pageSize | number | 否 | 每页数量，默认20 |

#### 响应示例
```json
{
  "success": true,
  "data": {
    "list": [
      { "id": "course-011", "title": "课程11" },
      { "id": "course-012", "title": "课程12" }
    ],
    "pagination": {
      "page": 2,
      "pageSize": 10,
      "total": 100,
      "totalPages": 10,
      "hasNextPage": true,
      "hasPrevPage": true,
      "startIndex": 10,
      "endIndex": 20
    }
  },
  "meta": {
    "requestId": "req-20260126-001",
    "timestamp": 1706198400
  }
}
```

### 4.2 游标分页 API

#### 请求示例
```
GET /api/v1/notifications?limit=20
GET /api/v1/notifications?cursor=eyJpZCI6IjIwIn0=&limit=20
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| cursor | string | 否 | 游标值，首次请求不传 |
| limit | number | 否 | 每页数量，默认20 |

#### 响应示例
```json
{
  "success": true,
  "data": {
    "list": [
      { "id": "msg-001", "content": "消息1" },
      { "id": "msg-002", "content": "消息2" }
    ],
    "pagination": {
      "cursor": "eyJpZCI6IjIwIn0=",
      "hasMore": true,
      "nextCursor": "eyJpZCI6IjMwIn0="
    }
  },
  "meta": {
    "requestId": "req-20260126-001",
    "timestamp": 1706198400
  }
}
```

### 4.3 分页参数范围

| 参数 | 最小值 | 最大值 | 默认值 |
|------|--------|--------|--------|
| page | 1 | 10000 | 1 |
| pageSize | 1 | 100 | 20 |
| limit | 1 | 100 | 20 |

---

## 五、前端实现

### 5.1 分页 Hook

```typescript
// hooks/usePagination.ts
import { useState, useCallback, useMemo } from 'react';

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  total?: number;
  onPageChange?: (page: number, pageSize: number) => void;
}

interface PaginationState {
  page: number;
  pageSize: number;
}

export function usePagination(options: UsePaginationOptions = {}) {
  const {
    initialPage = 1,
    initialPageSize = 20,
    total: externalTotal,
    onPageChange,
  } = options;

  const [state, setState] = useState<PaginationState>({
    page: initialPage,
    pageSize: initialPageSize,
  });

  const [internalTotal, setInternalTotal] = useState(0);

  const total = externalTotal ?? internalTotal;
  const totalPages = Math.ceil(total / state.pageSize);

  const setPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setState(prev => ({ ...prev, page: validPage }));
    onPageChange?.(validPage, state.pageSize);
  }, [totalPages, onPageChange, state.pageSize]);

  const setPageSize = useCallback((pageSize: number) => {
    setState({ page: 1, pageSize });
    onPageChange?.(1, pageSize);
  }, [onPageChange]);

  const nextPage = useCallback(() => {
    setPage(state.page + 1);
  }, [setPage, state.page]);

  const prevPage = useCallback(() => {
    setPage(state.page - 1);
  }, [setPage, state.page]);

  const jumpToPage = useCallback((page: number) => {
    setPage(page);
  }, [setPage]);

  const setTotal = useCallback((count: number) => {
    if (externalTotal === undefined) {
      setInternalTotal(count);
    }
  }, [externalTotal]);

  const reset = useCallback(() => {
    setState({ page: initialPage, pageSize: initialPageSize });
    setInternalTotal(0);
    onPageChange?.(initialPage, initialPageSize);
  }, [initialPage, initialPageSize, onPageChange]);

  const pageNumbers = useMemo(() => {
    return PaginationUtils.generatePageNumbers(state.page, totalPages);
  }, [state.page, totalPages]);

  return {
    page: state.page,
    pageSize: state.pageSize,
    total,
    totalPages,
    hasNextPage: state.page < totalPages,
    hasPrevPage: state.page > 1,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    jumpToPage,
    setTotal,
    reset,
    pageNumbers,
  };
}

/**
 * 分页工具类
 */
class PaginationUtils {
  static generatePageNumbers(
    currentPage: number,
    totalPages: number,
    displayRange: number = 5
  ): (number | '...')[] {
    if (totalPages <= displayRange * 2 + 1) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | '...')[] = [];
    const startPage = Math.max(1, currentPage - displayRange);
    const endPage = Math.min(totalPages, currentPage + displayRange);

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push('...');
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  }
}
```

### 5.2 分页组件

```typescript
// components/Pagination.tsx
import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageNumbers: (number | '...')[];
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  showPageSize?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  pageNumbers,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  showPageSize = false,
}: PaginationProps) {
  return (
    <div className="pagination">
      <div className="pagination-info">
        共 {total} 条数据，当前第 {currentPage}/{totalPages} 页
      </div>

      <div className="pagination-controls">
        <button
          className="pagination-btn"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          上一页
        </button>

        <div className="pagination-pages">
          {pageNumbers.map((page, index) =>
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                ...
              </span>
            ) : (
              <button
                key={page}
                className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                onClick={() => onPageChange(page as number)}
              >
                {page}
              </button>
            )
          )}
        </div>

        <button
          className="pagination-btn"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          下一页
        </button>

        {showPageSize && onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="pagination-size"
          >
            <option value={10}>10条/页</option>
            <option value={20}>20条/页</option>
            <option value={50}>50条/页</option>
            <option value={100}>100条/页</option>
          </select>
        )}
      </div>
    </div>
  );
}
```

---

## 六、测试用例

### 6.1 分页计算器测试

| ID | 测试类型 | 测试描述 | 预期结果 | 优先级 |
|----|----------|----------|----------|--------|
| PAG-UT-01 | 单元测试 | 默认页码参数 | page=1, pageSize=20 | P0 |
| PAG-UT-02 | 单元测试 | 自定义页码参数 | 参数正确解析 | P0 |
| PAG-UT-03 | 单元测试 | 边界页码值 | 自动调整为有效范围 | P0 |
| PAG-UT-04 | 单元测试 | 边界pageSize值 | 超过最大值时限制 | P0 |
| PAG-UT-05 | 单元测试 | 计算分页范围 | 范围计算正确 | P0 |
| PAG-UT-06 | 单元测试 | 生成页码数组 | 省略逻辑正确 | P1 |

### 6.2 游标编码器测试

| ID | 测试类型 | 测试描述 | 预期结果 | 优先级 |
|----|----------|----------|----------|--------|
| CUR-UT-01 | 单元测试 | Base64编码 | 正确编码 | P0 |
| CUR-UT-02 | 单元测试 | Base64解码 | 正确解码 | P0 |
| CUR-UT-03 | 单元测试 | 复合游标创建 | 多字段组合正确 | P1 |
| CUR-UT-04 | 单元测试 | 复合游标解析 | 解析结果正确 | P1 |

### 6.3 DynamoDB分页器测试

| ID | 测试类型 | 测试描述 | 预期结果 | 优先级 |
|----|----------|----------|----------|--------|
| DDB-UT-01 | 集成测试 | 查询分页 | 返回正确数据和游标 | P0 |
| DDB-UT-02 | 集成测试 | 扫描分页 | 返回正确数据和游标 | P1 |
| DDB-UT-03 | 集成测试 | 游标续传 | 从指定位置继续 | P1 |
| DDB-UT-04 | 集成测试 | 边界条件 | 空结果时无游标 | P1 |

### 6.4 前端分页组件测试

| ID | 测试类型 | 测试描述 | 预期结果 | 优先级 |
|----|----------|----------|----------|--------|
| PAG-FE-01 | 组件测试 | 页码按钮点击 | 触发onPageChange | P0 |
| PAG-FE-02 | 组件测试 | 页码省略显示 | 正确显示... | P1 |
| PAG-FE-03 | 组件测试 | 页面大小切换 | 更新pageSize | P1 |
| PAG-FE-04 | 组件测试 | 首尾页按钮 | 跳转到首页/尾页 | P2 |

---

## 七、验收标准

- [x] 支持页码分页和游标分页两种方式
- [x] 页码参数范围验证正确
- [x] 游标编码解码正确
- [x] 分页响应包含完整分页信息
- [x] 前端分页组件功能完整
- [x] 分页计算无性能问题
- [x] DynamoDB 分页支持
- [x] API 文档参数说明清晰

---

## 八、风险分析

| 风险项 | 风险等级 | 影响范围 | 应对措施 |
|--------|----------|----------|----------|
| **OFFSET 过大导致查询慢** | 中 | 系统性能 | 限制单页数量，推荐游标分页 |
| **游标编码不稳定** | 中 | 数据一致性 | 使用字段值编码，避免内部结构 |
| **分页数据不一致** | 中 | 用户体验 | 使用事务或乐观锁 |
| **总条数计算影响性能** | 低 | 系统性能 | COUNT 与数据查询分离 |
| **游标过期** | 低 | 用户体验 | 设置合理的游标有效期 |
| **跨页数据重复** | 低 | 用户体验 | 使用游标分页代替 OFFSET |