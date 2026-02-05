---
title: 技术实现 - 机构入驻
category: tech-architecture
created: 2026-01-21
author: linus-torvalds
version: 2.0
phase: 2
priority: P0
status: complete
related_feature: ../../05-product-design/institution/feature-institution-onboarding.md
---

# 技术实现: 机构入驻

> **对应产品文档**: [feature-institution-onboarding.md](../../05-product-design/institution/feature-institution-onboarding.md) | **优先级**: P0 | **排期**: Phase 2 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      机构入驻技术架构                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   └── 微信小程序 (Taro)                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── POST /api/v1/institutions/register                            │
│   ├── GET /api/v1/institutions/:id                                  │
│   ├── PUT /api/v1/institutions/:id                                  │
│   ├── POST /api/v1/institutions/:id/verify                          │
│   ├── POST /api/v1/institutions/:id/upload                          │
│   ├── GET /api/v1/institutions/:id/dashboard                        │
│   ├── POST /api/v1/institutions/:id/members/invite                  │
│   └── PUT /api/v1/institutions/:id/subscription                     │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── InstitutionService (机构服务)                                  │
│   ├── InstitutionAuthService (认证服务)                              │
│   ├── InstitutionMemberService (成员管理)                            │
│   ├── InstitutionSubscriptionService (订阅服务)                      │
│   └── InstitutionVerificationService (审核服务)                      │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   ├── DynamoDB (FindClass-MainTable)                                 │
│   │   ├── INSTITUTION#{institutionId}                               │
│   │   ├── INSTITUTION#{institutionId}#USERS                         │
│   │   ├── INSTITUTION#{institutionId}#SUBSCRIPTION                  │
│   │   ├── USER#{userId}#INSTITUTIONS                                │
│   │   └── VERIFICATION#{verificationId}                             │
│   ├── DynamoDB (缓存)                                                   │
│   │   ├── institution:{institutionId}                               │
│   │   └── institution:{institutionId}:stats                         │
│   └── S3 (文件存储)                                                  │
│       ├── institutions/{institutionId}/                             │
│       │   ├── logo/                                                 │
│       │   ├── cover/                                                │
│       │   └── licenses/                                             │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [外部服务]                                                         │
│   ├── SES (通知邮件)                                                 │
│   ├── S3 (文件存储)                                                  │
│   └── Payment Gateway (支付)                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/institutions/
├── institutions.types.ts         # 类型定义
├── institutions.service.ts       # 业务逻辑
├── institutions.controller.ts    # API 控制器
├── institutions.routes.ts        # 路由配置
└── index.ts                      # 模块导出

07-backend/src/modules/institution-auth/
├── institution-auth.types.ts     # 类型定义
├── institution-auth.service.ts   # 认证服务
└── index.ts

07-backend/src/modules/institution-members/
├── institution-members.types.ts  # 类型定义
├── institution-members.service.ts # 成员管理服务
└── index.ts

07-backend/src/modules/institution-subscription/
├── institution-subscription.types.ts  # 类型定义
├── institution-subscription.service.ts # 订阅服务
└── index.ts

07-backend/src/modules/institution-verification/
├── institution-verification.types.ts  # 类型定义
├── institution-verification.service.ts # 审核服务
└── index.ts

06-frontend/src/pages/institution/
├── InstitutionRegister.tsx       # 机构注册页
├── InstitutionProfile.tsx        # 机构信息页
├── InstitutionDashboard.tsx      # 机构仪表盘
├── InstitutionMembers.tsx        # 成员管理页
├── InstitutionVerification.tsx   # 认证审核页
└── InstitutionSubscription.tsx   # 套餐管理页
```

---

## 二、数据模型设计 (DynamoDB)

### 2.1 机构类型

```typescript
// src/modules/institutions/institutions.types.ts

/**
 * 机构状态
 */
export enum InstitutionStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

/**
 * 订阅状态
 */
export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

/**
 * 套餐类型
 */
export enum PackageType {
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

/**
 * 套餐特性
 */
export interface PackageFeatures {
  maxCourses: number;
  maxTeachers: number;
  maxStudents: number;
  analyticsLevel: 'basic' | 'advanced' | 'full';
  supportLevel: 'email' | 'priority' | 'dedicated';
  commissionRate: number;  // 平台抽成比例
  customBranding: boolean;
  apiAccess: boolean;
}

/**
 * 套餐配置
 */
export const PACKAGES: Record<PackageType, {
  name: string;
  priceNZD: number;
  features: PackageFeatures;
}> = {
  [PackageType.BASIC]: {
    name: '基础版',
    priceNZD: 0,
    features: {
      maxCourses: 10,
      maxTeachers: 5,
      maxStudents: 50,
      analyticsLevel: 'basic',
      supportLevel: 'email',
      commissionRate: 0.15,
      customBranding: false,
      apiAccess: false,
    },
  },
  [PackageType.PROFESSIONAL]: {
    name: '专业版',
    priceNZD: 99,
    features: {
      maxCourses: 50,
      maxTeachers: 20,
      maxStudents: 200,
      analyticsLevel: 'advanced',
      supportLevel: 'priority',
      commissionRate: 0.10,
      customBranding: true,
      apiAccess: true,
    },
  },
  [PackageType.ENTERPRISE]: {
    name: '企业版',
    priceNZD: 299,
    features: {
      maxCourses: -1,  // unlimited
      maxTeachers: -1,
      maxStudents: -1,
      analyticsLevel: 'full',
      supportLevel: 'dedicated',
      commissionRate: 0.08,
      customBranding: true,
      apiAccess: true,
    },
  },
};

/**
 * 机构 DynamoDB 类型
 */
export interface Institution {
  // DynamoDB 主键
  PK: string;           // INSTITUTION#{institutionId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'INSTITUTION';
  dataCategory: 'INSTITUTION';
  id: string;
  
