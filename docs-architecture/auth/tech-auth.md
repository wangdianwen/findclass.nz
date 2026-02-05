---
title: 技术实现 - 用户认证与授权系统
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 2.0
phase: 1
priority: P0
status: implementation-ready
related_feature: ../../05-product-design/user/user-registration.md
related_feature: ../../05-product-design/user/role-lifecycle.md
---

# 技术实现: 用户认证与授权系统

> **对应产品文档**: [user-registration.md](../../05-product-design/user/user-registration.md) | [role-lifecycle.md](../../05-product-design/user/role-lifecycle.md)
> **优先级**: P0 | **排期**: Phase 1 | **状态**: 待实现
> **代码实现**: `07-backend/src/modules/auth/`

---

## 一、技术架构总览

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      用户认证与授权技术架构                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   └── 微信小程序 (Taro)                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express / tsoa)]                                    │
│   ├── POST   /auth/register           # 用户注册                      │
│   ├── POST   /auth/login              # 用户登录                      │
│   ├── POST   /auth/logout             # 登出                          │
│   ├── POST   /auth/refresh            # 刷新Token                     │
│   ├── POST   /auth/send-code          # 发送验证码                     │
│   ├── POST   /auth/verify-code        # 验证验证码                     │
│   ├── POST   /auth/password/reset-request   # 忘记密码请求            │
│   ├── POST   /auth/password/reset     # 重置密码                      │
│   ├── GET    /auth/me                 # 获取当前用户                   │
│   ├── PUT    /auth/me                 # 更新用户资料                   │
│   ├── GET    /auth/roles              # 获取我的角色 (RBAC)            │
│   └── POST   /auth/roles/:id/apply    # 申请角色 (RBAC)               │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [认证服务层 - AuthService]                                         │
│   ├── register()              # 用户注册                             │
│   ├── login()                 # 用户登录                             │
│   ├── verifyCode()            # 验证码验证                           │
│   ├── sendVerificationCode()  # 发送验证码                           │
│   ├── rotateRefreshToken()    # Token轮换                            │
│   ├── logout()                # 登出                                 │
│   ├── requestPasswordReset()  # 忘记密码请求                         │
│   ├── resetPassword()         # 重置密码                             │
│   ├── getCurrentUser()        # 获取当前用户                         │
│   ├── updateCurrentUser()     # 更新用户资料                         │
│   └── validatePassword()      # 密码强度验证                         │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [RBAC 授权服务层 - RBACService]                                    │
│   ├── hasPermission()         # 检查权限                             │
│   ├── hasRole()               # 检查角色                             │
│   ├── getUserRoles()          # 获取用户角色                         │
│   ├── assignRole()            # 分配角色                             │
│   ├── revokeRole()            # 撤销角色                             │
│   ├── applyForRole()          # 申请角色                             │
│   ├── approveRoleApplication()# 审批角色申请                         │
│   └── getRolePermissions()    # 获取角色权限                         │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   ├── DynamoDB (FindClass-MainTable)                                │
│   │   ├── USER#{userId} / METADATA                                  │
│   │   ├── USER#{email}#VERIFICATION                                 │
│   │   ├── USER_ROLE#{userId}                                        │
│   │   ├── ROLE#{roleId}                                             │
│   │   ├── PERMISSION#{permissionId}                                 │
│   │   ├── ROLE_PERMISSION#{roleId}                                  │
│   │   ├── TOKEN_BLACKLIST#TOKEN                                     │
│   │   └── USER#{userId}#SESSION                                     │
│   └── DynamoDB (缓存)                                                │
│       ├── user:{userId}                                             │
│       ├── user:roles:{userId}                                       │
│       ├── permission:{resource}:{action}                            │
│       └── verify:code:{email}:{type}                                │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [外部服务]                                                         │
│   ├── Email Service (AWS SES)        # 验证码邮件                     │
│   └── SMS Service (可选)             # 短信验证码                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/auth/
├── auth.types.ts               # 类型定义 (User, UserRole, UserStatus, DTOs)
├── auth.service.ts             # 认证服务 (注册/登录/验证/Token管理)
├── auth.controller.ts          # API控制器 (tsoa controller)
├── auth.routes.ts              # 路由配置 (Express - 兼容)
├── auth.middleware.ts          # 认证中间件 (JWT验证, Token黑名单)
├── rbac.types.ts               # RBAC类型定义 (Role, Permission)
├── rbac.service.ts             # RBAC服务 (角色/权限管理)
├── rbac.middleware.ts          # RBAC中间件 (权限检查)
└── index.ts                    # 模块导出

07-backend/src/shared/types/
└── index.ts                    # UserRole, UserStatus, User 等共享类型

07-backend/src/shared/middleware/
└── auth.ts                     # JWT认证, Token黑名单, RBAC授权
```

---

## 二、数据模型设计 (DynamoDB)

### 2.1 核心类型定义

```typescript
// src/modules/auth/auth.types.ts

/**
 * 用户状态枚举
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING_PARENTAL_CONSENT = 'PENDING_PARENTAL_CONSENT',
  DISABLED = 'DISABLED',
}

/**
 * 用户角色枚举 (核心RBAC)
 */
export enum UserRole {
  PARENT = 'PARENT',           // 家长/客户
  STUDENT = 'STUDENT',         // 学生
  TEACHER = 'TEACHER',         // 教师
  INSTITUTION = 'INSTITUTION', // 机构
  ADMIN = 'ADMIN',             // 管理员
}

/**
 * 验证码类型
 */
export enum AuthType {
  REGISTER = 'REGISTER',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
  LOGIN = 'LOGIN',
  EMAIL_CHANGE = 'EMAIL_CHANGE',
}

/**
 * 用户 DynamoDB 类型
 */
export interface User {
  // DynamoDB 主键
  PK: string;           // USER#{userId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'USER';
  dataCategory: 'USER';
  id: string;
  
  // 基本信息
  email: string;
  name: string;
  phone?: string;
  
  // 认证信息
  passwordHash: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  
  // 角色与状态
  role: UserRole;
  status: UserStatus;
  
  // 偏好设置
  language: 'zh' | 'en';
  avatarUrl?: string;
  profile?: {
    avatar?: string;
    wechat?: string;
    bio?: string;
  };
  settings?: {
    language: string;
    notifications: boolean;
  };
  
  // 统计信息
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI1PK?: string;      // EMAIL#{email}
  GSI1SK?: string;      // METADATA
}

/**
 * 验证码 DynamoDB 类型
 */
export interface VerificationCode {
  // DynamoDB 主键
  PK: string;           // VERIFY#{email}#{type}
  SK: string;           // CODE
  
  entityType: 'VERIFICATION_CODE';
  dataCategory: 'AUTH';
  id: string;
  
  email: string;
  code: string;
  type: AuthType;
  expiresAt: string;
  
  createdAt: string;
}

/**
 * Token黑名单 DynamoDB 类型
 */
export interface TokenBlacklist {
  // DynamoDB 主键
  PK: string;           // BLACKLIST#TOKEN
  SK: string;           // JTI#{jti}
  
  entityType: 'TOKEN_BLACKLIST';
  dataCategory: 'AUTH';
  id: string;
  
  jti: string;          // JWT ID
  userId: string;
  expiresAt: string;
  
