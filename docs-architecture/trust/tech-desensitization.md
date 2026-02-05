---
title: 技术实现 - 数据脱敏处理
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.1
phase: mvp
priority: P0
status: pending-implementation
related_feature: ../../05-product-design/trust/desensitization.md
---

# 技术实现: 数据脱敏处理

> **对应产品文档**: [desensitization.md](../../05-product-design/trust/desensitization.md) | **优先级**: P0 | **排期**: MVP | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      数据脱敏处理技术架构                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   └── 微信小程序 (Taro)                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── GET /api/v1/courses/:id/contact (脱敏联系方式)                  │
│   ├── GET /api/v1/courses/:id/contact/full (完整联系方式)             │
│   └── POST /api/v1/courses/:id/contact/view (记录查看行为)            │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── DesensitizationService (脱敏服务)                              │
│   ├── ContactDesensitizer (联系方式脱敏)                             │
│   └── DesensitizationLogger (操作日志)                               │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   ├── DynamoDB (FindClass-MainTable)                                │
│   │   ├── DESENSITIZATION_LOG#{logId}                               │
│   │   ├── CONTACT_VIEW#{viewId}                                     │
│   │   └── CONTACT_REQUEST#{requestId}                               │
│   └── DynamoDB (缓存)                                                │
│       ├── desensitized:{courseId}:contact                           │
│       └── full-contact:{courseId}:{userId}                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/desensitization/
├── desensitization.types.ts       # 类型定义
├── desensitization.service.ts     # 脱敏服务
├── desensitization.controller.ts  # API控制器
├── desensitization.routes.ts      # 路由配置
├── desensitization.utils.ts       # 脱敏工具函数
├── desensitization.middleware.ts  # 脱敏中间件
└── index.ts                       # 模块导出

07-backend/src/middleware/
└── contact-protection.middleware.ts  # 联系方式保护中间件
```

---

## 二、脱敏规则与算法

### 2.1 脱敏函数库

```typescript
// src/modules/desensitization/desensitization.utils.ts

/**
 * 手机号脱敏
 * 021-123-4567 -> 021-***-4567
 */
export function desensitizePhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  const cleanPhone = phone.replace(/\D/g, '');
  const prefix = cleanPhone.substring(0, 3);
  const suffix = cleanPhone.substring(cleanPhone.length - 4);
  return `${prefix}-***-${suffix}`;
}

/**
 * 固定电话脱敏
 * 09-1234-5678 -> 09-****-5678
 */
export function desensitizeLandline(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  const cleanPhone = phone.replace(/\D/g, '');
  const prefix = cleanPhone.substring(0, 2);
  const suffix = cleanPhone.substring(cleanPhone.length - 4);
  return `${prefix}-****-${suffix}`;
}

/**
 * 邮箱脱敏
 * teacher@example.com -> te***@example.com
 */
