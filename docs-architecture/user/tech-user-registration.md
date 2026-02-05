---
title: 技术实现 - 用户注册与认证
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 1
priority: P0
status: pending-implementation
related_feature: ../../05-product-design/user/user-registration.md
---

# 技术实现: 用户注册与认证

> **对应产品文档**: [user-registration.md](../../05-product-design/user/user-registration.md) | **优先级**: P0 | **排期**: Phase 1 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      用户认证技术架构                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   └── 微信小程序 (Taro)                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── POST /api/v1/auth/register                                    │
│   ├── POST /api/v1/auth/login                                       │
│   ├── POST /api/v1/auth/verify-code                                 │
│   ├── POST /api/v1/auth/send-verification-code                      │
│   ├── POST /api/v1/auth/refresh                                     │
│   ├── POST /api/v1/auth/logout                                      │
│   ├── POST /api/v1/auth/forgot-password                             │
│   ├── GET  /api/v1/auth/me                                          │
│   ├── PUT  /api/v1/auth/me                                          │
│   └── POST /api/v1/auth/reset-password                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   └── AuthService (认证服务)                                         │
│       ├── register()                                                │
│       ├── login()                                                   │
│       ├── verifyCode()                                              │
│       ├── sendVerificationCode()                                    │
│       ├── refreshToken()                                            │
│       ├── logout()                                                  │
│       ├── requestPasswordReset()                                    │
│       ├── resetPassword()                                           │
│       └── getProfile() / updateProfile()                            │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   ├── DynamoDB (FindClass-MainTable)                                │
│   │   ├── USER#{userId} / METADATA                                  │
│   │   ├── USER#{userId}#SESSION{sessionId}                          │
│   │   ├── USER#{userId}#TOKEN{tokenId}                              │
│   │   ├── USER#{email}#VERIFICATION{codeId}                         │
│   │   └── BLACKLIST#TOKEN{tokenHash}                                │
│   └── Redis (可选，用于验证码频率限制)                                │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [外部服务]                                                         │
│   ├── Email Service (SendGrid)                                      │
│   └── SMS Service (可选)                                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/auth/
├── auth.types.ts           # 类型定义
├── auth.service.ts         # 业务逻辑
├── auth.controller.ts      # API 控制器
├── auth.routes.ts          # 路由配置
├── auth.middleware.ts      # Token 验证中间件
├── auth.test.ts            # 测试文件
└── index.ts                # 模块导出

07-backend/src/modules/users/
├── users.types.ts          # 用户类型
├── users.service.ts        # 用户服务
├── users.controller.ts     # 用户API
├── users.routes.ts         # 用户路由
└── index.ts                # 模块导出
```

---

## 二、数据模型设计 (DynamoDB)

### 2.1 用户表 (Users)

```typescript
// src/modules/auth/auth.types.ts

/**
 * 用户状态枚举
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

/**
 * 用户角色枚举
 */
export enum UserRole {
  CUSTOMER = 'customer',      // 客户/家长
  TEACHER = 'teacher',        // 教师
  INSTITUTION = 'institution', // 机构
  ADMIN = 'admin',            // 管理员
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
  avatar?: string;
  role: UserRole;
  status: UserStatus;

  // 认证信息
  emailVerified: boolean;
  phoneVerified: boolean;
  passwordHash?: string;

  // 设置
  language: string;     // 'zh' | 'en'
  timezone: string;
  notificationSettings?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };

  // 统计信息
  favoriteCount: number;
  lastLoginAt?: string;

  // 时间戳
  createdAt: string;
  updatedAt: string;

  // GSI 索引
  GSI1PK?: string;      // EMAIL#{email}
  GSI1SK?: string;      // METADATA
  GSI2PK?: string;      // ROLE#{role}
  GSI2SK?: string;      // STATUS#{status}
}

/**
 * 验证码 DynamoDB 类型
 */
export interface VerificationCode {
  // DynamoDB 主键
  PK: string;           // USER#{email}#VERIFICATION
  SK: string;           // CODE#{codeId}

  entityType: 'VERIFICATION_CODE';
  dataCategory: 'AUTH';
  id: string;

  email: string;
  code: string;
  type: 'register' | 'login' | 'password_reset' | 'email_change';
  status: 'pending' | 'used' | 'expired';

  expiresAt: string;
  createdAt: string;
  usedAt?: string;
}

/**
 * Token 黑名单 DynamoDB 类型
 */
export interface TokenBlacklist {
  // DynamoDB 主键
  PK: string;           // BLACKLIST#TOKEN
  SK: string;           // TOKEN#{tokenHash}