  createdAt: string;
}

/**
 * 登录日志 DynamoDB 类型
 */
export interface LoginLog {
  // DynamoDB 主键
  PK: string;           // USER#{userId}#LOGIN
  SK: string;           // TIMESTAMP#{timestamp}
  
  entityType: 'LOGIN_LOG';
  dataCategory: 'AUTH';
  id: string;
  
  userId: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  
  createdAt: string;
}
```

### 2.2 RBAC 类型定义

```typescript
// src/modules/auth/rbac.types.ts

/**
 * 资源类型定义
 */
export enum Resource {
  USER = 'USER',
  COURSE = 'COURSE',
  TEACHER = 'TEACHER',
  INSTITUTION = 'INSTITUTION',
  BOOKING = 'BOOKING',
  PAYMENT = 'PAYMENT',
  REVIEW = 'REVIEW',
  FEEDBACK = 'FEEDBACK',
  ADMIN = 'ADMIN',
  ANALYTICS = 'ANALYTICS',
}

/**
 * 操作类型定义
 */
export enum Action {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  MANAGE = 'MANAGE',
}

/**
 * 权限定义
 */
export interface Permission {
  // DynamoDB 主键
  PK: string;           // PERMISSION#{permissionId}
  SK: string;           // METADATA
  
  entityType: 'PERMISSION';
  dataCategory: 'RBAC';
  id: string;
  
  // 权限标识 (e.g., "course:read", "admin:manage")
  code: string;
  
  // 权限信息
  name: string;
  nameEn: string;
  description?: string;
  descriptionEn?: string;
  
  // 资源与操作
  resource: Resource;
  action: Action;
  
  // 角色关联
  roleIds: string[];
  
  createdAt: string;
  updatedAt: string;
}

/**
 * 角色定义
 */
export interface Role {
  // DynamoDB 主键
  PK: string;           // ROLE#{roleId}
  SK: string;           // METADATA
  
  entityType: 'ROLE';
  dataCategory: 'RBAC';
  id: string;
  
  // 角色信息
  code: string;         // e.g., "PARENT", "TEACHER", "ADMIN"
  name: string;
  nameEn: string;
  description?: string;
  
  // 角色层级
  level: number;        // 数字越大权限越高
  isSystem: boolean;    // 系统内置角色不可删除
  
  // 权限关联
  permissionIds: string[];
  
  // 状态
  isActive: boolean;
  
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI10PK?: string;     // CODE#{code}
  GSI10SK?: string;     // METADATA
  GSI11PK?: string;     // LEVEL#{level}
  GSI11SK?: string;     // METADATA
}

/**
 * 用户角色关联
 */
export interface UserRole {
  // DynamoDB 主键
  PK: string;           // USER_ROLE#{userId}
  SK: string;           // ROLE#{roleId}
  
  entityType: 'USER_ROLE';
  dataCategory: 'RBAC';
  id: string;
  
  userId: string;
  roleId: string;
  roleCode: string;
  
  // 角色状态
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED';
  
  // 审批信息
  approvedBy?: string;
  approvedAt?: string;
  approvalNote?: string;
  
  // 有效期限 (可选)
  expiresAt?: string;
  
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI12PK?: string;     // ROLE#{roleId}
  GSI12SK?: string;     // USER#{userId}
}

/**
 * 角色申请
 */
export interface RoleApplication {
  // DynamoDB 主键
  PK: string;           // ROLE_APPLICATION#{applicationId}
  SK: string;           // METADATA
  
  entityType: 'ROLE_APPLICATION';
  dataCategory: 'RBAC';
  id: string;
  
  userId: string;
  requestedRoleCode: string;
  
  // 申请信息
  reason?: string;
  qualifications?: Array<{
    type: string;
    value: string;
    documentUrl?: string;
  }>;
  
  // 审批状态
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  
  // 审批信息
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI13PK?: string;     // USER#{userId}
  GSI13SK?: string;     // STATUS#{status}
}
```

### 2.3 键生成函数

```typescript
// src/modules/auth/rbac.types.ts (续)

import { createEntityKey } from '@shared/db/dynamodb';

/**
 * 生成用户主键
 */
export function createUserKey(userId: string): { PK: string; SK: string } {
  return createEntityKey('USER', userId);
}

/**
 * 生成用户角色主键
 */
export function createUserRoleKey(userId: string, roleId: string): { PK: string; SK: string } {
  return {
    PK: `USER_ROLE#${userId}`,
    SK: `ROLE#${roleId}`,
  };
}

/**
 * 生成角色主键
 */
export function createRoleKey(roleId: string): { PK: string; SK: string } {
  return createEntityKey('ROLE', roleId);
}

/**
 * 生成权限主键
 */
export function createPermissionKey(permissionId: string): { PK: string; SK: string } {
  return createEntityKey('PERMISSION', permissionId);
}

/**
 * 生成角色申请主键
 */
export function createRoleApplicationKey(applicationId: string): { PK: string; SK: string } {
  return createEntityKey('ROLE_APPLICATION', applicationId);
}
```

---

## 二、超级管理员白名单配置

### 2.1 配置概述

系统支持通过**环境变量**配置超级管理员白名单，用户注册时自动检测并提升为管理员权限。

### 2.2 环境变量配置

```bash
# ============================================================================
# 超级管理员白名单配置
# ============================================================================

# 管理员邮箱白名单 (精确匹配邮箱，多个用逗号分隔)
ADMIN_EMAIL_WHITELIST=admin@findnzclass.com,ceo@findnzclass.com,founder@company.com

# 管理员邮箱域名白名单 (匹配域名下所有邮箱)
ADMIN_DOMAIN_WHITELIST=findnzclass.com,company.com

