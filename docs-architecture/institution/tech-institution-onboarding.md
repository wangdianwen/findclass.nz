---
title: 技术实现 - 机构入驻流程
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 2
priority: P0
status: complete
related_feature: ../../05-product-design/institution/institution-onboarding.md
---

# 技术实现: 机构入驻流程

> **对应产品文档**: [institution-onboarding.md](../../05-product-design/institution/institution-onboarding.md) | **优先级**: P0 | **排期**: Phase 2 | **状态**: 待实现

---

## 一、数据模型 (DynamoDB)

```typescript
// src/modules/institution-onboarding/institution-onboarding.types.ts

/**
 * 机构申请状态
 */
export enum ApplicationStatus {
  PENDING = 'pending',         // 待审核
  REVIEWING = 'reviewing',     // 审核中
  APPROVED = 'approved',       // 审核通过
  REJECTED = 'rejected',       // 审核拒绝
  NEEDS_REVISION = 'needs_revision',  // 需要补充材料
}

/**
 * 机构规模类型
 */
export enum InstitutionScale {
  SMALL = 'small',             // 小型 1-5名教师
  MEDIUM = 'medium',           // 中型 6-20名教师
  LARGE = 'large',             // 大型 20+教师
}

/**
 * 订阅计划类型
 */
export enum SubscriptionPlan {
  BASIC = 'basic',             // 基础版
  PROFESSIONAL = 'professional', // 专业版
  ENTERPRISE = 'enterprise',   // 企业版
}

/**
 * 订阅状态
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  TRIAL = 'trial',
}

/**
 * 订阅周期
 */
export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

/**
 * 机构入驻申请表
 */
export interface InstitutionApplication {
  PK: string;                  // APPLICATION#{applicationId}
  SK: string;                  // METADATA
  entityType: 'INSTITUTION_APPLICATION';
  dataCategory:INSTITUTION';
  id: string;
  userId: string;              // 关联用户账号

  // 机构基础信息
  name: string;
  nameEn: string;
  type: string;                // training_center, school, studio, online, other
  city: string;
  address: string;
  phone: string;
  email: string;

  // 资质信息
  businessLicenseUrl: string;
  businessLicenseNumber: string;
  legalPersonName: string;
  legalPersonIdUrl: string;
  educationLicenseUrl?: string; // 可选
  establishedYear: number;

  // 机构介绍
  description: string;
  teachingPhilosophy?: string;
  achievements?: string;

  // 形象展示
  logoUrl: string;
  environmentPhotos?: string[];

  // 管理员信息
  adminName: string;
  adminPhone: string;
  adminEmail: string;

  // 规模信息
  scale: InstitutionScale;
  teacherCount?: number;

  // 审核信息
  status: ApplicationStatus;
  reviewerId?: string;
  reviewNotes?: string;
  reviewedAt?: string;

  // 认证等级
  trustLevel: 'basic' | 'advanced' | 'premium';

  // 时间戳
  createdAt: string;
  updatedAt: string;

  GSI1PK?: string;             // USER#{userId}
  GSI1SK?: string;             // APPLICATION#{createdAt}
  GSI2PK?: string;             // STATUS#{status}
  GSI2SK?: string;             // CREATED_AT#{createdAt}
}

/**
 * 机构表（审核通过后创建）
 */
export interface Institution {
  PK: string;                  // INSTITUTION#{institutionId}
  SK: string;                  // METADATA
  entityType: 'INSTITUTION';
  dataCategory: 'INSTITUTION';
  id: string;
  applicationId: string;
  userId: string;

  // 机构信息
  name: string;
  nameEn: string;
  type: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  description: string;
  teachingPhilosophy?: string;
  achievements?: string;
  environmentPhotos?: string[];

  // 认证信息
  trustLevel: 'basic' | 'advanced' | 'premium';
  verified: boolean;
  verifiedAt?: string;

  // 订阅信息
  subscriptionId?: string;
  subscriptionPlan: SubscriptionPlan | null;
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionExpiresAt?: string;

  // 统计信息
  courseCount: number;
  totalStudents: number;
  averageRating: number;
  reviewCount: number;

  // 推广信息
  promotionBalance: number;

  // 状态
  status: 'active' | 'suspended' | 'closed';

  // 时间戳
  createdAt: string;
  updatedAt: string;

  GSI3PK?: string;             // CITY#{city}
  GSI3SK?: string;             // RATING#{averageRating}
  GSI4PK?: string;             // STATUS#{status}
  GSI4SK?: string;             // CREATED_AT#{createdAt}
}

/**
 * 机构订阅表
 */
export interface InstitutionSubscription {
  PK: string;                  // SUBSCRIPTION#{subscriptionId}
  SK: string;                  // METADATA
  entityType: 'INSTITUTION_SUBSCRIPTION';
  dataCategory: 'INSTITUTION';
  id: string;
  institutionId: string;

  // 套餐信息
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  amount: number;

  // 支付信息
  paymentMethod: 'bank_transfer' | 'poli' | 'credit_card';
  transactionId?: string;

  // 状态
  status: SubscriptionStatus;

  // 时间
  startsAt: string;
  expiresAt: string;
  cancelledAt?: string;
  renewedAt?: string;

  // 促销信息
  discountPercent?: number;
  promoCode?: string;

  // 时间戳
  createdAt: string;
  updatedAt: string;

  GSI5PK?: string;             // INSTITUTION#{institutionId}
  GSI5SK?: string;             // SUBSCRIPTION#{createdAt}
}

/**
 * 订阅计划配置
 */
export interface SubscriptionPlanConfig {
  id: SubscriptionPlan;
  name: string;
  nameEn: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: {
    courseLimit: number;
    trustLevel: 'basic' | 'advanced' | 'premium';
    statistics: 'basic' | 'detailed' | 'full';
    promotionBalance: number;
    support: 'email' | 'priority' | 'dedicated';
    homePageRecommendation: boolean;
    apiAccess: boolean;
    teamMembers: number;
  };
  recommended?: boolean;
}

/**
 * 套餐计划配置表
 */
export interface SubscriptionPlanItem {
  PK: string;                  // PLAN#{planId}
  SK: string;                  // METADATA
  entityType: 'SUBSCRIPTION_PLAN';
  dataCategory: 'CONFIG';
  id: string;
  planId: string;
  config: SubscriptionPlanConfig;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 二、辅助函数

```typescript
// src/modules/institution-onboarding/institution-onboarding.helpers.ts