  entityType: 'TOKEN_BLACKLIST';
  dataCategory: 'AUTH';
  id: string;

  tokenHash: string;
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
  ip: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;

  createdAt: string;
}
```

### 2.2 实体键生成函数

```typescript
// src/modules/auth/auth.types.ts (续)

import { createEntityKey } from '@shared/db/dynamodb';

/**
 * 生成用户主键
 */
export function createUserKey(userId: string): { PK: string; SK: string } {
  return createEntityKey('USER', userId);
}

/**
 * 生成用户邮箱索引键
 */
export function createUserEmailIndexKey(email: string): { PK: string; SK: string } {
  return {
    PK: `EMAIL#${email}`,
    SK: 'METADATA',
  };
}

/**
 * 生成验证码主键
 */
export function createVerificationKey(email: string, codeId: string): { PK: string; SK: string } {
  return {
    PK: `USER#${email}#VERIFICATION`,
    SK: `CODE#${codeId}`,
  };
}

/**
 * 生成Token黑名单主键
 */
export function createTokenBlacklistKey(tokenHash: string): { PK: string; SK: string } {
  return {
    PK: 'BLACKLIST#TOKEN',
    SK: `TOKEN#${tokenHash}`,
  };
}

/**
 * 生成登录日志主键
 */
export function createLoginLogKey(userId: string, timestamp: string): { PK: string; SK: string } {
  return {
    PK: `USER#${userId}#LOGIN`,
    SK: `TIMESTAMP#${timestamp}`,
  };
}
```

---

## 三、业务逻辑实现

### 3.1 验证码服务

```typescript
// src/modules/auth/auth.service.ts
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { logger } from '@core/logger';
import {
  User,
  UserStatus,
  UserRole,
  VerificationCode,
  TokenBlacklist,
  LoginLog,
  createUserKey,
  createUserEmailIndexKey,
  createVerificationKey,
  createTokenBlacklistKey,
  createLoginLogKey,
} from './auth.types';
import { putItem, getItem, queryItems, updateItem, deleteItem } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache, incrementCache } from '@shared/db/cache';
import { sendEmail } from '@shared/smtp';
import { config } from '@config';

/**
 * 验证码配置
 */
const VERIFICATION_CONFIG = {
  CODE_LENGTH: 6,
  CODE_TTL_MINUTES: 5,
  MAX_SEND_PER_HOUR: 10,
  MAX_SEND_PER_DAY: 30,
};

/**
 * Token配置
 */
const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  REFRESH_TOKEN_LENGTH: 64,
};

export class AuthService {
  /**
   * 生成加密安全的验证码
   */
  generateVerificationCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * 发送验证码
   */
  async sendVerificationCode(
    email: string,
    type: 'register' | 'login' | 'password_reset' | 'email_change'
  ): Promise<{ success: boolean; message: string }> {
    // 频率限制检查
    const hourlyKey = `verify:hourly:${email}`;
    const dailyKey = `verify:daily:${email}`;

    const hourlyCount = (await getFromCache(hourlyKey, 'AUTH')) || 0;
    if (hourlyCount >= VERIFICATION_CONFIG.MAX_SEND_PER_HOUR) {
      return { success: false, message: '发送频率超限，请稍后再试' };
    }

    const dailyCount = (await getFromCache(dailyKey, 'AUTH')) || 0;
    if (dailyCount >= VERIFICATION_CONFIG.MAX_SEND_PER_DAY) {
      return { success: false, message: '今日发送次数已达上限' };
    }

    // 生成验证码
    const codeId = uuidv4();
    const code = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_CONFIG.CODE_TTL_MINUTES * 60 * 1000).toISOString();

    // 保存验证码
    const verification: VerificationCode = {
      ...createVerificationKey(email, codeId),
      entityType: 'VERIFICATION_CODE',
      dataCategory: 'AUTH',
      id: codeId,
      email,
      code,
      type,
      status: 'pending',
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    await putItem(verification);

    // 增加发送计数
    await incrementCache(hourlyKey, 'AUTH', 3600);
    await incrementCache(dailyKey, 'AUTH', 86400);

    // 发送邮件
    try {
      await sendEmail({
        to: email,
        subject: `【FindClass】您的验证码是：${code}`,
        html: this.getVerificationEmailTemplate(code, VERIFICATION_CONFIG.CODE_TTL_MINUTES),
      });
    } catch (error) {
      logger.error('Failed to send verification email', { email, error });
      return { success: false, message: '验证码发送失败，请稍后重试' };
    }

    logger.info('Verification code sent', { email, type });

    return { success: true, message: '验证码已发送' };
  }

