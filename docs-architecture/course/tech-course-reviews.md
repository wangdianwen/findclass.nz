---
title: 技术实现 - 用户评价系统
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 3
priority: P0
status: complete
related_feature: ../../05-product-design/course/course-reviews.md
---

# 技术实现: 用户评价系统

> **对应产品文档**: [course-reviews.md](../../05-product-design/course/course-reviews.md) | **优先级**: P0 | **排期**: Phase 3 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      用户评价系统技术架构                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   └── 微信小程序 (Taro)                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── GET /api/v1/reviews                                            │
│   ├── POST /api/v1/reviews                                           │
│   ├── PUT /api/v1/reviews/:id                                        │
│   ├── GET /api/v1/reviews/:id/replies                                │
│   └── POST /api/v1/reviews/:id/replies                               │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── ReviewService (评价服务)                                       │
│   ├── ReviewReplyService (回复服务)                                  │
│   └── ReviewModerationService (审核服务)                             │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   └── DynamoDB (FindClass-MainTable)                                 │
│       ├── REVIEW#{reviewId}                                         │
│       ├── REVIEW#{reviewId}#REPLIES                                 │
│       ├── COURSE#{courseId}#REVIEWS                                 │
│       └── USER#{userId}#REVIEWS                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/reviews/
├── reviews.types.ts          # 类型定义
├── reviews.service.ts        # 评价服务
├── reviews.controller.ts     # API 控制器
├── reviews.routes.ts         # 路由配置
└── reviews.test.ts           # 测试文件

06-frontend/src/components/reviews/
├── ReviewList.tsx            # 评价列表
├── ReviewItem.tsx            # 评价项
├── ReviewForm.tsx            # 评价表单
├── ReviewCard.tsx            # 评价卡片
└── ReviewStats.tsx           # 评价统计
```

---

## 二、数据模型 (DynamoDB)

```typescript
// src/modules/reviews/reviews.types.ts

/**
 * 评价状态
 */
export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  HIDDEN = 'hidden',
}

/**
 * 评价 DynamoDB 类型
 */
export interface Review {
  PK: string;           // REVIEW#{reviewId}
  SK: string;           // METADATA
  entityType: 'REVIEW';
  dataCategory: 'COURSE';
  id: string;
  
  // 关联
  userId: string;
  userName: string;
  userAvatar?: string;
  teacherId: string;
  courseId?: string;
  bookingId: string;
  
  // 评分
  overallRating: number;
  teachingRating?: number;
  courseRating?: number;
  communicationRating?: number;
  punctualityRating?: number;
  
  // 内容
  title?: string;
  content: string;
  tags?: string[];
  
  // 状态
  status: ReviewStatus;
  isPublic: boolean;
  
  // 审核
  reviewed: boolean;
  reviewedAt?: string;
  reviewerId?: string;
  reviewNote?: string;
  
  // 用户修改
  isEdited: boolean;
  editedAt?: string;
  
  // 统计
  helpfulCount: number;
  reportCount: number;
  
  // 回复
  reply?: {
    content: string;
    createdAt: string;
  };
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  GSI7PK?: string;  // TEACHER#{teacherId}
  GSI7SK?: string;  // STATUS#{status}
  GSI30PK?: string;  // USER#{userId}
  GSI30SK?: string;  // CREATED_AT#{createdAt}
}

/**
 * 评价统计
 */
export interface ReviewStatistics {
  PK: string;           // REVIEW_STATS#{teacherId}
  SK: string;           // METADATA
  entityType: 'REVIEW_STATS';
  dataCategory: 'COURSE';
  id: string;
  
  teacherId: string;
  
  totalReviews: number;
  averageRating: number;
  
  // 各维度平均
  teachingAvg: number;
  courseAvg: number;
  communicationAvg: number;
  punctualityAvg: number;
  
  // 评分分布
  rating5Count: number;
  rating4Count: number;
  rating3Count: number;
  rating2Count: number;
  rating1Count: number;
  
  updatedAt: string;
}

/**
 * 评价有帮助标记
 */
export interface ReviewHelpful {
  PK: string;           // REVIEW#{reviewId}
  SK: string;           // HELPFUL#{userId}
  entityType: 'REVIEW_HELPFUL';
  dataCategory: 'COURSE';
  id: string;
  
  reviewId: string;
  userId: string;
  
  createdAt: string;
}

/**
 * 评价举报
 */
export interface ReviewReport {
  PK: string;           // REVIEW_REPORT#{reportId}
  SK: string;           // METADATA
  entityType: 'REVIEW_REPORT';
  dataCategory: 'COURSE';
  id: string;
  
  reviewId: string;
  reporterId: string;
  
  reason: 'spam' | 'inappropriate' | 'fake' | 'other';
  detail?: string;
  