# 自动分配角色规则 (email:role 格式，多个用分号分隔)
# 例如: admin@findnzclass.com 自动分配 ADMIN 角色
# 例如: dev@company.com 自动分配 DEVELOPER 自定义角色
ADMIN_AUTO_ASSIGN=admin@findnzclass.com:ADMIN;ceo@findnzclass.com:ADMIN;dev@findnzclass.com:DEVELOPER
```

### 2.3 配置示例

#### 2.3.1 单个管理员

```bash
# 只配置一个管理员
ADMIN_EMAIL_WHITELIST=admin@findnzclass.com
```

#### 2.3.2 多个管理员

```bash
# 配置多个管理员
ADMIN_EMAIL_WHITELIST=admin@findnzclass.com,ceo@findnzclass.com,coo@findnzclass.com
```

#### 2.3.3 域名白名单 (适合企业内部)

```bash
# 公司域名下所有邮箱都自动成为管理员
ADMIN_DOMAIN_WHITELIST=findnzclass.com,internal.company.com
```

#### 2.3.4 混合配置

```bash
# 精确匹配 + 域名白名单
ADMIN_EMAIL_WHITELIST=external@partner.com
ADMIN_DOMAIN_WHITELIST=findnzclass.com
```

### 2.4 角色分配规则

| 邮箱模式 | 自动分配角色 | 示例 |
|---------|-------------|------|
| `admin@findnzclass.com` | ADMIN | 系统管理员 |
| `ceo@company.com` | ADMIN | CEO |
| `dev@company.com` | DEVELOPER | 开发者 (自定义角色) |
| `@findnzclass.com` | ADMIN | 域名下所有邮箱 |

### 2.5 安全考虑

1. **敏感信息保护**
   - 不要在代码中硬编码管理员邮箱
   - 使用环境变量或配置管理工具
   - 定期审计管理员列表

2. **访问控制**
   - 超级管理员权限应该严格控制
   - 建议设置独立的管理员审批流程
   - 记录所有管理员操作日志

3. **合规要求**
   - 确保管理员身份验证符合 GDPR/PIPL
   - 定期审查管理员权限
   - 及时撤销离职管理员权限

### 2.6 API 管理接口

#### 2.6.1 获取当前白名单配置

```http
GET /api/v1/admin/whitelist
Authorization: Bearer {super_admin_token}
```

**响应示例** (200):
```json
{
  "success": true,
  "data": {
    "adminEmails": ["admin@findnzclass.com"],
    "adminDomains": ["findnzclass.com"],
    "autoAssignRoles": [
      { "email": "admin", "role": "ADMIN" }
    ]
  }
}
```

#### 2.6.2 更新白名单配置

```http
PUT /api/v1/admin/whitelist
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "adminEmails": ["admin@findnzclass.com", "newadmin@findnzclass.com"],
  "adminDomains": ["findnzclass.com"],
  "autoAssignRoles": []
}
```

**响应示例** (200):
```json
{
  "success": true,
  "message": "Whitelist updated successfully"
}
```

#### 2.6.3 添加管理员

```http
POST /api/v1/admin/whitelist/emails
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "emails": ["newadmin@example.com"],
  "reason": "New system administrator"
}
```

#### 2.6.4 移除管理员

```http
DELETE /api/v1/admin/whitelist/emails
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "emails": ["oldadmin@example.com"],
  "reason": "Access revoked"
}
```

### 2.7 审计日志

所有白名单操作都应该记录审计日志：

```typescript
interface AdminWhitelistAuditLog {
  id: string;
  action: 'ADD' | 'REMOVE' | 'UPDATE' | 'VIEW';
  targetEmail: string;
  performedBy: string;
  reason?: string;
  timestamp: string;
  ipAddress: string;
}
```

---

## 三、认证服务实现

### 3.1 认证服务 (AuthService)

```typescript
// src/modules/auth/auth.service.ts

import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '../../config';
import { logger } from '@core/logger';
import { createAppError, ErrorCode } from '@core/errors';
import { User, UserStatus, UserRole } from '@shared/types';
import {
  putItem,
  getItem,
  createEntityKey,
  updateItem,
  queryItems,
} from '@shared/db/dynamodb';
import {
  getFromCache,
  setCache,
  deleteFromCache,
  incrementRateLimit,
  CacheKeys,
} from '@shared/db/cache';
import { addTokenToBlacklist, isTokenBlacklisted } from '@shared/middleware/auth';
import { AuthResponse, RegisterDto, LoginDto, AuthType } from './auth.types';
import {
  generateToken as generateAccessToken,
  generateRefreshToken,
} from '@shared/middleware/auth';
import { sendVerificationEmail } from '@shared/smtp/email.service';

// 配置常量
const VERIFICATION_CODE_TTL = 300;  // 5 minutes
const RATE_LIMIT_WINDOW = 60;       // 1 minute
const RATE_LIMIT_MAX = 3;           // Max 3 requests per minute

// ============================================================================
// 超级管理员白名单配置
// ============================================================================

/**
 * 超级管理员白名单配置
 * 
 * 配置方式说明:
 * 1. 环境变量 (推荐): ADMIN_EMAIL_WHITELIST=admin@example.com,ceo@example.com
 * 2. 配置文件: config/admin.json
 * 3. 数据库: ADMIN_WHITELIST 表
 * 
 * 优先级: 环境变量 > 配置文件 > 硬编码
 */
interface AdminWhitelistConfig {
  // 管理员邮箱白名单 (精确匹配)
  adminEmails: string[];
  
  // 管理员邮箱域名白名单 (匹配域名下的所有邮箱)
  adminDomains: string[];
  
  // 允许注册时自动提升为管理员的角色
  autoAssignRoles: {
    email: string;      // 匹配邮箱
    role: string;       // 自动分配的角色
  }[];
}

/**
 * 从环境变量加载管理员白名单配置
 */
function loadAdminWhitelistConfig(): AdminWhitelistConfig {
  const config = getConfig();
  
  // 从环境变量读取 (逗号分隔的邮箱列表)
  const adminEmailsEnv = process.env.ADMIN_EMAIL_WHITELIST || '';
  const adminEmails = adminEmailsEnv
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0);
  
  // 从环境变量读取管理员域名
  const adminDomainsEnv = process.env.ADMIN_DOMAIN_WHITELIST || '';
  const adminDomains = adminDomainsEnv
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(d => d.length > 0);
  
  // 从环境变量读取自动分配规则
  const autoAssignEnv = process.env.ADMIN_AUTO_ASSIGN || '';
  const autoAssignRoles = autoAssignEnv
    .split(';')
    .map(rule => {
      const [email, role] = rule.split(':').map(s => s.trim());
      return email && role ? { email, role } : null;
    })
    .filter((r): r is { email: string; role: string } => r !== null);
  
  return {
    adminEmails,
    adminDomains,
    autoAssignRoles,
  };
}

/**
 * 检查邮箱是否在管理员白名单中
 */
