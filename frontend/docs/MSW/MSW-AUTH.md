# 认证 API

认证相关接口文档。

---

## POST /api/v1/auth/login

### 请求

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}
```

### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "accessToken": "mock-access-token-1738680000000",
    "refreshToken": "mock-refresh-token-1738680000000",
    "expiresIn": 86400,
    "tokenType": "Bearer"
  },
  "message": "登录成功"
}
```

### 失败场景 (验证码错误)

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "any@example.com",
  "code": "000000"
}
```

**失败响应 (400):**

```json
{
  "success": false,
  "message": "验证码错误"
}
```

---

## POST /api/v1/auth/register

### 请求

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "Password123",
  "code": "123456"
}
```

### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "accessToken": "mock-access-token-1738680000000",
    "refreshToken": "mock-refresh-token-1738680000000",
    "expiresIn": 86400,
    "tokenType": "Bearer"
  },
  "message": "注册成功"
}
```

### 失败场景 (邮箱已注册)

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "existing@example.com",
  "password": "Password123",
  "code": "123456"
}
```

**失败响应 (409):**

```json
{
  "success": false,
  "message": "该邮箱已被注册"
}
```

---

## POST /api/v1/auth/refresh

### 请求

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "mock-refresh-token-1738680000000"
}
```

### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "accessToken": "mock-access-token-new-1738680000000",
    "expiresIn": 86400,
    "tokenType": "Bearer"
  }
}
```

### 失败场景 (无效 refresh token)

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "invalid-token"
}
```

**失败响应 (401):**

```json
{
  "success": false,
  "message": "无效的刷新令牌"
}
```

---

## POST /api/v1/auth/reset-password

### 请求

```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "NewPassword123",
  "code": "123456"
}
```

### 成功响应 (200)

```json
{
  "success": true,
  "message": "密码重置成功"
}
```

### 失败场景 (验证码错误)

```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "NewPassword123",
  "code": "000000"
}
```

**失败响应 (400):**

```json
{
  "success": false,
  "message": "验证码错误"
}
```

---

## POST /api/v1/auth/send-code

### 请求

```http
POST /api/v1/auth/send-code
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### 成功响应 (200)

```json
{
  "success": true,
  "message": "验证码已发送"
}
```

### 失败场景 (发送频率限制)

```http
POST /api/v1/auth/send-code
Content-Type: application/json

{
  "email": "ratelimit@example.com"
}
```

**失败响应 (429):**

```json
{
  "success": false,
  "message": "发送过于频繁，请稍后再试"
}
```

---

## GET /api/v1/auth/me

获取当前登录用户信息，包含教师信息（如果是教师用户）。

### 请求

```http
GET /api/v1/auth/me
Authorization: Bearer mock-access-token-xxx
```

### 成功响应 (200) - 学生用户

```json
{
  "success": true,
  "data": {
    "id": "user-002",
    "email": "user@example.com",
    "name": "测试用户",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=user",
    "role": "student",
    "isTeacher": false,
    "teacherInfo": null,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 成功响应 (200) - 教师用户

```json
{
  "success": true,
  "data": {
    "id": "user-001",
    "email": "teacher@example.com",
    "name": "张老师",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=teacher",
    "role": "teacher",
    "isTeacher": true,
    "teacherInfo": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "bio": "经验丰富的新西兰注册教师，专注于帮助学生提高成绩。",
      "teachingYears": 5,
      "verified": true,
      "rating": 4.8,
      "reviewCount": 128,
      "subjects": ["数学", "物理"],
      "teachingModes": ["线上", "线下"],
      "studentsCount": 50,
      "coursesCount": 6
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 失败场景 (未登录)

```http
GET /api/v1/auth/me
```

**失败响应 (401):**

```json
{
  "success": false,
  "message": "未登录"
}
```

### 测试说明

Mock 中通过 token 内容判断用户角色：
- Token 包含 `teacher` → 返回教师用户
- 其他 → 返回学生用户