import { v4 as uuidv4 } from 'uuid';
import {
  InstitutionApplication,
  Institution,
  InstitutionSubscription,
  SubscriptionPlanItem,
  ApplicationStatus,
  InstitutionScale,
  SubscriptionPlan,
  SubscriptionStatus,
  BillingCycle,
} from './institution-onboarding.types';

export function createApplicationKey(applicationId: string): {
  PK: string;
  SK: string;
} {
  return {
    PK: `APPLICATION#${applicationId}`,
    SK: 'METADATA',
  };
}

export function createInstitutionKey(institutionId: string): {
  PK: string;
  SK: string;
} {
  return {
    PK: `INSTITUTION#${institutionId}`,
    SK: 'METADATA',
  };
}

export function createSubscriptionKey(subscriptionId: string): {
  PK: string;
  SK: string;
} {
  return {
    PK: `SUBSCRIPTION#${subscriptionId}`,
    SK: 'METADATA',
  };
}

export function createUserApplicationsIndexKey(userId: string): {
  GSI1PK: string;
  GSI1SK: string;
} {
  const now = new Date().toISOString();
  return {
    GSI1PK: `USER#${userId}`,
    GSI1SK: `APPLICATION#${now}`,
  };
}

export function createStatusIndexKey(status: ApplicationStatus): {
  GSI2PK: string;
  GSI2SK: string;
} {
  const now = new Date().toISOString();
  return {
    GSI2PK: `STATUS#${status}`,
    GSI2SK: `CREATED_AT#${now}`,
  };
}

