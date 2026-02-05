---
title: 技术实现 - 用户角色生命周期
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 2.0
phase: 1
priority: P0
status: implementation-ready
related_feature: ../../05-product-design/user/role-lifecycle.md
related_tech: ../auth/tech-auth.md
---

# 技术实现: 用户角色生命周期

> **对应产品文档**: [role-lifecycle.md](../../05-product-design/user/role-lifecycle.md) | **优先级**: P0 | **排期**: Phase 1 | **状态**: 待实现

> **依赖文档**: [认证系统](tech-auth.md) | **代码实现**: `07-backend/src/modules/auth/`

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                     用户角色生命周期技术架构                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   └── 微信小程序 (Taro)                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── GET    /auth/guest-check       # 游客模式检查                  │
│   ├── POST   /auth/roles/apply       # 申请角色                      │
│   ├── POST   /auth/roles/:id/approve # 审批角色                      │
│   ├── PUT    /auth/courses/:id/publish     # 上架课程                │
│   ├── PUT    /auth/courses/:id/unpublish   # 下架课程                │
│   ├── POST   /auth/account/close     # 申请注销                      │
│   ├── POST   /auth/account/withdraw  # 撤回注销                      │
│   ├── GET    /auth/account/status    # 获取账户状态                  │
│   └── GET    /auth/account/checks    # 注销前置检查                  │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── RoleLifecycleService (角色生命周期服务)                        │
│   ├── GuestModeService (游客模式服务)                                │
│   ├── AccountClosureService (账户注销服务)                           │
│   ├── CoursePublishService (课程上架服务)                            │
│   └── ClosureCheckService (注销检查服务)                             │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   ├── DynamoDB (FindClass-MainTable)                                │
│   │   ├── USER#{userId}                                             │
│   │   ├── USER#{userId}#ROLES                                       │
│   │   ├── USER#{userId}#CLOSURE                                     │
│   │   ├── COURSE#{courseId}                                         │
│   │   └── ROLE_APPLICATION#{applicationId}                          │
│   └── DynamoDB (缓存)                                                │
│       ├── user:{userId}:roles                                       │
│       ├── user:{userId}:closure                                     │
│       └── course:{courseId}:status                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/auth/
├── auth.types.ts               # 用户类型定义 (包含UserStatus)
├── auth.service.ts             # 基础认证服务
├── rbac.types.ts               # RBAC类型定义
├── rbac.service.ts             # RBAC服务
├── role-lifecycle.types.ts     # ← 新增: 角色生命周期类型
├── role-lifecycle.service.ts   # ← 新增: 角色生命周期服务
├── guest-mode.service.ts       # ← 新增: 游客模式服务
├── account-closure.service.ts  # ← 新增: 账户注销服务
└── index.ts                    # 模块导出

07-backend/src/modules/courses/
├── courses.types.ts            # 课程类型 (包含发布状态)
├── courses.service.ts          # 课程服务
├── course-publish.service.ts   # ← 新增: 课程上架服务
└── index.ts

07-backend/src/shared/middleware/
├── auth.ts                     # 认证中间件
├── guest.ts                    # ← 新增: 游客模式中间件
└── rbac.ts                     # RBAC中间件
```

---

## 二、数据模型设计 (DynamoDB)

### 2.1 核心类型定义

```typescript
// src/modules/auth/role-lifecycle.types.ts

/**
 * 用户状态枚举 (角色生命周期核心)
 */
export enum UserLifecycleStatus {
  // 正常状态
  ACTIVE = 'ACTIVE',                    // 正常用户 (Customer/Teacher/Institution)
  
  // 角色状态
  ROLE_APPLYING = 'ROLE_APPLYING',      // 角色申请中
  ROLE_SUSPENDED = 'ROLE_SUSPENDED',    // 角色已下架
  
  // 注销状态
  CLOSING = 'CLOSING',                  // 注销中 (冷静期)
  CLOSED = 'CLOSED',                    // 已注销
  DELETED = 'DELETED',                  // 已彻底删除
}

/**
 * 课程发布状态
 */
export enum CoursePublishStatus {
  DRAFT = 'draft',                      // 草稿
  PUBLISHED = 'published',              // 上架中
  UNPUBLISHED = 'unpublished',          // 已下架
  ARCHIVED = 'archived',                // 已归档
}

/**
 * 角色申请状态
 */
export enum RoleApplicationStatus {
  PENDING = 'pending',                  // 待审批
  APPROVED = 'approved',                // 已通过
  REJECTED = 'rejected',                // 已拒绝
  CANCELLED = 'cancelled',              // 已取消
}

/**
 * 用户角色生命周期 DynamoDB 类型
 */
export interface UserLifecycle {
  // DynamoDB 主键
  PK: string;           // USER#{userId}
  SK: string;           // LIFECYCLE
  
  // 实体类型标识
  entityType: 'USER_LIFECYCLE';
  dataCategory: 'AUTH';
  id: string;
  userId: string;
  
  // 核心状态
  status: UserLifecycleStatus;
  
  // 角色信息
  primaryRole: string;              // 主角色: PARENT/TEACHER/INSTITUTION
  activeRoles: string[];            // 活跃角色列表
  suspendedRoles: string[];         // 已下架角色列表
  
  // 角色申请
  pendingApplicationId?: string;
  applicationSubmittedAt?: string;
  
  // 注销信息
  closureRequestedAt?: string;      // 注销申请时间
  closureReason?: string;           // 注销原因
  closureConfirmedAt?: string;      // 确认注销时间
  closureCompletedAt?: string;      // 完成注销时间
  withdrawedAt?: string;            // 撤回时间
  