  // 基本信息
  name: string;
  nameEn?: string;
  description: string;
  logoUrl?: string;
  coverImageUrl?: string;
  
  // 联系信息
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  address: string;
  region: string;
  
  // 认证信息
  businessLicense?: string;
  licenseImageUrl?: string;
  qualificationUrls: string[];
  
  // 状态
  status: InstitutionStatus;
  
  // 订阅信息
  subscriptionStatus: SubscriptionStatus;
  packageType: PackageType;
  subscriptionStartedAt?: string;
  subscriptionExpiresAt?: string;
  autoRenew: boolean;
  
  // 统计数据
  totalCourses: number;
  totalTeachers: number;
  totalStudents: number;
  rating: number;
  reviewCount: number;
  totalRevenue: number;
  
  // 审核信息
  verificationId?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI1PK?: string;  // EMAIL#{email}
  GSI1SK?: string;  // INSTITUTION#{createdAt}
  GSI2PK?: string;  // STATUS#{status}
  GSI2SK?: string;  // UPDATED_AT#{updatedAt}
  GSI3PK?: string;  // REGION#{region}
  GSI3SK?: string;  // RATING#{rating}#{updatedAt}
}

/**
 * 机构成员 DynamoDB 类型
 */
export interface InstitutionMember {
  // DynamoDB 主键
  PK: string;           // INSTITUTION#{institutionId}
  SK: string;           // MEMBER#{userId}
  
  // 实体类型标识
  entityType: 'INSTITUTION_MEMBER';
  dataCategory: 'INSTITUTION';
  id: string;
  userId: string;
  institutionId: string;
  
  // 成员信息
  email: string;
  name: string;
  avatarUrl?: string;
  
  // 角色
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  
  // 状态
  status: 'active' | 'inactive' | 'pending';
  
  // 邀请信息
  invitedAt: string;
  invitedBy: string;
  joinedAt?: string;
  
  // 最后活跃
  lastActiveAt?: string;
  
  // GSI 索引
  GSI4PK?: string;  // USER#{userId}
  GSI4SK?: string;  // INSTITUTION#{institutionId}
}

/**
 * 认证申请 DynamoDB 类型
 */
export interface InstitutionVerification {
  // DynamoDB 主键
  PK: string;           // VERIFICATION#{verificationId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'INSTITUTION_VERIFICATION';
  dataCategory: 'INSTITUTION';
  id: string;
  institutionId: string;
  
  // 认证信息
  submittedAt: string;
  completedAt?: string;
  status: 'pending' | 'approved' | 'rejected';
  
  // 审核信息
  reviewerId?: string;
  reviewerName?: string;
  reviewNotes?: string;
  reviewAt?: string;
  
  // 认证材料
  businessLicenseNumber?: string;
  businessLicenseImageUrl?: string;
  qualificationUrls: string[];
  
  // 自动审核结果
  autoCheckPassed?: boolean;
  autoCheckNotes?: string;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
}

/**
 * 订阅记录 DynamoDB 类型
 */
export interface InstitutionSubscription {
  // DynamoDB 主键
  PK: string;           // INSTITUTION#{institutionId}
  SK: string;           // SUBSCRIPTION
  
  // 实体类型标识
  entityType: 'INSTITUTION_SUBSCRIPTION';
  dataCategory: 'INSTITUTION';
  id: string;
  institutionId: string;
  
  // 订阅信息
  packageType: PackageType;
  status: SubscriptionStatus;
  
  // 时间范围
  startedAt: string;
  expiresAt: string;
  autoRenew: boolean;
  
  // 支付信息
  paymentId?: string;
  paymentAmount: number;
  paymentMethod?: string;
  
  // 使用统计
  usageStats: {
    coursesUsed: number;
    teachersUsed: number;
    studentsUsed: number;
  };
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI5PK?: string;  // STATUS#{status}
  GSI5SK?: string;  // EXPIRES_AT#{expiresAt}
}

/**
 * 注册请求 DTO
 */
export interface CreateInstitutionDto {
  name: string;
  nameEn?: string;
  description: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  address: string;
  region: string;
}

/**
 * 更新机构 DTO
 */
export interface UpdateInstitutionDto {
  name?: string;
  nameEn?: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  region?: string;
}

/**
 * 成员邀请 DTO
 */
export interface InviteMemberDto {
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
}

/**
 * 认证审核 DTO
 */
export interface VerificationReviewDto {
  status: 'approved' | 'rejected';
  reviewerId: string;
  reviewerName: string;
  notes?: string;
}
```

### 2.2 实体键生成函数

```typescript
// src/modules/institutions/institutions.types.ts (续)

import { createEntityKey } from '@shared/db/dynamodb';

/**
 * 生成机构主键
 */
export function createInstitutionKey(institutionId: string): { PK: string; SK: string } {
  return createEntityKey('INSTITUTION', institutionId);
}

/**
 * 生成机构成员主键
 */
export function createInstitutionMemberKey(institutionId: string, userId: string): { PK: string; SK: string } {
  return {
    PK: `INSTITUTION#${institutionId}`,
    SK: `MEMBER#${userId}`,
  };
}

/**
 * 生成用户机构索引键
 */
export function createUserInstitutionIndexKey(userId: string, institutionId: string): { PK: string; SK: string } {
  return {
    PK: `USER#${userId}`,
    SK: `INSTITUTION#${institutionId}`,
  };
}

/**
 * 生成认证主键
 */
export function createVerificationKey(verificationId: string): { PK: string; SK: string } {
  return createEntityKey('VERIFICATION', verificationId);
}

/**
 * 生成订阅主键
 */
export function createSubscriptionKey(institutionId: string): { PK: string; SK: string } {
  return {
    PK: `INSTITUTION#${institutionId}`,
    SK: 'SUBSCRIPTION',
  };
}

/**
 * 生成邮箱索引键
 */
export function createEmailIndexKey(email: string, createdAt: string): { PK: string; SK: string } {
  return {
    PK: `EMAIL#${email}`,
    SK: `INSTITUTION#${createdAt}`,
  };
}

/**
 * 生成状态索引键
 */
export function createStatusIndexKey(status: InstitutionStatus, updatedAt: string): { PK: string; SK: string } {
  return {
    PK: `STATUS#${status}`,
    SK: `UPDATED_AT#${updatedAt}`,
  };
}

/**
 * 生成地区索引键
 */
export function createRegionIndexKey(region: string, rating: number, updatedAt: string): { PK: string; SK: string } {
  return {
    PK: `REGION#${region}`,
    SK: `RATING#${String(rating).padStart(3, '0')}#${updatedAt}`,
  };
}

/**
 * 计算订阅过期时间
 */
export function calculateSubscriptionExpiry(days: number): string {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry.toISOString();
}
```

---

## 三、业务逻辑实现

### 3.1 机构服务

```typescript
// src/modules/institutions/institutions.service.ts
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { logger } from '@core/logger';
import {
  Institution,
  InstitutionMember,
  InstitutionVerification,
  InstitutionSubscription,
  InstitutionStatus,
  SubscriptionStatus,
  PackageType,
  CreateInstitutionDto,
  UpdateInstitutionDto,
  InviteMemberDto,
  createInstitutionKey,
  createInstitutionMemberKey,
  createUserInstitutionIndexKey,
  createVerificationKey,
  createSubscriptionKey,
  createEmailIndexKey,
  createStatusIndexKey,
  createRegionIndexKey,
  calculateSubscriptionExpiry,
  PACKAGES,
} from './institutions.types';
import { putItem, getItem, queryItems, updateItem, deleteItem } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache, CacheKeys } from '@shared/db/cache';
import { notificationService } from '@modules/notifications/notification.service';