function isAdminEmail(email: string): boolean {
  const emailLower = email.toLowerCase();
  const config = loadAdminWhitelistConfig();
  
  // 精确匹配
  if (config.adminEmails.includes(emailLower)) {
    return true;
  }
  
  // 域名匹配
  const domain = emailLower.split('@')[1];
  if (domain && config.adminDomains.includes(domain)) {
    return true;
  }
  
  // 自动分配规则匹配
  for (const rule of config.autoAssignRoles) {
    if (emailLower.includes(rule.email)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 根据白名单规则获取应分配的角色
 */
function getRoleFromWhitelist(email: string): string | null {
  const emailLower = email.toLowerCase();
  const config = loadAdminWhitelistConfig();
  
  // 检查精确匹配
  if (config.adminEmails.includes(emailLower)) {
    return 'ADMIN';
  }
  
  // 检查自动分配规则
  for (const rule of config.autoAssignRoles) {
    if (emailLower.includes(rule.email)) {
      return rule.role;
    }
  }
  
  return null;
}

// ============================================================================
// 管理员白名单验证中间件 (用于注册时)
// ============================================================================

/**
 * 验证注册邮箱是否应该自动提升为管理员
 */
export async function checkAdminWhitelist(email: string): Promise<{
  shouldAssignAdmin: boolean;
  assignedRole: string | null;
  reason: string;
}> {
  const emailLower = email.toLowerCase();
  
  // 检查是否在管理员白名单中
  if (isAdminEmail(emailLower)) {
    const role = getRoleFromWhitelist(emailLower);
    return {
      shouldAssignAdmin: true,
      assignedRole: role,
      reason: 'Email is in admin whitelist',
    };
  }
  
  return {
    shouldAssignAdmin: false,
    assignedRole: null,
    reason: 'Email not in admin whitelist',
  };
}

/**
 * 验证用户是否有管理员权限 (运行时检查)
 */
export async function verifyAdminPermission(userId: string): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user || user.role !== 'ADMIN') {
    return false;
  }
  
  // 超级管理员角色验证 (level >= 100)
  const role = await rbacService.getRoleByCode('ADMIN');
  if (!role || role.level < 100) {
    return false;
  }
  
  return true;
}

/**
 * 超级管理员特殊权限检查
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user || user.role !== 'ADMIN') {
    return false;
  }
  
  // 超级管理员: ADMIN角色且level >= 100
  const role = await rbacService.getRoleByCode('ADMIN');
  return role !== null && role.level >= 100;
}

// ============================================================================
// 环境变量配置示例
// ============================================================================

/**
 * 环境变量配置说明:
 * 
 * # 管理员邮箱白名单 (精确匹配邮箱，多个用逗号分隔)
 * ADMIN_EMAIL_WHITELIST=admin@findnzclass.com,ceo@findnzclass.com,founder@company.com
 * 
 * # 管理员邮箱域名白名单 (匹配域名下所有邮箱)
 * ADMIN_DOMAIN_WHITELIST=findnzclass.com,company.com
 * 
 * # 自动分配角色规则 (email:role 格式，多个用分号分隔)
 * ADMIN_AUTO_ASSIGN=admin@findnzclass.com:ADMIN;support@findnzclass.com:ADMIN;dev@findnzclass.com:ADMIN
 * 
 * # 超级管理员角色ID (用于验证)
 * ADMIN_SUPER_ROLE_ID=role_admin_super
 */

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 在应用启动时初始化管理员白名单
 */
export async function initializeAdminWhitelist(): Promise<void> {
  const config = loadAdminWhitelistConfig();
  
  logger.info('Admin whitelist loaded', {
    adminEmailsCount: config.adminEmails.length,
    adminDomainsCount: config.adminDomains.length,
    autoAssignRulesCount: config.autoAssignRoles.length,
  });
  
  // 可以在这里将白名单同步到数据库
  // 供管理员后台管理使用
}

/**
 * 获取管理员白名单配置 (供管理后台使用)
 */
export function getAdminWhitelistConfig(): AdminWhitelistConfig {
  return loadAdminWhitelistConfig();
}

/**
 * 更新管理员白名单 (动态更新)
 */
export async function updateAdminWhitelist(config: Partial<AdminWhitelistConfig>): Promise<void> {
  // 注意: 这里应该将配置持久化到数据库或配置文件
  // 环境变量需要在应用重启后生效
  logger.info('Admin whitelist updated', { config });
  
  // 可以选择刷新缓存或重新加载配置
}

// ============================================================================
// 使用示例: 在注册时自动提升管理员
// ============================================================================

/**
 * 用户注册 (带管理员白名单检测)
 */
export async function registerWithAdminCheck(data: RegisterDto): Promise<{
  user: User;
  requiresParentalConsent: boolean;
  adminAssigned: boolean;
  assignedRole: string | null;
}> {
  const { email: rawEmail, password, name, role, phone, language } = data;
  const email = rawEmail.toLowerCase();

  logger.info('Registering new user', { email, requestedRole: role });

  // 检查邮箱是否已存在
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw createAppError('Email already registered', ErrorCode.AUTH_EMAIL_EXISTS);
  }

  // 检查管理员白名单
  const adminCheck = await checkAdminWhitelist(email);
  let finalRole = role || UserRole.PARENT;
  let adminAssigned = false;

  if (adminCheck.shouldAssignAdmin && adminCheck.assignedRole) {
    finalRole = adminCheck.assignedRole as UserRole;
    adminAssigned = true;
    logger.info('Admin role auto-assigned from whitelist', {
      email,
      assignedRole: finalRole,
    });
  }

  // 密码哈希
  const config = getConfig();
  const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);

  // 生成用户ID
  const userId = `usr_${uuidv4()}`;
  const { PK, SK } = createEntityKey('USER', userId);

  // 创建用户实体
  const user: User = {
    PK,
    SK,
    entityType: 'USER',
    dataCategory: 'USER',
    id: userId,
    email,
    name,
    phone,
    passwordHash,
    role: finalRole,
    status: UserStatus.ACTIVE,
    language: language || 'zh',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 保存用户
  await putItem(user as unknown as Record<string, unknown>, undefined, 'attribute_not_exists(PK)');

  logger.info('User registered successfully', {
    userId,
    email,
    role: finalRole,
    adminAssigned,
  });

  // 检查是否需要家长同意 (年龄 < 14)
  const requiresParentalConsent = false;  // 简化处理

  return { user, requiresParentalConsent };
}

/**
 * 用户登录
 */
export async function login(data: LoginDto): Promise<AuthResponse> {
  const { email, password } = data;

  logger.info('User login attempt', { email });

  // 查找用户
  const user = await getUserByEmail(email);
  if (!user) {
    throw createAppError('Invalid email or password', ErrorCode.AUTH_INVALID_TOKEN);
  }

  // 验证密码
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw createAppError('Invalid email or password', ErrorCode.AUTH_INVALID_TOKEN);
  }

  // 获取最新用户数据
  const latestUser = await getUserById(user.id);
  if (!latestUser) {
    throw createAppError('User not found', ErrorCode.USER_NOT_FOUND);
  }

  // 检查用户状态
  if (latestUser.status === UserStatus.DISABLED) {
    throw createAppError('Account is disabled', ErrorCode.FORBIDDEN);
  }

  // 生成Token
  const token = generateAccessToken({
    userId: latestUser.id,
    email: latestUser.email,
    role: latestUser.role,
  });
  const refreshToken = generateRefreshToken(latestUser.id);

  logger.info('User logged in successfully', { userId: latestUser.id, email });

  return {
    token,
    refreshToken,
    expiresIn: 7 * 24 * 60 * 60,  // 7 days
    user: {
      id: latestUser.id,
      email: latestUser.email,
      name: latestUser.name,
      role: latestUser.role,
    },
  };
}

/**
 * 发送验证码
 */
export async function sendVerificationCode(
  email: string,
  type: AuthType
): Promise<{ expiresIn: number }> {
  logger.info('Sending verification code', { email, type });

  // 频率限制检查
  const rateLimitKey = `${email}:${type}`;
  const rateLimitResult = await incrementRateLimit(
    rateLimitKey,
    'email',
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW
  );

  if (!rateLimitResult.allowed) {
    throw createAppError(
      'Rate limit exceeded. Please try again later.',
      ErrorCode.RATE_LIMIT_EXCEEDED
    );
  }

  // 生成验证码
  const code = crypto.randomInt(100000, 1000000).toString();
  const codeKey = CacheKeys.verify(email, type);

  // 存储验证码 (使用缓存)
  await setCache(codeKey, 'VERIFY', code, VERIFICATION_CODE_TTL);

  // 发送验证邮件
  const emailSent = await sendVerificationEmail({
    email,
    code,
    type,
    expiresIn: VERIFICATION_CODE_TTL,
  });

  if (!emailSent) {
    logger.warn('Failed to send verification email', { email, type });
  }

  logger.info('Verification code sent', { email, type, emailSent });

  return { expiresIn: VERIFICATION_CODE_TTL };
}

/**
 * 验证验证码
 */
