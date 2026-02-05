---
title: 技术实现 - 教师入驻流程
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 2
priority: P0
status: pending-implementation
related_feature: ../../05-product-design/teacher/teacher-onboarding.md
---

# 技术实现: 教师入驻流程

> **对应产品文档**: [teacher-onboarding.md](../../05-product-design/teacher/teacher-onboarding.md) | **优先级**: P0 | **排期**: Phase 2 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      教师入驻流程技术架构                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   └── 微信小程序 (Taro)                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── GET /api/v1/teachers/application/status                       │
│   ├── POST /api/v1/teachers/application                             │
│   ├── PUT /api/v1/teachers/application                              │
│   ├── GET /api/v1/teachers/application/detail                       │
│   ├── GET /api/v1/teachers/profile                                  │
│   └── PUT /api/v1/teachers/profile                                  │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── TeacherApplicationService (申请服务)                          │
│   ├── TeacherVerificationService (认证服务)                          │
│   ├── TeacherProfileService (档案服务)                               │
│   └── ApplicationReviewService (审核服务)                            │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   ├── DynamoDB (FindClass-MainTable)                                 │
│   │   ├── APPLICATION#{applicationId}                               │
│   │   ├── TEACHER#{teacherId}                                       │
│   │   └── USER#{userId}#APPLICATION                                 │
│   └── S3 (文件存储)                                                  │
│       ├── qualifications/                                           │
│       └── avatars/                                                  │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [外部服务]                                                         │
│   ├── Email Service (SendGrid)                                      │
│   └── File Storage (S3)                                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/teacher-onboarding/
├── onboarding.types.ts        # 类型定义
├── onboarding.service.ts      # 业务逻辑
├── onboarding.controller.ts   # API 控制器
├── onboarding.routes.ts       # 路由配置
└── index.ts                   # 模块导出

07-backend/src/modules/teachers/
├── teachers.types.ts          # 教师类型
├── teachers.service.ts        # 教师服务
├── teachers.controller.ts     # 教师API
├── teachers.routes.ts         # 教师路由
└── index.ts                   # 模块导出

06-frontend/src/components/teacher/
├── TeacherOnboardingPage.tsx  # 入驻首页
├── ApplicationForm.tsx        # 申请表单
├── ApplicationStatus.tsx      # 申请状态
├── TeacherProfile.tsx         # 教师档案
└── DocumentUpload.tsx         # 文件上传
```

---

## 二、数据模型设计 (DynamoDB)

### 2.1 教师申请类型

```typescript
// src/modules/teacher-onboarding/onboarding.types.ts

/**
 * 申请类型枚举
 */
export enum ApplicationType {
  INDIVIDUAL = 'individual',     // 个人教师
  ORGANIZATION = 'organization', // 机构代表
  SENIOR = 'senior',             // 资深教师
}

/**
 * 申请状态枚举
 */
export enum ApplicationStatus {
  DRAFT = 'draft',               // 草稿
  PENDING = 'pending',           // 待审核
  REVIEWING = 'reviewing',       // 审核中
  APPROVED = 'approved',         // 审核通过
  REJECTED = 'rejected',         // 审核拒绝
  REVISION_REQUIRED = 'revision_required', // 需要补充材料
}

/**
 * 最高学历枚举
 */
export enum HighestEducation {
  HIGH_SCHOOL = 'high_school',
  BACHELOR = 'bachelor',
  MASTER = 'master',
  DOCTOR = 'doctor',
}

/**
 * 教学年限枚举
 */
export enum TeachingYears {
  ONE_TO_THREE = '1-3年',
  THREE_TO_FIVE = '3-5年',
  FIVE_TO_TEN = '5-10年',
  OVER_TEN = '10年以上',
}

/**
 * 机构类型枚举
 */
export enum OrganizationType {
  TRAINING_CENTER = 'training_center',
  SCHOOL = 'school',
  STUDIO = 'studio',
  OTHER = 'other',
}

/**
 * 教师资质类型
 */
export enum QualificationType {
  NZ_QUALIFICATION = 'nz_qualification',     // 新西兰教师资格
  INTERNATIONAL_QUALIFICATION = 'intl_qualification', // 国际资质
  PROFESSIONAL_CERTIFICATE = 'professional_certificate', // 专业证书
  OTHER = 'other',
}

/**
 * 信任等级
 */
export enum TrustLevel {
  S = 'S',
  A = 'A',
  B = 'B',
}

/**
 * 教师申请 DynamoDB 类型
 */
export interface TeacherApplication {
  // DynamoDB 主键
  PK: string;           // APPLICATION#{applicationId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'TEACHER_APPLICATION';
  dataCategory: 'TEACHER';
  id: string;
  
  // 申请人信息
  userId: string;
  email: string;
  phone?: string;
  
  // 入驻类型
  applicationType: ApplicationType;
  
  // 基础信息
  realName: string;
  city: string;
  teachingLanguages: string[];  // ['zh', 'en', 'bilingual']
  
  // 资质信息（个人教师）
  highestEducation?: HighestEducation;
  major?: string;
  teachingYears?: TeachingYears;
  qualifications?: Array<{
    type: QualificationType;
    name: string;
    institution?: string;
    year?: number;
    fileUrl?: string;
  }>;
  experienceDesc?: string;
  
