---
title: 技术实现 - 家长监护面板
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 3
priority: P0
status: pending-implementation
related_feature: ../../05-product-design/user/parental-controls.md
---

# 技术实现: 家长监护面板

> **对应产品文档**: [parental-controls.md](../../05-product-design/user/parental-controls.md) | **优先级**: P0 | **排期**: Phase 3 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      家长监护面板技术架构                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   └── 微信小程序 (Taro)                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── GET /api/v1/children                                          │
│   ├── POST /api/v1/children                                         │
│   ├── PUT /api/v1/children/:id                                      │
│   ├── DELETE /api/v1/children/:id                                   │
│   ├── GET /api/v1/children/:id/records                              │
│   ├── GET /api/v1/children/:id/reports                              │
│   ├── GET /api/v1/children/:id/stats                                │
│   └── PUT /api/v1/children/:id/privacy                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── ChildManagementService (孩子管理)                              │
│   ├── LearningRecordService (学习记录)                               │
│   ├── LearningReportService (学习报告)                               │
│   └── ParentalPrivacyService (隐私管理)                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   ├── DynamoDB (FindClass-MainTable)                                 │
│   │   ├── CHILD#{childId}                                           │
│   │   ├── USER#{userId}#CHILDREN                                    │
│   │   ├── LEARNING_RECORD#{recordId}                                │
│   │   ├── LEARNING_REPORT#{reportId}                                │
│   │   └── CHILD#{childId}#LEARNING_RECORDS                          │
│   └── DynamoDB (缓存)                                                   │
│       ├── child:{childId}                                           │
│       ├── child:{childId}:stats                                     │
│       └── child:{childId}:reports                                   │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [外部服务]                                                         │
│   ├── Report Generator (报告生成)                                    │
│   └── Notification Service (通知服务)                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/children/
├── children.types.ts         # 类型定义
├── children.service.ts       # 业务逻辑
├── children.controller.ts    # API 控制器
├── children.routes.ts        # 路由配置
└── index.ts                  # 模块导出

07-backend/src/modules/learning-records/
├── records.types.ts          # 类型定义
├── records.service.ts        # 学习记录服务
└── records.scheduler.ts      # 报告生成调度

06-frontend/src/components/parent/
├── ParentalDashboard.tsx     # 监护面板首页
├── ChildList.tsx             # 孩子列表
├── ChildDetail.tsx           # 孩子详情
├── AddChildForm.tsx          # 添加孩子表单
├── LearningReport.tsx        # 学习报告
├── LearningRecords.tsx       # 学习记录
├── PrivacySettings.tsx       # 隐私设置
└── ReportCard.tsx            # 报告卡片
```

---

## 二、数据模型设计 (DynamoDB)

### 2.1 孩子信息类型

```typescript
// src/modules/children/children.types.ts

/**
 * 年级枚举
 */
export enum GradeLevel {
  KINDERGARTEN = 'kindergarten',
  PRIMARY_Y1 = 'primary_y1',
  PRIMARY_Y2 = 'primary_y2',
  PRIMARY_Y3 = 'primary_y3',
  PRIMARY_Y4 = 'primary_y4',
  PRIMARY_Y5 = 'primary_y5',
  PRIMARY_Y6 = 'primary_y6',
  MIDDLE_Y7 = 'middle_y7',
  MIDDLE_Y8 = 'middle_y8',
  HIGH_Y9 = 'high_y9',
  HIGH_Y10 = 'high_y10',
  HIGH_Y11 = 'high_y11',
  HIGH_Y12 = 'high_y12',
  HIGH_Y13 = 'high_y13',
}

/**
 * 性别枚举
 */
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

/**
 * 内容筛选级别
 */
export enum ContentFilterLevel {
  STRICT = 'strict',           // 严格筛选
  AGE_APPROPRIATE = 'age_appropriate', // 适龄内容
  OPEN = 'open',               // 开放
}

/**
 * 孩子状态
 */
export enum ChildStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/**
 * 孩子 DynamoDB 类型
 */
export interface Child {
  // DynamoDB 主键
  PK: string;           // CHILD#{childId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'CHILD';
  dataCategory: 'USER';
  id: string;
  
  // 关联家长
  parentId: string;
  
  // 孩子信息
  name: string;
  dateOfBirth: string;
  gender?: Gender;
  grade?: GradeLevel;
  school?: string;
  subjects: string[];
  notes?: string;
  
  // 年龄验证
  ageVerified: boolean;
  verificationDoc?: string;
  
  // 隐私设置
  contentFilter: ContentFilterLevel;
  showInStats: boolean;
  dataSharingEnabled: boolean;
  
  // 统计信息
  totalLearningHours: number;
  totalCoursesCompleted: number;
  averageRating: number;
  currentStreak: number;
  
  // 状态
  status: ChildStatus;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI13PK?: string;  // USER#{parentId}
  GSI13SK?: string;  // CHILD#{createdAt}
  GSI14PK?: string;  // STATUS#{status}
  GSI14SK?: string;  // UPDATED_AT#{updatedAt}
}

