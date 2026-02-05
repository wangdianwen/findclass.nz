---
title: 技术实现 - 响应格式规范
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 1
priority: P0
status: complete
related_feature: ../../05-product-design/mvp/feature-api-design.md
---

# 技术实现: 响应格式规范

> **对应产品文档**: [feature-api-design.md](../../05-product-design/mvp/feature-api-design.md) | **优先级**: P0 | **排期**: Phase 1 | **状态**: 已实现

---

## 一、技术架构

### 1.1 响应架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         技术架构层级                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [Lambda Handler]                                                 │
│         │                                                           │
│         ▼                                                           │
│   [Response Builder]                                               │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway]                                                    │
│         │                                                           │
│         ▼                                                           │
│   [Client]                                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 响应模式

```
                    ┌─────────────────┐
                    │   BaseResponse  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        SuccessResponse  ErrorResponse  PaginatedResponse
```

### 1.3 技术选型

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| **响应构建** | TypeScript Class | 类型安全的响应构建 |
| **序列化** | class-transformer | 对象序列化 |
| **分页** | DynamoDB Pagination | 游标分页支持 |

---

## 二、数据模型设计 (TypeScript)

### 2.1 基础响应接口

```typescript
// response/base-response.ts

// 基础响应
export interface BaseResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ErrorInfo;
  meta: MetaInfo;
}

// 错误信息
export interface ErrorInfo {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// 元信息
export interface MetaInfo {
  requestId: string;
  timestamp: number;
  path?: string;
  method?: string;
}

// 成功响应工厂方法
export interface SuccessResponse<T> extends BaseResponse<T> {
  success: true;
  data: T;
  error?: undefined;
}

// 错误响应工厂方法
export interface ErrorResponseData extends BaseResponse<undefined> {
  success: false;
  data?: undefined;
  error: ErrorInfo;
}
```

### 2.2 分页响应接口

```typescript
// response/pagination.ts

// 页码分页参数
export interface PageParams {
  page?: number;
  pageSize?: number;
}

// 页码分页响应
export interface PageResponse<T> {
  list: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// 游标分页参数
export interface CursorParams {
  cursor?: string;
  limit?: number;
}

// 游标分页响应
export interface CursorResponse<T> {
  list: T[];
  pagination: {
    cursor?: string;
    hasMore: boolean;
    nextCursor?: string;
  };
}

// 分页类型
export type PaginationType = 'page' | 'cursor';

// 统一分页响应
export interface UnifiedPagination<T, P extends PageParams | CursorParams> {
  list: T[];
  pagination: P extends PageParams ? PageResponse<T>['pagination'] : CursorResponse<T>['pagination'];
}
```

### 2.3 批量操作响应接口

```typescript
// response/batch.ts

// 批量操作响应
export interface BatchResult<T> {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  results: BatchItem<T>[];
}

// 单个批量操作结果
export interface BatchItem<T> {
  index: number;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// 批量操作进度
export interface BatchProgress {
  total: number;
  processed: number;
  success: number;
  failed: number;
  percentage: number;
}
```

### 2.4 文件上传响应接口

```typescript
// response/upload.ts

// 单文件上传响应
export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  originalName?: string;
}

// 批量上传响应
export interface BatchUploadResult {
  files: UploadResult[];
  success: number;
  failed: number;
}

// 图片处理结果
export interface ImageProcessResult extends UploadResult {
  thumbnailUrl?: string;
  aspectRatio?: number;
}
```

### 2.5 列表查询响应接口

```typescript
// response/list.ts

// 列表查询响应
export interface ListResponse<T> {
  list: T[];
  count: number;
  hasMore: boolean;
}

// 带筛选的列表响应
export interface FilteredListResponse<T, F = Record<string, unknown>> {
  list: T[];
  count: number;
  filters: F;
  hasMore: boolean;
}

// 带统计的列表响应
export interface StatisticListResponse<T> extends ListResponse<T> {
  statistics: {
    total: number;
    average?: number;
    sum?: Record<string, number>;
  };
}
```

---

## 三、业务逻辑实现

### 3.1 响应构建器

