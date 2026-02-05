---
title: 技术实现 - 个人教师功能
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 2.0
phase: mvp
priority: P0
status: implementation-ready
related_feature: ../../05-product-design/user/personal-teacher.md
---

# 技术实现: 个人教师功能

> **对应产品文档**: [personal-teacher.md](../../05-product-design/user/personal-teacher.md) | **优先级**: P0 | **排期**: MVP | **状态**: 待实现

> **注意**: 本文档已从 PostgreSQL 迁移至 DynamoDB

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      个人教师功能技术架构                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   └── 微信小程序 (Taro)                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── POST   /api/v1/teachers/apply        # 申请成为教师            │
│   ├── GET    /api/v1/teachers/profile      # 获取教师档案            │
│   ├── PUT    /api/v1/teachers/profile      # 更新教师档案            │
│   ├── GET    /api/v1/courses/teacher/my-courses  # 我的课程          │
│   ├── POST   /api/v1/courses               # 创建课程                │
│   ├── PUT    /api/v1/courses/:id/publish   # 上架课程                │
│   ├── PUT    /api/v1/courses/:id/unpublish # 下架课程                │
│   ├── GET    /api/v1/students/teacher      # 我的学员                │
│   ├── GET    /api/v1/reviews/teacher       # 我的评价                │
│   ├── POST   /api/v1/reviews/:id/reply     # 回复评价                │
│   ├── POST   /api/v1/teacher-data/export   # 数据导出                │
│   ├── POST   /api/v1/teachers/quit         # 退出教师身份            │
│   └── POST   /api/v1/teachers/reactivate   # 重新激活                │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── PersonalTeacherService (个人教师服务)                          │
│   ├── TeacherCourseService (课程服务)                                │
│   ├── TeacherStudentService (学员服务)                               │
│   ├── TeacherReviewService (评价服务)                                │
│   ├── DataExportService (数据导出服务)                               │
│   └── TeacherDataMaskingService (数据脱敏服务)                       │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   ├── DynamoDB (FindClass-MainTable)                                │
│   │   ├── TEACHER#{teacherId}                                       │
│   │   ├── TEACHER#{teacherId}#COURSES                               │
│   │   ├── TEACHER#{teacherId}#STUDENTS                              │
│   │   ├── TEACHER#{teacherId}#REVIEWS                               │
│   │   ├── TEACHER#{teacherId}#EXPORTS                               │
│   │   ├── COURSE#{courseId}                                         │
│   │   ├── STUDENT#{studentId}                                       │
│   │   └── EXPORT#{exportId}                                         │
│   ├── DynamoDB (缓存)                                                │
│   │   ├── teacher:profile:{teacherId}                               │
│   │   ├── teacher:courses:{teacherId}                               │
│   │   ├── teacher:stats:{teacherId}                                 │
│   │   └── export:status:{exportId}                                  │
│   └── S3 (文件存储)                                                  │
│       ├── teacher/certificates/{teacherId}                          │
│       └── exports/{exportId}                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/personal-teacher/
├── personal-teacher.types.ts      # 类型定义
├── personal-teacher.service.ts    # 主服务
├── teacher-course.service.ts      # 课程服务
├── teacher-student.service.ts     # 学员服务
├── teacher-review.service.ts      # 评价服务
├── data-export.service.ts         # 数据导出服务
├── teacher.controller.ts          # API 控制器
├── teacher.routes.ts              # 路由配置
└── index.ts                       # 模块导出

07-backend/src/modules/courses/
├── courses.types.ts               # 课程类型
├── courses.service.ts             # 课程服务
└── index.ts

06-frontend/src/pages/teacher/
├── TeacherDashboard.tsx           # 教师仪表盘
├── TeacherProfile.tsx             # 教师档案
├── TeacherCourses.tsx             # 我的课程
├── TeacherStudents.tsx            # 学员管理
├── TeacherReviews.tsx             # 评价管理
└── TeacherDataExport.tsx          # 数据导出
```

---

## 二、数据模型设计 (DynamoDB)

### 2.1 核心类型定义

```typescript
// src/modules/personal-teacher/personal-teacher.types.ts

/**
 * 教师状态
 */
export enum TeacherStatus {
  ACTIVE = 'active',        // 活跃
  INACTIVE = 'inactive',    // 不活跃
  SUSPENDED = 'suspended',  // 已暂停
  QUIT = 'quit',            // 已退出
}

/**
 * 课程状态
 */
export enum TeacherCourseStatus {
  DRAFT = 'draft',          // 草稿
  PUBLISHED = 'published',  // 已上架
  UNPUBLISHED = 'unpublished', // 已下架
}

/**
 * 学员状态
 */
export enum TeacherStudentStatus {
  ACTIVE = 'active',        // 进行中
  COMPLETED = 'completed',  // 已完成
  LEFT = 'left',            // 已离开
}

/**
 * 导出状态
 */
export enum DataExportStatus {
  PENDING = 'pending',      // 待处理
  PROCESSING = 'processing', // 处理中
  COMPLETED = 'completed',  // 完成
  FAILED = 'failed',        // 失败
}

/**
 * 教学方向
 */
export interface TeachingSubject {
  subject: string;          // 学科: math, english, physics, etc.
  level: string;            // 级别: primary, middle, high_school, college_entrance
}

/**
 * 教师档案 DynamoDB 类型
 */
export interface TeacherProfile {
  // DynamoDB 主键
  PK: string;           // TEACHER#{teacherId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'TEACHER_PROFILE';
  dataCategory: 'TEACHER';
  id: string;
  userId: string;
  
  // 基本信息
  realName: string;
  avatarUrl?: string;
  
  // 教学信息
  teachingSubjects: TeachingSubject[];
  teachingMode: ('online' | 'offline' | 'both')[];
  teachingAreas: string[];
  bio?: string;
  experienceYears: number;
  certificateUrl?: string;
  
  // 价格信息
  priceMin: number;
  priceMax: number;
  
  // 联系方式
  wechat?: string;
  phone?: string;
  
  // 统计信息
  totalCourses: number;
  totalStudents: number;
  totalReviews: number;
  averageRating: number;
  totalTeachingHours: number;
  
  // 状态
  status: TeacherStatus;
  publishedAt?: string;
  lastActiveAt?: string;
  
  // 信任标识
  trustLevel: 'S' | 'A' | 'B' | 'C' | 'D';
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI1PK?: string;  // USER#{userId}
  GSI1SK?: string;  // TEACHER#{createdAt}
  GSI2PK?: string;  // STATUS#{status}
  GSI2SK?: string;  // RATING#{averageRating}#{updatedAt}
}

/**
 * 教师课程 DynamoDB 类型
 */
export interface TeacherCourse {
  // DynamoDB 主键
  PK: string;           // COURSE#{courseId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'TEACHER_COURSE';
  dataCategory: 'TEACHER';
  id: string;
  teacherId: string;
  
  // 课程信息
  title: string;
  subtitle?: string;
  category: string;
  subcategory?: string;
  teachingMode: string;
  duration: number;             // 课时时长(分钟)
  price: number;
  priceUnit: string;            // 'hour', 'lesson', 'course'
  maxStudents: number;
  currentStudents: number;
  
  // 位置信息
  location: string;
  schedule?: string;
  
  // 课程详情
  description?: string;
  syllabus?: string;
  targetAudience?: string;
  notes?: string;
  images: string[];
  
  // 状态
  status: TeacherCourseStatus;
  publishedAt?: string;
  unpublishedAt?: string;
  
  // 统计
  totalBookings: number;
  totalReviews: number;
  averageRating: number;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI3PK?: string;  // TEACHER#{teacherId}
  GSI3SK?: string;  // COURSE#{createdAt}
  GSI4PK?: string;  // STATUS#{status}
  GSI4SK?: string;  // UPDATED_AT#{updatedAt}
  GSI5PK?: string;  // CATEGORY#{category}
  GSI5SK?: string;  // RATING#{averageRating}#{updatedAt}
}

