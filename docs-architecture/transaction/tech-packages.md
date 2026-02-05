---
title: 技术实现 - 课程套餐
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 2
priority: P0
status: complete
related_feature: ../../05-product-design/transaction/packages.md
---

# 技术实现: 课程套餐

> **对应产品文档**: [packages.md](../../05-product-design/transaction/packages.md) | **优先级**: P0 | **排期**: Phase 2 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      课程套餐技术架构                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   └── 微信小程序 (Taro)                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── GET /api/v1/packages                                           │
│   ├── GET /api/v1/packages/:id                                       │
│   ├── POST /api/v1/packages/purchase                                 │
│   └── POST /api/v1/packages/:id/activate                             │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── PackageService (套餐服务)                                      │
│   ├── PackagePurchaseService (购买服务)                              │
│   └── PackageActivationService (激活服务)                            │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   ├── DynamoDB (FindClass-MainTable)                                 │
│   │   ├── PACKAGE#{packageId}                                       │
│   │   ├── USER#{userId}#PACKAGES                                    │
│   │   └── TRANSACTION#{transactionId}                               │
│   └── DynamoDB (缓存)                                                   │
│       ├── package:{packageId}                                       │
│       └── package:list                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、数据模型设计 (DynamoDB)

```typescript
// src/modules/packages/packages.types.ts

/**
 * 套餐类型
 */
export enum PackageType {
  TIME_BASED = 'time_based',     // 时长套餐
  SESSION_BASED = 'session_based', // 课时套餐
  DISCOUNT = 'discount',         // 折扣套餐
}

/**
 * 套餐状态
 */
export enum PackageStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  DISCONTINUED = 'discontinued',
}

/**
 * 套餐 DynamoDB 类型
 */
export interface Package {
  PK: string;           // PACKAGE#{packageId}
  SK: string;           // METADATA
  entityType: 'PACKAGE';
  dataCategory: 'TRANSACTION';
  id: string;
  
  // 基本信息
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  type: PackageType;
  status: PackageStatus;
  
  // 价格信息
  originalPrice: number;
  currentPrice: number;
  currency: string;
  
  // 套餐内容
  content: {
    sessionCount?: number;      // 课时数
    durationDays?: number;      // 有效天数
    durationHours?: number;     // 总小时数
    maxCourses?: number;        // 最多课程数
  };
  
  // 限制
  restrictions?: {
    minAge?: number;
    maxAge?: number;
    applicableCourses?: string[];
    applicableTeachers?: string[];
  };
  
  // 有效期
  validFrom?: string;
  validUntil?: string;
  
  // 统计
  totalSold: number;
  totalRevenue: number;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  GSI21PK?: string;  // TYPE#{type}
  GSI21SK?: string;  // PRICE#{currentPrice}
}

/**
 * 用户套餐 DynamoDB 类型
 */
export interface UserPackage {
  PK: string;           // USER#{userId}
  SK: string;           // PACKAGE#{packageId}
  entityType: 'USER_PACKAGE';
  dataCategory: 'TRANSACTION';
  id: string;
  
  userId: string;
  packageId: string;
  packageName: string;
  
  // 购买信息
  purchasePrice: number;
  purchaseDate: string;
  paymentMethod: string;
  transactionId: string;
  
  // 使用情况
  usedSessions: number;
  usedHours: number;
  remainingSessions?: number;
  remainingHours?: number;
  
  // 有效期
  validFrom: string;
  validUntil: string;
  expiredAt?: string;
  
  // 状态
  status: 'active' | 'used_up' | 'expired' | 'cancelled';
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  GSI22PK?: string;  // STATUS#{status}
  GSI22SK?: string;  // EXPIRES_AT#{validUntil}
}

/**
 * 套餐交易记录
 */
export interface PackageTransaction {
  PK: string;           // TRANSACTION#{transactionId}
  SK: string;           // METADATA
  entityType: 'PACKAGE_TRANSACTION';
  dataCategory: 'TRANSACTION';
  id: string;
  
  userId: string;
  packageId: string;
  userPackageId: string;
  
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  
  // 时间戳
  createdAt: string;
}
```

