---
title: 技术实现 - 问题追踪系统
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 1
priority: P1
status: complete
related_feature: ../../05-product-design/feedback/feedback-issues.md
---

# 技术实现: 问题追踪系统

> **对应产品文档**: [feedback-issues.md](../../05-product-design/feedback/feedback-issues.md) | **优先级**: P1 | **排期**: Phase 1 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      问题追踪系统技术架构                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   │   ├── 举报表单                                                   │
│   │   ├── 问题列表                                                   │
│   │   └── 问题详情                                                   │
│   └── 微信小程序 (Taro)                                              │
│       └── 举报入口                                                   │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── POST /api/v1/issues                                           │
│   ├── GET /api/v1/issues/:id                                        │
│   ├── GET /api/v1/issues/my                                         │
│   ├── PUT /api/v1/issues/:id                                        │
│   └── GET /api/v1/admin/issues                                      │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── IssueService (问题服务)                                        │
│   ├── IssueCategoryService (分类服务)                                │
│   └── IssueResolutionService (解决服务)                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   ├── DynamoDB (FindClass-MainTable)                                │
│   │   ├── ISSUE#{issueId}                                           │
│   │   ├── ISSUE_COMMENT#{commentId}                                 │
│   │   └── ISSUE_CATEGORY#{categoryId}                               │
│   └── DynamoDB (缓存)                                                │
│       ├── issue:{issueId}                                           │
│       └── issue:categories                                          │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [外部服务]                                                         │
│   ├── SES (邮件通知)                                                 │
│   ├── SNS (短信通知 - 可选)                                          │
│   └── S3 (截图存储)                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/issues/
├── issues.types.ts                # 类型定义
├── issues.service.ts              # 问题服务
├── issues.controller.ts           # 问题API控制器
├── issues.routes.ts               # 问题路由
├── issue-categories.service.ts    # 分类服务
├── issue-comments.service.ts      # 评论服务
└── index.ts                       # 模块导出

07-backend/src/handlers/issues/
├── create.handler.ts              # 创建问题处理器
├── update.handler.ts              # 更新问题处理器
└── notify.handler.ts              # 通知处理器
```

---

## 二、数据模型设计 (DynamoDB)

### 2.1 问题类型定义

```typescript
// src/modules/issues/issues.types.ts

/**
 * 问题类型
 */
export enum IssueType {
  CONTENT_ISSUE = 'content_issue',         // 内容问题
  TECHNICAL_ISSUE = 'technical_issue',     // 技术问题
  PAYMENT_ISSUE = 'payment_issue',         // 支付问题
  ACCOUNT_ISSUE = 'account_issue',         // 账户问题
  FRAUD_REPORT = 'fraud_report',           // 欺诈举报
  COPYRIGHT = 'copyright',                  // 版权问题
  SAFETY = 'safety',                       // 安全问题
  OTHER = 'other',
}

/**
 * 问题状态
 */
export enum IssueStatus {
  SUBMITTED = 'submitted',                 // 已提交
  ACKNOWLEDGED = 'acknowledged',           // 已受理
  INVESTIGATING = 'investigating',         // 调查中
  PENDING_USER = 'pending_user',           // 等待用户回复
  RESOLVED = 'resolved',                   // 已解决
  CLOSED = 'closed',                       // 已关闭
  REJECTED = 'rejected',                   // 已拒绝
}

/**
 * 问题优先级
 */
export enum IssuePriority {
  LOW = 'low',                             // 低
  MEDIUM = 'medium',                       // 中
  HIGH = 'high',                           // 高
  URGENT = 'urgent',                       // 紧急
}

/**
 * 问题严重程度
 */
export enum IssueSeverity {
  MINOR = 'minor',                         // 轻微
  NORMAL = 'normal',                       // 一般
  SERIOUS = 'serious',                     // 严重
  CRITICAL = 'critical',                   // 严重
}

/**
 * 问题关联类型
 */
export enum IssueTargetType {
  COURSE = 'course',
  TEACHER = 'teacher',
  INSTITUTION = 'institution',
  USER = 'user',
  REVIEW = 'review',
  SYSTEM = 'system',
}