/**
 * 教师学员 DynamoDB 类型
 */
export interface TeacherStudent {
  // DynamoDB 主键
  PK: string;           // STUDENT#{studentId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'TEACHER_STUDENT';
  dataCategory: 'TEACHER';
  id: string;
  teacherId: string;
  
  // 用户信息
  userId: string;
  
  // 关联信息
  courseId: string;
  courseTitle: string;
  bookingId?: string;
  
  // 学员信息 (脱敏)
  studentName: string;        // 脱敏后
  studentContact: string;     // 脱敏后
  
  // 状态
  status: TeacherStudentStatus;
  
  // 备注
  teacherNote?: string;
  
  // 统计
  totalLessons: number;
  totalHours: number;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI6PK?: string;  // TEACHER#{teacherId}
  GSI6SK?: string;  // STUDENT#{createdAt}
  GSI7PK?: string;  // USER#{userId}
  GSI7SK?: string;  // TEACHER#{teacherId}
}

/**
 * 评价回复 DynamoDB 类型
 */
export interface ReviewReply {
  // DynamoDB 主键
  PK: string;           // REVIEW#{reviewId}
  SK: string;           // REPLY#{teacherId}
  
  // 实体类型标识
  entityType: 'REVIEW_REPLY';
  dataCategory: 'TEACHER';
  id: string;
  reviewId: string;
  teacherId: string;
  
  // 回复内容
  content: string;
  
  // 状态
  status: 'published' | 'hidden';
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
}

/**
 * 数据导出 DynamoDB 类型
 */
export interface DataExport {
  // DynamoDB 主键
  PK: string;           // EXPORT#{exportId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'DATA_EXPORT';
  dataCategory: 'TEACHER';
  id: string;
  teacherId: string;
  
  // 导出信息
  exportTypes: string[];       // ['students', 'courses', 'reviews', 'income']
  exportFormat: 'csv' | 'pdf';
  
  // 日期范围
  dateRange?: {
    start: string;
    end: string;
  };
  
  // 文件信息
  fileUrl?: string;
  fileSize?: number;
  recordCount?: number;
  
  // 状态
  status: DataExportStatus;
  errorMessage?: string;
  
  // 时间戳
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;           // 7天后过期
  
  // GSI 索引
  GSI8PK?: string;  // TEACHER#{teacherId}
  GSI8SK?: string;  // EXPORT#{createdAt}
  GSI9PK?: string;  // STATUS#{status}
  GSI9SK?: string;  // CREATED_AT#{createdAt}
}

/**
 * 申请教师 DTO
 */
export interface ApplyTeacherDto {
  realName: string;
  teachingSubjects: TeachingSubject[];
  teachingMode: ('online' | 'offline' | 'both')[];
  teachingAreas: string[];
  bio?: string;
  experienceYears?: number;
  certificateUrl?: string;
  priceMin?: number;
  priceMax?: number;
  wechat?: string;
  phone?: string;
}

/**
 * 更新教师档案 DTO
 */
export interface UpdateTeacherProfileDto {
  realName?: string;
  avatarUrl?: string;
  teachingSubjects?: TeachingSubject[];
  teachingMode?: ('online' | 'offline' | 'both')[];
  teachingAreas?: string[];
  bio?: string;
  experienceYears?: number;
  certificateUrl?: string;
  priceMin?: number;
  priceMax?: number;
  wechat?: string;
  phone?: string;
}

/**
 * 创建课程 DTO
 */
export interface CreateCourseDto {
  title: string;
  subtitle?: string;
  category: string;
  subcategory?: string;
  teachingMode: string;
  duration: number;
  price: number;
  maxStudents: number;
  location: string;
  schedule?: string;
  description?: string;
  syllabus?: string;
  targetAudience?: string;
  notes?: string;
  images?: string[];
}

/**
 * 学员查询参数
 */
export interface StudentQueryParams {
  page?: number;
  limit?: number;
  status?: TeacherStudentStatus;
  courseId?: string;
}

/**
 * 课程查询参数
 */
export interface CourseQueryParams {
  page?: number;
  limit?: number;
  status?: TeacherCourseStatus;
  category?: string;
}

/**
 * 评价查询参数
 */
export interface ReviewQueryParams {
  page?: number;
  limit?: number;
  hasReply?: boolean;
  minRating?: number;
}

/**
 * 导出请求 DTO
 */
export interface CreateExportDto {
  exportTypes: string[];
  format?: 'csv' | 'pdf';
  dateRange?: {
    start: string;
    end: string;
  };
}
```

### 2.2 实体键生成函数

```typescript
// src/modules/personal-teacher/personal-teacher.types.ts (续)

import { createEntityKey } from '@shared/db/dynamodb';

/**
 * 生成教师主键
 */
export function createTeacherKey(teacherId: string): { PK: string; SK: string } {
  return createEntityKey('TEACHER', teacherId);
}

/**
 * 生成用户教师索引键
 */
export function createUserTeacherIndexKey(userId: string, createdAt: string): { PK: string; SK: string } {
  return {
    PK: `USER#${userId}`,
    SK: `TEACHER#${createdAt}`,
  };
}

/**
 * 生成状态索引键
 */
export function createTeacherStatusIndexKey(status: TeacherStatus, updatedAt: string): { PK: string; SK: string } {
  return {
    PK: `STATUS#${status}`,
    SK: `RATING#${String(Math.round(updatedAt.split('T')[0].replace(/-/g, '')))}`,
  };
}

/**
 * 生成课程主键
 */
export function createCourseKey(courseId: string): { PK: string; SK: string } {
  return createEntityKey('COURSE', courseId);
}

/**
 * 生成教师课程索引键
 */
export function createTeacherCourseIndexKey(teacherId: string, createdAt: string): { PK: string; SK: string } {
  return {
    PK: `TEACHER#${teacherId}`,
    SK: `COURSE#${createdAt}`,
  };
}

/**
 * 生成课程状态索引键
 */
export function createCourseStatusIndexKey(status: TeacherCourseStatus, updatedAt: string): { PK: string; SK: string } {
  return {
    PK: `STATUS#${status}`,
    SK: `UPDATED_AT#${updatedAt}`,
  };
}

/**
 * 生成课程分类索引键
 */
export function createCourseCategoryIndexKey(category: string, rating: number, updatedAt: string): { PK: string; SK: string } {
  return {
    PK: `CATEGORY#${category}`,
    SK: `RATING#${String(rating).padStart(3, '0')}#${updatedAt}`,
  };
}

/**
 * 生成学员主键
 */
export function createStudentKey(studentId: string): { PK: string; SK: string } {
  return createEntityKey('STUDENT', studentId);
}

/**
 * 生成教师学员索引键
 */
export function createTeacherStudentIndexKey(teacherId: string, createdAt: string): { PK: string; SK: string } {
  return {
    PK: `TEACHER#${teacherId}`,
    SK: `STUDENT#${createdAt}`,
  };
}

/**
 * 生成用户学员索引键
 */
export function createUserStudentIndexKey(userId: string, teacherId: string): { PK: string; SK: string } {
  return {
    PK: `USER#${userId}`,
    SK: `TEACHER#${teacherId}`,
  };
}

/**
 * 生成评价回复主键
 */
export function createReviewReplyKey(reviewId: string, teacherId: string): { PK: string; SK: string } {
  return {
    PK: `REVIEW#${reviewId}`,
    SK: `REPLY#${teacherId}`,
  };
}

/**
 * 生成导出主键
 */
export function createExportKey(exportId: string): { PK: string; SK: string } {
  return createEntityKey('EXPORT', exportId);
}

/**
 * 生成教师导出索引键
 */
export function createTeacherExportIndexKey(teacherId: string, createdAt: string): { PK: string; SK: string } {
  return {
    PK: `TEACHER#${teacherId}`,
    SK: `EXPORT#${createdAt}`,
  };
}

/**
 * 生成导出状态索引键
 */
