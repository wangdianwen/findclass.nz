---
title: 技术规范文档
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
status: active
---

# 技术规范文档

> **版本**: 1.0 | **更新日期**: 2026-01-26 | **适用范围**: FindClass NZ 全栈项目

---

## 一、代码规范

### 1.1 TypeScript 规范

#### 类型定义

```typescript
// ✅ Good: 使用明确的类型定义
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

// ❌ Bad: 使用 any
function processData(data: any) {
  // 禁止使用 any
}

// ✅ Good: 使用联合类型
type PaymentMethod = 'poli' | 'bank_transfer' | 'credit_card' | 'paypal';

// ✅ Good: 使用枚举
enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// ✅ Good: 导出类型
export type { User, PaymentMethod, BookingStatus };
```

#### 函数定义

```typescript
// ✅ Good: 明确的参数和返回类型
async function getUserById(userId: string): Promise<User | null> {
  const { PK, SK } = createUserKey(userId);
  return getItem<User>({ PK, SK });
}

// ✅ Good: 可选参数
interface SearchParams {
  keyword?: string;
  page?: number;
  limit?: number;
  category?: string;
}

// ✅ Good: 泛型
async function getItems<T>(keys: Record<string, string>[]): Promise<T[]> {
  return batchGetItems<T>(keys);
}
```

### 1.2 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `user-service.ts` |
| 类名 | PascalCase | `UserService` |
| 函数/变量 | camelCase | `getUserById` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 接口/类型 | PascalCase | `UserProfile` |
| 枚举成员 | UPPER_SNAKE_CASE | `BookingStatus.PENDING` |

```typescript
// 文件命名
user-service.ts      // ✅
userService.ts      // ❌
UserService.ts      // ❌

// 常量命名
const MAX_RETRY_COUNT = 3;     // ✅
const maxRetryCount = 3;       // ❌

// 私有属性
private _cache: Map<string, unknown>;  // ✅
private cache: Map<string, unknown>;    // ❌
```

### 1.3 ESLint 配置