```typescript
// response/response-builder.ts
import { MetaInfo, ErrorInfo } from './base-response';

export class ResponseBuilder {
  private requestId: string;
  private timestamp: number;
  private path?: string;
  private method?: string;

  constructor(requestId: string, path?: string, method?: string) {
    this.requestId = requestId;
    this.timestamp = Date.now();
    this.path = path;
    this.method = method;
  }

  /**
   * 创建成功响应
   */
  success<T>(data: T, meta?: Partial<MetaInfo>): {
    success: true;
    data: T;
    meta: MetaInfo;
  } {
    return {
      success: true,
      data,
      meta: {
        requestId: this.requestId,
        timestamp: this.timestamp,
        ...meta,
      },
    };
  }

  /**
   * 创建错误响应
   */
  error(code: string, message: string, details?: Record<string, unknown>): {
    success: false;
    error: ErrorInfo;
    meta: MetaInfo;
  } {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        requestId: this.requestId,
        timestamp: this.timestamp,
        path: this.path,
        method: this.method,
      },
    };
  }

  /**
   * 创建分页响应
   */
  page<T>(
    list: T[],
    page: number,
    pageSize: number,
    total: number
  ): {
    success: true;
    data: {
      list: T[];
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
    };
    meta: MetaInfo;
  } {
    const totalPages = Math.ceil(total / pageSize);
    return {
      success: true,
      data: {
        list,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      meta: {
        requestId: this.requestId,
        timestamp: this.timestamp,
      },
    };
  }

  /**
   * 创建游标分页响应
   */
  cursor<T>(
    list: T[],
    cursor: string | undefined,
    hasMore: boolean,
    nextCursor?: string
  ): {
    success: true;
    data: {
      list: T[];
      pagination: {
        cursor?: string;
        hasMore: boolean;
        nextCursor?: string;
      };
    };
    meta: MetaInfo;
  } {
    return {
      success: true,
      data: {
        list,
        pagination: {
          cursor,
          hasMore,
          nextCursor,
        },
      },
      meta: {
        requestId: this.requestId,
        timestamp: this.timestamp,
      },
    };
  }

  /**
   * 创建批量操作响应
   */
  batch<T>(
    results: Array<{ index: number; success: boolean; data?: T; error?: string }>,
    total: number
  ): {
    success: true;
    data: {
      total: number;
      success: number;
      failed: number;
      results: Array<{ index: number; success: boolean; data?: T; error?: { code: string; message: string } }>;
    };
    meta: MetaInfo;
  } {
    const success = results.filter(r => r.success).length;
    const failed = total - success;

    return {
      success: true,
      data: {
        total,
        success,
        failed,
        results: results.map(r =>
          r.success
            ? { index: r.index, success: true, data: r.data }
            : { index: r.index, success: false, error: { code: 'BATCH_FAILED', message: r.error || 'Unknown error' } }
        ),
      },
      meta: {
        requestId: this.requestId,
        timestamp: this.timestamp,
      },
    };
  }
}
```

### 3.2 分页计算器

```typescript
// response/pagination-calculator.ts

export class PaginationCalculator {
  /**
   * 计算页码分页参数
   */
  static calculatePageParams(
    page?: number,
    pageSize?: number,
    maxPageSize: number = 100,
    defaultPageSize: number = 20
  ): { page: number; pageSize: number; offset: number } {
    const validPage = Math.max(1, page || 1);
    const validPageSize = Math.min(Math.max(1, pageSize || defaultPageSize), maxPageSize);
    const offset = (validPage - 1) * validPageSize;

    return {
      page: validPage,
      pageSize: validPageSize,
      offset,
    };
  }

  /**
   * 计算分页元信息
   */
  static calculatePageMeta(
    page: number,
    pageSize: number,
    total: number
  ): {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } {
    const totalPages = Math.ceil(total / pageSize);
    return {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  /**
   * 验证游标分页参数
   */
  static validateCursorParams(limit?: number, maxLimit: number = 100): number {
    return Math.min(Math.max(1, limit || 20), maxLimit);
  }

  /**
   * 编码游标
   */
  static encodeCursor(value: string): string {
    return Buffer.from(value).toString('base64');
  }

  /**
   * 解码游标
   */
  static decodeCursor(cursor: string): string {
    return Buffer.from(cursor, 'base64').toString('utf-8');
  }
}
```