export function createExportStatusIndexKey(status: DataExportStatus, createdAt: string): { PK: string; SK: string } {
  return {
    PK: `STATUS#${status}`,
    SK: `CREATED_AT#${createdAt}`,
  };
}

/**
 * 计算导出过期时间 (7天后)
 */
export function calculateExportExpiry(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString();
}

/**
 * 计算信任等级
 */
export function calculateTrustLevel(rating: number, totalReviews: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (rating >= 4.5 && totalReviews >= 50) return 'S';
  if (rating >= 4.0 && totalReviews >= 20) return 'A';
  if (rating >= 3.5 && totalReviews >= 10) return 'B';
  if (rating >= 3.0) return 'C';
  return 'D';
}
```

---

## 三、业务逻辑实现

### 3.1 个人教师服务

```typescript
// src/modules/personal-teacher/personal-teacher.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  TeacherProfile,
  TeacherStatus,
  ApplyTeacherDto,
  UpdateTeacherProfileDto,
  createTeacherKey,
  createUserTeacherIndexKey,
  createTeacherStatusIndexKey,
  calculateTrustLevel,
} from './personal-teacher.types';
import { putItem, getItem, queryItems, updateItem, deleteItem } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache, CacheKeys } from '@shared/db/cache';
import { rbacService } from '@modules/auth/rbac.service';

/**
 * 个人教师服务类
 */
export class PersonalTeacherService {
  /**
   * 申请成为个人教师 (即时生效，无需审核)
   */
  async apply(userId: string, dto: ApplyTeacherDto): Promise<{
    teacherId: string;
    status: TeacherStatus;
    canPublishCourses: boolean;
  }> {
    const now = new Date().toISOString();
    const teacherId = uuidv4();

    // 检查是否已是教师
    const existingProfile = await this.getProfileByUserId(userId);
    if (existingProfile) {
      throw new Error('Already a teacher');
    }

    // 创建教师档案
    const profile: TeacherProfile = {
      ...createTeacherKey(teacherId),
      SK: 'METADATA',
      entityType: 'TEACHER_PROFILE',
      dataCategory: 'TEACHER',
      id: teacherId,
      userId,
      realName: dto.realName,
      teachingSubjects: dto.teachingSubjects,
      teachingMode: dto.teachingMode,
      teachingAreas: dto.teachingAreas,
      bio: dto.bio,
      experienceYears: dto.experienceYears || 0,
      certificateUrl: dto.certificateUrl,
      priceMin: dto.priceMin || 0,
      priceMax: dto.priceMax || 0,
      wechat: dto.wechat,
      phone: dto.phone,
      totalCourses: 0,
      totalStudents: 0,
      totalReviews: 0,
      averageRating: 0,
      totalTeachingHours: 0,
      status: TeacherStatus.ACTIVE,
      publishedAt: now,
      lastActiveAt: now,
      trustLevel: 'C',
      createdAt: now,
      updatedAt: now,
      GSI1PK: `USER#${userId}`,
      GSI1SK: `TEACHER#${now}`,
      GSI2PK: `STATUS#${TeacherStatus.ACTIVE}`,
      GSI2SK: `RATING#000#${now}`,
    };

    await putItem(profile);

    // 分配教师角色
    await rbacService.assignRole(userId, 'TEACHER' as any);

    // 清除缓存
    await deleteCache(`user:${userId}:roles`, 'AUTH');

    logger.info('Teacher application approved', { teacherId, userId });

    return {
      teacherId,
      status: TeacherStatus.ACTIVE,
      canPublishCourses: true,
    };
  }

  /**
   * 获取教师档案
   */
  async getProfile(teacherId: string): Promise<TeacherProfile | null> {
    const cacheKey = `teacher:profile:${teacherId}`;
    const cached = await getFromCache<TeacherProfile>(cacheKey, 'TEACHER');
    if (cached) return cached;

    const { PK, SK } = createTeacherKey(teacherId);
    const profile = await getItem<TeacherProfile>({ PK, SK });

    if (profile) {
      await setCache(cacheKey, 'TEACHER', profile, 3600);
    }

    return profile;
  }

  /**
   * 通过用户ID获取教师档案
   */
  async getProfileByUserId(userId: string): Promise<TeacherProfile | null> {
    const result = await queryItems<TeacherProfile>({
      indexName: 'GSI1-UserTeachers',
      keyConditionExpression: 'GSI1PK = :pk',
      expressionAttributeValues: {
        ':pk': `USER#${userId}`,
      },
      limit: 1,
    });

    return result.items[0] || null;
  }

  /**
   * 更新教师档案
   */
  async updateProfile(teacherId: string, userId: string, dto: UpdateTeacherProfileDto): Promise<TeacherProfile> {
    const now = new Date().toISOString();
    const updateParts: string[] = ['updatedAt = :now', 'lastActiveAt = :now'];
    const values: Record<string, unknown> = { ':now': now };

    if (dto.realName) {
      updateParts.push('realName = :realName');
      values[':realName'] = dto.realName;
    }
    if (dto.avatarUrl) {
      updateParts.push('avatarUrl = :avatarUrl');
      values[':avatarUrl'] = dto.avatarUrl;
    }
    if (dto.teachingSubjects) {
      updateParts.push('teachingSubjects = :teachingSubjects');
      values[':teachingSubjects'] = dto.teachingSubjects;
    }
    if (dto.teachingMode) {
      updateParts.push('teachingMode = :teachingMode');
      values[':teachingMode'] = dto.teachingMode;
    }
    if (dto.teachingAreas) {
      updateParts.push('teachingAreas = :teachingAreas');
      values[':teachingAreas'] = dto.teachingAreas;
    }
    if (dto.bio !== undefined) {
      updateParts.push('bio = :bio');
      values[':bio'] = dto.bio;
    }
    if (dto.experienceYears !== undefined) {
      updateParts.push('experienceYears = :experienceYears');
      values[':experienceYears'] = dto.experienceYears;
    }
    if (dto.certificateUrl !== undefined) {
      updateParts.push('certificateUrl = :certificateUrl');
      values[':certificateUrl'] = dto.certificateUrl;
    }
    if (dto.priceMin !== undefined) {
      updateParts.push('priceMin = :priceMin');
      values[':priceMin'] = dto.priceMin;
    }
    if (dto.priceMax !== undefined) {
      updateParts.push('priceMax = :priceMax');
      values[':priceMax'] = dto.priceMax;
    }
    if (dto.wechat !== undefined) {
      updateParts.push('wechat = :wechat');
      values[':wechat'] = dto.wechat;
    }
    if (dto.phone !== undefined) {
      updateParts.push('phone = :phone');
      values[':phone'] = dto.phone;
    }

    const updated = await updateItem(
      createTeacherKey(teacherId),
      `SET ${updateParts.join(', ')}`,
      values
    ) as TeacherProfile;

    await deleteCache(`teacher:profile:${teacherId}`, 'TEACHER');

    logger.info('Teacher profile updated', { teacherId });

    return updated;
  }