---

## 三、业务逻辑实现

```typescript
// src/modules/packages/packages.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  Package,
  UserPackage,
  PackageTransaction,
  PackageType,
  PackageStatus,
  createPackageKey,
  createUserPackageKey,
  createTransactionKey,
} from './packages.types';
import { putItem, getItem, queryItems, updateItem } from '@shared/db/dynamodb';
import { getFromCache, setCache } from '@shared/db/cache';

export class PackageService {
  /**
   * 获取所有可用套餐
   */
  async getAvailablePackages(): Promise<Package[]> {
    const cacheKey = 'package:list:active';
    const cached = await getFromCache<Package[]>(cacheKey, 'TRANSACTION');
    if (cached) return cached;

    const result = await queryItems<Package>({
      indexName: 'GSI21-PackageByType',
      keyConditionExpression: 'GSI21PK = :pk AND GSI21SK >= :minPrice',
      expressionAttributeValues: {
        ':pk': `TYPE#active`,
        ':minPrice': 'PRICE#0',
      },
      filterExpression: 'status = :status',
      expressionAttributeValues: {
        ':status': PackageStatus.ACTIVE,
      },
    });

    await setCache(cacheKey, 'TRANSACTION', result.items, 300);
    return result.items;
  }

  /**
   * 购买套餐
   */
  async purchasePackage(userId: string, packageId: string, paymentInfo: {
    amount: number;
    paymentMethod: string;
    transactionId: string;
  }): Promise<{ userPackage: UserPackage; transaction: PackageTransaction }> {
    const pkg = await this.getPackageById(packageId);
    if (!pkg || pkg.status !== PackageStatus.ACTIVE) {
      throw new Error('Package not available');
    }

    const now = new Date().toISOString();
    const userPackageId = uuidv4();
    const transactionId = uuidv4();

    // 计算有效期
    const validFrom = now;
    const validUntil = new Date(Date.now() + (pkg.content.durationDays || 365) * 24 * 60 * 60 * 1000).toISOString();

    // 创建用户套餐
    const userPackage: UserPackage = {
      ...createUserPackageKey(userId, userPackageId),
      SK: `PACKAGE#${packageId}`,
      entityType: 'USER_PACKAGE',
      dataCategory: 'TRANSACTION',
      id: userPackageId,
      userId,
      packageId,
      packageName: pkg.name,
      purchasePrice: paymentInfo.amount,
      purchaseDate: now,
      paymentMethod: paymentInfo.paymentMethod,
      transactionId: paymentInfo.transactionId,
      usedSessions: 0,
      usedHours: 0,
      remainingSessions: pkg.content.sessionCount,
      remainingHours: pkg.content.durationHours,
      validFrom,
      validUntil,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      GSI22PK: 'STATUS#active',
      GSI22SK: `EXPIRES_AT#${validUntil}`,
    };

    await putItem(userPackage);

    // 创建交易记录
    const transaction: PackageTransaction = {
      ...createTransactionKey(transactionId),
      entityType: 'PACKAGE_TRANSACTION',
      dataCategory: 'TRANSACTION',
      id: transactionId,
      userId,
      packageId,
      userPackageId,
      amount: paymentInfo.amount,
      currency: 'NZD',
      paymentMethod: paymentInfo.paymentMethod,
      paymentStatus: 'completed',
      createdAt: now,
    };

    await putItem(transaction);

    // 更新套餐销量
    await updateItem(
      createPackageKey(packageId),
      'SET totalSold = totalSold + :inc, totalRevenue = totalRevenue + :amount, updatedAt = :now',
      {
        ':inc': 1,
        ':amount': paymentInfo.amount,
        ':now': now,
      }
    );

    logger.info('Package purchased', { userPackageId, packageId, userId });

    return { userPackage, transaction };
  }

  /**
   * 使用套餐课时
   */
  async useSession(userPackageId: string, sessionInfo: {
    duration: number;
    courseId: string;
  }): Promise<UserPackage> {
    const userPackage = await this.getUserPackageById(userPackageId);
    if (!userPackage || userPackage.status !== 'active') {
      throw new Error('Package not available');
    }

    // 检查是否过期
    if (new Date(userPackage.validUntil) < new Date()) {
      await updateItem(
        { PK: userPackage.PK, SK: userPackage.SK },
        'SET status = :status, updatedAt = :now',
        { ':status': 'expired', ':now': new Date().toISOString() }
      );
      throw new Error('Package has expired');
    }

    // 检查剩余课时
    if (userPackage.remainingSessions !== undefined && userPackage.remainingSessions <= 0) {
      await updateItem(
        { PK: userPackage.PK, SK: userPackage.SK },
        'SET status = :status, updatedAt = :now',
        { ':status': 'used_up', ':now': new Date().toISOString() }
      );
      throw new Error('No remaining sessions');
    }

    const now = new Date().toISOString();
    const updated = await updateItem(
      { PK: userPackage.PK, SK: userPackage.SK },
      `SET usedSessions = usedSessions + 1, 
            usedHours = usedHours + :duration,
            remainingSessions = if_not_exists(remainingSessions, :max) - 1,
            remainingHours = if_not_exists(remainingHours, :maxHours) - :duration,
            updatedAt = :now`,
      {
        ':duration': sessionInfo.duration / 60,
        ':max': userPackage.remainingSessions,
        ':maxHours': userPackage.remainingHours,
        ':now': now,
      }
    ) as UserPackage;

    // 检查是否用完
    if (updated.remainingSessions !== undefined && updated.remainingSessions <= 0) {
      await updateItem(
        { PK: updated.PK, SK: updated.SK },
        'SET status = :status',
        { ':status': 'used_up' }
      );
    }

    logger.info('Session used from package', { userPackageId, duration: sessionInfo.duration });

    return updated;
  }

  /**
   * 获取用户套餐
   */
  async getUserPackages(userId: string): Promise<UserPackage[]> {
    const result = await queryItems<UserPackage>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'PACKAGE#',
      },
      scanIndexForward: false,
    });

    return result.items;
  }

  private async getPackageById(packageId: string): Promise<Package | null> {
    const { PK, SK } = createPackageKey(packageId);
    return getItem<Package>({ PK, SK });
  }

  private async getUserPackageById(userPackageId: string): Promise<UserPackage | null> {
    // 先通过索引查找
    const result = await queryItems<UserPackage>({
      indexName: 'GSI22-UserPackagesByStatus',
      keyConditionExpression: 'GSI22PK = :pk',
      expressionAttributeValues: {
        ':pk': `USER_PACKAGE#${userPackageId}`,
      },
    });
    return result.items[0] || null;
  }
}