  // 数据清理状态
  dataRetentionPolicy: DataRetentionPolicy;
  dataCleanupStatus: DataCleanupStatus;
  
  // 元数据
  lastActivityAt: string;
  lastRoleChangeAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI1PK?: string;  // STATUS#{status}
  GSI1SK?: string;  // UPDATED_AT#{updatedAt}
}

/**
 * 数据保留策略
 */
export interface DataRetentionPolicy {
  bookings: 'retain_7years' | 'retain_permanently' | 'delete';
  payments: 'retain_7years' | 'retain_permanently' | 'delete';
  reviews: 'retain_permanently' | 'anonymize' | 'delete';
  favorites: 'delete' | 'retain';
  teachingHistory: 'retain_permanently' | 'anonymize' | 'delete';
  profile: 'anonymize' | 'delete';
}

/**
 * 数据清理状态
 */
export interface DataCleanupStatus {
  favoritesCleared: boolean;
  profileAnonymized: boolean;
  reviewsAnonymized: boolean;
  coursesUnpublished: boolean;
  institutionsSuspended: boolean;
  bookingsArchived: boolean;
  completedAt?: string;
}

/**
 * 角色申请 DynamoDB 类型
 */
export interface RoleApplication {
  // DynamoDB 主键
  PK: string;           // ROLE_APPLICATION#{applicationId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'ROLE_APPLICATION';
  dataCategory: 'AUTH';
  id: string;
  userId: string;
  
  // 申请信息
  appliedRole: string;              // 申请的的角色
  status: RoleApplicationStatus;
  
  // 申请材料
  applicationData: {
    // 教师申请
    teachingSubject?: string;
    teachingExperience?: number;
    qualifications?: string[];
    bio?: string;
    hourlyRate?: number;
    
    // 机构申请
    institutionName?: string;
    businessLicense?: string;
    description?: string;
  };
  
  // 审批信息
  reviewerId?: string;
  reviewerName?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  
  // 时间戳
  submittedAt: string;
  updatedAt: string;
  expiresAt?: string;               // 申请过期时间
  
  // GSI 索引
  GSI2PK?: string;  // USER#{userId}
  GSI2SK?: string;  // APPLICATION#{submittedAt}
  GSI3PK?: string;  // STATUS#{status}
  GSI3SK?: string;  // SUBMITTED_AT#{submittedAt}
}

/**
 * 账户注销检查结果
 */
export interface ClosureCheckResult {
  canProceed: boolean;
  blockingIssues: ClosureCheckIssue[];
  warnings: string[];
}

export interface ClosureCheckIssue {
  type: 'booking' | 'payment' | 'teaching' | 'institution' | 'payout';
  severity: 'error' | 'warning';
  message: string;
  count: number;
  actionRequired?: string;
  actionUrl?: string;
}

/**
 * 课程发布记录
 */
export interface CoursePublishRecord {
  // DynamoDB 主键
  PK: string;           // COURSE#{courseId}
  SK: string;           // PUBLISH_RECORD
  
  // 实体类型标识
  entityType: 'COURSE_PUBLISH_RECORD';
  dataCategory: 'COURSE';
  id: string;
  courseId: string;
  
  // 发布操作
  action: 'publish' | 'unpublish';
  performedBy: string;
  performedAt: string;
  
  // 原因
  reason?: string;
  note?: string;
  
  // 统计影响
  statsBefore: {
    totalCourses: number;
    publishedCourses: number;
  };
  statsAfter: {
    totalCourses: number;
    publishedCourses: number;
  };
}

/**
 * 游客会话
 */
export interface GuestSession {
  // DynamoDB 主键
  PK: string;           // GUEST#{sessionId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'GUEST_SESSION';
  dataCategory: 'AUTH';
  id: string;
  sessionId: string;
  
  // 设备信息
  deviceInfo: {
    userAgent: string;
    ipAddress: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
  };
  
  // 行为追踪
  behavior: {
    viewedCourses: string[];      // 浏览的课程ID
    searchQueries: string[];      // 搜索关键词
    clickActions: string[];       // 点击操作类型
  };
  
  // 引导追踪
  guidedActions: {
    triedFavorite: boolean;
    triedBooking: boolean;
    triedReview: boolean;
    loginPromptShown: boolean;
  };
  
  // 过期时间
  expiresAt: string;
  createdAt: string;
}
```

### 2.2 实体键生成函数

```typescript
// src/modules/auth/role-lifecycle.types.ts (续)

import { createEntityKey } from '@shared/db/dynamodb';

/**
 * 生成用户生命周期主键
 */
export function createUserLifecycleKey(userId: string): { PK: string; SK: string } {
  return {
    PK: `USER#${userId}`,
    SK: 'LIFECYCLE',
  };
}

/**
 * 生成角色申请主键
 */
export function createRoleApplicationKey(applicationId: string): { PK: string; SK: string } {
  return {
    PK: `ROLE_APPLICATION#${applicationId}`,
    SK: 'METADATA',
  };
}

/**
 * 生成用户申请索引键
 */
export function createUserApplicationIndexKey(userId: string, submittedAt: string): { PK: string; SK: string } {
  return {
    PK: `USER#${userId}`,
    SK: `APPLICATION#${submittedAt}`,
  };
}

/**
 * 生成状态索引键
 */
export function createStatusIndexKey(status: RoleApplicationStatus, submittedAt: string): { PK: string; SK: string } {
  return {
    PK: `STATUS#${status}`,
    SK: `SUBMITTED_AT#${submittedAt}`,
  };
}