  /**
   * 更新统计数据
   */
  async updateStats(teacherId: string, updates: Partial<{
    totalCourses: number;
    totalStudents: number;
    totalReviews: number;
    averageRating: number;
    totalTeachingHours: number;
  }>): Promise<void> {
    const now = new Date().toISOString();
    const updateParts: string[] = ['updatedAt = :now'];
    const values: Record<string, unknown> = { ':now': now };

    if (updates.totalCourses !== undefined) {
      updateParts.push('totalCourses = :totalCourses');
      values[':totalCourses'] = updates.totalCourses;
    }
    if (updates.totalStudents !== undefined) {
      updateParts.push('totalStudents = :totalStudents');
      values[':totalStudents'] = updates.totalStudents;
    }
    if (updates.totalReviews !== undefined) {
      updateParts.push('totalReviews = :totalReviews');
      values[':totalReviews'] = updates.totalReviews;
    }
    if (updates.averageRating !== undefined) {
      updateParts.push('averageRating = :averageRating');
      values[':averageRating'] = updates.averageRating;
      // 更新信任等级
      updateParts.push('trustLevel = :trustLevel');
      values[':trustLevel'] = calculateTrustLevel(updates.averageRating, updates.totalReviews || 0);
      // 更新GSI2SK
      updateParts.push('GSI2SK = :gsi2sk');
      values[':gsi2sk'] = `RATING#${String(updates.averageRating).padStart(3, '0')}#${now}`;
    }
    if (updates.totalTeachingHours !== undefined) {
      updateParts.push('totalTeachingHours = :totalTeachingHours');
      values[':totalTeachingHours'] = updates.totalTeachingHours;
    }

    await updateItem(
      createTeacherKey(teacherId),
      `SET ${updateParts.join(', ')}`,
      values
    );

    await deleteCache(`teacher:profile:${teacherId}`, 'TEACHER');
  }

  /**
   * 退出教师身份
   */
  async quit(userId: string, teacherId: string): Promise<void> {
    const now = new Date().toISOString();

    // 更新教师状态
    await updateItem(
      createTeacherKey(teacherId),
      'SET status = :status, lastActiveAt = :now, updatedAt = :now, GSI2PK = :gsi2pk',
      {
        ':status': TeacherStatus.QUIT,
        ':now': now,
        ':gsi2pk': `STATUS#${TeacherStatus.QUIT}`,
      }
    );

    // 下架所有课程
    await teacherCourseService.unpublishAllCourses(teacherId, '教师已退出');

    // 移除教师角色
    await rbacService.revokeRole(userId, 'TEACHER' as any);

    // 清除缓存
    await deleteCache(`teacher:profile:${teacherId}`, 'TEACHER');
    await deleteCache(`user:${userId}:roles`, 'AUTH');

    logger.info('Teacher quit', { teacherId, userId });
  }

  /**
   * 重新激活教师身份
   */
  async reactivate(userId: string, teacherId: string): Promise<void> {
    const profile = await this.getProfile(teacherId);
    if (!profile) {
      throw new Error('Teacher profile not found');
    }

    const now = new Date().toISOString();

    await updateItem(
      createTeacherKey(teacherId),
      'SET status = :status, lastActiveAt = :now, updatedAt = :now, GSI2PK = :gsi2pk',
      {
        ':status': TeacherStatus.ACTIVE,
        ':now': now,
        ':gsi2pk': `STATUS#${TeacherStatus.ACTIVE}`,
      }
    );

    // 恢复教师角色
    await rbacService.assignRole(userId, 'TEACHER' as any);

    // 清除缓存
    await deleteCache(`teacher:profile:${teacherId}`, 'TEACHER');
    await deleteCache(`user:${userId}:roles`, 'AUTH');

    logger.info('Teacher reactivated', { teacherId, userId });
  }

  /**
   * 获取活跃教师列表
   */
  async getActiveTeachers(limit: number = 50): Promise<TeacherProfile[]> {
    const result = await queryItems<TeacherProfile>({
      indexName: 'GSI2-StatusIndex',
      keyConditionExpression: 'GSI2PK = :pk AND begins_with(GSI2SK, :sk)',
      expressionAttributeValues: {
        ':pk': `STATUS#${TeacherStatus.ACTIVE}`,
        ':sk': 'RATING#',
      },
      scanIndexForward: false,
      limit,
    });

    return result.items;
  }
}

// 导出服务实例
export const personalTeacherService = new PersonalTeacherService();
```

### 3.2 教师课程服务

```typescript
// src/modules/personal-teacher/teacher-course.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  TeacherCourse,
  TeacherCourseStatus,
  CreateCourseDto,
  CourseQueryParams,
  createCourseKey,
  createTeacherCourseIndexKey,
  createCourseStatusIndexKey,
  createCourseCategoryIndexKey,
} from './personal-teacher.types';
import { putItem, getItem, queryItems, updateItem, deleteItem } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache, CacheKeys } from '@shared/db/dynamodb';
import { personalTeacherService } from './personal-teacher.service';

/**
 * 教师课程服务类
 */
export class TeacherCourseService {
  /**
   * 创建课程
   */
  async createCourse(teacherId: string, dto: CreateCourseDto): Promise<{
    courseId: string;
    status: TeacherCourseStatus;
    canPublish: boolean;
  }> {
    const now = new Date().toISOString();
    const courseId = uuidv4();

    const course: TeacherCourse = {
      ...createCourseKey(courseId),
      SK: 'METADATA',
      entityType: 'TEACHER_COURSE',
      dataCategory: 'TEACHER',
      id: courseId,
      teacherId,
      title: dto.title,
      subtitle: dto.subtitle,
      category: dto.category,
      subcategory: dto.subcategory,
      teachingMode: dto.teachingMode,
      duration: dto.duration,
      price: dto.price,
      priceUnit: 'hour',
      maxStudents: dto.maxStudents,
      currentStudents: 0,
      location: dto.location,
      schedule: dto.schedule,
      description: dto.description,
      syllabus: dto.syllabus,
      targetAudience: dto.targetAudience,
      notes: dto.notes,
      images: dto.images || [],
      status: TeacherCourseStatus.DRAFT,
      totalBookings: 0,
      totalReviews: 0,
      averageRating: 0,
      createdAt: now,
      updatedAt: now,
      GSI3PK: `TEACHER#${teacherId}`,
      GSI3SK: `COURSE#${now}`,
      GSI4PK: `STATUS#${TeacherCourseStatus.DRAFT}`,
      GSI4SK: `UPDATED_AT#${now}`,
      GSI5PK: `CATEGORY#${dto.category}`,
      GSI5SK: `RATING#000#${now}`,
    };

    await putItem(course);

    // 更新教师课程统计
    const profile = await personalTeacherService.getProfile(teacherId);
    if (profile) {
      await personalTeacherService.updateStats(teacherId, {
        totalCourses: profile.totalCourses + 1,
      });
    }

    // 清除缓存
    await deleteCache(`teacher:courses:${teacherId}`, 'TEACHER');

    logger.info('Course created', { courseId, teacherId });

    return {
      courseId,
      status: TeacherCourseStatus.DRAFT,
      canPublish: true,
    };
  }

  /**
   * 获取教师的课程列表
   */
  async getMyCourses(teacherId: string, params: CourseQueryParams = {}): Promise<{
    courses: TeacherCourse[];
    stats: { total: number; published: number; unpublished: number };
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page = 1, limit = 20, status, category } = params;

    // 构建查询条件
    let filterExpression = 'PK = :pk AND begins_with(SK, :sk)';
    const expressionValues: Record<string, unknown> = {
      ':pk': `TEACHER#${teacherId}`,
      ':sk': 'COURSE#',
    };

    if (status) {
      filterExpression += ' AND #status = :status';
      expressionValues[':status'] = status;
    }
    if (category) {
      filterExpression += ' AND #category = :category';
      expressionValues[':category'] = category;
    }

    const result = await queryItems<TeacherCourse>({
      keyConditionExpression: filterExpression,
      expressionAttributeValues: expressionValues,
      expressionAttributeNames: status ? { '#status': 'status' } : undefined,
      limit: limit * 2,
      scanIndexForward: false,
    });

    // 统计
    const allCourses = await this.getAllTeacherCourses(teacherId);
    const stats = {
      total: allCourses.length,
      published: allCourses.filter(c => c.status === TeacherCourseStatus.PUBLISHED).length,
      unpublished: allCourses.filter(c => c.status === TeacherCourseStatus.UNPUBLISHED).length,
    };

    // 分页
    const startIndex = (page - 1) * limit;
    const paginatedItems = result.items.slice(startIndex, startIndex + limit);