export function desensitizeEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.substring(0, 2)}***@${domain}`;
}

/**
 * 微信脱敏
 * wx12345678 -> wx******78
 */
export function desensitizeWechat(wechat: string): string {
  if (!wechat || wechat.length < 4) return wechat;
  const prefix = wechat.substring(0, 2);
  const suffix = wechat.substring(wechat.length - 2);
  return `${prefix}******${suffix}`;
}

/**
 * QQ号脱敏
 * 12345678 -> 12****78
 */
export function desensitizeQQ(qq: string): string {
  if (!qq || qq.length < 4) return qq;
  const prefix = qq.substring(0, 2);
  const suffix = qq.substring(qq.length - 2);
  return `${prefix}****${qq}`;
}

/**
 * 姓名脱敏
 * 张老师 -> 张**
 */
export function desensitizeName(name: string): string {
  if (!name || name.length <= 1) return name;
  return `${name[0]}**`;
}

/**
 * 地址脱敏（仅保留城市）
 * 123 Queen St, Auckland -> Auckland
 */
export function desensitizeAddress(address: string): string {
  if (!address) return address;
  const parts = address.split(',');
  return parts[parts.length - 1].trim();
}

/**
 * 详细地址脱敏
 * 123 Queen St, Auckland CBD -> ****
 */
export function desensitizeFullAddress(address: string): string {
  if (!address) return address;
  return '****';
}

/**
 * 身份证脱敏
 * 430101199001011234 -> 4301**********34
 */
export function desensitizeIDCard(idCard: string): string {
  if (!idCard || idCard.length < 8) return idCard;
  const prefix = idCard.substring(0, 4);
  const suffix = idCard.substring(idCard.length - 2);
  return `${prefix}**********${suffix}`;
}

/**
 * 银行账号脱敏
 * 1234-5678-9012 -> 1234-****-9012
 */
export function desensitizeBankAccount(account: string): string {
  if (!account || account.length < 8) return account;
  const parts = account.split('-');
  if (parts.length >= 3) {
    return `${parts[0]}-****-${parts[parts.length - 1]}`;
  }
  const prefix = account.substring(0, 4);
  const suffix = account.substring(account.length - 4);
  return `${prefix}-****-${suffix}`;
}

/**
 * 批量脱敏联系人信息
 */
export function desensitizeContactInfo(contact: {
  phone?: string;
  landline?: string;
  email?: string;
  wechat?: string;
  qq?: string;
  address?: string;
}): DesensitizedContactInfo {
  return {
    phone: contact.phone ? desensitizePhone(contact.phone) : undefined,
    phoneVisible: !!contact.phone,
    landline: contact.landline ? desensitizeLandline(contact.landline) : undefined,
    landlineVisible: !!contact.landline,
    email: contact.email ? desensitizeEmail(contact.email) : undefined,
    emailVisible: !!contact.email,
    wechat: contact.wechat ? desensitizeWechat(contact.wechat) : undefined,
    wechatVisible: false,  // 默认不显示，需要申请
    wechatRequestable: true,
    qq: contact.qq ? desensitizeQQ(contact.qq) : undefined,
    qqVisible: false,
    qqRequestable: true,
    address: contact.address ? desensitizeAddress(contact.address) : undefined,
    addressVisible: true,
    fullAddressVisible: false,
    fullAddressRequestable: true,
  };
}
```

---

## 三、数据模型设计 (DynamoDB)

### 3.1 脱敏类型定义

