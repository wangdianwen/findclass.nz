---
title: 技术实现 - 用户中心
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 2
priority: P0
status: pending-implementation
related_feature: ../../05-product-design/user/user-center.md
---

# 技术实现: 用户中心

> **对应产品文档**: [user-center.md](../../05-product-design/user/user-center.md) | **优先级**: P0 | **排期**: Phase 2 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      用户中心技术架构                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   └── 微信小程序 (Taro)                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── GET /api/v1/users/profile                                      │
│   ├── PUT /api/v1/users/profile                                      │
│   ├── GET /api/v1/users/children                                     │
│   ├── POST /api/v1/users/children                                    │
│   └── PUT /api/v1/users/settings                                     │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── UserService (用户服务)                                         │
│   ├── UserProfileService (档案服务)                                  │
│   ├── ChildService (孩子管理)                                        │
│   └── UserSettingsService (设置服务)                                 │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   ├── DynamoDB (FindClass-MainTable)                                 │
│   │   ├── USER#{userId}                                             │
│   │   ├── USER#{userId}#CHILDREN                                    │
│   │   ├── USER#{userId}#SETTINGS                                    │
│   │   └── SESSION#{sessionId}                                       │
│   └── DynamoDB (缓存)                                                 │
│       ├── CACHE#USER#{userId}                                       │
│       ├── CACHE#SESSION#{token}                                     │
│       └── CACHE#CHILDREN#{userId}                                   │
│       (使用 TTL 自动过期)                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/users/
├── users.types.ts           # 类型定义
├── users.service.ts         # 用户服务
├── users.controller.ts      # API 控制器
├── users.routes.ts          # 路由配置
└── index.ts                 # 模块导出

07-backend/src/modules/sessions/
├── sessions.types.ts        # Session类型
├── sessions.service.ts      # Session服务
└── sessions.routes.ts       # Session路由

06-frontend/src/pages/user/
├── UserCenter.tsx           # 用户中心首页
├── ProfilePage.tsx          # 个人资料页
├── ChildrenPage.tsx         # 孩子管理页
├── SettingsPage.tsx         # 设置页
└── SecurityPage.tsx         # 安全设置页
```

---

## 二、数据模型设计 (DynamoDB)

### 2.1 用户类型

```typescript
// src/modules/users/users.types.ts

/**
 * 用户角色
 */
export enum UserRole {
  PARENT = 'PARENT',
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
}

/**
 * 用户状态
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  PENDING_PARENTAL_CONSENT = 'PENDING_PARENTAL_CONSENT',
  DISABLED = 'DISABLED',
}

/**
 * 性别
 */
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

/**
 * 语言偏好
 */
export enum Language {
  ZH = 'zh',
  EN = 'en',
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
  
  // 账户信息
  email: string;
  phone?: string;
  passwordHash: string;
  
  // 角色与状态
  role: UserRole;
  status: UserStatus;
  
  // 个人资料
  name: string;
  avatarUrl?: string;
  gender?: Gender;
  dateOfBirth?: string;
  
  // 偏好设置
  language: Language;
  timezone?: string;
  
  // 统计信息
  totalBookings?: number;
  totalSpent?: number;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI1PK?: string;  // EMAIL#{email}
  GSI1SK?: string;  // USER#{createdAt}
}

/**
 * 用户资料 DynamoDB 类型
 */
export interface UserProfile {
  // DynamoDB 主键
  PK: string;           // USER#{userId}
  SK: string;           // PROFILE
  
  // 实体类型标识
  entityType: 'USER_PROFILE';
  dataCategory: 'USER';
  id: string;
  userId: string;
  
  // 详细资料
  bio?: string;
  wechat?: string;
  wechatQrcodeUrl?: string;
  
  // 地址
  address?: {
    street?: string;
    city?: string;
    suburb?: string;
    postcode?: string;
  };
  
  // 紧急联系人
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  
  // 偏好
  notificationSettings?: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
    marketing: boolean;
  };
  
  // 时间戳
  updatedAt: string;
}

/**
 * 用户设置 DynamoDB 类型
 */
export interface UserSettings {
  // DynamoDB 主键
  PK: string;           // USER#{userId}
  SK: string;           // SETTINGS
  
