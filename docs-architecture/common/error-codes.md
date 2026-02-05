---
title: 技术实现 - 错误码规范
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 1
priority: P0
status: complete
related_feature: ../../05-product-design/mvp/feature-api-design.md
---

# 技术实现: 错误码规范

> **对应产品文档**: [feature-api-design.md](../../05-product-design/mvp/feature-api-design.md) | **优先级**: P0 | **排期**: Phase 1 | **状态**: 已实现

---

## 一、技术架构

### 1.1 错误处理架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         技术架构层级                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [API Gateway / Lambda]                                           │
│         │                                                           │
│         ▼                                                           │
│   [Error Handler Middleware]                                       │
│         │                                                           │
│         ▼                                                           │
│   [Error Code Registry]                                            │
│         │                                                           │
│         ▼                                                           │
│   [Response Formatter] ──→ Client                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 错误码结构设计

```
AB-CD-E
│ │  │
│ │  └── 具体错误码 (001-999)
│ └───── 模块码 (01-99)
└────────── 错误级别 (A-E)
```

### 1.3 技术选型

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| **错误码管理** | TypeScript Enum | 集中定义类型安全 |
| **错误处理** | Express/Koa Middleware | 统一错误捕获 |
| **错误日志** | CloudWatch Logs | 错误监控与告警 |
| **错误响应** | JSON API | 标准化错误格式 |

---

## 二、数据模型设计 (TypeScript)

### 2.1 错误级别定义

```typescript
// 错误级别枚举
export enum ErrorLevel {
  CRITICAL = 'A',  // 严重错误 - 系统级
  BUSINESS = 'B',  // 业务错误 - 业务逻辑
  PARAM = 'C',     // 参数错误 - 输入验证
  PERMISSION = 'D', // 权限错误 - 访问控制
  INFO = 'E',      // 提示信息 - 友好提示
}

// 错误级别映射
export const ErrorLevelDescription: Record<ErrorLevel, string> = {
  [ErrorLevel.CRITICAL]: '严重错误 - 系统级错误，需要立即处理',
  [ErrorLevel.BUSINESS]: '业务错误 - 业务逻辑错误',
  [ErrorLevel.PARAM]: '参数错误 - 请求参数不合法',
  [ErrorLevel.PERMISSION]: '权限错误 - 无权限访问',
  [ErrorLevel.INFO]: '提示信息 - 友好提示',
};

// HTTP状态码映射
export const ErrorLevelHttpStatus: Record<ErrorLevel, number> = {
  [ErrorLevel.CRITICAL]: 500,
  [ErrorLevel.BUSINESS]: 400,
  [ErrorLevel.PARAM]: 400,
  [ErrorLevel.PERMISSION]: 403,
  [ErrorLevel.INFO]: 200,
};
```

### 2.2 模块码定义

```typescript
// 模块码枚举
export enum ModuleCode {
  COMMON = '00',      // 通用
  USER = '01',        // 用户模块
  AUTH = '02',        // 认证模块
  COURSE = '03',      // 课程模块
  TRANSACTION = '04', // 交易模块
  INSTITUTION = '05', // 机构模块
  PAYMENT = '06',     // 支付模块
  SEARCH = '07',      // 搜索模块
  NOTIFICATION = '08', // 通知模块
  BOOKING = '09',     // 预约模块
}

export const ModuleCodeDescription: Record<ModuleCode, string> = {
  [ModuleCode.COMMON]: '通用错误',
  [ModuleCode.USER]: '用户模块',
  [ModuleCode.AUTH]: '认证模块',
  [ModuleCode.COURSE]: '课程模块',
  [ModuleCode.TRANSACTION]: '交易模块',
  [ModuleCode.INSTITUTION]: '机构模块',
  [ModuleCode.PAYMENT]: '支付模块',
  [ModuleCode.SEARCH]: '搜索模块',
  [ModuleCode.NOTIFICATION]: '通知模块',
  [ModuleCode.BOOKING]: '预约模块',
};
```

### 2.3 完整错误码枚举