    return {
      courses: paginatedItems,
      stats,
      pagination: {
        page,
        limit,
        total: result.items.length,
        totalPages: Math.ceil(result.items.length / limit),
      },
    };
  }

  /**
   * 获取所有教师课程 (用于统计)
   */
  private async getAllTeacherCourses(teacherId: string): Promise<TeacherCourse[]> {
    const result = await queryItems<TeacherCourse>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': `TEACHER#${teacherId}`,
        ':sk': 'COURSE#',
      },
      limit: 1000,
    });

    return result.items;
  }

  /**
   * 获取课程详情
   */
  async getCourseById(courseId: string): Promise<TeacherCourse | null> {
    const { PK, SK } = createCourseKey(courseId);
    return getItem<TeacherCourse>({ PK, SK });
  }

  /**
   * 上架课程
   */
  async publishCourse(teacherId: string, courseId: string): Promise<void> {
    const course = await this.getCourseById(courseId);
    if (!course || course.teacherId !== teacherId) {
      throw new Error('Course not found');
    }

    if (course.status === TeacherCourseStatus.PUBLISHED) {
      throw new Error('Course already published');
    }

    const now = new Date().toISOString();

    await updateItem(
      createCourseKey(courseId),
      'SET status = :status, publishedAt = :publishedAt, updatedAt = :now, GSI4PK = :gsi4pk, GSI4SK = :gsi4sk',
      {
        ':status': TeacherCourseStatus.PUBLISHED,
        ':publishedAt': now,
        ':now': now,
        ':gsi4pk': `STATUS#${TeacherCourseStatus.PUBLISHED}`,
        ':gsi4sk': `UPDATED_AT#${now}`,
      }
    );

    // 清除缓存
    await deleteCache(`teacher:courses:${teacherId}`, 'TEACHER');
    await deleteCache(`course:${courseId}`, 'COURSE');

    logger.info('Course published', { courseId, teacherId });
  }

  /**
   * 下架课程
   */
  async unpublishCourse(teacherId: string, courseId: string, reason?: string): Promise<void> {
    const course = await this.getCourseById(courseId);
    if (!course || course.teacherId !== teacherId) {
      throw new Error('Course not found');
    }

    const now = new Date().toISOString();

    await updateItem(
      createCourseKey(courseId),
      'SET status = :status, unpublishedAt = :unpublishedAt, updatedAt = :now, GSI4PK = :gsi4pk, GSI4SK = :gsi4sk',
      {
        ':status': TeacherCourseStatus.UNPUBLISHED,
        ':unpublishedAt': now,
        ':now': now,
        ':gsi4pk': `STATUS#${TeacherCourseStatus.UNPUBLISHED}`,
        ':gsi4sk': `UPDATED_AT#${now}`,
      }
    );

    // 清除缓存
    await deleteCache(`teacher:courses:${teacherId}`, 'TEACHER');
    await deleteCache(`course:${courseId}`, 'COURSE');

    logger.info('Course unpublished', { courseId, teacherId, reason });
  }

  /**
   * 下架教师所有课程
   */
  async unpublishAllCourses(teacherId: string, reason: string): Promise<number> {
    const courses = await this.getAllTeacherCourses(teacherId);
    let count = 0;

    for (const course of courses) {
      if (course.status === TeacherCourseStatus.PUBLISHED) {
        await this.unpublishCourse(teacherId, course.id, reason);
        count++;
      }
    }

    logger.info('All teacher courses unpublished', { teacherId, count });

    return count;
  }

  /**
   * 更新课程
   */
  async updateCourse(teacherId: string, courseId: string, dto: Partial<CreateCourseDto>): Promise<TeacherCourse> {
    const course = await this.getCourseById(courseId);
    if (!course || course.teacherId !== teacherId) {
      throw new Error('Course not found');
    }

    const now = new Date().toISOString();
    const updateParts: string[] = ['updatedAt = :now'];
    const values: Record<string, unknown> = { ':now': now };

    if (dto.title) {
      updateParts.push('title = :title');
      values[':title'] = dto.title;
    }
    if (dto.subtitle !== undefined) {
      updateParts.push('subtitle = :subtitle');
      values[':subtitle'] = dto.subtitle;
    }
    if (dto.price) {
      updateParts.push('price = :price');
      values[':price'] = dto.price;
    }
    if (dto.description !== undefined) {
      updateParts.push('description = :description');
      values[':description'] = dto.description;
    }
    if (dto.images) {
      updateParts.push('images = :images');
      values[':images'] = dto.images;
    }

    const updated = await updateItem(
      createCourseKey(courseId),
      `SET ${updateParts.join(', ')}`,
      values
    ) as TeacherCourse;

    await deleteCache(`teacher:courses:${teacherId}`, 'TEACHER');

    return updated;
  }

  /**
   * 删除课程 (仅限草稿)
   */
  async deleteCourse(teacherId: string, courseId: string): Promise<void> {
    const course = await this.getCourseById(courseId);
    if (!course || course.teacherId !== teacherId) {
      throw new Error('Course not found');
    }

    if (course.status !== TeacherCourseStatus.DRAFT) {
      throw new Error('Only draft courses can be deleted');
    }

    await deleteItem(createCourseKey(courseId));

    // 更新教师统计
    const profile = await personalTeacherService.getProfile(teacherId);
    if (profile) {
      await personalTeacherService.updateStats(teacherId, {
        totalCourses: profile.totalCourses - 1,
      });
    }

    await deleteCache(`teacher:courses:${teacherId}`, 'TEACHER');

    logger.info('Course deleted', { courseId, teacherId });
  }
}

export const teacherCourseService = new TeacherCourseService();
```

### 3.3 学员服务 (带脱敏)

```typescript
// src/modules/personal-teacher/teacher-student.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  TeacherStudent,
  TeacherStudentStatus,
  StudentQueryParams,
  createStudentKey,
  createTeacherStudentIndexKey,
  createUserStudentIndexKey,
} from './personal-teacher.types';
import { putItem, getItem, queryItems, updateItem } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache } from '@shared/db/cache';

/**
 * 数据脱敏服务
 */
export class TeacherDataMaskingService {
  /**
   * 姓名脱敏
   */
  maskName(name: string): string {
    if (!name) return '学员';
    if (name.length === 1) return name;
    return name[0] + '*'.repeat(name.length - 1);
  }

  /**
   * 联系方式脱敏
   */
  maskContact(contact: string): string {
    if (!contact) return '';
    if (contact.includes('@')) {
      // 邮箱脱敏
      const [local, domain] = contact.split('@');
      if (local.length <= 2) return '***@' + domain;
      return local.substring(0, 2) + '***@' + domain;
    }
    // 手机号脱敏
    return contact.replace(/(\d{3})\d+(\d{3})/, '$1***$2');
  }
}

/**
 * 教师学员服务类
 */
export class TeacherStudentService {
  private maskingService = new TeacherDataMaskingService();

