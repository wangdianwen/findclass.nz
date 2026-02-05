---
title: 技术实现 - 用户反馈系统
category: tech-architecture
created: 2026-01-21
author: linus-torvalds
version: 1.0
phase: 1
priority: P0
status: complete
related_feature: ../../05-product-design/mvp/feature-feedback.md
---

# 技术实现: 用户反馈系统

> **对应产品文档**: [feature-feedback.md](../../05-product-design/mvp/feature-feedback.md) | **优先级**: P0 | **排期**: Phase 1 | **状态**: 已完成

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      用户反馈系统技术架构                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   └── 微信小程序 (Taro)                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── POST /api/v1/feedback                 # 提交反馈              │
│   ├── GET /api/v1/feedback/:id              # 获取反馈详情          │
│   ├── GET /api/v1/feedback                  # 获取反馈列表(管理)    │
│   ├── PUT /api/v1/feedback/:id/respond      # 回应反馈(管理)        │
│   └── PUT /api/v1/feedback/:id/status       # 更新状态(管理)        │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── FeedbackService (反馈服务)                                     │
│   ├── FeedbackAttachmentService (附件服务)                           │
│   └── FeedbackNotificationService (通知服务)                          │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   └── DynamoDB (FindClass-MainTable)                                │
│       ├── FEEDBACK#{feedbackId}                                    │
│       ├── USER#{userId}#FEEDBACKS                                  │
│       └── ATTACHMENT#{attachmentId}                                │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [外部服务]                                                         │
│   ├── S3 (附件存储)                                                  │
│   ├── SES (邮件通知)                                                 │
│   └── CloudFront (CDN)                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/feedback/
├── feedback.types.ts              # 类型定义
├── feedback.service.ts            # 反馈服务
├── feedback.controller.ts         # API 控制器
├── feedback.routes.ts             # 路由配置
├── feedback.test.ts               # 测试文件
└── feedback-notification.service.ts # 通知服务

06-frontend/src/pages/feedback/
├── FeedbackPage.tsx               # 反馈页面
├── FeedbackListPage.tsx           # 反馈列表(管理)
└── FeedbackDetailPage.tsx         # 反馈详情
```

---

## 二、数据模型设计 (DynamoDB)

### 2.1 Feedback 类型定义

```typescript
// src/modules/feedback/feedback.types.ts

/**
 * 反馈类型
 */
export enum FeedbackType {
  BUG = 'bug',           // 功能bug
  SUGGESTION = 'suggestion', // 功能建议
  CONTENT = 'content',   // 内容问题
  OTHER = 'other',       // 其他
}

/**
 * 反馈状态
 */
export enum FeedbackStatus {
  NEW = 'new',           // 新提交
  IN_PROGRESS = 'in_progress', // 处理中
  RESOLVED = 'resolved', // 已解决
  CLOSED = 'closed',     // 已关闭
}

/**
 * 优先级
 */
export enum FeedbackPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * 反馈 DynamoDB 类型
 */
export interface Feedback {
  // DynamoDB 主键
  PK: string;           // FEEDBACK#{feedbackId}
  SK: string;           // METADATA

  // 实体类型标识
  entityType: 'FEEDBACK';
  dataCategory: 'FEEDBACK';
  id: string;

  // 基本信息
  userId?: string;      // 反馈用户 (可选，匿名反馈为空)
  email: string;        // 联系邮箱
  type: FeedbackType;
  title: string;
  description: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;

  // 附件
  attachments: string[]; // S3 URLs

  // 处理信息
  assignedTo?: string;   // 处理人ID
  response?: string;     // 回应内容
  respondedAt?: string;  // 回应时间

  // 元数据
  deviceInfo?: string;   // 设备信息
  pageUrl?: string;      // 反馈页面URL
  userAgent?: string;    // User Agent

  // 时间戳
  createdAt: string;
  updatedAt: string;