```typescript
export enum ErrorCode {
  // ========== A 级别 - 严重错误 ==========
  SYSTEM_ERROR = 'A00-001',
  DB_CONNECTION_ERROR = 'A00-002',
  DYNAMODB_CONNECTION_ERROR = 'A00-003',
  ELASTICSEARCH_ERROR = 'A00-004',
  EXTERNAL_SERVICE_ERROR = 'A00-005',

  // ========== B 级别 - 业务错误 ==========
  // 用户模块
  USER_NOT_FOUND = 'B01-001',
  USER_EXISTS = 'B01-002',
  USER_DISABLED = 'B01-003',
  USER_INACTIVE = 'B01-004',

  // 认证模块
  VERIFY_CODE_EXPIRED = 'B02-001',
  VERIFY_CODE_ERROR = 'B02-002',
  TOKEN_INVALID = 'B02-003',
  TOKEN_EXPIRED = 'B02-004',
  PASSWORD_ERROR = 'B02-005',

  // 课程模块
  COURSE_NOT_FOUND = 'B03-001',
  COURSE_OFFLINE = 'B03-002',
  COURSE_FULL = 'B03-003',
  COURSE_ALREADY_ENROLLED = 'B03-004',
  COURSE_NOT_AVAILABLE = 'B03-005',

  // 交易模块
  BOOKING_NOT_FOUND = 'B04-001',
  BOOKING_CONFLICT = 'B04-002',
  BOOKING_CANCELLED = 'B04-003',
  BOOKING_EXPIRED = 'B04-004',

  // 机构模块
  INSTITUTION_NOT_FOUND = 'B05-001',
  INSTITUTION_SUSPENDED = 'B05-002',
  INSTITUTION_INACTIVE = 'B05-003',

  // 支付模块
  PAYMENT_NOT_FOUND = 'B06-001',
  PAYMENT_FAILED = 'B06-002',
  PAYMENT_ALREADY_PROCESSED = 'B06-003',
  REFUND_NOT_ALLOWED = 'B06-004',

  // ========== C 级别 - 参数错误 ==========
  PARAM_REQUIRED = 'C00-001',
  PARAM_FORMAT_ERROR = 'C00-002',
  PARAM_RANGE_ERROR = 'C00-003',
  PARAM_TYPE_ERROR = 'C00-004',

  // 用户参数
  EMAIL_FORMAT_ERROR = 'C01-001',
  PHONE_FORMAT_ERROR = 'C01-002',
  PASSWORD_WEAK = 'C01-003',
  AGE_RANGE_ERROR = 'C01-004',

  // ========== D 级别 - 权限错误 ==========
  NOT_LOGIN = 'D00-001',
  TOKEN_EXPIRED_REFRESH = 'D00-002',
  NO_PERMISSION = 'D00-003',
  NOT_TEACHER = 'D01-001',
  NOT_INSTITUTION_ADMIN = 'D01-002',
  NOT_PLATFORM_ADMIN = 'D01-003',

  // ========== E 级别 - 提示信息 ==========
  SUCCESS = 'E00-001',
  DATA_EXISTS = 'E00-002',
  DATA_NOT_EXISTS = 'E00-003',
  VERIFY_CODE_SENT = 'E01-001',
  PASSWORD_CHANGED = 'E01-002',
  EMAIL_SENT = 'E01-003',
}
```

### 2.4 错误响应接口

```typescript
// 错误信息接口
export interface ErrorInfo {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// 完整错误响应接口
export interface ErrorResponse {
  success: false;
  error: ErrorInfo;
  meta: {
    requestId: string;
    timestamp: number;
    path: string;
    method: string;
  };
}

// 错误码配置
export interface ErrorCodeConfig {
  code: string;
  message: string;
  httpStatus: number;
  level: ErrorLevel;
  module: ModuleCode;
  isRetryable: boolean;
  userMessage?: string;
}
```

---

## 三、业务逻辑实现

### 3.1 错误码注册表