  status: 'pending' | 'reviewed' | 'dismissed';
  handledBy?: string;
  handledAt?: string;
  
  createdAt: string;
}
```

---

## 三、业务逻辑

```typescript
// src/modules/reviews/reviews.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  Review,
  ReviewHelpful,
  ReviewReport,
  ReviewStatistics,
  ReviewStatus,
  createReviewKey,
  createTeacherReviewIndexKey,
  createUserReviewIndexKey,
  createReviewHelpfulKey,
} from './reviews.types';
import { putItem, getItem, queryItems, updateItem, batchGetItems } from '@shared/db/dynamodb';
import { getFromCache, setCache } from '@shared/db/cache';

export class ReviewService {
  /**
   * 创建评价
   */
  async createReview(userId: string, userName: string, data: {
    teacherId: string;
    courseId?: string;
    bookingId: string;
    overallRating: number;
    teachingRating?: number;
    courseRating?: number;
    communicationRating?: number;
    punctualityRating?: number;
    title?: string;
    content: string;
    tags?: string[];
  }): Promise<Review> {
    // 检查是否已评价
    const existing = await this.getReviewByBooking(data.bookingId);
    if (existing) {
      throw new Error('Booking already has a review');
    }

    const now = new Date().toISOString();
    const reviewId = uuidv4();

    const review: Review = {
      ...createReviewKey(reviewId),
      entityType: 'REVIEW',
      dataCategory: 'COURSE',
      id: reviewId,
      userId,
      userName,
      teacherId: data.teacherId,
      courseId: data.courseId,
      bookingId: data.bookingId,
      overallRating: data.overallRating,
      teachingRating: data.teachingRating,
      courseRating: data.courseRating,
      communicationRating: data.communicationRating,
      punctualityRating: data.punctualityRating,
      title: data.title,
      content: data.content,
      tags: data.tags,
      status: ReviewStatus.APPROVED, // 直接通过
      isPublic: true,
      reviewed: true,
      helpfulCount: 0,
      reportCount: 0,
      createdAt: now,
      updatedAt: now,
      GSI7PK: `TEACHER#${data.teacherId}`,
      GSI7SK: `STATUS#${ReviewStatus.APPROVED}`,
      GSI30PK: `USER#${userId}`,
      GSI30SK: `CREATED_AT#${now}`,
    };

    await putItem(review);

    // 更新教师统计
    await this.updateTeacherStatistics(data.teacherId);

    logger.info('Review created', { reviewId, teacherId: data.teacherId, userId });

    return review;
  }