/**
 * 孩子索引项
 */
export interface ChildIndex {
  PK: string;           // USER#{parentId}
  SK: string;           // CHILD#{createdAt}
  entityType: 'CHILD_INDEX';
  dataCategory: 'USER';
  id: string;
  childId: string;
  name: string;
  grade?: GradeLevel;
  status: ChildStatus;
  createdAt: string;
}

/**
 * 学习记录类型
 */
export enum LearningRecordType {
  BOOKING = 'booking',           // 预约
  COMPLETION = 'completion',      // 完成
  REVIEW = 'review',              // 评价
  MILESTONE = 'milestone',        // 里程碑
}

/**
 * 学习记录 DynamoDB 类型
 */
export interface LearningRecord {
  // DynamoDB 主键
  PK: string;           // LEARNING_RECORD#{recordId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'LEARNING_RECORD';
  dataCategory: 'USER';
  id: string;
  
  // 关联
  childId: string;
  parentId: string;
  userId: string;       // 家长ID
  courseId?: string;
  bookingId?: string;
  reviewId?: string;
  
  // 记录信息
  recordType: LearningRecordType;
  courseName?: string;
  teacherName?: string;
  bookingDate?: string;
  duration?: number;    // 学习时长（分钟）
  rating?: number;      // 评分（1-5）
  
  // 备注
  note?: string;
  parentNote?: string;
  
  // 标签
  tags?: string[];
  
  // 时间戳
  createdAt: string;
  
  // GSI 索引
  GSI15PK?: string;  // CHILD#{childId}
  GSI15SK?: string;  // CREATED_AT#{createdAt}
  GSI16PK?: string;  // PARENT#{parentId}
  GSI16SK?: string;  // CREATED_AT#{createdAt}
}

/**
 * 孩子学习记录索引
 */
export interface ChildLearningIndex {
  PK: string;           // CHILD#{childId}
  SK: string;           // LEARNING#{createdAt}
  entityType: 'LEARNING_INDEX';
  dataCategory: 'USER';
  id: string;
  recordId: string;
  recordType: LearningRecordType;
  createdAt: string;
}

/**
 * 学习报告类型
 */
export enum ReportType {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  SEMESTER = 'semester',
}

/**
 * 报告状态
 */
export enum ReportStatus {
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * 学习报告 DynamoDB 类型
 */
export interface LearningReport {
  // DynamoDB 主键
  PK: string;           // LEARNING_REPORT#{reportId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'LEARNING_REPORT';
  dataCategory: 'USER';
  id: string;
  
  // 关联
  childId: string;
  parentId: string;
  
  // 报告信息
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  
  // 报告内容
  content: ReportContent;
  
  // 统计摘要
  totalHours: number;
  coursesCompleted: number;
  averageRating: number;
  attendanceRate: number;
  
  // 状态
  status: ReportStatus;
  isRead: boolean;
  readAt?: string;
  
  // 时间戳
  createdAt: string;
  
  // GSI 索引
  GSI17PK?: string;  // CHILD#{childId}
  GSI17SK?: string;  // REPORT#{createdAt}
  GSI18PK?: string;  // PARENT#{parentId}
  GSI18SK?: string;  // CREATED_AT#{createdAt}
}

/**
 * 报告内容结构
 */
export interface ReportContent {
  // 统计摘要
  summary: {
    totalHours: number;
    coursesCompleted: number;
    averageRating: number;
    attendanceRate: number;
    learningTrend: 'up' | 'down' | 'stable';
    trendPercentage?: number;
  };
  
  // 亮点
  highlights: string[];
  
  // 建议
  recommendations: string[];
  
  // 课程详情
  courses: Array<{
    name: string;
    date: string;
    duration: number;
    rating?: number;
    teacherName?: string;
    notes?: string;
  }>;
  
  // 科目分布
  subjectBreakdown: Array<{
    subject: string;
    hours: number;
    percentage: number;
  }>;
  
  // 学习趋势数据
  trendData: Array<{
    date: string;
    hours: number;
    courses: number;
  }>;
}

/**
 * 添加孩子请求 DTO
 */
export interface CreateChildDto {
  name: string;
  dateOfBirth: string;
  gender?: Gender;
  grade?: GradeLevel;
  school?: string;
  subjects?: string[];
  notes?: string;
}

/**
 * 更新孩子请求 DTO
 */
export interface UpdateChildDto extends Partial<CreateChildDto> {
  contentFilter?: ContentFilterLevel;
  showInStats?: boolean;
  dataSharingEnabled?: boolean;
  status?: ChildStatus;
}

/**
 * 学习记录查询参数
 */
export interface LearningRecordQueryParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  recordType?: LearningRecordType;
}

/**
 * 学习统计
 */
export interface LearningStats {
  childId: string;
  childName: string;
  period: {
    start: string;
    end: string;
  };
  statistics: {
    totalHours: number;
    coursesCompleted: number;
    averageRating: number;
    attendanceRate: number;
    currentStreak: number;
    longestStreak: number;
  };
  trendData: Array<{
    date: string;
    hours: number;
    courses: number;
  }>;
  subjectBreakdown: Array<{
    subject: string;
    hours: number;
    percentage: number;
  }>;
}

