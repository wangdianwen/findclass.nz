---
title: 技术实现 - 课程管理
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 2
priority: P0
status: complete
related_feature: ../../05-product-design/course/course-management.md
---

# 技术实现: 课程管理

> **对应产品文档**: [course-management.md](../../05-product-design/course/course-management.md) | **优先级**: P0 | **排期**: Phase 2 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      课程管理技术架构                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   └── 微信小程序 (Taro)                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── GET /api/v1/courses                                           │
│   ├── POST /api/v1/courses                                          │
│   ├── PUT /api/v1/courses/:id                                       │
│   ├── PUT /api/v1/courses/:id/status                                │
│   ├── DELETE /api/v1/courses/:id                                    │
│   └── POST /api/v1/courses/:id/images                               │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── CourseService (课程CRUD)                                      │
│   ├── CourseImageService (图片管理)                                  │
│   ├── CourseApprovalService (审核服务)                               │
│   └── CourseStatisticsService (统计服务)                             │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   └── DynamoDB (FindClass-MainTable)                                │
│       ├── COURSE#{courseId}                                        │
│       ├── COURSE#{courseId}#IMAGES                                 │
│       ├── COURSE#{courseId}#REVIEWS                                │
│       ├── USER#{userId}#COURSES                                    │
│       └── APPROVAL#{approvalId}                                     │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [外部服务]                                                         │
│   ├── S3 (图片存储)                                                  │
│   └── CloudFront (CDN)                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/courses/
├── course-management.types.ts     # 类型定义
├── course-management.service.ts   # 课程服务
├── course-management.controller.ts # API 控制器
├── course-management.routes.ts    # 路由配置
└── course-management.test.ts      # 测试文件

07-backend/src/modules/course-images/
├── course-images.types.ts         # 图片类型
├── course-images.service.ts       # 图片服务
└── course-images.handler.ts       # S3 触发器

06-frontend/src/pages/courses/
├── CourseListPage.tsx             # 课程列表
├── CourseCreatePage.tsx           # 创建课程
├── CourseEditPage.tsx             # 编辑课程
└── CourseApprovalPage.tsx         # 审核页面
```

---

## 二、数据模型 (DynamoDB)

```typescript
// src/modules/courses/course-management.types.ts

/**
 * 课程状态
 */
export enum CourseStatus {
  DRAFT = 'draft',             // 草稿
  PENDING = 'pending',         // 待审核
  PUBLISHED = 'published',     // 已发布
  UNPUBLISHED = 'unpublished', // 已下架
  SUSPENDED = 'suspended',     // 已停售
  DELETED = 'deleted',         // 已删除
}

/**
 * 授课方式
 */
export enum TeachingMode {
  ONLINE = 'online',           // 线上
  OFFLINE = 'offline',         // 线下
  HYBRID = 'hybrid',           // 混合
}

/**
 * 价格单位
 */
export enum PriceUnit {
  HOUR = 'hour',               // 小时
  LESSON = 'lesson',           // 节课
  MONTH = 'month',             // 月
}

/**
 * 课程分类
 */
export interface CourseCategory {
  id: string;
  name: string;
  nameEn: string;
  parentId?: string;
  level: number;
  sortOrder: number;
  icon?: string;
  active: boolean;
}

/**
 * 课程 DynamoDB 类型
 */
export interface Course {
  PK: string;                  // COURSE#{courseId}
  SK: string;                  // METADATA
  entityType: 'COURSE';
  dataCategory: 'COURSE';
  id: string;
  teacherId: string;
  institutionId?: string;      // 机构发布的课程

  // 基本信息
  title: string;
  titleEn: string;
  subtitle?: string;
  subtitleEn?: string;
  category: string;
  subCategory?: string;
  grades: string[];

  // 价格信息
  price: number;
  priceUnit: PriceUnit;
  originalPrice?: number;

  // 课程详情
  description: string;
  descriptionEn: string;
  teachingGoals?: string;
  targetAudience?: string;

  // 上课安排
  teachingMode: TeachingMode;
  address?: string;
  city: string;
  timeSlots: string[];         // ['周六14:00-16:00']
  duration: number;            // 单次时长（分钟）

  // 媒体信息
  coverImage: string;
  coverImageEn?: string;
  detailImages?: string[];

  // 状态管理
  status: CourseStatus;
  publishedAt?: string;
  unpublishedAt?: string;
  suspendedAt?: string;
  deletedAt?: string;

  // 信任信息
  trustLevel: string;          // A, B, C
  sourceType: 'first_party' | 'third_party';

  // 统计信息
  viewCount: number;
  favoriteCount: number;
  inquiryCount: number;
  enrollmentCount: number;

  // 审核信息
  reviewed: boolean;
  reviewedAt?: string;
  reviewNotes?: string;

  // 标签
  tags?: string[];
  subjects?: string[];

  // 时间戳
  createdAt: string;
  updatedAt: string;

  // GSI 索引
  GSI1PK?: string;             // TEACHER#{teacherId}
  GSI1SK?: string;             // STATUS#{status}
  GSI2PK?: string;             // CATEGORY#{category}
  GSI2SK?: string;             // CREATED_AT#{createdAt}
  GSI3PK?: string;             // CITY#{city}
  GSI3SK?: string;             // PUBLISHED_AT#{publishedAt}
  GSI4PK?: string;             // STATUS#{status}
  GSI4SK?: string;             // UPDATED_AT#{updatedAt}
}

/**
 * 课程版本记录（支持历史记录）
 */
export interface CourseVersion {
  PK: string;                  // COURSE#{courseId}
  SK: string;                  // VERSION#{version}
  entityType: 'COURSE_VERSION';
  dataCategory: 'COURSE';
  id: string;
  courseId: string;
  version: number;
  dataSnapshot: Course;
  changeNote?: string;
  createdAt: string;
  createdBy: string;
}