```json
// .eslintrc.js
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

### 1.4 Prettier 配置

```json
// .prettierrc.js
module.exports = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
  bracketSpacing: true,
  arrowParens: 'avoid',
  endOfLine: 'lf',
};
```

---

## 二、Git 规范

### 2.1 分支策略

```
main                    # 主分支（生产环境）
├── develop             # 开发分支
│   ├── feature/*      # 功能分支
│   ├── bugfix/*       # 修复分支
│   └── release/*      # 发布分支
```

### 2.2 提交规范

```
<type>(<scope>): <subject>

# 类型
feat:     新功能
fix:      Bug修复
docs:     文档更新
style:    代码格式（不影响功能）
refactor: 重构
perf:     性能优化
test:     测试相关
chore:    构建/工具/辅助功能

# 示例
feat(auth): add password reset functionality
fix(course): resolve search pagination issue
docs(readme): update installation instructions
```

### 2.3 PR 规范

```markdown
## PR 描述

### 改动内容
- [ ] 新增功能
- [ ] 修改功能
- [ ] 修复Bug

### 测试情况
- [ ] 单元测试通过 (所有API逻辑已覆盖)
- [ ] 集成测试通过 (用户故事级测试)
- [ ] 手动测试通过

### 检查清单
- [ ] 代码符合 lint 规范
- [ ] 类型检查通过
- [ ] 测试覆盖率未下降 (Unit ≥80%)
- [ ] 文档已更新
```

---

## 三、API 设计规范

### 3.1 RESTful 原则

| 方法 | 路径 | 功能 | 示例 |
|------|------|------|------|
| GET | /api/v1/users | 获取用户列表 | GET /api/v1/users?page=1&limit=10 |
| GET | /api/v1/users/:id | 获取单个用户 | GET /api/v1/users/usr_123 |
| POST | /api/v1/users | 创建用户 | POST /api/v1/users |
| PUT | /api/v1/users/:id | 更新用户 | PUT /api/v1/users/usr_123 |
| DELETE | /api/v1/users/:id | 删除用户 | DELETE /api/v1/users/usr_123 |

### 3.2 响应格式

```typescript
// 成功响应
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

// 分页响应
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// 错误响应
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

### 3.3 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 422 | 业务逻辑错误 |
| 500 | 服务器错误 |

### 3.4 OpenAPI 规范

```typescript
// 路由定义示例
export const routes: Route[] = [
  {
    method: 'get',
    path: '/users',
    tags: ['Users'],
    summary: '获取用户列表',
    parameters: [
      { name: 'page', in: 'query', schema: { type: 'integer' } },
      { name: 'limit', in: 'query', schema: { type: 'integer' } },
    ],
    responses: {
      200: { description: '成功', content: { 'application/json': { schema: { type: 'object' } } } },
    },
  },
];
```

---

## 四、数据库规范

### 4.1 DynamoDB 命名规范

```typescript
// 表名
const TABLE_NAME = 'FindClass-MainTable';  // PascalCase

// 主键格式
PK: string;  // ENTITY#{id}
SK: string;  // METADATA | SUB_TYPE#{id}

// GSI 索引
GSI1PK: string;  // 索引名+PK
GSI1SK: string;  // 索引名+SK

// 示例
interface User {
  PK: 'USER#usr_123';
  SK: 'METADATA';
  GSI1PK: 'EMAIL#test@example.com';
  GSI1SK: 'USER#2026-01-26';
}
```

### 4.2 实体类型

```typescript
// 实体类型枚举
export const ENTITY_TYPES = {
  USER: 'USER',
  TEACHER: 'TEACHER',
  COURSE: 'COURSE',
  BOOKING: 'BOOKING',
  REVIEW: 'REVIEW',
  SESSION: 'SESSION',
} as const;

export type EntityType = (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES];

// 数据分类
export const DATA_CATEGORIES = {
  USER: 'USER',
  TEACHER: 'TEACHER',
  COURSE: 'COURSE',
  BOOKING: 'BOOKING',
  TRANSACTION: 'TRANSACTION',
  SYSTEM: 'SYSTEM',
} as const;
```

### 4.3 索引命名

| 索引类型 | 前缀 | 示例 |
|----------|------|------|
| GSI1 | GSI1PK / GSI1SK | 用户邮箱索引 |
| GSI2 | GSI2PK / GSI2SK | 用户教师索引 |
| GSI3 | GSI3PK / GSI3SK | 课程搜索索引 |
| GSI4 | GSI4PK / GSI4SK | 教师搜索索引 |
| GSI5 | GSI5PK / GSI5SK | 预订时间索引 |

---

## 五、测试规范

### 5.1 测试哲学

> **核心理念**: 单元测试覆盖所有API逻辑，集成测试只验证端到端用户流程

```
单元测试 (80%)
  ↓ 所有API逻辑、数据验证、业务规则
         ↓
集成测试 (20%)
  ↓ 只做用户故事验证，端到端流程
```

- **Unit Tests (80%)**: 覆盖所有模块功能、API逻辑、数据验证
- **Integration Tests (20%)**: 只验证用户故事，端到端流程

### 5.2 测试目录结构

```
tests/
├── unit/                          # 单元测试 (核心)
│   ├── [模块名]/
│   │   ├── [功能].test.ts         # 按功能组织
│   │   └── ...
.ts
│  │   ├── setup └── setup.unit.ts
├── integration/                   # 集成测试 (按模块组织用户故事)
│   ├── [模块名]/
│   │   └── us*.test.ts            # 用户故事测试
│   ├── setup.ts
│   └── setup.integration.ts
├── fixtures/                      # 测试数据
│   ├── auth.ts
│   └── test-users.ts
└── config/                        # 测试配置
    ├── test-containers.ts
    └── dynamodb-setup.ts
```

### 5.3 单元测试规范

```typescript
// ✅ Good: Given-When-Then 结构，覆盖所有API逻辑
describe('UserService', () => {
  describe('register', () => {
    it('should create user successfully', async () => {
      // Given
      const mockUser = createMockUser();
      (scanItems as Mock).mockResolvedValue({ items: [] });
      (putItem as Mock).mockResolvedValue(mockUser);

      // When
      const result = await userService.register({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });

      // Then
      expect(result.email).toBe('test@example.com');
      expect(result.id).toBeDefined();
    });

    it('should throw error if email exists', async () => {
      // Given
      const existingUser = createMockUser();
      (scanItems as Mock).mockResolvedValue({ items: [existingUser] });

      // When & Then
      await expect(
        userService.register({ email: 'exists@example.com', ... })
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should return token on valid credentials', async () => {
      // Given
      const mockUser = { ...createMockUser(), passwordHash: hash('Password123') };
      (getItem as Mock).mockResolvedValue(mockUser);
      (comparePassword as Mock).mockResolvedValue(true);
      (generateToken as Mock).mockReturnValue('jwt-token');

      // When
      const result = await userService.login({
        email: 'test@example.com',
        password: 'Password123',
      });

      // Then
      expect(result.token).toBe('jwt-token');
    });
  });
});
```

### 5.4 集成测试规范 (只做用户故事，按模块组织)

```typescript
// ✅ Good: 按模块组织用户故事测试
// tests/integration/users/us1-registration.test.ts

describe('US1: 用户注册与登录', () => {
  beforeAll(async () => {
    await startTestContainers();
    await createTestTable();
  }, 120000);

  it('should complete full registration and login flow', async () => {
    // 完整用户流程
    const registerResult = await register({
      email: 'test@example.com',
      password: 'Pass123456',
      name: 'Test User',
    });

    expect(registerResult.user.email).toBe('test@example.com');
    expect(registerResult.token).toBeDefined();

    // 登录验证
    const loginResult = await login({
      email: 'test@example.com',
      password: 'Pass123456',
    });

    expect(loginResult.token).toBeDefined();
    expect(loginResult.user.email).toBe('test@example.com');
  });
});

// tests/integration/courses/us5-search-favorite.test.ts

describe('US5: 课程搜索与收藏', () => {
  it('should search courses and complete favorite flow', async () => {
    // 搜索课程
    const searchResult = await searchCourses({
      keyword: '数学',
      city: 'Auckland',
    });

    expect(searchResult.courses.length).toBeGreaterThan(0);

    // 收藏课程
    const favoriteResult = await favoriteCourse(searchResult.courses[0].id);

    expect(favoriteResult.success).toBe(true);

    // 验证收藏列表
    const myFavorites = await getMyFavorites();
    expect(myFavorites.courses.length).toBe(1);
  });
});
```

### 5.5 测试覆盖率要求

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

| 测试类型 | 覆盖率要求 | 运行频率 | 说明 |
|----------|------------|----------|------|
| Unit Tests | ≥80% | 代码提交时 | 所有API逻辑必须覆盖 |
| Integration Tests | - | PR合并时 | 只验证用户故事 |

### 5.6 运行测试

```bash
# 运行所有测试
npm test

# 只运行单元测试 (主要)
npm run test:unit

# 只运行集成测试 (用户故事)
npm run test:integration

# 生成覆盖率报告
npm run test:coverage
```

### 5.7 禁止的测试模式

```typescript
// ❌ Bad: 模块级API集成测试 - 不需要
describe('Users API Integration', () => {
  it('should get users via API', async () => {
    const response = await request(app).get('/api/v1/users');
    expect(response.status).toBe(200);
  });
});

// ❌ Bad: 每个API都写集成测试 - 浪费
describe('Courses API Integration', () => {
  it('should create course', async () => {
    const response = await request(app).post('/api/v1/courses');
    expect(response.status).toBe(201);
  });
});

// ✅ Good: 所有API逻辑在单元测试中覆盖
describe('CourseService', () => {
  describe('createCourse', () => {
    it('should create course successfully', async () => {
      // 所有逻辑在单元测试中验证
    });
  });
});
```

### 5.8 测试原则

| 原则 | 说明 |
|------|------|
| **Mock所有外部依赖** | 数据库、缓存、外部API全部Mock |
| **单元测试覆盖所有逻辑** | 每个Service方法、Controller方法都要测试 |
| **集成测试只做用户故事** | 验证完整用户流程，不验证单个API |
| **不做重复测试** | 单元测试覆盖了逻辑，集成测试不重复验证 |

---

## 六、目录结构规范

### 6.1 后端目录结构

```
07-backend/src/
├── config/                    # 配置
│   ├── env/                  # 环境变量
│   ├── index.ts
│   └── swagger.ts            # API文档
├── core/                     # 核心工具
│   ├── errors.ts            # 错误处理
│   ├── helpers.ts
│   └── logger.ts           # 日志
├── lambda/                   # AWS Lambda
├── modules/                  # 功能模块
│   ├── [模块名]/
│   │   ├── [模块名].controller.ts
│   │   ├── [模块名].service.ts
│   │   ├── [模块名].types.ts
│   │   ├── routes.ts
│   │   └── index.ts
├── shared/                   # 共享组件
│   ├── db/                  # 数据库
│   ├── middleware/          # 中间件
│   ├── smtp/               # 邮件
│   └── utils/              # 工具
├── scripts/                  # 构建脚本
├── app.ts                    # 应用入口
├── index.ts
└── server.ts                # 服务入口
```

### 6.2 模块命名

```typescript
// ✅ Good: 统一使用单数名词
modules/users/      // ✅
modules/user/       // ❌

// ✅ Good: 索引文件导出
// modules/users/index.ts
export * from './users.controller';
export * from './users.service';
export * from './users.types';
export { usersRouter } from './routes';
```

---

## 七、错误处理规范

### 7.1 错误码规范

```typescript
// 错误码格式: XX-YYY
// XX: 模块代码
// YYY: 错误序号

// 用户模块 (01)
const ERROR_CODES = {
  USER_NOT_FOUND: '01-001',
  USER_EXISTS: '01-002',
  USER_DISABLED: '01-003',
} as const;

// 认证模块 (02)
const AUTH_ERROR_CODES = {
  INVALID_TOKEN: '02-001',
  TOKEN_EXPIRED: '02-002',
  UNAUTHORIZED: '02-003',
} as const;
```

### 7.2 错误处理

```typescript
// ✅ Good: 统一错误处理
interface AppError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

function createError(code: string, message: string, statusCode: number): AppError {
  return {
    name: 'AppError',
    message,
    code,
    statusCode,
  };
}

// 全局错误中间件
app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  logger.error({ code: err.code, message: err.message, stack: err.stack });
  res.status(err.statusCode).json({
    success: false,
    error: {
      code: err.code,
      message: err.message,
    },
  });
});
```

---

## 八、文档规范

### 8.1 代码注释

```typescript
/**
 * 获取用户详情
 * 根据用户ID获取用户信息，包括个人资料和统计信息
 *
 * @param userId - 用户唯一标识
 * @param options - 可选配置
 * @returns 用户详情或 null
 *
 * @throws UserNotFoundError - 用户不存在
 * @throws UnauthorizedError - 无权限访问
 *
 * @example
 * ```typescript
 * const user = await getUserById('usr_123');
 * console.log(user.name);
 * ```
 */
async function getUserById(userId: string, options?: Options): Promise<UserDetail | null> {
  // 实现
}
```

### 8.2 README 规范

```markdown
# 模块名称

## 功能描述
简述模块功能

## 使用方法

```typescript
import { Module } from './module';
```

## API 文档

### 方法

#### methodName

| 参数 | 类型 | 必填 | 说明 |
|------|------|-------|------|
| param | string | 是 | 参数说明 |

| 返回值 | 类型 | 说明 |
|--------|------|------|
| result | Promise\<Result\> | 返回说明 |

## 示例

```typescript
// 示例代码
```

## 注意事项
- 注意事项1
- 注意事项2
```

---

## 九、相关文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 测试策略 | [test-strategy.md](./test-strategy.md) | 详细测试规范 |
| API 规范 | [openapi.yaml](../../07-backend/docs/api/openapi.yaml) | RESTful API 定义 |
| 数据库设计 | [database-design.md](../mvp/database-design.md) | 数据库结构 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/docs/technical-standards.md`

**相关文档**:
- [测试策略](./test-strategy.md)
- [API规范](../../07-backend/docs/api/openapi.yaml)
- [数据库设计](../mvp/database-design.md)