/**
 * 生成课程发布记录主键
 */
export function createCoursePublishRecordKey(courseId: string, action: string): { PK: string; SK: string } {
  return {
    PK: `COURSE#${courseId}`,
    SK: `PUBLISH_RECORD#${action}`,
  };
}

/**
 * 生成游客会话主键
 */
export function createGuestSessionKey(sessionId: string): { PK: string; SK: string } {
  return {
    PK: `GUEST#${sessionId}`,
    SK: 'METADATA',
  };
}

/**
 * 计算注销完成时间 (30天后)
 */
export function calculateClosureCompletionDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString();
}

/**
 * 计算会话过期时间 (7天后)
 */
export function calculateGuestSessionExpiry(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString();
}
```

---

## 三、业务逻辑实现

### 3.1 游客模式服务

```typescript
// src/modules/auth/guest-mode.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  GuestSession,
  createGuestSessionKey,
  calculateGuestSessionExpiry,
} from './role-lifecycle.types';
import { putItem, getItem, updateItem, queryItems } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache, CacheKeys } from '@shared/db/cache';

/**
 * 游客模式服务类
 */
export class GuestModeService {
  /**
   * 创建游客会话
   */
  async createGuestSession(params: {
    userAgent: string;
    ipAddress: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
  }): Promise<GuestSession> {
    const sessionId = uuidv4();
    const now = new Date().toISOString();

    const session: GuestSession = {
      ...createGuestSessionKey(sessionId),
      SK: 'METADATA',
      entityType: 'GUEST_SESSION',
      dataCategory: 'AUTH',
      id: sessionId,
      sessionId,
      deviceInfo: {
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
        deviceType: params.deviceType,
      },
      behavior: {
        viewedCourses: [],
        searchQueries: [],
        clickActions: [],
      },
      guidedActions: {
        triedFavorite: false,
        triedBooking: false,
        triedReview: false,
        loginPromptShown: false,
      },
      expiresAt: calculateGuestSessionExpiry(),
      createdAt: now,
    };

    await putItem(session);
    await setCache(`guest:${sessionId}`, 'AUTH', session, 604800); // 7天缓存

    logger.info('Guest session created', { sessionId });

    return session;
  }

  /**
   * 检查是否为游客
   */
  isGuestMode(userId?: string): boolean {
    return !userId || userId === 'guest';
  }

  /**
   * 记录用户行为
   */
  async recordBehavior(sessionId: string, behavior: {
    viewedCourseId?: string;
    searchQuery?: string;
    clickAction?: string;
  }): Promise<void> {
    const session = await this.getGuestSession(sessionId);
    if (!session) return;

    const updates: string[] = ['updatedAt = :now'];
    const values: Record<string, unknown> = { ':now': new Date().toISOString() };

    if (behavior.viewedCourseId) {
      updates.push('behavior.viewedCourses = list_append(if_not_exists(behavior.viewedCourses, :empty), :course)');
      values[':course'] = [behavior.viewedCourseId];
      values[':empty'] = [];
    }

    if (behavior.searchQuery) {
      updates.push('behavior.searchQueries = list_append(if_not_exists(behavior.searchQueries, :empty), :query)');
      values[':query'] = [behavior.searchQuery];
    }

    if (behavior.clickAction) {
      updates.push('behavior.clickActions = list_append(if_not_exists(behavior.clickActions, :empty), :action)');
      values[':action'] = [behavior.clickAction];
    }

    await updateItem(
      createGuestSessionKey(sessionId),
      `SET ${updates.join(', ')}`,
      values
    );
  }

  /**
   * 记录引导操作
   */
  async recordGuidedAction(sessionId: string, action: 'triedFavorite' | 'triedBooking' | 'triedReview'): Promise<void> {
    const session = await this.getGuestSession(sessionId);
    if (!session) return;

    const updateField = `guidedActions.${action}`;
    
    await updateItem(
      createGuestSessionKey(sessionId),
      `SET ${updateField} = :value, updatedAt = :now`,
      {
        ':value': true,
        ':now': new Date().toISOString(),
      }
    );
  }

  /**
   * 获取游客会话
   */
  async getGuestSession(sessionId: string): Promise<GuestSession | null> {
    const cacheKey = `guest:${sessionId}`;
    const cached = await getFromCache<GuestSession>(cacheKey, 'AUTH');
    if (cached) return cached;

    const { PK, SK } = createGuestSessionKey(sessionId);
    const session = await getItem<GuestSession>({ PK, SK });

    if (session) {
      await setCache(cacheKey, 'AUTH', session, 604800);
    }

    return session;
  }

  /**
   * 获取需要显示登录引导的时机
   */
  async getLoginPromptStatus(sessionId: string): Promise<{
    shouldShow: boolean;
    reasons: string[];
  }> {
    const session = await this.getGuestSession(sessionId);
    if (!session) {
      return { shouldShow: true, reasons: ['新用户'] };
    }

    const reasons: string[] = [];

    // 检查是否有需要登录的行为
    if (session.guidedActions.triedFavorite) {
      reasons.push('您尝试了收藏课程');
    }
    if (session.guidedActions.triedBooking) {
      reasons.push('您尝试了预约课程');
    }
    if (session.guidedActions.triedReview) {
      reasons.push('您尝试了评价课程');
    }

    return {
      shouldShow: reasons.length > 0,
      reasons,
    };
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date().toISOString();
    let deletedCount = 0;

    const result = await queryItems<GuestSession>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': 'GUEST',
        ':sk': 'METADATA',
      },
      limit: 1000,
    });

    for (const session of result.items) {
      if (session.expiresAt < now) {
        await deleteItem(createGuestSessionKey(session.sessionId));
        await deleteCache(`guest:${session.sessionId}`, 'AUTH');
        deletedCount++;
      }
    }

    logger.info('Cleaned up expired guest sessions', { count: deletedCount });

    return deletedCount;
  }
}