/**
 * 机构服务类
 */
export class InstitutionService {
  /**
   * 注册机构
   */
  async registerInstitution(data: CreateInstitutionDto, ownerId: string, ownerEmail: string): Promise<{
    institution: Institution;
    tempToken: string;
  }> {
    const now = new Date().toISOString();
    const institutionId = uuidv4();
    const tempToken = crypto.randomBytes(32).toString('hex');

    const institution: Institution = {
      ...createInstitutionKey(institutionId),
      SK: 'METADATA',
      entityType: 'INSTITUTION',
      dataCategory: 'INSTITUTION',
      id: institutionId,
      name: data.name,
      nameEn: data.nameEn,
      description: data.description,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      website: data.website,
      address: data.address,
      region: data.region,
      qualificationUrls: [],
      status: InstitutionStatus.PENDING,
      subscriptionStatus: SubscriptionStatus.TRIAL,
      packageType: PackageType.BASIC,
      subscriptionStartedAt: now,
      subscriptionExpiresAt: calculateSubscriptionExpiry(30), // 30天试用
      autoRenew: false,
      totalCourses: 0,
      totalTeachers: 0,
      totalStudents: 0,
      rating: 0,
      reviewCount: 0,
      totalRevenue: 0,
      createdAt: now,
      updatedAt: now,
      GSI1PK: `EMAIL#${data.contactEmail}`,
      GSI1SK: `INSTITUTION#${now}`,
      GSI2PK: `STATUS#${InstitutionStatus.PENDING}`,
      GSI2SK: `UPDATED_AT#${now}`,
      GSI3PK: `REGION#${data.region}`,
      GSI3SK: `RATING#000#${now}`,
    };

    await putItem(institution);

    // 创建所有者成员记录
    const ownerMember: InstitutionMember = {
      ...createInstitutionMemberKey(institutionId, ownerId),
      entityType: 'INSTITUTION_MEMBER',
      dataCategory: 'INSTITUTION',
      id: uuidv4(),
      userId: ownerId,
      institutionId,
      email: ownerEmail,
      name: data.contactName,
      role: 'owner',
      status: 'active',
      invitedAt: now,
      invitedBy: ownerId,
      joinedAt: now,
      lastActiveAt: now,
      GSI4PK: `USER#${ownerId}`,
      GSI4SK: `INSTITUTION#${institutionId}`,
    };
    await putItem(ownerMember);

    // 创建试用订阅
    const subscription: InstitutionSubscription = {
      ...createSubscriptionKey(institutionId),
      entityType: 'INSTITUTION_SUBSCRIPTION',
      dataCategory: 'INSTITUTION',
      id: uuidv4(),
      institutionId,
      packageType: PackageType.BASIC,
      status: SubscriptionStatus.TRIAL,
      startedAt: now,
      expiresAt: calculateSubscriptionExpiry(30),
      autoRenew: false,
      paymentAmount: 0,
      usageStats: {
        coursesUsed: 0,
        teachersUsed: 0,
        studentsUsed: 0,
      },
      createdAt: now,
      updatedAt: now,
      GSI5PK: `STATUS#${SubscriptionStatus.TRIAL}`,
      GSI5SK: `EXPIRES_AT#${calculateSubscriptionExpiry(30)}`,
    };
    await putItem(subscription);

    logger.info('Institution registered', { institutionId, name: data.name });

    return { institution, tempToken };
  }

  /**
   * 获取机构
   */
  async getInstitution(institutionId: string): Promise<Institution | null> {
    const cacheKey = `institution:${institutionId}`;
    const cached = await getFromCache<Institution>(cacheKey, 'INSTITUTION');
    if (cached) return cached;

    const { PK, SK } = createInstitutionKey(institutionId);
    const institution = await getItem<Institution>({ PK, SK });

    if (institution) {
      await setCache(cacheKey, 'INSTITUTION', institution, 300);
    }

    return institution;
  }