  // 机构信息（机构入驻）
  orgName?: string;
  orgType?: OrganizationType;
  orgLicenseUrl?: string;
  orgAddress?: string;
  orgDescription?: string;
  orgFoundedYear?: number;
  
  // 形象展示
  avatarUrl?: string;
  bio?: string;
  achievements?: string;
  
  // 文件附件
  attachments?: Array<{
    type: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
  }>;
  
  // 审核信息
  status: ApplicationStatus;
  reviewerId?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  
  // 认证信息
  trustLevel?: TrustLevel;
  certificationDate?: string;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI10PK?: string;  // USER#{userId}
  GSI10SK?: string;  // APPLICATION#{createdAt}
  GSI11PK?: string;  // STATUS#{status}
  GSI11SK?: string;  // CREATED_AT#{createdAt}
}

/**
 * 教师档案 DynamoDB 类型
 */
export interface Teacher {
  // DynamoDB 主键
  PK: string;           // TEACHER#{teacherId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'TEACHER';
  dataCategory: 'TEACHER';
  id: string;
  
  // 用户关联
  userId: string;
  applicationId: string;
  
  // 基本信息
  name: string;
  avatarUrl?: string;
  bio?: string;
  city: string;
  teachingLanguages: string[];
  
  // 资质信息
  trustLevel: TrustLevel;
  verified: boolean;
  verifiedAt?: string;
  
  // 统计信息
  courseCount: number;
  studentCount: number;
  averageRating: number;
  totalReviews: number;
  
  // 状态
  status: 'active' | 'suspended' | 'inactive';
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI2PK?: string;  // USER#{userId}
  GSI2SK?: string;  // TEACHER#{createdAt}
  GSI12PK?: string;  // STATUS#{status}
  GSI12SK?: string;  // RATING#{averageRating}
}

/**
 * 入驻流程进度
 */
export interface ApplicationProgress {
  step: 'info' | 'qualification' | 'documents' | 'review' | 'complete';
  stepName: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

/**
 * 创建申请请求 DTO
 */
export interface CreateApplicationDto {
  applicationType: ApplicationType;
  realName: string;
  phone: string;
  email: string;
  city: string;
  teachingLanguages: string[];
  
  // 个人教师资质
  highestEducation?: HighestEducation;
  major?: string;
  teachingYears?: TeachingYears;
  qualifications?: Array<{
    type: QualificationType;
    name: string;
    institution?: string;
    year?: number;
  }>;
  experienceDesc?: string;
  
  // 机构信息
  orgName?: string;
  orgType?: OrganizationType;
  orgDescription?: string;
  orgFoundedYear?: number;
  
  // 形象展示
  bio?: string;
  achievements?: string;
}

/**
 * 更新申请请求 DTO
 */
export interface UpdateApplicationDto extends Partial<CreateApplicationDto> {
  status?: ApplicationStatus;
}

/**
 * 审核请求 DTO
 */
export interface ReviewApplicationDto {
  status: ApplicationStatus.APPROVED | ApplicationStatus.REJECTED | ApplicationStatus.REVISION_REQUIRED;
  trustLevel?: TrustLevel;
  reviewNotes?: string;
}

/**
 * 申请列表查询参数
 */
export interface ApplicationQueryParams {
  page?: number;
  limit?: number;
  status?: ApplicationStatus;
  applicationType?: ApplicationType;
  startDate?: string;
  endDate?: string;
}
```

### 2.2 实体键生成函数

```typescript
// src/modules/teacher-onboarding/onboarding.types.ts (续)

import { createEntityKey } from '@shared/db/dynamodb';

/**
 * 生成申请主键
 */
export function createApplicationKey(applicationId: string): { PK: string; SK: string } {
  return createEntityKey('APPLICATION', applicationId);
}

/**
 * 生成用户申请索引键
 */
export function createUserApplicationIndexKey(userId: string, createdAt: string): { PK: string; SK: string } {
  return {
    PK: `USER#${userId}`,
    SK: `APPLICATION#${createdAt}`,
  };
}

/**
 * 生成状态索引键
 */
export function createStatusIndexKey(status: string, createdAt: string): { PK: string; SK: string } {
  return {
    PK: `STATUS#${status}`,
    SK: `CREATED_AT#${createdAt}`,
  };
}

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
 * 获取审核时效（小时）
 */
export function getReviewTimeHours(applicationType: ApplicationType): number {
  switch (applicationType) {
    case ApplicationType.INDIVIDUAL:
      return 48;  // 24-48小时
    case ApplicationType.ORGANIZATION:
      return 72;  // 48-72小时
    case ApplicationType.SENIOR:
      return 120; // 3-5天
    default:
      return 48;
  }
}

/**
 * 获取默认信任等级
 */
export function getDefaultTrustLevel(applicationType: ApplicationType): TrustLevel {
  switch (applicationType) {
    case ApplicationType.SENIOR:
      return TrustLevel.S;
    default:
      return TrustLevel.A;
  }
}
```

---

## 三、业务逻辑实现

### 3.1 入驻申请服务

```typescript
// src/modules/teacher-onboarding/onboarding.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  TeacherApplication,
  Teacher,
  ApplicationType,
  ApplicationStatus,
  TrustLevel,
  CreateApplicationDto,
  UpdateApplicationDto,
  ReviewApplicationDto,
  ApplicationQueryParams,
  ApplicationProgress,
  createApplicationKey,
  createUserApplicationIndexKey,
  createStatusIndexKey,
  createTeacherKey,
  createUserTeacherIndexKey,
  getReviewTimeHours,
  getDefaultTrustLevel,
} from './onboarding.types';
import { putItem, getItem, queryItems, updateItem, deleteItem } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache, CacheKeys } from '@shared/db/cache';
import { sendEmail } from '@shared/smtp';
import { uploadFile } from '@shared/s3';

