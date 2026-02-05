---
title: 技术实现 - 支付集成
category: tech-architecture
created: 2026-01-21
author: linus-torvalds
version: 1.0
phase: 3
priority: P0
status: complete
related_feature: ../../05-product-design/transaction/payments.md
---

# 技术实现: 支付集成

> **对应产品文档**: [feature-payments.md](../../05-product-design/phase-3/feature-payments.md) | **优先级**: P0 | **排期**: Phase 3 | **状态**: 待实现

---

## 一、技术架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         支付架构                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [用户端]                                                          │
│   ├── 选择支付方式                                                  │
│   ├── 跳转支付                                                      │
│   └── 支付结果                                                      │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway + Lambda]                                           │
│         │                                                           │
│         ▼                                                           │
│   [DynamoDB: payments]                                             │
│   [SQS: payment-queue]                                             │
│         │                                                           │
│         ▼                                                           │
│   [支付网关]                                                        │
│   ├── POLi Pay                                                     │
│   └── Bank Transfer                                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、数据模型 (DynamoDB)

### 2.1 Payments 表

```typescript
interface Payment {
  PK: string;                  // PAYMENT#{paymentId}
  SK: string;                  // METADATA
  entityType: 'PAYMENT';
  dataCategory: 'TRANSACTION';
  id: string;
  bookingId?: string;
  packageId?: string;
  institutionId?: string;
  subscriptionId?: string;

  // 金额
  amount: number;
  currency: string;            // NZD
  commissionRate: number;      // 0.1 = 10%
  commissionAmount: number;
  netAmount: number;

  // 支付信息
  paymentMethod: 'poli' | 'bank_transfer' | 'credit_card';
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;

  // 支付网关响应
  gatewayToken?: string;
  gatewayResponse?: Record<string, any>;

  // 回调信息
  webhookReceivedAt?: string;
  webhookVerified: boolean;

  // 退款
  refundStatus?: 'none' | 'requested' | 'processing' | 'completed' | 'rejected';
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: string;

  // 时间戳
  createdAt: string;
  updatedAt: string;
  completedAt?: string;

  // GSI 索引
  GSI1PK?: string;             // BOOKING#{bookingId}
  GSI1SK?: string;             // PAYMENT#{createdAt}
  GSI2PK?: string;             // STATUS#{paymentStatus}
  GSI2SK?: string;             // CREATED_AT#{createdAt}
  GSI3PK?: string;             // USER#{userId}
  GSI3SK?: string;             // PAYMENT#{createdAt}
}
```

### 2.2 Refunds 表

```typescript
interface Refund {
  PK: string;                  // REFUND#{refundId}
  SK: string;                  // METADATA
  entityType: 'REFUND';
  dataCategory: 'TRANSACTION';
  id: string;
  paymentId: string;
  userId: string;

  // 退款金额
  amount: number;
  currency: string;            // NZD
  reason: string;

  // 状态
  status: 'requested' | 'processing' | 'completed' | 'rejected';
  processedBy?: string;
  processedAt?: string;
  rejectionReason?: string;

  // 审核信息
  reviewNotes?: string;
  reviewedAt?: string;

  // 时间戳
  createdAt: string;
  updatedAt: string;

  GSI4PK?: string;             // PAYMENT#{paymentId}
  GSI4SK?: string;             // REFUND#{createdAt}
}
```

---

## 三、API 设计

### 3.1 API 列表

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | /payments/initiate | 发起支付 |
| POST | /payments/webhook | 支付回调 |
| GET | /payments/:id | 获取支付状态 |
| POST | /payments/:id/refund | 申请退款 |

---

## 四、POLi 集成

### 4.1 支付流程

```
1. 用户选择 POLi 支付
   │
   ├── 调用 POST /payments/initiate
   │   └── 返回 POLi 跳转 URL
   │
   └── 跳转 POLi 网站
       │
       ├── 用户登录网银
       ├── 确认支付
       │
       └── POLi 重定向回调
           │
           ├── POST /payments/webhook
           │   └── 更新支付状态
           │
           └── 返回成功页面
```