```typescript
// src/modules/desensitization/desensitization.types.ts

/**
 * 脱敏后联系方式
 */
export interface DesensitizedContactInfo {
  // 基础脱敏信息
  phone?: string;
  phoneVisible: boolean;
  landline?: string;
  landlineVisible: boolean;
  email?: string;
  emailVisible: boolean;
  wechat?: string;
  wechatVisible: boolean;
  wechatRequestable: boolean;
  qq?: string;
  qqVisible: boolean;
  qqRequestable: boolean;
  address?: string;
  addressVisible: boolean;
  fullAddressVisible: boolean;
  fullAddressRequestable: boolean;
}

/**
 * 完整联系方式（需权限）
 */
export interface FullContactInfo {
  phone?: string;
  phoneVerified: boolean;
  landline?: string;
  email?: string;
  emailVerified: boolean;
  wechat?: string;
  wechatQrcode?: string;
  address?: string;
  fullAddress?: string;
}

/**
 * 查看完整联系方式请求
 */
export interface ContactViewRequest {
  // DynamoDB 主键
  PK: string;           // CONTACT_REQUEST#{requestId}
  SK: string;           // METADATA
  
  entityType: 'CONTACT_REQUEST';
  dataCategory: 'TRUST';
  id: string;
  
  // 关联
  courseId: string;
  teacherId: string;
  userId: string;
  
  // 请求字段
  requestedFields: string[];
  
  // 状态
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  
  // 处理信息
  processedBy?: string;
  processedAt?: string;
  rejectionReason?: string;
  
  // 时间
  expiresAt: string;
  createdAt: string;
  
  // GSI 索引
  GSI39PK?: string;  // COURSE#{courseId}
  GSI39SK?: string;  // CREATED_AT#{createdAt}
  GSI40PK?: string;  // USER#{userId}
  GSI40SK?: string;  // CREATED_AT#{createdAt}
}

/**
 * 联系方式查看日志
 */
export interface ContactViewLog {
  // DynamoDB 主键
  PK: string;           // CONTACT_VIEW#{viewId}
  SK: string;           // METADATA
  
  entityType: 'CONTACT_VIEW';
  dataCategory: 'TRUST';
  id: string;
  
  // 关联
  courseId: string;
  teacherId: string;
  viewerId?: string;    // 查看用户（未登录为 null）
  viewerIP?: string;
  viewerUserAgent?: string;
  
  // 查看的字段
  viewedFields: string[];
  
  // 时间
  viewedAt: string;
  
  // GSI 索引
  GSI41PK?: string;  // COURSE#{courseId}
  GSI41SK?: string;  // VIEWED_AT#{viewedAt}
  GSI42PK?: string;  // TEACHER#{teacherId}
  GSI42SK?: string;  // VIEWED_AT#{viewedAt}
}

/**
 * 脱敏操作日志
 */
export interface DesensitizationLog {
  // DynamoDB 主键
  PK: string;           // DESENSITIZATION_LOG#{logId}
  SK: string;           // METADATA
  
  entityType: 'DESENSITIZATION_LOG';
  dataCategory: 'TRUST';
  id: string;
  
  // 操作类型
  operation: 'view_desensitized' | 'view_full' | 'copy' | 'request' | 'export';
  
  // 关联
  entityType: 'course' | 'teacher' | 'user';
  entityId: string;
  
  // 操作者
  userId?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // 操作详情
  fields?: string[];
  reason?: string;
  
  // 时间
  operationAt: string;
  
  // GSI 索引
  GSI43PK?: string;  // OPERATION#{operation}
  GSI43SK?: string;  // OPERATION_AT#{operationAt}
}

/**
 * 脱敏配置
 */
export interface DesensitizationConfig {
  // DynamoDB 主键
  PK: string;           // DESENSITIZATION_CONFIG
  SK: string;           // METADATA
  
  entityType: 'DESENSITIZATION_CONFIG';
  dataCategory: 'TRUST';
  id: string;
  
  // 字段脱敏规则
  fieldRules: Array<{
    field: string;
    desensitizationType: 'none' | 'partial' | 'full' | 'custom';
    customFunction?: string;
    showForGuest: boolean;
    showForLoggedIn: boolean;
    showForVerified: boolean;
  }>;
  
  // 频次限制
  viewLimitPerUser: number;
  viewLimitPerIP: number;
  viewLimitWindow: number;  // 秒
  
  // 日志配置
  logEnabled: boolean;
  logRetentionDays: number;
  
  updatedAt: string;
}
```

### 3.2 键生成函数

```typescript
// src/modules/desensitization/desensitization.types.ts (续)

import { createEntityKey } from '@shared/db/dynamodb';

/**
 * 生成查看请求主键
 */
export function createContactViewRequestKey(requestId: string): { PK: string; SK: string } {
  return createEntityKey('CONTACT_REQUEST', requestId);
}

/**
 * 生成查看日志主键
 */
export function createContactViewLogKey(viewId: string): { PK: string; SK: string } {
  return createEntityKey('CONTACT_VIEW', viewId);
}

/**
 * 生成脱敏日志主键
 */
export function createDesensitizationLogKey(logId: string): { PK: string; SK: string } {
  return createEntityKey('DESENSITIZATION_LOG', logId);
}

/**
 * 生成课程查看索引键
 */
export function createCourseViewIndexKey(courseId: string, createdAt: string): { PK: string; SK: string } {
  return {
    PK: `COURSE#${courseId}`,
    SK: `CREATED_AT#${createdAt}`,
  };
}
```

---

## 四、业务逻辑实现

### 4.1 脱敏服务

```typescript
// src/modules/desensitization/desensitization.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  DesensitizedContactInfo,
  FullContactInfo,
  ContactViewRequest,
  ContactViewLog,
  DesensitizationLog,
  ContactViewRequestStatus,
  createContactViewRequestKey,
  createContactViewLogKey,
  createDesensitizationLogKey,
  createCourseViewIndexKey,
} from './desensitization.types';
import {
  desensitizePhone,
  desensitizeLandline,
  desensitizeEmail,
  desensitizeWechat,
  desensitizeQQ,
  desensitizeAddress,
  desensitizeName,
  desensitizeContactInfo,
} from './desensitization.utils';
import { putItem, getItem, queryItems, updateItem } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache } from '@shared/db/cache';

