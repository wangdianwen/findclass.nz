# Mock Edge Cases & 错误场景

本文档描述了 MSW Mock API 中模拟的各种边缘场景和错误情况，用于测试前端错误处理逻辑。

---

## 用户状态场景

### 1. 用户被删除 (USER_NOT_FOUND)

请求示例：
```http
GET /api/v1/users/deleted-user-001
```

响应：
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "用户不存在或已被删除"
  }
}
```

**触发条件**: 用户ID包含 `deleted` 字符串

---

### 2. 用户被封禁 (USER_BANNED)

请求示例：
```http
GET /api/v1/users/banned-user-001
```

或在使用需要认证的接口时：
```http
Authorization: Bearer banned-token-xxx
POST /api/v1/user/favorites
POST /api/v1/inquiries
POST /api/v1/reports
```

响应：
```json
{
  "success": false,
  "error": {
    "code": "USER_BANNED",
    "message": "该账户已被封禁，请联系客服"
  }
}
```

**触发条件**: 用户ID包含 `banned` 字符串，或 Authorization header 包含 `banned`

---

## 课程状态场景

### 3. 课程不存在 (COURSE_NOT_FOUND)

请求示例：
```http
GET /api/v1/courses/not-found
```

响应：
```json
{
  "success": false,
  "error": {
    "code": "COURSE_NOT_FOUND",
    "message": "课程不存在或已被删除"
  }
}
```

---

### 4. 课程未发布 (COURSE_NOT_PUBLISHED)

请求示例：
```http
GET /api/v1/courses/course-draft-001
```

响应：
```json
{
  "success": false,
  "error": {
    "code": "COURSE_NOT_PUBLISHED",
    "message": "课程尚未发布"
  }
}
```

---

### 5. 草稿课程 (draft)

**课程ID**: `course-draft-001`

该课程在列表中可见，但详情页返回未发布状态。

---

## 功能限制场景

### 6. 不可收藏的课程

**课程ID**: `course-nofavorite-001`

请求示例：
```http
POST /api/v1/user/favorites
Content-Type: application/json

{
  "courseId": "course-nofavorite-001"
}
```

响应：
```json
{
  "success": false,
  "error": {
    "code": "ACTION_NOT_ALLOWED",
    "message": "VIP课程不支持收藏功能"
  }
}
```

检查收藏状态：
```http
GET /api/v1/user/favorites/course-nofavorite-001
```

响应：
```json
{
  "isFavorited": false,
  "canFavorite": false,
  "message": "VIP课程不支持收藏功能"
}
```

---

### 7. 不可举报的课程

**课程ID**: `course-noreport-001`

请求示例：
```http
POST /api/v1/reports
Content-Type: application/json

{
  "targetType": "course",
  "targetId": "course-noreport-001",
  "reason": "inaccurate",
  "description": "课程信息有误"
}
```

响应：
```json
{
  "success": false,
  "error": {
    "code": "ACTION_NOT_ALLOWED",
    "message": "该课程已通过官方认证，无需举报"
  }
}
```

---

### 8. 暂停咨询的课程

**课程ID**: `course-noinquiry-001`

请求示例：
```http
POST /api/v1/inquiries
Content-Type: application/json

{
  "courseId": "course-noinquiry-001",
  "teacherId": "teacher-001",
  "subject": "courseInfo",
  "message": "想了解课程详情"
}
```

响应：
```json
{
  "success": false,
  "error": {
    "code": "ACTION_NOT_ALLOWED",
    "message": "该课程当前暂停咨询服务，请稍后再试"
  }
}
```

---

### 9. 完全限制互动的课程

**课程ID**: `course-nointeraction-001`

该课程同时限制收藏、咨询和举报功能。

---

## 评论场景

### 10. 评论加载失败

请求示例：
```http
GET /api/v1/reviews?courseId=1&fail=true
```

响应：
```json
{
  "success": false,
  "error": {
    "code": "REVIEW_LOAD_ERROR",
    "message": "评论加载失败，请稍后重试"
  }
}
```

**触发条件**: URL 参数包含 `fail=true`

---

### 11. 无评论内容

请求示例：
```http
GET /api/v1/reviews?courseId=1&empty=true
```

响应：
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 5,
    "total": 0,
    "totalPages": 0
  }
}
```

**触发条件**: URL 参数包含 `empty=true`

---

### 12. 发表评论限流

请求示例：
```http
Authorization: Bearer ratelimit-token
POST /api/v1/reviews
Content-Type: application/json

{
  "teacherId": "teacher-001",
  "overallRating": 5,
  "content": "好评！"
}
```

响应：
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "操作过于频繁，请稍后再试"
  }
}
```

**触发条件**: Authorization header 包含 `ratelimit`

---

## 通用错误响应

### 13. 服务器错误

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "服务器错误，请稍后重试"
  }
}
```

### 14. 未授权

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "请先登录再进行此操作"
  }
}
```

---

## 课程列表状态过滤

请求示例：
```http
GET /api/v1/courses?status=published
GET /api/v1/courses?status=draft
GET /api/v1/courses?status=unpublished
GET /api/v1/courses?includeUnpublished=true
```

---

## 测试账号

| 用户类型 | ID | 邮箱 | 状态 |
|---------|-----|------|------|
| 正常用户 | user-active-001 | active@example.com | active |
| 已删除用户 | user-deleted-001 | deleted@example.com | deleted |
| 已封禁用户 | user-banned-001 | banned@example.com | banned |

---

## 使用方法

### 在组件中测试边缘场景

```typescript
// 测试用户封禁场景
const handleFavorite = async () => {
  // 设置 authorization header 包含 'banned'
  const response = await fetch('/api/v1/user/favorites', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer banned-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ courseId: '1' }),
  });

  const data = await response.json();
  if (!data.success && data.error.code === 'USER_BANNED') {
    // 处理用户被封禁的情况
    showBannedAlert(data.error.message);
  }
};
```

### 在 Storybook 中测试

```typescript
// 在 Story 中模拟错误场景
export const BannedUserFavorite: Story = {
  play: async ({ canvasElement }) => {
    const user = userEvent.setup();

    // 模拟已封禁用户点击收藏
    await user.click(screen.getByRole('button', { name: /收藏/i }));

    // 验证错误提示显示
    await expect(screen.getByText('该账户已被封禁')).toBeInTheDocument();
  },
};
```

---

## 错误代码汇总

| 错误码 | 说明 |
|-------|------|
| `USER_NOT_FOUND` | 用户不存在或已删除 |
| `USER_BANNED` | 用户被封禁 |
| `COURSE_NOT_FOUND` | 课程不存在 |
| `COURSE_NOT_PUBLISHED` | 课程未发布 |
| `ACTION_NOT_ALLOWED` | 操作被限制 |
| `REVIEW_LOAD_ERROR` | 评论加载失败 |
| `RATE_LIMITED` | 操作过于频繁 |
| `INTERNAL_ERROR` | 服务器错误 |
| `UNAUTHORIZED` | 未登录 |
| `INVALID_REQUEST` | 请求参数错误 |