```typescript
// error-code-registry.ts
import { ErrorCode, ErrorCodeConfig, ErrorLevel, ModuleCode } from './types';

export const ERROR_CODE_REGISTRY: Record<ErrorCode, ErrorCodeConfig> = {
  // A 级别 - 严重错误
  [ErrorCode.SYSTEM_ERROR]: {
    code: ErrorCode.SYSTEM_ERROR,
    message: '系统内部错误',
    httpStatus: 500,
    level: ErrorLevel.CRITICAL,
    module: ModuleCode.COMMON,
    isRetryable: false,
    userMessage: '系统暂时不可用，请稍后重试',
  },
  [ErrorCode.DB_CONNECTION_ERROR]: {
    code: ErrorCode.DB_CONNECTION_ERROR,
    message: '数据库连接失败',
    httpStatus: 503,
    level: ErrorLevel.CRITICAL,
    module: ModuleCode.COMMON,
    isRetryable: true,
    userMessage: '服务暂时不可用，请稍后重试',
  },
  [ErrorCode.DYNAMODB_CONNECTION_ERROR]: {
    code: ErrorCode.DYNAMODB_CONNECTION_ERROR,
    message: 'DynamoDB连接失败',
    httpStatus: 503,
    level: ErrorLevel.CRITICAL,
    module: ModuleCode.COMMON,
    isRetryable: true,
    userMessage: '服务暂时不可用，请稍后重试',
  },

  // B 级别 - 业务错误
  [ErrorCode.USER_NOT_FOUND]: {
    code: ErrorCode.USER_NOT_FOUND,
    message: '用户不存在',
    httpStatus: 404,
    level: ErrorLevel.BUSINESS,
    module: ModuleCode.USER,
    isRetryable: false,
    userMessage: '用户不存在，请检查输入',
  },
  [ErrorCode.USER_EXISTS]: {
    code: ErrorCode.USER_EXISTS,
    message: '用户已注册',
    httpStatus: 409,
    level: ErrorLevel.BUSINESS,
    module: ModuleCode.USER,
    isRetryable: false,
    userMessage: '该手机号已注册，请直接登录',
  },

  // C 级别 - 参数错误
  [ErrorCode.PARAM_REQUIRED]: {
    code: ErrorCode.PARAM_REQUIRED,
    message: '必填参数缺失',
    httpStatus: 400,
    level: ErrorLevel.PARAM,
    module: ModuleCode.COMMON,
    isRetryable: false,
    userMessage: '请填写完整信息',
  },
  [ErrorCode.EMAIL_FORMAT_ERROR]: {
    code: ErrorCode.EMAIL_FORMAT_ERROR,
    message: '邮箱格式错误',
    httpStatus: 400,
    level: ErrorLevel.PARAM,
    module: ModuleCode.USER,
    isRetryable: false,
    userMessage: '请输入有效的邮箱地址',
  },

  // D 级别 - 权限错误
  [ErrorCode.NOT_LOGIN]: {
    code: ErrorCode.NOT_LOGIN,
    message: '未登录',
    httpStatus: 401,
    level: ErrorLevel.PERMISSION,
    module: ModuleCode.COMMON,
    isRetryable: false,
    userMessage: '请先登录',
  },
  [ErrorCode.NO_PERMISSION]: {
    code: ErrorCode.NO_PERMISSION,
    message: '无权限访问',
    httpStatus: 403,
    level: ErrorLevel.PERMISSION,
    module: ModuleCode.COMMON,
    isRetryable: false,
    userMessage: '您没有权限执行此操作',
  },

  // E 级别 - 提示信息
  [ErrorCode.SUCCESS]: {
    code: ErrorCode.SUCCESS,
    message: '操作成功',
    httpStatus: 200,
    level: ErrorLevel.INFO,
    module: ModuleCode.COMMON,
    isRetryable: false,
  },
};
```

### 3.2 错误处理服务

```typescript
// error-service.ts
import { ErrorCode, ErrorInfo, ErrorCodeConfig } from './types';
import { ERROR_CODE_REGISTRY } from './registry';

export class ErrorService {
  /**
   * 根据错误码获取错误信息
   */
  getErrorInfo(code: ErrorCode): ErrorInfo {
    const config = ERROR_CODE_REGISTRY[code];
    if (!config) {
      return {
        code: ErrorCode.SYSTEM_ERROR,
        message: '未知错误',
      };
    }
    return {
      code: config.code,
      message: config.message,
    };
  }

  /**
   * 根据错误码获取HTTP状态码
   */
  getHttpStatus(code: ErrorCode): number {
    const config = ERROR_CODE_REGISTRY[code];
    return config?.httpStatus || 500;
  }

  /**
   * 创建业务错误
   */
  createBusinessError(
    code: ErrorCode,
    details?: Record<string, unknown>
  ): { code: ErrorCode; message: string; details?: Record<string, unknown> } {
    const config = ERROR_CODE_REGISTRY[code];
    return {
      code,
      message: config?.message || '业务错误',
      details,
    };
  }

  /**
   * 创建参数错误
   */
  createParamError(field: string, message: string): {
    code: ErrorCode;
    message: string;
    details: Record<string, unknown>;
  } {
    return {
      code: ErrorCode.PARAM_REQUIRED,
      message: message,
      details: { field },
    };
  }
}

export const errorService = new ErrorService();
```