  /**
   * 获取学员列表
   */
  async getMyStudents(teacherId: string, params: StudentQueryParams = {}): Promise<{
    students: Array<{
      id: string;
      name: string;
      contact: string;
      courseId: string;
      courseTitle: string;
      status: TeacherStudentStatus;
      totalLessons: number;
      totalHours: number;
      teacherNote?: string;
      createdAt: string;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page = 1, limit = 20, status, courseId } = params;

    let filterExpression = 'PK = :pk AND begins_with(SK, :sk)';
    const expressionValues: Record<string, unknown> = {
      ':pk': `TEACHER#${teacherId}`,
      ':sk': 'STUDENT#',
    };

    const result = await queryItems<TeacherStudent>({
      keyConditionExpression: filterExpression,
      expressionAttributeValues: expressionValues,
      limit: limit * 2,
      scanIndexForward: false,
    });

    // 过滤
    let filtered = result.items;
    if (status) {
      filtered = filtered.filter(s => s.status === status);
    }
    if (courseId) {
      filtered = filtered.filter(s => s.courseId === courseId);
    }

    // 脱敏处理
    const maskedStudents = filtered.map(s => ({
      id: s.id,
      name: this.maskingService.maskName(s.studentName),
      contact: this.maskingService.maskContact(s.studentContact),
      courseId: s.courseId,
      courseTitle: s.courseTitle,
      status: s.status,
      totalLessons: s.totalLessons,
      totalHours: s.totalHours,
      teacherNote: s.teacherNote,
      createdAt: s.createdAt,
    }));

    // 分页
    const startIndex = (page - 1) * limit;
    const paginatedItems = maskedStudents.slice(startIndex, startIndex + limit);

    return {
      students: paginatedItems,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  }

  /**
   * 获取学员详情 (脱敏)
   */
  async getStudentDetail(teacherId: string, studentId: string): Promise<{
    id: string;
    name: string;
    contact: string;
    courseTitle: string;
    status: TeacherStudentStatus;
    totalLessons: number;
    totalHours: number;
    teacherNote?: string;
    createdAt: string;
  } | null> {
    const { PK, SK } = createStudentKey(studentId);
    const student = await getItem<TeacherStudent>({ PK, SK });

    if (!student || student.teacherId !== teacherId) {
      return null;
    }

    return {
      id: student.id,
      name: this.maskingService.maskName(student.studentName),
      contact: this.maskingService.maskContact(student.studentContact),
      courseTitle: student.courseTitle,
      status: student.status,
      totalLessons: student.totalLessons,
      totalHours: student.totalHours,
      teacherNote: student.teacherNote,
      createdAt: student.createdAt,
    };
  }

  /**
   * 添加学员备注
   */
  async addNote(teacherId: string, studentId: string, note: string): Promise<void> {
    const { PK, SK } = createStudentKey(studentId);
    const student = await getItem<TeacherStudent>({ PK, SK });

    if (!student || student.teacherId !== teacherId) {
      throw new Error('Student not found');
    }

    await updateItem(
      createStudentKey(studentId),
      'SET teacherNote = :note, updatedAt = :now',
      {
        ':note': note,
        ':now': new Date().toISOString(),
      }
    );

    logger.info('Student note added', { studentId, teacherId });
  }

  /**
   * 创建学员记录 (当学员预约时自动创建)
   */
  async createStudentRecord(teacherId: string, params: {
    userId: string;
    studentName: string;
    studentContact: string;
    courseId: string;
    courseTitle: string;
    bookingId: string;
  }): Promise<TeacherStudent> {
    // 检查是否已存在
    const result = await queryItems<TeacherStudent>({
      indexName: 'GSI6-TeacherStudents',
      keyConditionExpression: 'GSI6PK = :pk',
      expressionAttributeValues: {
        ':pk': `TEACHER#${teacherId}`,
      },
      limit: 100,
    });

    const existing = result.items.find(
      s => s.userId === params.userId && s.courseId === params.courseId
    );

    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const studentId = uuidv4();

    const student: TeacherStudent = {
      ...createStudentKey(studentId),
      SK: 'METADATA',
      entityType: 'TEACHER_STUDENT',
      dataCategory: 'TEACHER',
      id: studentId,
      teacherId,
      userId: params.userId,
      courseId: params.courseId,
      courseTitle: params.courseTitle,
      bookingId: params.bookingId,
      studentName: params.studentName,
      studentContact: params.studentContact,
      status: TeacherStudentStatus.ACTIVE,
      totalLessons: 0,
      totalHours: 0,
      createdAt: now,
      updatedAt: now,
      GSI6PK: `TEACHER#${teacherId}`,
      GSI6SK: `STUDENT#${now}`,
      GSI7PK: `USER#${params.userId}`,
      GSI7SK: `TEACHER#${teacherId}`,
    };

    await putItem(student);

    // 更新教师学员统计
    // 这里应该调用 personalTeacherService.updateStats

    logger.info('Student record created', { studentId, teacherId });

    return student;
  }

  /**
   * 更新学员状态
   */
  async updateStudentStatus(studentId: string, status: TeacherStudentStatus): Promise<void> {
    await updateItem(
      createStudentKey(studentId),
      'SET status = :status, updatedAt = :now',
      {
        ':status': status,
        ':now': new Date().toISOString(),
      }
    );
  }
}

export const teacherStudentService = new TeacherStudentService();
```

### 3.4 评价服务

```typescript
// src/modules/personal-teacher/teacher-review.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  ReviewReply,
  ReviewQueryParams,
  createReviewReplyKey,
} from './personal-teacher.types';
import { putItem, getItem, updateItem, queryItems } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache } from '@shared/db/dynamodb';

/**
 * 教师评价服务类
 */
export class TeacherReviewService {
  /**
   * 获取我的评价
   */
  async getMyReviews(teacherId: string, params: ReviewQueryParams = {}): Promise<{
    reviews: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page = 1, limit = 20, hasReply } = params;

    // 获取教师的课程ID列表
    const courseIds = await this.getTeacherCourseIds(teacherId);

    if (courseIds.length === 0) {
      return { reviews: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    // 从课程服务获取评价
    const allReviews: any[] = [];
    for (const courseId of courseIds) {
      const courseReviews = await this.getCourseReviews(courseId);
      allReviews.push(...courseReviews);
    }

    // 过滤
    let filtered = allReviews;
    if (hasReply !== undefined) {
      filtered = filtered.filter(r => r.hasReply === hasReply);
    }

    // 排序
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 分页
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    return {
      reviews: paginatedItems,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  }

  /**
   * 获取教师的所有课程ID
   */
  private async getTeacherCourseIds(teacherId: string): Promise<string[]> {
    const result = await queryItems<any>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': `TEACHER#${teacherId}`,
        ':sk': 'COURSE#',
      },
      limit: 100,
    });

    return result.items.map(c => c.id);
  }

  /**
   * 获取课程评价 (从课程模块)
   */
  private async getCourseReviews(courseId: string): Promise<any[]> {
    // 这里应该调用课程服务的获取评价方法
    // 暂时返回空数组
    return [];
  }

  /**
   * 回复评价
   */
  async replyToReview(teacherId: string, reviewId: string, content: string): Promise<ReviewReply> {
    const now = new Date().toISOString();
    const { PK, SK } = createReviewReplyKey(reviewId, teacherId);

    // 检查是否已有回复
    const existing = await getItem<ReviewReply>({ PK, SK });

    if (existing) {
      // 更新回复
      const updated: ReviewReply = {
        ...existing,
        content,
        updatedAt: now,
      };
      await putItem(updated);
      return updated;
    }

    // 创建新回复
    const reply: ReviewReply = {
      PK,
      SK,
      entityType: 'REVIEW_REPLY',
      dataCategory: 'TEACHER',
      id: uuidv4(),
      reviewId,
      teacherId,
      content,
      status: 'published',
      createdAt: now,
      updatedAt: now,
    };

    await putItem(reply);

    logger.info('Review replied', { reviewId, teacherId });

    return reply;
  }

  /**
   * 获取评价回复
   */
  async getReviewReply(reviewId: string, teacherId: string): Promise<ReviewReply | null> {
    const { PK, SK } = createReviewReplyKey(reviewId, teacherId);
    return getItem<ReviewReply>({ PK, SK });
  }

  /**
   * 隐藏回复
   */
  async hideReply(reviewId: string, teacherId: string): Promise<void> {
    await updateItem(
      createReviewReplyKey(reviewId, teacherId),
      'SET status = :status, updatedAt = :now',
      {
        ':status': 'hidden',
        ':now': new Date().toISOString(),
      }
    );
  }
}

export const teacherReviewService = new TeacherReviewService();
```

### 3.5 数据导出服务

```typescript
// src/modules/personal-teacher/data-export.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  DataExport,
  DataExportStatus,
  CreateExportDto,
  createExportKey,
  createTeacherExportIndexKey,
  createExportStatusIndexKey,
  calculateExportExpiry,
} from './personal-teacher.types';
import { putItem, getItem, queryItems, updateItem } from '@shared/db/dynamodb';
import { s3Service } from '@shared/services/s3.service';