/**
 * 报告生成请求
 */
export interface GenerateReportDto {
  childId: string;
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
}
```

### 2.2 实体键生成函数

```typescript
// src/modules/children/children.types.ts (续)

import { createEntityKey } from '@shared/db/dynamodb';

/**
 * 生成孩子主键
 */
export function createChildKey(childId: string): { PK: string; SK: string } {
  return createEntityKey('CHILD', childId);
}

/**
 * 生成用户孩子索引键
 */
export function createUserChildIndexKey(userId: string, createdAt: string): { PK: string; SK: string } {
  return {
    PK: `USER#${userId}`,
    SK: `CHILD#${createdAt}`,
  };
}

/**
 * 生成学习记录主键
 */
export function createLearningRecordKey(recordId: string): { PK: string; SK: string } {
  return createEntityKey('LEARNING_RECORD', recordId);
}

/**
 * 生成孩子学习记录索引键
 */
export function createChildLearningIndexKey(childId: string, createdAt: string): { PK: string; SK: string } {
  return {
    PK: `CHILD#${childId}`,
    SK: `LEARNING#${createdAt}`,
  };
}

/**
 * 生成学习报告主键
 */
export function createLearningReportKey(reportId: string): { PK: string; SK: string } {
  return createEntityKey('LEARNING_REPORT', reportId);
}

/**
 * 生成孩子报告索引键
 */
export function createChildReportIndexKey(childId: string, createdAt: string): { PK: string; SK: string } {
  return {
    PK: `CHILD#${childId}`,
    SK: `REPORT#${createdAt}`,
  };
}

/**
 * 根据出生日期计算年龄
 */
export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * 根据年龄推荐年级
 */
export function getRecommendedGrade(dateOfBirth: string): GradeLevel {
  const age = calculateAge(dateOfBirth);
  
  if (age <= 5) return GradeLevel.KINDERGARTEN;
  if (age >= 6 && age <= 10) return GradeLevel.PRIMARY_Y1;
  if (age >= 11 && age <= 12) return GradeLevel.MIDDLE_Y7;
  if (age >= 13 && age <= 17) return GradeLevel.HIGH_Y9;
  return GradeLevel.HIGH_Y9;
}

/**
 * 获取适龄内容筛选级别
 */
export function getAgeAppropriateFilterLevel(dateOfBirth: string): ContentFilterLevel {
  const age = calculateAge(dateOfBirth);
  
  if (age < 12) return ContentFilterLevel.STRICT;
  if (age < 16) return ContentFilterLevel.AGE_APPROPRIATE;
  return ContentFilterLevel.OPEN;
}
```

---

## 三、业务逻辑实现

### 3.1 孩子管理服务

```typescript
// src/modules/children/children.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  Child,
  ChildIndex,
  LearningRecord,
  LearningReport,
  LearningRecordType,
  ReportType,
  ReportStatus,
  ContentFilterLevel,
  ChildStatus,
  CreateChildDto,
  UpdateChildDto,
  LearningRecordQueryParams,
  LearningStats,
  createChildKey,
  createUserChildIndexKey,
  createLearningRecordKey,
  createChildLearningIndexKey,
  createLearningReportKey,
  createChildReportIndexKey,
  calculateAge,
  getRecommendedGrade,
  getAgeAppropriateFilterLevel,
} from './children.types';
import { putItem, getItem, queryItems, updateItem, deleteItem, batchGetItems } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache, CacheKeys } from '@shared/db/cache';

/**
 * 孩子管理服务类
 */
export class ChildManagementService {
  /**
   * 添加孩子
   */
  async createChild(parentId: string, dto: CreateChildDto): Promise<Child> {
    const now = new Date().toISOString();
    const childId = uuidv4();

    // 计算年龄和推荐年级
    const age = calculateAge(dto.dateOfBirth);
    const recommendedGrade = dto.grade || getRecommendedGrade(dto.dateOfBirth);
    const defaultFilterLevel = getAgeAppropriateFilterLevel(dto.dateOfBirth);

    const child: Child = {
      ...createChildKey(childId),
      entityType: 'CHILD',
      dataCategory: 'USER',
      id: childId,
      parentId,
      name: dto.name,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
      grade: dto.grade || recommendedGrade,
      school: dto.school,
      subjects: dto.subjects || [],
      notes: dto.notes,
      ageVerified: false,
      contentFilter: defaultFilterLevel,
      showInStats: true,
      dataSharingEnabled: false,
      totalLearningHours: 0,
      totalCoursesCompleted: 0,
      averageRating: 0,
      currentStreak: 0,
      status: ChildStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      GSI13PK: `USER#${parentId}`,
      GSI13SK: `CHILD#${now}`,
      GSI14PK: `STATUS#${ChildStatus.ACTIVE}`,
      GSI14SK: `UPDATED_AT#${now}`,
    };

    // 保存孩子
    await putItem(child);

    // 创建索引
    const childIndex: ChildIndex = {
      ...createUserChildIndexKey(parentId, now),
      entityType: 'CHILD_INDEX',
      dataCategory: 'USER',
      id: uuidv4(),
      childId,
      name: dto.name,
      grade: dto.grade || recommendedGrade,
      status: ChildStatus.ACTIVE,
      createdAt: now,
    };
    await putItem(childIndex);

    // 清除缓存
    await deleteCache(`parent:${parentId}:children`, 'USER');

    logger.info('Child created', { childId, parentId, name: dto.name });

    return child;
  }