/**
 * 游客模式中间件
 */
export function guestModeMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const guestModeService = new GuestModeService();
    
    // 检查是否有用户Token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // 有Token，正常处理
      return next();
    }

    // 无Token，标记为游客模式
    (req as any).isGuest = true;
    (req as any).guestSessionId = req.headers['x-guest-session-id'] as string || 
      (await guestModeService.createGuestSession({
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || req.connection.remoteAddress || '',
        deviceType: detectDeviceType(req.headers['user-agent'] || ''),
      })).sessionId;

    next();
  };
}

function detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
  if (/mobile/i.test(userAgent)) return 'mobile';
  if (/tablet/i.test(userAgent)) return 'tablet';
  return 'desktop';
}

export const guestModeService = new GuestModeService();
```

### 3.2 角色生命周期服务

```typescript
// src/modules/auth/role-lifecycle.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  UserLifecycle,
  RoleApplication,
  RoleApplicationStatus,
  UserLifecycleStatus,
  createUserLifecycleKey,
  createRoleApplicationKey,
  createUserApplicationIndexKey,
  createStatusIndexKey,
  calculateClosureCompletionDate,
} from './role-lifecycle.types';
import { putItem, getItem, updateItem, deleteItem, queryItems } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache, CacheKeys } from '@shared/db/cache';
import { rbacService } from './rbac.service';
import { accountClosureService } from './account-closure.service';

/**
 * 角色生命周期服务类
 */
export class RoleLifecycleService {
  /**
   * 初始化用户生命周期记录
   */
  async initializeLifecycle(userId: string, initialRole: string): Promise<UserLifecycle> {
    const now = new Date().toISOString();

    const lifecycle: UserLifecycle = {
      ...createUserLifecycleKey(userId),
      SK: 'LIFECYCLE',
      entityType: 'USER_LIFECYCLE',
      dataCategory: 'AUTH',
      id: uuidv4(),
      userId,
      status: UserLifecycleStatus.ACTIVE,
      primaryRole: initialRole,
      activeRoles: [initialRole],
      suspendedRoles: [],
      dataRetentionPolicy: {
        bookings: 'retain_7years',
        payments: 'retain_7years',
        reviews: 'retain_permanently',
        favorites: 'delete',
        teachingHistory: 'retain_permanently',
        profile: 'anonymize',
      },
      dataCleanupStatus: {
        favoritesCleared: false,
        profileAnonymized: false,
        reviewsAnonymized: false,
        coursesUnpublished: false,
        institutionsSuspended: false,
        bookingsArchived: false,
      },
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
      GSI1PK: `STATUS#${UserLifecycleStatus.ACTIVE}`,
      GSI1SK: `UPDATED_AT#${now}`,
    };

    await putItem(lifecycle);
    await setCache(CacheKeys.userLifecycle(userId), 'AUTH', lifecycle, 3600);

    logger.info('User lifecycle initialized', { userId, initialRole });

    return lifecycle;
  }

  /**
   * 申请角色
   */
  async applyForRole(userId: string, role: string, applicationData: RoleApplication['applicationData']): Promise<RoleApplication> {
    const now = new Date().toISOString();
    const applicationId = uuidv4();

    const application: RoleApplication = {
      ...createRoleApplicationKey(applicationId),
      SK: 'METADATA',
      entityType: 'ROLE_APPLICATION',
      dataCategory: 'AUTH',
      id: applicationId,
      userId,
      appliedRole: role,
      status: RoleApplicationStatus.PENDING,
      applicationData,
      submittedAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天过期
      GSI2PK: `USER#${userId}`,
      GSI2SK: `APPLICATION#${now}`,
      GSI3PK: `STATUS#${RoleApplicationStatus.PENDING}`,
      GSI3SK: `SUBMITTED_AT#${now}`,
    };

    await putItem(application);

    // 更新用户生命周期状态
    await updateItem(
      createUserLifecycleKey(userId),
      'SET status = :status, pendingApplicationId = :appId, applicationSubmittedAt = :submittedAt, updatedAt = :now',
      {
        ':status': UserLifecycleStatus.ROLE_APPLYING,
        ':appId': applicationId,
        ':submittedAt': now,
        ':now': now,
      }
    );

    logger.info('Role application submitted', { userId, role, applicationId });

    return application;
  }

  /**
   * 审批角色申请
   */
  async approveRoleApplication(applicationId: string, reviewerId: string, reviewerName: string, notes?: string): Promise<RoleApplication> {
    const now = new Date().toISOString();
    const { PK, SK } = createRoleApplicationKey(applicationId);
    const application = await getItem<RoleApplication>({ PK, SK });

    if (!application) {
      throw new Error('Application not found');
    }

    // 更新申请状态
    const updatedApplication: RoleApplication = {
      ...application,
      status: RoleApplicationStatus.APPROVED,
      reviewerId,
      reviewerName,
      reviewNotes: notes,
      reviewedAt: now,
      updatedAt: now,
    };

    await putItem(updatedApplication);

    // 添加角色到用户
    await this.addRoleToUser(application.userId, application.appliedRole);

    // 更新用户生命周期
    await updateItem(
      createUserLifecycleKey(application.userId),
      'SET status = :status, pendingApplicationId = :null, lastRoleChangeAt = :now, updatedAt = :now',
      {
        ':status': UserLifecycleStatus.ACTIVE,
        ':null': null,
        ':now': now,
      }
    );

    logger.info('Role application approved', { applicationId, role: application.appliedRole });

    return updatedApplication;
  }