/**
 * 问题 DynamoDB 类型
 */
export interface Issue {
  // DynamoDB 主键
  PK: string;           // ISSUE#{issueId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'ISSUE';
  dataCategory: 'FEEDBACK';
  id: string;
  
  // 基本信息
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  severity: IssueSeverity;
  
  // 关联目标
  targetType: IssueTargetType;
  targetId: string;
  targetTitle?: string;          // 关联内容的标题
  
  // 提交者信息
  reporterId?: string;
  reporterName?: string;
  reporterEmail?: string;
  isAnonymous: boolean;
  
  // 内容
  content: string;
  attachments?: string[];        // S3 URLs
  
  // 位置信息
  pageUrl?: string;
  deviceInfo?: string;
  browserInfo?: string;
  
  // 处理信息
  assignedTo?: string;
  assignedAt?: string;
  resolution?: string;
  resolutionNote?: string;
  
  // 时间线
  submittedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI31PK?: string;  // STATUS#{status}
  GSI31SK?: string;  // CREATED_AT#{createdAt}
  GSI32PK?: string;  // TYPE#{type}
  GSI32SK?: string;  // CREATED_AT#{createdAt}
  GSI33PK?: string;  // TARGET#{targetType}
  GSI33SK?: string;  // TARGET_ID#{targetId}
  GSI34PK?: string;  // ASSIGNED#{assignedTo}
  GSI34SK?: string;  // UPDATED_AT#{updatedAt}
}

/**
 * 问题评论/回复
 */
export interface IssueComment {
  // DynamoDB 主键
  PK: string;           // ISSUE#{issueId}
  SK: string;           // COMMENT#{commentId}
  
  // 实体类型标识
  entityType: 'ISSUE_COMMENT';
  dataCategory: 'FEEDBACK';
  id: string;
  
  // 关联
  issueId: string;
  
  // 评论者
  authorId: string;
  authorName: string;
  authorRole: 'reporter' | 'staff' | 'admin';
  
  // 内容
  content: string;
  isInternal: boolean;              // 内部评论（用户不可见）
  
  // 附件
  attachments?: string[];
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
}

/**
 * 问题分类
 */
export interface IssueCategory {
  // DynamoDB 主键
  PK: string;           // ISSUE_CATEGORY#{categoryId}
  SK: string;           // METADATA
  
  entityType: 'ISSUE_CATEGORY';
  dataCategory: 'FEEDBACK';
  id: string;
  
  name: string;
  nameEn: string;
  description?: string;
  type: IssueType;
  
  // SLA 配置
  slaHours: number;                    // 响应时间（小时）
  autoAssignRole?: string;             // 自动分配角色
  
  // 统计
  totalIssues: number;
  openIssues: number;
  
  isActive: boolean;
  sortOrder: number;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * 问题统计
 */
export interface IssueStatistics {
  PK: string;           // ISSUE_STATS#{date}
  SK: string;           // METADATA
  
  entityType: 'ISSUE_STATS';
  dataCategory: 'FEEDBACK';
  id: string;
  
  date: string;
  
  // 数量统计
  totalSubmitted: number;
  totalResolved: number;
  totalClosed: number;
  avgResolutionHours: number;
  
  // 类型分布
  typeDistribution: Record<IssueType, number>;
  
  // 状态分布
  statusDistribution: Record<IssueStatus, number>;
  
  // SLA 统计
  withinSlaCount: number;
  exceededSlaCount: number;
  
  calculatedAt: string;
}
```

---

## 三、业务逻辑实现

### 3.1 问题服务

```typescript
// src/modules/issues/issues.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  Issue,
  IssueComment,
  IssueCategory,
  IssueStatistics,
  IssueStatus,
  IssuePriority,
  IssueType,
  IssueTargetType,
  createIssueKey,
  createIssueCommentKey,
  createCategoryKey,
} from './issues.types';
import { putItem, getItem, queryItems, updateItem } from '@shared/db/dynamodb';
import { getFromCache, setCache } from '@shared/db/cache';
import { sendEmail } from '@shared/email';
import { uploadToS3 } from '@shared/s3';