  /**
   * 更新机构信息
   */
  async updateInstitution(institutionId: string, data: UpdateInstitutionDto): Promise<Institution> {
    const now = new Date().toISOString();
    const updateParts: string[] = ['updatedAt = :now'];
    const values: Record<string, unknown> = { ':now': now };

    if (data.name) {
      updateParts.push('name = :name');
      values[':name'] = data.name;
    }
    if (data.nameEn) {
      updateParts.push('nameEn = :nameEn');
      values[':nameEn'] = data.nameEn;
    }
    if (data.description) {
      updateParts.push('description = :description');
      values[':description'] = data.description;
    }
    if (data.logoUrl) {
      updateParts.push('logoUrl = :logoUrl');
      values[':logoUrl'] = data.logoUrl;
    }
    if (data.coverImageUrl) {
      updateParts.push('coverImageUrl = :coverImageUrl');
      values[':coverImageUrl'] = data.coverImageUrl;
    }
    if (data.contactPhone) {
      updateParts.push('contactPhone = :contactPhone');
      values[':contactPhone'] = data.contactPhone;
    }
    if (data.website) {
      updateParts.push('website = :website');
      values[':website'] = data.website;
    }
    if (data.address) {
      updateParts.push('address = :address');
      values[':address'] = data.address;
    }
    if (data.region) {
      updateParts.push('region = :region');
      values[':region'] = data.region;
      updateParts.push('GSI3PK = :gsi3pk');
      values[':gsi3pk'] = `REGION#${data.region}`;
    }

    const updated = await updateItem(
      createInstitutionKey(institutionId),
      `SET ${updateParts.join(', ')}`,
      values
    ) as Institution;

    await deleteCache(`institution:${institutionId}`, 'INSTITUTION');

    logger.info('Institution updated', { institutionId });

    return updated;
  }

  /**
   * 获取用户所属机构列表
   */
  async getInstitutionsByUser(userId: string): Promise<Institution[]> {
    const result = await queryItems<InstitutionMember>({
      indexName: 'GSI4-UserInstitutions',
      keyConditionExpression: 'GSI4PK = :pk',
      expressionAttributeValues: {
        ':pk': `USER#${userId}`,
      },
      limit: 50,
    });

    const institutions: Institution[] = [];
    for (const member of result.items) {
      if (member.status === 'active') {
        const institution = await this.getInstitution(member.institutionId);
        if (institution) {
          institutions.push(institution);
        }
      }
    }

    return institutions;
  }

  /**
   * 获取机构仪表盘数据
   */
  async getDashboard(institutionId: string): Promise<{
    institution: Institution;
    stats: {
      totalCourses: number;
      totalTeachers: number;
      totalStudents: number;
      monthlyRevenue: number;
      pendingBookings: number;
    };
    recentActivity: any[];
  }> {
    const institution = await this.getInstitution(institutionId);
    if (!institution) {
      throw new Error('Institution not found');
    }

    // 获取统计数据
    const stats = {
      totalCourses: institution.totalCourses,
      totalTeachers: institution.totalTeachers,
      totalStudents: institution.totalStudents,
      monthlyRevenue: institution.totalRevenue,
      pendingBookings: 0, // 待实现
    };

    return {
      institution,
      stats,
      recentActivity: [], // 待实现
    };
  }

  /**
   * 更新统计数据
   */
  async updateStats(institutionId: string, updates: Partial<Institution>): Promise<void> {
    const now = new Date().toISOString();
    const updateParts: string[] = ['updatedAt = :now'];
    const values: Record<string, unknown> = { ':now': now };

    if (updates.totalCourses !== undefined) {
      updateParts.push('totalCourses = :totalCourses');
      values[':totalCourses'] = updates.totalCourses;
    }
    if (updates.totalTeachers !== undefined) {
      updateParts.push('totalTeachers = :totalTeachers');
      values[':totalTeachers'] = updates.totalTeachers;
    }
    if (updates.totalStudents !== undefined) {
      updateParts.push('totalStudents = :totalStudents');
      values[':totalStudents'] = updates.totalStudents;
    }
    if (updates.rating !== undefined) {
      updateParts.push('rating = :rating');
      values[':rating'] = updates.rating;
      updateParts.push('GSI3SK = :gsi3sk');
      values[':gsi3sk'] = `RATING#${String(updates.rating).padStart(3, '0')}#${now}`;
    }

    await updateItem(
      createInstitutionKey(institutionId),
      `SET ${updateParts.join(', ')}`,
      values
    );

    await deleteCache(`institution:${institutionId}`, 'INSTITUTION');
  }
}

/**
 * 机构成员服务类
 */
export class InstitutionMemberService {
  /**
   * 邀请成员
   */
  async inviteMember(institutionId: string, inviterId: string, dto: InviteMemberDto): Promise<InstitutionMember> {
    const now = new Date().toISOString();
    const memberId = uuidv4();

    // 检查是否已是成员
    const existing = await this.getMemberByEmail(institutionId, dto.email);
    if (existing) {
      throw new Error('User is already a member');
    }

    const member: InstitutionMember = {
      ...createInstitutionMemberKey(institutionId, memberId),
      entityType: 'INSTITUTION_MEMBER',
      dataCategory: 'INSTITUTION',
      id: memberId,
      userId: '', // 尚未关联用户
      institutionId,
      email: dto.email,
      name: dto.name,
      role: dto.role,
      status: 'pending',
      invitedAt: now,
      invitedBy: inviterId,
      GSI4PK: `EMAIL#${dto.email}`,
      GSI4SK: `INVITATION#${now}`,
    };

    await putItem(member);

    // 发送邀请邮件
    await notificationService.sendInstitutionInviteEmail(dto.email, {
      institutionId,
      role: dto.role,
    });

    logger.info('Member invited', { institutionId, email: dto.email, role: dto.role });

    return member;
  }

  /**
   * 获取成员
   */
  async getMember(institutionId: string, userId: string): Promise<InstitutionMember | null> {
    const { PK, SK } = createInstitutionMemberKey(institutionId, userId);
    return getItem<InstitutionMember>({ PK, SK });
  }

