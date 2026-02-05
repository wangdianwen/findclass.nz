---
title: 技术实现 - 推荐系统
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 2
priority: P0
status: complete
related_feature: ../../05-product-design/growth/referral.md
---

# 技术实现: 推荐系统

> **对应产品文档**: [referral.md](../../05-product-design/growth/referral.md) | **优先级**: P0 | **排期**: Phase 2 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      推荐系统技术架构                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   └── 微信小程序 (Taro)                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── GET /api/v1/referral/code                                     │
│   ├── POST /api/v1/referral/use                                     │
│   ├── GET /api/v1/referral/history                                  │
│   └── GET /api/v1/referral/rewards                                  │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── ReferralService (推荐服务)                                     │
│   ├── ReferralCodeService (推荐码服务)                               │
│   └── ReferralRewardService (奖励服务)                               │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   └── DynamoDB (FindClass-MainTable)                                │
│       ├── REFERRAL#{referralId}                                    │
│       ├── USER#{userId}#REFERRAL_CODE                               │
│       └── USER#{userId}#REWARDS                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/referral/
├── referral.types.ts           # 类型定义
├── referral.service.ts         # 推荐服务
├── referral.controller.ts      # API 控制器
├── referral.routes.ts          # 路由配置
└── referral.test.ts            # 测试文件

06-frontend/src/pages/referral/
├── ReferralPage.tsx            # 推荐页面
├── ReferralCodeCard.tsx        # 推荐码卡片
├── ReferralHistory.tsx         # 推荐历史
└── ReferralRewards.tsx         # 奖励列表
```

---

## 二、数据模型 (DynamoDB)

```typescript
// src/modules/referral/referral.types.ts

/**
 * 推荐状态
 */
export enum ReferralStatus {
  PENDING = 'pending',
  SIGNED_UP = 'signed_up',
  FIRST_BOOKING = 'first_booking',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

/**
 * 推荐 DynamoDB 类型
 */
export interface Referral {
  PK: string;           // REFERRAL#{referralId}
  SK: string;           // METADATA
  entityType: 'REFERRAL';
  dataCategory: 'GROWTH';
  id: string;
  
  // 推荐人
  referrerId: string;
  referrerCode: string;
  
  // 被推荐人
  refereeId?: string;
  refereeEmail?: string;
  
  // 状态
  status: ReferralStatus;
  
  // 奖励
  rewardAmount: number;
  rewardClaimed: boolean;
  rewardClaimedAt?: string;
  
  // 里程碑
  signedUpAt?: string;
  firstBookingAt?: string;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  GSI23PK?: string;  // USER#{referrerId}
  GSI23SK?: string;  // STATUS#{status}
  GSI24PK?: string;  // CODE#{code}
  GSI24SK?: string;  // REFERRAL#{createdAt}
}

/**
 * 推荐码 DynamoDB 类型
 */
export interface ReferralCode {
  PK: string;           // USER#{userId}
  SK: string;           // REFERRAL_CODE
  entityType: 'REFERRAL_CODE';
  dataCategory: 'GROWTH';
  id: string;
  
  userId: string;
  code: string;
  usageCount: number;
  maxUsage?: number;
  isActive: boolean;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * 推荐奖励记录
 */
export interface ReferralReward {
  PK: string;           // USER#{userId}
  SK: string;           // REWARD#{rewardId}
  entityType: 'REFERRAL_REWARD';
  dataCategory: 'GROWTH';
  id: string;
  
  userId: string;
  referralId: string;
  amount: number;
  type: 'credit' | 'cash';
  status: 'pending' | 'claimed' | 'expired';
  
  expiresAt?: string;
  claimedAt?: string;
  