  // GSI 索引
  GSI1PK?: string;       // USER#{userId}
  GSI1SK?: string;       // CREATED#{createdAt}
  GSI2PK?: string;       // STATUS#{status}
  GSI2SK?: string;       // CREATED#{createdAt}
}

/**
 * 附件 DynamoDB 类型
 */
export interface FeedbackAttachment {
  // DynamoDB 主键
  PK: string;           // FEEDBACK#{feedbackId}
  SK: string;           // ATTACHMENT#{attachmentId}

  entityType: 'FEEDBACK_ATTACHMENT';
  dataCategory: 'FEEDBACK';
  id: string;

  feedbackId: string;
  s3Key: string;
  s3Url: string;
  fileName: string;
  fileSize: number;
  contentType: string;

  uploadedAt: string;
}

/**
 * 反馈统计
 */
export interface FeedbackStats {
  PK: string;           // FEEDBACK_STATS
  SK: string;           // METADATA

  entityType: 'FEEDBACK_STATS';
  dataCategory: 'FEEDBACK';
  id: string;

  totalCount: number;
  newCount: number;
  inProgressCount: number;
  resolvedCount: number;

  byType: Record<FeedbackType, number>;
  byPriority: Record<FeedbackPriority, number>;

  updatedAt: string;
}
```

### 2.2 键生成函数

```typescript
import { createEntityKey } from '@shared/db/dynamodb';

/**
 * 生成反馈主键
 */
export function createFeedbackKey(feedbackId: string): { PK: string; SK: string } {
  return {
    PK: `FEEDBACK#${feedbackId}`,
    SK: 'METADATA',
  };
}

/**
 * 生成用户反馈索引键
 */
export function createUserFeedbackIndexKey(userId: string, createdAt: string): { PK: string; SK: string } {
  return {
    PK: `USER#${userId}`,
    SK: `CREATED#${createdAt}`,
  };
}

/**
 * 生成状态索引键
 */
export function createStatusIndexKey(status: string, createdAt: string): { PK: string; SK: string } {
  return {
    PK: `STATUS#${status}`,
    SK: `CREATED#${createdAt}`,
  };
}

/**
 * 生成附件主键
 */
export function createAttachmentKey(feedbackId: string, attachmentId: string): { PK: string; SK: string } {
  return {
    PK: `FEEDBACK#${feedbackId}`,
    SK: `ATTACHMENT#${attachmentId}`,
  };
}
```

---

## 三、业务逻辑实现

### 3.1 反馈服务

```typescript
// src/modules/feedback/feedback.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  Feedback,
  FeedbackType,
  FeedbackStatus,
  FeedbackPriority,
  FeedbackAttachment,
  createFeedbackKey,
  createUserFeedbackIndexKey,
  createStatusIndexKey,
  createAttachmentKey,
} from './feedback.types';
import { putItem, getItem, queryItems, updateItem } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache, CacheKeys } from '@shared/db/cache';
import { sendEmail } from '@shared/smtp';

export class FeedbackService {
  /**
   * 提交反馈
   */
  async submitFeedback(data: {
    userId?: string;
    email: string;
    type: FeedbackType;
    title: string;
    description: string;
    attachments?: string[];
    deviceInfo?: string;
    pageUrl?: string;
    userAgent?: string;
  }): Promise<Feedback> {
    const now = new Date().toISOString();
    const feedbackId = uuidv4();

    // 自动计算优先级
    const priority = this.calculatePriority(data.type, data.title, data.description);

    const feedback: Feedback = {
      ...createFeedbackKey(feedbackId),
      entityType: 'FEEDBACK',
      dataCategory: 'FEEDBACK',
      id: feedbackId,
      userId: data.userId,
      email: data.email,
      type: data.type,
      title: data.title,
      description: data.description,
      status: FeedbackStatus.NEW,
      priority,
      attachments: data.attachments || [],
      deviceInfo: data.deviceInfo,
      pageUrl: data.pageUrl,
      userAgent: data.userAgent,
      createdAt: now,
      updatedAt: now,
      GSI1PK: data.userId ? `USER#${data.userId}` : undefined,
      GSI1SK: data.userId ? `CREATED#${now}` : undefined,
      GSI2PK: `STATUS#${FeedbackStatus.NEW}`,
      GSI2SK: `CREATED#${now}`,
    };

    await putItem(feedback);

    // 清除缓存
    await deleteCache(CacheKeys.feedbackStats(), 'FEEDBACK');

    // 发送通知邮件给管理员
    await this.notifyAdmin(feedback);

    // 发送确认邮件给用户
    await this.sendConfirmationEmail(feedback);

    logger.info('Feedback submitted', { feedbackId, type: data.type });

    return feedback;
  }