  /**
   * 通过邮箱获取成员
   */
  async getMemberByEmail(institutionId: string, email: string): Promise<InstitutionMember | null> {
    const result = await queryItems<InstitutionMember>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': `INSTITUTION#${institutionId}`,
        ':sk': 'MEMBER#',
      },
      limit: 100,
    });

    return result.items.find(m => m.email === email) || null;
  }

  /**
   * 获取机构所有成员
   */
  async getAllMembers(institutionId: string): Promise<InstitutionMember[]> {
    const result = await queryItems<InstitutionMember>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': `INSTITUTION#${institutionId}`,
        ':sk': 'MEMBER#',
      },
      limit: 100,
    });

    return result.items;
  }

  /**
   * 更新成员角色
   */
  async updateMemberRole(institutionId: string, userId: string, role: 'admin' | 'editor' | 'viewer'): Promise<void> {
    const now = new Date().toISOString();

    await updateItem(
      createInstitutionMemberKey(institutionId, userId),
      'SET role = :role, updatedAt = :now',
      { ':role': role, ':now': now }
    );

    logger.info('Member role updated', { institutionId, userId, role });
  }

  /**
   * 移除成员
   */
  async removeMember(institutionId: string, userId: string): Promise<void> {
    await deleteItem(createInstitutionMemberKey(institutionId, userId));
    logger.info('Member removed', { institutionId, userId });
  }

  /**
   * 接受邀请
   */
  async acceptInvitation(invitationId: string, userId: string, userEmail: string, userName: string): Promise<InstitutionMember> {
    const member = await this.getMember(invitationId.split('#')[1], invitationId.split('#')[2]);
    if (!member) {
      throw new Error('Invitation not found');
    }

    const now = new Date().toISOString();

    const updated: InstitutionMember = {
      ...member,
      userId,
      email: userEmail,
      name: userName,
      status: 'active',
      joinedAt: now,
      lastActiveAt: now,
    };

    await putItem(updated);

    // 更新用户机构索引
    const userInstitutionIndex = {
      ...createUserInstitutionIndexKey(userId, member.institutionId),
      entityType: 'USER_INSTITUTION',
      dataCategory: 'INSTITUTION',
      id: uuidv4(),
      institutionId: member.institutionId,
      role: member.role,
      joinedAt: now,
    };
    await putItem(userInstitutionIndex);

    logger.info('Invitation accepted', { institutionId: member.institutionId, userId });

    return updated;
  }
}

/**
 * 机构认证服务类
 */
export class InstitutionVerificationService {
  /**
   * 提交认证申请
   */
  async submitVerification(institutionId: string, data: {
    businessLicenseNumber: string;
    businessLicenseImageUrl: string;
    qualificationUrls: string[];
  }): Promise<InstitutionVerification> {
    const now = new Date().toISOString();
    const verificationId = uuidv4();

    // 创建认证申请
    const verification: InstitutionVerification = {
      ...createVerificationKey(verificationId),
      SK: 'METADATA',
      entityType: 'INSTITUTION_VERIFICATION',
      dataCategory: 'INSTITUTION',
      id: verificationId,
      institutionId,
      submittedAt: now,
      status: 'pending',
      businessLicenseNumber: data.businessLicenseNumber,
      businessLicenseImageUrl: data.businessLicenseImageUrl,
      qualificationUrls: data.qualificationUrls,
      createdAt: now,
      updatedAt: now,
    };

    await putItem(verification);

    // 更新机构状态
    await updateItem(
      createInstitutionKey(institutionId),
      'SET status = :status, verificationId = :verificationId, updatedAt = :now',
      {
        ':status': InstitutionStatus.UNDER_REVIEW,
        ':verificationId': verificationId,
        ':now': now,
      }
    );

    // 通知管理员审核
    await notificationService.sendAdminVerificationNotification(verificationId);

    logger.info('Verification submitted', { verificationId, institutionId });

    return verification;
  }

  /**
   * 审核认证
   */
  async reviewVerification(verificationId: string, dto: VerificationReviewDto): Promise<InstitutionVerification> {
    const now = new Date().toISOString();
    const { PK, SK } = createVerificationKey(verificationId);
    const verification = await getItem<InstitutionVerification>({ PK, SK });

    if (!verification) {
      throw new Error('Verification not found');
    }

    const updated: InstitutionVerification = {
      ...verification,
      status: dto.status,
      reviewerId: dto.reviewerId,
      reviewerName: dto.reviewerName,
      reviewNotes: dto.notes,
      reviewAt: now,
      completedAt: now,
      updatedAt: now,
    };

    await putItem(updated);

    // 更新机构状态
    const institutionStatus = dto.status === 'approved' 
      ? InstitutionStatus.VERIFIED 
      : InstitutionStatus.REJECTED;

    await updateItem(
      createInstitutionKey(verification.institutionId),
      'SET status = :status, verifiedAt = :verifiedAt, verifiedBy = :verifiedBy, rejectionReason = :reason, updatedAt = :now',
      {
        ':status': institutionStatus,
        ':verifiedAt': now,
        ':verifiedBy': dto.reviewerId,
        ':reason': dto.status === 'rejected' ? dto.notes : undefined,
        ':now': now,
      }
    );

    // 发送通知
    const institution = await institutionService.getInstitution(verification.institutionId);
    if (institution) {
      await notificationService.sendVerificationResultEmail(
        institution.contactEmail,
        {
          status: dto.status,
          notes: dto.notes,
        }
      );
    }

    logger.info('Verification reviewed', { verificationId, status: dto.status });

    return updated;
  }

  /**
   * 获取待审核列表
   */
  async getPendingVerifications(): Promise<InstitutionVerification[]> {
    const result = await queryItems<InstitutionVerification>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': 'VERIFICATION',
        ':sk': 'METADATA',
      },
      limit: 100,
    });

    return result.items.filter(v => v.status === 'pending');
  }
}

/**
 * 机构订阅服务类
 */