export async function verifyCode(email: string, code: string, type: AuthType): Promise<boolean> {
  const codeKey = CacheKeys.verify(email, type);
  const storedCode = await getFromCache<string>(codeKey, 'VERIFY');

  if (!storedCode) {
    throw createAppError('Verification code expired or not found', ErrorCode.AUTH_CODE_EXPIRED);
  }

  if (storedCode !== code) {
    throw createAppError('Invalid verification code', ErrorCode.AUTH_INVALID_CODE);
  }

  // 删除已使用的验证码
  await deleteFromCache(codeKey, 'VERIFY');

  logger.info('Verification code validated successfully', { email, type });
  return true;
}

/**
 * Token轮换
 */
export async function rotateRefreshToken(oldRefreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const config = getConfig();

  // 验证旧Refresh Token
  let decoded: { userId: string; type: string; jti: string };
  try {
    decoded = jwt.verify(oldRefreshToken, config.jwt.secret as Secret, {
      algorithms: ['HS256'],
    }) as { userId: string; type: string; jti: string };
  } catch {
    throw createAppError('Invalid refresh token', ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
  }

  if (decoded.type !== 'refresh') {
    throw createAppError('Invalid token type', ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
  }

  // 检查是否在黑名单
  const isBlacklisted = await isTokenBlacklisted(decoded.jti);
  if (isBlacklisted) {
    throw createAppError('Token has been revoked', ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
  }

  // 获取用户
  const user = await getUserById(decoded.userId);
  if (!user) {
    throw createAppError('User not found', ErrorCode.USER_NOT_FOUND);
  }

  if (user.status === UserStatus.DISABLED) {
    throw createAppError('Account is disabled', ErrorCode.FORBIDDEN);
  }

  // 将旧Token加入黑名单
  await addTokenToBlacklist(decoded.jti);

  // 生成新Token
  const newAccessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const newRefreshToken = generateRefreshToken(user.id);

  logger.info('Tokens rotated successfully', { userId: user.id });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: parseInt(config.jwt.expiresIn, 10),
  };
}

/**
 * 登出
 */
export async function logout(userId: string, refreshToken?: string): Promise<void> {
  logger.info('User logout', { userId });

  if (refreshToken) {
    try {
      const config = getConfig();
      const decoded = jwt.verify(refreshToken, config.jwt.secret as Secret) as { jti?: string };
      if (decoded.jti) {
        await addTokenToBlacklist(decoded.jti);
      }
    } catch {
      // Token无效，忽略
    }
  }
}

/**
 * 获取当前用户
 */
export async function getCurrentUser(userId: string): Promise<User | null> {
  if (!userId) return null;
  return getUserById(userId);
}

/**
 * 更新当前用户资料
 */
export async function updateCurrentUser(
  userId: string,
  data: {
    name?: string;
    phone?: string;
    profile?: { avatar?: string; wechat?: string };
  }
): Promise<User> {
  const { PK, SK } = createEntityKey('USER', userId);

  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, unknown> = {
    ':updatedAt': new Date().toISOString(),
  };
  const expressionAttributeNames: Record<string, string> = {};

  if (data.name !== undefined) {
    updateExpressions.push('#n = :name');
    expressionAttributeValues[':name'] = data.name;
    expressionAttributeNames['#n'] = 'name';
  }

  if (data.phone !== undefined) {
    updateExpressions.push('phone = :phone');
    expressionAttributeValues[':phone'] = data.phone;
  }

  if (data.profile !== undefined) {
    updateExpressions.push('profile = :profile');
    expressionAttributeValues[':profile'] = data.profile;
  }

  await updateItem(
    { PK, SK },
    `SET ${updateExpressions.join(', ')}, updatedAt = :updatedAt`,
    expressionAttributeValues,
    Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined
  );

  const updatedUser = await getUserById(userId);
  if (!updatedUser) {
    throw createAppError('User not found after update', ErrorCode.USER_NOT_FOUND);
  }

  logger.info('User profile updated', { userId });
  return updatedUser;
}

/**
 * 请求密码重置
 */
export async function requestPasswordReset(email: string): Promise<{ expiresIn: number }> {
  logger.info('Password reset requested', { email });

  const user = await getUserByEmail(email);

  if (user) {
    const result = await sendVerificationCode(email, AuthType.FORGOT_PASSWORD);
    return result;
  }

  // 防止用户枚举，始终返回成功
  logger.info('Password reset for non-existent email (no email sent)', { email });
  return { expiresIn: VERIFICATION_CODE_TTL };
}

/**
 * 重置密码
 */
export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  logger.info('Password reset attempt', { email });

  const isValid = await verifyCode(email, code, AuthType.FORGOT_PASSWORD);
  if (!isValid) {
    throw createAppError('Invalid or expired verification code', ErrorCode.AUTH_INVALID_CODE);
  }

  const user = await getUserByEmail(email);
  if (user) {
    const config = getConfig();
    const newPasswordHash = await bcrypt.hash(newPassword, config.auth.bcryptRounds);
    await updateUserPassword(user.id, newPasswordHash);
    logger.info('Password reset successful', { userId: user.id });
  } else {
    logger.info('Password reset for non-existent user', { email });
  }
}

// ============ 私有辅助函数 ============

export async function getUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase();

  try {
    const result = await queryItems<User>({
      indexName: 'GSI1-EmailIndex',
      keyConditionExpression: 'email = :email',
      expressionAttributeValues: { ':email': normalizedEmail },
      limit: 1,
    });

    if (result.items.length > 0) {
      const firstItem = result.items[0];
      const userId = firstItem.id;
      const { PK, SK } = createEntityKey('USER', userId);
      return getItem<User>({ PK, SK });
    }
  } catch (error) {
    logger.error('GSI query failed', { email, error });
  }

  return null;
}

export async function getUserById(userId: string): Promise<User | null> {
  const { PK, SK } = createEntityKey('USER', userId);
  return getItem<User>({ PK, SK });
}

async function updateUserPassword(userId: string, newPasswordHash: string): Promise<void> {
  const { PK, SK } = createEntityKey('USER', userId);
  await updateItem(
    { PK, SK },
    'SET passwordHash = :passwordHash, updatedAt = :updatedAt',
    {
      ':passwordHash': newPasswordHash,
      ':updatedAt': new Date().toISOString(),
    }
  );
}
```

---

## 四、RBAC 服务实现

### 4.1 RBAC 服务 (RBACService)

```typescript
// src/modules/auth/rbac.service.ts

import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import { UserRole } from '@shared/types';
import {
  Permission,
  Role,
  UserRole as UserRoleEntity,
  RoleApplication,
  Resource,
  Action,
  createUserRoleKey,
  createRoleKey,
  createPermissionKey,
  createRoleApplicationKey,
} from './rbac.types';
import { putItem, getItem, updateItem, queryItems, deleteItem } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache } from '@shared/db/cache';

/**
 * RBAC 服务类
 */
export class RBACService {
  /**
   * 检查用户是否拥有指定权限
   */
  async hasPermission(
    userId: string,
    resource: Resource,
    action: Action
  ): Promise<boolean> {
    const cacheKey = `permission:${userId}:${resource}:${action}`;
    const cached = await getFromCache<boolean>(cacheKey, 'RBAC');
    if (cached !== null) return cached;

    // 获取用户所有角色
    const roles = await this.getUserRoles(userId);
    
    // 检查每个角色是否有所需权限
    for (const role of roles) {
      const permissions = await this.getRolePermissions(role.roleId);
      const hasAccess = permissions.some(
        p => p.resource === resource && 
            (p.action === action || p.action === Action.MANAGE)
      );
      if (hasAccess) {
        await setCache(cacheKey, 'RBAC', true, 300);  // 缓存5分钟
        return true;
      }
    }

    await setCache(cacheKey, 'RBAC', false, 300);
    return false;
  }