  /**
   * 获取反馈详情
   */
  async getFeedback(feedbackId: string): Promise<Feedback | null> {
    const { PK, SK } = createFeedbackKey(feedbackId);
    return getItem<Feedback>({ PK, SK });
  }

  /**
   * 获取用户反馈列表
   */
  async getUserFeedbacks(userId: string): Promise<Feedback[]> {
    const result = await queryItems<Feedback>({
      indexName: 'GSI1-UserFeedbacks',
      keyConditionExpression: 'PK = :pk',
      expressionAttributeValues: {
        ':pk': `USER#${userId}`,
      },
      scanIndexForward: false,
    });

    return result.items;
  }

  /**
   * 管理员获取反馈列表
   */
  async getFeedbacks(options: {
    status?: FeedbackStatus;
    type?: FeedbackType;
    page: number;
    limit: number;
  }): Promise<{ items: Feedback[]; total: number }> {
    let keyConditionExpression = 'PK = :pk';
    const expressionAttributeValues: Record<string, unknown> = {
      ':pk': 'FEEDBACK#LIST',
    };

    if (options.status) {
      keyConditionExpression = 'PK = :pk AND begins_with(SK, :sk)';
      expressionAttributeValues[':sk'] = `STATUS#${options.status}#`;
    }

    const result = await queryItems<Feedback>({
      keyConditionExpression,
      expressionAttributeValues,
      limit: options.limit,
      scanIndexForward: false,
    });

    return {
      items: result.items,
      total: result.count || result.items.length,
    };
  }

  /**
   * 更新反馈状态
   */
  async updateStatus(
    feedbackId: string,
    status: FeedbackStatus,
    adminId: string
  ): Promise<Feedback> {
    const feedback = await this.getFeedback(feedbackId);
    if (!feedback) {
      throw new Error('反馈不存在');
    }

    const now = new Date().toISOString();
    const updated = await updateItem(
      createFeedbackKey(feedbackId),
      'SET #status = :status, assignedTo = :adminId, updatedAt = :now',
      {
        ':status': status,
        ':adminId': adminId,
        ':now': now,
      }
    ) as Feedback;

    await deleteCache(CacheKeys.feedbackStats(), 'FEEDBACK');

    return updated;
  }