### 4.2 发起支付

```typescript
async function initiatePayment(
  bookingId: string,
  amount: number,
  userId: string
): Promise<{ paymentUrl: string }> {
  const paymentId = uuidv4();
  const now = new Date().toISOString();

  const payment: Payment = {
    PK: `PAYMENT#${paymentId}`,
    SK: 'METADATA',
    entityType: 'PAYMENT',
    dataCategory: 'TRANSACTION',
    id: paymentId,
    bookingId,
    amount,
    currency: 'NZD',
    commissionRate: 0.1,
    commissionAmount: amount * 0.1,
    netAmount: amount * 0.9,
    paymentMethod: 'poli',
    paymentStatus: 'pending',
    createdAt: now,
    updatedAt: now,
    GSI2PK: `STATUS#pending`,
    GSI2SK: `CREATED_AT#${now}`,
  };

  await putItem(payment);

  // 创建 POLi 交易
  const poliRequest = {
    merchantRef: paymentId,
    amount: amount.toFixed(2),
    currencyCode: 'NZD',
    successUrl: `https://findclass.co.nz/payment/success?payment_id=${paymentId}`,
    failureUrl: `https://findclass.co.nz/payment/failed?payment_id=${paymentId}`,
    cancellationUrl: `https://findclass.co.nz/payment/cancelled?payment_id=${paymentId}`,
  };

  const poliResponse = await poliClient.createTransaction(poliRequest);

  // 保存 Token
  await updateItem(
    { PK: `PAYMENT#${paymentId}`, SK: 'METADATA' },
    'SET gatewayToken = :token, updatedAt = :now',
    { ':token': poliResponse.Token, ':now': now }
  );

  return { paymentUrl: poliResponse.NavigationURL };
}
```

---

## 五、业务逻辑实现

```typescript
// src/modules/payments/payments.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import { Payment, PaymentStatus, createPaymentKey } from './payments.types';
import { putItem, getItem, updateItem } from '@shared/db/dynamodb';
import { getFromCache, setCache } from '@shared/db/cache';

interface InitiatePaymentParams {
  bookingId?: string;
  packageId?: string;
  userId: string;
  amount: number;
  paymentMethod: 'poli' | 'bank_transfer' | 'credit_card';
  currency?: string;
}

export class PaymentService {
  private readonly commissionRate = 0.1;  // 10% 佣金

  /**
   * 发起支付
   */
  async initiatePayment(params: InitiatePaymentParams): Promise<{
    paymentId: string;
    paymentUrl?: string;
    bankDetails?: any;
  }> {
    const paymentId = uuidv4();
    const now = new Date().toISOString();

    const payment: Payment = {
      ...createPaymentKey(paymentId),
      SK: 'METADATA',
      entityType: 'PAYMENT',
      dataCategory: 'TRANSACTION',
      id: paymentId,
      bookingId: params.bookingId,
      packageId: params.packageId,
      amount: params.amount,
      currency: params.currency || 'NZD',
      commissionRate: this.commissionRate,
      commissionAmount: params.amount * this.commissionRate,
      netAmount: params.amount * (1 - this.commissionRate),
      paymentMethod: params.paymentMethod,
      paymentStatus: PaymentStatus.PENDING,
      webhookVerified: false,
      refundStatus: 'none',
      createdAt: now,
      updatedAt: now,
      GSI2PK: `STATUS#${PaymentStatus.PENDING}`,
      GSI2SK: `CREATED_AT#${now}`,
      GSI3PK: `USER#${params.userId}`,
      GSI3SK: `CREATED_AT#${now}`,
    };

    await putItem(payment);

    let result: { paymentId: string; paymentUrl?: string; bankDetails?: any };

    switch (params.paymentMethod) {
      case 'poli':
        result = await this.initiatePoliPayment(paymentId, params);
        break;
      case 'bank_transfer':
        result = await this.initiateBankTransfer(paymentId, params);
        break;
      default:
        throw new Error('Unsupported payment method');
    }

    logger.info('Payment initiated', { paymentId, method: params.paymentMethod });

    return result;
  }