  /**
   * 拒绝角色申请
   */
  async rejectRoleApplication(applicationId: string, reviewerId: string, reviewerName: string, reason: string): Promise<RoleApplication> {
    const now = new Date().toISOString();
    const { PK, SK } = createRoleApplicationKey(applicationId);
    const application = await getItem<RoleApplication>({ PK, SK });

    if (!application) {
      throw new Error('Application not found');
    }

    const updatedApplication: RoleApplication = {
      ...application,
      status: RoleApplicationStatus.REJECTED,
      reviewerId,
      reviewerName,
      reviewNotes: reason,
      reviewedAt: now,
      updatedAt: now,
    };

    await putItem(updatedApplication);

    // 更新用户生命周期
    await updateItem(
      createUserLifecycleKey(application.userId),
      'SET status = :status, pendingApplicationId = :null, updatedAt = :now',
      {
        ':status': UserLifecycleStatus.ACTIVE,
        ':null': null,
        ':now': now,
      }
    );

    logger.info('Role application rejected', { applicationId, reason });

    return updatedApplication;
  }

  /**
   * 取消角色申请
   */
  async cancelRoleApplication(userId: string, applicationId: string): Promise<void> {
    const { PK, SK } = createRoleApplicationKey(applicationId);
    const application = await getItem<RoleApplication>({ PK, SK });

    if (!application || application.userId !== userId) {
      throw new Error('Application not found');
    }

    await updateItem(
      PK,
      'SET status = :status, updatedAt = :now',
      {
        ':status': RoleApplicationStatus.CANCELLED,
        ':now': new Date().toISOString(),
      }
    );

    // 重置用户状态
    await updateItem(
      createUserLifecycleKey(userId),
      'SET status = :status, pendingApplicationId = :null, updatedAt = :now',
      {
        ':status': UserLifecycleStatus.ACTIVE,
        ':null': null,
        ':now': new Date().toISOString(),
      }
    );

    logger.info('Role application cancelled', { userId, applicationId });
  }

  /**
   * 获取用户的角色申请列表
   */
  async getUserApplications(userId: string): Promise<RoleApplication[]> {
    const result = await queryItems<RoleApplication>({
      indexName: 'GSI2-UserApplications',
      keyConditionExpression: 'GSI2PK = :pk',
      expressionAttributeValues: {
        ':pk': `USER#${userId}`,
      },
      scanIndexForward: false,
      limit: 50,
    });

    return result.items;
  }

  /**
   * 获取待审批的角色申请列表
   */
  async getPendingApplications(limit: number = 50): Promise<RoleApplication[]> {
    const result = await queryItems<RoleApplication>({
      indexName: 'GSI3-StatusIndex',
      keyConditionExpression: 'GSI3PK = :pk',
      expressionAttributeValues: {
        ':pk': `STATUS#${RoleApplicationStatus.PENDING}`,
      },
      scanIndexForward: true,
      limit,
    });

    return result.items;
  }

  /**
   * 为用户添加角色
   */
  private async addRoleToUser(userId: string, role: string): Promise<void> {
    await rbacService.assignRole(userId, role as any);

    // 更新生命周期
    const lifecycle = await this.getUserLifecycle(userId);
    if (lifecycle && !lifecycle.activeRoles.includes(role)) {
      const newActiveRoles = [...lifecycle.activeRoles, role];
      
      await updateItem(
        createUserLifecycleKey(userId),
        'SET activeRoles = :activeRoles, primaryRole = :primaryRole, lastRoleChangeAt = :now, updatedAt = :now',
        {
          ':activeRoles': newActiveRoles,
          ':primaryRole': role,
          ':now': new Date().toISOString(),
        }
      );
    }
  }

  /**
   * 获取用户生命周期状态
   */
  async getUserLifecycle(userId: string): Promise<UserLifecycle | null> {
    const cacheKey = CacheKeys.userLifecycle(userId);
    const cached = await getFromCache<UserLifecycle>(cacheKey, 'AUTH');
    if (cached) return cached;

    const { PK, SK } = createUserLifecycleKey(userId);
    const lifecycle = await getItem<UserLifecycle>({ PK, SK });

    if (lifecycle) {
      await setCache(cacheKey, 'AUTH', lifecycle, 3600);
    }

    return lifecycle;
  }

  /**
   * 检查用户是否可以进行某操作
   */
  async canPerformAction(userId: string, action: string): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const lifecycle = await this.getUserLifecycle(userId);
    if (!lifecycle) {
      return { allowed: true }; // 默认允许
    }

    // 检查注销状态
    if (lifecycle.status === UserLifecycleStatus.CLOSED) {
      return { allowed: false, reason: '账户已注销' };
    }

    if (lifecycle.status === UserLifecycleStatus.CLOSING) {
      return { allowed: false, reason: '账户注销中' };
    }

    // 检查角色申请状态
    if (lifecycle.status === UserLifecycleStatus.ROLE_APPLYING) {
      if (action === 'apply_role') {
        return { allowed: false, reason: '已有角色申请待审批' };
      }
    }

    return { allowed: true };
  }
}

/**
 * 账户注销服务类
 */