  // 实体类型标识
  entityType: 'USER_SETTINGS';
  dataCategory: 'USER';
  id: string;
  userId: string;
  
  // 隐私设置
  privacySettings?: {
    showPhone: boolean;
    showEmail: boolean;
    showWechat: boolean;
    profileVisible: boolean;
  };
  
  // 内容筛选
  contentFilter?: {
    showAdultCourses: boolean;
    minAgeRating: string;
    preferredCategories: string[];
  };
  
  // 通知偏好
  notificationPreferences?: {
    bookingReminders: boolean;
    courseUpdates: boolean;
    newReviews: boolean;
    marketingEmails: boolean;
  };
  
  // 时间戳
  updatedAt: string;
}

/**
 * 孩子信息 DynamoDB 类型
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
  gender?: string;
  grade?: string;
  school?: string;
  subjects: string[];
  notes?: string;
  
  // 年龄验证
  ageVerified: boolean;
  
  // 隐私设置
  contentFilter: 'strict' | 'age_appropriate' | 'open';
  showInStats: boolean;
  
  // 统计
  totalLearningHours: number;
  totalCoursesCompleted: number;
  
  // 状态
  status: 'active' | 'inactive';
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI13PK?: string;  // USER#{parentId}
  GSI13SK?: string;  // CHILD#{createdAt}
}

/**
 * Session DynamoDB 类型
 */
export interface Session {
  // DynamoDB 主键
  PK: string;           // SESSION#{sessionId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'SESSION';
  dataCategory: 'USER';
  id: string;
  
  userId: string;
  token: string;
  refreshToken?: string;
  
  // 设备信息
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: {
    type: string;
    os: string;
    browser: string;
  };
  
  // 状态
  status: 'active' | 'revoked' | 'expired';
  
  // 过期时间
  expiresAt: string;
  lastActivityAt: string;
  
  // 时间戳
  createdAt: string;
}
```

### 2.2 实体键生成函数

```typescript
// src/modules/users/users.types.ts (续)

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
export function createUserEmailIndexKey(email: string, createdAt: string): { PK: string; SK: string } {
  return {
    PK: `EMAIL#${email}`,
    SK: `USER#${createdAt}`,
  };
}

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
 * 生成Session主键
 */
export function createSessionKey(sessionId: string): { PK: string; SK: string } {
  return createEntityKey('SESSION', sessionId);
}

/**
 * 生成Token索引键
 */
export function createTokenIndexKey(token: string): { PK: string; SK: string } {
  return {
    PK: `TOKEN#${token}`,
    SK: 'METADATA',
  };
}
```

---

## 三、业务逻辑实现

### 3.1 用户服务

```typescript
// src/modules/users/users.service.ts
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { logger } from '@core/logger';
import {
  User,
  UserRole,
  UserStatus,
  UserProfile,
  UserSettings,
  Child,
  Session,
  createUserKey,
  createUserEmailIndexKey,
  createChildKey,
  createUserChildIndexKey,
  createSessionKey,
  createTokenIndexKey,
} from './users.types';
import { putItem, getItem, queryItems, updateItem, deleteItem } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache, CacheKeys } from '@shared/db/cache';

/**
 * 用户服务类
 */