  createdAt: string;
}
```

---

## 三、业务逻辑

```typescript
// src/modules/referral/referral.service.ts
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { logger } from '@core/logger';
import {
  Referral,
  ReferralCode,
  ReferralReward,
  ReferralStatus,
  createReferralKey,
  createUserReferralIndexKey,
  createCodeIndexKey,
} from './referral.types';
import { putItem, getItem, queryItems, updateItem } from '@shared/db/dynamodb';

export class ReferralService {
  /**
   * 生成推荐码
   */
  async generateReferralCode(userId: string): Promise<ReferralCode> {
    const code = this.generateCode();
    const now = new Date().toISOString();

    const referralCode: ReferralCode = {
      PK: `USER#${userId}`,
      SK: 'REFERRAL_CODE',
      entityType: 'REFERRAL_CODE',
      dataCategory: 'GROWTH',
      id: uuidv4(),
      userId,
      code,
      usageCount: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await putItem(referralCode);
    return referralCode;
  }

  /**
   * 使用推荐码注册
   */
  async useReferralCode(code: string, refereeId: string, refereeEmail: string): Promise<Referral> {
    // 查找推荐码
    const result = await queryItems<ReferralCode>({
      indexName: 'GSI24-CodeIndex',
      keyConditionExpression: 'GSI24PK = :pk',
      expressionAttributeValues: {
        ':pk': `CODE#${code}`,
      },
      limit: 1,
    });

    const referralCode = result.items[0];
    if (!referralCode || !referralCode.isActive) {
      throw new Error('Invalid or expired referral code');
    }

    if (referralCode.maxUsage && referralCode.usageCount >= referralCode.maxUsage) {
      throw new Error('Referral code has reached maximum usage');
    }

    const now = new Date().toISOString();
    const referralId = uuidv4();

    // 检查是否已有推荐记录
    const existing = await this.getReferralByReferee(refereeId);
    if (existing) {
      throw new Error('User already referred');
    }

    const referral: Referral = {
      ...createReferralKey(referralId),
      entityType: 'REFERRAL',
      dataCategory: 'GROWTH',
      id: referralId,
      referrerId: referralCode.userId,
      referrerCode: code,
      refereeId,
      refereeEmail,
      status: ReferralStatus.SIGNED_UP,
      rewardAmount: 10,
      rewardClaimed: false,
      signedUpAt: now,
      createdAt: now,
      updatedAt: now,
      GSI23PK: `USER#${referralCode.userId}`,
      GSI23SK: `STATUS#${ReferralStatus.SIGNED_UP}`,
      GSI24PK: `CODE#${code}`,
      GSI24SK: `REFERRAL#${now}`,
    };

    await putItem(referral);

    // 更新推荐码使用次数
    await updateItem(
      { PK: referralCode.PK, SK: referralCode.SK },
      'SET usageCount = usageCount + :inc, updatedAt = :now',
      { ':inc': 1, ':now': now }
    );

    logger.info('Referral created', { referralId, referrerId: referralCode.userId, refereeId });

    return referral;
  }

  /**
   * 触发首次预订里程碑
   */
  async triggerFirstBooking(referralId: string): Promise<Referral> {
    const referral = await getItem<Referral>(createReferralKey(referralId));
    if (!referral) {
      throw new Error('Referral not found');
    }

    if (referral.status !== ReferralStatus.SIGNED_UP) {
      throw new Error('Referral already completed first booking');
    }

    const now = new Date().toISOString();

    const updated = await updateItem(
      createReferralKey(referralId),
      `SET status = :status, firstBookingAt = :now, updatedAt = :now`,
      {
        ':status': ReferralStatus.FIRST_BOOKING,
        ':now': now,
      }
    ) as Referral;

    // 发放奖励
    await this.claimReward(referral.referrerId, referralId);

    logger.info('Referral first booking', { referralId });

    return updated;
  }

  /**
   * 发放奖励
   */
  async claimReward(userId: string, referralId: string): Promise<ReferralReward> {
    const now = new Date().toISOString();
    const rewardId = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const reward: ReferralReward = {
      PK: `USER#${userId}`,
      SK: `REWARD#${rewardId}`,
      entityType: 'REFERRAL_REWARD',
      dataCategory: 'GROWTH',
      id: rewardId,
      userId,
      referralId,
      amount: 10,
      type: 'credit',
      status: 'pending',
      expiresAt,
      createdAt: now,
    };

    await putItem(reward);

    return reward;
  }

  private generateCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  private async getReferralByReferee(refereeId: string): Promise<Referral | null> {
    const result = await queryItems<Referral>({
      indexName: 'GSI23-UserReferrals',
      keyConditionExpression: 'GSI23PK = :pk',
      expressionAttributeValues: {
        ':pk': `USER#${refereeId}`,
      },
    });
    return result.items[0] || null;
  }
}

export const referralService = new ReferralService();
```

---

## 四、API 设计

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| GET | /api/v1/referral/code | 获取我的推荐码 | 需登录 |
| POST | /api/v1/referral/use | 使用推荐码 | 需登录 |
| GET | /api/v1/referral/history | 推荐历史 | 需登录 |
| GET | /api/v1/referral/rewards | 我的奖励 | 需登录 |

---

## 五、测试用例

### 5.1 单元测试

```typescript
// src/modules/referral/referral.service.test.ts
import { referralService } from './referral.service';
import { mockPutItem, mockGetItem, mockQueryItems, mockUpdateItem } from '../../test/mocks';
import { ReferralStatus } from './referral.types';

describe('ReferralService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReferralCode', () => {
    it('RF-HP-01: should generate unique referral code', async () => {
      // Given
      const userId = 'user-123';
      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await referralService.generateReferralCode(userId);

      // Then
      expect(result).toBeDefined();
      expect(result.code).toBeDefined();
      expect(result.code.length).toBe(8);
    });
  });