export function getSubscriptionPlanFeatures(plan: SubscriptionPlan) {
  const plans: Record<SubscriptionPlan, SubscriptionPlanConfig> = {
    [SubscriptionPlan.BASIC]: {
      id: SubscriptionPlan.BASIC,
      name: '基础版',
      nameEn: 'Basic',
      monthlyPrice: 99,
      yearlyPrice: 990,
      features: {
        courseLimit: 5,
        trustLevel: 'basic',
        statistics: 'basic',
        promotionBalance: 0,
        support: 'email',
        homePageRecommendation: false,
        apiAccess: false,
        teamMembers: 1,
      },
    },
    [SubscriptionPlan.PROFESSIONAL]: {
      id: SubscriptionPlan.PROFESSIONAL,
      name: '专业版',
      nameEn: 'Professional',
      monthlyPrice: 199,
      yearlyPrice: 1990,
      features: {
        courseLimit: 20,
        trustLevel: 'advanced',
        statistics: 'detailed',
        promotionBalance: 50,
        support: 'priority',
        homePageRecommendation: false,
        apiAccess: false,
        teamMembers: 3,
      },
      recommended: true,
    },
    [SubscriptionPlan.ENTERPRISE]: {
      id: SubscriptionPlan.ENTERPRISE,
      name: '企业版',
      nameEn: 'Enterprise',
      monthlyPrice: 499,
      yearlyPrice: 4990,
      features: {
        courseLimit: -1, // unlimited
        trustLevel: 'premium',
        statistics: 'full',
        promotionBalance: 200,
        support: 'dedicated',
        homePageRecommendation: true,
        apiAccess: true,
        teamMembers: 10,
      },
    },
  };
  return plans[plan];
}

export function calculateScale(teacherCount: number): InstitutionScale {
  if (teacherCount <= 5) return InstitutionScale.SMALL;
  if (teacherCount <= 20) return InstitutionScale.MEDIUM;
  return InstitutionScale.LARGE;
}

export function calculateTrustLevel(scale: InstitutionScale): 'basic' | 'advanced' | 'premium' {
  switch (scale) {
    case InstitutionScale.SMALL:
      return 'basic';
    case InstitutionScale.MEDIUM:
      return 'advanced';
    case InstitutionScale.LARGE:
      return 'premium';
    default:
      return 'basic';
  }
}

export function calculateSubscriptionPrice(
  plan: SubscriptionPlan,
  billingCycle: BillingCycle
): number {
  const config = getSubscriptionPlanFeatures(plan);
  if (billingCycle === BillingCycle.YEARLY) {
    return config.yearlyPrice;
  }
  return config.monthlyPrice;
}
```

---

## 三、业务逻辑

```typescript
// src/modules/institution-onboarding/institution-onboarding.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  InstitutionApplication,
  Institution,
  InstitutionSubscription,
  SubscriptionPlanItem,
  ApplicationStatus,
  InstitutionScale,
  SubscriptionPlan,
  SubscriptionStatus,
  BillingCycle,
  createApplicationKey,
  createInstitutionKey,
  createSubscriptionKey,
  createUserApplicationsIndexKey,
  createStatusIndexKey,
  getSubscriptionPlanFeatures,
  calculateScale,
  calculateTrustLevel,
  calculateSubscriptionPrice,
} from './institution-onboarding.types';
import { putItem, getItem, queryItems, updateItem, deleteItem } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache } from '@shared/db/cache';

export interface CreateApplicationInput {
  userId: string;
  name: string;
  type: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  businessLicenseUrl: string;
  businessLicenseNumber: string;
  legalPersonName: string;
  legalPersonIdUrl: string;
  educationLicenseUrl?: string;
  establishedYear: number;
  description: string;
  teachingPhilosophy?: string;
  achievements?: string;
  logoUrl: string;
  environmentPhotos?: string[];
  adminName: string;
  adminPhone: string;
  adminEmail: string;
  teacherCount: number;
}

export interface SelectPlanInput {
  institutionId: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  paymentMethod: 'bank_transfer' | 'poli' | 'credit_card';
  promoCode?: string;
}