/**
 * 脱敏服务类
 */
export class DesensitizationService {
  /**
   * 获取脱敏后的联系方式（根据用户登录状态）
   */
  async getDesensitizedContact(
    courseId: string,
    teacherId: string,
    userId?: string,
    userRole?: string
  ): Promise<DesensitizedContactInfo> {
    const cacheKey = `desensitized:${courseId}:contact`;
    const cached = await getFromCache<DesensitizedContactInfo>(cacheKey, 'TRUST');
    if (cached) return cached;

    // 获取教师完整联系方式
    const fullContact = await this.getTeacherFullContact(teacherId);

    // 根据权限脱敏
    const desensitized = this.applyDesensitization(fullContact, !!userId, userRole);

    await setCache(cacheKey, 'TRUST', desensitized, 300);

    return desensitized;
  }

  /**
   * 获取完整联系方式（需登录）
   */
  async getFullContact(
    courseId: string,
    teacherId: string,
    userId: string
  ): Promise<FullContactInfo> {
    // 检查用户是否已登录
    if (!userId) {
      throw new Error('Authentication required to view full contact information');
    }

    // 获取完整联系方式
    const fullContact = await this.getTeacherFullContact(teacherId);

    // 记录查看行为
    await this.logContactView({
      courseId,
      teacherId,
      viewerId: userId,
      viewedFields: Object.keys(fullContact),
    });

    // 更新用户查看计数
    await this.incrementUserViewCount(userId, courseId);

    return fullContact;
  }

  /**
   * 申请查看完整联系方式
   */
  async requestFullContact(
    courseId: string,
    teacherId: string,
    userId: string,
    requestedFields: string[]
  ): Promise<ContactViewRequest> {
    const requestId = uuidv4();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();  // 24小时过期

    const request: ContactViewRequest = {
      ...createContactViewRequestKey(requestId),
      SK: 'METADATA',
      entityType: 'CONTACT_REQUEST',
      dataCategory: 'TRUST',
      id: requestId,
      courseId,
      teacherId,
      userId,
      requestedFields,
      status: ContactViewRequestStatus.PENDING,
      expiresAt,
      createdAt: now,
      GSI39PK: `COURSE#${courseId}`,
      GSI39SK: `CREATED_AT#${now}`,
      GSI40PK: `USER#${userId}`,
      GSI40SK: `CREATED_AT#${now}`,
    };

    await putItem(request);

    // 通知教师
    await notificationService.sendUserNotification(
      teacherId,
      'contact_request',
      { courseId, requestId, requestedFields }
    );

    logger.info('Contact view request created', { requestId, courseId, userId });

    return request;
  }