### 3.3 错误日志服务

```typescript
// error-logger.ts
import { ErrorCode } from './types';

interface ErrorLogEntry {
  timestamp: number;
  requestId: string;
  code: ErrorCode;
  message: string;
  stack?: string;
  path: string;
  method: string;
  userId?: string;
  details?: Record<string, unknown>;
}

export class ErrorLogger {
  private logs: ErrorLogEntry[] = [];

  /**
   * 记录错误日志
   */
  log(entry: Omit<ErrorLogEntry, 'timestamp'>): void {
    const logEntry: ErrorLogEntry = {
      ...entry,
      timestamp: Date.now(),
    };
    this.logs.push(logEntry);

    // 生产环境发送到 CloudWatch
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * 获取最近的错误日志
   */
  getRecentErrors(count: number = 100): ErrorLogEntry[] {
    return this.logs.slice(-count);
  }
}

export const errorLogger = new ErrorLogger();
```

---

## 四、API 设计

### 4.1 错误响应示例

#### 成功响应
```json
{
  "success": true,
  "data": {
    "id": "course-001",
    "title": "数学补习课程"
  },
  "meta": {
    "requestId": "req-20260126-001",
    "timestamp": 1706198400
  }
}
```

#### 错误响应 - 业务错误
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

#### 错误响应 - 参数错误
```json
{
  "success": false,
  "error": {
    "code": "C01-001",
    "message": "邮箱格式错误",
    "details": {
      "field": "email",
      "value": "invalid-email"
    }
  },
  "meta": {
    "requestId": "req-20260126-002",
    "timestamp": 1706198400,
    "path": "/api/v1/users",
    "method": "POST"
  }
}
```

#### 错误响应 - 权限错误
```json
{
  "success": false,
  "error": {
    "code": "D00-001",
    "message": "未登录",
    "details": {
      "required": "Bearer Token"
    }
  },
  "meta": {
    "requestId": "req-20260126-003",
    "timestamp": 1706198400,
    "path": "/api/v1/bookings",
    "method": "POST"
  }
}
```

### 4.2 错误码速查表

| 错误码 | 说明 | HTTP状态 | 用户提示 |
|--------|------|----------|----------|
| A00-001 | 系统内部错误 | 500 | 系统暂时不可用 |
| A00-002 | 数据库连接失败 | 503 | 服务暂时不可用 |
| B01-001 | 用户不存在 | 404 | 用户不存在 |
| B01-002 | 用户已注册 | 409 | 已注册，请登录 |
| B02-001 | 验证码已过期 | 400 | 验证码已过期 |
| B02-003 | Token无效 | 401 | 登录已过期 |
| B03-001 | 课程不存在 | 404 | 课程不存在 |
| C00-001 | 必填参数缺失 | 400 | 请填写完整信息 |
| C01-001 | 邮箱格式错误 | 400 | 请输入有效邮箱 |
| D00-001 | 未登录 | 401 | 请先登录 |
| D00-003 | 无权限访问 | 403 | 无权限执行此操作 |

---

## 五、前端实现

### 5.1 错误码映射

```typescript
// constants/error-messages.ts

// 错误码到用户提示的映射
export const ERROR_MESSAGES: Record<string, string> = {
  // A 级别
  'A00-001': '系统暂时不可用，请稍后重试',
  'A00-002': '服务暂时不可用，请稍后重试',
  'A00-003': '服务暂时不可用，请稍后重试',

  // B 级别 - 用户
  'B01-001': '用户不存在',
  'B01-002': '该手机号已注册，请直接登录',
  'B01-003': '账户已被禁用，请联系客服',
  'B01-004': '账户未激活，请先激活',

  // B 级别 - 认证
  'B02-001': '验证码已过期，请重新获取',
  'B02-002': '验证码错误，请重新输入',
  'B02-003': '登录已过期，请重新登录',
  'B02-005': '密码错误，请重新输入',

  // B 级别 - 课程
  'B03-001': '课程不存在或已下架',
  'B03-002': '课程已下架',
  'B03-003': '课程已满员，请选择其他课程',
  'B03-004': '您已报名该课程',

  // B 级别 - 预约
  'B04-001': '预约不存在',
  'B04-002': '该时间段已被预约，请选择其他时间',
  'B04-003': '预约已取消',
  'B04-004': '预约已过期',

  // C 级别
  'C00-001': '请填写完整信息',
  'C00-002': '参数格式错误',
  'C01-001': '请输入有效的邮箱地址',
  'C01-002': '请输入有效的手机号',
  'C01-003': '密码需要至少8位，包含数字和字母',

  // D 级别
  'D00-001': '请先登录',
  'D00-002': '登录已过期，请重新登录',
  'D00-003': '您没有权限执行此操作',
  'D01-001': '请先申请成为教师',
  'D01-002': '需要机构管理员权限',

  // E 级别
  'E00-001': '操作成功',
  'E00-002': '数据已存在',
  'E00-003': '数据不存在',
  'E01-001': '验证码已发送，请查收',
  'E01-002': '密码修改成功，请重新登录',
};

// 获取错误提示
export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] || '操作失败，请稍后重试';
}
```