export class InstitutionOnboardingService {
  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * 创建入驻申请
   */
  async createApplication(input: CreateApplicationInput): Promise<InstitutionApplication> {
    const now = new Date().toISOString();
    const applicationId = uuidv4();
    const scale = calculateScale(input.teacherCount);
    const trustLevel = calculateTrustLevel(scale);

    // 检查是否有进行中的申请
    const existingApps = await this.getUserPendingApplications(input.userId);
    if (existingApps.length > 0) {
      throw new Error('您已有进行中的入驻申请，请等待审核完成后再提交新申请');
    }

    const application: InstitutionApplication = {
      ...createApplicationKey(applicationId),
      ...createUserApplicationsIndexKey(input.userId),
      ...createStatusIndexKey(ApplicationStatus.PENDING),
      entityType: 'INSTITUTION_APPLICATION',
      dataCategory: 'INSTITUTION',
      id: applicationId,
      userId: input.userId,
      name: input.name,
      nameEn: input.name,
      type: input.type,
      city: input.city,
      address: input.address,
      phone: input.phone,
      email: input.email,
      businessLicenseUrl: input.businessLicenseUrl,
      businessLicenseNumber: input.businessLicenseNumber,
      legalPersonName: input.legalPersonName,
      legalPersonIdUrl: input.legalPersonIdUrl,
      educationLicenseUrl: input.educationLicenseUrl,
      establishedYear: input.establishedYear,
      description: input.description,
      teachingPhilosophy: input.teachingPhilosophy,
      achievements: input.achievements,
      logoUrl: input.logoUrl,
      environmentPhotos: input.environmentPhotos,
      adminName: input.adminName,
      adminPhone: input.adminPhone,
      adminEmail: input.adminEmail,
      scale,
      teacherCount: input.teacherCount,
      status: ApplicationStatus.PENDING,
      trustLevel,
      createdAt: now,
      updatedAt: now,
    };

    await putItem(application);

    // 清除用户缓存
    await deleteCache(`user:${input.userId}:applications`);

    logger.info('Institution application created', { applicationId, userId: input.userId });

    return application;
  }

  /**
   * 获取用户进行中的申请
   */
  async getUserPendingApplications(userId: string): Promise<InstitutionApplication[]> {
    const cacheKey = `user:${userId}:applications`;
    const cached = await getFromCache<InstitutionApplication[]>(cacheKey);
    if (cached) return cached;

    const result = await queryItems<InstitutionApplication>({
      indexName: 'GSI1-UserApplications',
      keyConditionExpression: 'GSI1PK = :pk',
      expressionAttributeValues: {
        ':pk': `USER#${userId}`,
      },
      limit: 10,
    });

    const pendingApps = result.items.filter(
      (app) => app.status !== ApplicationStatus.APPROVED && app.status !== ApplicationStatus.REJECTED
    );

    await setCache(cacheKey, pendingApps, this.CACHE_TTL);
    return pendingApps;
  }

  /**
   * 获取申请详情
   */
  async getApplication(applicationId: string): Promise<InstitutionApplication | null> {
    const { PK, SK } = createApplicationKey(applicationId);
    return getItem<InstitutionApplication>({ PK, SK });
  }

  /**
   * 审核申请
   */
  async reviewApplication(
    applicationId: string,
    reviewerId: string,
    decision: 'approve' | 'reject' | 'needs_revision',
    notes?: string
  ): Promise<InstitutionApplication> {
    const application = await this.getApplication(applicationId);
    if (!application) {
      throw new Error('申请不存在');
    }

    if (application.status !== ApplicationStatus.PENDING && 
        application.status !== ApplicationStatus.REVIEWING) {
      throw new Error('申请状态不允许审核');
    }

    const now = new Date().toISOString();
    let newStatus: ApplicationStatus;
    
    switch (decision) {
      case 'approve':
        newStatus = ApplicationStatus.APPROVED;
        break;
      case 'reject':
        newStatus = ApplicationStatus.REJECTED;
        break;
      case 'needs_revision':
        newStatus = ApplicationStatus.NEEDS_REVISION;
        break;
    }

    const updated: InstitutionApplication = {
      ...application,
      status: newStatus,
      reviewerId,
      reviewNotes: notes,
      reviewedAt: now,
      updatedAt: now,
    };

    await putItem(updated);

    // 清除用户缓存
    await deleteCache(`user:${application.userId}:applications`);

    logger.info('Application reviewed', { applicationId, reviewerId, decision });

    return updated;
  }