/**
 * 问题服务类
 */
export class IssueService {
  /**
   * 创建问题
   */
  async createIssue(data: {
    title: string;
    description: string;
    type: IssueType;
    targetType?: IssueTargetType;
    targetId?: string;
    reporterEmail?: string;
    isAnonymous?: boolean;
    pageUrl?: string;
    deviceInfo?: string;
    browserInfo?: string;
    attachments?: Buffer[];
  }): Promise<Issue> {
    const issueId = uuidv4();
    const now = new Date().toISOString();

    // 处理附件上传
    let attachmentUrls: string[] = [];
    if (data.attachments?.length) {
      const uploadPromises = data.attachments.map((file, index) =>
        uploadToS3(file, `issues/${issueId}/attachment-${index}.jpg`)
      );
      attachmentUrls = await Promise.all(uploadPromises);
    }

    // 确定优先级
    const priority = this.determinePriority(data.type);

    const issue: Issue = {
      ...createIssueKey(issueId),
      SK: 'METADATA',
      entityType: 'ISSUE',
      dataCategory: 'FEEDBACK',
      id: issueId,
      title: data.title,
      description: data.description,
      type: data.type,
      status: IssueStatus.SUBMITTED,
      priority,
      severity: this.determineSeverity(data.type),
      targetType: data.targetType || IssueTargetType.SYSTEM,
      targetId: data.targetId,
      reporterEmail: data.reporterEmail,
      isAnonymous: data.isAnonymous || false,
      content: data.description,
      attachments: attachmentUrls,
      pageUrl: data.pageUrl,
      deviceInfo: data.deviceInfo,
      browserInfo: data.browserInfo,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
      GSI31PK: `STATUS#${IssueStatus.SUBMITTED}`,
      GSI31SK: `CREATED_AT#${now}`,
      GSI32PK: `TYPE#${data.type}`,
      GSI32SK: `CREATED_AT#${now}`,
    };

    if (data.targetType && data.targetId) {
      issue.GSI33PK = `TARGET#${data.targetType}`;
      issue.GSI33SK = `TARGET_ID#${data.targetId}`;
    }

    await putItem(issue);

    // 自动分配
    await this.autoAssignIssue(issue);

    // 发送确认邮件
    if (data.reporterEmail) {
      await this.sendSubmissionConfirmation(data.reporterEmail, issue);
    }

    // 通知管理员
    await this.notifyAdmins(issue);

    logger.info('Issue created', { issueId, type: data.type });

    return issue;
  }

  /**
   * 获取问题详情
   */
  async getIssue(issueId: string, userId?: string): Promise<Issue | null> {
    const cacheKey = `issue:${issueId}`;
    const cached = await getFromCache<Issue>(cacheKey, 'FEEDBACK');
    if (cached) return cached;

    const { PK, SK } = createIssueKey(issueId);
    const issue = await getItem<Issue>({ PK, SK });

    if (issue) {
      await setCache(cacheKey, 'FEEDBACK', issue, 300);
    }

    return issue;
  }

