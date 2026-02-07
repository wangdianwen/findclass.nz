# MSW Mock Server API

FindClass.nz 前端项目的 Mock Service Worker (MSW) API 文档。

## 快速开始

### 启动 MSW

```bash
npm run dev    # 开发环境
npm run storybook  # Storybook
```

### 调试

- **控制台日志**: `[MSW] POST /api/v1/auth/login`
- **Network 面板**: 请求状态为 200 (MSW 拦截)

---

## 目录

| 文档                               | 内容                                                           |
| ---------------------------------- | -------------------------------------------------------------- |
| [MSW-AUTH.md](./MSW-AUTH.md)       | 认证接口 (login, register, refresh, reset-password, send-code) |
| [MSW-COURSES.md](./MSW-COURSES.md) | 课程接口 (列表、详情、搜索、筛选)                              |
| [MSW-REVIEWS.md](./MSW-REVIEWS.md) | 评价接口                                                       |
| [MSW-TUTORS.md](./MSW-TUTORS.md)   | 教师接口                                                       |
| [MSW-SEARCH.md](./MSW-SEARCH.md)   | 搜索接口                                                       |

---

## 通用规范

### URL 规范

- **基础路径**: `/api/v1/`
- **课程详情**: `/api/v1/courses/{guid}`
- **SEO URL**: `/api/v1/courses/{guid}/{slug}`
- **教师详情**: `/api/v1/tutors/{guid}`

### ID 规范

所有资源使用 **UUID v4** 格式：

```javascript
// 课程 ID
550e8400-e29b-41d4-a716-446655440000

// 教师 ID
660e8400-e29b-41d4-a716-446655440000
```

### Slug 规范

用于 SEO 友好的 URL：

```javascript
// 高中数学辅导 -> gao-zhong-shu-xue-fu-dao
generateSlug('高中数学辅导'); // "gao-zhong-shu-xue-fu-dao"
```

### 响应格式

**成功响应 (200):**

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

**失败响应 (400/401/404/409/429):**

```json
{
  "success": false,
  "message": "错误信息"
}
```

---

## 测试账号

| 场景         | 邮箱                 | 验证码   | 说明         |
| ------------ | -------------------- | -------- | ------------ |
| 登录成功     | `user@example.com`   | `123456` | 返回 token   |
| 验证码错误   | 任意                 | `000000` | 验证码错误   |
| 邮箱已注册   | `existing@test.com`  | 任意     | 邮箱已被注册 |
| 发送频率限制 | `ratelimit@test.com` | -        | 发送过于频繁 |

---

## 前端集成

### API 调用

```typescript
import { authApi, courseApi } from '@/services/api';

// 登录
const login = async (email: string, code: string) => {
  const result = await authApi.login({ email, code });
  if (result.success && result.data) {
    localStorage.setItem('auth_token', result.data.accessToken);
    localStorage.setItem('refresh_token', result.data.refreshToken);
  }
};

// 获取课程列表
const fetchCourses = async () => {
  const result = await courseApi.getCourses({
    city: 'auckland',
    subject: '数学',
    page: 1,
    limit: 20,
  });
  return result;
};
```

### 禁用 MSW

```typescript
// src/main.tsx
// if (import.meta.env.DEV) {
//   worker.start();
// }
```
