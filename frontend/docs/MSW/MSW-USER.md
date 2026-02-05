# 用户操作 API

用户相关操作接口文档，包括收藏、咨询、举报等功能。

---

## POST /api/v1/user/favorites

收藏或取消收藏课程。

### 请求

```http
POST /api/v1/user/favorites
Content-Type: application/json

{
  "courseId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 成功响应 (200)

```json
{
  "isFavorited": true,
  "message": "Course added to favorites"
}
```

---

## GET /api/v1/user/favorites

获取收藏列表。

### 请求

```http
GET /api/v1/user/favorites
```

### 成功响应 (200)

```json
{
  "courseIds": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ]
}
```

---

## GET /api/v1/user/favorites/:courseId

检查课程是否已收藏。

### 请求

```http
GET /api/v1/user/favorites/550e8400-e29b-41d4-a716-446655440000
```

### 成功响应 (200)

```json
{
  "isFavorited": true
}
```

---

## POST /api/v1/inquiries

发送咨询消息给教师。

### 请求

```http
POST /api/v1/inquiries
Content-Type: application/json

{
  "courseId": "550e8400-e29b-41d4-a716-446655440000",
  "teacherId": "660e8400-e29b-41d4-a716-446655440000",
  "subject": "courseInfo",
  "message": "我想了解这门课程的详细情况"
}
```

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `courseId` | string | 是 | 课程 ID |
| `teacherId` | string | 是 | 教师 ID |
| `subject` | string | 是 | 咨询主题 (courseInfo/schedule/price/trial/other) |
| `message` | string | 是 | 咨询内容 |

### 成功响应 (200)

```json
{
  "success": true,
  "message": "Inquiry sent successfully",
  "inquiryId": "inquiry-1738752000000"
}
```

---

## POST /api/v1/reports

提交举报。

### 请求

```http
POST /api/v1/reports
Content-Type: application/json

{
  "targetType": "course",
  "targetId": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "inaccurate",
  "description": "课程信息与实际情况不符"
}
```

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `targetType` | string | 是 | 举报类型 (course/teacher/review) |
| `targetId` | string | 是 | 被举报对象 ID |
| `reason` | string | 是 | 举报原因 (inaccurate/misleading/inappropriate/scam/other) |
| `description` | string | 是 | 详细描述 |

### 举报原因说明

| 值 | 说明 |
|---|------|
| `inaccurate` | 信息不准确 |
| `misleading` | 误导性信息 |
| `inappropriate` | 不当内容 |
| `scam` | 欺诈行为 |
| `other` | 其他 |

### 成功响应 (200)

```json
{
  "success": true,
  "message": "Report submitted successfully",
  "reportId": "report-1738752000000"
}
```

---

## 认证要求

除查询类接口外，所有操作类接口都需要用户登录。

**请求头示例：**

```http
Authorization: Bearer <access_token>
```

---

## 边缘场景

### 用户被封禁

当用户被封禁时，所有操作类接口返回 403 错误：

```json
{
  "success": false,
  "error": {
    "code": "USER_BANNED",
    "message": "该账户已被封禁，请联系客服"
  }
}
```

**测试方法**: 使用包含 `banned` 的用户ID或token

### 课程限制操作

某些课程可能限制收藏、咨询或举报功能：

```json
{
  "success": false,
  "error": {
    "code": "ACTION_NOT_ALLOWED",
    "message": "VIP课程不支持收藏功能"
  }
}
```

**测试课程ID**: `course-nofavorite-001` (不可收藏)

完整边缘场景测试文档: [MSW-EDGE-CASES.md](./MSW-EDGE-CASES.md)