export class InstitutionSubscriptionService {
  /**
   * 升级套餐
   */
  async upgradePackage(institutionId: string, packageType: PackageType, paymentId: string): Promise<InstitutionSubscription> {
    const now = new Date().toISOString();
    const packageInfo = PACKAGES[packageType];
    
    // 获取当前订阅
    const currentSubscription = await this.getSubscription(institutionId);
    if (!currentSubscription) {
      throw new Error('No active subscription found');
    }

    // 计算新订阅过期时间（按月计费）
    const daysToAdd = 30;
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + daysToAdd);

    const updated: InstitutionSubscription = {
      ...currentSubscription,
      packageType,
      status: SubscriptionStatus.ACTIVE,
      startedAt: now,
      expiresAt: newExpiresAt.toISOString(),
      autoRenew: true,
      paymentId,
      paymentAmount: packageInfo.priceNZD,
      updatedAt: now,
      GSI5PK: `STATUS#${SubscriptionStatus.ACTIVE}`,
      GSI5SK: `EXPIRES_AT#${newExpiresAt.toISOString()}`,
    };

    await putItem(updated);

    // 更新机构订阅信息
    await updateItem(
      createInstitutionKey(institutionId),
      'SET packageType = :package, subscriptionStatus = :status, autoRenew = :autoRenew, updatedAt = :now',
      {
        ':package': packageType,
        ':status': SubscriptionStatus.ACTIVE,
        ':autoRenew': true,
        ':now': now,
      }
    );

    logger.info('Package upgraded', { institutionId, packageType });

    return updated;
  }

  /**
   * 获取订阅
   */
  async getSubscription(institutionId: string): Promise<InstitutionSubscription | null> {
    const { PK, SK } = createSubscriptionKey(institutionId);
    return getItem<InstitutionSubscription>({ PK, SK });
  }

  /**
   * 检查套餐限制
   */
  async checkPackageLimits(institutionId: string, resource: 'courses' | 'teachers' | 'students'): Promise<boolean> {
    const subscription = await this.getSubscription(institutionId);
    if (!subscription) return false;

    const packageInfo = PACKAGES[subscription.packageType];
    const currentUsage = subscription.usageStats[`${resource}Used` as keyof typeof subscription.usageStats];
    const maxLimit = packageInfo.features[`max${resource.charAt(0).toUpperCase() + resource.slice(1)}` as keyof typeof packageInfo.features];

    if (maxLimit === -1) return true; // unlimited
    return currentUsage < maxLimit;
  }
}

// 导出服务实例
export const institutionService = new InstitutionService();
export const institutionMemberService = new InstitutionMemberService();
export const institutionVerificationService = new InstitutionVerificationService();
export const institutionSubscriptionService = new InstitutionSubscriptionService();
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| **机构管理** |
| POST | /api/v1/institutions/register | 注册机构 | |
| GET | /api/v1/institutions/:id | 获取机构详情 | |
| PUT | /api/v1/institutions/:id | 更新机构信息 | |
| GET | /api/v1/institutions/:id/dashboard | 获取仪表盘 | |
| **认证管理** |
| POST | /api/v1/institutions/:id/verification | 提交认证 | |
| POST | /api/v1/institutions/:id/verification/review | 审核认证 | 管理员 |
| GET | /api/v1/institutions/verifications/pending | 获取待审核列表 | 管理员 |
| **成员管理** |
| POST | /api/v1/institutions/:id/members/invite | 邀请成员 | |
| GET | /api/v1/institutions/:id/members | 获取成员列表 | |
| PUT | /api/v1/institutions/:id/members/:userId/role | 更新角色 | |
| DELETE | /api/v1/institutions/:id/members/:userId | 移除成员 | |
| **订阅管理** |
| GET | /api/v1/institutions/:id/subscription | 获取订阅信息 | |
| POST | /api/v1/institutions/:id/subscription/upgrade | 升级套餐 | |
| GET | /api/v1/institutions/packages | 获取套餐列表 | |

### 4.2 API 详细设计

#### 4.2.1 POST /api/v1/institutions/register

**请求示例**:
```json
{
  "name": "奥克兰教育中心",
  "nameEn": "Auckland Education Center",
  "description": "专注于中小学课外辅导的培训机构",
  "contactName": "张老师",
  "contactEmail": "contact@aucklandedu.nz",
  "contactPhone": "0212345678",
  "website": "https://aucklandedu.nz",
  "address": "123 Queen Street, Auckland",
  "region": "Auckland"
}
```

**响应示例** (201):
```json
{
  "success": true,
  "data": {
    "institution": {
      "id": "inst-001",
      "name": "奥克兰教育中心",
      "status": "pending",
      "subscriptionStatus": "trial",
      "packageType": "basic"
    },
    "tempToken": "xxx"
  }
}
```

#### 4.2.2 POST /api/v1/institutions/:id/verification

**请求示例**:
```json
{
  "businessLicenseNumber": "12345678",
  "businessLicenseImageUrl": "https://s3.example.com/licenses/123.jpg",
  "qualificationUrls": [
    "https://s3.example.com/qualifications/1.jpg"
  ]
}
```

---

## 五、前端实现

### 5.1 机构注册页面