  /**
   * 教师处理查看请求
   */
  async processContactRequest(
    requestId: string,
    teacherId: string,
    action: 'approve' | 'reject',
    rejectionReason?: string
  ): Promise<ContactViewRequest> {
    const request = await getItem<ContactViewRequest>(createContactViewRequestKey(requestId));
    if (!request) {
      throw new Error('Request not found');
    }

    // 验证是否是该教师的请求
    if (request.teacherId !== teacherId) {
      throw new Error('Unauthorized to process this request');
    }

    const now = new Date().toISOString();
    const status = action === 'approve' ? ContactViewRequestStatus.APPROVED : ContactViewRequestStatus.REJECTED;

    const updated = await updateItem(
      createContactViewRequestKey(requestId),
      `SET #status = :status, processedBy = :teacherId, processedAt = :now, rejectionReason = :reason, updatedAt = :now`,
      {
        ':status': status,
        ':teacherId': teacherId,
        ':now': now,
        ':reason': rejectionReason || '',
      },
      { '#status': 'status' }
    ) as ContactViewRequest;

    // 通知申请人
    await notificationService.sendUserNotification(
      request.userId,
      action === 'approve' ? 'contact_request_approved' : 'contact_request_rejected',
      { requestId, courseId: request.courseId, rejectionReason }
    );

    logger.info('Contact request processed', { requestId, action, teacherId });

    return updated;
  }

  /**
   * 获取教师的完整联系方式
   */
  private async getTeacherFullContact(teacherId: string): Promise<FullContactInfo> {
    const { PK, SK } = { PK: `TEACHER#${teacherId}`, SK: 'METADATA' };
    const teacher = await getItem<any>({ PK, SK });

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    return {
      phone: teacher.phone,
      phoneVerified: teacher.phoneVerified || false,
      landline: teacher.landline,
      email: teacher.email,
      emailVerified: teacher.emailVerified || false,
      wechat: teacher.wechat,
      wechatQrcode: teacher.wechatQrcode,
      address: teacher.address,
      fullAddress: teacher.fullAddress,
    };
  }

  /**
   * 应用脱敏规则
   */
  private applyDesensitization(
    fullContact: FullContactInfo,
    isLoggedIn: boolean,
    userRole?: string
  ): DesensitizedContactInfo {
    const isVerified = userRole === 'verified_teacher' || userRole === 'admin';

    return {
      // 电话 - 登录后可看完整
      phone: isLoggedIn ? fullContact.phone : desensitizePhone(fullContact.phone || ''),
      phoneVisible: true,

      // 固定电话
      landline: isLoggedIn ? fullContact.landline : desensitizeLandline(fullContact.landline || ''),
      landlineVisible: true,

      // 邮箱 - 登录后可看完整
      email: isLoggedIn ? fullContact.email : desensitizeEmail(fullContact.email || ''),
      emailVisible: true,

      // 微信 - 默认不显示
      wechat: isVerified ? fullContact.wechat : desensitizeWechat(fullContact.wechat || ''),
      wechatVisible: isVerified,
      wechatRequestable: true,

      // QQ - 默认不显示
      qq: undefined,
      qqVisible: false,
      qqRequestable: true,

      // 地址 - 只显示城市
      address: desensitizeAddress(fullContact.address || ''),
      addressVisible: true,

      // 详细地址 - 需要申请
      fullAddressVisible: isVerified,
      fullAddressRequestable: !isVerified,
    };
  }

  /**
   * 记录联系方式查看日志
   */
  private async logContactView(params: {
    courseId: string;
    teacherId: string;
    viewerId?: string;
    viewerIP?: string;
    viewerUserAgent?: string;
    viewedFields: string[];
  }): Promise<ContactViewLog> {
    const viewId = uuidv4();
    const now = new Date().toISOString();

    const log: ContactViewLog = {
      ...createContactViewLogKey(viewId),
      SK: 'METADATA',
      entityType: 'CONTACT_VIEW',
      dataCategory: 'TRUST',
      id: viewId,
      courseId: params.courseId,
      teacherId: params.teacherId,
      viewerId: params.viewerId,
      viewerIP: params.viewerIP,
      viewerUserAgent: params.viewerUserAgent,
      viewedFields: params.viewedFields,
      viewedAt: now,
      GSI41PK: `COURSE#${params.courseId}`,
      GSI41SK: `VIEWED_AT#${now}`,
      GSI42PK: `TEACHER#${params.teacherId}`,
      GSI42SK: `VIEWED_AT#${now}`,
    };

    await putItem(log);

    return log;
  }

