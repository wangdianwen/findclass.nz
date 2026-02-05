# 评价 API

评价相关接口文档。

---

## GET /api/v1/reviews

获取评价列表，支持按教师或课程筛选。

### 请求

```http
GET /api/v1/reviews?teacherId=660e8400-e29b-41d4-a716-446655440000&courseId=550e8400-e29b-41d4-a716-446655440000&page=1&pageSize=5
```

### 查询参数

| 参数 | 说明 |
|------|------|
| `teacherId` | 教师 GUID |
| `courseId` | 课程 GUID |
| `page` | 页码，默认 1 |
| `pageSize` | 每页数量，默认 5 |

### 成功响应 (200)

```json
{
  "data": [
    {
      "id": "r1",
      "teacherId": "660e8400-e29b-41d4-a716-446655440000",
      "courseId": "550e8400-e29b-41d4-a716-446655440000",
      "studentName": "李同学",
      "rating": 5,
      "content": "老师讲解清晰，收益匪浅！",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 5,
    "total": 15,
    "totalPages": 3
  }
}
```

---

## GET /api/v1/reviews/stats/:teacherId

获取教师评价统计。

### 请求

```http
GET /api/v1/reviews/stats/660e8400-e29b-41d4-a716-446655440000
```

### 成功响应 (200)

```json
{
  "teacherId": "660e8400-e29b-41d4-a716-446655440000",
  "average": 4.8,
  "distribution": {
    "5": 100,
    "4": 20,
    "3": 5,
    "2": 1,
    "1": 0
  },
  "total": 126
}
```

---

## POST /api/v1/reviews

提交评价。

### 请求

```http
POST /api/v1/reviews
Content-Type: application/json

{
  "teacherId": "660e8400-e29b-41d4-a716-446655440000",
  "courseId": "550e8400-e29b-41d4-a716-446655440000",
  "rating": 5,
  "content": "老师讲解清晰，收益匪浅！"
}
```

### 成功响应 (201)

```json
{
  "id": "review-1738680000000",
  "teacherId": "660e8400-e29b-41d4-a716-446655440000",
  "courseId": "550e8400-e29b-41d4-a716-446655440000",
  "rating": 5,
  "content": "老师讲解清晰，收益匪浅！",
  "createdAt": "2024-02-05T12:00:00.000Z"
}
```
