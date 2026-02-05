# 教师 API

教师相关接口文档。

---

## GET /api/v1/tutors

获取教师列表，支持按城市和科目筛选。

### 请求

```http
GET /api/v1/tutors?city=auckland&subject=数学
```

### 查询参数

| 参数 | 值 | 说明 |
|------|-----|------|
| `city` | `auckland`, `wellington`, `christchurch` | 城市 |
| `subject` | `数学`, `英语`, `物理`, `化学`, `编程` | 科目 |

### 成功响应 (200)

```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "张老师",
    "city": "auckland",
    "subject": "数学",
    "rating": 4.8,
    "reviewCount": 128,
    "trustLevel": "S",
    "teachingMode": "线上"
  }
]
```

---

## GET /api/v1/tutors/:id

获取教师详情。

### 请求

```http
GET /api/v1/tutors/660e8400-e29b-41d4-a716-446655440000
```

### 成功响应 (200)

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "name": "张老师",
  "bio": "经验丰富的新西兰注册教师，专注于帮助学生提高成绩。",
  "city": "auckland",
  "subject": "数学",
  "rating": 4.8,
  "reviewCount": 128,
  "trustLevel": "S",
  "teachingMode": "线上",
  "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=张老师",
  "verified": true,
  "teachingYears": 5
}
```

---

## 教师 ID 映射

| 序号 | GUID |
|------|------|
| 1 | `660e8400-e29b-41d4-a716-446655440000` |
| 2 | `660e8400-e29b-41d4-a716-446655440001` |