  /**
   * 增加用户查看计数
   */
  private async incrementUserViewCount(userId: string, courseId: string): Promise<void> {
    const cacheKey = `contact:views:${userId}:${courseId}`;
    const currentCount = await getFromCache<number>(cacheKey, 'TRUST') || 0;
    await setCache(cacheKey, 'TRUST', currentCount + 1, 3600);  // 1小时窗口
  }

  /**
   * 批量脱敏用户列表
   */
  async desensitizeUserList<T extends { name?: string; email?: string; phone?: string }>(
    users: T[]
  ): Promise<T[]> {
    return users.map(user => ({
      ...user,
      name: user.name ? desensitizeName(user.name) : undefined,
      email: user.email ? desensitizeEmail(user.email) : undefined,
      phone: user.phone ? desensitizePhone(user.phone) : undefined,
    }));
  }
}

export const desensitizationService = new DesensitizationService();
```

---

## 五、API 设计

### 5.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| **联系方式** |
| GET | /api/v1/courses/:id/contact | 获取脱敏联系方式 | 公开 |
| GET | /api/v1/courses/:id/contact/full | 获取完整联系方式 | 需登录 |
| POST | /api/v1/courses/:id/contact/request | 申请查看完整信息 | 需登录 |
| **管理操作** |
| PUT | /api/v1/admin/contact-requests/:id/process | 处理查看请求 | 教师/管理员 |
| GET | /api/v1/admin/contact-requests | 查看请求列表 | 教师/管理员 |
| GET | /api/v1/admin/contact-views | 查看日志 | 管理员 |

### 5.2 API 详细设计

#### 5.2.1 GET /api/v1/courses/:id/contact

**响应示例** (200):
```json
{
  "success": true,
  "data": {
    "phone": "021-***-4567",
    "phoneVisible": true,
    "email": "te***@example.com",
    "emailVisible": true,
    "wechat": null,
    "wechatVisible": false,
    "wechatRequestable": true,
    "address": "Auckland",
    "fullAddressVisible": false,
    "fullAddressRequestable": true
  }
}
```

#### 5.2.2 GET /api/v1/courses/:id/contact/full

**请求头**: Authorization: Bearer \<token\>

**响应示例** (200):
```json
{
  "success": true,
  "data": {
    "phone": "021-123-4567",
    "phoneVerified": true,
    "email": "teacher@example.com",
    "emailVerified": true,
    "wechat": "wx12345678",
    "address": "123 Queen Street, Auckland CBD"
  },
  "message": "您已查看完整联系方式，请合理使用"
}
```

---

## 六、前端实现

### 6.1 联系方式展示组件

```typescript
// src/components/contact/ContactDisplay.tsx
import React from 'react';
import { Button, Tooltip, Modal, message } from 'antd';
import { CopyOutlined, EyeOutlined, LockOutlined } from '@ant-design/icons';
import { contactApi } from '../../api/contact';

interface ContactDisplayProps {
  courseId: string;
  contact: {
    phone?: string;
    phoneVisible: boolean;
    email?: string;
    emailVisible: boolean;
    wechat?: string;
    wechatVisible: boolean;
    wechatRequestable: boolean;
    address?: string;
    fullAddressVisible: boolean;
    fullAddressRequestable: boolean;
  };
  isLoggedIn: boolean;
  onRequestFull: () => void;
}