  /**
   * POLi 支付
   */
  private async initiatePoliPayment(paymentId: string, params: InitiatePaymentParams): Promise<any> {
    const poliRequest = {
      merchantRef: paymentId,
      amount: params.amount.toFixed(2),
      currencyCode: params.currency || 'NZD',
      successUrl: `https://findclass.co.nz/payment/success?payment_id=${paymentId}`,
      failureUrl: `https://findclass.co.nz/payment/failed?payment_id=${paymentId}`,
      cancellationUrl: `https://findclass.co.nz/payment/cancelled?payment_id=${paymentId}`,
    };

    const poliResponse = await poliClient.createTransaction(poliRequest);

    await updateItem(
      createPaymentKey(paymentId),
      'SET gatewayToken = :token, updatedAt = :now',
      { ':token': poliResponse.Token, ':now': new Date().toISOString() }
    );

    return {
      paymentId,
      paymentUrl: poliResponse.NavigationURL,
    };
  }

  /**
   * 银行转账
   */
  private async initiateBankTransfer(paymentId: string, params: InitiatePaymentParams): Promise<any> {
    const bankDetails = {
      bankName: 'ASB Bank',
      accountName: 'FindClass NZ Ltd',
      accountNumber: '12-3456-7890123-00',
      reference: `PAY-${paymentId.substring(0, 8).toUpperCase()}`,
      amount: params.amount,
      currency: params.currency || 'NZD',
      instructions: 'Please include the reference number in your transfer description.',
    };

    return {
      paymentId,
      bankDetails,
    };
  }

  /**
   * 处理支付回调
   */
  async processWebhook(paymentId: string, webhookData: any): Promise<Payment> {
    const payment = await getItem<Payment>(createPaymentKey(paymentId));
    if (!payment) {
      throw new Error('Payment not found');
    }

    const now = new Date().toISOString();
    const status = this.mapGatewayStatusToPaymentStatus(webhookData.status);

    const updated = await updateItem(
      createPaymentKey(paymentId),
      `SET paymentStatus = :status,
             transactionId = :txId,
             webhookReceivedAt = :now,
             webhookVerified = :verified,
             completedAt = :completedAt,
             updatedAt = :now`,
      {
        ':status': status,
        ':txId': webhookData.transactionId,
        ':now': now,
        ':verified': this.verifyWebhookSignature(webhookData),
        ':completedAt': status === PaymentStatus.COMPLETED ? now : undefined,
      }
    ) as Payment;

    if (status === PaymentStatus.COMPLETED) {
      await notificationService.sendUserNotification(
        payment.userId,
        'payment_completed',
        { paymentId, amount: payment.amount }
      );
    }

    logger.info('Payment webhook processed', { paymentId, status });

    return updated;
  }

  /**
   * 获取支付状态
   */
  async getPaymentStatus(paymentId: string): Promise<Payment | null> {
    return getItem<Payment>(createPaymentKey(paymentId));
  }

  /**
   * 验证 Webhook 签名
   */
  private verifyWebhookSignature(data: any): boolean {
    // POLi 签名验证逻辑
    const expectedSignature = generateSignature(data);
    return data.signature === expectedSignature;
  }

  /**
   * 映射网关状态
   */
  private mapGatewayStatusToPaymentStatus(gatewayStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'Initiated': PaymentStatus.PENDING,
      'Pending': PaymentStatus.PROCESSING,
      'Completed': PaymentStatus.COMPLETED,
      'Failed': PaymentStatus.FAILED,
      'Refunded': PaymentStatus.REFUNDED,
    };
    return statusMap[gatewayStatus] || PaymentStatus.PENDING;
  }
}