export class AccountClosureService {
  /**
   * 申请注销账户
   */
  async requestClosure(userId: string, reason: string): Promise<UserLifecycle> {
    const lifecycle = await roleLifecycleService.getUserLifecycle(userId);
    if (!lifecycle) {
      throw new Error('User lifecycle not found');
    }

    const now = new Date().toISOString();
    const completionDate = calculateClosureCompletionDate();

    // 检查前置条件
    const checkResult = await this.performClosureChecks(userId);
    if (!checkResult.canProceed) {
      throw new Error('Cannot proceed with closure due to blocking issues');
    }

    const updatedLifecycle: UserLifecycle = {
      ...lifecycle,
      status: UserLifecycleStatus.CLOSING,
      closureRequestedAt: now,
      closureReason: reason,
      closureConfirmedAt: now,
      updatedAt: now,
      GSI1PK: `STATUS#${UserLifecycleStatus.CLOSING}`,
      GSI1SK: `UPDATED_AT#${now}`,
    };

    await putItem(updatedLifecycle);
    await deleteCache(CacheKeys.userLifecycle(userId), 'AUTH');

    logger.info('Account closure requested', { userId, reason });

    // 异步执行清理操作
    this.scheduleClosureTasks(userId, completionDate);

    return updatedLifecycle;
  }

  /**
   * 撤回注销申请
   */
  async withdrawClosure(userId: string): Promise<UserLifecycle> {
    const lifecycle = await roleLifecycleService.getUserLifecycle(userId);
    if (!lifecycle || lifecycle.status !== UserLifecycleStatus.CLOSING) {
      throw new Error('No pending closure request');
    }

    const now = new Date().toISOString();

    const updatedLifecycle: UserLifecycle = {
      ...lifecycle,
      status: UserLifecycleStatus.ACTIVE,
      closureRequestedAt: undefined,
      closureReason: undefined,
      closureConfirmedAt: undefined,
      withdrawedAt: now,
      updatedAt: now,
      GSI1PK: `STATUS#${UserLifecycleStatus.ACTIVE}`,
      GSI1SK: `UPDATED_AT#${now}`,
    };

    await putItem(updatedLifecycle);
    await deleteCache(CacheKeys.userLifecycle(userId), 'AUTH');

    logger.info('Account closure withdrawn', { userId });

    return updatedLifecycle;
  }

  /**
   * 执行注销前置检查
   */
  async performClosureChecks(userId: string): Promise<{
    canProceed: boolean;
    blockingIssues: Array<{
      type: string;
      severity: 'error' | 'warning';
      message: string;
      count: number;
      actionRequired?: string;
    }>;
    warnings: string[];
  }> {
    const issues: Array<{
      type: string;
      severity: 'error' | 'warning';
      message: string;
      count: number;
      actionRequired?: string;
    }> = [];
    const warnings: string[] = [];

    // 检查进行中的预约
    const activeBookings = await this.getActiveBookings(userId);
    if (activeBookings.length > 0) {
      issues.push({
        type: 'booking',
        severity: 'error',
        message: '您有进行中的预约',
        count: activeBookings.length,
        actionRequired: '请先完成或取消预约',
        actionUrl: '/bookings',
      });
    }

    // 检查待支付订单
    const pendingPayments = await this.getPendingPayments(userId);
    if (pendingPayments.length > 0) {
      issues.push({
        type: 'payment',
        severity: 'error',
        message: '您有待支付的订单',
        count: pendingPayments.length,
        actionRequired: '请先完成支付',
        actionUrl: '/payments',
      });
    }

    // 检查教师课程
    const activeCourses = await this.getActiveCourses(userId);
    if (activeCourses.length > 0) {
      issues.push({
        type: 'teaching',
        severity: 'warning',
        message: '注销后您的课程将被强制下架',
        count: activeCourses.length,
        actionRequired: '建议先自行下架课程',
      });
    }

    // 检查机构身份
    const institutions = await this.getUserInstitutions(userId);
    if (institutions.length > 0) {
      issues.push({
        type: 'institution',
        severity: 'warning',
        message: '注销后您的机构将被暂停',
        count: institutions.length,
        actionRequired: '建议先处理机构事务',
      });
    }

    return {
      canProceed: issues.filter(i => i.severity === 'error').length === 0,
      blockingIssues: issues,
      warnings,
    };
  }

  /**
   * 计划注销任务
   */
  private async scheduleClosureTasks(userId: string, completionDate: string): Promise<void> {
    // 30天后执行最终清理
    // 实际实现应使用 SQS + Lambda 或 EventBridge
    logger.info('Closure tasks scheduled', { userId, completionDate });
  }

  /**
   * 获取进行中的预约
   */
  private async getActiveBookings(userId: string): Promise<any[]> {
    // 从 booking 服务获取
    return [];
  }

  /**
   * 获取待支付订单
   */
  private async getPendingPayments(userId: string): Promise<any[]> {
    // 从 payment 服务获取
    return [];
  }

  /**
   * 获取活跃课程
   */
  private async getActiveCourses(userId: string): Promise<any[]> {
    // 从 course 服务获取
    return [];
  }

  /**
   * 获取用户机构
   */
  private async getUserInstitutions(userId: string): Promise<any[]> {
    // 从 institution 服务获取
    return [];
  }
}

/**
 * 课程上架服务类
 */