/**
 * 课程收藏
 */
export interface CourseFavorite {
  PK: string;                  // USER#{userId}
  SK: string;                  // FAVORITE#{courseId}
  entityType: 'COURSE_FAVORITE';
  dataCategory: 'COURSE';
  id: string;
  userId: string;
  courseId: string;
  createdAt: string;

  GSI5PK?: string;             // COURSE#{courseId}
  GSI5SK?: string;             // USER#{userId}
}

/**
 * 课程浏览记录
 */
export interface CourseView {
  PK: string;                  // COURSE#{courseId}
  SK: string;                  // VIEW#{viewId}
  entityType: 'COURSE_VIEW';
  dataCategory: 'COURSE';
  id: string;
  courseId: string;
  userId?: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  viewDuration?: number;       // 浏览时长（秒）
  createdAt: string;
}

/**
 * 课程查询参数
 */
export interface CourseQueryParams {
  teacherId?: string;
  institutionId?: string;
  status?: CourseStatus;
  category?: string;
  city?: string;
  keyword?: string;
  minPrice?: number;
  maxPrice?: number;
  teachingMode?: TeachingMode;
  grades?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'publishedAt' | 'price' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 课程统计
 */
export interface CourseStats {
  courseId: string;
  totalViews: number;
  uniqueViewers: number;
  totalFavorites: number;
  totalInquiries: number;
  totalEnrollments: number;
  averageViewDuration: number;
  conversionRate: number;
  periodStart: string;
  periodEnd: string;
  updatedAt: string;
}
```

---

## 三、辅助函数

```typescript
// src/modules/courses/course-management.helpers.ts
import { v4 as uuidv4 } from 'uuid';
import {
  Course,
  CourseVersion,
  CourseFavorite,
  CourseView,
  CourseStatus,
  createCourseKey,
  createCourseVersionKey,
  createUserFavoriteKey,
} from './course-management.types';

export function createCourseKey(courseId: string): { PK: string; SK: string } {
  return {
    PK: `COURSE#${courseId}`,
    SK: 'METADATA',
  };
}

export function createCourseVersionKey(
  courseId: string,
  version: number
): { PK: string; SK: string } {
  return {
    PK: `COURSE#${courseId}`,
    SK: `VERSION#${version}`,
  };
}

export function createUserFavoritesKey(userId: string): { PK: string; SK: string } {
  return {
    PK: `USER#${userId}`,
    SK: 'FAVORITES',
  };
}

export function createFavoriteItemKey(
  userId: string,
  courseId: string
): { PK: string; SK: string } {
  return {
    PK: `USER#${userId}`,
    SK: `FAVORITE#${courseId}`,
  };
}

export function createTeacherCoursesIndexKey(
  teacherId: string
): { GSI1PK: string; GSI1SK: string } {
  return {
    GSI1PK: `TEACHER#${teacherId}`,
    GSI1SK: `STATUS#`,
  };
}

export function createCategoryIndexKey(
  category: string
): { GSI2PK: string; GSI2SK: string } {
  const now = new Date().toISOString();
  return {
    GSI2PK: `CATEGORY#${category}`,
    GSI2SK: `CREATED_AT#${now}`,
  };
}

export function getNextVersion(versions: CourseVersion[]): number {
  if (versions.length === 0) return 1;
  return Math.max(...versions.map((v) => v.version)) + 1;
}

export function shouldPublishImmediately(status: CourseStatus): boolean {
  return status === CourseStatus.PUBLISHED;
}
```

---

## 四、业务逻辑

```typescript
// src/modules/courses/course-management.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  Course,
  CourseVersion,
  CourseFavorite,
  CourseView,
  CourseStats,
  CourseStatus,
  TeachingMode,
  PriceUnit,
  CourseQueryParams,
  createCourseKey,
  createCourseVersionKey,
  createFavoriteItemKey,
  createTeacherCoursesIndexKey,
  createCategoryIndexKey,
  getNextVersion,
} from './course-management.types';
import { 
  putItem, 
  getItem, 
  queryItems, 
  updateItem, 
  deleteItem,
  batchGetItems 
} from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache, incrementCache } from '@shared/db/cache';

export interface CreateCourseInput {
  teacherId: string;
  institutionId?: string;
  title: string;
  subtitle?: string;
  category: string;
  subCategory?: string;
  grades: string[];
  price: number;
  priceUnit: PriceUnit;
  originalPrice?: number;
  description: string;
  teachingGoals?: string;
  targetAudience?: string;
  teachingMode: TeachingMode;
  address?: string;
  city: string;
  timeSlots: string[];
  duration: number;
  coverImage: string;
  detailImages?: string[];
  tags?: string[];
}

export interface UpdateCourseInput {
  title?: string;
  subtitle?: string;
  category?: string;
  subCategory?: string;
  grades?: string[];
  price?: number;
  priceUnit?: PriceUnit;
  originalPrice?: number;
  description?: string;
  teachingGoals?: string;
  targetAudience?: string;
  teachingMode?: TeachingMode;
  address?: string;
  city?: string;
  timeSlots?: string[];
  duration?: number;
  coverImage?: string;
  detailImages?: string[];
  tags?: string[];
}

