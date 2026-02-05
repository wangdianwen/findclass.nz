---
title: 技术实现 - 退款处理
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 2
priority: P0
status: complete
related_feature: ../../05-product-design/transaction/refunds.md
---

# 技术实现: 退款处理

> **对应产品文档**: [refunds.md](../../05-product-design/transaction/refunds.md) | **优先级**: P0 | **排期**: Phase 2 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      退款处理技术架构                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   └── 微信小程序 (Taro)                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── POST /api/v1/refunds                                          │
│   ├── GET /api/v1/refunds/:id                                       │
│   ├── PUT /api/v1/refunds/:id/approve                               │
│   ├── PUT /api/v1/refunds/:id/reject                                │
│   └── POST /api/v1/refunds/:id/process                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── RefundService (退款服务)                                       │
│   ├── RefundPolicyService (退款策略)                                 │
│   └── RefundProcessingService (退款处理)                             │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   └── DynamoDB (FindClass-MainTable)                                │
│       ├── REFUND#{refundId}                                        │
│       ├── USER#{userId}#REFUNDS                                     │
│       └── TRANSACTION#{transactionId}#REFUND                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/refunds/
├── refunds.types.ts           # 类型定义
├── refunds.service.ts         # 退款服务
├── refunds.controller.ts      # API 控制器
├── refunds.routes.ts          # 路由配置
└── refunds.test.ts            # 测试文件

06-frontend/src/pages/refunds/
├── RefundRequestPage.tsx      # 退款申请页
├── RefundListPage.tsx         # 退款列表页
└── RefundDetailPage.tsx       # 退款详情页
```

---

## 二、数据模型 (DynamoDB)

```typescript
// src/modules/refunds/refunds.types.ts

/**
 * 退款状态
 */
export enum RefundStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * 退款原因
 */
export enum RefundReason {
  TEACHER_CANCELLED = 'teacher_cancelled',
  SCHEDULE_CONFLICT = 'schedule_conflict',
  QUALITY_ISSUE = 'quality_issue',
  PERSONAL_REASON = 'personal_reason',
  OTHER = 'other',
}

/**
 * 退款 DynamoDB 类型
 */
export interface Refund {
  PK: string;           // REFUND#{refundId}
  SK: string;           // METADATA
  entityType: 'REFUND';
  dataCategory: 'TRANSACTION';
  id: string;
  
  // 关联
  bookingId: string;
  userId: string;
  teacherId: string;
  courseId: string;
  
  // 退款信息
  amount: number;
  currency: string;
  reason: RefundReason;
  reasonDetail?: string;
  
  // 状态
  status: RefundStatus;
  
  // 处理信息
  processedBy?: string;
  processedAt?: string;
  processedNote?: string;
  
  // 退款方式
  refundMethod: 'original_payment' | 'platform_credit';
  refundAccount?: string;
  
  // 时间线
  requestedAt: string;
  completedAt?: string;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  GSI25PK?: string;  // USER#{userId}
  GSI25SK?: string;  // STATUS#{status}
  GSI26PK?: string;  // BOOKING#{bookingId}
  GSI26SK?: string;  // REFUND#{createdAt}
}

/**
 * 退款策略
 */
export interface RefundPolicy {
  PK: string;           // POLICY#{policyId}
  SK: string;           // METADATA
  entityType: 'REFUND_POLICY';
  dataCategory: 'TRANSACTION';
  id: string;
  
  name: string;
  description: string;
  
  // 规则
  rules: Array<{
    hoursBeforeClass: number;
    refundPercentage: number;
  }>;
  
  isActive: boolean;
  priority: number;
  
  createdAt: string;
  updatedAt: string;
}
```

---

## 三、业务逻辑

```typescript
// src/modules/refunds/refunds.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  Refund,
  RefundStatus,
  RefundReason,
  RefundPolicy,
  createRefundKey,
  createUserRefundIndexKey,
  createBookingRefundIndexKey,
} from './refunds.types';
import { putItem, getItem, queryItems, updateItem } from '@shared/db/dynamodb';
import { getFromCache, setCache } from '@shared/db/cache';

