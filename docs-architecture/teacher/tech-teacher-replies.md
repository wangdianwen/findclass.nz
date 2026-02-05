---
title: 技术实现 - 教师评价回复功能
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 2
priority: P1
status: pending-implementation
related_feature: ../../05-product-design/teacher/teacher-replies.md
---

# 技术实现: 教师评价回复功能

> **对应产品文档**: [teacher-replies.md](../../05-product-design/teacher/teacher-replies.md) | **优先级**: P1 | **排期**: Phase 2 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      教师评价回复技术架构                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   └── 微信小程序 (Taro)                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── GET /api/v1/reviews/:id/reply                                  │
│   ├── POST /api/v1/reviews/:id/reply                                 │
│   └── GET /api/v1/teachers/:id/replies                               │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── ReviewReplyService (回复服务)                                  │
│   └── ReviewService (评价服务)                                       │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   ├── DynamoDB (FindClass-MainTable)                                 │
│   │   ├── REVIEW#{reviewId}                                         │
│   │   └── REVIEW_REPLY#{replyId}                                    │
│   └── DynamoDB (缓存)                                                   │
│       ├── review:{reviewId}:reply                                   │
│       └── teacher:{teacherId}:replies                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/reviews/
├── reviews.types.ts          # 类型定义
├── reviews.service.ts        # 评价服务
├── reviews.controller.ts     # 评价API控制器
├── reviews.routes.ts         # 评价路由
└── index.ts                  # 模块导出

07-backend/src/modules/review-replies/
├── replies.types.ts          # 回复类型定义
├── replies.service.ts        # 回复服务
├── replies.controller.ts     # 回复API控制器
├── replies.routes.ts         # 回复路由
└── index.ts                  # 模块导出

06-frontend/src/components/review/
├── ReviewCard.tsx            # 评价卡片
├── ReviewDetail.tsx          # 评价详情
├── ReplySection.tsx          # 回复区域
├── ReplyForm.tsx             # 回复表单
└── TeacherRepliesList.tsx    # 教师回复列表
```

---

## 二、数据模型设计 (DynamoDB)

### 2.1 回复类型定义

```typescript
// src/modules/review-replies/replies.types.ts

/**
 * 回复状态
 */
export enum ReplyStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  HIDDEN = 'hidden',
}

/**
 * 回复 DynamoDB 类型
 */
export interface ReviewReply {
  // DynamoDB 主键
  PK: string;           // REVIEW_REPLY#{replyId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'REVIEW_REPLY';
  dataCategory: 'COURSE';
  id: string;
  
  // 关联
  reviewId: string;
  teacherId: string;
  userId: string;       // 教师用户ID
  
  // 回复内容
  content: string;
  
  // 状态
  status: ReplyStatus;
  isPublic: boolean;
  
  // 审核信息
  reviewed: boolean;
  reviewedAt?: string;
  reviewerId?: string;
  reviewNote?: string;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI19PK?: string;  // REVIEW#{reviewId}
  GSI19SK?: string;  // REPLY#{createdAt}
  GSI20PK?: string;  // TEACHER#{teacherId}
  GSI20SK?: string;  // REPLY#{createdAt}
}

/**
 * 回复查询参数
 */
export interface ReplyQueryParams {
  page?: number;
  limit?: number;
  status?: ReplyStatus;
}

/**
 * 创建回复请求 DTO
 */
export interface CreateReplyDto {
  content: string;
}

/**
 * 审核回复请求 DTO
 */
export interface ReviewReplyDto {
  status: ReplyStatus.APPROVED | ReplyStatus.REJECTED | ReplyStatus.HIDDEN;
  reviewNote?: string;
}
```

### 2.2 实体键生成函数

```typescript
// src/modules/review-replies/replies.types.ts (续)

import { createEntityKey } from '@shared/db/dynamodb';

/**
 * 生成回复主键
 */
export function createReplyKey(replyId: string): { PK: string; SK: string } {
  return createEntityKey('REVIEW_REPLY', replyId);
}

/**
 * 生成评价回复索引键
 */
export function createReviewReplyIndexKey(reviewId: string, createdAt: string): { PK: string; SK: string } {
  return {
    PK: `REVIEW#${reviewId}`,
    SK: `REPLY#${createdAt}`,
  };
}