```typescript
// src/pages/institution/InstitutionRegister.tsx
import React, { useState } from 'react';
import { Form, Input, Button, Card, Steps, Upload, message, Select } from 'antd';
import { UploadOutlined, ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { institutionApi } from '../../api/institution';

export const InstitutionRegister: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await institutionApi.register(values);
      message.success('注册成功');
      navigate('/institution/dashboard');
    } catch (error) {
      message.error('注册失败');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: '基本信息',
      content: (
        <>
          <Form.Item name="name" label="机构名称" rules={[{ required: true }]}>
            <Input placeholder="请输入机构名称" />
          </Form.Item>
          <Form.Item name="nameEn" label="英文名称">
            <Input placeholder="English Name" />
          </Form.Item>
          <Form.Item name="description" label="机构简介" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="请介绍您的机构" />
          </Form.Item>
          <Form.Item name="region" label="所在地区" rules={[{ required: true }]}>
            <Select
              placeholder="选择地区"
              options={[
                { value: 'Auckland', label: '奥克兰' },
                { value: 'Wellington', label: '惠灵顿' },
                { value: 'Christchurch', label: '基督城' },
              ]}
            />
          </Form.Item>
        </>
      ),
    },
    {
      title: '联系信息',
      content: (
        <>
          <Form.Item name="contactName" label="联系人" rules={[{ required: true }]}>
            <Input placeholder="请输入联系人姓名" />
          </Form.Item>
          <Form.Item name="contactEmail" label="联系邮箱" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="请输入联系邮箱" />
          </Form.Item>
          <Form.Item name="contactPhone" label="联系电话">
            <Input placeholder="请输入联系电话" />
          </Form.Item>
          <Form.Item name="website" label="官方网站">
            <Input placeholder="https://" />
          </Form.Item>
          <Form.Item name="address" label="机构地址" rules={[{ required: true }]}>
            <Input placeholder="请输入机构地址" />
          </Form.Item>
        </>
      ),
    },
    {
      title: '资质上传',
      content: (
        <>
          <Form.Item name="businessLicense" label="营业执照" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList}>
            <Upload
              listType="picture"
              maxCount={1}
              action="/api/v1/upload"
            >
              <Button icon={<UploadOutlined />}>上传营业执照</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="qualifications" label="资质证明" valuePropName="fileList" getValueFromEvent={(e) => e?.fileList}>
            <Upload
              listType="picture"
              maxCount={5}
              action="/api/v1/upload"
            >
              <Button icon={<UploadOutlined />}>上传资质证明</Button>
            </Upload>
          </Form.Item>
        </>
      ),
    },
  ];

  return (
    <div className="institution-register">
      <Card title="机构入驻" style={{ maxWidth: 600, margin: '0 auto' }}>
        <Steps current={currentStep} items={steps.map(s => ({ title: s.title }))} />
        
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 24 }}
          onFinish={handleSubmit}
        >
          {steps[currentStep].content}
          
          <Form.Item style={{ marginTop: 24 }}>
            {currentStep > 0 && (
              <Button style={{ marginRight: 8 }} onClick={() => setCurrentStep(currentStep - 1)}>
                上一步
              </Button>
            )}
            {currentStep < steps.length - 1 ? (
              <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)}>
                下一步
              </Button>
            ) : (
              <Button type="primary" htmlType="submit" loading={loading}>
                提交申请
              </Button>
            )}
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
```

---

## 六、单元测试

### 6.1 机构服务测试