  /**
   * 获取家长的孩子列表
   */
  async getChildrenByParent(parentId: string): Promise<Child[]> {
    const cacheKey = `parent:${parentId}:children`;
    const cached = await getFromCache<Child[]>(cacheKey, 'USER');
    if (cached) {
      return cached;
    }

    const result = await queryItems<Child>({
      indexName: 'GSI13-UserChildren',
      keyConditionExpression: 'GSI13PK = :pk AND begins_with(GSI13SK, :sk)',
      expressionAttributeValues: {
        ':pk': `USER#${parentId}`,
        ':sk': 'CHILD#',
      },
      scanIndexForward: false,
    });

    const activeChildren = result.items.filter(c => c.status === ChildStatus.ACTIVE);

    await setCache(cacheKey, 'USER', activeChildren, 300);
    return activeChildren;
  }

  /**
   * 获取孩子详情
   */
  async getChildById(childId: string): Promise<Child | null> {
    const { PK, SK } = createChildKey(childId);
    return getItem<Child>({ PK, SK });
  }

  /**
   * 更新孩子信息
   */
  async updateChild(childId: string, parentId: string, dto: UpdateChildDto): Promise<Child> {
    const child = await this.getChildById(childId);
    if (!child) {
      throw new Error('Child not found');
    }

    if (child.parentId !== parentId) {
      throw new Error('Unauthorized');
    }

    const now = new Date().toISOString();
    const updateParts: string[] = ['updatedAt = :now'];
    const values: Record<string, unknown> = { ':now': now };

    if (dto.name) {
      updateParts.push('name = :name');
      values[':name'] = dto.name;
    }
    if (dto.dateOfBirth) {
      updateParts.push('dateOfBirth = :dateOfBirth');
      values[':dateOfBirth'] = dto.dateOfBirth;
    }
    if (dto.grade) {
      updateParts.push('grade = :grade');
      values[':grade'] = dto.grade;
    }
    if (dto.school) {
      updateParts.push('school = :school');
      values[':school'] = dto.school;
    }
    if (dto.subjects) {
      updateParts.push('subjects = :subjects');
      values[':subjects'] = dto.subjects;
    }
    if (dto.notes) {
      updateParts.push('notes = :notes');
      values[':notes'] = dto.notes;
    }
    if (dto.contentFilter) {
      updateParts.push('contentFilter = :contentFilter');
      values[':contentFilter'] = dto.contentFilter;
    }
    if (dto.showInStats !== undefined) {
      updateParts.push('showInStats = :showInStats');
      values[':showInStats'] = dto.showInStats;
    }
    if (dto.dataSharingEnabled !== undefined) {
      updateParts.push('dataSharingEnabled = :dataSharingEnabled');
      values[':dataSharingEnabled'] = dto.dataSharingEnabled;
    }
    if (dto.status) {
      updateParts.push('status = :status');
      values[':status'] = dto.status;
      updateParts.push('GSI14PK = :gsi14pk');
      values[':gsi14pk'] = `STATUS#${dto.status}`;
    }

    const updated = await updateItem(
      createChildKey(childId),
      `SET ${updateParts.join(', ')}`,
      values
    ) as Child;

    // 清除缓存
    await deleteCache(`parent:${parentId}:children`, 'USER');
    await deleteCache(`child:${childId}`, 'USER');

    logger.info('Child updated', { childId });

    return updated;
  }

  /**
   * 删除孩子
   */
  async deleteChild(childId: string, parentId: string): Promise<void> {
    const child = await this.getChildById(childId);
    if (!child) {
      throw new Error('Child not found');
    }

    if (child.parentId !== parentId) {
      throw new Error('Unauthorized');
    }

    // 软删除 - 更新状态
    await updateItem(
      createChildKey(childId),
      'SET status = :status, updatedAt = :now',
      {
        ':status': ChildStatus.INACTIVE,
        ':now': new Date().toISOString(),
      }
    );

    // 清除缓存
    await deleteCache(`parent:${parentId}:children`, 'USER');
    await deleteCache(`child:${childId}`, 'USER');

    logger.info('Child deleted', { childId });
  }
}

/**
 * 学习记录服务类
 */