/**
 * 生成教师回复索引键
 */
export function createTeacherReplyIndexKey(teacherId: string, createdAt: string): { PK: string; SK: string } {
  return {
    PK: `TEACHER#${teacherId}`,
    SK: `REPLY#${createdAt}`,
  };
}

/**
 * 检查是否可回复
 */
export function canReplyToReview(reviewCreatedAt: string): boolean {
  const reviewDate = new Date(reviewCreatedAt);
  const now = new Date();
  const daysDiff = (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= 30; // 30天内可回复
}

/**
 * 回复字数限制
 */
export const REPLY_CONTENT_LIMIT = 500;
```

---

## 三、业务逻辑实现

### 3.1 回复服务

```typescript
// src/modules/review-replies/replies.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  ReviewReply,
  ReplyStatus,
  CreateReplyDto,
  ReviewReplyDto,
  ReplyQueryParams,
  createReplyKey,
  createReviewReplyIndexKey,
  createTeacherReplyIndexKey,
  canReplyToReview,
  REPLY_CONTENT_LIMIT,
} from './replies.types';
import { putItem, getItem, queryItems, updateItem, deleteItem } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache, CacheKeys } from '@shared/db/cache';
import { getReviewById } from '../reviews/reviews.service';

/**
 * 回复服务类
 */
export class ReviewReplyService {
  /**
   * 创建回复
   */
  async createReply(
    reviewId: string,
    teacherId: string,
    userId: string,
    dto: CreateReplyDto
  ): Promise<ReviewReply> {
    // 验证评价存在
    const review = await getReviewById(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }

    // 验证是否是评价的教师
    if (review.teacherId !== teacherId) {
      throw new Error('Only the reviewed teacher can reply');
    }

    // 检查是否已有回复
    const existingReply = await this.getReplyByReviewId(reviewId);
    if (existingReply) {
      throw new Error('This review already has a reply');
    }

    // 检查是否在回复时限内（30天）
    if (!canReplyToReview(review.createdAt)) {
      throw new Error('Reply period has expired (30 days from review)');
    }

    // 验证回复内容
    if (!dto.content || dto.content.trim().length === 0) {
      throw new Error('Reply content cannot be empty');
    }

    if (dto.content.length > REPLY_CONTENT_LIMIT) {
      throw new Error(`Reply content cannot exceed ${REPLY_CONTENT_LIMIT} characters`);
    }

    const now = new Date().toISOString();
    const replyId = uuidv4();

    const reply: ReviewReply = {
      ...createReplyKey(replyId),
      entityType: 'REVIEW_REPLY',
      dataCategory: 'COURSE',
      id: replyId,
      reviewId,
      teacherId,
      userId,
      content: dto.content.trim(),
      status: ReplyStatus.APPROVED, // 默认直接通过
      isPublic: true,
      reviewed: true,
      reviewedAt: now,
      reviewerId: 'system', // 系统自动审核
      createdAt: now,
      updatedAt: now,
      GSI19PK: `REVIEW#${reviewId}`,
      GSI19SK: `REPLY#${now}`,
      GSI20PK: `TEACHER#${teacherId}`,
      GSI20SK: `REPLY#${now}`,
    };

    await putItem(reply);

    // 清除缓存
    await deleteCache(`review:${reviewId}:reply`, 'COURSE');
    await deleteCache(`teacher:${teacherId}:replies`, 'COURSE');

    logger.info('Review reply created', { replyId, reviewId, teacherId });

    return reply;
  }

  /**
   * 获取评价的回复
   */
  async getReplyByReviewId(reviewId: string): Promise<ReviewReply | null> {
    const cacheKey = `review:${reviewId}:reply`;
    const cached = await getFromCache<ReviewReply>(cacheKey, 'COURSE');
    if (cached) {
      return cached;
    }

    const result = await queryItems<ReviewReply>({
      indexName: 'GSI19-ReviewReplies',
      keyConditionExpression: 'GSI19PK = :pk',
      expressionAttributeValues: {
        ':pk': `REVIEW#${reviewId}`,
      },
      limit: 1,
    });

    const reply = result.items.find(r => r.isPublic && r.status === ReplyStatus.APPROVED);

    if (reply) {
      await setCache(cacheKey, 'COURSE', reply, 300);
    }

    return reply || null;
  }