  /**
   * 验证验证码
   */
  async verifyCode(
    email: string,
    code: string,
    type: 'register' | 'login' | 'password_reset' | 'email_change'
  ): Promise<{ valid: boolean; codeId?: string; error?: string }> {
    // 查询验证码
    const result = await queryItems<VerificationCode>({
      indexName: 'GSI1-EmailIndex',
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': `USER#${email}#VERIFICATION`,
        ':sk': 'CODE#',
      },
      limit: 10,
    });

    const verification = result.items.find(
      (v) => v.code === code && v.type === type && v.status === 'pending'
    );

    if (!verification) {
      return { valid: false, error: '验证码错误或已过期' };
    }

    // 检查是否过期
    if (new Date(verification.expiresAt) < new Date()) {
      return { valid: false, error: '验证码已过期' };
    }

    // 标记为已使用
    await updateItem(
      { PK: verification.PK, SK: verification.SK },
      'SET #status = :status, usedAt = :usedAt',
      {
        '#status': 'used',
        ':usedAt': new Date().toISOString(),
      }
    );

    return { valid: true, codeId: verification.id };
  }

  /**
   * 用户注册
   */
  async register(params: {
    email: string;
    password: string;
    name: string;
    verificationCode: string;
  }): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const { email, password, name, verificationCode } = params;

    // 验证验证码
    const verifyResult = await this.verifyCode(email, verificationCode, 'register');
    if (!verifyResult.valid) {
      throw new Error(verifyResult.error);
    }

    // 检查邮箱是否已存在
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      throw new Error('该邮箱已注册');
    }

    // 密码强度验证
    this.validatePasswordStrength(password);

    // 密码哈希
    const passwordHash = await this.hashPassword(password);

    const now = new Date().toISOString();
    const userId = uuidv4();

    // 创建用户
    const user: User = {
      ...createUserKey(userId),
      entityType: 'USER',
      dataCategory: 'USER',
      id: userId,
      email,
      name,
      emailVerified: true,
      phoneVerified: false,
      passwordHash,
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      language: 'zh',
      timezone: 'Pacific/Auckland',
      favoriteCount: 0,
      createdAt: now,
      updatedAt: now,
      GSI1PK: `EMAIL#${email}`,
      GSI1SK: 'METADATA',
      GSI2PK: `ROLE#${UserRole.CUSTOMER}`,
      GSI2SK: `STATUS#${UserStatus.ACTIVE}`,
    };

    await putItem(user);

    // 生成Token
    const { accessToken, refreshToken } = await this.generateTokens(userId, user.role);

    logger.info('User registered', { userId, email });

    return { user, accessToken, refreshToken };
  }

  /**
   * 用户登录
   */
  async login(params: {
    email: string;
    verificationCode: string;
  }): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const { email, verificationCode } = params;

    // 验证码登录
    const verifyResult = await this.verifyCode(email, verificationCode, 'login');
    if (!verifyResult.valid) {
      throw new Error(verifyResult.error);
    }

    // 获取用户
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error('用户不存在');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new Error('账户已被禁用');
    }

    // 生成Token
    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.role);

    // 更新最后登录时间
    await updateItem(
      createUserKey(user.id),
      'SET lastLoginAt = :now, updatedAt = :now',
      { ':now': new Date().toISOString() }
    );

    logger.info('User logged in', { userId: user.id, email });

    return { user, accessToken, refreshToken };
  }

  /**
   * 获取用户资料
   */
  async getProfile(userId: string): Promise<User | null> {
    const { PK, SK } = createUserKey(userId);
    return getItem<User>({ PK, SK });
  }

  /**
   * 更新用户资料
   */
  async updateProfile(
    userId: string,
    params: { name?: string; phone?: string; language?: string; timezone?: string }
  ): Promise<User> {
    const user = await this.getProfile(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    const now = new Date().toISOString();
    const updateParts: string[] = ['updatedAt = :now'];
    const values: Record<string, unknown> = { ':now': now };

    if (params.name) {
      updateParts.push('name = :name');
      values[':name'] = params.name;
    }
    if (params.phone !== undefined) {
      updateParts.push('phone = :phone');
      values[':phone'] = params.phone;
    }
    if (params.language) {
      updateParts.push('language = :language');
      values[':language'] = params.language;
    }
    if (params.timezone) {
      updateParts.push('timezone = :timezone');
      values[':timezone'] = params.timezone;
    }

    const updated = await updateItem(
      createUserKey(userId),
      `SET ${updateParts.join(', ')}`,
      values
    ) as User;

    logger.info('User profile updated', { userId });

    return updated;
  }

  /**
   * 刷新Token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = this.verifyToken(refreshToken);
    if (!payload || payload.type !== 'refresh') {
      throw new Error('无效的刷新Token');
    }

    const { userId, role } = payload;
    return this.generateTokens(userId, role);
  }

  /**
   * 登出
   */
  async logout(userId: string, accessToken: string): Promise<void> {
    // 将Access Token加入黑名单
    const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
    const payload = this.verifyToken(accessToken);

    if (payload && payload.exp) {
      const blacklistEntry: TokenBlacklist = {
        ...createTokenBlacklistKey(tokenHash),
        entityType: 'TOKEN_BLACKLIST',
        dataCategory: 'AUTH',
        id: uuidv4(),
        tokenHash,
        userId,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      };

      await putItem(blacklistEntry);
    }

    logger.info('User logged out', { userId });
  }

  // ============ 私有辅助方法 ============

  private async getUserByEmail(email: string): Promise<User | null> {
    const { PK, SK } = createUserEmailIndexKey(email);
    return getItem<User>({ PK, SK });
  }

  private async generateTokens(userId: string, role: UserRole): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // 生成Access Token
    const accessToken = this.createToken(userId, role, 'access', TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY);

    // 生成Refresh Token
    const refreshToken = this.createToken(userId, role, 'refresh', TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY);

    return { accessToken, refreshToken };
  }

  private createToken(
    userId: string,
    role: UserRole,
    type: 'access' | 'refresh',
    expiry: string
  ): string {
    // JWT token creation logic
    const payload = {
      userId,
      role,
      type,
      iat: Math.floor(Date.now() / 1000),
      // exp would be calculated based on expiry
    };
    return `mock-jwt-token-${userId}-${type}-${Date.now()}`;
  }

  private verifyToken(token: string): {
    userId: string;
    role: UserRole;
    type: 'access' | 'refresh';
    exp?: number;
  } | null {
    // JWT verify logic
    if (token.startsWith('mock-jwt-token-')) {
      const parts = token.split('-');
      return {
        userId: parts[3],
        role: UserRole.CUSTOMER,
        type: parts[4] as 'access' | 'refresh',
      };
    }
    return null;
  }

  private validatePasswordStrength(password: string): void {
    const minLength = 12;
    if (password.length < minLength) {
      throw new Error(`密码长度至少需要${minLength}个字符`);
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new Error('密码必须包含大小写字母、数字和特殊字符');
    }
  }

  private async hashPassword(password: string): Promise<string> {
    // bcrypt hash logic
    return `hashed-password-${password}`;
  }

  private getVerificationEmailTemplate(code: string, ttlMinutes: number): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1890ff;">FindClass NZ</h1>
        <p>您的验证码是：<strong style="font-size: 24px; letter-spacing: 4px;">${code}</strong></p>
        <p>验证码将在${ttlMinutes}分钟后过期，请尽快使用。</p>
        <p>如果您没有请求此验证码，请忽略此邮件。</p>
      </div>
    `;
  }
}

export const authService = new AuthService();
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| **用户认证** |
| POST | /api/v1/auth/register | 用户注册 | 需验证码 |
| POST | /api/v1/auth/login | 用户登录 | 验证码登录 |
| POST | /api/v1/auth/logout | 登出 | Token黑名单 |
| POST | /api/v1/auth/refresh | 刷新Token | Refresh Token |
| **验证码** |
| POST | /api/v1/auth/send-verification-code | 发送验证码 | 频率限制 |
| POST | /api/v1/auth/verify-code | 验证验证码 | |
| **密码管理** |
| POST | /api/v1/auth/forgot-password | 忘记密码请求 | 发送重置码 |
| POST | /api/v1/auth/reset-password | 重置密码 | 需验证码 |
| **用户资料** |
| GET | /api/v1/auth/me | 获取资料 | 需认证 |
| PUT | /api/v1/auth/me | 更新资料 | 需认证 |

### 4.2 API 详细设计

#### 4.2.1 POST /api/v1/auth/register

**请求头**: Authorization: Bearer \<token\>

**请求示例**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "张三",
  "verificationCode": "123456"
}
```