  /**
   * 获取教师评价列表
   */
  async getTeacherReviews(teacherId: string, params: {
    page?: number;
    limit?: number;
    rating?: number;
    sortBy?: 'recent' | 'rating' | 'helpful';
  }): Promise<{ reviews: Review[]; statistics: ReviewStatistics; pagination: any }> {
    const { page = 1, limit = 10, rating, sortBy = 'recent' } = params;

    const cacheKey = `teacher:${teacherId}:reviews:${page}:${limit}:${rating}:${sortBy}`;
    const cached = await getFromCache<any>(cacheKey, 'COURSE');
    if (cached) return cached;

    // 获取统计
    const stats = await this.getTeacherStatistics(teacherId);

    // 获取评价
    const result = await queryItems<Review>({
      indexName: 'GSI7-TeacherReviews',
      keyConditionExpression: 'GSI7PK = :pk',
      expressionAttributeValues: {
        ':pk': `TEACHER#${teacherId}`,
      },
      filterExpression: 'status = :status AND isPublic = :public',
      expressionAttributeValues: {
        ':status': ReviewStatus.APPROVED,
        ':public': true,
      },
      limit: limit * 2,
      scanIndexForward: sortBy === 'recent',
    });

    // 过滤
    let filtered = result.items;
    if (rating) {
      filtered = filtered.filter(r => r.overallRating === rating);
    }

    // 排序
    if (sortBy === 'rating') {
      filtered.sort((a, b) => b.overallRating - a.overallRating);
    } else if (sortBy === 'helpful') {
      filtered.sort((a, b) => b.helpfulCount - a.helpfulCount);
    }

    // 分页
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    const data = {
      reviews: paginatedItems,
      statistics: stats,
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
   * 标记有帮助
   */
  async markHelpful(reviewId: string, userId: string): Promise<void> {
    // 检查是否已标记
    const helpful = await getItem<ReviewHelpful>(createReviewHelpfulKey(reviewId, userId));
    if (helpful) {
      throw new Error('Already marked as helpful');
    }

    const now = new Date().toISOString();

    const helpfulRecord: ReviewHelpful = {
      ...createReviewHelpfulKey(reviewId, userId),
      SK: `HELPFUL#${userId}`,
      entityType: 'REVIEW_HELPFUL',
      dataCategory: 'COURSE',
      id: uuidv4(),
      reviewId,
      userId,
      createdAt: now,
    };

    await putItem(helpfulRecord);

    // 更新计数
    await updateItem(
      createReviewKey(reviewId),
      'SET helpfulCount = helpfulCount + :inc, updatedAt = :now',
      { ':inc': 1, ':now': now }
    );

    logger.info('Review marked helpful', { reviewId, userId });
  }

  /**
   * 举报评价
   */
  async reportReview(reviewId: string, reporterId: string, data: {
    reason: 'spam' | 'inappropriate' | 'fake' | 'other';
    detail?: string;
  }): Promise<ReviewReport> {
    const now = new Date().toISOString();

    const report: ReviewReport = {
      ...createReviewKey(uuidv4()),
      SK: 'REPORT',
      entityType: 'REVIEW_REPORT',
      dataCategory: 'COURSE',
      id: uuidv4(),
      reviewId,
      reporterId,
      reason: data.reason,
      detail: data.detail,
      status: 'pending',
      createdAt: now,
    };

    await putItem(report);

    // 更新举报计数
    await updateItem(
      createReviewKey(reviewId),
      'SET reportCount = reportCount + :inc',
      { ':inc': 1 }
    );

    // 通知管理员
    await notificationService.sendAdminNotification('review_reported', { reviewId });

    logger.info('Review reported', { reviewId, reporterId });

    return report;
  }

  /**
   * 更新教师统计
   */
  private async updateTeacherStatistics(teacherId: string): Promise<void> {
    const result = await queryItems<Review>({
      indexName: 'GSI7-TeacherReviews',
      keyConditionExpression: 'GSI7PK = :pk',
      expressionAttributeValues: {
        ':pk': `TEACHER#${teacherId}`,
      },
      filterExpression: 'status = :status',
      expressionAttributeValues: {
        ':status': ReviewStatus.APPROVED,
      },
      limit: 1000,
    });

    const reviews = result.items;

    // 计算统计
    const totalReviews = reviews.length;
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length
      : 0;

    const teachingAvg = reviews.filter(r => r.teachingRating).length > 0
      ? reviews.filter(r => r.teachingRating).reduce((sum, r) => sum + (r.teachingRating || 0), 0) / 
        reviews.filter(r => r.teachingRating).length
      : 0;

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const rating = Math.round(r.overallRating);
      if (rating >= 1 && rating <= 5) {
        distribution[rating as keyof typeof distribution]++;
      }
    });

    const stats: ReviewStatistics = {
      PK: `REVIEW_STATS#${teacherId}`,
      SK: 'METADATA',
      entityType: 'REVIEW_STATS',
      dataCategory: 'COURSE',
      id: teacherId,
      teacherId,
      totalReviews,
      averageRating: Math.round(avgRating * 10) / 10,
      teachingAvg: Math.round(teachingAvg * 10) / 10,
      courseAvg: 0,
      communicationAvg: 0,
      punctualityAvg: 0,
      rating5Count: distribution[5],
      rating4Count: distribution[4],
      rating3Count: distribution[3],
      rating2Count: distribution[2],
      rating1Count: distribution[1],
      updatedAt: new Date().toISOString(),
    };

    await putItem(stats);
  }