  /**
   * 获取教师的回复列表
   */
  async getTeacherReplies(
    teacherId: string,
    params: ReplyQueryParams = {}
  ): Promise<{
    replies: ReviewReply[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page = 1, limit = 20, status = ReplyStatus.APPROVED } = params;

    const cacheKey = `teacher:${teacherId}:replies:${page}:${limit}`;
    const cached = await getFromCache<{
      replies: ReviewReply[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(cacheKey, 'COURSE');
    if (cached) {
      return cached;
    }

    const result = await queryItems<ReviewReply>({
      indexName: 'GSI20-TeacherReplies',
      keyConditionExpression: 'GSI20PK = :pk',
      expressionAttributeValues: {
        ':pk': `TEACHER#${teacherId}`,
      },
      limit: limit * 2,
      scanIndexForward: false,
    });

    // 过滤状态
    let filtered = result.items;
    if (status) {
      filtered = filtered.filter(r => r.status === status);
    }

    // 分页
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    const data = {
      replies: paginatedItems,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };

    await setCache(cacheKey, 'COURSE', data, 300);

    return data;
  }

  /**
   * 审核回复（管理员）
   */
  async reviewReply(
    replyId: string,
    adminId: string,
    dto: ReviewReplyDto
  ): Promise<ReviewReply> {
    const reply = await this.getReplyById(replyId);
    if (!reply) {
      throw new Error('Reply not found');
    }

    const now = new Date().toISOString();

    const updated = await updateItem(
      createReplyKey(replyId),
      `SET status = :status, 
            reviewed = true, 
            reviewedAt = :reviewedAt, 
            reviewerId = :reviewerId,
            reviewNote = :reviewNote,
            isPublic = :isPublic,
            updatedAt = :now`,
      {
        ':status': dto.status,
        ':reviewedAt': now,
        ':reviewerId': adminId,
        ':reviewNote': dto.reviewNote,
        ':isPublic': dto.status === ReplyStatus.APPROVED,
        ':now': now,
      }
    ) as ReviewReply;

    // 清除缓存
    await deleteCache(`review:${reply.reviewId}:reply`, 'COURSE');
    await deleteCache(`teacher:${reply.teacherId}:replies`, 'COURSE');

    logger.info('Reply reviewed', { replyId, adminId, status: dto.status });

    return updated;
  }

  /**
   * 获取回复详情
   */
  async getReplyById(replyId: string): Promise<ReviewReply | null> {
    const { PK, SK } = createReplyKey(replyId);
    return getItem<ReviewReply>({ PK, SK });
  }

  /**
   * 删除回复
   */
  async deleteReply(replyId: string, userId: string): Promise<void> {
    const reply = await this.getReplyById(replyId);
    if (!reply) {
      throw new Error('Reply not found');
    }

    if (reply.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // 软删除 - 更新状态
    await updateItem(
      createReplyKey(replyId),
      'SET status = :deleted, updatedAt = :now',
      {
        ':deleted': 'deleted',
        ':now': new Date().toISOString(),
      }
    );

    // 清除缓存
    await deleteCache(`review:${reply.reviewId}:reply`, 'COURSE');
    await deleteCache(`teacher:${reply.teacherId}:replies`, 'COURSE');

    logger.info('Reply deleted', { replyId });
  }
}

export const reviewReplyService = new ReviewReplyService();
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| **回复操作** |
| GET | /api/v1/reviews/:id/reply | 获取评价的回复 | 查看回复 |
| POST | /api/v1/reviews/:id/reply | 教师回复评价 | 提交回复 |
| PUT | /api/v1/reviews/:id/reply | 修改回复 | 24小时内 |
| DELETE | /api/v1/reviews/:id/reply | 删除回复 | 作者删除 |
| **列表查询** |
| GET | /api/v1/teachers/:id/replies | 获取教师的所有回复 | 教师主页 |
| **管理操作** |
| POST | /api/v1/admin/replies/:id/review | 审核回复 | 管理员 |

### 4.2 API 详细设计

#### 4.2.1 POST /api/v1/reviews/:id/reply

**请求头**: Authorization: Bearer \<teacher-token\>

**请求示例**:
```json
{
  "content": "感谢李女士的认可！孩子的进步是对我最大的鼓励，期待继续陪伴孩子的学习之旅。"
}
```

**响应示例** (201):
```json
{
  "success": true,
  "message": "回复已发布",
  "data": {
    "replyId": "550e8400-e29b-41d4-a716-446655440000",
    "content": "感谢李女士的认可...",
    "createdAt": "2026-01-15T14:30:00Z"
  }
}
```

#### 4.2.2 GET /api/v1/reviews/:id/reply

**响应示例** (200):
```json
{
  "success": true,
  "data": {
    "replyId": "550e8400-e29b-41d4-a716-446655440000",
    "reviewId": "review-001",
    "teacherId": "teacher-001",
    "content": "感谢李女士的认可！孩子的进步是对我最大的鼓励",
    "createdAt": "2026-01-15T14:30:00Z"
  }
}
```

---

## 五、前端实现

### 5.1 回复区域组件

```typescript
// src/components/review/ReplySection.tsx
import React, { useState } from 'react';
import { Button, Input, Avatar, Typography, Empty, message } from 'antd';
import { UserOutlined, SendOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { reviewReplyApi } from '../../api/reviewReply';
import { ReviewReply } from '../../types/review';

const { TextArea } = Input;
const { Text } = Typography;

interface ReplySectionProps {
  reviewId: string;
  review: {
    userName: string;
    rating: number;
    content: string;
    createdAt: string;
  };
  reply?: ReviewReply;
  isTeacher: boolean;
  onReplySubmit?: () => void;
}

export const ReplySection: React.FC<ReplySectionProps> = ({
  reviewId,
  review,
  reply,
  isTeacher,
  onReplySubmit,
}) => {
  const { t } = useTranslation();
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!replyContent.trim()) {
      message.warning(t('reply.contentRequired'));
      return;
    }

    if (replyContent.length > 500) {
      message.warning(t('reply.contentTooLong'));
      return;
    }

    setSubmitting(true);
    try {
      await reviewReplyApi.createReply(reviewId, { content: replyContent });
      message.success(t('reply.submitSuccess'));
      setReplyContent('');
      onReplySubmit?.();
    } catch (error: any) {
      message.error(error.message || t('reply.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reply-section">
      {/* 评价内容 */}
      <div className="review-content">
        <div className="review-header">
          <Avatar icon={<UserOutlined />} />
          <div className="review-meta">
            <Text strong>{review.userName}</Text>
            <div className="rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={star <= review.rating ? 'star filled' : 'star'}>
                  ★
                </span>
              ))}
            </div>
            <Text type="secondary" className="date">
              {new Date(review.createdAt).toLocaleDateString()}
            </Text>
          </div>
        </div>
        <div className="review-body">
          <Text>{review.content}</Text>
        </div>
      </div>

      {/* 回复内容 */}
      {reply ? (
        <div className="reply-content">
          <div className="reply-badge">{t('reply.teacherReply')}</div>
          <div className="reply-body">
            <Text>{reply.content}</Text>
          </div>
          <Text type="secondary" className="reply-date">
            {new Date(reply.createdAt).toLocaleString()}
          </Text>
        </div>
      ) : isTeacher ? (
        /* 回复表单 */
        <div className="reply-form">
          <TextArea
            rows={3}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={t('reply.placeholder')}
            maxLength={500}
            showCount
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={submitting}
            onClick={handleSubmit}
            disabled={!replyContent.trim()}
          >
            {t('reply.submit')}
          </Button>
        </div>
      ) : null}

      <style>{`
        .reply-section {
          border-top: 1px solid #f0f0f0;
          padding-top: 16px;
          margin-top: 16px;
        }
        .review-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .review-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .rating {
          display: flex;
          gap: 2px;
        }
        .star {
          color: #d9d9d9;
          font-size: 14px;
        }
        .star.filled {
          color: #faad14;
        }
        .date {
          font-size: 12px;
        }
        .review-body {
          margin-left: 40px;
          color: #333;
        }
        .reply-content {
          margin-left: 40px;
          margin-top: 16px;
          padding: 16px;
          background: #f9f9f9;
          border-radius: 8px;
          border-left: 3px solid #1890ff;
        }
        .reply-badge {
          font-size: 12px;
          color: #1890ff;
          margin-bottom: 8px;
          font-weight: 500;
        }
        .reply-body {
          margin-bottom: 8px;
        }
        .reply-date {
          font-size: 12px;
        }
        .reply-form {
          margin-left: 40px;
          margin-top: 16px;
        }
        .reply-form .ant-input {
          margin-bottom: 12px;
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
// src/modules/review-replies/replies.service.test.ts
import { reviewReplyService } from './replies.service';
import { mockPutItem, mockGetItem, mockQueryItems, mockUpdateItem } from '../../test/mocks';

describe('ReviewReplyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReply', () => {
    it('should create reply successfully', async () => {
      const reviewId = 'review-123';
      const teacherId = 'teacher-123';
      const userId = 'user-123';

      const mockReview = {
        id: reviewId,
        teacherId,
        createdAt: new Date().toISOString(),
      };

      // Mock review exists
      (getItem as jest.Mock).mockResolvedValueOnce(mockReview);
      // Mock no existing reply
      (queryItems as jest.Mock).mockResolvedValueOnce({ items: [] });
      (putItem as jest.Mock).mockResolvedValue({});

      const result = await reviewReplyService.createReply(reviewId, teacherId, userId, {
        content: '感谢您的认可！',
      });

      expect(result).toBeDefined();
      expect(result.reviewId).toBe(reviewId);
      expect(result.teacherId).toBe(teacherId);
      expect(result.status).toBe('approved');
    });

    it('should reject if not the reviewed teacher', async () => {
      const reviewId = 'review-123';
      const teacherId = 'teacher-456'; // Different teacher

      const mockReview = {
        id: reviewId,
        teacherId: 'teacher-123',
        createdAt: new Date().toISOString(),
      };

      (getItem as jest.Mock).mockResolvedValueOnce(mockReview);

      await expect(
        reviewReplyService.createReply(reviewId, teacherId, 'user-123', {
          content: '感谢您的认可！',
        })
      ).rejects.toThrow('Only the reviewed teacher can reply');
    });

    it('should reject if review already has reply', async () => {
      const reviewId = 'review-123';
      const teacherId = 'teacher-123';

      const mockReview = {
        id: reviewId,
        teacherId,
        createdAt: new Date().toISOString(),
      };

      // Mock existing reply
      (getItem as jest.Mock).mockResolvedValueOnce(mockReview);
      (queryItems as jest.Mock).mockResolvedValueOnce({
        items: [{ id: 'reply-1' }],
      });

      await expect(
        reviewReplyService.createReply(reviewId, teacherId, 'user-123', {
          content: '感谢您的认可！',
        })
      ).rejects.toThrow('This review already has a reply');
    });

    it('should reject if reply period expired', async () => {
      const reviewId = 'review-123';
      const teacherId = 'teacher-123';

      const mockReview = {
        id: reviewId,
        teacherId,
        createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(), // 31 days ago
      };

      (getItem as jest.Mock).mockResolvedValueOnce(mockReview);
      (queryItems as jest.Mock).mockResolvedValueOnce({ items: [] });

      await expect(
        reviewReplyService.createReply(reviewId, teacherId, 'user-123', {
          content: '感谢您的认可！',
        })
      ).rejects.toThrow('Reply period has expired');
    });
  });
});
```

---

## 七、验收标准

- [ ] 教师可回复评价
- [ ] 回复正确展示
- [ ] 回复规则生效（30天限制、一次限制）
- [ ] 回复字数限制正确
- [ ] 审核功能正常（可选）

---

## 八、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 不当回复 | 低 | 中 | 审核机制、关键词过滤 |
| 回复超时 | 低 | 低 | 提醒通知 |
| 重复回复 | 低 | 中 | 唯一性检查 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/phase-2/tech-teacher-replies.md`

**相关文档**:
- [产品设计](../../05-product-design/teacher/teacher-replies.md)
- [用户评价系统](../phase-3/tech-course-reviews.md)
- [教师入驻流程](tech-teacher-onboarding.md)
