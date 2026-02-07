# 课程 API

课程相关接口文档。

---

## GET /api/v1/courses

获取课程列表，支持筛选和分页。

### 请求

```http
GET /api/v1/courses?city=auckland&subject=数学&page=1&limit=20
```

### 查询参数

| 参数      | 值                                       | 说明     |
| --------- | ---------------------------------------- | -------- |
| `city`    | `auckland`, `wellington`, `christchurch` | 城市     |
| `subject` | `数学`, `英语`, `物理`, `化学`, `编程`   | 科目     |
| `grade`   | `小学`, `初中`, `高中`, `大学`           | 年级     |
| `region`  | `中区`, `东区`, `西区`, `北岸`           | 地区     |
| `page`    | `1`, `2`, ...                            | 页码     |
| `limit`   | `10`, `20`, `50`                         | 每页数量 |

### 成功响应 (200)

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "slug": "gao-zhong-shu-xue-fu-dao",
      "title": "高中数学辅导",
      "teacherName": "张老师",
      "city": "auckland",
      "subject": "数学",
      "grade": "高中",
      "price": 50,
      "rating": 4.8,
      "reviewCount": 128,
      "trustLevel": "S",
      "teachingMode": "线上",
      "region": "中区"
    }
  ],
  "total": 15
}
```

---

## GET /api/v1/courses/featured

获取精选课程。

### 请求

```http
GET /api/v1/courses/featured?limit=6
```

### 成功响应 (200)

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "slug": "gao-zhong-shu-xue-fu-dao",
    "title": "高中数学辅导",
    "teacherName": "张老师",
    "city": "auckland",
    "subject": "数学",
    "grade": "高中",
    "price": 50,
    "rating": 4.8,
    "reviewCount": 128,
    "trustLevel": "S",
    "teachingMode": "线上",
    "region": "中区"
  }
]
```

---

## GET /api/v1/courses/:id

获取课程详情。

### 请求

```http
GET /api/v1/courses/550e8400-e29b-41d4-a716-446655440000
```

### 成功响应 (200)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "gao-zhong-shu-xue-fu-dao",
  "title": "高中数学辅导",
  "teacherName": "张老师",
  "city": "auckland",
  "subject": "数学",
  "grade": "高中",
  "price": 50,
  "rating": 4.8,
  "reviewCount": 128,
  "trustLevel": "S",
  "teachingMode": "线上",
  "region": "中区",
  "description": "高中数学辅导课程",
  "teacher": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "张老师",
    "bio": "经验丰富的新西兰注册教师",
    "rating": 4.8,
    "reviewCount": 128,
    "teachingYears": 5,
    "verified": true
  },
  "pricing": {
    "perLesson": 50,
    "package": [
      { "name": "5节套餐", "lessons": 5, "totalPrice": 225 },
      { "name": "10节套餐", "lessons": 10, "totalPrice": 400 }
    ]
  },
  "schedule": {
    "weekdays": ["周一", "周三", "周五"],
    "timeSlots": ["10:00-12:00", "14:00-16:00"]
  },
  "images": ["https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800"],
  "reviewStats": {
    "average": 4.8,
    "distribution": { "5": 100, "4": 20, "3": 5, "2": 1, "1": 0 },
    "total": 126
  }
}
```

### 失败场景 (课程不存在)

```http
GET /api/v1/courses/99999999-9999-9999-9999-999999999999
```

**失败响应 (404):**

```json
{
  "message": "Course not found"
}
```

---

## GET /api/v1/courses/search

搜索课程。

### 请求

```http
GET /api/v1/courses/search?q=数学
```

### 成功响应 (200)

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "slug": "gao-zhong-shu-xue-fu-dao",
    "title": "高中数学辅导",
    "teacherName": "张老师",
    "city": "auckland",
    "subject": "数学",
    "grade": "高中",
    "price": 50,
    "rating": 4.8,
    "reviewCount": 128,
    "trustLevel": "S",
    "teachingMode": "线上",
    "region": "中区"
  }
]
```

---

## GET /api/v1/courses/filter/options

获取筛选选项。

### 请求

```http
GET /api/v1/courses/filter/options
```

### 成功响应 (200)

```json
{
  "subjects": ["数学", "英语", "物理", "化学", "编程"],
  "grades": ["小学", "初中", "高中", "大学"],
  "cities": ["auckland", "wellington", "christchurch"],
  "teachingModes": ["线上", "线下", "上门"]
}
```

---

## GET /api/v1/courses/regions/:city

获取城市下的地区列表。

### 请求

```http
GET /api/v1/courses/regions/auckland
```

### 成功响应 (200)

```json
["中区", "东区", "西区", "北岸"]
```

---

## 课程 ID 映射

| 序号 | GUID                                   | 示例标题     |
| ---- | -------------------------------------- | ------------ |
| 1    | `550e8400-e29b-41d4-a716-446655440000` | 高中数学辅导 |
| 2    | `550e8400-e29b-41d4-a716-446655440001` | 雅思英语强化 |
| 3    | `550e8400-e29b-41d4-a716-446655440002` | 物理补习     |
| 4    | `550e8400-e29b-41d4-a716-446655440003` | 化学辅导     |
| 5    | `550e8400-e29b-41d4-a716-446655440004` | 编程入门     |
| 6    | `550e8400-e29b-41d4-a716-446655440005` | 钢琴辅导     |