export class CourseManagementService {
  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * 创建课程
   */
  async createCourse(
    teacherId: string,
    input: CreateCourseInput
  ): Promise<Course> {
    const now = new Date().toISOString();
    const courseId = uuidv4();

    const course: Course = {
      ...createCourseKey(courseId),
      entityType: 'COURSE',
      dataCategory: 'COURSE',
      id: courseId,
      teacherId,
      institutionId: input.institutionId,
      title: input.title,
      titleEn: input.title,
      subtitle: input.subtitle,
      subtitleEn: input.subtitle,
      category: input.category,
      subCategory: input.subCategory,
      grades: input.grades,
      price: input.price,
      priceUnit: input.priceUnit,
      originalPrice: input.originalPrice,
      description: input.description,
      descriptionEn: input.description,
      teachingGoals: input.teachingGoals,
      targetAudience: input.targetAudience,
      teachingMode: input.teachingMode,
      address: input.address,
      city: input.city,
      timeSlots: input.timeSlots,
      duration: input.duration,
      coverImage: input.coverImage,
      detailImages: input.detailImages,
      status: CourseStatus.DRAFT,
      trustLevel: 'A',
      sourceType: input.institutionId ? 'third_party' : 'first_party',
      viewCount: 0,
      favoriteCount: 0,
      inquiryCount: 0,
      enrollmentCount: 0,
      reviewed: false,
      tags: input.tags,
      createdAt: now,
      updatedAt: now,
      ...createTeacherCoursesIndexKey(teacherId),
      ...createCategoryIndexKey(input.category),
    };

    await putItem(course);

    // 清除教师课程列表缓存
    await deleteCache(`teacher:${teacherId}:courses`);

    logger.info('Course created', { courseId, teacherId });

    return course;
  }

  /**
   * 获取课程详情
   */
  async getCourse(courseId: string): Promise<Course | null> {
    const cacheKey = `course:${courseId}`;
    const cached = await getFromCache<Course>(cacheKey);
    if (cached) return cached;

    const { PK, SK } = createCourseKey(courseId);
    const course = await getItem<Course>({ PK, SK });

    if (course) {
      await setCache(cacheKey, course, this.CACHE_TTL);
    }

    return course;
  }

  /**
   * 更新课程
   */
  async updateCourse(
    courseId: string,
    userId: string,
    input: UpdateCourseInput,
    createVersion: boolean = true
  ): Promise<Course> {
    const course = await this.getCourse(courseId);
    if (!course) {
      throw new Error('课程不存在');
    }

    if (course.teacherId !== userId) {
      throw new Error('无权修改此课程');
    }

    if (course.status === CourseStatus.DELETED) {
      throw new Error('课程已删除');
    }

    // 创建版本记录（如果需要）
    if (createVersion) {
      await this.createVersionRecord(course, userId);
    }

    const now = new Date().toISOString();
    const updated: Course = {
      ...course,
      ...input,
      titleEn: input.title || course.title,
      descriptionEn: input.description || course.description,
      updatedAt: now,
    };

    await putItem(updated);

    // 清除缓存
    await deleteCache(`course:${courseId}`);
    await deleteCache(`teacher:${course.teacherId}:courses`);

    logger.info('Course updated', { courseId });

    return updated;
  }