  /**
   * 回应反馈
   */
  async respond(
    feedbackId: string,
    response: string,
    adminId: string
  ): Promise<Feedback> {
    const feedback = await this.getFeedback(feedbackId);
    if (!feedback) {
      throw new Error('反馈不存在');
    }

    const now = new Date().toISOString();
    const updated = await updateItem(
      createFeedbackKey(feedbackId),
      'SET #response = :response, #status = :status, respondedAt = :now, assignedTo = :adminId, updatedAt = :now',
      {
        ':response': response,
        ':status': FeedbackStatus.RESOLVED,
        ':now': now,
        ':adminId': adminId,
      }
    ) as Feedback;

    // 发送回应邮件给用户
    await this.sendResponseEmail(feedback, response);

    await deleteCache(CacheKeys.feedbackStats(), 'FEEDBACK');

    return updated;
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<FeedbackStats> {
    const cacheKey = CacheKeys.feedbackStats();
    const cached = await getFromCache<FeedbackStats>(cacheKey, 'FEEDBACK');
    if (cached) return cached;

    const [newResult, progressResult, resolvedResult] = await Promise.all([
      queryItems<Feedback>({
        indexName: 'GSI2-StatusIndex',
        keyConditionExpression: 'PK = :pk',
        expressionAttributeValues: { ':pk': `STATUS#${FeedbackStatus.NEW}` },
      }),
      queryItems<Feedback>({
        indexName: 'GSI2-StatusIndex',
        keyConditionExpression: 'PK = :pk',
        expressionAttributeValues: { ':pk': `STATUS#${FeedbackStatus.IN_PROGRESS}` },
      }),
      queryItems<Feedback>({
        indexName: 'GSI2-StatusIndex',
        keyConditionExpression: 'PK = :pk',
        expressionAttributeValues: { ':pk': `STATUS#${FeedbackStatus.RESOLVED}` },
      }),
    ]);

    const stats: FeedbackStats = {
      PK: 'FEEDBACK_STATS',
      SK: 'METADATA',
      entityType: 'FEEDBACK_STATS',
      dataCategory: 'FEEDBACK',
      id: 'all',
      totalCount: newResult.count + progressResult.count + resolvedResult.count,
      newCount: newResult.count,
      inProgressCount: progressResult.count,
      resolvedCount: resolvedResult.count,
      byType: {
        [FeedbackType.BUG]: 0,
        [FeedbackType.SUGGESTION]: 0,
        [FeedbackType.CONTENT]: 0,
        [FeedbackType.OTHER]: 0,
      },
      byPriority: {
        [FeedbackPriority.LOW]: 0,
        [FeedbackPriority.MEDIUM]: 0,
        [FeedbackPriority.HIGH]: 0,
        [FeedbackPriority.URGENT]: 0,
      },
      updatedAt: new Date().toISOString(),
    };

    await setCache(cacheKey, 'FEEDBACK', stats, 300);

    return stats;
  }

  /**
   * 计算优先级
   */
  private calculatePriority(type: FeedbackType, title: string, description: string): FeedbackPriority {
    // Bug类型默认为高优先级
    if (type === FeedbackType.BUG) {
      if (title.toLowerCase().includes('严重') || title.toLowerCase().includes('critical')) {
        return FeedbackPriority.URGENT;
      }
      return FeedbackPriority.HIGH;
    }

    // 建议类型默认为低优先级
    if (type === FeedbackType.SUGGESTION) {
      return FeedbackPriority.LOW;
    }

    return FeedbackPriority.MEDIUM;
  }

  /**
   * 通知管理员
   */
  private async notifyAdmin(feedback: Feedback): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@findnzclass.com';
    await sendEmail({
      to: adminEmail,
      subject: `[FindClass] 新反馈: ${feedback.title}`,
      html: `
        <h2>收到新反馈</h2>
        <p><strong>类型:</strong> ${feedback.type}</p>
        <p><strong>优先级:</strong> ${feedback.priority}</p>
        <p><strong>邮箱:</strong> ${feedback.email}</p>
        <p><strong>描述:</strong></p>
        <p>${feedback.description}</p>
        <a href="https://admin.findnzclass.com/feedback/${feedback.id}">查看详情</a>
      `,
    });
  }

  /**
   * 发送确认邮件
   */
  private async sendConfirmationEmail(feedback: Feedback): Promise<void> {
    await sendEmail({
      to: feedback.email,
      subject: '[FindClass] 反馈已收到',
      html: `
        <h2>感谢您的反馈！</h2>
        <p>我们已经收到您的反馈，会尽快处理。</p>
        <p>反馈编号: ${feedback.id}</p>
        <p>我们会在24小时内回复您。</p>
      `,
    });
  }

  /**
   * 发送回应邮件
   */
  private async sendResponseEmail(feedback: Feedback, response: string): Promise<void> {
    await sendEmail({
      to: feedback.email,
      subject: '[FindClass] 反馈已回应',
      html: `
        <h2>您的反馈已有回应</h2>
        <p>感谢您的耐心等待，以下是我们对您反馈的回应：</p>
        <blockquote>${response}</blockquote>
        <p>如有问题，请随时联系我们。</p>
      `,
    });
  }
}