  private async getTeacherStatistics(teacherId: string): Promise<ReviewStatistics> {
    const result = await getItem<ReviewStatistics>({
      PK: `REVIEW_STATS#${teacherId}`,
      SK: 'METADATA',
    });

    return result || {
      PK: `REVIEW_STATS#${teacherId}`,
      SK: 'METADATA',
      entityType: 'REVIEW_STATS',
      dataCategory: 'COURSE',
      id: teacherId,
      teacherId,
      totalReviews: 0,
      averageRating: 0,
      teachingAvg: 0,
      courseAvg: 0,
      communicationAvg: 0,
      punctualityAvg: 0,
      rating5Count: 0,
      rating4Count: 0,
      rating3Count: 0,
      rating2Count: 0,
      rating1Count: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  private async getReviewByBooking(bookingId: string): Promise<Review | null> {
    const result = await queryItems<Review>({
      filterExpression: 'bookingId = :bookingId',
      expressionAttributeValues: {
        ':bookingId': bookingId,
      },
      limit: 1,
    });
    return result.items[0] || null;
  }
}

export const reviewService = new ReviewService();
```

---

## 四、API 设计

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| POST | /api/v1/reviews | 创建评价 | 需登录 |
| GET | /api/v1/teachers/:id/reviews | 教师评价列表 | 公开 |
| GET | /api/v1/reviews/:id | 评价详情 | 公开 |
| POST | /api/v1/reviews/:id/helpful | 标记有帮助 | 需登录 |
| POST | /api/v1/reviews/:id/report | 举报评价 | 需登录 |
| GET | /api/v1/reviews/statistics/:teacherId | 评价统计 | 公开 |

---

## 五、验收标准

- [ ] 评价创建成功
- [ ] 评分计算正确
- [ ] 评价展示正常
- [ ] 标记有用功能正常
- [ ] 举报功能正常
- [ ] 统计准确

---

## 六、测试用例

### 5.1 单元测试

```typescript
// src/modules/reviews/reviews.service.test.ts
import { reviewService } from './reviews.service';
import { mockPutItem, mockGetItem, mockQueryItems, mockUpdateItem } from '../../test/mocks';
import { ReviewStatus } from './reviews.types';

describe('ReviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReview', () => {
    it('REV-HP-01: should create review successfully', async () => {
      // Given
      const userId = 'user-123';
      const dto = {
        teacherId: 'teacher-123',
        bookingId: 'booking-123',
        rating: 5,
        teachingRating: 5,
        courseRating: 4,
        communicationRating: 5,
        punctualityRating: 5,
        content: '很好的老师！',
      };

      (queryItems as jest.Mock).mockResolvedValue({ items: [] }); // No existing review
      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await reviewService.createReview(userId, dto);

      // Then
      expect(result).toBeDefined();
      expect(result.rating).toBe(5);
      expect(result.content).toBe('很好的老师！');
      expect(result.status).toBe(ReviewStatus.PENDING);
    });

    it('REV-FC-01: should reject duplicate review for same booking', async () => {
      // Given
      const userId = 'user-123';
      const existingReview = {
        id: 'review-123',
        bookingId: 'booking-123',
        status: ReviewStatus.APPROVED,
      };

      (queryItems as jest.Mock).mockResolvedValue({ items: [existingReview] });

      // When & Then
      await expect(reviewService.createReview(userId, {
        teacherId: 'teacher-123',
        bookingId: 'booking-123',
        rating: 5,
        content: 'test',
      })).rejects.toThrow('该订单已评价');
    });
  });

  describe('getTeacherReviews', () => {
    it('REV-HP-02: should return paginated reviews', async () => {
      // Given
      const teacherId = 'teacher-123';
      const mockReviews = [
        { id: 'review-1', rating: 5, content: 'Great!' },
        { id: 'review-2', rating: 4, content: 'Good!' },
      ];

      (queryItems as jest.Mock).mockResolvedValue({ items: mockReviews });

      // When
      const result = await reviewService.getTeacherReviews(teacherId, 1, 10);

      // Then
      expect(result.reviews).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('markHelpful', () => {
    it('REV-HP-03: should increment helpful count', async () => {
      // Given
      const reviewId = 'review-123';
      const userId = 'user-123';
      const mockReview = {
        id: reviewId,
        helpfulCount: 0,
      };

      (getItem as jest.Mock).mockResolvedValue(mockReview);
      (queryItems as jest.Mock).mockResolvedValue({ items: [] }); // No existing vote
      (putItem as jest.Mock).mockResolvedValue({});
      (updateItem as jest.Mock).mockResolvedValue({});

      // When
      await reviewService.markHelpful(reviewId, userId);

      // Then
      expect(updateItem).toHaveBeenCalled();
    });
  });
});
```

### 5.2 集成测试用例

> **测试文档**: `06-tech-architecture/course/story-course.md` 中的 US26

```typescript
// tests/integration/reviews/us26-course-reviews.test.ts

describe('US26: 课程/教师评价', () => {
  beforeAll(async () => {
    await startTestContainers();
    await createTestTable();
  }, 120000);

  it('US26-HP-01: should create review successfully', async () => {
    // 1. 完成预订
    const bookingId = await completeBooking({
      userId: 'user-123',
      teacherId: 'teacher-123',
    });

    // 2. 创建评价
    const response = await request(app)
      .post('/api/v1/reviews')
      .send({
        bookingId,
        teacherId: 'teacher-123',
        rating: 5,
        teachingRating: 5,
        courseRating: 4,
        communicationRating: 5,
        punctualityRating: 5,
        content: '很好的老师！',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.rating).toBe(5);
  });
});
```

---

## 七、风险分析

- [ ] 评价创建成功
- [ ] 评分计算正确
- [ ] 评价展示正常
- [ ] 标记有用功能正常
- [ ] 举报功能正常
- [ ] 统计准确

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/phase-3/tech-course-reviews.md`

**相关文档**:
- [产品设计](../../05-product-design/course/course-reviews.md)
- [教师回复功能](../phase-2/tech-teacher-replies.md)
- [预订系统](tech-booking.md)