  /**
   * 创建版本记录
   */
  private async createVersionRecord(
    course: Course,
    userId: string
  ): Promise<void> {
    const versions = await this.getCourseVersions(course.id);
    const nextVersion = getNextVersion(versions);

    const versionRecord: CourseVersion = {
      ...createCourseVersionKey(course.id, nextVersion),
      entityType: 'COURSE_VERSION',
      dataCategory: 'COURSE',
      id: uuidv4(),
      courseId: course.id,
      version: nextVersion,
      dataSnapshot: { ...course },
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    await putItem(versionRecord);
  }

  /**
   * 获取课程版本历史
   */
  async getCourseVersions(courseId: string): Promise<CourseVersion[]> {
    const result = await queryItems<CourseVersion>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': `COURSE#${courseId}`,
        ':sk': 'VERSION#',
      },
      scanIndexForward: false,
      limit: 50,
    });
    return result.items;
  }

  /**
   * 发布课程
   */
  async publishCourse(courseId: string, userId: string): Promise<Course> {
    const course = await this.getCourse(courseId);
    if (!course) {
      throw new Error('课程不存在');
    }

    if (course.teacherId !== userId) {
      throw new Error('无权操作此课程');
    }

    if (course.status !== CourseStatus.DRAFT && course.status !== CourseStatus.UNPUBLISHED) {
      throw new Error('只有草稿或已下架的课程可以发布');
    }

    const now = new Date().toISOString();
    const updated: Course = {
      ...course,
      status: CourseStatus.PUBLISHED,
      publishedAt: now,
      updatedAt: now,
      GSI4PK: `STATUS#${CourseStatus.PUBLISHED}`,
      GSI4SK: `UPDATED_AT#${now}`,
    };

    await putItem(updated);

    // 清除缓存
    await deleteCache(`course:${courseId}`);
    await deleteCache(`teacher:${course.teacherId}:courses`);

    // 同步到搜索索引
    await this.syncToSearchIndex(courseId);

    logger.info('Course published', { courseId });

    return updated;
  }

  /**
   * 下架课程
   */
  async unpublishCourse(courseId: string, userId: string): Promise<Course> {
    const course = await this.getCourse(courseId);
    if (!course) {
      throw new Error('课程不存在');
    }

    if (course.teacherId !== userId) {
      throw new Error('无权操作此课程');
    }

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new Error('只有已发布的课程可以下架');
    }

    const now = new Date().toISOString();
    const updated: Course = {
      ...course,
      status: CourseStatus.UNPUBLISHED,
      unpublishedAt: now,
      updatedAt: now,
      GSI4PK: `STATUS#${CourseStatus.UNPUBLISHED}`,
      GSI4SK: `UPDATED_AT#${now}`,
    };

    await putItem(updated);

    // 清除缓存
    await deleteCache(`course:${courseId}`);
    await deleteCache(`teacher:${course.teacherId}:courses`);

    // 从搜索索引移除
    await this.removeFromSearchIndex(courseId);

    logger.info('Course unpublished', { courseId });

    return updated;
  }

  /**
   * 删除课程（软删除）
   */
  async deleteCourse(courseId: string, userId: string): Promise<void> {
    const course = await this.getCourse(courseId);
    if (!course) {
      throw new Error('课程不存在');
    }

    if (course.teacherId !== userId) {
      throw new Error('无权删除此课程');
    }

    const now = new Date().toISOString();
    
    await updateItem(
      createCourseKey(courseId),
      'SET #status = :status, deletedAt = :deletedAt, updatedAt = :now',
      {
        ':status': CourseStatus.DELETED,
        ':deletedAt': now,
        ':now': now,
      },
      { '#status': 'status' }
    );

    // 清除缓存
    await deleteCache(`course:${courseId}`);
    await deleteCache(`teacher:${course.teacherId}:courses`);

    logger.info('Course deleted', { courseId });
  }

  /**
   * 获取教师的课程列表
   */
  async getTeacherCourses(
    teacherId: string,
    params: {
      status?: CourseStatus;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ courses: Course[]; pagination: any }> {
    const { status, page = 1, limit = 20 } = params;

    const cacheKey = `teacher:${teacherId}:courses:${status || 'all'}:${page}`;
    const cached = await getFromCache<{ courses: Course[]; pagination: any }>(cacheKey);
    if (cached) return cached;

    let keyCondition = 'GSI1PK = :pk';
    const exprValues: Record<string, any> = {
      ':pk': `TEACHER#${teacherId}`,
    };

    if (status) {
      keyCondition += ' AND begins_with(GSI1SK, :status)';
      exprValues[':status'] = `STATUS#${status}`;
    }

    const result = await queryItems<Course>({
      indexName: 'GSI1-TeacherCourses',
      keyConditionExpression: keyCondition,
      expressionAttributeValues: exprValues,
      limit: limit * 2,
      scanIndexForward: false,
    });

    const startIndex = (page - 1) * limit;
    const paginatedItems = result.items.slice(startIndex, startIndex + limit);

    const response = {
      courses: paginatedItems,
      pagination: {
        page,
        limit,
        total: result.items.length,
        totalPages: Math.ceil(result.items.length / limit),
      },
    };

    await setCache(cacheKey, response, this.CACHE_TTL);
    return response;
  }

  /**
   * 搜索课程
   */
  async searchCourses(
    params: CourseQueryParams
  ): Promise<{ courses: Course[]; pagination: any }> {
    const {
      category,
      city,
      keyword,
      minPrice,
      maxPrice,
      teachingMode,
      grades,
      page = 1,
      limit = 20,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
    } = params;

    // 首先按类别或城市查询
    let result;
    if (category) {
      result = await queryItems<Course>({
        indexName: 'GSI2-CategoryIndex',
        keyConditionExpression: 'GSI2PK = :pk',
        expressionAttributeValues: {
          ':pk': `CATEGORY#${category}`,
        },
        limit: limit * 3,
        scanIndexForward: sortOrder === 'asc',
      });
    } else if (city) {
      result = await queryItems<Course>({
        indexName: 'GSI3-CityIndex',
        keyConditionExpression: 'GSI3PK = :pk',
        expressionAttributeValues: {
          ':pk': `CITY#${city}`,
        },
        limit: limit * 3,
        scanIndexForward: sortOrder === 'asc',
      });
    } else {
      // 默认查询所有已发布课程
      result = await queryItems<Course>({
        indexName: 'GSI4-StatusIndex',
        keyConditionExpression: 'GSI4PK = :pk',
        expressionAttributeValues: {
          ':pk': `STATUS#${CourseStatus.PUBLISHED}`,
        },
        limit: limit * 3,
        scanIndexForward: sortOrder === 'asc',
      });
    }

    // 过滤结果
    let filtered = result.items.filter((course) => course.status === CourseStatus.PUBLISHED);

    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(
        (course) =>
          course.title.toLowerCase().includes(kw) ||
          course.description.toLowerCase().includes(kw)
      );
    }

    if (minPrice !== undefined) {
      filtered = filtered.filter((course) => course.price >= minPrice);
    }

    if (maxPrice !== undefined) {
      filtered = filtered.filter((course) => course.price <= maxPrice);
    }

    if (teachingMode) {
      filtered = filtered.filter((course) => course.teachingMode === teachingMode);
    }

    if (grades && grades.length > 0) {
      filtered = filtered.filter((course) =>
        course.grades.some((g) => grades.includes(g))
      );
    }

    // 排序
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'publishedAt':
          comparison = (a.publishedAt ? new Date(a.publishedAt).getTime() : 0) - 
                       (b.publishedAt ? new Date(b.publishedAt).getTime() : 0);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'viewCount':
          comparison = a.viewCount - b.viewCount;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // 分页
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    return {
      courses: paginatedItems,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  }

  /**
   * 收藏课程
   */
  async favoriteCourse(userId: string, courseId: string): Promise<CourseFavorite> {
    const course = await this.getCourse(courseId);
    if (!course) {
      throw new Error('课程不存在');
    }

    // 检查是否已收藏
    const existing = await this.getFavorite(userId, courseId);
    if (existing) {
      throw new Error('已经收藏过此课程');
    }

    const now = new Date().toISOString();
    const favorite: CourseFavorite = {
      PK: `USER#${userId}`,
      SK: `FAVORITE#${courseId}`,
      entityType: 'COURSE_FAVORITE',
      dataCategory: 'COURSE',
      id: uuidv4(),
      userId,
      courseId,
      createdAt: now,
      GSI5PK: `COURSE#${courseId}`,
      GSI5SK: `USER#${userId}`,
    };

    await putItem(favorite);

    // 更新课程收藏数
    await updateItem(
      createCourseKey(courseId),
      'SET favoriteCount = favoriteCount + :inc, updatedAt = :now',
      { ':inc': 1, ':now': now }
    );

    logger.info('Course favorited', { userId, courseId });

    return favorite;
  }

  /**
   * 取消收藏
   */
  async unfavoriteCourse(userId: string, courseId: string): Promise<void> {
    await deleteItem(createFavoriteItemKey(userId, courseId));

    // 更新课程收藏数
    await updateItem(
      createCourseKey(courseId),
      'SET favoriteCount = favoriteCount - :dec, updatedAt = :now',
      { ':dec': 1, ':now': new Date().toISOString() }
    );

    logger.info('Course unfavorited', { userId, courseId });
  }

  /**
   * 获取用户收藏
   */
  async getFavorite(
    userId: string,
    courseId: string
  ): Promise<CourseFavorite | null> {
    const { PK, SK } = createFavoriteItemKey(userId, courseId);
    return getItem<CourseFavorite>({ PK, SK });
  }

  /**
   * 获取用户的收藏列表
   */
  async getUserFavorites(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ courses: Course[]; pagination: any }> {
    const result = await queryItems<CourseFavorite>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'FAVORITE#',
      },
      limit: limit * 2,
      scanIndexForward: false,
    });

    // 批量获取课程详情
    const courseIds = result.items.map((f) => f.courseId);
    const courses = await Promise.all(
      courseIds.map((id) => this.getCourse(id))
    );

    const validCourses = courses.filter((c): c is Course => c !== null);

    return {
      courses: validCourses,
      pagination: {
        page,
        limit,
        total: result.items.length,
        totalPages: Math.ceil(result.items.length / limit),
      },
    };
  }

  /**
   * 记录课程浏览
   */
  async recordView(
    courseId: string,
    view: {
      userId?: string;
      sessionId: string;
      ipAddress?: string;
      userAgent?: string;
      referrer?: string;
    }
  ): Promise<void> {
    const viewId = uuidv4();
    const viewRecord: CourseView = {
      PK: `COURSE#${courseId}`,
      SK: `VIEW#${viewId}`,
      entityType: 'COURSE_VIEW',
      dataCategory: 'COURSE',
      id: viewId,
      courseId,
      userId: view.userId,
      sessionId: view.sessionId,
      ipAddress: view.ipAddress,
      userAgent: view.userAgent,
      referrer: view.referrer,
      createdAt: new Date().toISOString(),
    };

    await putItem(viewRecord);

    // 更新浏览计数
    await incrementCache(`course:${courseId}:viewCount`, 1);
    
    await updateItem(
      createCourseKey(courseId),
      'SET viewCount = viewCount + :inc, updatedAt = :now',
      { ':inc': 1, ':now': new Date().toISOString() }
    );
  }

  /**
   * 获取课程统计
   */
  async getCourseStats(courseId: string): Promise<CourseStats> {
    const course = await this.getCourse(courseId);
    if (!course) {
      throw new Error('课程不存在');
    }

    // 计算唯一浏览人数
    const viewResult = await queryItems<CourseView>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': `COURSE#${courseId}`,
        ':sk': 'VIEW#',
      },
      limit: 1000,
    });

    const uniqueViewers = new Set(viewResult.items.map((v) => v.userId || v.sessionId)).size;

    return {
      courseId,
      totalViews: course.viewCount,
      uniqueViewers,
      totalFavorites: course.favoriteCount,
      totalInquiries: course.inquiryCount,
      totalEnrollments: course.enrollmentCount,
      averageViewDuration: 0, // 需要从视图记录计算
      conversionRate: course.viewCount > 0 
        ? (course.enrollmentCount / course.viewCount) * 100 
        : 0,
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * 同步到搜索索引
   */
  private async syncToSearchIndex(courseId: string): Promise<void> {
    const course = await this.getCourse(courseId);
    if (!course || course.status !== CourseStatus.PUBLISHED) return;

    // TODO: 实现搜索索引同步逻辑
    logger.info('Syncing course to search index', { courseId });
  }

  /**
   * 从搜索索引移除
   */
  private async removeFromSearchIndex(courseId: string): Promise<void> {
    // TODO: 实现搜索索引移除逻辑
    logger.info('Removing course from search index', { courseId });
  }
}