  /**
   * 审核通过后创建机构
   */
  async createInstitutionFromApplication(
    applicationId: string
  ): Promise<Institution> {
    const application = await this.getApplication(applicationId);
    if (!application || application.status !== ApplicationStatus.APPROVED) {
      throw new Error('申请不存在或未通过审核');
    }

    // 检查是否已创建机构
    const existingResult = await queryItems<Institution>({
      keyConditionExpression: 'PK = :pk',
      expressionAttributeValues: {
        ':pk': `APPLICATION#${applicationId}`,
      },
    });
    if (existingResult.items.length > 0) {
      throw new Error('机构已创建');
    }

    const now = new Date().toISOString();
    const institutionId = uuidv4();

    const institution: Institution = {
      ...createInstitutionKey(institutionId),
      PK: `INSTITUTION#${institutionId}`,
      SK: 'METADATA',
      entityType: 'INSTITUTION',
      dataCategory: 'INSTITUTION',
      id: institutionId,
      applicationId: application.id,
      userId: application.userId,
      name: application.name,
      nameEn: application.name,
      type: application.type,
      city: application.city,
      address: application.address,
      phone: application.phone,
      email: application.email,
      logoUrl: application.logoUrl,
      description: application.description,
      teachingPhilosophy: application.teachingPhilosophy,
      achievements: application.achievements,
      environmentPhotos: application.environmentPhotos,
      trustLevel: application.trustLevel,
      verified: true,
      verifiedAt: now,
      subscriptionPlan: null,
      subscriptionStatus: null,
      courseCount: 0,
      totalStudents: 0,
      averageRating: 0,
      reviewCount: 0,
      promotionBalance: 0,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      GSI3PK: `CITY#${application.city}`,
      GSI3SK: `RATING#0`,
      GSI4PK: `STATUS#active`,
      GSI4SK: `CREATED_AT#${now}`,
    };

    await putItem(institution);

    logger.info('Institution created from application', { 
      institutionId, 
      applicationId 
    });

    return institution;
  }

  /**
   * 获取可用订阅计划
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlanConfig[]> {
    const plans = Object.values(SubscriptionPlan).map((plan) => 
      getSubscriptionPlanFeatures(plan)
    );
    return plans;
  }

  /**
   * 选择套餐并创建订阅
   */
  async selectPlan(
    institutionId: string,
    input: SelectPlanInput
  ): Promise<InstitutionSubscription> {
    const { PK, SK } = createInstitutionKey(institutionId);
    const institution = await getItem<Institution>({ PK, SK });
    
    if (!institution) {
      throw new Error('机构不存在');
    }

    if (institution.subscriptionStatus === SubscriptionStatus.ACTIVE) {
      throw new Error('机构已有有效订阅');
    }

    const now = new Date().toISOString();
    const subscriptionId = uuidv4();
    const price = calculateSubscriptionPrice(input.plan, input.billingCycle);

    // 计算年付折扣
    let finalPrice = price;
    if (input.billingCycle === BillingCycle.YEARLY) {
      finalPrice = Math.round(price * 0.9); // 10% discount
    }

    const subscription: InstitutionSubscription = {
      ...createSubscriptionKey(subscriptionId),
      entityType: 'INSTITUTION_SUBSCRIPTION',
      dataCategory: 'INSTITUTION',
      id: subscriptionId,
      institutionId,
      plan: input.plan,
      billingCycle: input.billingCycle,
      amount: finalPrice,
      paymentMethod: input.paymentMethod,
      status: SubscriptionStatus.TRIAL, // 先设为试用，支付完成后改为Active
      startsAt: now,
      expiresAt: this.calculateExpiryDate(input.billingCycle),
      createdAt: now,
      updatedAt: now,
      GSI5PK: `INSTITUTION#${institutionId}`,
      GSI5SK: `SUBSCRIPTION#${now}`,
    };

    await putItem(subscription);

    // 更新机构订阅信息
    await updateItem(
      createInstitutionKey(institutionId),
      'SET subscriptionId = :subId, subscriptionPlan = :plan, subscriptionStatus = :status, updatedAt = :now',
      {
        ':subId': subscriptionId,
        ':plan': input.plan,
        ':status': SubscriptionStatus.TRIAL,
        ':now': now,
      }
    );

    logger.info('Subscription created', { subscriptionId, institutionId, plan: input.plan });

    return subscription;
  }