  /**
   * 获取问题列表
   */
  async getIssues(params: {
    status?: IssueStatus;
    type?: IssueType;
    priority?: IssuePriority;
    assignedTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{ issues: Issue[]; total: number }> {
    const { page = 1, limit = 20 } = params;

    let keyCondition = 'PK = :pk AND begins_with(SK, :sk)';
    const values: Record<string, any> = {
      ':pk': 'ISSUE',
      ':sk': 'METADATA',
    };

    // 使用索引查询
    if (params.status) {
      const result = await queryItems<Issue>({
        indexName: 'GSI31-IssuesByStatus',
        keyConditionExpression: 'GSI31PK = :pk',
        expressionAttributeValues: {
          ':pk': `STATUS#${params.status}`,
        },
        limit,
        scanIndexForward: false,
      });
      return { issues: result.items, total: result.count };
    }

    if (params.type) {
      const result = await queryItems<Issue>({
        indexName: 'GSI32-IssuesByType',
        keyConditionExpression: 'GSI32PK = :pk',
        expressionAttributeValues: {
          ':pk': `TYPE#${params.type}`,
        },
        limit,
        scanIndexForward: false,
      });
      return { issues: result.items, total: result.count };
    }

    const result = await queryItems<Issue>({
      keyConditionExpression: keyCondition,
      expressionAttributeValues: values,
      limit,
      scanIndexForward: false,
    });

    return { issues: result.items, total: result.count };
  }

  /**
   * 更新问题状态
   */
  async updateStatus(
    issueId: string,
    status: IssueStatus,
    updaterId: string,
    note?: string
  ): Promise<Issue> {
    const issue = await this.getIssue(issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    const now = new Date().toISOString();
    let updateExpression = 'SET #status = :status, updatedAt = :now';
    const expressionValues: Record<string, any> = {
      ':status': status,
      ':now': now,
    };
    const expressionNames: Record<string, string> = {
      '#status': 'status',
    };

    // 更新时间线字段
    if (status === IssueStatus.ACKNOWLEDGED && !issue.acknowledgedAt) {
      updateExpression += ', acknowledgedAt = :acknowledgedAt';
      expressionValues[':acknowledgedAt'] = now;
    }
    if (status === IssueStatus.RESOLVED && !issue.resolvedAt) {
      updateExpression += ', resolvedAt = :resolvedAt';
      expressionValues[':resolvedAt'] = now;
    }

    if (note) {
      updateExpression += ', resolutionNote = :note';
      expressionValues[':note'] = note;
    }

    // 更新主键索引
    if (status !== issue.status) {
      updateExpression += ', GSI31PK = :newStatusPk, GSI31SK = :newStatusSk';
      expressionValues[':newStatusPk'] = `STATUS#${status}`;
      expressionValues[':newStatusSk'] = `CREATED_AT#${issue.createdAt}`;
    }

    const updated = await updateItem(
      createIssueKey(issueId),
      updateExpression,
      expressionValues,
      expressionNames
    ) as Issue;

    // 清除缓存
    await deleteCache(`issue:${issueId}`, 'FEEDBACK');

    // 通知提交者
    await this.notifyReporter(updated, status, note);

    logger.info('Issue status updated', { issueId, status, updaterId });

    return updated;
  }

  /**
   * 分配问题
   */
  async assignIssue(issueId: string, assigneeId: string, assignerId: string): Promise<Issue> {
    const issue = await this.getIssue(issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    const now = new Date().toISOString();

    const updated = await updateItem(
      createIssueKey(issueId),
      `SET assignedTo = :assignee, assignedAt = :now, GSI34PK = :pk, GSI34SK = :sk, updatedAt = :now`,
      {
        ':assignee': assigneeId,
        ':now': now,
        ':pk': `ASSIGNED#${assigneeId}`,
        ':sk': `UPDATED_AT#${now}`,
      }
    ) as Issue;

    // 通知被分配人
    await notificationService.sendUserNotification(
      assigneeId,
      'issue_assigned',
      { issueId, title: issue.title }
    );

    logger.info('Issue assigned', { issueId, assigneeId, assignerId });

    return updated;
  }

  /**
   * 添加评论
   */
  async addComment(issueId: string, authorId: string, authorName: string, data: {
    content: string;
    isInternal?: boolean;
    attachments?: string[];
  }): Promise<IssueComment> {
    const commentId = uuidv4();
    const now = new Date().toISOString();

    const comment: IssueComment = {
      PK: `ISSUE#${issueId}`,
      SK: `COMMENT#${commentId}`,
      entityType: 'ISSUE_COMMENT',
      dataCategory: 'FEEDBACK',
      id: commentId,
      issueId,
      authorId,
      authorName,
      authorRole: 'staff',
      content: data.content,
      isInternal: data.isInternal || false,
      attachments: data.attachments,
      createdAt: now,
      updatedAt: now,
    };

    await putItem(comment);

    // 更新问题更新时间
    await updateItem(
      createIssueKey(issueId),
      'SET updatedAt = :now',
      { ':now': now }
    );

    // 清除缓存
    await deleteCache(`issue:${issueId}`, 'FEEDBACK');

    return comment;
  }

  /**
   * 获取问题的评论
   */
  async getComments(issueId: string, includeInternal: boolean = false): Promise<IssueComment[]> {
    const result = await queryItems<IssueComment>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': `ISSUE#${issueId}`,
        ':sk': 'COMMENT#',
      },
      scanIndexForward: true,
    });

    if (!includeInternal) {
      return result.items.filter(c => !c.isInternal);
    }

    return result.items;
  }

  /**
   * 确定优先级
   */
  private determinePriority(type: IssueType): IssuePriority {
    const urgentTypes = [IssueType.FRAUD_REPORT, IssueType.SAFETY];
    const highTypes = [IssueType.CONTENT_ISSUE, IssueType.TECHNICAL_ISSUE];

    if (urgentTypes.includes(type)) return IssuePriority.URGENT;
    if (highTypes.includes(type)) return IssuePriority.HIGH;
    return IssuePriority.MEDIUM;
  }

  /**
   * 确定严重程度
   */
  private determineSeverity(type: IssueType): 'minor' | 'normal' | 'serious' | 'critical' {
    if (type === IssueType.FRAUD_REPORT || type === IssueType.SAFETY) {
      return 'critical';
    }
    if (type === IssueType.COPYRIGHT) {
      return 'serious';
    }
    return 'normal';
  }

  /**
   * 自动分配问题
   */
  private async autoAssignIssue(issue: Issue): Promise<void> {
    // 根据类型自动分配给相应角色
    const assigneeMap: Record<IssueType, string> = {
      [IssueType.CONTENT_ISSUE]: 'content-team',
      [IssueType.TECHNICAL_ISSUE]: 'tech-team',
      [IssueType.PAYMENT_ISSUE]: 'finance-team',
      [IssueType.ACCOUNT_ISSUE]: 'support-team',
      [IssueType.FRAUD_REPORT]: 'security-team',
      [IssueType.COPYRIGHT]: 'legal-team',
      [IssueType.SAFETY]: 'security-team',
      [IssueType.OTHER]: 'support-team',
    };

    const assignee = assigneeMap[issue.type];
    if (assignee) {
      await this.assignIssue(issue.id, assignee, 'system');
    }
  }

  /**
   * 发送提交确认
   */
  private async sendSubmissionConfirmation(email: string, issue: Issue): Promise<void> {
    await sendEmail({
      to: email,
      subject: `Issue Submitted - ${issue.id}`,
      template: 'issue-submitted',
      data: {
        issueId: issue.id,
        title: issue.title,
        type: issue.type,
      },
    });
  }

  /**
   * 通知管理员
   */
  private async notifyAdmins(issue: Issue): Promise<void> {
    await notificationService.sendAdminNotification('new_issue', {
      issueId: issue.id,
      type: issue.type,
      priority: issue.priority,
    });
  }

  /**
   * 通知提交者
   */
  private async notifyReporter(issue: Issue, status: IssueStatus, note?: string): Promise<void> {
    if (!issue.reporterEmail || issue.isAnonymous) return;

    const templates: Record<IssueStatus, string> = {
      [IssueStatus.ACKNOWLEDGED]: 'issue-acknowledged',
      [IssueStatus.INVESTIGATING]: 'issue-investigating',
      [IssueStatus.RESOLVED]: 'issue-resolved',
      [IssueStatus.CLOSED]: 'issue-closed',
      [IssueStatus.REJECTED]: 'issue-rejected',
      [IssueStatus.SUBMITTED]: 'issue-submitted',
      [IssueStatus.PENDING_USER]: 'issue-pending-user',
    };

    await sendEmail({
      to: issue.reporterEmail,
      subject: `Issue Update - ${issue.id}`,
      template: templates[status],
      data: {
        issueId: issue.id,
        title: issue.title,
        status,
        note,
      },
    });
  }
}

export const issueService = new IssueService();
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| **问题操作** |
| POST | /api/v1/issues | 创建问题 | 公开 |
| GET | /api/v1/issues/:id | 获取问题详情 | 公开/需登录 |
| GET | /api/v1/issues/my | 我的问题 | 需登录 |
| PUT | /api/v1/issues/:id/status | 更新状态 | 需登录/权限 |
| POST | /api/v1/issues/:id/comments | 添加评论 | 需登录 |
| GET | /api/v1/issues/:id/comments | 获取评论 | 需登录 |
| **管理操作** |
| GET | /api/v1/admin/issues | 问题列表 | 管理员 |
| PUT | /api/v1/admin/issues/:id/assign | 分配问题 | 管理员 |
| POST | /api/v1/admin/issues/:id/resolve | 解决问题 | 管理员 |
| GET | /api/v1/admin/issues/stats | 问题统计 | 管理员 |

### 4.2 API 详细设计

#### 4.2.1 POST /api/v1/issues

**请求体**:
```json
{
  "title": "虚假课程信息",
  "description": "该教师发布的课程信息与实际情况不符",
  "type": "fraud_report",
  "targetType": "teacher",
  "targetId": "teacher-123",
  "reporterEmail": "user@example.com",
  "pageUrl": "https://findclass.co.nz/teacher/123",
  "attachments": ["base64-encoded-image"]
}
```

**响应示例** (201):
```json
{
  "success": true,
  "data": {
    "issueId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "submitted",
    "priority": "urgent",
    "message": "问题已提交，我们会在24小时内处理"
  }
}
```

#### 4.2.2 PUT /api/v1/admin/issues/:id/status

**请求体**:
```json
{
  "status": "resolved",
  "note": "经核实，该教师信息已更新，问题已解决"
}
```

---

## 五、前端实现

### 5.1 问题举报表单

```typescript
// src/components/issues/IssueReportForm.tsx
import React, { useState } from 'react';
import { Form, Input, Select, Upload, Button, message, Card } from 'antd';
import { UploadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { issueApi } from '../../api/issue';

const { TextArea } = Input;
const { Option } = Select;

interface IssueReportFormProps {
  targetType?: 'course' | 'teacher' | 'review';
  targetId?: string;
  onSuccess?: () => void;
}

export const IssueReportForm: React.FC<IssueReportFormProps> = ({
  targetType,
  targetId,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const attachments = fileList.map(f => f.originFileObj);
      
      await issueApi.createIssue({
        title: values.title,
        description: values.description,
        type: values.type,
        targetType: targetType,
        targetId: targetId,
        reporterEmail: values.email,
        isAnonymous: values.isAnonymous,
        attachments,
      });

      message.success('问题已提交，我们会尽快处理');
      form.resetFields();
      setFileList([]);
      onSuccess?.();
    } catch (error: any) {
      message.error(error.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="issue-report-form">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark="optional"
      >
        <Form.Item
          name="type"
          label="问题类型"
          rules={[{ required: true, message: '请选择问题类型' }]}
        >
          <Select placeholder="选择问题类型">
            <Option value="content_issue">内容问题</Option>
            <Option value="fraud_report">欺诈举报</Option>
            <Option value="copyright">版权问题</Option>
            <Option value="safety">安全问题</Option>
            <Option value="other">其他</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="title"
          label="问题标题"
          rules={[{ required: true, message: '请输入问题标题' }]}
        >
          <Input placeholder="简要描述问题" />
        </Form.Item>

        <Form.Item
          name="description"
          label="详细描述"
          rules={[{ required: true, message: '请详细描述问题' }]}
        >
          <TextArea rows={4} placeholder="请详细描述您遇到的问题" />
        </Form.Item>

        <Form.Item
          name="email"
          label="联系邮箱"
          rules={[{ required: true, type: 'email', message: '请输入有效的邮箱' }]}
        >
          <Input placeholder="用于接收处理结果通知" />
        </Form.Item>

        <Form.Item name="isAnonymous" valuePropName="checked">
          <span>匿名提交（不会显示您的邮箱信息）</span>
        </Form.Item>

        <Form.Item label="附件">
          <Upload
            listType="picture"
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            beforeUpload={() => false}
            maxCount={3}
          >
            <Button icon={<UploadOutlined />}>上传截图</Button>
          </Upload>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} icon={<ExclamationCircleOutlined />}>
            提交举报
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};
```

---

## 六、测试用例

### 6.1 单元测试

```typescript
// src/modules/issues/issues.service.test.ts
import { issueService } from './issues.service';
import { mockPutItem, mockGetItem, mockQueryItems, mockUpdateItem, mockUploadToS3 } from '../../test/mocks';

describe('IssueService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createIssue', () => {
    it('should create issue successfully', async () => {
      (putItem as jest.Mock).mockResolvedValue({});
      (uploadToS3 as jest.Mock).mockResolvedValue('https://s3.url/image.jpg');

      const result = await issueService.createIssue({
        title: '虚假信息举报',
        description: '该教师信息不实',
        type: 'fraud_report',
        reporterEmail: 'test@example.com',
        attachments: [Buffer.from('test')],
      });

      expect(result).toBeDefined();
      expect(result.title).toBe('虚假信息举报');
      expect(result.type).toBe('fraud_report');
      expect(result.priority).toBe('urgent');
    });

    it('should set correct priority for fraud report', async () => {
      (putItem as jest.Mock).mockResolvedValue({});

      const result = await issueService.createIssue({
        title: '欺诈举报',
        description: '遇到欺诈行为',
        type: 'fraud_report',
      });

      expect(result.priority).toBe('urgent');
    });

    it('should set medium priority for content issue', async () => {
      (putItem as jest.Mock).mockResolvedValue({});

      const result = await issueService.createIssue({
        title: '内容问题',
        description: '课程内容有问题',
        type: 'content_issue',
      });

      expect(result.priority).toBe('high');
    });
  });

  describe('updateStatus', () => {
    it('should update status and notify reporter', async () => {
      const mockIssue = {
        id: 'issue-123',
        status: 'submitted',
        reporterEmail: 'test@example.com',
        isAnonymous: false,
        createdAt: new Date().toISOString(),
      };

      (getItem as jest.Mock).mockResolvedValueOnce(mockIssue);
      (updateItem as jest.Mock).mockResolvedValue({
        ...mockIssue,
        status: 'acknowledged',
      });

      const result = await issueService.updateStatus('issue-123', 'acknowledged', 'admin-1');

      expect(result.status).toBe('acknowledged');
    });

    it('should throw error for non-existent issue', async () => {
      (getItem as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        issueService.updateStatus('non-existent', 'resolved', 'admin-1')
      ).rejects.toThrow('Issue not found');
    });
  });

  describe('addComment', () => {
    it('should add comment successfully', async () => {
      (putItem as jest.Mock).mockResolvedValue({});
      (updateItem as jest.Mock).mockResolvedValue({});

      const result = await issueService.addComment(
        'issue-123',
        'staff-1',
        'Support Staff',
        { content: '我们正在处理您的问题' }
      );

      expect(result).toBeDefined();
      expect(result.content).toBe('我们正在处理您的问题');
      expect(result.authorRole).toBe('staff');
    });
  });
});
```

---

## 七、验收标准

- [ ] 问题创建正确
- [ ] 问题状态更新正确
- [ ] 自动分配正常工作
- [ ] 邮件通知发送正确
- [ ] 评论功能正常
- [ ] 附件上传正常
- [ ] 问题统计准确

---

## 八、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 恶意举报 | 中 | 中 | 审核机制，IP 限制 |
| 虚假附件 | 低 | 中 | 文件验证，病毒扫描 |
| 通知延迟 | 低 | 中 | 异步队列，重试机制 |
| 隐私泄露 | 低 | 高 | 数据脱敏，权限控制 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/feedback/tech-feedback-issues.md`

**相关文档**:
- [产品设计](../../05-product-design/feedback/feedback-issues.md)
- [用户反馈系统](tech-feedback.md)