export class LearningRecordService {
  /**
   * 添加学习记录
   */
  async addRecord(parentId: string, dto: {
    childId: string;
    courseId?: string;
    bookingId?: string;
    reviewId?: string;
    recordType: LearningRecordType;
    courseName?: string;
    teacherName?: string;
    bookingDate?: string;
    duration?: number;
    rating?: number;
    note?: string;
    tags?: string[];
  }): Promise<LearningRecord> {
    // 验证孩子归属
    const child = await childManagementService.getChildById(dto.childId);
    if (!child || child.parentId !== parentId) {
      throw new Error('Child not found or unauthorized');
    }

    const now = new Date().toISOString();
    const recordId = uuidv4();

    const record: LearningRecord = {
      ...createLearningRecordKey(recordId),
      entityType: 'LEARNING_RECORD',
      dataCategory: 'USER',
      id: recordId,
      childId: dto.childId,
      parentId,
      userId: parentId,
      courseId: dto.courseId,
      bookingId: dto.bookingId,
      reviewId: dto.reviewId,
      recordType: dto.recordType,
      courseName: dto.courseName,
      teacherName: dto.teacherName,
      bookingDate: dto.bookingDate,
      duration: dto.duration,
      rating: dto.rating,
      note: dto.note,
      tags: dto.tags,
      createdAt: now,
      GSI15PK: `CHILD#${dto.childId}`,
      GSI15SK: `LEARNING#${now}`,
      GSI16PK: `PARENT#${parentId}`,
      GSI16SK: `LEARNING#${now}`,
    };

    await putItem(record);

    // 更新孩子统计
    await this.updateChildStats(dto.childId);

    // 清除缓存
    await deleteCache(`child:${dto.childId}:records`, 'USER');

    logger.info('Learning record added', { recordId, childId: dto.childId });

    return record;
  }