/**
 * 入驻服务类
 */
export class TeacherOnboardingService {
  /**
   * 创建入驻申请
   */
  async createApplication(userId: string, dto: CreateApplicationDto): Promise<{
    application: TeacherApplication;
    estimatedReviewTime: string;
  }> {
    // 检查是否有进行中的申请
    const existingApplication = await this.getActiveApplicationByUser(userId);
    if (existingApplication) {
      throw new Error('You already have an application in progress');
    }

    // 检查用户是否已是认证教师
    const existingTeacher = await this.getTeacherByUserId(userId);
    if (existingTeacher) {
      throw new Error('You are already a verified teacher');
    }

    const now = new Date().toISOString();
    const applicationId = uuidv4();

    // 构建申请记录
    const application: TeacherApplication = {
      ...createApplicationKey(applicationId),
      entityType: 'TEACHER_APPLICATION',
      dataCategory: 'TEACHER',
      id: applicationId,
      userId,
      email: dto.email,
      phone: dto.phone,
      applicationType: dto.applicationType,
      realName: dto.realName,
      city: dto.city,
      teachingLanguages: dto.teachingLanguages,
      highestEducation: dto.highestEducation,
      major: dto.major,
      teachingYears: dto.teachingYears,
      qualifications: dto.qualifications,
      experienceDesc: dto.experienceDesc,
      orgName: dto.orgName,
      orgType: dto.orgType,
      orgDescription: dto.orgDescription,
      orgFoundedYear: dto.orgFoundedYear,
      bio: dto.bio,
      achievements: dto.achievements,
      status: ApplicationStatus.PENDING,
      createdAt: now,
      updatedAt: now,
      GSI10PK: `USER#${userId}`,
      GSI10SK: `APPLICATION#${now}`,
      GSI11PK: `STATUS#${ApplicationStatus.PENDING}`,
      GSI11SK: `CREATED_AT#${now}`,
    };

    // 保存申请
    await putItem(application);

    // 创建用户申请索引
    const userApplicationIndex = {
      ...createUserApplicationIndexKey(userId, now),
      entityType: 'APPLICATION_INDEX',
      dataCategory: 'TEACHER',
      id: uuidv4(),
      applicationId,
      status: ApplicationStatus.PENDING,
      createdAt: now,
    };
    await putItem(userApplicationIndex);

    // 创建状态索引
    const statusIndex = {
      ...createStatusIndexKey(ApplicationStatus.PENDING, now),
      entityType: 'STATUS_INDEX',
      dataCategory: 'TEACHER',
      id: uuidv4(),
      applicationId,
      userId,
      createdAt: now,
    };
    await putItem(statusIndex);

    // 发送确认邮件
    await this.sendApplicationConfirmationEmail(application);

    // 清除用户申请缓存
    await deleteCache(`user:${userId}:applications`, 'TEACHER');

    logger.info('Application created', { applicationId, userId, applicationType: dto.applicationType });

    const estimatedHours = getReviewTimeHours(dto.applicationType);
    const estimatedReviewTime = `${estimatedHours}-${estimatedHours + 24}小时`;

    return { application, estimatedReviewTime };
  }

  /**
   * 获取用户进行中的申请
   */
  async getActiveApplicationByUser(userId: string): Promise<TeacherApplication | null> {
    const result = await queryItems<TeacherApplication>({
      indexName: 'GSI10-UserApplications',
      keyConditionExpression: 'GSI10PK = :pk AND begins_with(GSI10SK, :sk)',
      expressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'APPLICATION#',
      },
      limit: 5,
    });

    // 检查是否有进行中的申请
    const activeStatuses = [
      ApplicationStatus.DRAFT,
      ApplicationStatus.PENDING,
      ApplicationStatus.REVIEWING,
      ApplicationStatus.REVISION_REQUIRED,
    ];