  /**
   * 检查用户是否拥有指定角色
   */
  async hasRole(userId: string, roleCode: UserRole): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.some(r => r.roleCode === roleCode);
  }

  /**
   * 获取用户所有角色
   */
  async getUserRoles(userId: string): Promise<UserRoleEntity[]> {
    const cacheKey = `user:roles:${userId}`;
    const cached = await getFromCache<UserRoleEntity[]>(cacheKey, 'RBAC');
    if (cached) return cached;

    const result = await queryItems<UserRoleEntity>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': `USER_ROLE#${userId}`,
        ':sk': 'ROLE#',
      },
    });

    const activeRoles = result.items.filter(r => r.status === 'ACTIVE');
    await setCache(cacheKey, 'RBAC', activeRoles, 300);
    return activeRoles;
  }

  /**
   * 分配角色给用户
   */
  async assignRole(
    userId: string,
    roleId: string,
    roleCode: string,
    approvedBy: string,
    expiresAt?: string
  ): Promise<UserRoleEntity> {
    const now = new Date().toISOString();

    const userRole: UserRoleEntity = {
      ...createUserRoleKey(userId, roleId),
      SK: `ROLE#${roleId}`,
      entityType: 'USER_ROLE',
      dataCategory: 'RBAC',
      id: uuidv4(),
      userId,
      roleId,
      roleCode,
      status: 'ACTIVE',
      approvedBy,
      approvedAt: now,
      expiresAt,
      createdAt: now,
      updatedAt: now,
      GSI12PK: `ROLE#${roleId}`,
      GSI12SK: `USER#${userId}`,
    };

    await putItem(userRole);

    // 清除用户角色缓存
    await deleteCache(`user:roles:${userId}`, 'RBAC');

    logger.info('Role assigned', { userId, roleId, approvedBy });

    return userRole;
  }

  /**
   * 撤销用户角色
   */
  async revokeRole(userId: string, roleId: string, reason?: string): Promise<void> {
    const { PK, SK } = createUserRoleKey(userId, roleId);

    await updateItem(
      { PK, SK },
      'SET #status = :status, updatedAt = :now, approvalNote = :reason',
      {
        ':status': 'INACTIVE',
        ':now': new Date().toISOString(),
        ':reason': reason || 'Revoked by admin',
      },
      { '#status': 'status' }
    );

    // 清除用户角色缓存
    await deleteCache(`user:roles:${userId}`, 'RBAC');

    logger.info('Role revoked', { userId, roleId, reason });
  }

  /**
   * 申请角色
   */
  async applyForRole(
    userId: string,
    roleCode: UserRole,
    reason?: string,
    qualifications?: Array<{ type: string; value: string; documentUrl?: string }>
  ): Promise<RoleApplication> {
    const now = new Date().toISOString();

    const application: RoleApplication = {
      ...createRoleApplicationKey(uuidv4()),
      SK: 'METADATA',
      entityType: 'ROLE_APPLICATION',
      dataCategory: 'RBAC',
      id: uuidv4(),
      userId,
      requestedRoleCode: roleCode,
      reason,
      qualifications,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
      GSI13PK: `USER#${userId}`,
      GSI13SK: `STATUS#PENDING`,
    };

    await putItem(application);

    // 通知管理员审批
    await notificationService.sendAdminNotification('role_application', {
      userId,
      roleCode,
      applicationId: application.id,
    });

    logger.info('Role application submitted', { userId, roleCode });

    return application;
  }

  /**
   * 审批角色申请
   */
  async approveRoleApplication(
    applicationId: string,
    adminId: string,
    action: 'approve' | 'reject',
    note?: string
  ): Promise<RoleApplication> {
    const application = await getItem<RoleApplication>(
      createRoleApplicationKey(applicationId)
    );

    if (!application) {
      throw new Error('Application not found');
    }

    const now = new Date().toISOString();
    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';

    // 更新申请状态
    const updated = await updateItem(
      createRoleApplicationKey(applicationId),
      `SET #status = :status, reviewedBy = :adminId, reviewedAt = :now, reviewNote = :note, updatedAt = :now`,
      {
        ':status': status,
        ':adminId': adminId,
        ':now': now,
        ':note': note,
      },
      { '#status': 'status' }
    ) as RoleApplication;

    // 如果批准，分配角色
    if (action === 'approve') {
      const role = await this.getRoleByCode(application.requestedRoleCode);
      if (role) {
        await this.assignRole(
          application.userId,
          role.id,
          role.code,
          adminId
        );
      }
    }

    // 通知申请人
    await notificationService.sendUserNotification(
      application.userId,
      `role_application_${action}d`,
      { roleCode: application.requestedRoleCode, note }
    );

    logger.info('Role application processed', { applicationId, action, adminId });

    return updated;
  }

  /**
   * 获取角色权限
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const role = await getItem<Role>(createRoleKey(roleId));
    if (!role) return [];

    // 获取所有权限
    const permissions: Permission[] = [];
    for (const permissionId of role.permissionIds) {
      const permission = await getItem<Permission>(createPermissionKey(permissionId));
      if (permission) {
        permissions.push(permission);
      }
    }

    return permissions;
  }

  /**
   * 根据代码获取角色
   */
  async getRoleByCode(code: string): Promise<Role | null> {
    try {
      const result = await queryItems<Role>({
        indexName: 'GSI10-RoleByCode',
        keyConditionExpression: 'GSI10PK = :pk',
        expressionAttributeValues: {
          ':pk': `CODE#${code}`,
        },
      });
      return result.items[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * 获取所有角色
   */
  async getAllRoles(): Promise<Role[]> {
    const result = await queryItems<Role>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': 'ROLE',
        ':sk': 'METADATA',
      },
    });
    return result.items;
  }
}

export const rbacService = new RBACService();
```

### 4.2 预定义角色与权限

```typescript
// src/modules/auth/rbac.service.ts (续)

/**
 * 预定义系统角色
 */