  /**
   * 获取孩子学习记录
   */
  async getChildRecords(
    childId: string,
    parentId: string,
    params: LearningRecordQueryParams = {}
  ): Promise<{
    records: LearningRecord[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const child = await childManagementService.getChildById(childId);
    if (!child || child.parentId !== parentId) {
      throw new Error('Child not found or unauthorized');
    }

    const { page = 1, limit = 20, startDate, endDate, recordType } = params;

    const result = await queryItems<LearningRecord>({
      indexName: 'GSI15-ChildRecords',
      keyConditionExpression: 'GSI15PK = :pk AND begins_with(GSI15SK, :sk)',
      expressionAttributeValues: {
        ':pk': `CHILD#${childId}`,
        ':sk': 'LEARNING#',
      },
      limit: limit * 2,
      scanIndexForward: false,
    });

    // 过滤
    let filtered = result.items;
    if (startDate) {
      filtered = filtered.filter(r => r.createdAt >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(r => r.createdAt <= endDate);
    }
    if (recordType) {
      filtered = filtered.filter(r => r.recordType === recordType);
    }

    // 分页
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    return {
      records: paginatedItems,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  }

  /**
   * 更新孩子统计
   */
  private async updateChildStats(childId: string): Promise<void> {
    // 获取所有学习记录
    const result = await queryItems<LearningRecord>({
      indexName: 'GSI15-ChildRecords',
      keyConditionExpression: 'GSI15PK = :pk AND begins_with(GSI15SK, :sk)',
      expressionAttributeValues: {
        ':pk': `CHILD#${childId}`,
        ':sk': 'LEARNING#',
      },
      limit: 1000,
    });

    const records = result.items;

    // 计算统计
    const totalHours = records.reduce((sum, r) => sum + (r.duration || 0), 0) / 60;
    const completions = records.filter(r => r.recordType === LearningRecordType.COMPLETION);
    const reviews = records.filter(r => r.recordType === LearningRecordType.REVIEW);
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : 0;

    // 获取预约和完成比例
    const bookings = records.filter(r => r.recordType === LearningRecordType.BOOKING);
    const attendanceRate = bookings.length > 0
      ? (completions.length / bookings.length) * 100
      : 100;

    await updateItem(
      createChildKey(childId),
      'SET totalLearningHours = :hours, totalCoursesCompleted = :completed, averageRating = :rating, attendanceRate = :attendance, updatedAt = :now',
      {
        ':hours': Math.round(totalHours * 100) / 100,
        ':completed': completions.length,
        ':rating': Math.round(avgRating * 10) / 10,
        ':attendance': Math.round(attendanceRate),
        ':now': new Date().toISOString(),
      }
    );
  }
}

/**
 * 学习报告服务类
 */
export class LearningReportService {
  /**
   * 生成学习报告
   */
  async generateReport(parentId: string, dto: {
    childId: string;
    reportType: ReportType;
    periodStart: string;
    periodEnd: string;
  }): Promise<LearningReport> {
    // 验证孩子归属
    const child = await childManagementService.getChildById(dto.childId);
    if (!child || child.parentId !== parentId) {
      throw new Error('Child not found or unauthorized');
    }

    const now = new Date().toISOString();
    const reportId = uuidv4();

    // 获取期间学习记录
    const records = await this.getRecordsForPeriod(dto.childId, dto.periodStart, dto.periodEnd);

    // 生成报告内容
    const content = await this.generateReportContent(dto.childId, records, dto.reportType);

    const report: LearningReport = {
      ...createLearningReportKey(reportId),
      entityType: 'LEARNING_REPORT',
      dataCategory: 'USER',
      id: reportId,
      childId: dto.childId,
      parentId,
      reportType: dto.reportType,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      content,
      totalHours: content.summary.totalHours,
      coursesCompleted: content.summary.coursesCompleted,
      averageRating: content.summary.averageRating,
      attendanceRate: content.summary.attendanceRate,
      status: ReportStatus.COMPLETED,
      isRead: false,
      createdAt: now,
      GSI17PK: `CHILD#${dto.childId}`,
      GSI17SK: `REPORT#${now}`,
      GSI18PK: `PARENT#${parentId}`,
      GSI18SK: `REPORT#${now}`,
    };

    await putItem(report);

    // 清除缓存
    await deleteCache(`child:${dto.childId}:reports`, 'USER');

    logger.info('Learning report generated', { reportId, childId: dto.childId });

    return report;
  }

  /**
   * 获取孩子的报告列表
   */
  async getChildReports(
    childId: string,
    parentId: string
  ): Promise<LearningReport[]> {
    const child = await childManagementService.getChildById(childId);
    if (!child || child.parentId !== parentId) {
      throw new Error('Child not found or unauthorized');
    }

    const result = await queryItems<LearningReport>({
      indexName: 'GSI17-ChildReports',
      keyConditionExpression: 'GSI17PK = :pk AND begins_with(GSI17SK, :sk)',
      expressionAttributeValues: {
        ':pk': `CHILD#${childId}`,
        ':sk': 'REPORT#',
      },
      scanIndexForward: false,
      limit: 50,
    });

    return result.items;
  }

  /**
   * 标记报告为已读
   */
  async markReportAsRead(reportId: string, parentId: string): Promise<void> {
    const report = await this.getReportById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    if (report.parentId !== parentId) {
      throw new Error('Unauthorized');
    }

    await updateItem(
      createLearningReportKey(reportId),
      'SET isRead = true, readAt = :readAt',
      { ':readAt': new Date().toISOString() }
    );
  }

  /**
   * 获取报告详情
   */
  async getReportById(reportId: string): Promise<LearningReport | null> {
    const { PK, SK } = createLearningReportKey(reportId);
    return getItem<LearningReport>({ PK, SK });
  }

  /**
   * 获取期间学习记录
   */
  private async getRecordsForPeriod(
    childId: string,
    startDate: string,
    endDate: string
  ): Promise<LearningRecord[]> {
    const result = await queryItems<LearningRecord>({
      indexName: 'GSI15-ChildRecords',
      keyConditionExpression: 'GSI15PK = :pk AND begins_with(GSI15SK, :sk)',
      expressionAttributeValues: {
        ':pk': `CHILD#${childId}`,
        ':sk': 'LEARNING#',
      },
      limit: 1000,
    });

    return result.items.filter(
      r => r.createdAt >= startDate && r.createdAt <= endDate
    );
  }

  /**
   * 生成报告内容
   */
  private async generateReportContent(
    childId: string,
    records: LearningRecord[],
    reportType: ReportType
  ): Promise<import('./children.types').ReportContent> {
    // 计算统计
    const totalHours = records.reduce((sum, r) => sum + (r.duration || 0), 0) / 60;
    const completions = records.filter(r => r.recordType === LearningRecordType.COMPLETION);
    const bookings = records.filter(r => r.recordType === LearningRecordType.BOOKING);
    const reviews = records.filter(r => r.recordType === LearningRecordType.REVIEW);
    
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : 0;
    
    const attendanceRate = bookings.length > 0
      ? (completions.length / bookings.length) * 100
      : 100;

    // 生成亮点
    const highlights: string[] = [];
    if (totalHours > 10) {
      highlights.push(`本周学习时长超过10小时`);
    }
    if (avgRating >= 4.5) {
      highlights.push(`教师评价平均分达到${avgRating.toFixed(1)}分`);
    }
    if (attendanceRate >= 90) {
      highlights.push(`保持${attendanceRate.toFixed(0)}%的课程出勤率`);
    }

    // 生成建议
    const recommendations: string[] = [];
    if (records.length < 3) {
      recommendations.push(`建议增加每周课程数量`);
    }
    if (avgRating < 4) {
      recommendations.push(`可以尝试不同类型的课程，找到最适合的`);
    }

    // 课程详情
    const courses = completions.map(r => ({
      name: r.courseName || '未知课程',
      date: r.bookingDate || r.createdAt.split('T')[0],
      duration: r.duration || 0,
      rating: r.rating,
      teacherName: r.teacherName,
      notes: r.note,
    }));

    // 科目分布（按标签分组）
    const subjectHours = new Map<string, number>();
    for (const record of records) {
      if (record.tags) {
        for (const tag of record.tags) {
          const hours = (subjectHours.get(tag) || 0) + ((record.duration || 0) / 60);
          subjectHours.set(tag, hours);
        }
      }
    }
    
    const subjectBreakdown = Array.from(subjectHours.entries()).map(([subject, hours]) => ({
      subject,
      hours: Math.round(hours * 100) / 100,
      percentage: Math.round((hours / (totalHours || 1)) * 100),
    }));

    // 学习趋势数据（按天汇总）
    const dailyData = new Map<string, { hours: number; courses: number }>();
    for (const record of records) {
      const date = record.createdAt.split('T')[0];
      const existing = dailyData.get(date) || { hours: 0, courses: 0 };
      existing.hours += (record.duration || 0) / 60;
      if (record.recordType === LearningRecordType.COMPLETION) {
        existing.courses += 1;
      }
      dailyData.set(date, existing);
    }

    const trendData = Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      hours: Math.round(data.hours * 100) / 100,
      courses: data.courses,
    })).sort((a, b) => a.date.localeCompare(b.date));

    // 计算趋势
    const trendPercentage = trendData.length >= 2
      ? ((trendData[trendData.length - 1].hours - trendData[0].hours) / (trendData[0].hours || 1)) * 100
      : 0;

    return {
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        coursesCompleted: completions.length,
        averageRating: Math.round(avgRating * 10) / 10,
        attendanceRate: Math.round(attendanceRate),
        learningTrend: trendPercentage > 5 ? 'up' : trendPercentage < -5 ? 'down' : 'stable',
        trendPercentage: Math.round(trendPercentage),
      },
      highlights,
      recommendations,
      courses,
      subjectBreakdown,
      trendData,
    };
  }
}