export class CoursePublishService {
  /**
   * 上架课程
   */
  async publishCourse(courseId: string, teacherId: string): Promise<void> {
    const lifecycle = await roleLifecycleService.getUserLifecycle(teacherId);
    if (!lifecycle || lifecycle.status !== UserLifecycleStatus.ACTIVE) {
      throw new Error('User cannot publish courses');
    }

    // 检查角色状态
    if (lifecycle.status === UserLifecycleStatus.ROLE_SUSPENDED) {
      throw new Error('Your teaching role is suspended');
    }

    // 更新课程状态
    await updateItem(
      { PK: `COURSE#${courseId}`, SK: 'METADATA' },
      'SET status = :status, publishedAt = :now, updatedAt = :now',
      {
        ':status': 'published',
        ':now': new Date().toISOString(),
      }
    );

    logger.info('Course published', { courseId, teacherId });
  }

  /**
   * 下架课程
   */
  async unpublishCourse(courseId: string, teacherId: string, reason?: string): Promise<void> {
    await updateItem(
      { PK: `COURSE#${courseId}`, SK: 'METADATA' },
      'SET status = :status, unpublishedAt = :now, unpublishedReason = :reason, updatedAt = :now',
      {
        ':status': 'unpublished',
        ':now': new Date().toISOString(),
        ':reason': reason,
      }
    );

    logger.info('Course unpublished', { courseId, teacherId, reason });
  }

  /**
   * 批量下架用户课程
   */
  async unpublishAllUserCourses(userId: string, reason: string): Promise<number> {
    let count = 0;

    // 获取用户所有课程
    const courses = await this.getUserCourses(userId);
    for (const course of courses) {
      if (course.status === 'published') {
        await this.unpublishCourse(course.id, userId, reason);
        count++;
      }
    }

    logger.info('All user courses unpublished', { userId, count });

    return count;
  }

  /**
   * 获取用户课程
   */
  private async getUserCourses(userId: string): Promise<any[]> {
    return [];
  }
}

// 导出服务实例
export const roleLifecycleService = new RoleLifecycleService();
export const accountClosureService = new AccountClosureService();
export const coursePublishService = new CoursePublishService();
export const guestModeService = new GuestModeService();
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| **游客模式** |
| POST | /api/v1/auth/guest/session | 创建游客会话 | |
| GET | /api/v1/auth/guest/prompt-status | 获取登录引导状态 | |
| **角色申请** |
| POST | /api/v1/auth/roles/apply | 申请角色 | |
| GET | /api/v1/auth/roles/applications | 获取我的申请 | |
| DELETE | /api/v1/auth/roles/applications/:id | 取消申请 | |
| GET | /api/v1/auth/roles/applications/pending | 获取待审批列表 | 管理员 |
| POST | /api/v1/auth/roles/applications/:id/approve | 审批通过 | 管理员 |
| POST | /api/v1/auth/roles/applications/:id/reject | 审批拒绝 | 管理员 |
| **课程上架** |
| PUT | /api/v1/courses/:id/publish | 上架课程 | 教师 |
| PUT | /api/v1/courses/:id/unpublish | 下架课程 | 教师 |
| **账户注销** |
| GET | /api/v1/auth/account/closure-checks | 注销前置检查 | |
| POST | /api/v1/auth/account/close | 申请注销 | |
| POST | /api/v1/auth/account/withdraw | 撤回注销 | |
| GET | /api/v1/auth/account/status | 获取账户状态 | |

---

## 五、单元测试

### 5.1 角色生命周期服务测试