export const courseManagementService = new CourseManagementService();
```

---

## 五、API 设计

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| **课程管理** |
| GET | /api/v1/teachers/courses | 获取课程列表 | 教师的课程列表 |
| POST | /api/v1/teachers/courses | 创建课程 | 创建新课程 |
| GET | /api/v1/teachers/courses/:id | 获取课程详情 | 编辑时使用 |
| PUT | /api/v1/teachers/courses/:id | 更新课程 | 更新课程信息 |
| POST | /api/v1/teachers/courses/:id/publish | 发布课程 | 草稿→发布 |
| POST | /api/v1/teachers/courses/:id/unpublish | 下架课程 | 发布→下架 |
| DELETE | /api/v1/teachers/courses/:id | 删除课程 | 软删除 |
| **课程浏览** |
| GET | /api/v1/courses/:id | 获取课程详情 | 公开接口 |
| POST | /api/v1/courses/:id/view | 记录浏览 | 增加浏览量 |
| **课程收藏** |
| POST | /api/v1/courses/:id/favorite | 收藏课程 | 需要登录 |
| DELETE | /api/v1/courses/:id/favorite | 取消收藏 | 需要登录 |
| GET | /api/v1/courses/favorites | 我的收藏 | 需要登录 |
| **课程搜索** |
| GET | /api/v1/courses/search | 搜索课程 | 公开接口 |
| **统计数据** |
| GET | /api/v1/teachers/courses/:id/stats | 获取统计数据 | 课程数据统计 |

---

## 六、Controller 实现

```typescript
// src/modules/courses/course-management.controller.ts
import { Request, Response } from 'express';
import { courseManagementService } from './course-management.service';
import { ApiError } from '@core/errors';