// 导出服务实例
export const childManagementService = new ChildManagementService();
export const learningRecordService = new LearningRecordService();
export const learningReportService = new LearningReportService();
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| **孩子管理** |
| GET | /api/v1/children | 获取孩子列表 | 家长查看孩子 |
| POST | /api/v1/children | 添加孩子 | 家长添加孩子 |
| GET | /api/v1/children/:id | 获取孩子详情 | 查看孩子信息 |
| PUT | /api/v1/children/:id | 更新孩子信息 | 修改孩子信息 |
| DELETE | /api/v1/children/:id | 删除孩子 | 软删除孩子 |
| **学习记录** |
| GET | /api/v1/children/:id/records | 获取学习记录 | 查看孩子学习 |
| **学习报告** |
| GET | /api/v1/children/:id/reports | 获取学习报告 | 查看报告列表 |
| POST | /api/v1/children/:id/reports | 生成报告 | 手动生成报告 |
| GET | /api/v1/children/:id/reports/:reportId | 获取报告详情 | 查看报告 |
| PUT | /api/v1/children/:id/reports/:reportId/read | 标记已读 | 标记报告已读 |
| **统计信息** |
| GET | /api/v1/children/:id/stats | 获取统计数据 | 查看统计 |
| **隐私设置** |
| PUT | /api/v1/children/:id/privacy | 更新隐私设置 | 管理隐私 |

### 4.2 API 详细设计

#### 4.2.1 GET /api/v1/children

**响应示例** (200):
```json
{
  "success": true,
  "data": {
    "children": [
      {
        "id": "child-001",
        "name": "张小明",
        "age": 12,
        "grade": "high_y7",
        "school": "奥克兰中学",
        "totalLearningHours": 4.5,
        "totalCoursesCompleted": 3,
        "averageRating": 4.8,
        "currentStreak": 5
      }
    ]
  }
}
```

#### 4.2.2 GET /api/v1/children/:id/reports