export const SYSTEM_ROLES: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    PK: 'ROLE#admin',
    SK: 'METADATA',
    entityType: 'ROLE',
    dataCategory: 'RBAC',
    code: 'ADMIN',
    name: '管理员',
    nameEn: 'Administrator',
    description: '系统管理员，拥有所有权限',
    level: 100,
    isSystem: true,
    permissionIds: [],  // 管理员拥有所有权限
    isActive: true,
    GSI10PK: 'CODE#ADMIN',
    GSI10SK: 'METADATA',
    GSI11PK: 'LEVEL#100',
    GSI11SK: 'METADATA',
  },
  {
    PK: 'ROLE#parent',
    SK: 'METADATA',
    entityType: 'ROLE',
    dataCategory: 'RBAC',
    code: 'PARENT',
    name: '家长',
    nameEn: 'Parent',
    description: '学生家长/客户',
    level: 10,
    isSystem: true,
    permissionIds: ['permission_course_read', 'permission_booking_create'],
    isActive: true,
    GSI10PK: 'CODE#PARENT',
    GSI10SK: 'METADATA',
    GSI11PK: 'LEVEL#10',
    GSI11SK: 'METADATA',
  },
  {
    PK: 'ROLE#teacher',
    SK: 'METADATA',
    entityType: 'ROLE',
    dataCategory: 'RBAC',
    code: 'TEACHER',
    name: '教师',
    nameEn: 'Teacher',
    description: '认证教师',
    level: 50,
    isSystem: true,
    permissionIds: [
      'permission_course_manage_own',
      'permission_booking_manage_own',
      'permission_review_respond',
    ],
    isActive: true,
    GSI10PK: 'CODE#TEACHER',
    GSI10SK: 'METADATA',
    GSI11PK: 'LEVEL#50',
    GSI11SK: 'METADATA',
  },
  {
    PK: 'ROLE#institution',
    SK: 'METADATA',
    entityType: 'ROLE',
    dataCategory: 'RBAC',
    code: 'INSTITUTION',
    name: '机构',
    nameEn: 'Institution',
    description: '教育机构',
    level: 50,
    isSystem: true,
    permissionIds: [
      'permission_course_manage_own',
      'permission_booking_manage_own',
    ],
    isActive: true,
    GSI10PK: 'CODE#INSTITUTION',
    GSI10SK: 'METADATA',
    GSI11PK: 'LEVEL#50',
    GSI11SK: 'METADATA',
  },
];

/**
 * 预定义权限
 */
export const SYSTEM_PERMISSIONS: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    PK: 'PERMISSION#permission_course_read',
    SK: 'METADATA',
    entityType: 'PERMISSION',
    dataCategory: 'RBAC',
    code: 'course:read',
    name: '查看课程',
    nameEn: 'View Courses',
    description: '浏览和搜索课程',
    resource: Resource.COURSE,
    action: Action.READ,
    roleIds: ['ROLE#parent', 'ROLE#teacher', 'ROLE#institution', 'ROLE#admin'],
  },
  {
    PK: 'PERMISSION#permission_course_manage_own',
    SK: 'METADATA',
    entityType: 'PERMISSION',
    dataCategory: 'RBAC',
    code: 'course:manage:own',
    name: '管理自己的课程',
    nameEn: 'Manage Own Courses',
    description: '创建、编辑、删除自己的课程',
    resource: Resource.COURSE,
    action: Action.MANAGE,
    roleIds: ['ROLE#teacher', 'ROLE#institution', 'ROLE#admin'],
  },
  {
    PK: 'PERMISSION#permission_booking_create',
    SK: 'METADATA',
    entityType: 'PERMISSION',
    dataCategory: 'RBAC',
    code: 'booking:create',
    name: '创建预约',
    nameEn: 'Create Booking',
    description: '创建课程预约',
    resource: Resource.BOOKING,
    action: Action.CREATE,
    roleIds: ['ROLE#parent', 'ROLE#admin'],
  },
  {
    PK: 'PERMISSION#permission_booking_manage_own',
    SK: 'METADATA',
    entityType: 'PERMISSION',
    dataCategory: 'RBAC',
    code: 'booking:manage:own',
    name: '管理自己的预约',
    nameEn: 'Manage Own Bookings',
    description: '管理自己课程的预约',
    resource: Resource.BOOKING,
    action: Action.MANAGE,
    roleIds: ['ROLE#teacher', 'ROLE#institution', 'ROLE#admin'],
  },
  {
    PK: 'PERMISSION#permission_review_respond',
    SK: 'METADATA',
    entityType: 'PERMISSION',
    dataCategory: 'RBAC',
    code: 'review:respond',
    name: '回复评价',
    nameEn: 'Respond to Reviews',
    description: '回复学生/家长的评价',
    resource: Resource.REVIEW,
    action: Action.UPDATE,
    roleIds: ['ROLE#teacher', 'ROLE#institution', 'ROLE#admin'],
  },
  {
    PK: 'PERMISSION#permission_admin_manage',
    SK: 'METADATA',
    entityType: 'PERMISSION',
    dataCategory: 'RBAC',
    code: 'admin:manage',
    name: '后台管理',
    nameEn: 'Admin Management',
    description: '访问管理后台',
    resource: Resource.ADMIN,
    action: Action.MANAGE,
    roleIds: ['ROLE#admin'],
  },
];
```

---

## 五、中间件设计

### 5.1 认证中间件

```typescript
// src/shared/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { getConfig } from '../../config';
import { logger } from '../../core/logger';
import { UnauthorizedError, ErrorCode } from '../../core/errors';
import { createErrorResponse } from '../types/api';
import { getFromCache, setCache, CacheKeys } from '../db/cache';
import { getUserById } from '../../modules/auth/auth.service';

// 扩展 Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  type?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
  iss?: string;
  jti?: string;
}

const BLACKLIST_TTL_SECONDS = 86400;

/**
 * Token黑名单操作
 */
export async function addTokenToBlacklist(jti: string): Promise<void> {
  const key = CacheKeys.session(jti);
  await setCache(key, 'SESSION', 'revoked', BLACKLIST_TTL_SECONDS);
  logger.info('Token added to blacklist', { jti });
}

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const key = CacheKeys.session(jti);
  const result = await getFromCache<string>(key, 'SESSION');
  return result === 'revoked';
}

/**
 * 提取Token
 */
function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2) return null;
  const [scheme, token] = parts;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token;
}

/**
 * 验证Token
 */
export async function verifyToken(token: string): Promise<JwtPayload> {
  const config = getConfig();

  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      algorithms: [config.jwt.algorithm],
      issuer: config.jwt.issuer,
    }) as JwtPayload;

    const isBlacklisted = await isTokenBlacklisted(decoded.jti || '');
    if (isBlacklisted) {
      throw new UnauthorizedError('Token has been revoked');
    }

    return decoded;
  } catch (error) {
    const err = error as Error & { name?: string };
    if (error instanceof UnauthorizedError) throw error;
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token has expired');
    }
    if (err.name === 'JsonWebTokenError') {
      throw new UnauthorizedError('Invalid token');
    }
    throw new UnauthorizedError('Authentication failed');
  }
}

/**
 * 认证中间件
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req.headers.authorization);
    if (!token) {
      throw new UnauthorizedError('No authentication token provided');
    }

    const payload = await verifyToken(token);
    req.user = payload;

    logger.debug('User authenticated', { userId: payload.userId });
    next();
  } catch (error) {
    const requestId = req.headers['x-request-id'] as string;

    if (error instanceof UnauthorizedError) {
      res.status(401).json(createErrorResponse(error.code, error.message, undefined, requestId));
    } else {
      logger.error('Authentication middleware error', { error });
      res.status(500).json(
        createErrorResponse(ErrorCode.INTERNAL_ERROR, 'Authentication failed', undefined, requestId)
      );
    }
  }
}

/**
 * 可选认证中间件
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req.headers.authorization);
    if (token) {
      const payload = await verifyToken(token);
      req.user = payload;
    }
    next();
  } catch {
    next();
  }
}

/**
 * 基于角色的授权中间件
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const requestId = req.headers['x-request-id'] as string;

      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json(
          createErrorResponse(
            ErrorCode.FORBIDDEN,
            'Access denied. Insufficient permissions.',
            undefined,
            requestId
          )
        );
        return;
      }

      next();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        res.status(401).json(
          createErrorResponse(
            error.code,
            error.message,
            undefined,
            req.headers['x-request-id'] as string
          )
        );
      } else {
        logger.error('Authorization middleware error', { error });
        next(error as Error);
      }
    }
  };
}

/**
 * 基于权限的授权中间件
 */