  /**
   * 确认支付成功
   */
  async confirmPayment(
    subscriptionId: string,
    transactionId: string
  ): Promise<void> {
    const { PK, SK } = createSubscriptionKey(subscriptionId);
    const subscription = await getItem<InstitutionSubscription>({ PK, SK });

    if (!subscription) {
      throw new Error('订阅不存在');
    }

    const now = new Date().toISOString();

    await updateItem(
      { PK, SK },
      'SET paymentStatus = :status, transactionId = :txnId, status = :subStatus, updatedAt = :now',
      {
        ':status': 'completed',
        ':txnId': transactionId,
        ':subStatus': SubscriptionStatus.ACTIVE,
        ':now': now,
      }
    );

    // 更新机构状态
    await updateItem(
      createSubscriptionKey(subscriptionId),
      'SET subscriptionStatus = :status, updatedAt = :now',
      {
        ':status': SubscriptionStatus.ACTIVE,
        ':now': now,
      }
    );

    logger.info('Payment confirmed', { subscriptionId, transactionId });
  }

  /**
   * 计算过期日期
   */
  private calculateExpiryDate(billingCycle: BillingCycle): string {
    const date = new Date();
    if (billingCycle === BillingCycle.YEARLY) {
      date.setFullYear(date.getFullYear() + 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    return date.toISOString();
  }

  /**
   * 获取订阅详情
   */
  async getSubscription(subscriptionId: string): Promise<InstitutionSubscription | null> {
    const { PK, SK } = createSubscriptionKey(subscriptionId);
    return getItem<InstitutionSubscription>({ PK, SK });
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    const subscription = await this.getSubscription(subscriptionId);
    if (!subscription) {
      throw new Error('订阅不存在');
    }

    const now = new Date().toISOString();

    await updateItem(
      createSubscriptionKey(subscriptionId),
      'SET status = :status, cancelledAt = :cancelledAt, updatedAt = :now',
      {
        ':status': SubscriptionStatus.CANCELLED,
        ':cancelledAt': now,
        ':now': now,
      }
    );

    // 更新机构订阅状态
    await updateItem(
      createInstitutionKey(subscription.institutionId),
      'SET subscriptionStatus = :status, updatedAt = :now',
      {
        ':status': SubscriptionStatus.CANCELLED,
        ':now': now,
      }
    );

    logger.info('Subscription cancelled', { subscriptionId });
  }

  /**
   * 获取机构的订阅
   */
  async getInstitutionSubscription(institutionId: string): Promise<InstitutionSubscription | null> {
    const result = await queryItems<InstitutionSubscription>({
      indexName: 'GSI5-InstitutionSubscriptions',
      keyConditionExpression: 'GSI5PK = :pk',
      expressionAttributeValues: {
        ':pk': `INSTITUTION#${institutionId}`,
      },
      limit: 1,
      scanIndexForward: false,
    });
    return result.items[0] || null;
  }
}

export const institutionOnboardingService = new InstitutionOnboardingService();
```

---

## 四、API 设计

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| **入驻申请** |
| POST | /api/v1/institutions/application | 提交入驻申请 | 创建入驻申请 |
| GET | /api/v1/institutions/application/status | 获取申请状态 | 检查是否有进行中的申请 |
| GET | /api/v1/institutions/application/detail | 获取申请详情 | 查看当前申请状态和内容 |
| PUT | /api/v1/institutions/application | 更新申请信息 | 审核被拒后可更新 |
| **套餐订阅** |
| GET | /api/v1/institutions/subscription/plans | 获取套餐列表 | 所有可选套餐 |
| POST | /api/v1/institutions/subscription | 购买套餐 | 创建订阅订单 |
| POST | /api/v1/institutions/subscription/:id/pay | 支付订阅 | 完成支付 |
| GET | /api/v1/institutions/subscription | 获取当前订阅 | 查看订阅状态 |
| PUT | /api/v1/institutions/subscription/cancel | 取消订阅 | 取消自动续费 |
| **机构信息** |
| GET | /api/v1/institutions/:id | 获取机构详情 | 公开信息 |
| PUT | /api/v1/institutions/profile | 更新机构信息 | 基础信息修改 |

---

## 五、Controller 实现

```typescript
// src/modules/institution-onboarding/institution-onboarding.controller.ts
import { Request, Response } from 'express';
import { institutionOnboardingService } from './institution-onboarding.service';
import { ApiError } from '@core/errors';

export class InstitutionOnboardingController {
  /**
   * POST /api/v1/institutions/application
   * 提交入驻申请
   */
  async createApplication(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const application = await institutionOnboardingService.createApplication({
        userId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        message: '申请已提交，我们会在24-48小时内审核',
        data: {
          applicationId: application.id,
          status: application.status,
          estimatedTime: '24-48小时',
        },
      });
    } catch (error) {
      ApiError.handle(error, res);
    }
  }

  /**
   * GET /api/v1/institutions/application/status
   * 获取申请状态
   */
  async getApplicationStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const applications = await institutionOnboardingService.getUserPendingApplications(userId);

      if (applications.length === 0) {
        res.json({
          success: true,
          data: {
            hasPendingApplication: false,
          },
        });
        return;
      }

      const latestApp = applications[0];
      res.json({
        success: true,
        data: {
          hasPendingApplication: true,
          applicationId: latestApp.id,
          status: latestApp.status,
          submittedAt: latestApp.createdAt,
          estimatedReviewTime: latestApp.scale === 'small' ? '24-48小时' : 
                               latestApp.scale === 'medium' ? '48-72小时' : '3-5天',
        },
      });
    } catch (error) {
      ApiError.handle(error, res);
    }
  }

  /**
   * GET /api/v1/institutions/subscription/plans
   * 获取套餐列表
   */
  async getSubscriptionPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = await institutionOnboardingService.getSubscriptionPlans();
      res.json({
        success: true,
        data: { plans },
      });
    } catch (error) {
      ApiError.handle(error, res);
    }
  }

  /**
   * POST /api/v1/institutions/subscription
   * 购买套餐
   */
  async selectPlan(req: Request, res: Response): Promise<void> {
    try {
      const institutionId = req.params.institutionId || req.user!.institutionId;
      const subscription = await institutionOnboardingService.selectPlan(institutionId, {
        institutionId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        message: '订阅创建成功，请完成支付',
        data: {
          subscriptionId: subscription.id,
          plan: subscription.plan,
          amount: subscription.amount,
          billingCycle: subscription.billingCycle,
          expiresAt: subscription.expiresAt,
        },
      });
    } catch (error) {
      ApiError.handle(error, res);
    }
  }
}