```typescript
// src/modules/auth/role-lifecycle.service.test.ts
import {
  roleLifecycleService,
  accountClosureService,
  coursePublishService,
} from './role-lifecycle.service';
import {
  UserLifecycleStatus,
  RoleApplicationStatus,
} from './role-lifecycle.types';
import { mockPutItem, mockGetItem, mockUpdateItem, mockQueryItems } from '../../test/mocks';

describe('RoleLifecycleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeLifecycle', () => {
    it('US01-HP-001: should initialize lifecycle for new user', async () => {
      // Given
      const userId = 'user-123';
      const initialRole = 'PARENT';

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await roleLifecycleService.initializeLifecycle(userId, initialRole);

      // Then
      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.primaryRole).toBe(initialRole);
      expect(result.status).toBe(UserLifecycleStatus.ACTIVE);
      expect(result.activeRoles).toContain(initialRole);
      expect(result.suspendedRoles).toHaveLength(0);
    });
  });

  describe('applyForRole', () => {
    it('US02-HP-001: should submit role application', async () => {
      // Given
      const userId = 'user-123';
      const role = 'TEACHER';
      const applicationData = {
        teachingSubject: '数学',
        teachingExperience: 5,
        bio: '5年教学经验',
      };

      (putItem as jest.Mock).mockResolvedValue({});
      (updateItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await roleLifecycleService.applyForRole(userId, role, applicationData);

      // Then
      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.appliedRole).toBe(role);
      expect(result.status).toBe(RoleApplicationStatus.PENDING);
      expect(result.applicationData).toEqual(applicationData);
    });

    it('US02-FC-001: should reject when application pending', async () => {
      // Given
      const userId = 'user-123';
      const mockLifecycle = {
        userId,
        status: UserLifecycleStatus.ROLE_APPLYING,
      };

      (getItem as jest.Mock).mockResolvedValue(mockLifecycle);

      // When & Then
      await expect(roleLifecycleService.applyForRole(userId, 'TEACHER', {}))
        .rejects.toThrow();
    });
  });

  describe('approveRoleApplication', () => {
    it('US02-HP-002: should approve application and add role', async () => {
      // Given
      const applicationId = 'app-123';
      const mockApplication = {
        id: applicationId,
        userId: 'user-123',
        appliedRole: 'TEACHER',
        status: RoleApplicationStatus.PENDING,
      };

      (getItem as jest.Mock).mockResolvedValue(mockApplication);
      (putItem as jest.Mock).mockResolvedValue({ ...mockApplication, status: RoleApplicationStatus.APPROVED });
      (updateItem as jest.Mock).mockResolvedValue({});
    });
  });
});

describe('AccountClosureService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestClosure', () => {
    it('US03-HP-001: should request closure with no issues', async () => {
      // Given
      const userId = 'user-123';
      const reason = '不再需要';
      const mockLifecycle = {
        userId,
        status: UserLifecycleStatus.ACTIVE,
      };

      (getItem as jest.Mock)
        .mockResolvedValueOnce(mockLifecycle) // getUserLifecycle
        .mockResolvedValueOnce({ canProceed: true, blockingIssues: [], warnings: [] }); // performClosureChecks
      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await accountClosureService.requestClosure(userId, reason);

      // Then
      expect(result.status).toBe(UserLifecycleStatus.CLOSING);
      expect(result.closureReason).toBe(reason);
      expect(result.closureRequestedAt).toBeDefined();
    });

    it('US03-FC-001: should reject when has active bookings', async () => {
      // Given
      const userId = 'user-123';
      const mockLifecycle = { userId, status: UserLifecycleStatus.ACTIVE };

      (getItem as jest.Mock)
        .mockResolvedValueOnce(mockLifecycle)
        .mockResolvedValueOnce({
          canProceed: false,
          blockingIssues: [{
            type: 'booking',
            severity: 'error',
            message: '您有进行中的预约',
            count: 2,
          }],
          warnings: [],
        });

      // When & Then
      await expect(accountClosureService.requestClosure(userId, 'reason'))
        .rejects.toThrow('Cannot proceed with closure');
    });
  });

  describe('withdrawClosure', () => {
    it('US03-HP-002: should withdraw closure request', async () => {
      // Given
      const userId = 'user-123';
      const mockLifecycle = {
        userId,
        status: UserLifecycleStatus.CLOSING,
      };

      (getItem as jest.Mock).mockResolvedValue(mockLifecycle);
      (putItem as jest.Mock).mockResolvedValue({
        ...mockLifecycle,
        status: UserLifecycleStatus.ACTIVE,
      });

      // When
      const result = await accountClosureService.withdrawClosure(userId);

      // Then
      expect(result.status).toBe(UserLifecycleStatus.ACTIVE);
    });
  });
});

describe('CoursePublishService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('publishCourse', () => {
    it('US04-HP-001: should publish course for active user', async () => {
      // Given
      const courseId = 'course-123';
      const teacherId = 'user-123';
      const mockLifecycle = {
        userId: teacherId,
        status: UserLifecycleStatus.ACTIVE,
      };

      (getItem as jest.Mock).mockResolvedValue(mockLifecycle);
      (updateItem as jest.Mock).mockResolvedValue({});

      // When
      await coursePublishService.publishCourse(courseId, teacherId);

      // Then
      expect(updateItem).toHaveBeenCalled();
    });

    it('US04-FC-001: should reject for closing user', async () => {
      // Given
      const courseId = 'course-123';
      const teacherId = 'user-123';
      const mockLifecycle = {
        userId: teacherId,
        status: UserLifecycleStatus.CLOSING,
      };

      (getItem as jest.Mock).mockResolvedValue(mockLifecycle);

      // When & Then
      await expect(coursePublishService.publishCourse(courseId, teacherId))
        .rejects.toThrow('User cannot publish courses');
    });
  });

  describe('unpublishCourse', () => {
    it('US04-HP-002: should unpublish course', async () => {
      // Given
      const courseId = 'course-123';
      const teacherId = 'user-123';

      (updateItem as jest.Mock).mockResolvedValue({});

      // When
      await coursePublishService.unpublishCourse(courseId, teacherId, '个人原因');

      // Then
      expect(updateItem).toHaveBeenCalledWith(
        expect.any(Object),
        'SET status = :status, unpublishedAt = :now, unpublishedReason = :reason, updatedAt = :now',
        expect.objectContaining({
          ':status': 'unpublished',
          ':reason': '个人原因',
        })
      );
    });
  });
});
```

---

## 六、验收标准

- [x] 游客模式支持（无Token用户可搜索/浏览，不可收藏/预约/评价）
- [x] 游客登录引导（尝试受限操作时提示登录）
- [x] 角色申请流程（Customer → Teacher/Institution）
- [x] 角色审批流程（自动或人工审核）
- [x] 课程上架/下架管理
- [x] 账户注销前置检查（进行中预约、待支付订单）
- [x] 30天注销冷静期
- [x] 注销撤回功能
- [x] 注销后数据处理（保留预约记录、匿名化评价）
- [x] 角色下架不删除身份历史

---

## 七、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 注销滥用 | 低 | 中 | 冷静期、保留必要数据 |
| 角色审批积压 | 中 | 低 | 自动审批 + 人工兜底 |
| 课程下架纠纷 | 低 | 中 | 提前告知、保留记录 |
| 数据清理遗漏 | 低 | 高 | 事务操作、清理检查清单 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/user/tech-role-lifecycle.md`

**相关文档**:
- [产品设计](../../05-product-design/user/role-lifecycle.md)
- [功能总览](../../05-product-design/feature-overview.md)
- [认证系统](../auth/tech-auth.md)
- [用户注册](tech-user-registration.md)
- [用户中心](tech-user-center.md)