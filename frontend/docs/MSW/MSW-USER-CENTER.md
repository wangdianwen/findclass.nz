# 用户中心 API

用户中心相关接口文档，包括个人资料、孩子管理、学习历史、通知和评论等功能。

---

## 基础信息

- **Base URL**: `/api/v1/user`
- **认证要求**: 所有接口都需要用户登录（Authorization header）

---

## 个人资料

### GET /api/v1/user/profile

获取当前用户资料。

**请求头**:

```
Authorization: Bearer <access_token>
```

**成功响应 (200)**:

```json
{
  "success": true,
  "data": {
    "id": "user-001",
    "email": "user@example.com",
    "name": "测试用户",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=user",
    "role": "student",
    "isTeacher": false,
    "gender": "male",
    "phone": "021-123-4567",
    "wechat": "user123",
    "showEmail": true,
    "showPhone": false,
    "showWechat": true,
    "showRealName": false,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### PUT /api/v1/user/profile

更新用户资料。

**请求头**:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求体**:

```json
{
  "name": "新名称",
  "gender": "male",
  "phone": "021-987-6543",
  "wechat": "newwechat",
  "showEmail": true,
  "showPhone": true
}
```

**成功响应 (200)**:

```json
{
  "success": true,
  "data": {
    "id": "user-001",
    "email": "user@example.com",
    "name": "新名称",
    ...
  },
  "message": "Profile updated successfully"
}
```

---

### PUT /api/v1/user/password

修改密码。

**请求头**:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求体**:

```json
{
  "currentPassword": "123456",
  "newPassword": "newpassword123"
}
```

**成功响应 (200)**:

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**错误响应**:

```json
{
  "success": false,
  "error": {
    "code": "WRONG_PASSWORD",
    "message": "当前密码错误"
  }
}
```

---

### DELETE /api/v1/user/account

删除账户。

**请求头**:

```
Authorization: Bearer <access_token>
```

**成功响应 (200)**:

```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

### POST /api/v1/user/avatar

上传头像。

**请求头**:

```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**请求体** (form-data):

```
avatar: [文件]
```

**成功响应 (200)**:

```json
{
  "success": true,
  "data": {
    "url": "https://api.dicebear.com/7.x/avataaars/svg?seed=123456"
  },
  "message": "Avatar uploaded successfully"
}
```

---

## 孩子管理

### GET /api/v1/user/children

获取孩子列表。

**请求头**:

```
Authorization: Bearer <access_token>
```

**成功响应 (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "child-001",
      "name": "张小明",
      "gender": "male",
      "grade": "secondary-7",
      "gradeLabel": "Year 7"
    },
    {
      "id": "child-002",
      "name": "张小红",
      "gender": "female",
      "grade": "primary-3",
      "gradeLabel": "Year 3"
    }
  ]
}
```

---

### POST /api/v1/user/children

添加孩子。

**请求头**:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**请求体**:

```json
{
  "name": "新孩子",
  "gender": "male",
  "grade": "primary-1"
}
```

**成功响应 (200)**:

```json
{
  "success": true,
  "data": {
    "id": "child-003",
    "name": "新孩子",
    "gender": "male",
    "grade": "primary-1"
  },
  "message": "Child added successfully"
}
```

---

### PUT /api/v1/user/children/:id

更新孩子信息。

**请求头**:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**成功响应 (200)**:

```json
{
  "success": true,
  "data": {
    "id": "child-001",
    "name": "新名称",
    "gender": "male",
    "grade": "secondary-8"
  },
  "message": "Child updated successfully"
}
```

---

### DELETE /api/v1/user/children/:id

删除孩子。

**成功响应 (200)**:

```json
{
  "success": true,
  "message": "Child deleted successfully"
}
```

---

## 学习历史

### GET /api/v1/user/history

获取学习历史。

**成功响应 (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "history-001",
      "courseId": "1",
      "courseTitle": "高中数学提高班",
      "institution": "Auckland Education Center",
      "lastViewedAt": "2026-01-28T10:30:00Z",
      "status": "completed",
      "learnerId": null
    }
  ]
}
```

**状态说明**:
| 值 | 说明 |
|---|------|
| `completed` | 已完成 |
| `in_progress` | 进行中 |
| `not_started` | 未开始 |

---

### DELETE /api/v1/user/history/:id

删除学习历史记录。

**成功响应 (200)**:

```json
{
  "success": true,
  "message": "History item removed successfully"
}
```

---

## 通知

### GET /api/v1/user/notifications

获取通知列表。

**成功响应 (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "notif-001",
      "type": "system",
      "title": "Welcome to FindClass!",
      "content": "Thank you for joining us.",
      "read": false,
      "createdAt": "2026-01-28T09:00:00Z"
    }
  ],
  "unreadCount": 1
}
```

**类型说明**:
| 值 | 说明 |
|---|------|
| `system` | 系统通知 |
| `course` | 课程相关 |
| `promotion` | 促销通知 |
| `reminder` | 提醒通知 |

---

### PUT /api/v1/user/notifications/:id/read

标记通知已读。

**成功响应 (200)**:

```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

### PUT /api/v1/user/notifications/read-all

标记所有通知已读。

**成功响应 (200)**:

```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

### DELETE /api/v1/user/notifications/:id

删除通知。

**成功响应 (200)**:

```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

## 我的评论

### GET /api/v1/user/reviews

获取我的评论列表。

**成功响应 (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "review-user-001",
      "teacherId": "teacher-001",
      "teacherName": "张老师",
      "courseTitle": "高中数学提高班",
      "overallRating": 5,
      "content": "老师讲解非常清晰！",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

### DELETE /api/v1/user/reviews/:id

删除我的评论。

**成功响应 (200)**:

```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

---

## 错误码

| 错误码            | 说明                |
| ----------------- | ------------------- |
| `UNAUTHORIZED`    | 未登录或 token 无效 |
| `INVALID_REQUEST` | 请求参数错误        |
| `WRONG_PASSWORD`  | 当前密码错误        |