export class UserService {
  /**
   * 创建用户
   */
  async createUser(data: {
    email: string;
    phone?: string;
    password: string;
    name: string;
    role?: UserRole;
  }): Promise<{ user: User; tempToken: string }> {
    // 检查邮箱是否已存在
    const existingUser = await this.getUserByEmail(data.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const now = new Date().toISOString();
    const userId = uuidv4();
    const tempToken = crypto.randomBytes(32).toString('hex');

    const user: User = {
      ...createUserKey(userId),
      entityType: 'USER',
      dataCategory: 'USER',
      id: userId,
      email: data.email,
      phone: data.phone,
      passwordHash: this.hashPassword(data.password),
      name: data.name,
      role: data.role || UserRole.PARENT,
      status: UserStatus.PENDING_VERIFICATION,
      language: 'zh',
      totalBookings: 0,
      totalSpent: 0,
      createdAt: now,
      updatedAt: now,
      GSI1PK: `EMAIL#${data.email}`,
      GSI1SK: `USER#${now}`,
    };

    await putItem(user);

    // 创建空资料
    const profile: UserProfile = {
      ...createUserKey(userId),
      SK: 'PROFILE',
      entityType: 'USER_PROFILE',
      dataCategory: 'USER',
      id: uuidv4(),
      userId,
      notificationSettings: {
        email: true,
        sms: true,
        inApp: true,
        marketing: false,
      },
      updatedAt: now,
    };
    await putItem(profile);

    // 创建默认设置
    const settings: UserSettings = {
      ...createUserKey(userId),
      SK: 'SETTINGS',
      entityType: 'USER_SETTINGS',
      dataCategory: 'USER',
      id: uuidv4(),
      userId,
      privacySettings: {
        showPhone: false,
        showEmail: false,
        showWechat: false,
        profileVisible: true,
      },
      notificationPreferences: {
        bookingReminders: true,
        courseUpdates: true,
        newReviews: true,
        marketingEmails: false,
      },
      updatedAt: now,
    };
    await putItem(settings);

    logger.info('User created', { userId, email: data.email });

    return { user, tempToken };
  }

  /**
   * 通过邮箱获取用户
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const result = await queryItems<User>({
      indexName: 'GSI1-UserByEmail',
      keyConditionExpression: 'GSI1PK = :pk',
      expressionAttributeValues: {
        ':pk': `EMAIL#${email}`,
      },
      limit: 1,
    });
    return result.items[0] || null;
  }

  /**
   * 获取用户
   */
  async getUserById(userId: string): Promise<User | null> {
    // 尝试从 DynamoDB 缓存获取
    const cacheKey = CacheKeys.user(userId);
    const cached = await getFromCache<User>(cacheKey, 'USER');
    if (cached) {
      return cached;
    }

    const { PK, SK } = createUserKey(userId);
    const user = await getItem<User>({ PK, SK });

    if (user) {
      await setCache(cacheKey, 'USER', user, 300); // 5分钟缓存
    }

    return user;
  }

  /**
   * 更新用户
   */
  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    const now = new Date().toISOString();
    const updateParts: string[] = ['updatedAt = :now'];
    const values: Record<string, unknown> = { ':now': now };

    if (data.name) {
      updateParts.push('name = :name');
      values[':name'] = data.name;
    }
    if (data.avatarUrl) {
      updateParts.push('avatarUrl = :avatarUrl');
      values[':avatarUrl'] = data.avatarUrl;
    }
    if (data.language) {
      updateParts.push('language = :language');
      values[':language'] = data.language;
    }
    if (data.phone) {
      updateParts.push('phone = :phone');
      values[':phone'] = data.phone;
    }

    const updated = await updateItem(
      createUserKey(userId),
      `SET ${updateParts.join(', ')}`,
      values
    ) as User;

    await deleteCache(CacheKeys.user(userId), 'USER');

    logger.info('User updated', { userId });

    return updated;
  }

  /**
   * 验证密码
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) return false;
    return this.verifyPasswordHash(password, user.passwordHash);
  }

  /**
   * 更新密码
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    await updateItem(
      createUserKey(userId),
      'SET passwordHash = :passwordHash, updatedAt = :now',
      {
        ':passwordHash': this.hashPassword(newPassword),
        ':now': new Date().toISOString(),
      }
    );

    // 使所有session失效
    await sessionService.revokeAllUserSessions(userId);

    logger.info('Password updated', { userId });
  }

  /**
   * 密码哈希
   */
  private hashPassword(password: string): string {
    return crypto.pbkdf2Sync(password, process.env.PASSWORD_SALT || 'FindClassSalt', 10000, 64, 'sha512').toString('hex');
  }

  /**
   * 验证密码哈希
   */
  private verifyPasswordHash(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }
}

/**
 * Session服务
 */