export const packageService = new PackageService();
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| GET | /api/v1/packages | 获取套餐列表 | 公开 |
| GET | /api/v1/packages/:id | 获取套餐详情 | 公开 |
| POST | /api/v1/packages/purchase | 购买套餐 | 需登录 |
| GET | /api/v1/packages/my | 我的套餐 | 需登录 |
| POST | /api/v1/packages/:id/use | 使用套餐 | 需登录 |

---

## 六、测试用例

### 6.1 单元测试

```typescript
// src/modules/packages/packages.service.test.ts
import { packageService } from './packages.service';
import { mockPutItem, mockGetItem, mockQueryItems, mockUpdateItem } from '../../test/mocks';
import { PackageStatus, PurchaseStatus } from './packages.types';

describe('PackageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPackages', () => {
    it('PK-HP-01: should return active packages', async () => {
      // Given
      const mockPackages = [
        { id: 'pkg-1', name: '10课时套餐', status: PackageStatus.ACTIVE },
        { id: 'pkg-2', name: '20课时套餐', status: PackageStatus.ACTIVE },
      ];

      (queryItems as jest.Mock).mockResolvedValue({ items: mockPackages });

      // When
      const result = await packageService.getPackages();

      // Then
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(PackageStatus.ACTIVE);
    });
  });

  describe('purchasePackage', () => {
    it('PK-HP-02: should create purchase record', async () => {
      // Given
      const userId = 'user-123';
      const dto = {
        packageId: 'pkg-123',
        paymentMethod: 'poli',
      };

      (getItem as jest.Mock).mockResolvedValue({
        id: 'pkg-123',
        name: '10课时套餐',
        price: 500,
        sessionCount: 10,
      });
      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await packageService.purchasePackage(userId, dto);

      // Then
      expect(result).toBeDefined();
      expect(result.status).toBe(PurchaseStatus.PENDING);
      expect(result.sessionCount).toBe(10);
    });
  });

  describe('activatePackage', () => {
    it('PK-HP-03: should activate package after payment', async () => {
      // Given
      const purchaseId = 'purchase-123';
      const mockPurchase = {
        id: purchaseId,
        status: PurchaseStatus.PENDING,
        sessionCount: 10,
        remainingSessions: 10,
      };

      (getItem as jest.Mock).mockResolvedValue(mockPurchase);
      (updateItem as jest.Mock).mockResolvedValue({
        ...mockPurchase,
        status: PurchaseStatus.ACTIVE,
      });

      // When
      await packageService.activatePackage(purchaseId);

      // Then
      expect(updateItem).toHaveBeenCalled();
    });
  });

  describe('useSession', () => {
    it('PK-HP-04: should decrement remaining sessions', async () => {
      // Given
      const userId = 'user-123';
      const purchaseId = 'purchase-123';
      const mockPurchase = {
        id: purchaseId,
        userId,
        status: PurchaseStatus.ACTIVE,
        remainingSessions: 5,
      };

      (getItem as jest.Mock).mockResolvedValue(mockPurchase);
      (updateItem as jest.Mock).mockResolvedValue({
        ...mockPurchase,
        remainingSessions: 4,
      });

      // When
      const result = await packageService.useSession(userId, purchaseId);

      // Then
      expect(result.remainingSessions).toBe(4);
    });

    it('PK-FC-01: should reject when no sessions left', async () => {
      // Given
      (getItem as jest.Mock).mockResolvedValue({
        id: 'purchase-123',
        remainingSessions: 0,
      });

      // When & Then
      await expect(packageService.useSession('user-123', 'purchase-123'))
        .rejects.toThrow('套餐课时已用完');
    });
  });
});
```

