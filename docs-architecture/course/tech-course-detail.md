---
title: 技术实现 - 课程详情
category: tech-architecture
created: 2026-01-21
author: linus-torvalds
version: 1.0
phase: 1
priority: P0
status: complete
related_feature: ../../05-product-design/mvp/feature-course-detail.md
---

# 技术实现: 课程详情

> **对应产品文档**: [feature-course-detail.md](../../05-product-design/mvp/feature-course-detail.md) | **优先级**: P0 | **排期**: Phase 1 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                         技术架构层级                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [React/Taro Frontend]                                            │
│         │ 课程详情请求                                               │
│         ▼                                                           │
│   [CloudFront + API Gateway]                                        │
│         │                                                           │
│         ▼                                                           │
│   [Lambda: course-detail]                                           │
│         │                                                           │
│         ├──▶ [DynamoDB: courses]                                    │
│         ├──▶ [DynamoDB: teachers]                                   │
│         ├──▶ [DynamoDB: reviews] (Phase 3)                          │
│         └──▶ [S3: course-images]                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 技术选型

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| **数据库** | DynamoDB | 存储课程详情 |
| **存储** | S3 | 课程图片存储 |
| **CDN** | CloudFront | 图片加速 |
| **翻译** | Google Translate API | 详情页翻译 |

---

## 二、数据库设计

### 2.1 Courses 表 (详情字段)

```typescript
interface CourseDetail {
  // 基本信息 (继承基础字段)
  id: string;
  title: string;
  description: string;
  price: number;
  price_unit: string;
  
  // 详细信息
  subject: string;
  grade: string;
  region: string;
  address: string;
  teaching_mode: 'online' | 'offline' | 'hybrid';
  language: string;
  schedule: string;
  
  // 课程内容
  curriculum: string;           // 课程大纲
  target_audience: string;      // 适合人群
  class_size: string;           // 班级规模
  duration: string;             // 课程时长
  
  // 教师信息
  teacher_id?: string;
  teacher_name: string;
  teacher_bio?: string;
  teacher_avatar?: string;
  
  // 信任信息
  trust_level: 'S' | 'A' | 'B' | 'C' | 'D';
  trust_badges: string[];       // ["平台认证", "来源验证"]
  data_source: string;
  source_verified_at?: string;
  
  // 媒体
  images: string[];             // S3 URLs
  video_intro?: string;         // 介绍视频 URL
  
  // 评价
  rating: number;
  review_count: number;
  
  // 脱敏联系方式
  contact_phone?: string;
  contact_wechat?: string;
  contact_email?: string;
  
  // 元数据
  published_at: string;
  updated_at: string;
  status: 'active' | 'inactive' | 'expired';
}
```

---

## 三、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /courses/:id | 获取课程详情 |
| GET | /courses/:id/similar | 获取相似课程 |
| POST | /courses/:id/favorite | 收藏课程 |
| DELETE | /courses/:id/favorite | 取消收藏 |
| GET | /courses/:id/share | 生成分享链接 |

### 3.2 响应示例

#### GET /courses/:id

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "id": "course-001",
    "title": "高中数学提高班",
    "description": "针对高中数学难点进行针对性辅导...",
    "price": 50,
    "priceUnit": "hour",
    "subject": "数学",
    "grade": "高中",
    "region": "Auckland CBD",
    "address": "123 Queen St",
    "teachingMode": "offline",
    "language": "中文授课",
    "schedule": "周六下午 2:00-4:00",
    "curriculum": "代数、几何、概率统计",
    "targetAudience": "高中10-12年级学生",
    "classSize": "8-12人",
    "duration": "2小时/节",
    "teacher": {
      "id": "teacher-001",
      "name": "张老师",
      "bio": "10年教学经验",
      "avatar": "https://s3.../avatar.jpg"
    },
    "trustLevel": "S",
    "trustBadges": ["平台认证", "来源验证"],
    "images": [
      "https://s3.../course-1.jpg"
    ],
    "rating": 4.9,
    "reviewCount": 128,
    "isFavorite": false,
    "contact": {
      "phone": "显示完整号码",
      "wechat": "findnzclass_001"
    }
  }
}
```

---

## 四、图片处理

### 4.1 图片存储结构

```
s3://findnzclass-assets-${stage}/
├── courses/
│   ├── course-{id}/
│   │   ├── thumbnail_200.jpg
│   │   ├── medium_500.jpg
│   │   ├── large_800.jpg
│   │   └── original.jpg
│   └── ...
└── teachers/
    └── teacher-{id}/
        └── avatar_200.jpg
