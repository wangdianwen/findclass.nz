# 搜索 API

搜索相关接口文档。

---

## GET /api/v1/search/popular

获取热门搜索词。

### 请求

```http
GET /api/v1/search/popular
```

### 成功响应 (200)

```json
["高中数学", "雅思英语", "钢琴辅导", "编程入门", "物理补习"]
```

---

## GET /api/v1/search/suggestions

获取搜索建议。

### 请求

```http
GET /api/v1/search/suggestions?q=数学
```

### 成功响应 (200)

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "高中数学辅导",
    "type": "course",
    "teacherName": "张老师",
    "subject": "数学"
  }
]
```