    return result.items.find(a => activeStatuses.includes(a.status)) || null;
  }

  /**
   * 获取申请详情
   */
  async getApplicationById(applicationId: string): Promise<TeacherApplication | null> {
    const { PK, SK } = createApplicationKey(applicationId);
    return getItem<TeacherApplication>({ PK, SK });
  }

  /**
   * 获取用户的申请列表
   */
  async getUserApplications(userId: string): Promise<TeacherApplication[]> {
    const cacheKey = `user:${userId}:applications`;
    const cached = await getFromCache<TeacherApplication[]>(cacheKey, 'TEACHER');
    if (cached) {
      return cached;
    }

    const result = await queryItems<TeacherApplication>({
      indexName: 'GSI10-UserApplications',
      keyConditionExpression: 'GSI10PK = :pk AND begins_with(GSI10SK, :sk)',
      expressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'APPLICATION#',
      },
      scanIndexForward: false,
    });

    await setCache(cacheKey, 'TEACHER', result.items, 300);
    return result.items;
  }

  /**
   * 更新申请信息（审核被拒后可更新）
   */
  async updateApplication(applicationId: string, userId: string, dto: UpdateApplicationDto): Promise<TeacherApplication> {
    const application = await this.getApplicationById(applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    if (application.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (application.status !== ApplicationStatus.REJECTED && 
        application.status !== ApplicationStatus.REVISION_REQUIRED) {
      throw new Error('Can only update rejected or revision required applications');
    }

    const now = new Date().toISOString();

    // 构建更新表达式
    const updateParts: string[] = ['updatedAt = :now', 'status = :pending'];
    const values: Record<string, unknown> = {
      ':now': now,
      ':pending': ApplicationStatus.PENDING,
    };

    // 更新字段
    if (dto.realName) {
      updateParts.push('realName = :realName');
      values[':realName'] = dto.realName;
    }
    if (dto.city) {
      updateParts.push('city = :city');
      values[':city'] = dto.city;
    }
    if (dto.teachingLanguages) {
      updateParts.push('teachingLanguages = :teachingLanguages');
      values[':teachingLanguages'] = dto.teachingLanguages;
    }
    if (dto.highestEducation) {
      updateParts.push('highestEducation = :highestEducation');
      values[':highestEducation'] = dto.highestEducation;
    }
    if (dto.major) {
      updateParts.push('major = :major');
      values[':major'] = dto.major;
    }
    if (dto.teachingYears) {
      updateParts.push('teachingYears = :teachingYears');
      values[':teachingYears'] = dto.teachingYears;
    }
    if (dto.qualifications) {
      updateParts.push('qualifications = :qualifications');
      values[':qualifications'] = dto.qualifications;
    }
    if (dto.experienceDesc) {
      updateParts.push('experienceDesc = :experienceDesc');
      values[':experienceDesc'] = dto.experienceDesc;
    }
    if (dto.bio) {
      updateParts.push('bio = :bio');
      values[':bio'] = dto.bio;
    }

    const updated = await updateItem(
      createApplicationKey(applicationId),
      `SET ${updateParts.join(', ')}`,
      values
    ) as TeacherApplication;

    // 清除缓存
    await deleteCache(`user:${userId}:applications`, 'TEACHER');

    logger.info('Application updated', { applicationId });

    return updated;
  }

  /**
   * 审核申请（管理员）
   */
  async reviewApplication(
    applicationId: string, 
    adminId: string, 
    dto: ReviewApplicationDto
  ): Promise<{ application: TeacherApplication; teacher?: Teacher }> {
    const application = await this.getApplicationById(applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== ApplicationStatus.PENDING && 
        application.status !== ApplicationStatus.REVIEWING) {
      throw new Error('Application is not in reviewable status');
    }

    const now = new Date().toISOString();
    let teacher: Teacher | undefined;

    // 更新申请状态
    const updateResult = await updateItem(
      createApplicationKey(applicationId),
      `SET status = :status, 
            reviewerId = :reviewerId, 
            reviewNotes = :reviewNotes, 
            reviewedAt = :reviewedAt,
            trustLevel = :trustLevel,
            updatedAt = :now`,
      {
        ':status': dto.status,
        ':reviewerId': adminId,
        ':reviewNotes': dto.reviewNotes,
        ':reviewedAt': now,
        ':trustLevel': dto.trustLevel || getDefaultTrustLevel(application.applicationType),
        ':now': now,
      }
    ) as TeacherApplication;

    // 如果审核通过，创建教师档案
    if (dto.status === ApplicationStatus.APPROVED) {
      teacher = await this.createTeacherProfile(application, dto.trustLevel);
    }

    // 发送审核结果邮件
    await this.sendReviewResultEmail(application, dto.status, dto.reviewNotes);

    // 清除相关缓存
    await deleteCache(`user:${application.userId}:applications`, 'TEACHER');
    await deleteCache('admin:pendingApplications', 'TEACHER');

    logger.info('Application reviewed', { applicationId, adminId, status: dto.status });

    return { application: updateResult, teacher };
  }

  /**
   * 创建教师档案
   */
  private async createTeacherProfile(
    application: TeacherApplication, 
    trustLevel?: TrustLevel
  ): Promise<Teacher> {
    const now = new Date().toISOString();
    const teacherId = uuidv4();
    const level = trustLevel || getDefaultTrustLevel(application.applicationType);

    const teacher: Teacher = {
      ...createTeacherKey(teacherId),
      entityType: 'TEACHER',
      dataCategory: 'TEACHER',
      id: teacherId,
      userId: application.userId,
      applicationId: application.id,
      name: application.realName,
      avatarUrl: application.avatarUrl,
      bio: application.bio,
      city: application.city,
      teachingLanguages: application.teachingLanguages,
      trustLevel: level,
      verified: true,
      verifiedAt: now,
      courseCount: 0,
      studentCount: 0,
      averageRating: 0,
      totalReviews: 0,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      GSI2PK: `USER#${application.userId}`,
      GSI2SK: `TEACHER#${now}`,
      GSI12PK: `STATUS#active`,
      GSI12SK: `RATING#0`,
    };

    await putItem(teacher);

    // 更新用户角色
    // await userService.addUserRole(application.userId, 'TEACHER');

    logger.info('Teacher profile created', { teacherId, userId: application.userId });

    return teacher;
  }

  /**
   * 根据用户ID获取教师档案
   */
  async getTeacherByUserId(userId: string): Promise<Teacher | null> {
    const result = await queryItems<Teacher>({
      indexName: 'GSI2-UserTeachers',
      keyConditionExpression: 'GSI2PK = :pk AND begins_with(GSI2SK, :sk)',
      expressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'TEACHER#',
      },
      limit: 1,
    });

    return result.items.find(t => t.status === 'active') || null;
  }

  /**
   * 获取教师档案
   */
  async getTeacherById(teacherId: string): Promise<Teacher | null> {
    const { PK, SK } = createTeacherKey(teacherId);
    return getItem<Teacher>({ PK, SK });
  }

  /**
   * 获取申请进度
   */
  async getApplicationProgress(applicationId: string): Promise<ApplicationProgress[]> {
    const application = await this.getApplicationById(applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    const steps: ApplicationProgress[] = [
      { step: 'info', stepName: '基本信息', isCompleted: true, isCurrent: false },
      { 
        step: 'qualification', 
        stepName: '资质信息', 
        isCompleted: application.status !== ApplicationStatus.DRAFT,
        isCurrent: application.status === ApplicationStatus.DRAFT 
      },
      { 
        step: 'documents', 
        stepName: '资料上传', 
        isCompleted: application.attachments && application.attachments.length > 0,
        isCurrent: false 
      },
      { 
        step: 'review', 
        stepName: '审核中', 
        isCompleted: application.status === ApplicationStatus.APPROVED,
        isCurrent: [ApplicationStatus.PENDING, ApplicationStatus.REVIEWING].includes(application.status)
      },
      { 
        step: 'complete', 
        stepName: '完成', 
        isCompleted: application.status === ApplicationStatus.APPROVED,
        isCurrent: application.status === ApplicationStatus.APPROVED
      },
    ];

    return steps;
  }

  /**
   * 获取待审核申请列表（管理员）
   */
  async getPendingApplications(params: ApplicationQueryParams = {}): Promise<{
    applications: TeacherApplication[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page = 1, limit = 20, status = ApplicationStatus.PENDING } = params;

    const result = await queryItems<TeacherApplication>({
      indexName: 'GSI11-StatusIndex',
      keyConditionExpression: 'GSI11PK = :pk',
      expressionAttributeValues: {
        ':pk': `STATUS#${status}`,
      },
      limit: limit * 2,
      scanIndexForward: false,
    });

    const startIndex = (page - 1) * limit;
    const paginatedItems = result.items.slice(startIndex, startIndex + limit);

    return {
      applications: paginatedItems,
      pagination: {
        page,
        limit,
        total: result.items.length,
        totalPages: Math.ceil(result.items.length / limit),
      },
    };
  }

  /**
   * 上传资质文件
   */
  async uploadQualification(
    applicationId: string,
    userId: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
    }
  ): Promise<{ fileUrl: string; fileName: string }> {
    const application = await this.getApplicationById(applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    if (application.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (![ApplicationStatus.DRAFT, ApplicationStatus.REVISION_REQUIRED].includes(application.status)) {
      throw new Error('Cannot upload files in current status');
    }

    // 上传文件到 S3
    const fileName = `qualifications/${applicationId}/${uuidv4()}-${file.originalname}`;
    const fileUrl = await uploadFile(file.buffer, fileName, file.mimetype);

    // 更新申请记录
    const attachments = application.attachments || [];
    attachments.push({
      type: 'qualification',
      fileName: file.originalname,
      fileUrl,
      uploadedAt: new Date().toISOString(),
    });

    await updateItem(
      createApplicationKey(applicationId),
      'SET attachments = :attachments, updatedAt = :now',
      {
        ':attachments': attachments,
        ':now': new Date().toISOString(),
      }
    );

    logger.info('Qualification file uploaded', { applicationId, fileName });

    return { fileUrl, fileName: file.originalname };
  }

  // ============ 邮件通知 ============

  /**
   * 发送申请确认邮件
   */
  private async sendApplicationConfirmationEmail(application: TeacherApplication): Promise<void> {
    const estimatedHours = getReviewTimeHours(application.applicationType);
    const subject = 'Your Teacher Application has been submitted';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1890ff;">Application Submitted</h1>
        <p>Dear ${application.realName},</p>
        <p>Thank you for applying to become a teacher on EduSearch NZ. Your application has been received and is pending review.</p>
        <p><strong>Estimated Review Time:</strong> ${estimatedHours}-${estimatedHours + 24} hours</p>
        <p>You will receive an email notification once your application has been reviewed.</p>
        <hr />
        <p style="color: #666; font-size: 12px;">
          If you have any questions, please contact our support team.
        </p>
      </div>
    `;

    try {
      await sendEmail({ to: application.email, subject, html });
      logger.info('Application confirmation email sent', { applicationId: application.id });
    } catch (error) {
      logger.error('Failed to send application confirmation email', { applicationId: application.id, error });
    }
  }

  /**
   * 发送审核结果邮件
   */
  private async sendReviewResultEmail(
    application: TeacherApplication,
    status: ApplicationStatus,
    reviewNotes?: string
  ): Promise<void> {
    let subject: string;
    let content: string;

    switch (status) {
      case ApplicationStatus.APPROVED:
        subject = 'Congratulations! Your Teacher Application has been approved';
        content = `
          <h2>🎉 Congratulations!</h2>
          <p>Your teacher application has been approved. You can now start publishing courses on EduSearch NZ.</p>
          <p>Your trust level: ${application.trustLevel || 'A'}</p>
        `;
        break;
      case ApplicationStatus.REJECTED:
        subject = 'Update on your Teacher Application';
        content = `
          <h2>Application Update</h2>
          <p>Unfortunately, your teacher application was not approved this time.</p>
          <p><strong>Reason:</strong> ${reviewNotes || 'Did not meet our requirements'}</p>
          <p>You may submit a new application with updated information.</p>
        `;
        break;
      case ApplicationStatus.REVISION_REQUIRED:
        subject = 'Action Required: Your Teacher Application';
        content = `
          <h2>Additional Information Needed</h2>
          <p>Your application requires additional information or documents.</p>
          <p><strong>Notes:</strong> ${reviewNotes || 'Please review and update your application'}</p>
          <p>Please log in to your account to provide the required information.</p>
        `;
        break;
      default:
        return;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${content}
        <hr />
        <p style="color: #666; font-size: 12px;">
          If you have any questions, please contact our support team.
        </p>
      </div>
    `;

    try {
      await sendEmail({ to: application.email, subject, html });
      logger.info('Review result email sent', { applicationId: application.id, status });
    } catch (error) {
      logger.error('Failed to send review result email', { applicationId: application.id, error });
    }
  }
}

export const teacherOnboardingService = new TeacherOnboardingService();
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| **申请操作** |
| GET | /api/v1/teachers/application/status | 获取申请状态 | 检查是否有进行中的申请 |
| POST | /api/v1/teachers/application | 提交入驻申请 | 创建入驻申请 |
| PUT | /api/v1/teachers/application | 更新申请信息 | 审核被拒后可更新 |
| GET | /api/v1/teachers/application/detail | 获取申请详情 | 查看当前申请状态 |
| GET | /api/v1/teachers/application/progress | 获取进度 | 查看入驻进度 |
| **教师档案** |
| GET | /api/v1/teachers/profile | 获取教师主页 | 公开信息 |
| PUT | /api/v1/teachers/profile | 更新教师信息 | 基础信息修改 |
| **管理操作** |
| GET | /api/v1/admin/teachers/applications | 获取待审核列表 | 管理员 |
| POST | /api/v1/admin/teachers/applications/:id/review | 审核申请 | 管理员 |
| POST | /api/v1/teachers/application/upload | 上传资质文件 | 文件上传 |

### 4.2 API 详细设计

#### 4.2.1 POST /api/v1/teachers/application

**请求头**: Authorization: Bearer \<token\>

**请求示例**:
```json
{
  "applicationType": "individual",
  "realName": "张老师",
  "phone": "0211234567",
  "email": "teacher@example.com",
  "city": "Auckland",
  "teachingLanguages": ["chinese", "english"],
  "highestEducation": "master",
  "major": "数学",
  "teachingYears": "5-10年",
  "qualifications": [
    {
      "type": "nz_qualification",
      "name": "新西兰教师资格",
      "institution": "新西兰教育部",
      "year": 2015
    }
  ],
  "experienceDesc": "本人有8年高中数学教学经验...",
  "bio": "专注于高中数学辅导，帮助学生提升成绩",
  "achievements": "多名学生NCEA数学取得优异成绩"
}
```

**响应示例** (201):
```json
{
  "success": true,
  "message": "申请已提交，我们会在24-48小时内审核",
  "data": {
    "applicationId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "estimatedReviewTime": "24-48小时"
  }
}
```

#### 4.2.2 GET /api/v1/teachers/application/status

**响应示例** (200):
```json
{
  "success": true,
  "data": {
    "hasApplication": true,
    "applicationId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "applicationType": "individual",
    "submittedAt": "2026-01-15T14:30:00Z",
    "estimatedReviewTime": "24-48小时"
  }
}
```

#### 4.2.3 GET /api/v1/teachers/application/detail

**响应示例** (200):
```json
{
  "success": true,
  "data": {
    "applicationId": "550e8400-e29b-41d4-a716-446655440000",
    "applicationType": "individual",
    "status": "pending",
    "realName": "张老师",
    "city": "Auckland",
    "teachingLanguages": ["chinese", "english"],
    "highestEducation": "硕士",
    "major": "数学",
    "teachingYears": "5-10年",
    "qualifications": [
      {
        "type": "nz_qualification",
        "name": "新西兰教师资格"
      }
    ],
    "experienceDesc": "本人有8年高中数学教学经验...",
    "bio": "专注于高中数学辅导",
    "submittedAt": "2026-01-15T14:30:00Z"
  }
}
```

#### 4.2.4 POST /api/v1/admin/teachers/applications/:id/review

**请求头**: Authorization: Bearer \<admin-token\>

**请求示例**:
```json
{
  "status": "approved",
  "trustLevel": "A",
  "reviewNotes": "资质验证通过，同意入驻"
}
```

**响应示例** (200):
```json
{
  "success": true,
  "message": "Application reviewed successfully",
  "data": {
    "applicationId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "approved",
    "teacherId": "660e8400-e29b-41d4-a716-446655440001"
  }
}
```

---

## 五、前端实现

### 5.1 入驻申请表单

```typescript
// src/components/teacher/ApplicationForm.tsx
import React, { useState } from 'react';
import { Form, Input, Select, Upload, Button, Steps, Card, message, Row, Col } from 'antd';
import { UploadOutlined, UserOutlined, BankOutlined, FileTextOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { applicationApi } from '../../api/application';
import { ApplicationType } from '../../types/onboarding';

const { TextArea } = Input;
const { Option } = Select;

interface ApplicationFormProps {
  onSuccess: (applicationId: string) => void;
}

export const ApplicationForm: React.FC<ApplicationFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const steps = [
    { title: t('onboarding.step1'), icon: <UserOutlined /> },
    { title: t('onboarding.step2'), icon: <BankOutlined /> },
    { title: t('onboarding.step3'), icon: <FileTextOutlined /> },
  ];

  const handleSubmit = async (values: Record<string, unknown>) => {
    setLoading(true);
    try {
      const response = await applicationApi.createApplication({
        applicationType: values.applicationType as ApplicationType,
        realName: values.realName as string,
        phone: values.phone as string,
        email: values.email as string,
        city: values.city as string,
        teachingLanguages: values.teachingLanguages as string[],
        highestEducation: values.highestEducation as string,
        major: values.major as string,
        teachingYears: values.teachingYears as string,
        experienceDesc: values.experienceDesc as string,
        bio: values.bio as string,
        achievements: values.achievements as string,
      });

      message.success(t('onboarding.submitSuccess'));
      onSuccess(response.data.applicationId);
    } catch (error: any) {
      message.error(error.message || t('onboarding.submitError'));
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    try {
      await form.validateFields();
      setCurrentStep(currentStep + 1);
    } catch {
      // Validation failed
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  return (
    <div className="application-form">
      <Steps current={currentStep} items={steps} />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ applicationType: 'individual' }}
      >
        {/* Step 1: 基础信息 */}
        {currentStep === 0 && (
          <Card title={t('onboarding.basicInfo')} className="form-card">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="applicationType"
                  label={t('onboarding.applicationType')}
                  rules={[{ required: true }]}
                >
                  <Select>
                    <Option value="individual">{t('onboarding.individual')}</Option>
                    <Option value="organization">{t('onboarding.organization')}</Option>
                    <Option value="senior">{t('onboarding.senior')}</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="realName"
                  label={t('onboarding.realName')}
                  rules={[{ required: true, min: 2, max: 50 }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  label={t('onboarding.phone')}
                  rules={[{ required: true, pattern: /^0[0-9]{9}$/ }]}
                >
                  <Input placeholder="0212345678" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="email"
                  label={t('onboarding.email')}
                  rules={[{ required: true, type: 'email' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="city"
                  label={t('onboarding.city')}
                  rules={[{ required: true }]}
                >
                  <Select>
                    <Option value="Auckland">Auckland</Option>
                    <Option value="Wellington">Wellington</Option>
                    <Option value="Christchurch">Christchurch</Option>
                    <Option value="Hamilton">Hamilton</Option>
                    <Option value="Other">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="teachingLanguages"
                  label={t('onboarding.teachingLanguages')}
                  rules={[{ required: true }]}
                >
                  <Select mode="multiple">
                    <Option value="chinese">中文</Option>
                    <Option value="english">English</Option>
                    <Option value="bilingual">Bilingual</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>
        )}

        {/* Step 2: 资质信息 */}
        {currentStep === 1 && (
          <Card title={t('onboarding.qualificationInfo')} className="form-card">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="highestEducation"
                  label={t('onboarding.highestEducation')}
                  rules={[{ required: true }]}
                >
                  <Select>
                    <Option value="high_school">High School</Option>
                    <Option value="bachelor">Bachelor</Option>
                    <Option value="master">Master</Option>
                    <Option value="doctor">Doctor</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="major"
                  label={t('onboarding.major')}
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="teachingYears"
              label={t('onboarding.teachingYears')}
              rules={[{ required: true }]}
            >
              <Select>
                <Option value="1-3年">1-3 years</Option>
                <Option value="3-5年">3-5 years</Option>
                <Option value="5-10年">5-10 years</Option>
                <Option value="10年以上">10+ years</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="experienceDesc"
              label={t('onboarding.experienceDesc')}
              rules={[{ required: true, max: 500 }]}
            >
              <TextArea rows={4} maxLength={500} showCount />
            </Form.Item>
          </Card>
        )}

        {/* Step 3: 形象展示 */}
        {currentStep === 2 && (
          <Card title={t('onboarding.profileInfo')} className="form-card">
            <Form.Item
              name="bio"
              label={t('onboarding.bio')}
              rules={[{ required: true, max: 300 }]}
            >
              <TextArea rows={3} maxLength={300} showCount placeholder={t('onboarding.bioPlaceholder')} />
            </Form.Item>

            <Form.Item
              name="achievements"
              label={t('onboarding.achievements')}
            >
              <TextArea rows={3} maxLength={500} showCount placeholder={t('onboarding.achievementsPlaceholder')} />
            </Form.Item>

            <Form.Item
              name="qualifications"
              label={t('onboarding.qualifications')}
            >
              <Upload.Dragger multiple>
                <p className="ant-upload-drag-icon">
                  <UploadOutlined />
                </p>
                <p className="ant-upload-text">{t('onboarding.uploadHint')}</p>
                <p className="ant-upload-hint">PDF, JPG, PNG max 5MB each</p>
              </Upload.Dragger>
            </Form.Item>
          </Card>
        )}

        {/* 按钮组 */}
        <div className="form-actions">
          {currentStep > 0 && (
            <Button onClick={prevStep}>{t('onboarding.previous')}</Button>
          )}
          {currentStep < steps.length - 1 ? (
            <Button type="primary" onClick={nextStep}>
              {t('onboarding.next')}
            </Button>
          ) : (
            <Button type="primary" htmlType="submit" loading={loading}>
              {t('onboarding.submit')}
            </Button>
          )}
        </div>
      </Form>

      <style>{`
        .application-form {
          max-width: 800px;
          margin: 0 auto;
        }
        .form-card {
          margin-top: 24px;
          border-radius: 8px;
        }
        .form-actions {
          margin-top: 24px;
          display: flex;
          justify-content: space-between;
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
// src/modules/teacher-onboarding/onboarding.service.test.ts
import { teacherOnboardingService } from './onboarding.service';
import { mockPutItem, mockGetItem, mockQueryItems } from '../../test/mocks';

describe('TeacherOnboardingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createApplication', () => {
    it('should create application successfully', async () => {
      const userId = 'user-123';
      const dto = {
        applicationType: 'individual' as const,
        realName: '张老师',
        phone: '0211234567',
        email: 'teacher@example.com',
        city: 'Auckland',
        teachingLanguages: ['chinese', 'english'],
        highestEducation: 'master' as const,
        major: '数学',
        teachingYears: '5-10年' as const,
        experienceDesc: '有8年教学经验',
        bio: '专注于数学辅导',
      };

      // Mock no existing application
      (queryItems as jest.Mock).mockResolvedValue({ items: [] });

      (putItem as jest.Mock).mockResolvedValue({});

      const result = await teacherOnboardingService.createApplication(userId, dto);

      expect(result).toBeDefined();
      expect(result.application.userId).toBe(userId);
      expect(result.application.status).toBe('pending');
      expect(result.estimatedReviewTime).toBe('24-48小时');
    });

    it('should reject if user has active application', async () => {
      const userId = 'user-123';
      const dto = {
        applicationType: 'individual' as const,
        realName: '张老师',
        phone: '0211234567',
        email: 'teacher@example.com',
        city: 'Auckland',
        teachingLanguages: ['chinese'],
      };

      // Mock existing application
      (queryItems as jest.Mock).mockResolvedValue({
        items: [{ status: 'pending' }],
      });

      await expect(teacherOnboardingService.createApplication(userId, dto))
        .rejects.toThrow('You already have an application in progress');
    });
  });

  describe('reviewApplication', () => {
    it('should approve application and create teacher profile', async () => {
      const applicationId = 'app-123';
      const adminId = 'admin-1';
      const mockApplication = {
        id: applicationId,
        userId: 'user-123',
        applicationType: 'individual',
        realName: '张老师',
        email: 'teacher@example.com',
        status: 'pending',
      };

      (getItem as jest.Mock).mockResolvedValue(mockApplication);
      (updateItem as jest.Mock).mockResolvedValue({ ...mockApplication, status: 'approved' });
      (putItem as jest.Mock).mockResolvedValue({});

      const result = await teacherOnboardingService.reviewApplication(
        applicationId,
        adminId,
        { status: 'approved' as const, trustLevel: 'A' }
      );

      expect(result.application.status).toBe('approved');
      expect(result.teacher).toBeDefined();
      expect(result.teacher!.userId).toBe('user-123');
    });
  });
});
```

---

## 七、验收标准

- [ ] 用户可提交入驻申请
- [ ] 申请状态正确显示（pending/reviewing/approved/rejected）
- [ ] 管理员可审核申请
- [ ] 审核通过后自动创建教师档案
- [ ] 审核结果通知用户（邮件）
- [ ] 审核被拒后可重新申请
- [ ] 文件上传功能正常
- [ ] 管理后台功能完整

---

## 八、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 虚假申请 | 中 | 中 | 资质验证，人工审核 |
| 审核积压 | 低 | 中 | 自动化部分审核流程 |
| 审核标准不一致 | 中 | 低 | 制定详细审核指南 |
| 邮件发送失败 | 低 | 中 | 重试机制，备用通知 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/phase-2/tech-teacher-onboarding.md`

**相关文档**:
- [产品设计](../../05-product-design/teacher/teacher-onboarding.md)
- [教师评价系统](../phase-3/tech-course-reviews.md)
- [课程管理](tech-course-management.md)