export class RefundService {
  /**
   * 创建退款申请
   */
  async createRefund(bookingId: string, userId: string, data: {
    reason: RefundReason;
    reasonDetail?: string;
  }): Promise<Refund> {
    // 检查是否有进行中的退款
    const existing = await this.getPendingRefundByBooking(bookingId);
    if (existing) {
      throw new Error('Already has a pending refund request');
    }

    // 获取退款策略
    const policy = await this.getApplicablePolicy(bookingId);
    const refundAmount = this.calculateRefundAmount(bookingId, policy);

    const now = new Date().toISOString();
    const refundId = uuidv4();

    const refund: Refund = {
      ...createRefundKey(refundId),
      entityType: 'REFUND',
      dataCategory: 'TRANSACTION',
      id: refundId,
      bookingId,
      userId,
      reason: data.reason,
      reasonDetail: data.reasonDetail,
      amount: refundAmount,
      currency: 'NZD',
      status: RefundStatus.PENDING,
      refundMethod: 'original_payment',
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
      GSI25PK: `USER#${userId}`,
      GSI25SK: `STATUS#${RefundStatus.PENDING}`,
      GSI26PK: `BOOKING#${bookingId}`,
      GSI26SK: `REFUND#${now}`,
    };

    await putItem(refund);

    // 通知管理员
    await notificationService.sendAdminNotification('refund_request', { refundId, bookingId });

    logger.info('Refund created', { refundId, bookingId, userId });

    return refund;
  }

  /**
   * 处理退款
   */
  async processRefund(refundId: string, adminId: string, action: 'approve' | 'reject', note?: string): Promise<Refund> {
    const refund = await getItem<Refund>(createRefundKey(refundId));
    if (!refund) {
      throw new Error('Refund not found');
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new Error('Refund is not pending');
    }

    const now = new Date().toISOString();
    const status = action === 'approve' ? RefundStatus.APPROVED : RefundStatus.REJECTED;

    const updated = await updateItem(
      createRefundKey(refundId),
      `SET status = :status, processedBy = :adminId, processedAt = :now, processedNote = :note, updatedAt = :now`,
      {
        ':status': status,
        ':adminId': adminId,
        ':now': now,
        ':note': note,
      }
    ) as Refund;

    // 如果批准，执行退款
    if (action === 'approve') {
      await this.executeRefund(refund);
    }

    // 通知用户
    await notificationService.sendUserNotification(
      refund.userId,
      action === 'approve' ? 'refund_approved' : 'refund_rejected',
      { refundId, note }
    );

    logger.info('Refund processed', { refundId, action, adminId });

    return updated;
  }

  /**
   * 执行退款
   */
  private async executeRefund(refund: Refund): Promise<void> {
    // 调用支付网关退款
    await paymentGateway.refund({
      transactionId: refund.bookingId,
      amount: refund.amount,
      method: refund.refundMethod,
    });

    await updateItem(
      createRefundKey(refund.id),
      'SET status = :status, completedAt = :now, updatedAt = :now',
      {
        ':status': RefundStatus.COMPLETED,
        ':now': new Date().toISOString(),
      }
    );

    logger.info('Refund executed', { refundId: refund.id, amount: refund.amount });
  }

  /**
   * 计算退款金额
   */
  private calculateRefundAmount(bookingId: string, policy: RefundPolicy): number {
    const booking = await bookingService.getBookingById(bookingId);
    if (!booking) return 0;

    const hoursBeforeClass = (new Date(booking.startTime).getTime() - Date.now()) / (1000 * 60 * 60);
    const rule = policy.rules.find(r => hoursBeforeClass >= r.hoursBeforeClass);
    return rule ? booking.price * (rule.refundPercentage / 100) : 0;
  }

  private async getPendingRefundByBooking(bookingId: string): Promise<Refund | null> {
    const result = await queryItems<Refund>({
      indexName: 'GSI26-BookingRefunds',
      keyConditionExpression: 'GSI26PK = :pk',
      expressionAttributeValues: {
        ':pk': `BOOKING#${bookingId}`,
      },
    });
    return result.items.find(r => r.status === RefundStatus.PENDING) || null;
  }