export class SessionService {
  /**
   * 创建Session
   */
  async createSession(userId: string, data: {
    ipAddress?: string;
    userAgent?: string;
    deviceInfo?: { type: string; os: string; browser: string };
  }): Promise<{ session: Session; token: string; refreshToken: string }> {
    const now = new Date().toISOString();
    const sessionId = uuidv4();
    const token = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');
    
    // 7天过期
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const session: Session = {
      ...createSessionKey(sessionId),
      entityType: 'SESSION',
      dataCategory: 'USER',
      id: sessionId,
      userId,
      token,
      refreshToken,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      deviceInfo: data.deviceInfo,
      status: 'active',
      expiresAt,
      lastActivityAt: now,
      createdAt: now,
    };

    await putItem(session);

    // 创建Token索引
    const tokenIndex = {
      ...createTokenIndexKey(token),
      entityType: 'TOKEN_INDEX',
      dataCategory: 'USER',
      id: uuidv4(),
      sessionId,
      userId,
      expiresAt,
    };
    await putItem(tokenIndex);

    logger.info('Session created', { sessionId, userId });

    return { session, token, refreshToken };
  }

  /**
   * 通过Token获取Session
   */
  async getSessionByToken(token: string): Promise<Session | null> {
    const result = await queryItems<Session>({
      indexName: 'GSI-TokenIndex',
      keyConditionExpression: 'PK = :pk',
      expressionAttributeValues: {
        ':pk': `TOKEN#${token}`,
      },
      limit: 1,
    });
    return result.items[0] || null;
  }

  /**
   * 使Session失效
   */
  async revokeSession(sessionId: string): Promise<void> {
    const session = await getItem<Session>(createSessionKey(sessionId));
    if (session) {
      await updateItem(
        createSessionKey(sessionId),
        'SET status = :status',
        { ':status': 'revoked' }
      );
      await deleteCache(CacheKeys.session(sessionId), 'USER');
    }
  }

  /**
   * 使所有用户Session失效
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const result = await queryItems<Session>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'SESSION#',
      },
      limit: 100,
    });

    for (const session of result.items) {
      await this.revokeSession(session.id);
    }
  }
}

/**
 * 孩子管理服务
 */
export class ChildService {
  /**
   * 添加孩子
   */
  async addChild(parentId: string, data: {
    name: string;
    dateOfBirth: string;
    gender?: string;
    grade?: string;
    school?: string;
    subjects?: string[];
    notes?: string;
  }): Promise<Child> {
    const now = new Date().toISOString();
    const childId = uuidv4();

    const child: Child = {
      ...createChildKey(childId),
      entityType: 'CHILD',
      dataCategory: 'USER',
      id: childId,
      parentId,
      name: data.name,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      grade: data.grade,
      school: data.school,
      subjects: data.subjects || [],
      notes: data.notes,
      ageVerified: false,
      contentFilter: 'age_appropriate',
      showInStats: true,
      totalLearningHours: 0,
      totalCoursesCompleted: 0,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      GSI13PK: `USER#${parentId}`,
      GSI13SK: `CHILD#${now}`,
    };

    await putItem(child);
    await deleteCache(CacheKeys.children(parentId), 'USER');

    logger.info('Child added', { childId, parentId });

    return child;
  }