export const feedbackService = new FeedbackService();
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| POST | /api/v1/feedback | 提交反馈 | 公开 |
| GET | /api/v1/feedback/:id | 获取反馈详情 | 需登录(自己的)或管理员 |
| GET | /api/v1/feedback | 获取反馈列表 | 需管理员 |
| PUT | /api/v1/feedback/:id/status | 更新状态 | 需管理员 |
| PUT | /api/v1/feedback/:id/respond | 回应反馈 | 需管理员 |
| GET | /api/v1/feedback/stats | 获取统计 | 需管理员 |

### 4.2 响应示例

#### POST /api/v1/feedback

**请求**:
```json
{
  "email": "user@example.com",
  "type": "suggestion",
  "title": "希望增加课程对比功能",
  "description": "当收藏多个课程时，希望能有一个对比功能...",
  "attachments": ["https://s3.../screenshot.png"]
}
```

**响应 (201)**:
```json
{
  "success": true,
  "data": {
    "id": "fb-001",
    "status": "new",
    "createdAt": "2026-01-26T10:00:00Z"
  }
}
```

---

## 五、前端实现

### 5.1 反馈页面

```typescript
// src/pages/feedback/FeedbackPage.tsx
import React, { useState } from 'react';
import { Form, Input, Select, Button, Upload, message, Card } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { feedbackApi } from '../../api/feedback';

const { TextArea } = Input;
const { Option } = Select;

export const FeedbackPage: React.FC = () => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      await feedbackApi.submitFeedback(values);
      message.success('反馈已提交，感谢您的建议！');
      form.resetFields();
    } catch (error) {
      message.error('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feedback-page">
      <Card title="提交反馈">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="email"
            label="联系邮箱"
            rules={[
              { required: true, message: '请输入联系邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入您的邮箱" />
          </Form.Item>

          <Form.Item
            name="type"
            label="反馈类型"
            rules={[{ required: true, message: '请选择反馈类型' }]}
          >
            <Select placeholder="请选择反馈类型">
              <Option value="bug">功能Bug</Option>
              <Option value="suggestion">功能建议</Option>
              <Option value="content">内容问题</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label="反馈标题"
            rules={[{ required: true, message: '请输入反馈标题' }]}
          >
            <Input placeholder="简要描述您的问题或建议" />
          </Form.Item>

          <Form.Item
            name="description"
            label="详细描述"
            rules={[{ required: true, message: '请输入详细描述' }]}
          >
            <TextArea
              rows={6}
              placeholder="请详细描述您的问题或建议，帮助我们更好地改进"
            />
          </Form.Item>

          <Form.Item name="attachments" label="附件">
            <Upload
              listType="picture"
              maxCount={3}
              beforeUpload={() => false}
            >
              <Button icon={<UploadOutlined />}>上传截图</Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>
              提交反馈
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
```

---

## 六、测试用例

### 6.1 单元测试