```

### 4.2 Lambda 图片处理

```yaml
Functions:
  course-image-resize:
    Handler: src/handlers/images/resize.handler
    Timeout: 30s
    Memory: 1024MB
    Environment:
      - ASSETS_BUCKET: ${env:ASSETS_BUCKET}
      - THUMBNAIL_SIZES: "200,500,800"
    Events:
      - s3:
          bucket: !Ref AssetsBucket
          events: s3:ObjectCreated:*
          rules:
            - prefix: courses/
```

---

## 五、前端组件

### 5.1 课程详情组件

```typescript
function CourseDetailPage({ courseId }: { courseId: string }) {
  const { data: course, loading } = useCourseDetail(courseId);
  
  if (loading) return <Skeleton />;
  
  return (
    <div className="course-detail">
      <CourseHeader course={course} />
      <CourseInfo course={course} />
      <TeacherCard teacher={course.teacher} />
      <TrustBadges badges={course.trustBadges} />
      <ContactInfo contact={course.contact} />
    </div>
  );
}

function CourseHeader({ course }: { course: CourseDetail }) {
  return (
    <div className="course-header">
      <ImageGallery images={course.images} />
      <div className="course-title">
        <h1>{course.title}</h1>
        <TrustBadge level={course.trustLevel} />
      </div>
    </div>
  );
}
```

---

## 六、性能优化

### 6.1 缓存策略

| 缓存项 | 位置 | TTL | 说明 |
|--------|------|-----|------|
| 课程详情 | CloudFront | 1小时 | S3 + CloudFront |
| 详情 API | DynamoDB | 5分钟 | Lambda 响应缓存 |
| 图片 | CloudFront | 永久 | 缓存图片文件 |

### 6.2 预加载

```typescript
// 列表页预加载详情
function CourseCard({ course }: { course: Course }) {
  const router = useRouter();
  
  const handleClick = () => {
    // 预加载详情页
    router.prefetch(`/courses/${course.id}`);
    router.push(`/courses/${course.id}`);
  };
  
  return <div onClick={handleClick}>{/* 内容 */}</div>;
}
```

---

## 七、业务逻辑实现

### 3.1 课程详情服务

```typescript
// src/modules/courses/course-detail.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  CourseDetail,
  Course,
  createCourseKey,
  createCourseTeacherIndexKey,
} from './course.types';
import { getItem, putItem, updateItem, queryItems } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache, CacheKeys } from '@shared/db/cache';
import { desensitizeContact } from '@shared/security/desensitization';

export class CourseDetailService {
  /**
   * 获取课程详情
   */
  async getCourseDetail(courseId: string, userId?: string): Promise<CourseDetail | null> {
    // 尝试从缓存获取
    const cacheKey = CacheKeys.course(courseId);
    const cached = await getFromCache<CourseDetail>(cacheKey, 'COURSE');
    if (cached) {
      // 如果有用户ID，检查收藏状态
      if (userId) {
        cached.isFavorite = await this.checkFavorite(courseId, userId);
      }
      return cached;
    }

    // 从DynamoDB获取
    const { PK, SK } = createCourseKey(courseId);
    const course = await getItem<CourseDetail>({ PK, SK });

    if (!course) {
      return null;
    }

    // 获取教师信息
    if (course.teacherId) {
      const teacher = await this.getTeacherInfo(course.teacherId);
      if (teacher) {
        course.teacherName = teacher.name;
        course.teacherBio = teacher.bio;
        course.teacherAvatar = teacher.avatarUrl;
      }
    }

    // 脱敏联系方式
    if (course.contactPhone || course.contactWechat || course.contactEmail) {
      course.contact = desensitizeContact({
        phone: course.contactPhone,
        wechat: course.contactWechat,
        email: course.contactEmail,
      });
      // 清除原始字段
      delete course.contactPhone;
      delete course.contactWechat;
      delete course.contactEmail;
    }

    // 检查收藏状态
    if (userId) {
      course.isFavorite = await this.checkFavorite(courseId, userId);
    }

    // 缓存5分钟
    await setCache(cacheKey, 'COURSE', course, 300);

    return course;
  }