### 3.3 响应验证器

```typescript
// response/response-validator.ts
import { BaseResponse } from './base-response';

export class ResponseValidator {
  /**
   * 验证响应是否符合规范
   */
  static validate<T>(response: BaseResponse<T>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证 success 字段
    if (typeof response.success !== 'boolean') {
      errors.push('success 必须是 boolean 类型');
    }

    // 验证 meta 字段
    if (!response.meta || typeof response.meta !== 'object') {
      errors.push('meta 必须是对象类型');
    } else {
      if (!response.meta.requestId || typeof response.meta.requestId !== 'string') {
        errors.push('meta.requestId 必须是字符串');
      }
      if (!response.meta.timestamp || typeof response.meta.timestamp !== 'number') {
        errors.push('meta.timestamp 必须是数字');
      }
    }

    // 成功响应验证
    if (response.success === true) {
      if (!response.data) {
        errors.push('成功响应必须包含 data 字段');
      }
      if (response.error) {
        errors.push('成功响应不应包含 error 字段');
      }
    }

    // 错误响应验证
    if (response.success === false) {
      if (!response.error) {
        errors.push('失败响应必须包含 error 字段');
      } else {
        if (!response.error.code || typeof response.error.code !== 'string') {
          errors.push('error.code 必须是字符串');
        }
        if (!response.error.message || typeof response.error.message !== 'string') {
          errors.push('error.message 必须是字符串');
        }
      }
      if (response.data) {
        errors.push('错误响应不应包含 data 字段');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 验证分页参数
   */
  static validatePageParams(page?: number, pageSize?: number): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (page !== undefined && (typeof page !== 'number' || page < 1)) {
      errors.push('page 必须是大于等于 1 的数字');
    }

    if (pageSize !== undefined) {
      if (typeof pageSize !== 'number' || pageSize < 1) {
        errors.push('pageSize 必须是大于等于 1 的数字');
      } else if (pageSize > 100) {
        errors.push('pageSize 不能超过 100');
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
```

---

## 四、API 设计

### 4.1 成功响应示例

#### 简单数据响应
```json
{
  "success": true,
  "data": {
    "id": "course-001",
    "title": "数学补习课程",
    "price": 50.00
  },
  "meta": {
    "requestId": "req-20260126-001",
    "timestamp": 1706198400
  }
}
```

#### 分页列表响应
```json
{
  "success": true,
  "data": {
    "list": [
      { "id": "course-001", "title": "数学课程" },
      { "id": "course-002", "title": "英语课程" }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "meta": {
    "requestId": "req-20260126-001",
    "timestamp": 1706198400
  }
}
```

#### 游标分页响应
```json
{
  "success": true,
  "data": {
    "list": [
      { "id": "msg-001", "content": "消息1" },
      { "id": "msg-002", "content": "消息2" }
    ],
    "pagination": {
      "cursor": "abc123",
      "hasMore": true,
      "nextCursor": "def456"
    }
  },
  "meta": {
    "requestId": "req-20260126-001",
    "timestamp": 1706198400
  }
}
```

#### 批量操作响应
```json
{
  "success": true,
  "data": {
    "total": 10,
    "success": 8,
    "failed": 2,
    "skipped": 0,
    "results": [
      { "index": 0, "success": true, "data": { "id": "user-001" } },
      { "index": 1, "success": false, "error": { "code": "B01-001", "message": "用户不存在" } }
    ]
  },
  "meta": {
    "requestId": "req-20260126-001",
    "timestamp": 1706198400
  }
}
```

#### 文件上传响应
```json
{
  "success": true,
  "data": {
    "url": "https://cdn.findclass.co.nz/files/avatar-001.jpg",
    "key": "files/avatar-001.jpg",
    "size": 102400,
    "mimeType": "image/jpeg",
    "width": 800,
    "height": 600,
    "originalName": "avatar.jpg"
  },
  "meta": {
    "requestId": "req-20260126-001",
    "timestamp": 1706198400
  }
}
```