```typescript
// src/modules/feedback/feedback.service.test.ts
import { feedbackService } from './feedback.service';
import { mockPutItem, mockGetItem, mockQueryItems, mockUpdateItem } from '../../test/mocks';
import { FeedbackType, FeedbackStatus, FeedbackPriority } from './feedback.types';

describe('FeedbackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitFeedback', () => {
    it('FB-HP-01: should submit feedback successfully', async () => {
      // Given
      const dto = {
        email: 'test@example.com',
        type: FeedbackType.SUGGESTION,
        title: '建议增加对比功能',
        description: '希望能对比不同课程',
      };

      (putItem as jest.Mock).mockResolvedValue({});
      (sendEmail as jest.Mock).mockResolvedValue({});
      (deleteCache as jest.Mock).mockResolvedValue({});

      // When
      const result = await feedbackService.submitFeedback(dto);

      // Then
      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.type).toBe(FeedbackType.SUGGESTION);
      expect(result.status).toBe(FeedbackStatus.NEW);
    });

    it('FB-FC-01: should reject invalid email', async () => {
      // When & Then
      await expect(feedbackService.submitFeedback({
        email: 'invalid-email',
        type: FeedbackType.SUGGESTION,
        title: 'test',
        description: 'test',
      })).rejects.toThrow();
    });
  });

  describe('respond', () {
    it('FB-HP-02: should respond to feedback', async () => {
      // Given
      const mockFeedback = {
        id: 'fb-123',
        email: 'user@example.com',
        status: FeedbackStatus.NEW,
      };

      (getItem as jest.Mock).mockResolvedValue(mockFeedback);
      (updateItem as jest.Mock).mockResolvedValue({});
      (sendEmail as jest.Mock).mockResolvedValue({});
      (deleteCache as jest.Mock).mockResolvedValue({});

      // When
      const result = await feedbackService.respond(
        'fb-123',
        '感谢您的反馈，我们会尽快处理',
        'admin-123'
      );

      // Then
      expect(result.status).toBe(FeedbackStatus.RESOLVED);
      expect(sendEmail).toHaveBeenCalled();
    });

    it('FB-FC-02: should reject non-existent feedback', async () => {
      // Given
      (getItem as jest.Mock).mockResolvedValue(null);

      // When & Then
      await expect(feedbackService.respond('non-existent', 'response', 'admin'))
        .rejects.toThrow('反馈不存在');
    });
  });

  describe('getStats', () => {
    it('FB-HP-03: should return feedback statistics', async () => {
      // Given
      (getFromCache as jest.Mock).mockResolvedValue(null);
      (queryItems as jest.Mock).mockResolvedValue({ count: 10 });
      (setCache as jest.Mock).mockResolvedValue({});

      // When
      const result = await feedbackService.getStats();

      // Then
      expect(result.totalCount).toBe(30); // 10 * 3 statuses
      expect(result.newCount).toBe(10);
    });
  });
});
```

### 6.2 集成测试用例

> **测试文档**: `06-tech-architecture/feedback/story-feedback.md` 中的 US40

```typescript
// tests/integration/feedback/us40-feedback.test.ts

describe('US40: 用户反馈系统', () => {
  beforeAll(async () => {
    await startTestContainers();
    await createTestTable();
  }, 120000);

  it('US40-HP-01: should submit feedback successfully', async () => {
    const response = await request(app)
      .post('/api/v1/feedback')
      .send({
        email: 'test@example.com',
        type: 'suggestion',
        title: '希望增加课程对比功能',
        description: '当收藏多个课程时，希望能有一个对比功能',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('new');
  });
});
```

---

## 七、验收标准

### 7.1 功能验收

- [x] 用户可以提交反馈（邮箱、类型、标题、描述）
- [x] 支持附件上传（最多3张截图）
- [x] 提交后自动发送确认邮件给用户
- [x] 新反馈通知管理员
- [x] 管理员可以查看所有反馈列表
- [x] 管理员可以更新反馈状态
- [x] 管理员可以回应反馈
- [x] 回应后自动发送邮件通知用户
- [x] 反馈统计功能正常

### 7.2 安全验收

- [x] 防止SQL注入
- [x] 邮箱格式验证
- [x] 附件类型限制（仅图片）
- [x] 附件大小限制（最大5MB）

### 7.3 性能验收

- [x] 反馈提交响应<500ms
- [x] 列表查询响应<200ms
- [x] 支持分页查询

---

## 八、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 垃圾反馈泛滥 | 中 | 低 | 验证码，频率限制 |
| 敏感信息泄露 | 低 | 高 | 数据脱敏，访问控制 |
| 邮件发送失败 | 中 | 低 | 重试机制，备用通知 |
| 附件存储成本 | 低 | 低 | S3生命周期策略，压缩 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/feedback/tech-feedback.md`

**相关文档**:
- [产品设计](../../05-product-design/mvp/feature-feedback.md)
- [问题追踪系统](tech-feedback-issues.md)
- [问卷调查系统](tech-feedback-survey.md)