export const ContactDisplay: React.FC<ContactDisplayProps> = ({
  courseId,
  contact,
  isLoggedIn,
  onRequestFull,
}) => {
  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      message.success(`${label} copied to clipboard`);
    } catch (err) {
      message.error('Failed to copy');
    }
  };

  return (
    <div className="contact-display">
      {/* 电话 */}
      <div className="contact-item">
        <span className="contact-icon">📞</span>
        <span>{contact.phone}</span>
        {isLoggedIn && contact.phone && (
          <Tooltip title="Click to copy">
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(contact.phone!, 'Phone')}
            >
              {contact.phone}
            </Button>
          </Tooltip>
        )}
      </div>

      {/* 邮箱 */}
      <div className="contact-item">
        <span className="contact-icon">📧</span>
        <span>{contact.email}</span>
        {isLoggedIn && contact.email && (
          <a href={`mailto:${contact.email}`} className="contact-action">
            Send Email
          </a>
        )}
      </div>

      {/* 微信 */}
      <div className="contact-item">
        <span className="contact-icon">💬</span>
        {contact.wechatVisible && contact.wechat ? (
          <>
            <span>{contact.wechat}</span>
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(contact.wechat!, 'WeChat')}
            >
              Copy
            </Button>
          </>
        ) : contact.wechatRequestable ? (
          <Button type="primary" icon={<EyeOutlined />} onClick={onRequestFull}>
            View WeChat
          </Button>
        ) : (
          <span className="not-available">
            <LockOutlined /> Not available
          </span>
        )}
      </div>

      {/* 地址 */}
      <div className="contact-item">
        <span className="contact-icon">📍</span>
        <span>{contact.address}</span>
        {contact.fullAddressRequestable && !contact.fullAddressVisible && (
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={onRequestFull}>
            View Full Address
          </Button>
        )}
      </div>
    </div>
  );
};
```

---

## 七、测试用例

### 7.1 单元测试

```typescript
// src/modules/desensitization/desensitization.service.test.ts
import { desensitizationService } from './desensitization.service';
import { mockPutItem, mockGetItem, mockQueryItems, mockUpdateItem, mockGetFromCache, mockSetCache } from '../../test/mocks';

describe('DesensitizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDesensitizedContact', () => {
    it('should return desensitized contact for guest user', async () => {
      const mockTeacher = {
        PK: 'TEACHER#teacher-123',
        SK: 'METADATA',
        phone: '021-123-4567',
        email: 'teacher@example.com',
        wechat: 'wx12345678',
        address: '123 Queen St, Auckland CBD',
      };

      (getFromCache as jest.Mock).mockResolvedValueOnce(null);
      (getItem as jest.Mock).mockResolvedValueOnce(mockTeacher);
      (setCache as jest.Mock).mockResolvedValue({});

      const result = await desensitizationService.getDesensitizedContact(
        'course-123',
        'teacher-123'
        // 未登录用户
      );

      expect(result.phone).toBe('021-***-4567');
      expect(result.email).toBe('te***@example.com');
      expect(result.wechat).toBe('wx******78');
      expect(result.address).toBe('Auckland CBD');
      expect(result.wechatVisible).toBe(false);
    });

    it('should return full contact for logged-in user', async () => {
      const mockTeacher = {
        PK: 'TEACHER#teacher-123',
        SK: 'METADATA',
        phone: '021-123-4567',
        email: 'teacher@example.com',
        wechat: 'wx12345678',
        address: '123 Queen St, Auckland CBD',
      };

      (getFromCache as jest.Mock).mockResolvedValueOnce(null);
      (getItem as jest.Mock).mockResolvedValueOnce(mockTeacher);
      (setCache as jest.Mock).mockResolvedValue({});
      (putItem as jest.Mock).mockResolvedValue({});

      const result = await desensitizationService.getDesensitizedContact(
        'course-123',
        'teacher-123',
        'user-456'  // 已登录用户
      );

      expect(result.phone).toBe('021-123-4567');  // 完整号码
      expect(result.email).toBe('teacher@example.com');  // 完整邮箱
      expect(result.wechatVisible).toBe(false);  // 微信仍需申请
    });
  });

  describe('requestFullContact', () => {
    it('should create contact request successfully', async () => {
      (putItem as jest.Mock).mockResolvedValue({});
      (notificationService.sendUserNotification as jest.Mock).mockResolvedValue({});

      const result = await desensitizationService.requestFullContact(
        'course-123',
        'teacher-456',
        'user-789',
        ['wechat', 'fullAddress']
      );

      expect(result).toBeDefined();
      expect(result.courseId).toBe('course-123');
      expect(result.status).toBe('pending');
      expect(result.requestedFields).toContain('wechat');
    });
  });

  describe('processContactRequest', () => {
    it('should approve contact request', async () => {
      const mockRequest = {
        id: 'request-123',
        teacherId: 'teacher-456',
        userId: 'user-789',
        status: 'pending',
      };

      (getItem as jest.Mock).mockResolvedValueOnce(mockRequest);
      (updateItem as jest.Mock).mockResolvedValueOnce({
        ...mockRequest,
        status: 'approved',
        processedAt: new Date().toISOString(),
      });
      (notificationService.sendUserNotification as jest.Mock).mockResolvedValue({});

      const result = await desensitizationService.processContactRequest(
        'request-123',
        'teacher-456',
        'approve'
      );

      expect(result.status).toBe('approved');
    });

    it('should reject for unauthorized teacher', async () => {
      const mockRequest = {
        id: 'request-123',
        teacherId: 'teacher-999',  // 不同的教师
        userId: 'user-789',
        status: 'pending',
      };

      (getItem as jest.Mock).mockResolvedValueOnce(mockRequest);

      await expect(
        desensitizationService.processContactRequest(
          'request-123',
          'teacher-456',  // 不是请求的教师
          'approve'
        )
      ).rejects.toThrow('Unauthorized to process this request');
    });
  });
});