  /**
   * 获取教师信息
   */
  private async getTeacherInfo(teacherId: string): Promise<any | null> {
    const { PK, SK } = createCourseTeacherIndexKey(teacherId);
    return getItem({ PK, SK });
  }

  /**
   * 检查收藏状态
   */
  private async checkFavorite(courseId: string, userId: string): Promise<boolean> {
    const result = await queryItems({
      indexName: 'GSI-UserFavorites',
      keyConditionExpression: 'PK = :pk',
      expressionAttributeValues: {
        ':pk': `USER#${userId}#FAVORITE`,
      },
    });
    return result.items.some((item: any) => item.courseId === courseId);
  }

  /**
   * 更新课程评分
   */
  async updateCourseRating(courseId: string, rating: number, reviewCount: number): Promise<void> {
    await updateItem(
      createCourseKey(courseId),
      'SET rating = :rating, reviewCount = :reviewCount, updatedAt = :now',
      {
        ':rating': rating,
        ':reviewCount': reviewCount,
        ':now': new Date().toISOString(),
      }
    );
    await deleteCache(CacheKeys.course(courseId), 'COURSE');
  }

  /**
   * 获取相似课程
   */
  async getSimilarCourses(courseId: string, limit: number = 4): Promise<Course[]> {
    const course = await this.getCourseDetail(courseId);
    if (!course) return [];

    const result = await queryItems({
      indexName: 'GSI-SubjectGrade',
      keyConditionExpression: 'PK = :pk',
      expressionAttributeValues: {
        ':pk': `SUBJECT#${course.subject}#GRADE#${course.grade}`,
      },
      limit: limit + 1, // 获取多一个以排除自己
    });

    return result.items
      .filter((c: any) => c.id !== courseId)
      .slice(0, limit);
  }
}

export const courseDetailService = new CourseDetailService();
```

### 3.2 收藏服务

```typescript
// src/modules/favorites/favorites.service.ts
import { v4 as uuidv4 } from 'uuid';
import { putItem, deleteItem, queryItems } from '@shared/db/dynamodb';
import { deleteCache, setCache } from '@shared/db/cache';

export class FavoritesService {
  /**
   * 添加收藏
   */
  async addFavorite(userId: string, courseId: string): Promise<void> {
    const now = new Date().toISOString();
    const favoriteId = uuidv4();

    await putItem({
      PK: `USER#${userId}#FAVORITE`,
      SK: `COURSE#${courseId}`,
      entityType: 'FAVORITE',
      dataCategory: 'USER',
      id: favoriteId,
      userId,
      courseId,
      createdAt: now,
    });

    // 清除课程详情缓存
    await deleteCache(`course:${courseId}`, 'COURSE');
  }

  /**
   * 取消收藏
   */
  async removeFavorite(userId: string, courseId: string): Promise<void> {
    await deleteItem({
      PK: `USER#${userId}#FAVORITE`,
      SK: `COURSE#${courseId}`,
    });

    // 清除课程详情缓存
    await deleteCache(`course:${courseId}`, 'COURSE');
  }

  /**
   * 获取用户收藏列表
   */
  async getUserFavorites(userId: string): Promise<string[]> {
    const result = await queryItems({
      keyConditionExpression: 'PK = :pk',
      expressionAttributeValues: {
        ':pk': `USER#${userId}#FAVORITE`,
      },
    });

    return result.items.map((item: any) => item.courseId);
  }
}

export const favoritesService = new FavoritesService();
```

---

## 八、测试用例

### 6.1 单元测试

```typescript
// src/modules/courses/course-detail.service.test.ts
import { courseDetailService } from './course-detail.service';
import { mockGetItem, mockUpdateItem, mockQueryItems } from '../../test/mocks';