**响应示例** (201):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "张三",
      "role": "customer",
      "status": "active"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 4.2.2 POST /api/v1/auth/send-verification-code

**请求示例**:
```json
{
  "email": "user@example.com",
  "type": "register"
}
```

**响应示例** (200):
```json
{
  "success": true,
  "message": "验证码已发送"
}
```

---

## 五、中间件设计

### 5.1 Token 验证中间件

```typescript
// src/shared/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { authService } from '@modules/auth/auth.service';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: '未提供认证Token',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // 验证Token
    const payload = authService.verifyToken(token);
    if (!payload) {
      res.status(401).json({
        success: false,
        error: '无效的Token',
      });
      return;
    }

    // 检查Token类型
    if (payload.type !== 'access') {
      res.status(401).json({
        success: false,
        error: '请使用Access Token',
      });
      return;
    }

    // 附加用户信息到请求
    req.user = {
      userId: payload.userId,
      role: payload.role,
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: '认证失败',
    });
  }
};

export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = authService.verifyToken(token);

      if (payload) {
        req.user = {
          userId: payload.userId,
          role: payload.role,
        };
      }
    }

    next();
  } catch (error) {
    next();
  }
};
```

---

## 六、测试用例

### 6.1 单元测试

```typescript
// src/modules/auth/auth.service.test.ts
import { authService } from './auth.service';

describe('AuthService', () => {
  describe('generateVerificationCode', () => {
    it('should generate 6-digit code', () => {
      const code = authService.generateVerificationCode();
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(authService.generateVerificationCode());
      }
      expect(codes.size).toBe(100);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      expect(() => {
        authService.validatePasswordStrength('SecurePass123!');
      }).not.toThrow();
    });

    it('should reject short password', () => {
      expect(() => {
        authService.validatePasswordStrength('Short1!');
      }).toThrow('密码长度至少需要12个字符');
    });

    it('should reject password without uppercase', () => {
      expect(() => {
        authService.validatePasswordStrength('lowercase123!');
      }).toThrow('密码必须包含大小写字母、数字和特殊字符');
    });

    it('should reject password without special char', () => {
      expect(() => {
        authService.validatePasswordStrength('NoSpecialChar123');
      }).toThrow('密码必须包含大小写字母、数字和特殊字符');
    });
  });
});
```