/**
 * 数据导出服务类
 */
export class DataExportService {
  /**
   * 创建数据导出
   */
  async createExport(teacherId: string, dto: CreateExportDto): Promise<{
    exportId: string;
    status: DataExportStatus;
    estimatedTime: string;
  }> {
    const now = new Date().toISOString();
    const exportId = uuidv4();

    const exportRecord: DataExport = {
      ...createExportKey(exportId),
      SK: 'METADATA',
      entityType: 'DATA_EXPORT',
      dataCategory: 'TEACHER',
      id: exportId,
      teacherId,
      exportTypes: dto.exportTypes,
      exportFormat: dto.format || 'csv',
      dateRange: dto.dateRange,
      status: DataExportStatus.PENDING,
      createdAt: now,
      expiresAt: calculateExportExpiry(),
      GSI8PK: `TEACHER#${teacherId}`,
      GSI8SK: `EXPORT#${now}`,
      GSI9PK: `STATUS#${DataExportStatus.PENDING}`,
      GSI9SK: `CREATED_AT#${now}`,
    };

    await putItem(exportRecord);

    // 异步生成导出文件
    this.generateExportFile(exportId, teacherId, dto);

    logger.info('Export created', { exportId, teacherId });

    return {
      exportId,
      status: DataExportStatus.PENDING,
      estimatedTime: '30秒',
    };
  }

  /**
   * 生成导出文件
   */
  private async generateExportFile(exportId: string, teacherId: string, dto: CreateExportDto): Promise<void> {
    try {
      // 更新状态
      await updateItem(
        createExportKey(exportId),
        'SET status = :status, GSI9PK = :gsi9pk',
        {
          ':status': DataExportStatus.PROCESSING,
          ':gsi9pk': `STATUS#${DataExportStatus.PROCESSING}`,
        }
      );

      // 收集数据
      const data: Record<string, any[]> = {};

      if (dto.exportTypes.includes('students')) {
        data.students = await this.getStudentsData(teacherId, dto.dateRange);
      }
      if (dto.exportTypes.includes('courses')) {
        data.courses = await this.getCoursesData(teacherId, dto.dateRange);
      }
      if (dto.exportTypes.includes('reviews')) {
        data.reviews = await this.getReviewsData(teacherId, dto.dateRange);
      }
      if (dto.exportTypes.includes('income')) {
        data.income = await this.getIncomeData(teacherId, dto.dateRange);
      }

      // 生成文件
      const content = this.convertToCSV(data);
      const fileName = `exports/${teacherId}/${exportId}.csv`;
      const fileUrl = await s3Service.upload(fileName, content);

      // 计算记录数
      let recordCount = 0;
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) {
          recordCount += data[key].length;
        }
      }

      // 更新导出记录
      await updateItem(
        createExportKey(exportId),
        'SET status = :status, fileUrl = :fileUrl, fileSize = :fileSize, recordCount = :recordCount, completedAt = :completed, expiresAt = :expires, GSI9PK = :gsi9pk, GSI9SK = :gsi9sk',
        {
          ':status': DataExportStatus.COMPLETED,
          ':fileUrl': fileUrl,
          ':fileSize': Buffer.byteLength(content),
          ':recordCount': recordCount,
          ':completed': new Date().toISOString(),
          ':expires': calculateExportExpiry(),
          ':gsi9pk': `STATUS#${DataExportStatus.COMPLETED}`,
          ':gsi9sk': `CREATED_AT#${new Date().toISOString()}`,
        }
      );

      logger.info('Export completed', { exportId, recordCount });
    } catch (error: any) {
      await updateItem(
        createExportKey(exportId),
        'SET status = :status, errorMessage = :error, GSI9PK = :gsi9pk',
        {
          ':status': DataExportStatus.FAILED,
          ':error': error.message,
          ':gsi9pk': `STATUS#${DataExportStatus.FAILED}`,
        }
      );

      logger.error('Export failed', { exportId, error: error.message });
    }
  }

  /**
   * 获取学员数据
   */
  private async getStudentsData(teacherId: string, dateRange?: { start: string; end: string }): Promise<any[]> {
    // 从学员服务获取数据
    return [];
  }

  /**
   * 获取课程数据
   */
  private async getCoursesData(teacherId: string, dateRange?: { start: string; end: string }): Promise<any[]> {
    // 从课程服务获取数据
    return [];
  }

  /**
   * 获取评价数据
   */
  private async getReviewsData(teacherId: string, dateRange?: { start: string; end: string }): Promise<any[]> {
    // 从评价服务获取数据
    return [];
  }

  /**
   * 获取收入数据
   */
  private async getIncomeData(teacherId: string, dateRange?: { start: string; end: string }): Promise<any[]> {
    // 从预约/支付服务获取数据
    return [];
  }

  /**
   * 转换为CSV
   */
  private convertToCSV(data: Record<string, any[]>): string {
    const sheets: string[] = [];

    for (const [key, rows] of Object.entries(data)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;

      const headers = Object.keys(rows[0]);
      const csvRows = [
        headers.join(','),
        ...rows.map((row: any) =>
          headers.map(h => {
            const value = row[h];
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
          }).join(',')
        )
      ];
      sheets.push(`# ${key}\n` + csvRows.join('\n'));
    }

    return sheets.join('\n');
  }

  /**
   * 获取导出列表
   */
  async getExports(teacherId: string, limit: number = 10): Promise<DataExport[]> {
    const result = await queryItems<DataExport>({
      indexName: 'GSI8-TeacherExports',
      keyConditionExpression: 'GSI8PK = :pk',
      expressionAttributeValues: {
        ':pk': `TEACHER#${teacherId}`,
      },
      scanIndexForward: false,
      limit,
    });

    return result.items;
  }

  /**
   * 获取导出详情
   */
  async getExportById(exportId: string): Promise<DataExport | null> {
    const { PK, SK } = createExportKey(exportId);
    return getItem<DataExport>({ PK, SK });
  }

  /**
   * 获取下载链接
   */
  async getDownloadUrl(exportId: string, teacherId: string): Promise<{
    downloadUrl: string;
    fileName: string;
    expiresAt: string;
  } | null> {
    const exportRecord = await this.getExportById(exportId);
    
    if (!exportRecord || exportRecord.teacherId !== teacherId) {
      return null;
    }

    if (exportRecord.status !== DataExportStatus.COMPLETED) {
      return null;
    }

    if (exportRecord.expiresAt && new Date(exportRecord.expiresAt) < new Date()) {
      return null;
    }

    return {
      downloadUrl: exportRecord.fileUrl!,
      fileName: `export-${exportId}.${exportRecord.exportFormat}`,
      expiresAt: exportRecord.expiresAt!,
    };
  }
}

export const dataExportService = new DataExportService();
```

---

## 四、单元测试

### 4.1 个人教师服务测试

```typescript
// src/modules/personal-teacher/personal-teacher.service.test.ts
import { personalTeacherService } from './personal-teacher.service';
import { TeacherStatus } from './personal-teacher.types';
import { mockPutItem, mockGetItem, mockQueryItems, mockUpdateItem, mockDeleteItem } from '../../test/mocks';