export const paymentService = new PaymentService();
```

---

## 六、测试用例

### 6.1 单元测试

```typescript
// src/modules/payments/payments.service.test.ts
import { paymentService } from './payments.service';
import { mockPutItem, mockGetItem, mockUpdateItem } from '../../test/mocks';

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initiatePayment', () => {
    it('should create POLi payment successfully', async () => {
      (putItem as jest.Mock).mockResolvedValue({});
      (updateItem as jest.Mock).mockResolvedValue({});
      (poliClient.createTransaction as jest.Mock).mockResolvedValue({
        Token: 'test-token-123',
        NavigationURL: 'https://poli.example.com/pay',
      });

      const result = await paymentService.initiatePayment({
        bookingId: 'booking-123',
        userId: 'user-456',
        amount: 100,
        paymentMethod: 'poli',
      });

      expect(result).toBeDefined();
      expect(result.paymentUrl).toBe('https://poli.example.com/pay');
      expect(poliClient.createTransaction).toHaveBeenCalled();
    });

    it('should create bank transfer payment', async () => {
      (putItem as jest.Mock).mockResolvedValue({});

      const result = await paymentService.initiatePayment({
        bookingId: 'booking-123',
        userId: 'user-456',
        amount: 150,
        paymentMethod: 'bank_transfer',
      });

      expect(result).toBeDefined();
      expect(result.bankDetails).toBeDefined();
      expect(result.bankDetails.accountNumber).toBe('12-3456-7890123-00');
      expect(result.bankDetails.reference).toContain('PAY-');
    });

    it('should calculate commission correctly', async () => {
      (putItem as jest.Mock).mockResolvedValue({});
      (updateItem as jest.Mock).mockResolvedValue({});
      (poliClient.createTransaction as jest.Mock).mockResolvedValue({
        Token: 'test-token',
        NavigationURL: 'https://poli.example.com',
      });

      await paymentService.initiatePayment({
        userId: 'user-456',
        amount: 200,
        paymentMethod: 'poli',
      });

      expect(putItem).toHaveBeenCalledWith(expect.objectContaining({
        commissionRate: 0.1,
        commissionAmount: 20,
        netAmount: 180,
      }));
    });
  });

  describe('processWebhook', () => {
    it('should update payment status on successful webhook', async () => {
      const mockPayment = {
        id: 'payment-123',
        paymentStatus: 'pending',
        userId: 'user-456',
        amount: 100,
      };

      (getItem as jest.Mock).mockResolvedValueOnce(mockPayment);
      (updateItem as jest.Mock).mockResolvedValueOnce({
        ...mockPayment,
        paymentStatus: 'completed',
        completedAt: new Date().toISOString(),
      });
      (notificationService.sendUserNotification as jest.Mock).mockResolvedValue({});

      const result = await paymentService.processWebhook('payment-123', {
        status: 'Completed',
        transactionId: 'tx-789',
        signature: 'valid-signature',
      });

      expect(result.paymentStatus).toBe('completed');
    });

    it('should throw error for non-existent payment', async () => {
      (getItem as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        paymentService.processWebhook('non-existent', { status: 'Completed' })
      ).rejects.toThrow('Payment not found');
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status', async () => {
      const mockPayment = {
        id: 'payment-123',
        paymentStatus: 'completed',
        amount: 100,
      };

      (getItem as jest.Mock).mockResolvedValueOnce(mockPayment);

      const result = await paymentService.getPaymentStatus('payment-123');

      expect(result).toEqual(mockPayment);
    });

    it('should return null for non-existent payment', async () => {
      (getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await paymentService.getPaymentStatus('non-existent');

      expect(result).toBeNull();
    });
  });
});
```

---

## 七、验收标准

- [ ] 支持 POLi 支付
- [ ] 支持银行转账
- [ ] 支付状态同步正确
- [ ] 退款流程正常
- [ ] 佣金计算正确
- [ ] Webhook 验证安全

---

## 八、风险分析

- [ ] 支持 POLi 支付
- [ ] 支持银行转账
- [ ] 支付状态同步正确
- [ ] 退款流程正常
- [ ] 佣金计算正确
- [ ] Webhook 验证安全

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/transaction/tech-payments.md`

**相关文档**:
- [产品设计](../../05-product-design/transaction/payments.md)
- [在线预约](tech-booking.md)