### 6.2 集成测试用例

> **测试文档**: `06-tech-architecture/user/story-user.md` 中的 US1

```typescript
// tests/integration/users/us1-registration.test.ts

/**
 * US1: 用户注册与登录
 */

describe('US1: 用户注册与登录', () => {
  beforeAll(async () => {
    await startTestContainers();
    await createTestTable();
  }, 120000);

  // Happy Path
  it('US1-HP-01: should complete full registration and login flow', async () => {
    // 1. 发送验证码
    await sendVerificationCode('test@example.com', 'register');
    // 2. 使用验证码注册
    const registerResult = await register({
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User',
      verificationCode: '123456',
    });
    expect(registerResult.success).toBe(true);
    // 3. 使用验证码登录
    const loginResult = await login({
      email: 'test@example.com',
      verificationCode: '123456',
    });
    expect(loginResult.success).toBe(true);
  });

  // Failed Cases
  it('US1-FC-01: should reject duplicate email', async () => {
    // ...
  });

  // Edge Cases
  it('US1-EC-01: should handle concurrent registration', async () => {
    // ...
  });
});
```

---

## 七、验收标准

### 7.1 功能验收

- [ ] 用户可通过邮箱+验证码注册
- [ ] 用户可通过邮箱+验证码登录
- [ ] 注册/登录后获得Access Token和Refresh Token
- [ ] Access Token用于认证API访问
- [ ] Refresh Token用于续期Access Token
- [ ] 登出后Access Token加入黑名单
- [ ] 忘记密码功能正常
- [ ] 用户资料可获取和更新

### 7.2 安全验收

- [ ] 验证码6位数字，加密安全
- [ ] 验证码5分钟有效期
- [ ] 发送频率限制（每小时10次，每天30次）
- [ ] 密码至少12字符，含大小写+数字+特殊字符
- [ ] 密码不记录在日志中
- [ ] Token黑名单机制

### 7.3 性能验收

- [ ] 注册响应<500ms
- [ ] 登录响应<500ms
- [ ] Token验证<50ms

---

## 八、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 验证码发送失败 | 低 | 中 | 重试机制，错误提示 |
| 并发注册同一邮箱 | 低 | 中 | 数据库唯一约束 |
| Token泄露 | 中 | 高 | HTTPS，黑名单机制 |
| 暴力破解 | 中 | 中 | 频率限制，验证码 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/user/tech-user-registration.md`

**相关文档**:
- [产品设计](../../05-product-design/user/user-registration.md)
- [测试策略](../docs/test-strategy.md)
- [用户故事](story-user.md)