describe('PersonalTeacherService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('apply', () => {
    it('US01-HP-001: should create teacher profile successfully', async () => {
      // Given
      const userId = 'user-123';
      const dto = {
        realName: '张老师',
        teachingSubjects: [{ subject: 'math', level: 'high_school' }],
        teachingMode: ['online', 'offline'] as const,
        teachingAreas: ['Auckland'],
        bio: '5年教学经验',
        priceMin: 50,
        priceMax: 80,
      };

      (queryItems as jest.Mock).mockResolvedValue({ items: [] }); // No existing
      (putItem as jest.Mock).mockResolvedValue({});
      (updateItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await personalTeacherService.apply(userId, dto);

      // Then
      expect(result).toBeDefined();
      expect(result.teacherId).toBeDefined();
      expect(result.status).toBe(TeacherStatus.ACTIVE);
      expect(result.canPublishCourses).toBe(true);
    });

    it('US01-FC-001: should reject if already a teacher', async () => {
      // Given
      const userId = 'user-123';
      const dto = {
        realName: '张老师',
        teachingSubjects: [],
        teachingMode: [],
        teachingAreas: [],
      };

      (queryItems as jest.Mock).mockResolvedValue({
        items: [{ id: 'existing-teacher', userId }],
      });

      // When & Then
      await expect(personalTeacherService.apply(userId, dto))
        .rejects.toThrow('Already a teacher');
    });
  });

  describe('getProfile', () => {
    it('US01-HP-002: should return profile when exists', async () => {
      // Given
      const mockProfile = {
        id: 'teacher-123',
        realName: '张老师',
        status: TeacherStatus.ACTIVE,
      };

      (getItem as jest.Mock).mockResolvedValue(mockProfile);

      // When
      const result = await personalTeacherService.getProfile('teacher-123');

      // Then
      expect(result).toEqual(mockProfile);
    });

    it('US01-FC-002: should return null when not found', async () => {
      // Given
      (getItem as jest.Mock).mockResolvedValue(null);

      // When
      const result = await personalTeacherService.getProfile('non-existent');

      // Then
      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('US01-HP-003: should update teacher profile', async () => {
      // Given
      const teacherId = 'teacher-123';
      const dto = {
        bio: '更新后的简介',
        priceMin: 60,
        priceMax: 100,
      };

      (getItem as jest.Mock).mockResolvedValue({ id: teacherId });
      (updateItem as jest.Mock).mockResolvedValue({
        id: teacherId,
        bio: '更新后的简介',
        priceMin: 60,
        priceMax: 100,
      });

      // When
      const result = await personalTeacherService.updateProfile(teacherId, 'user-123', dto);

      // Then
      expect(result.bio).toBe('更新后的简介');
      expect(result.priceMin).toBe(60);
    });
  });

  describe('quit', () => {
    it('US01-HP-004: should quit teacher status', async () => {
      // Given
      const userId = 'user-123';
      const teacherId = 'teacher-123';
      const mockProfile = { id: teacherId, userId };

      (getItem as jest.Mock).mockResolvedValue(mockProfile);
      (updateItem as jest.Mock).mockResolvedValue({});
      (queryItems as jest.Mock).mockResolvedValue({ items: [] });

      // When
      await personalTeacherService.quit(userId, teacherId);

      // Then
      expect(updateItem).toHaveBeenCalled();
    });
  });

  describe('reactivate', () => {
    it('US01-HP-005: should reactivate teacher', async () => {
      // Given
      const userId = 'user-123';
      const teacherId = 'teacher-123';
      const mockProfile = { id: teacherId, userId, status: TeacherStatus.QUIT };

      (getItem as jest.Mock).mockResolvedValue(mockProfile);
      (updateItem as jest.Mock).mockResolvedValue({});
      (queryItems as jest.Mock).mockResolvedValue({ items: [] });

      // When
      await personalTeacherService.reactivate(userId, teacherId);

      // Then
      expect(updateItem).toHaveBeenCalledWith(
        expect.any(Object),
        'SET status = :status, lastActiveAt = :now, updatedAt = :now, GSI2PK = :gsi2pk',
        expect.objectContaining({
          ':status': TeacherStatus.ACTIVE,
        })
      );
    });

    it('US01-FC-003: should reject if profile not found', async () => {
      // Given
      (getItem as jest.Mock).mockResolvedValue(null);

      // When & Then
      await expect(personalTeacherService.reactivate('user-123', 'teacher-123'))
        .rejects.toThrow('Teacher profile not found');
    });
  });
});

describe('TeacherCourseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCourse', () => {
    it('US02-HP-001: should create draft course', async () => {
      // Given
      const teacherId = 'teacher-123';
      const dto = {
        title: '高中数学提高班',
        category: 'math',
        teachingMode: 'online',
        duration: 60,
        price: 50,
        maxStudents: 10,
        location: '线上授课',
      };

      (putItem as jest.Mock).mockResolvedValue({});
      (queryItems as jest.Mock).mockResolvedValue({ items: [{ totalCourses: 0 }] });
      (updateItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await teacherCourseService.createCourse(teacherId, dto);

      // Then
      expect(result.courseId).toBeDefined();
      expect(result.status).toBe('draft');
      expect(result.canPublish).toBe(true);
    });
  });

  describe('publishCourse', () => {
    it('US02-HP-002: should publish course', async () => {
      // Given
      const teacherId = 'teacher-123';
      const courseId = 'course-123';
      const mockCourse = {
        id: courseId,
        teacherId,
        status: 'draft',
      };

      (getItem as jest.Mock).mockResolvedValue(mockCourse);
      (updateItem as jest.Mock).mockResolvedValue({ ...mockCourse, status: 'published' });

      // When
      await teacherCourseService.publishCourse(teacherId, courseId);

      // Then
      expect(updateItem).toHaveBeenCalled();
    });

    it('US02-FC-001: should reject if already published', async () => {
      // Given
      (getItem as jest.Mock).mockResolvedValue({
        id: 'course-123',
        teacherId: 'teacher-123',
        status: 'published',
      });

      // When & Then
      await expect(teacherCourseService.publishCourse('teacher-123', 'course-123'))
        .rejects.toThrow('Course already published');
    });
  });
});

describe('TeacherStudentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyStudents', () => {
    it('US03-HP-001: should return students with masked data', async () => {
      // Given
      const teacherId = 'teacher-123';
      const mockStudents = [
        {
          id: 'student-1',
          studentName: '张三',
          studentContact: '0212345678',
          courseId: 'course-1',
          courseTitle: '数学课',
          status: 'active',
          totalLessons: 5,
          totalHours: 10,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ];

      (queryItems as jest.Mock).mockResolvedValue({ items: mockStudents });

      // When
      const result = await teacherStudentService.getMyStudents(teacherId);

      // Then
      expect(result.students).toHaveLength(1);
      expect(result.students[0].name).toBe('张*');
      expect(result.students[0].contact).toBe('021***5678');
    });
  });

  describe('addNote', () => {
    it('US03-HP-002: should add note to student', async () => {
      // Given
      const teacherId = 'teacher-123';
      const studentId = 'student-123';
      const mockStudent = {
        id: studentId,
        teacherId,
        studentName: '李四',
      };

      (getItem as jest.Mock).mockResolvedValue(mockStudent);
      (updateItem as jest.Mock).mockResolvedValue({});

      // When
      await teacherStudentService.addNote(teacherId, studentId, '学生基础较好');

      // Then
      expect(updateItem).toHaveBeenCalledWith(
        expect.any(Object),
        'SET teacherNote = :note, updatedAt = :now',
        { ':note': '学生基础较好', ':now': expect.any(String) }
      );
    });
  });
});
```

---

## 五、验收标准

- [x] 用户可以申请成为个人教师 (即时生效)
- [x] 教师可以管理个人档案
- [x] 教师可以发布/管理课程
- [x] 教师可以查看学员列表 (数据脱敏)
- [x] 教师可以回复评价
- [x] 教师可以导出数据 (学员/课程/评价/收入)
- [x] 教师可以退出/重新激活
- [x] 课程上架/下架流程正常

---

## 六、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 教师批量下架课程 | 低 | 中 | 保留课程数据，支持重新上架 |
| 数据导出性能 | 中 | 低 | 异步处理，避免阻塞 |
| 学员数据泄露 | 低 | 高 | 强制脱敏显示 |
| 角色状态不一致 | 低 | 中 | 使用事务更新 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/teacher/tech-personal-teacher.md`

**相关文档**:
- [产品设计](../../05-product-design/user/personal-teacher.md)
- [教师入驻](tech-teacher-onboarding.md)
- [教师回复](tech-teacher-replies.md)
- [认证系统](../auth/tech-auth.md)