describe('Desensitization Utils', () => {
  describe('desensitizePhone', () => {
    it('should mask phone number correctly', () => {
      expect(desensitizePhone('021-123-4567')).toBe('021-***-4567');
      expect(desensitizePhone('0211234567')).toBe('021-***-4567');
      expect(desensitizePhone('')).toBe('');
      expect(desensitizePhone(null as any)).toBe(null);
    });
  });

  describe('desensitizeEmail', () => {
    it('should mask email correctly', () => {
      expect(desensitizeEmail('teacher@example.com')).toBe('te***@example.com');
      expect(desensitizeEmail('ab@c.com')).toBe('a***@c.com');
      expect(desensitizeEmail('invalid')).toBe('invalid');
    });
  });

  describe('desensitizeWechat', () => {
    it('should mask wechat correctly', () => {
      expect(desensitizeWechat('wx12345678')).toBe('wx******78');
      expect(desensitizeWechat('abc')).toBe('abc');
    });
  });

  describe('desensitizeName', () => {
    it('should mask name correctly', () => {
      expect(desensitizeName('张老师')).toBe('张**');
      expect(desensitizeName('A')).toBe('A');
      expect(desensitizeName('')).toBe('');
    });
  });

  describe('desensitizeAddress', () => {
    it('should mask address correctly', () => {
      expect(desensitizeAddress('123 Queen St, Auckland')).toBe('Auckland');
      expect(desensitizeAddress('456 Queen Street, Wellington CBD')).toBe('Wellington CBD');
    });
  });
});
```

---

## 八、验收标准

- [ ] 各类型数据正确脱敏
- [ ] 分级展示规则正确（游客、登录用户、验证用户）
- [ ] 登录用户可查看完整信息
- [ ] 敏感操作记录日志
- [ ] 前端展示美观易用
- [ ] 脱敏规则覆盖所有敏感字段
- [ ] 查看请求流程正常

---

## 九、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 脱敏规则漏洞 | 低 | 高 | 代码审查，安全测试 |
| 绕过脱敏 | 低 | 高 | 后端统一脱敏，前端不存原始数据 |
| 合规要求变化 | 中 | 中 | 脱敏规则可配置 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/trust/tech-desensitization.md`

**相关文档**:
- [产品设计](../../05-product-design/trust/desensitization.md)
- [课程详情](../course/tech-course-detail.md)
- [数据聚合](tech-data-aggregation.md)