### 5.2 错误处理 Hook

```typescript
// hooks/useErrorHandler.ts
import { useCallback } from 'react';
import { getErrorMessage } from '../constants/error-messages';
import { toast } from 'react-hot-toast';

interface ErrorResponse {
  success: boolean;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function useErrorHandler() {
  const handleError = useCallback((error: ErrorResponse) => {
    if (error.success === false && error.error) {
      const userMessage = getErrorMessage(error.error.code);
      toast.error(userMessage);
      console.error(`Error ${error.error.code}:`, error.error.message);
    }
  }, []);

  const handleApiError = useCallback((error: unknown) => {
    console.error('API Error:', error);
    toast.error('网络错误，请稍后重试');
  }, []);

  return { handleError, handleApiError };
}
```

---

## 六、测试用例

### 6.1 错误码注册表测试

| ID | 测试类型 | 测试描述 | 预期结果 | 优先级 |
|----|----------|----------|----------|--------|
| ERR-UT-01 | 单元测试 | 获取有效错误码的配置 | 返回正确的错误配置 | P0 |
| ERR-UT-02 | 单元测试 | 获取无效错误码 | 返回系统错误配置 | P1 |
| ERR-UT-03 | 单元测试 | 错误码格式验证 | 所有错误码符合 AB-CD-E 格式 | P0 |

### 6.2 错误处理中间件测试

| ID | 测试类型 | 测试描述 | 预期结果 | 优先级 |
|----|----------|----------|----------|--------|
| ERR-MW-01 | 集成测试 | 业务错误响应 | 返回 400 和业务错误信息 | P0 |
| ERR-MW-02 | 集成测试 | 参数错误响应 | 返回 400 和参数错误信息 | P0 |
| ERR-MW-03 | 集成测试 | 权限错误响应 | 返回 403 和权限错误信息 | P0 |
| ERR-MW-04 | 集成测试 | 系统错误响应 | 返回 500 和系统错误信息 | P1 |
| ERR-MW-05 | 集成测试 | 请求ID传递 | 错误响应包含正确requestId | P1 |

### 6.3 前端错误处理测试

| ID | 测试类型 | 测试描述 | 预期结果 | 优先级 |
|----|----------|----------|----------|--------|
| ERR-FE-01 | 单元测试 | 错误码映射正确 | B01-001 显示"用户不存在" | P0 |
| ERR-FE-02 | 单元测试 | 未知错误处理 | 未定义错误码显示默认提示 | P1 |
| ERR-FE-03 | UI测试 | 错误Toast显示 | 错误时显示对应Toast | P1 |

---

## 七、验收标准

- [x] 错误码格式统一为 AB-CD-E 结构
- [x] A-E 五级错误分类明确
- [x] 错误响应格式统一：success、error、meta
- [x] HTTP 状态码与错误级别正确映射
- [x] 前端正确显示用户友好的错误提示
- [x] 错误日志包含完整上下文信息
- [x] 支持错误码扩展，不破坏现有结构
- [x] 错误处理不影响正常请求流程

---

## 八、风险分析

| 风险项 | 风险等级 | 影响范围 | 应对措施 |
|--------|----------|----------|----------|
| **错误码扩散导致难以维护** | 中 | 开发效率 | 集中管理，建立错误码注册表 |
| **错误信息泄露系统细节** | 高 | 安全性 | 生产环境隐藏敏感错误信息 |
| **前端错误提示不友好** | 中 | 用户体验 | 建立错误码到用户提示的映射 |
| **错误处理不一致** | 低 | 代码质量 | 统一错误处理中间件 |
| **错误码冲突** | 低 | 系统稳定性 | 错误码使用枚举定义，防止重复 |