  private async getApplicablePolicy(bookingId: string): Promise<RefundPolicy> {
    // 默认策略
    return {
      PK: 'POLICY#default',
      SK: 'METADATA',
      entityType: 'REFUND_POLICY',
      dataCategory: 'TRANSACTION',
      id: 'default',
      name: 'Standard Policy',
      description: 'Standard refund policy',
      rules: [
        { hoursBeforeClass: 24, refundPercentage: 100 },
        { hoursBeforeClass: 12, refundPercentage: 50 },
        { hoursBeforeClass: 0, refundPercentage: 0 },
      ],
      isActive: true,
      priority: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export const refundService = new RefundService();
```

---

## 四、API 设计

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| POST | /api/v1/refunds | 申请退款 | 需登录 |
| GET | /api/v1/refunds/my | 我的退款 | 需登录 |
| GET | /api/v1/refunds/:id | 退款详情 | 需登录 |
| GET | /api/v1/admin/refunds | 退款列表 | 管理员 |
| POST | /api/v1/admin/refunds/:id/process | 处理退款 | 管理员 |

---

## 五、测试用例

### 5.1 单元测试

```typescript
// src/modules/refunds/refunds.service.test.ts
import { refundService } from './refunds.service';
import { mockPutItem, mockGetItem, mockUpdateItem } from '../../test/mocks';
import { RefundStatus } from './refunds.types';

describe('RefundService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRefundRequest', () => {
    it('RF-HP-01: should create refund request', async () => {
      // Given
      const userId = 'user-123';
      const dto = {
        transactionId: 'txn-123',
        reason: '课程取消',
        amount: 100,
      };

      (getItem as jest.Mock).mockResolvedValue({
        id: 'txn-123',
        amount: 100,
        status: 'paid',
      });
      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await refundService.createRefundRequest(userId, dto);

      // Then
      expect(result).toBeDefined();
      expect(result.status).toBe(RefundStatus.PENDING);
    });

    it('RF-FC-01: should reject if transaction not found', async () => {
      // Given
      (getItem as jest.Mock).mockResolvedValue(null);

      // When & Then
      await expect(refundService.createRefundRequest('user-123', {
        transactionId: 'invalid',
        reason: 'test',
        amount: 100,
      })).rejects.toThrow('交易不存在');
    });
  });

  describe('calculateRefundAmount', () => {
    it('RF-HP-02: should calculate correct refund amount', async () => {
      // Given
      const transactionDate = new Date('2026-01-20');
      const requestDate = new Date('2026-01-26');

      // When
      const result = await refundService.calculateRefundAmount(
        transactionDate,
        requestDate,
        100
      );

      // Then
      expect(result.percentage).toBe(0.8); // 80% within 7 days
      expect(result.amount).toBe(80);
    });
  });

  describe('approveRefund', () => {
    it('RF-HP-03: should approve and process refund', async () => {
      // Given
      const refundId = 'refund-123';
      const mockRefund = {
        id: refundId,
        status: RefundStatus.PENDING,
        amount: 80,
      };

      (getItem as jest.Mock).mockResolvedValue(mockRefund);
      (updateItem as jest.Mock).mockResolvedValue({});
      (putItem as jest.Mock).mockResolvedValue({});

      // When
      await refundService.approveRefund(refundId, 'admin-123');

      // Then
      expect(updateItem).toHaveBeenCalled();
    });
  });
});
```

### 5.2 集成测试用例

> **测试文档**: `06-tech-architecture/transaction/story-refunds.md` 中的 US31

```typescript
// tests/integration/refunds/us31-refunds.test.ts

describe('US31: 退款处理', () => {
  beforeAll(async () => {
    await startTestContainers();
    await createTestTable();
  }, 120000);

  it('US31-HP-01: should complete refund flow', async () => {
    // 1. 创建退款申请
    const response = await request(app)
      .post('/api/v1/refunds')
      .send({
        transactionId: 'txn-123',
        reason: '课程取消',
      })
      .expect(201);

    expect(response.body.data.status).toBe('pending');
  });
});
```

---

## 六、风险分析

- [ ] 退款申请创建正确
- [ ] 退款金额计算正确
- [ ] 管理员处理功能正常
- [ ] 退款执行正确
- [ ] 通知发送正确

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/phase-2/tech-refunds.md`

**相关文档**:
- [产品设计](../../05-product-design/transaction/refunds.md)
- [支付系统](../phase-3/tech-payments.md)
- [预订系统](../phase-3/tech-booking.md)