  describe('useReferralCode', () => {
    it('RF-HP-02: should create referral record', async () => {
      // Given
      const code = 'ABC12345';
      const refereeId = 'user-456';
      const refereeEmail = 'referee@example.com';

      (queryItems as jest.Mock).mockResolvedValue({
        items: [{
          PK: 'USER#user-123',
          SK: 'REFERRAL_CODE',
          code,
          usageCount: 0,
          isActive: true,
        }],
      });
      (queryItems as jest.Mock).mockResolvedValue({ items: [] }); // No existing referral
      (putItem as jest.Mock).mockResolvedValue({});
      (updateItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await referralService.useReferralCode(code, refereeId, refereeEmail);

      // Then
      expect(result).toBeDefined();
      expect(result.status).toBe(ReferralStatus.SIGNED_UP);
    });

    it('RF-FC-01: should reject invalid code', async () => {
      // Given
      (queryItems as jest.Mock).mockResolvedValue({ items: [] });

      // When & Then
      await expect(referralService.useReferralCode('INVALID', 'user-123', 'test@example.com'))
        .rejects.toThrow('Invalid or expired referral code');
    });

    it('RF-FC-02: should reject if already referred', async () => {
      // Given
      (queryItems as jest.Mock).mockResolvedValue({
        items: [{ code: 'ABC12345', isActive: true }],
      });
      (queryItems as jest.Mock).mockResolvedValue({
        items: [{ id: 'existing-referral' }],
      });

      // When & Then
      await expect(referralService.useReferralCode('ABC12345', 'user-123', 'test@example.com'))
        .rejects.toThrow('User already referred');
    });
  });

  describe('triggerFirstBooking', () => {
    it('RF-HP-03: should complete referral and claim reward', async () => {
      // Given
      const referralId = 'referral-123';
      const mockReferral = {
        id: referralId,
        referrerId: 'user-123',
        status: ReferralStatus.SIGNED_UP,
      };

      (getItem as jest.Mock).mockResolvedValue(mockReferral);
      (updateItem as jest.Mock).mockResolvedValue({});
      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await referralService.triggerFirstBooking(referralId);

      // Then
      expect(result.status).toBe(ReferralStatus.FIRST_BOOKING);
      expect(putItem).toHaveBeenCalled(); // Reward created
    });
  });
});
```

### 5.2 集成测试用例

> **测试文档**: `06-tech-architecture/growth/story-referral.md` 中的 US32

```typescript
// tests/integration/referral/us32-referral.test.ts

describe('US32: 推荐系统', () => {
  beforeAll(async () => {
    await startTestContainers();
    await createTestTable();
  }, 120000);

  it('US32-HP-01: should complete referral flow', async () => {
    // 1. 生成推荐码
    const codeResponse = await request(app)
      .get('/api/v1/referral/code')
      .expect(200);

    expect(codeResponse.body.data.code).toBeDefined();

    // 2. 使用推荐码注册
    const referralCode = codeResponse.body.data.code;
    const registerResponse = await request(app)
      .post('/api/v1/referral/use')
      .send({ code: referralCode })
      .expect(201);

    expect(registerResponse.body.data.status).toBe('signed_up');
  });
});
```

---

## 六、风险分析

- [ ] 推荐码生成正确
- [ ] 推荐码注册追踪正确
- [ ] 首次预订奖励触发正确
- [ ] 奖励发放正确
- [ ] 过期处理正确

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/phase-2/tech-referral.md`

**相关文档**:
- [产品设计](../../05-product-design/growth/referral.md)
- [用户中心](tech-user-center.md)
