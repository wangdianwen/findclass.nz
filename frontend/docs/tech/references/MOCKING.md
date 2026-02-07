# Mock 数据指南

本项目使用 MSW (Mock Service Worker) 进行 API 数据模拟。

## 环境区分

> **重要**: MSW 仅在开发环境 (`npm run dev`) 中加载，生产构建会自动排除 MSW 相关代码。

| 环境              | MSW 行为             |
| ----------------- | -------------------- |
| `npm run dev`     | 自动加载并启用 MSW   |
| `npm run build`   | **不打包** MSW 代码  |
| `npm run preview` | 不加载 MSW           |
| Storybook         | 通过独立配置加载 MSW |

### 实现原理

```typescript
// src/main.tsx
if (import.meta.env.DEV) {
  import('./mocks').catch(error => {
    console.warn('[MSW] Mock server initialization skipped:', error);
  });
}
```

使用动态导入 + `import.meta.env.DEV` 条件检查，确保 Vite/Rollup 可以将 MSW 从生产包中 tree-shaken 掉。

## 目录结构

```
src/mocks/
├── handlers/          # API handlers
│   ├── index.ts       # 入口，导出所有 handlers
│   ├── userCenter.ts  # 用户中心相关 API
│   ├── edgeCases.ts   # 边界情况 handlers
│   └── ...
├── browser.ts         # 浏览器环境配置
└── node.ts            # Node 环境配置
```

## Mock 数据实现流程

### 1. 定义 Mock 数据类型

在 `handlers/*.ts` 中定义 mock 数据常量：

```typescript
// src/mocks/handlers/userCenter.ts
export const MOCK_USER_PROFILE = {
  id: 'user-001',
  email: 'user@example.com',
  // ...
};
```

### 2. 创建 API Handler

使用 MSW 的 `http` 对象定义请求处理：

```typescript
// src/mocks/handlers/userCenter.ts
export const userCenterHandlers = [
  // GET 请求
  http.get('/api/v1/user/profile', () => {
    return HttpResponse.json(MOCK_USER_PROFILE);
  }),
  // POST 请求
  http.post('/api/v1/user/children', async ({ request }) => {
    const data = await request.json();
    return HttpResponse.json({ success: true, data });
  }),
  // 带路径参数
  http.delete('/api/v1/user/children/:id', ({ params }) => {
    return HttpResponse.json({ success: true });
  }),
];
```

### 3. 注册 Handler

在 `handlers/index.ts` 中导出所有 handlers：

```typescript
import { userCenterHandlers } from './userCenter';
import { userApiHandlers } from './user';

export const handlers = [...userCenterHandlers, ...userApiHandlers];
```

### 4. 组件中使用 API

通过 services/api.ts 中的封装调用：

```typescript
// src/services/api.ts
class UserCenterApi {
  async getProfile(): Promise<UserProfile> {
    const response = await axios.get('/api/v1/user/profile');
    return response.data;
  }
}

export const userCenterApi = new UserCenterApi();
```

## MSW 最佳实践

### 边界情况处理

在 `edgeCases.ts` 中定义特殊场景：

- 限流/频率限制
- 用户被封禁
- 权限不足
- 网络错误
- 数据不存在

### 异步数据模拟

对于需要延迟响应的场景：

```typescript
http.get('/api/v1/user/notifications', async () => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return HttpResponse.json(MOCK_NOTIFICATIONS);
});
```

## 相关文件

- API 服务封装：`src/services/api.ts`
- MSW 配置：`src/mocks/browser.ts`
- User Center handlers：`src/mocks/handlers/userCenter.ts`
- E2E 测试数据：`src/test/e2e/setup/test-data.ts`

## E2E 测试数据

E2E 测试使用扩展的 Mock 数据，位于 `src/mocks/data/apiData.ts`：

### 课程数据 (30 个)

| ID 范围 | 数量 | 用途     |
| ------- | ---- | -------- |
| 1-15    | 15   | 基础课程 |
| 16-30   | 15   | 分页测试 |

### 分页测试课程 (16-30)

包含多种科目类型：

- 语言课程：日语、韩语、法语、西班牙语
- 艺术课程：中文字法
- 体育课程：瑜伽、高尔夫
- 编程课程：少儿编程、SAT 数学
- 其他：高考英语、演讲与辩论等

### E2E 测试数据生成器

```typescript
// src/test/e2e/setup/test-data.ts
export const PAGINATION_TEST_COURSES = [...]; // 15 个分页测试课程

export const TEST_USERS = {
  regular: { email: 'user@example.com', verificationCode: '123456' },
  rateLimited: { email: 'ratelimit@test.com', verificationCode: '123456' },
  banned: { email: 'banned@test.com', verificationCode: '123456' },
  wrongCode: { email: 'user@example.com', verificationCode: '000000' },
};

export const SEARCH_TEST_CASES = [
  { keyword: '数学', expectedCount: 4 },
  { keyword: '英语', expectedCount: 3 },
  { keyword: '不存在的课程', expectedCount: 0 },
];
```