export class CourseManagementController {
  /**
   * GET /api/v1/teachers/courses
   * 获取教师的课程列表
   */
  async getTeacherCourses(req: Request, res: Response): Promise<void> {
    try {
      const teacherId = req.user!.id;
      const { status, page, limit } = req.query;

      const result = await courseManagementService.getTeacherCourses(teacherId, {
        status: status as any,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      ApiError.handle(error, res);
    }
  }

  /**
   * POST /api/v1/teachers/courses
   * 创建课程
   */
  async createCourse(req: Request, res: Response): Promise<void> {
    try {
      const teacherId = req.user!.id;
      const course = await courseManagementService.createCourse(teacherId, {
        teacherId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        message: '课程创建成功',
        data: {
          courseId: course.id,
          status: course.status,
          nextAction: 'publish',
        },
      });
    } catch (error) {
      ApiError.handle(error, res);
    }
  }

  /**
   * PUT /api/v1/teachers/courses/:id
   * 更新课程
   */
  async updateCourse(req: Request, res: Response): Promise<void> {
    try {
      const courseId = req.params.id;
      const userId = req.user!.id;

      const course = await courseManagementService.updateCourse(
        courseId,
        userId,
        req.body
      );

      res.json({
        success: true,
        message: '课程更新成功',
        data: { courseId: course.id },
      });
    } catch (error) {
      ApiError.handle(error, res);
    }
  }

  /**
   * POST /api/v1/teachers/courses/:id/publish
   * 发布课程
   */
  async publishCourse(req: Request, res: Response): Promise<void> {
    try {
      const courseId = req.params.id;
      const userId = req.user!.id;

      const course = await courseManagementService.publishCourse(courseId, userId);

      res.json({
        success: true,
        message: '课程发布成功',
        data: {
          courseId: course.id,
          status: course.status,
          publishedAt: course.publishedAt,
        },
      });
    } catch (error) {
      ApiError.handle(error, res);
    }
  }

  /**
   * POST /api/v1/teachers/courses/:id/unpublish
   * 下架课程
   */
  async unpublishCourse(req: Request, res: Response): Promise<void> {
    try {
      const courseId = req.params.id;
      const userId = req.user!.id;

      const course = await courseManagementService.unpublishCourse(courseId, userId);

      res.json({
        success: true,
        message: '课程已下架',
        data: {
          courseId: course.id,
          status: course.status,
        },
      });
    } catch (error) {
      ApiError.handle(error, res);
    }
  }

  /**
   * DELETE /api/v1/teachers/courses/:id
   * 删除课程
   */
  async deleteCourse(req: Request, res: Response): Promise<void> {
    try {
      const courseId = req.params.id;
      const userId = req.user!.id;

      await courseManagementService.deleteCourse(courseId, userId);

      res.json({
        success: true,
        message: '课程已删除',
      });
    } catch (error) {
      ApiError.handle(error, res);
    }
  }

  /**
   * GET /api/v1/courses/:id
   * 获取课程详情
   */
  async getCourse(req: Request, res: Response): Promise<void> {
    try {
      const courseId = req.params.id;
      const course = await courseManagementService.getCourse(courseId);

      if (!course) {
        res.status(404).json({
          success: false,
          error: '课程不存在',
        });
        return;
      }

      // 记录浏览
      await courseManagementService.recordView(courseId, {
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referer'),
      });

      res.json({
        success: true,
        data: course,
      });
    } catch (error) {
      ApiError.handle(error, res);
    }
  }

  /**
   * POST /api/v1/courses/:id/favorite
   * 收藏课程
   */
  async favoriteCourse(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const courseId = req.params.id;

      const favorite = await courseManagementService.favoriteCourse(userId, courseId);

      res.status(201).json({
        success: true,
        message: '收藏成功',
        data: { favoriteId: favorite.id },
      });
    } catch (error) {
      ApiError.handle(error, res);
    }
  }

  /**
   * DELETE /api/v1/courses/:id/favorite
   * 取消收藏
   */
  async unfavoriteCourse(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const courseId = req.params.id;

      await courseManagementService.unfavoriteCourse(userId, courseId);

      res.json({
        success: true,
        message: '已取消收藏',
      });
    } catch (error) {
      ApiError.handle(error, res);
    }
  }