export const institutionOnboardingController = new InstitutionOnboardingController();
```

---

## 六、Routes 配置

```typescript
// src/modules/institution-onboarding/institution-onboarding.routes.ts
import { Router } from 'express';
import { authMiddleware } from '@shared/middleware/auth';
import { institutionOnboardingController } from './institution-onboarding.controller';

const router = Router();

// 入驻申请路由
router.post(
  '/application',
  authMiddleware,
  institutionOnboardingController.createApplication.bind(institutionOnboardingController)
);

router.get(
  '/application/status',
  authMiddleware,
  institutionOnboardingController.getApplicationStatus.bind(institutionOnboardingController)
);

router.get(
  '/application/detail',
  authMiddleware,
  institutionOnboardingController.getApplicationDetail.bind(institutionOnboardingController)
);

router.put(
  '/application',
  authMiddleware,
  institutionOnboardingController.updateApplication.bind(institutionOnboardingController)
);

// 套餐订阅路由
router.get(
  '/subscription/plans',
  authMiddleware,
  institutionOnboardingController.getSubscriptionPlans.bind(institutionOnboardingController)
);

router.post(
  '/subscription',
  authMiddleware,
  institutionOnboardingController.selectPlan.bind(institutionOnboardingController)
);

router.post(
  '/subscription/:id/pay',
  authMiddleware,
  institutionOnboardingController.confirmPayment.bind(institutionOnboardingController)
);