### 4.2 错误响应示例

```json
{
  "success": false,
  "error": {
    "code": "B03-001",
    "message": "课程不存在",
    "details": {
      "courseId": "course-999"
    }
  },
  "meta": {
    "requestId": "req-20260126-001",
    "timestamp": 1706198400,
    "path": "/api/v1/courses/course-999",
    "method": "GET"
  }
}
```

### 4.3 响应字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| success | boolean | 是 | 是否成功 |
| data | object | 否 | 成功时的数据 |
| error | object | 否 | 错误信息（失败时） |
| meta | object | 是 | 元信息 |
| meta.requestId | string | 是 | 请求唯一ID |
| meta.timestamp | number | 是 | 时间戳（Unix秒） |
| meta.path | string | 否 | 请求路径（错误响应） |
| meta.method | string | 否 | 请求方法（错误响应） |

---

## 五、前端实现

### 5.1 响应类型定义

```typescript
// types/response.ts

// 基础响应类型
export type BaseResponse<T> = {
  success: true;
  data: T;
  error?: undefined;
  meta: MetaInfo;
} | {
  success: false;
  data?: undefined;
  error: ErrorInfo;
  meta: MetaInfo;
};

// 分页响应类型
export type PaginatedResponse<T> = BaseResponse<{
  list: T[];
  pagination: PagePagination;
}>;

// 游标分页响应类型
export type CursorPaginatedResponse<T> = BaseResponse<{
  list: T[];
  pagination: CursorPagination;
}>;

// 页码分页
export interface PagePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// 游标分页
export interface CursorPagination {
  cursor?: string;
  hasMore: boolean;
  nextCursor?: string;
}

// 元信息
export interface MetaInfo {
  requestId: string;
  timestamp: number;
}

// 错误信息
export interface ErrorInfo {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

### 5.2 API 响应处理 Hook

```typescript
// hooks/useApiResponse.ts
import { useCallback, useState } from 'react';
import { BaseResponse, ErrorInfo } from '../types/response';

interface LoadingState {
  loading: boolean;
  error: ErrorInfo | null;
  data: unknown | null;
}