### 6.2 集成测试用例

> **测试文档**: `06-tech-architecture/transaction/story-packages.md` 中的 US30

```typescript
// tests/integration/packages/us30-packages.test.ts

describe('US30: 套餐购买与使用', () => {
  beforeAll(async () => {
    await startTestContainers();
    await createTestTable();
  }, 120000);

  it('US30-HP-01: should complete package purchase flow', async () => {
    // 1. 查看套餐列表
    const listResponse = await request(app)
      .get('/api/v1/packages')
      .expect(200);

    expect(listResponse.body.data.packages).toBeDefined();

    // 2. 选择套餐并购买
    const packageId = listResponse.body.data.packages[0].id;
    const purchaseResponse = await request(app)
      .post('/api/v1/packages/purchase')
      .send({
        packageId,
        paymentMethod: 'poli',
      })
      .expect(201);

    expect(purchaseResponse.body.data.status).toBe('pending');
    expect(purchaseResponse.body.data.sessionCount).toBeDefined();
  });
});
```

---

## 七、风险分析

- [ ] 套餐列表展示正确
- [ ] 套餐购买流程顺畅
- [ ] 套餐课时使用正确
- [ ] 过期处理正确
- [ ] 退款流程正常

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/phase-2/tech-packages.md`

**相关文档**:
- [产品设计](../../05-product-design/transaction/packages.md)
- [支付系统](../phase-3/tech-payments.md)
- [退款处理](tech-refunds.md)