describe('CourseDetailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCourseDetail', () => {
    it('CD-HP-01: should return course detail with cached data', async () => {
      // Given
      const courseId = 'course-123';
      const mockCourse = {
        id: courseId,
        title: '高中数学提高班',
        teacherName: '张老师',
        rating: 4.9,
        reviewCount: 128,
      };

      (getFromCache as jest.Mock).mockResolvedValue(mockCourse);

      // When
      const result = await courseDetailService.getCourseDetail(courseId);

      // Then
      expect(result).toEqual(mockCourse);
      expect(getItem).not.toHaveBeenCalled();
    });

    it('CD-HP-02: should fetch from DynamoDB on cache miss', async () => {
      // Given
      const courseId = 'course-123';
      const mockCourse = {
        PK: 'COURSE#course-123',
        SK: 'METADATA',
        id: courseId,
        title: '高中数学提高班',
        contactPhone: '0212345678',
      };

      (getFromCache as jest.Mock).mockResolvedValue(null);
      (getItem as jest.Mock).mockResolvedValue(mockCourse);
      (queryItems as jest.Mock).mockResolvedValue({ items: [] });

      // When
      const result = await courseDetailService.getCourseDetail(courseId);

      // Then
      expect(result).toBeDefined();
      expect(result.id).toBe(courseId);
      expect(result.contact).toBeDefined();
    });

    it('CD-FC-01: should return null for non-existent course', async () => {
      // Given
      (getFromCache as jest.Mock).mockResolvedValue(null);
      (getItem as jest.Mock).mockResolvedValue(null);

      // When
      const result = await courseDetailService.getCourseDetail('non-existent');

      // Then
      expect(result).toBeNull();
    });
  });

  describe('updateCourseRating', () => {
    it('CD-HP-03: should update rating and clear cache', async () => {
      // Given
      const courseId = 'course-123';
      (updateItem as jest.Mock).mockResolvedValue({});
      (deleteCache as jest.Mock).mockResolvedValue({});

      // When
      await courseDetailService.updateCourseRating(courseId, 4.8, 150);

      // Then
      expect(updateItem).toHaveBeenCalled();
      expect(deleteCache).toHaveBeenCalled();
    });
  });

  describe('getSimilarCourses', () => {
    it('CD-HP-04: should return similar courses by subject and grade', async () => {
      // Given
      const courseId = 'course-123';
      const mockCourse = {
        id: courseId,
        subject: '数学',
        grade: '高中',
      };
      const mockSimilarCourses = [
        { id: 'course-456', subject: '数学', grade: '高中' },
        { id: 'course-789', subject: '数学', grade: '高中' },
      ];

      (getFromCache as jest.Mock).mockResolvedValue(mockCourse);
      (getItem as jest.Mock).mockResolvedValue(mockCourse);
      (queryItems as jest.Mock).mockResolvedValue({
        items: [...mockSimilarCourses, mockCourse],
      });

      // When
      const result = await courseDetailService.getSimilarCourses(courseId, 2);

      // Then
      expect(result).toHaveLength(2);
      expect(result[0].id).not.toBe(courseId);
    });
  });
});
```

### 6.2 集成测试用例

> **测试文档**: `06-tech-architecture/course/story-course.md` 中的 US22

```typescript
// tests/integration/courses/us22-course-detail.test.ts

describe('US22: 课程详情页', () => {
  beforeAll(async () => {
    await startTestContainers();
    await createTestTable();
  }, 120000);

  // Happy Path
  it('US22-HP-01: should display complete course information', async () => {
    // 1. 创建测试课程
    const courseId = await createTestCourse({
      title: '高中数学提高班',
      subject: '数学',
      grade: '高中',
      price: 50,
      teacherName: '张老师',
    });

    // 2. 获取课程详情
    const response = await request(app)
      .get(`/api/v1/courses/${courseId}`)
      .expect(200);

    // 3. 验证响应
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(courseId);
    expect(response.body.data.title).toBe('高中数学提高班');
    expect(response.body.data.teacherName).toBe('张老师');
    expect(response.body.data.rating).toBeDefined();
  });

  // Failed Cases
  it('US22-FC-01: should return 404 for non-existent course', async () => {
    const response = await request(app)
      .get('/api/v1/courses/non-existent')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('课程不存在');
  });
});
```

---

## 九、验收标准

- [ ] 课程详情展示完整，信息准确
- [ ] 图片加载正常，支持缩略图
- [ ] 信任标识正确显示
- [ ] 脱敏联系方式正确显示
- [ ] 详情页加载时间 < 1秒
- [ ] 中英文切换正常
- [ ] 移动端适配正常

---

## 十、风险分析

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/mvp/tech-course-detail.md`

**相关文档**:
- [产品设计](../../05-product-design/mvp/feature-course-detail.md)
- [架构总览](architecture-overview.md)