router.get(
  '/subscription',
  authMiddleware,
  institutionOnboardingController.getSubscription.bind(institutionOnboardingController)
);

router.put(
  '/subscription/cancel',
  authMiddleware,
  institutionOnboardingController.cancelSubscription.bind(institutionOnboardingController)
);

export default router;
```

---

## 七、验收标准

- [ ] 用户可提交入驻申请
- [ ] 申请状态正确显示
- [ ] 重复申请检测正常工作
- [ ] 管理员可审核申请
- [ ] 审核结果通知用户
- [ ] 审核通过后可选择套餐
- [ ] 套餐支付流程完整
- [ ] 支付成功后服务开通
- [ ] 订阅取消功能正常
- [ ] 管理后台功能完整

---

## 八、测试用例

```typescript
// tests/institution-onboarding.test.ts
describe('InstitutionOnboardingService', () => {
  let service: InstitutionOnboardingService;

  beforeEach(() => {
    service = new InstitutionOnboardingService();
  });

  describe('createApplication', () => {
    it('should create application successfully', async () => {
      const input = {
        userId: 'user-123',
        name: 'ABC培训中心',
        type: 'training_center',
        city: 'Auckland',
        address: '123 Queen Street',
        phone: '09-123-4567',
        email: 'contact@abc.co.nz',
        businessLicenseUrl: 'https://s3.amazonaws.com/...',
        businessLicenseNumber: '123456789',
        legalPersonName: '张三',
        legalPersonIdUrl: 'https://s3.amazonaws.com/...',
        establishedYear: 2015,
        description: '专注K12教育',
        logoUrl: 'https://s3.amazonaws.com/logo.png',
        adminName: '张老师',
        adminPhone: '021-123-4567',
        adminEmail: 'admin@abc.co.nz',
        teacherCount: 5,
      };

      const application = await service.createApplication(input);

      expect(application.status).toBe(ApplicationStatus.PENDING);
      expect(application.scale).toBe(InstitutionScale.SMALL);
      expect(application.trustLevel).toBe('basic');
    });

    it('should reject duplicate pending application', async () => {
      // First application
      await service.createApplication({...});
      
      // Second application should fail
      await expect(service.createApplication({...})).rejects.toThrow(
        '您已有进行中的入驻申请'
      );
    });
  });

  describe('selectPlan', () => {
    it('should create subscription with correct pricing', async () => {
      const subscription = await service.selectPlan('inst-123', {
        institutionId: 'inst-123',
        plan: SubscriptionPlan.PROFESSIONAL,
        billingCycle: BillingCycle.MONTHLY,
        paymentMethod: 'credit_card',
      });

      expect(subscription.amount).toBe(199);
    });

    it('should apply yearly discount', async () => {
      const subscription = await service.selectPlan('inst-123', {
        institutionId: 'inst-123',
        plan: SubscriptionPlan.PROFESSIONAL,
        billingCycle: BillingCycle.YEARLY,
        paymentMethod: 'credit_card',
      });

      expect(subscription.amount).toBe(1791); // 1990 * 0.9
    });
  });
});
```

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/institution/tech-institution-onboarding.md`

**相关文档**:
- [产品设计](../../05-product-design/institution/institution-onboarding.md)
- [机构管理](tech-institution-management.md)
- [套餐购买](../transaction/tech-packages.md)
- [支付集成](../transaction/tech-payments.md)