**响应示例** (200):
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "report-001",
        "reportType": "weekly",
        "periodStart": "2026-01-13",
        "periodEnd": "2026-01-19",
        "totalHours": 4.5,
        "coursesCompleted": 3,
        "averageRating": 4.8,
        "isRead": false,
        "createdAt": "2026-01-20T08:00:00Z"
      }
    ]
  }
}
```

#### 4.2.3 GET /api/v1/children/:id/reports/:reportId

**响应示例** (200):
```json
{
  "success": true,
  "data": {
    "reportId": "report-001",
    "childId": "child-001",
    "childName": "张小明",
    "reportType": "weekly",
    "period": "2026年1月第2周",
    "periodStart": "2026-01-13",
    "periodEnd": "2026-01-19",
    "statistics": {
      "totalHours": 4.5,
      "coursesCompleted": 3,
      "averageRating": 4.8,
      "attendanceRate": 100,
      "learningTrend": "up",
      "trendPercentage": 20
    },
    "highlights": [
      "本周学习时长较上周增长20%",
      "数学课程表现优异",
      "保持100%出勤率"
    ],
    "recommendations": [
      "建议增加英语听力练习",
      "可以尝试进阶数学课程"
    ],
    "courses": [
      {
        "name": "高中数学提高班",
        "date": "1月15日",
        "duration": 120,
        "rating": 5
      }
    ],
    "subjectBreakdown": [
      { "subject": "数学", "hours": 2, "percentage": 44 },
      { "subject": "钢琴", "hours": 1, "percentage": 22 }
    ],
    "createdAt": "2026-01-20T08:00:00Z"
  }
}
```

---

## 五、前端实现

### 5.1 家长监护面板

```typescript
// src/components/parent/ParentalDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, List, Tag, Progress, Statistic, Empty } from 'antd';
import { PlusOutlined, UserOutlined, BookOutlined, BarChartOutlined, SettingOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { childApi } from '../../api/child';
import { Child } from '../../types/child';
import { AddChildModal } from './AddChildModal';
import { ChildCard } from './ChildCard';
import { RecentActivity } from './RecentActivity';

export const ParentalDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    setLoading(true);
    try {
      const response = await childApi.getChildren();
      setChildren(response.data.children);
    } catch (error) {
      console.error('Failed to load children:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="parental-dashboard">
      <div className="dashboard-header">
        <h1>{t('parental.dashboardTitle')}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddModal(true)}>
          {t('parental.addChild')}
        </Button>
      </div>

      {/* 孩子卡片列表 */}
      <Row gutter={[16, 16]}>
        {children.map(child => (
          <Col xs={24} md={12} lg={8} key={child.id}>
            <ChildCard child={child} onUpdate={loadChildren} />
          </Col>
        ))}
      </Row>

      {/* 空状态 */}
      {children.length === 0 && !loading && (
        <Empty description={t('parental.noChildren')} image={Empty.PRESENTED_IMAGE_SIMPLE}>
          <Button type="primary" onClick={() => setShowAddModal(true)}>
            {t('parental.addFirstChild')}
          </Button>
        </Empty>
      )}

      {/* 最近活动 */}
      {children.length > 0 && (
        <Card title={t('parental.recentActivity')} className="activity-card">
          <RecentActivity childId={children[0].id} />
        </Card>
      )}

      {/* 添加孩子弹窗 */}
      <AddChildModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          loadChildren();
        }}
      />

      <style>{`
        .parental-dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .dashboard-header h1 {
          margin: 0;
          font-size: 24px;
        }
        .activity-card {
          margin-top: 24px;
        }
      `}</style>
    </div>
  );
};
```

---

## 六、测试用例

### 6.1 单元测试

```typescript
// src/modules/children/children.service.test.ts
import { childManagementService } from './children.service';
import { mockPutItem, mockGetItem, mockQueryItems, mockUpdateItem } from '../../test/mocks';

describe('ChildManagementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createChild', () => {
    it('should create child successfully', async () => {
      const parentId = 'parent-123';
      const dto = {
        name: '张小明',
        dateOfBirth: '2013-05-15',
        grade: 'high_y7',
        school: '奥克兰中学',
        subjects: ['数学', '英语'],
      };

      (putItem as jest.Mock).mockResolvedValue({});

      const result = await childManagementService.createChild(parentId, dto);

      expect(result).toBeDefined();
      expect(result.name).toBe('张小明');
      expect(result.parentId).toBe(parentId);
      expect(result.status).toBe('active');
    });

    it('should calculate age and set appropriate filter level', async () => {
      const parentId = 'parent-123';
      const dto = {
        name: '小学生',
        dateOfBirth: '2018-05-15', // 7岁
        subjects: [],
      };

      (putItem as jest.Mock).mockResolvedValue({});

      const result = await childManagementService.createChild(parentId, dto);

      // 7岁应该设置为 strict 或 age_appropriate
      expect(['strict', 'age_appropriate']).toContain(result.contentFilter);
    });
  });

  describe('updateChild', () => {
    it('should update child info', async () => {
      const childId = 'child-123';
      const parentId = 'parent-123';
      const mockChild = {
        id: childId,
        parentId,
        name: '张小明',
        status: 'active',
      };

      (getItem as jest.Mock).mockResolvedValue(mockChild);
      (updateItem as jest.Mock).mockResolvedValue({ ...mockChild, name: '张小华' });

      const result = await childManagementService.updateChild(childId, parentId, {
        name: '张小华',
      });

      expect(result.name).toBe('张小华');
    });

    it('should reject unauthorized update', async () => {
      const childId = 'child-123';
      const parentId = 'parent-456'; // 不同的家长

      (getItem as jest.Mock).mockResolvedValue({
        id: childId,
        parentId: 'parent-123',
      });

      await expect(childManagementService.updateChild(childId, parentId, { name: 'test' }))
        .rejects.toThrow('Unauthorized');
    });
  });
});
```

---

## 七、验收标准

- [ ] 孩子管理功能正常（增删改查）
- [ ] 学习记录准确记录
- [ ] 报告生成正确
- [ ] 隐私设置生效
- [ ] 统计数据显示正确
- [ ] 通知正常发送

---

## 八、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 数据不准确 | 低 | 中 | 多数据源校验 |
| 隐私泄露 | 低 | 高 | 严格权限控制 |
| 报告延迟 | 中 | 低 | 异步生成 |
| 并发问题 | 低 | 中 | 乐观锁 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/phase-3/tech-parental-controls.md`

**相关文档**:
- [产品设计](../../05-product-design/user/parental-controls.md)
- [用户中心](../phase-2/tech-user-center.md)
- [数据分析](tech-analytics.md)