export function useApiResponse<T>() {
  const [state, setState] = useState<LoadingState>({
    loading: false,
    error: null,
    data: null,
  });

  const execute = useCallback(async <R>(
    apiCall: () => Promise<BaseResponse<R>>
  ): Promise<R | null> => {
    setState({ loading: true, error: null, data: null });

    try {
      const response = await apiCall();

      if (response.success) {
        setState({ loading: false, error: null, data: response.data });
        return response.data;
      } else {
        setState({ loading: false, error: response.error || null, data: null });
        return null;
      }
    } catch (err) {
      const error = err instanceof Error ? { code: 'NETWORK_ERROR', message: err.message } : null;
      setState({ loading: false, error: error, data: null });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}
```

### 5.3 分页 Hook

```typescript
// hooks/usePagination.ts
import { useState, useCallback } from 'react';
import { PageParams, PaginationCalculator } from '../utils/pagination';

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  maxPageSize?: number;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function usePagination(options: UsePaginationOptions = {}) {
  const {
    initialPage = 1,
    initialPageSize = 20,
    maxPageSize = 100,
  } = options;

  const [state, setState] = useState<PaginationState>({
    page: initialPage,
    pageSize: initialPageSize,
    total: 0,
    totalPages: 0,
  });

  const { page, pageSize, total, totalPages } = state;

  const setPage = useCallback((newPage: number) => {
    setState(prev => ({
      ...prev,
      page: Math.max(1, Math.min(newPage, prev.totalPages)),
    }));
  }, []);

  const setPageSize = useCallback((newSize: number) => {
    setState(prev => ({
      ...prev,
      pageSize: Math.min(Math.max(1, newSize), maxPageSize),
      page: 1,
    }));
  }, [maxPageSize]);

  const setTotal = useCallback((totalCount: number) => {
    setState(prev => ({
      ...prev,
      total: totalCount,
      totalPages: Math.ceil(totalCount / prev.pageSize),
    }));
  }, []);

  const nextPage = useCallback(() => {
    setPage(page + 1);
  }, [page, setPage]);

  const prevPage = useCallback(() => {
    setPage(page - 1);
  }, [page, setPage]);

  const getQueryParams = useCallback((): PageParams => {
    return PaginationCalculator.calculatePageParams(page, pageSize, maxPageSize);
  }, [page, pageSize, maxPageSize]);

  const reset = useCallback(() => {
    setState({
      page: initialPage,
      pageSize: initialPageSize,
      total: 0,
      totalPages: 0,
    });
  }, [initialPage, initialPageSize]);

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    setPage,
    setPageSize,
    setTotal,
    nextPage,
    prevPage,
    getQueryParams,
    reset,
  };
}
```

---

## 六、测试用例

### 6.1 响应构建器测试

| ID | 测试类型 | 测试描述 | 预期结果 | 优先级 |
|----|----------|----------|----------|--------|
| RSP-UT-01 | 单元测试 | 创建成功响应 | 包含 success: true 和 data | P0 |
| RSP-UT-02 | 单元测试 | 创建错误响应 | 包含 success: false 和 error | P0 |
| RSP-UT-03 | 单元测试 | 创建分页响应 | 分页信息计算正确 | P0 |
| RSP-UT-04 | 单元测试 | 创建游标分页响应 | 游标信息正确传递 | P1 |
| RSP-UT-05 | 单元测试 | 创建批量操作响应 | 统计信息正确 | P1 |

### 6.2 分页计算器测试

| ID | 测试类型 | 测试描述 | 预期结果 | 优先级 |
|----|----------|----------|----------|--------|
| PAG-UT-01 | 单元测试 | 计算页码参数 | 边界值处理正确 | P0 |
| PAG-UT-02 | 单元测试 | 计算分页元信息 | totalPages 计算正确 | P0 |
| PAG-UT-03 | 单元测试 | 游标编码解码 | 编码后能正确解码 | P1 |
| PAG-UT-04 | 边界测试 | 极端 page 值 | 自动调整为有效范围 | P1 |
| PAG-UT-05 | 边界测试 | 极端 pageSize 值 | 超过最大值时限制 | P1 |

### 6.3 响应验证器测试

| ID | 测试类型 | 测试描述 | 预期结果 | 优先级 |
|----|----------|----------|----------|--------|
| VAL-UT-01 | 单元测试 | 验证有效成功响应 | 返回 valid: true | P0 |
| VAL-UT-02 | 单元测试 | 验证有效错误响应 | 返回 valid: true | P0 |
| VAL-UT-03 | 单元测试 | 验证无效 success | 返回 errors | P1 |
| VAL-UT-04 | 单元测试 | 验证缺失 meta | 返回 errors | P1 |
| VAL-UT-05 | 单元测试 | 验证分页参数 | 边界值验证正确 | P1 |

---

## 七、验收标准

- [x] 响应格式统一为 success + data/error + meta 结构
- [x] 成功响应包含 data 字段，错误响应包含 error 字段
- [x] meta 包含 requestId 和 timestamp
- [x] 分页响应包含完整的分页信息
- [x] 游标分页支持高效翻页
- [x] 批量操作返回详细的统计信息
- [x] 前端类型定义完整
- [x] 响应验证器覆盖所有边界情况

---

## 八、风险分析

| 风险项 | 风险等级 | 影响范围 | 应对措施 |
|--------|----------|----------|----------|
| **响应结构变更影响客户端** | 高 | 全系统 | 版本化API，旧版本兼容 |
| **分页数据不一致** | 中 | 用户体验 | 使用事务或乐观锁 |
| **大列表响应性能问题** | 中 | 系统性能 | 使用游标分页，限制单页数量 |
| **响应数据泄露敏感信息** | 高 | 安全性 | DTO过滤敏感字段 |
| **批量操作超时** | 中 | 用户体验 | 分批处理，进度反馈 |
| **响应验证影响性能** | 低 | 系统性能 | 仅开发环境验证 |