export function requirePermission(
  resource: string,
  action: string
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const userId = req.user.userId;
      const hasPermission = await rbacService.hasPermission(
        userId,
        resource as any,
        action as any
      );

      if (!hasPermission) {
        res.status(403).json(
          createErrorResponse('FORBIDDEN', 'Insufficient permissions')
        );
        return;
      }

      next();
    } catch (error) {
      logger.error('Permission check error', { error });
      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', 'Permission check failed')
      );
    }
  };
}

/**
 * 生成Access Token
 */
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const config = getConfig();
  const jti = crypto.randomUUID();

  const signOptions: SignOptions = {
    algorithm: config.jwt.algorithm as jwt.Algorithm,
    expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'],
    issuer: config.jwt.issuer,
    jwtid: jti,
  };

  return jwt.sign({ ...payload, type: 'access' }, config.jwt.secret, signOptions);
}

/**
 * 生成Refresh Token
 */
export function generateRefreshToken(userId: string): string {
  const config = getConfig();
  const jti = crypto.randomUUID();

  const signOptions: SignOptions = {
    algorithm: config.jwt.algorithm as jwt.Algorithm,
    expiresIn: config.jwt.refreshExpiresIn as SignOptions['expiresIn'],
    issuer: config.jwt.issuer,
    jwtid: jti,
  };

  return jwt.sign({ userId, type: 'refresh' }, config.jwt.secret, signOptions);
}
```

---

## 六、API 设计

### 6.1 API 列表

| 方法 | 路径 | 功能 | 认证 | 角色限制 |
|------|------|------|------|----------|
| **用户认证** |
| POST | /auth/register | 用户注册 | 无 | - |
| POST | /auth/login | 用户登录 | 无 | - |
| POST | /auth/logout | 登出 | Bearer Token | - |
| POST | /auth/refresh | 刷新Token | 无 | - |
| **验证码** |
| POST | /auth/send-verification-code | 发送验证码 | 无 | - |
| POST | /auth/verify-code | 验证验证码 | 无 | - |
| **密码管理** |
| POST | /auth/password/reset-request | 忘记密码请求 | 无 | - |
| POST | /auth/password/reset | 重置密码 | 无 | - |
| **用户资料** |
| GET | /auth/me | 获取当前用户 | Bearer Token | - |
| PUT | /auth/me | 更新用户资料 | Bearer Token | - |
| **RBAC** |
| GET | /auth/roles | 获取我的角色 | Bearer Token | - |
| POST | /auth/roles/apply | 申请角色 | Bearer Token | PARENT |
| GET | /auth/roles/applications | 我的申请列表 | Bearer Token | - |
| GET | /admin/role-applications | 审批列表 | Bearer Token | ADMIN |
| POST | /admin/role-applications/:id/process | 审批申请 | Bearer Token | ADMIN |

### 6.2 API 详细设计

#### 6.2.1 POST /api/v1/auth/register

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "张三",
  "role": "PARENT",
  "phone": "021-123-4567",
  "language": "zh"
}
```

**响应** (201):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "张三",
      "role": "PARENT",
      "status": "ACTIVE"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800
  }
}
```

#### 6.2.2 GET /api/v1/auth/roles

**响应** (200):
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "roleId": "role_123",
        "roleCode": "PARENT",
        "roleName": "家长",
        "status": "ACTIVE",
        "permissions": ["course:read", "booking:create"]
      }
    ],
    "availableRoles": ["TEACHER", "INSTITUTION"]
  }
}
```

---

## 七、测试用例

### 7.1 单元测试

```typescript
// src/modules/auth/auth.service.test.ts

describe('AuthService', () => {
  describe('register', () => {
    it('should register new user successfully', async () => {
      const dto = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: '新用户',
        role: UserRole.PARENT,
      };

      const result = await register(dto);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.role).toBe(UserRole.PARENT);
    });

    it('should reject duplicate email', async () => {
      const dto = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        name: '用户',
        role: UserRole.PARENT,
      };

      await expect(register(dto)).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should return tokens on successful login', async () => {
      const result = await login({
        email: 'user@example.com',
        password: 'SecurePass123!',
      });

      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      await expect(login({
        email: 'user@example.com',
        password: 'WrongPassword!',
      })).rejects.toThrow('Invalid email or password');
    });
  });
});

describe('RBACService', () => {
  describe('hasPermission', () => {
    it('should return true for parent viewing courses', async () => {
      const result = await rbacService.hasPermission(
        'user_123',
        Resource.COURSE,
        Action.READ
      );
      expect(result).toBe(true);
    });

    it('should return false for parent managing admin', async () => {
      const result = await rbacService.hasPermission(
        'user_123',
        Resource.ADMIN,
        Action.MANAGE
      );
      expect(result).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true for user with PARENT role', async () => {
      const result = await rbacService.hasRole('user_123', UserRole.PARENT);
      expect(result).toBe(true);
    });
  });
});
```

---

## 八、验收标准

### 8.1 功能验收

- [ ] 用户可通过邮箱+验证码注册
- [ ] 用户可通过邮箱+密码登录
- [ ] 注册/登录后获得Access Token和Refresh Token
- [ ] Access Token用于认证API访问
- [ ] Refresh Token用于续期Access Token
- [ ] 登出后Token加入黑名单
- [ ] 忘记密码功能正常
- [ ] 用户资料可获取和更新

### 8.2 RBAC 验收

- [ ] 用户可查看自己的角色
- [ ] 用户可申请新角色 (如教师、机构)
- [ ] 管理员可审批角色申请
- [ ] 权限检查正常工作
- [ ] 角色叠加支持 (如: PARENT + TEACHER)

### 8.3 安全验收

- [ ] 验证码6位数字，加密安全
- [ ] 验证码5分钟有效期
- [ ] 发送频率限制
- [ ] 密码强度验证 (12字符+大小写+数字+特殊字符)
- [ ] Token黑名单机制
- [ ] HTTPS强制

---

## 九、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 验证码发送失败 | 低 | 中 | 重试机制，错误提示 |
| 并发注册同一邮箱 | 低 | 中 | DynamoDB条件写入 |
| Token泄露 | 中 | 高 | HTTPS，黑名单，短有效期 |
| 暴力破解 | 中 | 中 | 频率限制，验证码 |
| RBAC配置错误 | 中 | 中 | 权限测试用例覆盖 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/auth/tech-auth.md`

**相关文档**:
- [产品设计 - 用户注册与认证](../../05-product-design/user/user-registration.md)
- [产品设计 - 角色生命周期](../../05-product-design/user/role-lifecycle.md)
- [测试策略](../docs/test-strategy.md)
- [用户故事](../user/story-user.md)

**代码实现**:
- `07-backend/src/modules/auth/` - 认证模块
- `07-backend/src/shared/middleware/auth.ts` - 认证中间件