  /**
   * GET /api/v1/courses/search
   * 搜索课程
   */
  async searchCourses(req: Request, res: Response): Promise<void> {
    try {
      const result = await courseManagementService.searchCourses({
        category: req.query.category as string,
        city: req.query.city as string,
        keyword: req.query.keyword as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        teachingMode: req.query.teachingMode as any,
        grades: req.query.grades ? (req.query.grades as string).split(',') : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      ApiError.handle(error, res);
    }
  }

  /**
   * GET /api/v1/teachers/courses/:id/stats
   * 获取课程统计
   */
  async getCourseStats(req: Request, res: Response): Promise<void> {
    try {
      const courseId = req.params.id;
      const stats = await courseManagementService.getCourseStats(courseId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      ApiError.handle(error, res);
    }
  }
}

export const courseManagementController = new CourseManagementController();
```

---

## 七、Routes 配置

```typescript
// src/modules/courses/course-management.routes.ts
import { Router } from 'express';
import { authMiddleware } from '@shared/middleware/auth';
import { courseManagementController } from './course-management.controller';

const router = Router();

// 教师课程管理路由
router.get(
  '/teachers/courses',
  authMiddleware,
  courseManagementController.getTeacherCourses.bind(courseManagementController)
);

router.post(
  '/teachers/courses',
  authMiddleware,
  courseManagementController.createCourse.bind(courseManagementController)
);

router.get(
  '/teachers/courses/:id',
  authMiddleware,
  courseManagementController.getCourse.bind(courseManagementController)
);

router.put(
  '/teachers/courses/:id',
  authMiddleware,
  courseManagementController.updateCourse.bind(courseManagementController)
);

router.post(
  '/teachers/courses/:id/publish',
  authMiddleware,
  courseManagementController.publishCourse.bind(courseManagementController)
);

router.post(
  '/teachers/courses/:id/unpublish',
  authMiddleware,
  courseManagementController.unpublishCourse.bind(courseManagementController)
);

router.delete(
  '/teachers/courses/:id',
  authMiddleware,
  courseManagementController.deleteCourse.bind(courseManagementController)
);

router.get(
  '/teachers/courses/:id/stats',
  authMiddleware,
  courseManagementController.getCourseStats.bind(courseManagementController)
);

// 公开课程路由
router.get(
  '/courses/:id',
  courseManagementController.getCourse.bind(courseManagementController)
);

router.post(
  '/courses/:id/view',
  courseManagementController.recordView.bind(courseManagementController)
);

router.post(
  '/courses/:id/favorite',
  authMiddleware,
  courseManagementController.favoriteCourse.bind(courseManagementController)
);

router.delete(
  '/courses/:id/favorite',
  authMiddleware,
  courseManagementController.unfavoriteCourse.bind(courseManagementController)
);

router.get(
  '/courses/favorites',
  authMiddleware,
  courseManagementController.getUserFavorites.bind(courseManagementController)
);

router.get(
  '/courses/search',
  courseManagementController.searchCourses.bind(courseManagementController)
);

export default router;
```

---

## 八、前端实现

### 8.1 课程列表页面

```typescript
// src/pages/courses/CourseListPage.tsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Input, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { courseApi } from '../../api/course';

const { Search } = Input;
const { Option } = Select;

export const CourseListPage: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: undefined as string | undefined,
    search: '',
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const loadCourses = async () => {
    setLoading(true);
    try {
      const response = await courseApi.getTeacherCourses({
        page: pagination.current,
        pageSize: pagination.pageSize,
        status: filters.status,
        search: filters.search,
      });
      setCourses(response.data.items);
      setPagination({ ...pagination, total: response.data.total });
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [pagination.current, filters.status]);

  const columns = [
    {
      title: '课程名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: any) => (
        <a onClick={() => navigate(`/courses/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'published' ? 'green' : 'orange';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number, record: any) => `$${price}/${record.priceUnit}`,
    },
    {
      title: '学生数',
      dataIndex: 'studentCount',
      key: 'studentCount',
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number) => rating?.toFixed(1) || '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/courses/${record.id}/edit`)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const handleDelete = async (courseId: string) => {
    await courseApi.deleteCourse(courseId);
    loadCourses();
  };

  return (
    <div className="course-list-page">
      <div className="page-header">
        <h1>课程管理</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/courses/create')}
        >
          创建课程
        </Button>
      </div>

      <div className="filter-bar">
        <Search
          placeholder="搜索课程名称"
          onSearch={(value) => setFilters({ ...filters, search: value })}
          style={{ width: 200 }}
        />
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 120 }}
          onChange={(value) => setFilters({ ...filters, status: value })}
        >
          <Option value="draft">草稿</Option>
          <Option value="pending">待审核</Option>
          <Option value="published">已发布</Option>
          <Option value="unpublished">已下架</Option>
        </Select>
      </div>

      <Table
        columns={columns}
        dataSource={courses}
        rowKey="id"
        loading={loading}
        pagination={pagination}
        onChange={(pagination) => setPagination(pagination as any)}
      />
    </div>
  );
};
```

### 8.2 课程创建/编辑页面

```typescript
// src/pages/courses/CourseFormPage.tsx
import React, { useState, useEffect } from 'react';
import { Form, Input, Select, InputNumber, Button, Card, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { courseApi } from '../../api/course';

const { TextArea } = Input;
const { Option } = Select;

export const CourseFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState<any>({});

  useEffect(() => {
    if (isEdit) {
      loadCourse();
    }
  }, [id]);

  const loadCourse = async () => {
    const response = await courseApi.getCourse(id!);
    setInitialValues(response.data);
    form.setFieldsValue(response.data);
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      if (isEdit) {
        await courseApi.updateCourse(id!, values);
        message.success('课程更新成功');
      } else {
        await courseApi.createCourse(values);
        message.success('课程创建成功');
      }
      navigate('/courses');
    } catch (error) {
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="course-form-page">
      <h1>{isEdit ? '编辑课程' : '创建课程'}</h1>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={initialValues}
      >
        <Card title="基本信息">
          <Form.Item
            name="title"
            label="课程名称"
            rules={[{ required: true, message: '请输入课程名称' }]}
          >
            <Input placeholder="请输入课程名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="课程描述"
            rules={[{ required: true, message: '请输入课程描述' }]}
          >
            <TextArea rows={4} placeholder="请输入课程描述" />
          </Form.Item>

          <Form.Item name="subject" label="学科分类" rules={[{ required: true }]}>
            <Select placeholder="选择学科">
              <Option value="math">数学</Option>
              <Option value="english">英语</Option>
              <Option value="science">科学</Option>
            </Select>
          </Form.Item>

          <Form.Item name="grade" label="适合年级" rules={[{ required: true }]}>
            <Select placeholder="选择年级" mode="multiple">
              <Option value="primary_y1-3">小学1-3年级</Option>
              <Option value="primary_y4-6">小学4-6年级</Option>
              <Option value="high_y7-10">初中7-10年级</Option>
              <Option value="high_y11-13">高中11-13年级</Option>
            </Select>
          </Form.Item>
        </Card>

        <Card title="授课信息" style={{ marginTop: 16 }}>
          <Form.Item name="teachingMode" label="授课方式" rules={[{ required: true }]}>
            <Select placeholder="选择授课方式">
              <Option value="online">线上</Option>
              <Option value="offline">线下</Option>
              <Option value="hybrid">混合</Option>
            </Select>
          </Form.Item>

          <Form.Item name="language" label="授课语言" rules={[{ required: true }]}>
            <Select placeholder="选择授课语言">
              <Option value="zh">中文</Option>
              <Option value="en">英文</Option>
              <Option value="bilingual">双语</Option>
            </Select>
          </Form.Item>

          <Form.Item name="classSize" label="班级规模">
            <Input placeholder="如: 8-12人" />
          </Form.Item>

          <Form.Item name="duration" label="单节时长">
            <Input placeholder="如: 2小时/节" />
          </Form.Item>
        </Card>

        <Card title="价格设置" style={{ marginTop: 16 }}>
          <Form.Item name="price" label="价格" rules={[{ required: true }]}>
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              addonBefore="$"
              placeholder="请输入价格"
            />
          </Form.Item>

          <Form.Item name="priceUnit" label="价格单位" rules={[{ required: true }]}>
            <Select placeholder="选择价格单位">
              <Option value="hour">每小时</Option>
              <Option value="lesson">每节课</Option>
              <Option value="course">每期课程</Option>
            </Select>
          </Form.Item>
        </Card>

        <Card title="课程图片" style={{ marginTop: 16 }}>
          <Upload
            listType="picture"
            maxCount={5}
            beforeUpload={() => false}
            onChange={({ fileList }) => {
              // Handle file upload
            }}
          >
            <Button icon={<UploadOutlined />}>上传图片</Button>
          </Upload>
        </Card>

        <Form.Item style={{ marginTop: 24 }}>
          <Button type="primary" htmlType="submit" loading={loading}>
            {isEdit ? '保存修改' : '创建课程'}
          </Button>
          <Button onClick={() => navigate('/courses')} style={{ marginLeft: 8 }}>
            取消
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};
```

---

## 九、验收标准

- [ ] 课程创建成功
- [ ] 课程发布/下架正常
- [ ] 课程信息可编辑
- [ ] 课程数据统计正确
- [ ] 列表筛选排序正常
- [ ] 图片上传正常
- [ ] 收藏功能正常
- [ ] 浏览记录正确
- [ ] 搜索功能正常
- [ ] 版本历史记录正确

---

## 十、测试用例

```typescript
// tests/course-management.test.ts
describe('CourseManagementService', () => {
  let service: CourseManagementService;

  beforeEach(() => {
    service = new CourseManagementService();
  });

  describe('createCourse', () => {
    it('should create course successfully', async () => {
      const input = {
        teacherId: 'teacher-123',
        title: '高中数学提高班',
        category: '数学',
        grades: ['高中'],
        price: 50,
        priceUnit: PriceUnit.HOUR,
        description: '针对新西兰NCEA高中数学课程',
        teachingMode: TeachingMode.OFFLINE,
        city: 'Auckland',
        timeSlots: ['周六14:00-16:00'],
        duration: 120,
        coverImage: 'https://s3.amazonaws.com/cover.png',
      };

      const course = await service.createCourse('teacher-123', input);

      expect(course.status).toBe(CourseStatus.DRAFT);
      expect(course.title).toBe('高中数学提高班');
      expect(course.teacherId).toBe('teacher-123');
    });
  });

  describe('publishCourse', () => {
    it('should publish draft course', async () => {
      // Create a course first
      const course = await service.createCourse('teacher-123', {...});

      // Publish it
      const published = await service.publishCourse(course.id, 'teacher-123');

      expect(published.status).toBe(CourseStatus.PUBLISHED);
      expect(published.publishedAt).toBeDefined();
    });

    it('should reject publishing deleted course', async () => {
      const course = await service.createCourse('teacher-123', {...});
      await service.deleteCourse(course.id, 'teacher-123');

      await expect(
        service.publishCourse(course.id, 'teacher-123')
      ).rejects.toThrow('课程已删除');
    });
  });

  describe('searchCourses', () => {
    it('should filter by category', async () => {
      const result = await service.searchCourses({
        category: '数学',
        page: 1,
        limit: 20,
      });

      expect(result.courses.every(c => c.category === '数学')).toBe(true);
    });

    it('should filter by price range', async () => {
      const result = await service.searchCourses({
        minPrice: 30,
        maxPrice: 100,
        page: 1,
        limit: 20,
      });

      expect(result.courses.every(c => c.price >= 30 && c.price <= 100)).toBe(true);
    });
  });
});
```

---

## 十一、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 课程数据丢失 | 低 | 高 | DynamoDB自动备份，版本历史记录 |
| 并发编辑冲突 | 中 | 中 | 乐观锁机制，版本号检查 |
| 课程审核积压 | 中 | 中 | 审核队列，批量处理 |
| 图片存储成本 | 低 | 低 | S3生命周期策略，CDN缓存 |
| 搜索性能 | 中 | 中 | Elasticsearch优化，缓存热点数据 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/course/tech-course-management.md`

**相关文档**:
- [产品设计](../../05-product-design/course/course-management.md)
- [教师入驻流程](../teacher/tech-teacher-onboarding.md)
- [课程详情页](tech-course-detail.md)
- [课程搜索](tech-search.md)