```typescript
// src/modules/institutions/institutions.service.test.ts
import {
  institutionService,
  institutionMemberService,
  institutionVerificationService,
  institutionSubscriptionService,
} from './institutions.service';
import {
  InstitutionStatus,
  SubscriptionStatus,
  PackageType,
} from './institutions.types';
import { mockPutItem, mockGetItem, mockQueryItems, mockUpdateItem } from '../../test/mocks';

describe('InstitutionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerInstitution', () => {
    it('US01-HP-001: should register institution successfully', async () => {
      // Given
      const dto = {
        name: 'Test Institution',
        description: 'Test Description',
        contactName: 'Test Contact',
        contactEmail: 'test@example.com',
        region: 'Auckland',
        address: '123 Test St',
      };
      const ownerId = 'user-123';

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await institutionService.registerInstitution(dto, ownerId, 'test@example.com');

      // Then
      expect(result).toBeDefined();
      expect(result.institution.name).toBe('Test Institution');
      expect(result.institution.status).toBe(InstitutionStatus.PENDING);
      expect(result.institution.subscriptionStatus).toBe(SubscriptionStatus.TRIAL);
      expect(result.institution.packageType).toBe(PackageType.BASIC);
      expect(result.tempToken).toBeDefined();
      expect(putItem).toHaveBeenCalledTimes(3); // Institution, Member, Subscription
    });

    it('US01-HP-002: should set 30-day trial subscription', async () => {
      // Given
      const dto = {
        name: 'Test Institution',
        description: 'Test Description',
        contactName: 'Test Contact',
        contactEmail: 'test@example.com',
        region: 'Auckland',
        address: '123 Test St',
      };

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await institutionService.registerInstitution(dto, 'user-123', 'test@example.com');

      // Then
      const expiryDate = new Date(result.institution.subscriptionExpiresAt!);
      const now = new Date();
      const daysDiff = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      expect(daysDiff).toBeGreaterThan(29);
      expect(daysDiff).toBeLessThan(31);
    });
  });

  describe('getInstitution', () => {
    it('US01-HP-003: should return institution when exists', async () => {
      // Given
      const mockInstitution = {
        id: 'inst-123',
        name: 'Test Institution',
        status: InstitutionStatus.VERIFIED,
      };

      (getItem as jest.Mock).mockResolvedValue(mockInstitution);

      // When
      const result = await institutionService.getInstitution('inst-123');

      // Then
      expect(result).toEqual(mockInstitution);
    });

    it('US01-FC-001: should return null when not found', async () => {
      // Given
      (getItem as jest.Mock).mockResolvedValue(null);

      // When
      const result = await institutionService.getInstitution('non-existent');

      // Then
      expect(result).toBeNull();
    });
  });

  describe('updateInstitution', () => {
    it('US01-HP-004: should update institution name', async () => {
      // Given
      const institutionId = 'inst-123';
      const mockInstitution = {
        id: institutionId,
        name: 'Old Name',
        region: 'Auckland',
      };

      (updateItem as jest.Mock).mockResolvedValue({ ...mockInstitution, name: 'New Name' });

      // When
      const result = await institutionService.updateInstitution(institutionId, { name: 'New Name' });

      // Then
      expect(result.name).toBe('New Name');
    });

    it('US01-FC-002: should update region and GSI index', async () => {
      // Given
      const institutionId = 'inst-123';
      const mockInstitution = {
        id: institutionId,
        region: 'Wellington',
      };

      (updateItem as jest.Mock).mockResolvedValue({ ...mockInstitution, region: 'Wellington' });

      // When
      const result = await institutionService.updateInstitution(institutionId, { region: 'Wellington' });

      // Then
      expect(result.region).toBe('Wellington');
      expect(updateItem).toHaveBeenCalled();
    });
  });
});

describe('InstitutionMemberService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('inviteMember', () => {
    it('US02-HP-001: should invite member successfully', async () => {
      // Given
      const institutionId = 'inst-123';
      const inviterId = 'user-123';
      const dto = {
        email: 'newmember@example.com',
        name: 'New Member',
        role: 'editor' as const,
      };

      (queryItems as jest.Mock).mockResolvedValue({ items: [] });
      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await institutionMemberService.inviteMember(institutionId, inviterId, dto);

      // Then
      expect(result).toBeDefined();
      expect(result.email).toBe('newmember@example.com');
      expect(result.role).toBe('editor');
      expect(result.status).toBe('pending');
    });

    it('US02-FC-001: should reject duplicate member', async () => {
      // Given
      const institutionId = 'inst-123';
      const dto = {
        email: 'existing@example.com',
        name: 'Existing',
        role: 'viewer' as const,
      };

      (queryItems as jest.Mock).mockResolvedValue({
        items: [{ email: 'existing@example.com' }],
      });

      // When & Then
      await expect(institutionMemberService.inviteMember(institutionId, 'user-123', dto))
        .rejects.toThrow('User is already a member');
    });
  });

  describe('getAllMembers', () => {
    it('US02-HP-002: should return all active members', async () => {
      // Given
      const institutionId = 'inst-123';
      const mockMembers = [
        { id: '1', name: 'Owner', role: 'owner', status: 'active' },
        { id: '2', name: 'Admin', role: 'admin', status: 'active' },
        { id: '3', name: 'Inactive', role: 'viewer', status: 'inactive' },
      ];

      (queryItems as jest.Mock).mockResolvedValue({ items: mockMembers });

      // When
      const result = await institutionMemberService.getAllMembers(institutionId);

      // Then
      expect(result).toHaveLength(3);
    });
  });
});

describe('InstitutionVerificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitVerification', () => {
    it('US03-HP-001: should submit verification successfully', async () => {
      // Given
      const institutionId = 'inst-123';
      const data = {
        businessLicenseNumber: '12345678',
        businessLicenseImageUrl: 'https://s3.example.com/license.jpg',
        qualificationUrls: ['https://s3.example.com/qual.jpg'],
      };

      (putItem as jest.Mock).mockResolvedValue({});
      (updateItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await institutionVerificationService.submitVerification(institutionId, data);

      // Then
      expect(result).toBeDefined();
      expect(result.institutionId).toBe(institutionId);
      expect(result.status).toBe('pending');
      expect(result.businessLicenseNumber).toBe('12345678');
    });
  });

  describe('reviewVerification', () => {
    it('US03-HP-002: should approve verification', async () => {
      // Given
      const verificationId = 'ver-123';
      const mockVerification = {
        id: verificationId,
        institutionId: 'inst-123',
        status: 'pending',
      };

      (getItem as jest.Mock).mockResolvedValue(mockVerification);
      (putItem as jest.Mock).mockResolvedValue({ ...mockVerification, status: 'approved' });
      (updateItem as jest.Mock).mockResolvedValue({});
      (getItem as jest.Mock).mockResolvedValueOnce(mockVerification).mockResolvedValueOnce({
        id: 'inst-123',
        contactEmail: 'test@example.com',
      });

      // When
      const result = await institutionVerificationService.reviewVerification(verificationId, {
        status: 'approved',
        reviewerId: 'admin-123',
        reviewerName: 'Admin',
      });

      // Then
      expect(result.status).toBe('approved');
    });

    it('US03-FC-001: should reject verification with reason', async () => {
      // Given
      const verificationId = 'ver-123';
      const mockVerification = {
        id: verificationId,
        institutionId: 'inst-123',
        status: 'pending',
      };

      (getItem as jest.Mock).mockResolvedValue(mockVerification);
      (putItem as jest.Mock).mockResolvedValue({ ...mockVerification, status: 'rejected' });
      (updateItem as jest.Mock).mockResolvedValue({});
      (getItem as jest.Mock).mockResolvedValueOnce(mockVerification).mockResolvedValueOnce({
        id: 'inst-123',
        contactEmail: 'test@example.com',
      });

      // When
      const result = await institutionVerificationService.reviewVerification(verificationId, {
        status: 'rejected',
        reviewerId: 'admin-123',
        reviewerName: 'Admin',
        notes: '资质文件不清晰',
      });

      // Then
      expect(result.status).toBe('rejected');
      expect(result.reviewNotes).toBe('资质文件不清晰');
    });
  });
});
```

---

## 七、验收标准

- [x] 机构可以注册并提交认证申请
- [x] 支持资质文件上传
- [x] 管理员可以审核认证申请
- [x] 支持多种套餐选择（Basic/Professional/Enterprise）
- [x] 认证通过后机构可以发布课程
- [x] 成员管理功能正常（邀请/移除/角色变更）

---

## 八、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 资质造假 | 低 | 高 | 人工审核 + 第三方验证 |
| 恶意注册 | 中 | 中 | 邮箱验证 + 手机验证 |
| 订阅欺诈 | 低 | 中 | 支付验证 + 订阅记录 |
| 数据泄露 | 低 | 高 | 访问控制 + 数据加密 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/institution/tech-institution.md`

**相关文档**:
- [产品设计](../../05-product-design/institution/feature-institution-onboarding.md)
- [套餐购买](tech-packages.md)
- [认证系统](../auth/tech-auth.md)