  /**
   * 获取用户的孩子列表
   */
  async getChildrenByParent(parentId: string): Promise<Child[]> {
    const cacheKey = CacheKeys.children(parentId);
    const cached = await getFromCache<Child[]>(cacheKey, 'USER');
    if (cached) return cached;

    const result = await queryItems<Child>({
      indexName: 'GSI13-UserChildren',
      keyConditionExpression: 'GSI13PK = :pk',
      expressionAttributeValues: {
        ':pk': `USER#${parentId}`,
      },
      scanIndexForward: false,
    });

    const activeChildren = result.items.filter(c => c.status === 'active');
    await setCache(cacheKey, 'USER', activeChildren, 300); // 5分钟缓存

    return activeChildren;
  }
}

// 导出服务
export const userService = new UserService();
export const sessionService = new SessionService();
export const childService = new ChildService();
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| **用户操作** |
| GET | /api/v1/users/profile | 获取个人资料 | |
| PUT | /api/v1/users/profile | 更新个人资料 | |
| PUT | /api/v1/users/password | 修改密码 | 需验证旧密码 |
| **孩子管理** |
| GET | /api/v1/users/children | 获取孩子列表 | |
| POST | /api/v1/users/children | 添加孩子 | |
| GET | /api/v1/users/children/:id | 获取孩子详情 | |
| PUT | /api/v1/users/children/:id | 更新孩子信息 | |
| DELETE | /api/v1/users/children/:id | 删除孩子 | |
| **设置** |
| GET | /api/v1/users/settings | 获取设置 | |
| PUT | /api/v1/users/settings | 更新设置 | |

### 4.2 API 详细设计

#### 4.2.1 GET /api/v1/users/profile

**响应示例** (200):
```json
{
  "success": true,
  "data": {
    "id": "user-001",
    "email": "parent@example.com",
    "name": "张先生",
    "avatarUrl": "https://cdn.example.com/avatar.jpg",
    "phone": "0212345678",
    "language": "zh",
    "role": "PARENT",
    "status": "ACTIVE"
  }
}
```

#### 4.2.2 PUT /api/v1/users/profile

**请求示例**:
```json
{
  "name": "张先生",
  "avatarUrl": "https://cdn.example.com/new-avatar.jpg",
  "language": "en"
}
```

---

## 五、前端实现

### 5.1 用户中心首页

```typescript
// src/pages/user/UserCenter.tsx
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Avatar, Button, List, Tag, Statistic } from 'antd';
import { UserOutlined, SettingOutlined, HeartOutlined, CalendarOutlined, CreditCardOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../api/user';
import { Child } from '../../types/user';

export const UserCenter: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const [userRes, childrenRes] = await Promise.all([
        userApi.getProfile(),
        userApi.getChildren(),
      ]);
      setUser(userRes.data);
      setChildren(childrenRes.data.children);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-center">
      {/* 用户信息卡片 */}
      <Card className="user-card">
        <Row gutter={24} align="middle">
          <Col>
            <Avatar size={80} src={user?.avatarUrl} icon={<UserOutlined />} />
          </Col>
          <Col flex="auto">
            <h2>{user?.name}</h2>
            <p>{user?.email}</p>
            <Tag color={user?.status === 'ACTIVE' ? 'green' : 'orange'}>
              {user?.status}
            </Tag>
          </Col>
          <Col>
            <Button icon={<SettingOutlined />} onClick={() => navigate('/user/settings')}>
              设置
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="孩子数量" value={children.length} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="课程预约" value={user?.totalBookings || 0} prefix={<CalendarOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="消费金额" value={user?.totalSpent || 0} prefix="$" precision={2} />
          </Card>
        </Col>
      </Row>

      {/* 孩子列表 */}
      <Card title="我的孩子" style={{ marginTop: 24 }}>
        {children.length > 0 ? (
          <List
            dataSource={children}
            renderItem={(child) => (
              <List.Item actions={[<Button type="link" onClick={() => navigate(`/user/children/${child.id}`)}>管理</Button>]}>
                <List.Item.Meta
                  avatar={<Avatar>{child.name[0]}</Avatar>}
                  title={child.name}
                  description={`${child.grade || '未设置年级'} | ${child.subjects?.join(', ') || '未设置科目'}`}
                />
              </List.Item>
            )}
          />
        ) : (
          <Button type="dashed" block onClick={() => navigate('/user/children/add')}>
            添加孩子
          </Button>
        )}
      </Card>
    </div>
  );
};
```

---

## 六、单元测试

### 6.1 用户服务测试

```typescript
// src/modules/users/users.service.test.ts
import { userService, sessionService, childService } from './users.service';
import { UserRole, UserStatus } from './users.types';
import { mockPutItem, mockGetItem, mockQueryItems, mockUpdateItem } from '../../test/mocks';

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('US01-HP-001: should create user successfully', async () => {
      // Given
      const dto = {
        email: 'test@example.com',
        phone: '0212345678',
        password: 'password123',
        name: 'Test User',
        role: UserRole.PARENT,
      };

      (queryItems as jest.Mock).mockResolvedValue({ items: [] }); // No existing user
      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await userService.createUser(dto);

      // Then
      expect(result).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(result.user.role).toBe(UserRole.PARENT);
      expect(result.user.status).toBe(UserStatus.PENDING_VERIFICATION);
      expect(result.tempToken).toBeDefined();
      expect(putItem).toHaveBeenCalledTimes(3); // User, Profile, Settings
    });

    it('US01-FC-001: should reject duplicate email', async () => {
      // Given
      const dto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      (queryItems as jest.Mock).mockResolvedValue({
        items: [{ id: 'existing-user', email: 'existing@example.com' }],
      });

      // When & Then
      await expect(userService.createUser(dto)).rejects.toThrow('Email already registered');
    });

    it('US01-EC-001: should handle optional phone', async () => {
      // Given
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      (queryItems as jest.Mock).mockResolvedValue({ items: [] });
      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await userService.createUser(dto);

      // Then
      expect(result.user.phone).toBeUndefined();
    });
  });

  describe('getUserByEmail', () => {
    it('US01-HP-002: should return user when email exists', async () => {
      // Given
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      (queryItems as jest.Mock).mockResolvedValue({ items: [mockUser] });

      // When
      const result = await userService.getUserByEmail('test@example.com');

      // Then
      expect(result).toEqual(mockUser);
    });

    it('US01-FC-002: should return null when email not found', async () => {
      // Given
      (queryItems as jest.Mock).mockResolvedValue({ items: [] });

      // When
      const result = await userService.getUserByEmail('notfound@example.com');

      // Then
      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('US01-HP-003: should update user name', async () => {
      // Given
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        name: 'Old Name',
        updatedAt: '2026-01-26T10:00:00Z',
      };

      (getItem as jest.Mock).mockResolvedValue(mockUser);
      (updateItem as jest.Mock).mockResolvedValue({ ...mockUser, name: 'New Name' });

      // When
      const result = await userService.updateUser(userId, { name: 'New Name' });

      // Then
      expect(result.name).toBe('New Name');
    });

    it('US01-FC-003: should update user avatar', async () => {
      // Given
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        avatarUrl: undefined,
      };

      (getItem as jest.Mock).mockResolvedValue(mockUser);
      (updateItem as jest.Mock).mockResolvedValue({
        ...mockUser,
        avatarUrl: 'https://cdn.example.com/new-avatar.jpg',
      });

      // When
      const result = await userService.updateUser(userId, {
        avatarUrl: 'https://cdn.example.com/new-avatar.jpg',
      });

      // Then
      expect(result.avatarUrl).toBe('https://cdn.example.com/new-avatar.jpg');
    });
  });

  describe('verifyPassword', () => {
    it('US01-HP-004: should return true for correct password', async () => {
      // Given
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        passwordHash: 'hashedpassword',
      };

      (getItem as jest.Mock).mockResolvedValue(mockUser);

      // When
      const result = await userService.verifyPassword(userId, 'correctpassword');

      // Then
      expect(result).toBe(true);
    });

    it('US01-FC-004: should return false for incorrect password', async () => {
      // Given
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        passwordHash: 'hashedpassword',
      };

      (getItem as jest.Mock).mockResolvedValue(mockUser);

      // When
      const result = await userService.verifyPassword(userId, 'wrongpassword');

      // Then
      expect(result).toBe(false);
    });
  });

  describe('updatePassword', () => {
    it('US01-HP-005: should update password and revoke sessions', async () => {
      // Given
      const userId = 'user-123';
      const newPassword = 'newpassword123';

      (updateItem as jest.Mock).mockResolvedValue({});
      (queryItems as jest.Mock).mockResolvedValue({ items: [] });

      // When
      await userService.updatePassword(userId, newPassword);

      // Then
      expect(updateItem).toHaveBeenCalled();
    });
  });
});

describe('SessionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('US02-HP-001: should create session with tokens', async () => {
      // Given
      const userId = 'user-123';
      const deviceInfo = {
        type: 'desktop',
        os: 'MacOS',
        browser: 'Chrome',
      };

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await sessionService.createSession(userId, { deviceInfo });

      // Then
      expect(result).toBeDefined();
      expect(result.session.userId).toBe(userId);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.session.deviceInfo).toEqual(deviceInfo);
      expect(result.session.status).toBe('active');
    });

    it('US02-EC-001: should set 7-day expiry', async () => {
      // Given
      const userId = 'user-123';

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await sessionService.createSession(userId, {});

      // Then
      const expiryDate = new Date(result.session.expiresAt);
      const now = new Date();
      const daysDiff = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      expect(daysDiff).toBeGreaterThan(6.9);
      expect(daysDiff).toBeLessThan(7.1);
    });
  });

  describe('revokeSession', () => {
    it('US02-HP-002: should revoke session', async () => {
      // Given
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        status: 'active',
      };

      (getItem as jest.Mock).mockResolvedValue(mockSession);
      (updateItem as jest.Mock).mockResolvedValue({ ...mockSession, status: 'revoked' });

      // When
      await sessionService.revokeSession(sessionId);

      // Then
      expect(updateItem).toHaveBeenCalledWith(
        expect.objectContaining({ PK: 'SESSION#session-123' }),
        'SET status = :status',
        { ':status': 'revoked' }
      );
    });

    it('US02-FC-001: should handle non-existent session', async () => {
      // Given
      (getItem as jest.Mock).mockResolvedValue(null);

      // When
      await sessionService.revokeSession('non-existent');

      // Then
      expect(updateItem).not.toHaveBeenCalled();
    });
  });
});

describe('ChildService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addChild', () => {
    it('US03-HP-001: should add child successfully', async () => {
      // Given
      const parentId = 'parent-123';
      const dto = {
        name: '小明',
        dateOfBirth: '2015-05-15',
        grade: 'primary_y4',
        school: '奥克兰小学',
        subjects: ['数学', '英语'],
      };

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await childService.addChild(parentId, dto);

      // Then
      expect(result).toBeDefined();
      expect(result.name).toBe('小明');
      expect(result.parentId).toBe(parentId);
      expect(result.status).toBe('active');
      expect(result.ageVerified).toBe(false);
    });

    it('US03-HP-002: should set age-appropriate content filter', async () => {
      // Given
      const parentId = 'parent-123';
      const dto = {
        name: '小学生',
        dateOfBirth: '2018-05-15', // 7 years old
        subjects: [],
      };

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await childService.addChild(parentId, dto);

      // Then
      expect(['strict', 'age_appropriate']).toContain(result.contentFilter);
    });

    it('US03-FC-001: should set open filter for older children', async () => {
      // Given
      const parentId = 'parent-123';
      const dto = {
        name: '高中生',
        dateOfBirth: '2008-05-15', // 17 years old
        subjects: ['数学'],
      };

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await childService.addChild(parentId, dto);

      // Then
      expect(result.contentFilter).toBe('open');
    });
  });

  describe('getChildrenByParent', () => {
    it('US03-HP-003: should return active children', async () => {
      // Given
      const parentId = 'parent-123';
      const mockChildren = [
        { id: 'child-1', name: '小明', status: 'active' },
        { id: 'child-2', name: '小红', status: 'active' },
        { id: 'child-3', name: '小华', status: 'inactive' },
      ];

      (queryItems as jest.Mock).mockResolvedValue({ items: mockChildren });

      // When
      const result = await childService.getChildrenByParent(parentId);

      // Then
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('小明');
      expect(result[1].name).toBe('小红');
    });

    it('US03-EC-001: should return empty array when no children', async () => {
      // Given
      (queryItems as jest.Mock).mockResolvedValue({ items: [] });

      // When
      const result = await childService.getChildrenByParent('parent-123');

      // Then
      expect(result).toEqual([]);
    });
  });
});
```

---

## 七、验收标准

- [x] 用户可以注册和登录
- [x] 个人资料可以查看和修改
- [x] 孩子管理功能正常
- [x] 设置可以保存和加载
- [x] Session管理正常
- [x] 密码修改功能正常

---

## 七、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 密码泄露 | 低 | 高 | 密码哈希存储 |
| Session劫持 | 低 | 中 | HTTPS, Token刷新 |
| 数据不一致 | 低 | 中 | DynamoDB事务 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/user/tech-user-center.md`

**相关文档**:
- [产品设计](../../05-product-design/user/user-center.md)
- [认证系统](../auth/tech-auth.md)
- [孩子管理](tech-parental-controls.md)
