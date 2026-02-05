---
title: 技术实现 - 用户捐款系统
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 2
priority: P1
status: complete
related_feature: ../../05-product-design/growth/donations.md
---

# 技术实现: 用户捐款系统

> **对应产品文档**: [donations.md](../../05-product-design/growth/donations.md) | **优先级**: P1 | **排期**: Phase 2 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      用户捐款系统技术架构                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   └── 微信小程序 (Taro)                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── POST /api/v1/donations                                        │
│   ├── GET /api/v1/donations/my                                       │
│   ├── GET /api/v1/donations/public                                   │
│   └── GET /api/v1/donations/stats                                    │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── DonationService (捐款服务)                                     │
│   ├── DonationPaymentService (支付服务)                              │
│   ├── DonationStatsService (统计服务)                                │
│   └── DonationEmailService (邮件服务)                                │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   ├── DynamoDB (FindClass-MainTable)                                 │
│   │   ├── DONATION#{donationId}                                     │
│   │   ├── USER#{userId}#DONATIONS                                   │
│   │   └── SYSTEM#DONATION_STATS#{date}                              │
│   └── DynamoDB (缓存)                                                 │
│       ├── CACHE#{type}#{key}                                        │
│       └── TTL 控制（自动过期）                                         │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [外部服务]                                                         │
│   ├── POLi Payments API                                             │
│   ├── Stripe (信用卡)                                                │
│   ├── ANZ Bank (银行转账)                                            │
│   └── SendGrid (邮件服务)                                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/donations/
├── donations.types.ts       # 类型定义
├── donations.service.ts     # 业务逻辑
├── donations.controller.ts  # API 控制器
├── donations.routes.ts      # 路由配置
└── index.ts                 # 模块导出

06-frontend/src/components/donation/
├── DonationPage.tsx         # 捐款页面
├── DonationAmount.tsx       # 金额选择组件
├── PaymentMethod.tsx        # 支付方式组件
├── BankTransferInfo.tsx     # 银行转账信息
├── ThankYouPage.tsx         # 感谢页面
├── MyDonations.tsx          # 我的捐款记录
└── PublicDonationList.tsx   # 公开捐款名单
```

---

## 二、数据模型设计 (DynamoDB)

### 2.1 捐款记录类型

```typescript
// src/modules/donations/donations.types.ts

/**
 * 捐款类型枚举
 */
export enum DonationType {
  ONE_TIME = 'one-time',
  RECURRING = 'recurring',
}

/**
 * 支付方式枚举
 */
export enum PaymentMethod {
  POLI = 'poli',
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}

/**
 * 支付状态枚举
 */
export enum DonationPaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

/**
 * 预设金额标签
 */
export enum PresetAmountLabel {
  COFFEE = 'coffee',    // $2
  BOOK = 'book',        // $5
  GIFT = 'gift',        // $10
  STAR = 'star',        // $20
  SPONSOR = 'sponsor',  // $50
  CUSTOM = 'custom',    // 自定义
}

/**
 * 捐款记录 DynamoDB 类型
 */
export interface Donation {
  // DynamoDB 主键
  PK: string;           // DONATION#{donationId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'DONATION';
  dataCategory: 'DONATION';
  id: string;
  
  // 关联用户
  userId: string;
  userEmail?: string;
  
  // 捐款信息
  amount: number;
  currency: string;     // 'NZD'
  donationType: DonationType;
  presetAmountLabel?: PresetAmountLabel;
  customAmount: boolean;
  
  // 支付信息
  paymentMethod: PaymentMethod;
  paymentStatus: DonationPaymentStatus;
  paymentReference?: string;  // POLi transaction ID
  
  // 银行转账相关
  bankReference?: string;     // 参考号 DNR-2026-0001234
  paymentProofUrl?: string;   // 转账凭证 URL
  confirmedAt?: string;
  confirmedBy?: string;       // 管理员 ID
  
  // 隐私设置
  isAnonymous: boolean;
  showNickname: boolean;
  displayNickname?: string;
  
  // 感谢信息
  thankYouSent: boolean;
  thankYouSentAt?: string;
  subscribeEmail: boolean;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI8PK?: string;  // USER#{userId}
  GSI8SK?: string;  // DONATION#{createdAt}
  GSI9PK?: string;  // STATUS#{paymentStatus}
  GSI9SK?: string;  // CREATED_AT#{createdAt}
}

/**
 * 用户捐款列表索引项
 */
export interface UserDonationIndex {
  PK: string;           // USER#{userId}
  SK: string;           // DONATION#{createdAt}
  entityType: 'DONATION_INDEX';
  dataCategory: 'DONATION';
  id: string;
  donationId: string;
  amount: number;
  paymentStatus: DonationPaymentStatus;
  createdAt: string;
}

/**
 * 公开捐款展示项
 */
export interface PublicDonation {
  PK: string;           // PUBLIC_DONATION
  SK: string;           // TIMESTAMP#{createdAt}
  entityType: 'PUBLIC_DONATION';
  dataCategory: 'DONATION';
  id: string;
  donationId: string;
  
  // 展示信息
  displayNickname?: string;
  amount: number;
  amountRange: '2-5' | '6-10' | '11-20' | '21+';
  displayMessage?: string;
  
  // 显示控制
  isVisible: boolean;
  displayedAt: string;
  expiresAt: string;    // 30天后过期
  
  createdAt: string;
}

/**
 * 捐款统计日记录
 */
export interface DonationDailyStats {
  PK: string;           // STATS#{date}
  SK: string;           // DAILY
  entityType: 'DONATION_STATS';
  dataCategory: 'ANALYTICS';
  id: string;
  statDate: string;
  
  // 统计数据
  totalCount: number;
  totalAmount: number;
  uniqueDonors: number;
  averageAmount: number;
  
  // 支付方式统计
  poliCount: number;
  poliAmount: number;
  bankTransferCount: number;
  bankTransferAmount: number;
  creditCardCount: number;
  creditCardAmount: number;
  paypalCount: number;
  paypalAmount: number;
  
  // 匿名统计
  anonymousCount: number;
  publicCount: number;
  
  updatedAt: string;
}

/**
 * 创建捐款请求 DTO
 */
export interface CreateDonationDto {
  amount: number;
  paymentMethod: PaymentMethod;
  isAnonymous?: boolean;
  showNickname?: boolean;
  subscribeEmail?: boolean;
  customAmount?: boolean;
  presetAmountLabel?: PresetAmountLabel;
}

/**
 * 捐款查询参数
 */
export interface DonationQueryParams {
  page?: number;
  limit?: number;
  status?: DonationPaymentStatus;
  startDate?: string;
  endDate?: string;
}

/**
 * 公开捐款列表项
 */
export interface PublicDonationListItem {
  nickname?: string;
  amountRange: string;
  displayedAt: string;
}

/**
 * 捐款统计概览
 */
export interface DonationStatsOverview {
  totalDonations: number;
  totalAmount: number;
  uniqueDonors: number;
  averageDonation: number;
}
```

### 2.2 实体键生成函数

```typescript
// src/modules/donations/donations.types.ts (续)

import { createEntityKey, createGSIKey } from '@shared/db/dynamodb';

/**
 * 生成捐款主键
 */
export function createDonationKey(donationId: string): { PK: string; SK: string } {
  return createEntityKey('DONATION', donationId);
}

/**
 * 生成用户捐款索引键
 */
export function createUserDonationIndexKey(userId: string, createdAt: string): { PK: string; SK: string } {
  return {
    PK: `USER#${userId}`,
    SK: `DONATION#${createdAt}`,
  };
}

/**
 * 生成公开捐款键
 */
export function createPublicDonationKey(createdAt: string): { PK: string; SK: string } {
  return {
    PK: 'PUBLIC_DONATION',
    SK#${createdAt: `TIMESTAMP}`,
  };
}

/**
 * 生成统计键
 */
export function createDonationStatsKey(date: string): { PK: string; SK: string } {
  return {
    PK: `STATS#${date}`,
    SK: 'DAILY',
  };
}

/**
 * 生成金额范围
 */
export function getAmountRange(amount: number): '2-5' | '6-10' | '11-20' | '21+' {
  if (amount <= 5) return '2-5';
  if (amount <= 10) return '6-10';
  if (amount <= 20) return '11-20';
  return '21+';
}
```

---

## 三、业务逻辑实现

### 3.1 捐款服务

```typescript
// src/modules/donations/donations.service.ts
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { logger } from '@core/logger';
import {
  Donation,
  DonationType,
  PaymentMethod,
  DonationPaymentStatus,
  PresetAmountLabel,
  CreateDonationDto,
  DonationQueryParams,
  UserDonationIndex,
  PublicDonation,
  DonationDailyStats,
  createDonationKey,
  createUserDonationIndexKey,
  createPublicDonationKey,
  createDonationStatsKey,
  getAmountRange,
} from './donations.types';
import { putItem, getItem, queryItems, updateItem, batchGetItems } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache, CacheKeys } from '@shared/db/cache';
import { sendEmail } from '@shared/smtp';

/**
 * 预设金额配置
 */
const PRESET_AMOUNTS = {
  [PresetAmountLabel.COFFEE]: 2,
  [PresetAmountLabel.BOOK]: 5,
  [PresetAmountLabel.GIFT]: 10,
  [PresetAmountLabel.STAR]: 20,
  [PresetAmountLabel.SPONSOR]: 50,
};

/**
 * 金额限制配置
 */
const DONATION_LIMITS = {
  MIN_AMOUNT: 1,
  MAX_SUGGESTED: 100,
  DAILY_MAX: 200,
  DAILY_COUNT_LIMIT: 3,
};

/**
 * 捐款服务类
 */
export class DonationService {
  /**
   * 创建捐款记录
   */
  async createDonation(userId: string, dto: CreateDonationDto): Promise<Donation> {
    const { amount, paymentMethod, isAnonymous = true, showNickname = false, subscribeEmail = false } = dto;

    // 验证金额
    if (amount < DONATION_LIMITS.MIN_AMOUNT) {
      throw new Error(`Minimum donation amount is $${DONATION_LIMITS.MIN_AMOUNT} NZD`);
    }

    // 检查频率限制（同一用户每天最多捐款3次）
    const dailyCount = await this.getUserDailyDonationCount(userId);
    if (dailyCount >= DONATION_LIMITS.DAILY_COUNT_LIMIT) {
      throw new Error(`Daily donation limit reached (${DONATION_LIMITS.DAILY_COUNT_LIMIT} per day)`);
    }

    // 检查每日金额上限
    const dailyAmount = await this.getUserDailyDonationAmount(userId);
    if (dailyAmount + amount > DONATION_LIMITS.DAILY_MAX) {
      throw new Error(`Daily donation limit exceeded ($${DONATION_LIMITS.DAILY_MAX} NZD per day)`);
    }

    // 生成捐款编号
    const donationId = this.generateDonationId();
    const now = new Date().toISOString();

    // 构建银行转账参考号
    const bankReference = paymentMethod === PaymentMethod.BANK_TRANSFER
      ? this.generateBankReference(donationId)
      : undefined;

    // 创建捐款记录
    const donation: Donation = {
      ...createDonationKey(donationId),
      entityType: 'DONATION',
      dataCategory: 'DONATION',
      id: donationId,
      userId,
      amount,
      currency: 'NZD',
      donationType: DonationType.ONE_TIME,
      presetAmountLabel: dto.presetAmountLabel,
      customAmount: dto.customAmount || false,
      paymentMethod,
      paymentStatus: DonationPaymentStatus.PENDING,
      bankReference,
      isAnonymous,
      showNickname,
      thankYouSent: false,
      subscribeEmail,
      createdAt: now,
      updatedAt: now,
      GSI8PK: `USER#${userId}`,
      GSI8SK: `DONATION#${now}`,
      GSI9PK: `STATUS#${DonationPaymentStatus.PENDING}`,
      GSI9SK: `CREATED_AT#${now}`,
    };

    // 保存捐款记录
    await putItem(donation);

    // 创建用户捐款索引
    const userDonationIndex: UserDonationIndex = {
      ...createUserDonationIndexKey(userId, now),
      entityType: 'DONATION_INDEX',
      dataCategory: 'DONATION',
      id: uuidv4(),
      donationId,
      amount,
      paymentStatus: DonationPaymentStatus.PENDING,
      createdAt: now,
    };
    await putItem(userDonationIndex);

    logger.info('Donation created', { donationId, userId, amount, paymentMethod });

    return donation;
  }

  /**
   * 获取用户捐款列表
   */
  async getUserDonations(userId: string, params: DonationQueryParams = {}): Promise<{
    donations: Donation[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page = 1, limit = 10, status, startDate, endDate } = params;

    // 构建查询条件
    const keyConditionExpression = 'PK = :pk AND begins_with(SK, :sk)';
    const expressionAttributeValues: Record<string, unknown> = {
      ':pk': `USER#${userId}`,
      ':sk': 'DONATION#',
    };

    if (status) {
      // 需要使用索引查询
      const result = await queryItems<Donation>({
        indexName: 'GSI8-UserDonations',
        keyConditionExpression: 'GSI8PK = :pk AND begins_with(GSI8SK, :sk)',
        expressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'DONATION#',
        },
        limit: limit * 2, // Fetch extra for filtering
      });

      // 按状态过滤
      let filtered = result.items;
      if (status) {
        filtered = filtered.filter(d => d.paymentStatus === status);
      }

      // 分页
      const startIndex = (page - 1) * limit;
      const paginatedItems = filtered.slice(startIndex, startIndex + limit);

      return {
        donations: paginatedItems,
        pagination: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit),
        },
      };
    }

    // 默认查询
    const result = await queryItems<Donation>({
      indexName: 'GSI8-UserDonations',
      keyConditionExpression,
      expressionAttributeValues,
      limit: limit * 2,
      scanIndexForward: false, // 按时间倒序
    });

    // 分页
    const startIndex = (page - 1) * limit;
    const paginatedItems = result.items.slice(startIndex, startIndex + limit);

    return {
      donations: paginatedItems,
      pagination: {
        page,
        limit,
        total: result.items.length,
        totalPages: Math.ceil(result.items.length / limit),
      },
    };
  }

  /**
   * 获取捐款详情
   */
  async getDonationById(donationId: string): Promise<Donation | null> {
    const { PK, SK } = createDonationKey(donationId);
    return getItem<Donation>({ PK, SK });
  }

  /**
   * 确认捐款到账（管理员）
   */
  async confirmDonation(donationId: string, adminId: string): Promise<Donation> {
    const donation = await this.getDonationById(donationId);
    if (!donation) {
      throw new Error('Donation not found');
    }

    if (donation.paymentStatus !== DonationPaymentStatus.PENDING) {
      throw new Error('Donation is not pending');
    }

    const now = new Date().toISOString();

    // 更新捐款状态
    const updated = await updateItem(
      createDonationKey(donationId),
      'SET paymentStatus = :status, confirmedAt = :confirmedAt, confirmedBy = :adminId, updatedAt = :now',
      {
        ':status': DonationPaymentStatus.COMPLETED,
        ':confirmedAt': now,
        ':adminId': adminId,
        ':now': now,
      }
    ) as Donation;

    // 更新统计
    await this.updateDailyStats(donation.amount, donation.paymentMethod, donation.isAnonymous);

    // 如果非匿名且选择公开，创建公开记录
    if (!donation.isAnonymous) {
      await this.createPublicDonationRecord(donation);
    }

    // 发送感谢邮件
    if (donation.subscribeEmail || !donation.isAnonymous) {
      await this.sendThankYouEmail(updated);
    }

    // 清除缓存
    await deleteCache(`donation:${donationId}`, 'DONATION');
    await deleteCache('donation:public:list', 'DONATION');

    logger.info('Donation confirmed', { donationId, adminId });

    return updated;
  }

  /**
   * 获取公开捐款名单
   */
  async getPublicDonationList(): Promise<{
    totalDonations: number;
    totalAmount: number;
    donations: Array<{ nickname?: string; amountRange: string; displayedAt: string }>;
  }> {
    // 尝试从缓存获取
    const cached = await getFromCache<{
      totalDonations: number;
      totalAmount: number;
      donations: Array<{ nickname?: string; amountRange: string; displayedAt: string }>;
    }>('donation:public:list', 'DONATION');
    if (cached) {
      return cached;
    }

    // 查询最近30天的公开捐款
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    const result = await queryItems<PublicDonation>({
      indexName: 'GSI9-StatusIndex',
      keyConditionExpression: 'GSI9PK = :pk AND GSI9SK >= :sk',
      expressionAttributeValues: {
        ':pk': 'PUBLIC_DONATION',
        ':sk': `TIMESTAMP#${cutoffDate}`,
      },
      limit: 100,
      scanIndexForward: false,
    });

    const visibleDonations = result.items.filter(d => d.isVisible && new Date(d.expiresAt) > new Date());

    const totalAmount = visibleDonations.reduce((sum, d) => sum + d.amount, 0);

    const data = {
      totalDonations: visibleDonations.length,
      totalAmount,
      donations: visibleDonations.map(d => ({
        nickname: d.displayNickname,
        amountRange: d.amountRange,
        displayedAt: d.displayedAt,
      })),
    };

    // 缓存5分钟
    await setCache('donation:public:list', 'DONATION', data, 300);

    return data;
  }

  /**
   * 获取捐款统计数据
   */
  async getDonationStats(months: number = 12): Promise<{
    overview: {
      totalDonations: number;
      totalAmount: number;
      uniqueDonors: number;
      averageDonation: number;
    };
    byMonth: Array<{ month: string; count: number; amount: number }>;
    byPaymentMethod: Array<{ method: string; count: number; amount: number }>;
  }> {
    const now = new Date();
    const stats: Array<{ month: string; count: number; amount: number }> = [];
    const paymentMethodStats = new Map<string, { count: number; amount: number }>();

    let uniqueDonors = new Set<string>();
    let totalDonations = 0;
    let totalAmount = 0;

    // 获取最近月份的统计数据
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dateStr = date.toISOString().split('T')[0];

      const { PK, SK } = createDonationStatsKey(dateStr);
      const dailyStats = await getItem<DonationDailyStats>({ PK, SK });

      if (dailyStats) {
        const monthKey = dateStr.substring(0, 7);
        const existing = stats.find(s => s.month === monthKey);
        if (existing) {
          existing.count += dailyStats.totalCount;
          existing.amount += dailyStats.totalAmount;
        } else {
          stats.push({
            month: monthKey,
            count: dailyStats.totalCount,
            amount: dailyStats.totalAmount,
          });
        }

        totalDonations += dailyStats.totalCount;
        totalAmount += dailyStats.totalAmount;
        uniqueDonors.add(dailyStats.uniqueDonors.toString());

        // 累计支付方式统计
        for (const [method, amount] of [
          ['poli', dailyStats.poliAmount],
          ['bank_transfer', dailyStats.bankTransferAmount],
          ['credit_card', dailyStats.creditCardAmount],
          ['paypal', dailyStats.paypalAmount],
        ] as const) {
          const existingStats = paymentMethodStats.get(method) || { count: 0, amount: 0 };
          paymentMethodStats.set(method, {
            count: existingStats.count + dailyStats[`${method}Count` as keyof DonationDailyStats] as number,
            amount: existingStats.amount + amount,
          });
        }
      }
    }

    return {
      overview: {
        totalDonations,
        totalAmount,
        uniqueDonors: uniqueDonors.size,
        averageDonation: totalDonations > 0 ? totalAmount / totalDonations : 0,
      },
      byMonth: stats.reverse(),
      byPaymentMethod: Array.from(paymentMethodStats.entries()).map(([method, stats]) => ({
        method,
        count: stats.count,
        amount: stats.amount,
      })),
    };
  }

  /**
   * 处理支付回调
   */
  async handlePaymentCallback(donationId: string, paymentResult: {
    success: boolean;
    transactionId?: string;
    error?: string;
  }): Promise<void> {
    const donation = await this.getDonationById(donationId);
    if (!donation) {
      throw new Error('Donation not found');
    }

    const now = new Date().toISOString();

    if (paymentResult.success) {
      await updateItem(
        createDonationKey(donationId),
        'SET paymentStatus = :status, paymentReference = :ref, updatedAt = :now',
        {
          ':status': DonationPaymentStatus.COMPLETED,
          ':ref': paymentResult.transactionId,
          ':now': now,
        }
      );

      // 更新统计
      await this.updateDailyStats(donation.amount, donation.paymentMethod, donation.isAnonymous);

      // 如果非匿名，创建公开记录
      if (!donation.isAnonymous) {
        await this.createPublicDonationRecord(donation);
      }

      // 发送感谢邮件
      if (donation.subscribeEmail || !donation.isAnonymous) {
        await this.sendThankYouEmail({
          ...donation,
          paymentStatus: DonationPaymentStatus.COMPLETED,
        });
      }

      logger.info('Payment confirmed', { donationId, transactionId: paymentResult.transactionId });
    } else {
      await updateItem(
        createDonationKey(donationId),
        'SET paymentStatus = :status, updatedAt = :now',
        {
          ':status': DonationPaymentStatus.FAILED,
          ':now': now,
        }
      );

      logger.error('Payment failed', { donationId, error: paymentResult.error });
    }

    // 清除缓存
    await deleteCache(`donation:${donationId}`, 'DONATION');
  }

  // ============ 私有方法 ============

  /**
   * 生成捐款编号
   */
  private generateDonationId(): string {
    const date = new Date();
    const year = date.getFullYear();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `DNR-${year}-${random}`;
  }

  /**
   * 生成银行转账参考号
   */
  private generateBankReference(donationId: string): string {
    return donationId.replace('DNR-', 'REF-');
  }

  /**
   * 获取用户当日捐款次数
   */
  private async getUserDailyDonationCount(userId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const result = await queryItems<Donation>({
      indexName: 'GSI8-UserDonations',
      keyConditionExpression: 'GSI8PK = :pk AND begins_with(GSI8SK, :sk)',
      expressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': `DONATION#${today}`,
      },
    });
    return result.items.filter(d => d.createdAt.startsWith(today)).length;
  }

  /**
   * 获取用户当日捐款金额
   */
  private async getUserDailyDonationAmount(userId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const result = await queryItems<Donation>({
      indexName: 'GSI8-UserDonations',
      keyConditionExpression: 'GSI8PK = :pk AND begins_with(GSI8SK, :sk)',
      expressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': `DONATION#${today}`,
      },
    });
    return result.items
      .filter(d => d.createdAt.startsWith(today) && d.paymentStatus === DonationPaymentStatus.COMPLETED)
      .reduce((sum, d) => sum + d.amount, 0);
  }

  /**
   * 更新每日统计
   */
  private async updateDailyStats(
    amount: number,
    paymentMethod: PaymentMethod,
    isAnonymous: boolean
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const { PK, SK } = createDonationStatsKey(today);

    const existing = await getItem<DonationDailyStats>({ PK, SK });

    const updateFields: Record<string, unknown> = {
      ':totalCount': 1,
      ':totalAmount': amount,
      ':uniqueDonors': 1,
      ':averageAmount': amount,
      ':poliCount': paymentMethod === PaymentMethod.POLI ? 1 : 0,
      ':poliAmount': paymentMethod === PaymentMethod.POLI ? amount : 0,
      ':bankTransferCount': paymentMethod === PaymentMethod.BANK_TRANSFER ? 1 : 0,
      ':bankTransferAmount': paymentMethod === PaymentMethod.BANK_TRANSFER ? amount : 0,
      ':creditCardCount': paymentMethod === PaymentMethod.CREDIT_CARD ? 1 : 0,
      ':creditCardAmount': paymentMethod === PaymentMethod.CREDIT_CARD ? amount : 0,
      ':paypalCount': paymentMethod === PaymentMethod.PAYPAL ? 1 : 0,
      ':paypalAmount': paymentMethod === PaymentMethod.PAYPAL ? amount : 0,
      ':anonymousCount': isAnonymous ? 1 : 0,
      ':publicCount': isAnonymous ? 0 : 1,
    };

    if (existing) {
      // 更新现有统计
      await updateItem(
        { PK, SK },
        `SET totalCount = totalCount + :totalCount,
               totalAmount = totalAmount + :totalAmount,
               averageAmount = (totalAmount + :totalAmount) / (totalCount + :totalCount),
               poliCount = poliCount + :poliCount,
               poliAmount = poliAmount + :poliAmount,
               bankTransferCount = bankTransferCount + :bankTransferCount,
               bankTransferAmount = bankTransferAmount + :bankTransferAmount,
               creditCardCount = creditCardCount + :creditCardCount,
               creditCardAmount = creditCardAmount + :creditCardAmount,
               paypalCount = paypalCount + :paypalCount,
               paypalAmount = paypalAmount + :paypalAmount,
               anonymousCount = anonymousCount + :anonymousCount,
               publicCount = publicCount + :publicCount,
               updatedAt = :now`,
        {
          ...updateFields,
          ':now': new Date().toISOString(),
        }
      );
    } else {
      // 创建新统计记录
      const newStats: DonationDailyStats = {
        PK,
        SK,
        entityType: 'DONATION_STATS',
        dataCategory: 'ANALYTICS',
        id: uuidv4(),
        statDate: today,
        totalCount: 1,
        totalAmount: amount,
        uniqueDonors: 1,
        averageAmount: amount,
        poliCount: paymentMethod === PaymentMethod.POLI ? 1 : 0,
        poliAmount: paymentMethod === PaymentMethod.POLI ? amount : 0,
        bankTransferCount: paymentMethod === PaymentMethod.BANK_TRANSFER ? 1 : 0,
        bankTransferAmount: paymentMethod === PaymentMethod.BANK_TRANSFER ? amount : 0,
        creditCardCount: paymentMethod === PaymentMethod.CREDIT_CARD ? 1 : 0,
        creditCardAmount: paymentMethod === PaymentMethod.CREDIT_CARD ? amount : 0,
        paypalCount: paymentMethod === PaymentMethod.PAYPAL ? 1 : 0,
        paypalAmount: paymentMethod === PaymentMethod.PAYPAL ? amount : 0,
        anonymousCount: isAnonymous ? 1 : 0,
        publicCount: isAnonymous ? 0 : 1,
        updatedAt: new Date().toISOString(),
      };
      await putItem(newStats);
    }
  }

  /**
   * 创建公开捐款记录
   */
  private async createPublicDonationRecord(donation: Donation): Promise<void> {
    const now = new Date().toISOString();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const publicDonation: PublicDonation = {
      ...createPublicDonationKey(now),
      entityType: 'PUBLIC_DONATION',
      dataCategory: 'DONATION',
      id: uuidv4(),
      donationId: donation.id,
      displayNickname: donation.showNickname ? donation.displayNickname : undefined,
      amount: donation.amount,
      amountRange: getAmountRange(donation.amount),
      isVisible: true,
      displayedAt: now,
      expiresAt: expiresAt.toISOString(),
      createdAt: now,
    };

    await putItem(publicDonation);

    // 清除公开名单缓存
    await deleteCache('donation:public:list', 'DONATION');
  }

  /**
   * 发送感谢邮件
   */
  private async sendThankYouEmail(donation: Donation): Promise<void> {
    if (donation.thankYouSent) return;

    const subject = 'Thank you for your donation to EduSearch NZ';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1890ff;">Thank you for your donation! 🌟</h1>
        <p>Dear supporter,</p>
        <p>We are deeply grateful for your generous donation of <strong>$${donation.amount.toFixed(2)} NZD</strong>.</p>
        <p>Your support helps us:</p>
        <ul>
          <li>Continue improving our platform</li>
          <li>Cover server and operational costs</li>
          <li>Provide quality educational resources for more families in New Zealand</p>
        <p>Donation Reference: <strong>${donation.id}</strong></p>
        <hr />
        <p style="color: #666; font-size: 12px;">
          This donation supports the operation and development of EduSearch NZ platform.
          While we are not a registered charity, we are committed to using these funds
          to improve our services for the benefit of families in New Zealand.
        </p>
      </div>
    `;

    try {
      await sendEmail({
        to: donation.userEmail || '',
        subject,
        html,
      });

      // 更新发送状态
      await updateItem(
        createDonationKey(donation.id),
        'SET thankYouSent = true, thankYouSentAt = :now, updatedAt = :now',
        { ':now': new Date().toISOString() }
      );

      logger.info('Thank you email sent', { donationId: donation.id });
    } catch (error) {
      logger.error('Failed to send thank you email', { donationId: donation.id, error });
    }
  }
}

export const donationService = new DonationService();
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| **捐款操作** |
| POST | /api/v1/donations | 创建捐款 | 用户发起捐款 |
| GET | /api/v1/donations/my | 获取我的捐款 | 用户历史记录 |
| GET | /api/v1/donations/:id | 获取捐款详情 | 查看单笔记录 |
| **管理操作** |
| POST | /api/v1/donations/:id/confirm | 确认捐款到账 | 管理员操作 |
| POST | /api/v1/donations/:id/cancel | 取消捐款 | 用户取消 |
| **公开接口** |
| GET | /api/v1/donations/public/list | 获取公开名单 | 公开捐款展示 |
| GET | /api/v1/donations/stats | 获取统计数据 | 平台统计 |

### 4.2 路由配置

```typescript
// src/modules/donations/donations.routes.ts
import { Router } from 'express';
import { donationController } from './donations.controller';
import { authenticate, optionalAuth } from '@shared/middleware/auth';

const router = Router();

// 用户捐款操作（需要登录）
router.post('/', authenticate, donationController.createDonation);
router.get('/my', authenticate, donationController.getMyDonations);
router.get('/:id', authenticate, donationControllerId);

// 公开.getDonationBy接口（无需登录）
router.get('/public/list', donationController.getPublicDonationList);
router.get('/stats', donationController.getDonationStats);

// 管理员操作
router.post('/:id/confirm', authenticate, donationController.confirmDonation);
router.post('/:id/cancel', authenticate, donationController.cancelDonation);

export default router;
```

### 4.3 API 详细设计

#### 4.3.1 POST /api/v1/donations

**请求头**: Authorization: Bearer \<token\>

**请求示例**:
```json
{
  "amount": 10,
  "paymentMethod": "poli",
  "isAnonymous": true,
  "showNickname": false,
  "subscribeEmail": true
}
```

**响应示例** (201):
```json
{
  "success": true,
  "data": {
    "donationId": "DNR-2026-A1B2C3D4",
    "amount": 10.00,
    "currency": "NZD",
    "paymentInfo": {
      "paymentMethod": "poli",
      "paymentUrl": "https://poli.merchant.com/pay/DNR-2026-A1B2C3D4",
      "expiresAt": "2026-01-21T16:30:00Z"
    },
    "bankReference": "REF-2026-A1B2C3D4"
  }
}
```

#### 4.3.2 GET /api/v1/donations/my

**请求头**: Authorization: Bearer \<token\>

**请求参数**:
- `page`: 页码，默认1
- `limit`: 每页数量，默认10
- `status`: 状态筛选 (pending, completed, failed)

**响应示例** (200):
```json
{
  "success": true,
  "data": {
    "donations": [
      {
        "id": "DNR-2026-A1B2C3D4",
        "amount": 10.00,
        "currency": "NZD",
        "paymentMethod": "poli",
        "paymentStatus": "completed",
        "isAnonymous": true,
        "createdAt": "2026-01-21T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

#### 4.3.3 GET /api/v1/donations/public/list

**响应示例** (200):
```json
{
  "success": true,
  "data": {
    "totalDonations": 150,
    "totalAmount": 1250.00,
    "donations": [
      {
        "nickname": "热心家长",
        "amountRange": "6-10",
        "displayedAt": "2026-01-21T14:00:00Z"
      },
      {
        "nickname": "感谢",
        "amountRange": "2-5",
        "displayedAt": "2026-01-20T09:30:00Z"
      }
    ]
  }
}
```

#### 4.3.4 GET /api/v1/donations/stats

**响应示例** (200):
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalDonations": 150,
      "totalAmount": 1250.00,
      "uniqueDonors": 120,
      "averageDonation": 10.42
    },
    "byMonth": [
      {
        "month": "2026-01",
        "count": 45,
        "amount": 425.00
      }
    ],
    "byPaymentMethod": [
      {
        "method": "poli",
        "count": 100,
        "amount": 850.00
      },
      {
        "method": "bank_transfer",
        "count": 30,
        "amount": 250.00
      }
    ]
  }
}
```

---

## 五、前端实现

### 5.1 捐款页面组件

```typescript
// src/components/donation/DonationPage.tsx
import React, { useState } from 'react';
import { Button, Card, InputNumber, Radio, Checkbox, message, Spin } from 'antd';
import { DollarOutlined, HeartOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { donationApi } from '../../api/donation';
import { PaymentMethod, PresetAmountLabel } from '../../types/donation';
import { DonationAmount } from './DonationAmount';
import { PaymentMethodSelect } from './PaymentMethod';
import { BankTransferInfo } from './BankTransferInfo';
import { ThankYouPage } from './ThankYouPage';

interface DonationPageProps {
  onSuccess?: () => void;
}

type Step = 'amount' | 'payment' | 'confirmation';

export const DonationPage: React.FC<DonationPageProps> = ({ onSuccess }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('amount');
  const [loading, setLoading] = useState(false);
  const [donationResult, setDonationResult] = useState<{
    id: string;
    amount: number;
    paymentUrl?: string;
    bankReference?: string;
  } | null>(null);

  // 表单状态
  const [amount, setAmount] = useState<number>(10);
  const [presetLabel, setPresetLabel] = useState<PresetAmountLabel | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.POLI);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [showNickname, setShowNickname] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState(true);

  const presetAmounts = [
    { label: `${t('donation.coffee')} $2`, value: 2, icon: '☕' },
    { label: `${t('donation.book')} $5`, value: 5, icon: '📚' },
    { label: `${t('donation.gift')} $10`, value: 10, icon: '🎁' },
    { label: `${t('donation.star')} $20`, value: 20, icon: '🌟' },
    { label: `${t('donation.sponsor')} $50`, value: 50, icon: '🏆' },
  ];

  const handleAmountSelect = (value: number, label?: PresetAmountLabel) => {
    setAmount(value);
    setPresetLabel(label);
  };

  const handleCustomAmount = (value: number | null) => {
    if (value && value >= 1) {
      setAmount(value);
      setPresetLabel(undefined);
    }
  };

  const handleSubmit = async () => {
    if (amount < 1) {
      message.error(t('donation.minAmountError'));
      return;
    }

    setLoading(true);
    try {
      const response = await donationApi.createDonation({
        amount,
        paymentMethod,
        isAnonymous,
        showNickname,
        subscribeEmail,
        presetAmountLabel: presetLabel,
        customAmount: !presetLabel,
      });

      setDonationResult(response.data);

      if (paymentMethod === PaymentMethod.BANK_TRANSFER) {
        setStep('confirmation');
      } else if (response.data.paymentUrl) {
        // 跳转到支付页面
        window.location.href = response.data.paymentUrl;
      }
    } catch (error: any) {
      message.error(error.message || t('donation.createError'));
    } finally {
      setLoading(false);
    }
  };

  // 感谢页面
  if (step === 'confirmation' && donationResult) {
    return (
      <ThankYouPage
        donation={donationResult}
        paymentMethod={paymentMethod}
        onBack={() => setStep('amount')}
      />
    );
  }

  return (
    <div className="donation-page">
      <Card className="donation-card">
        <div className="donation-header">
          <HeartOutlined className="heart-icon" />
          <h2>{t('donation.title')}</h2>
          <p>{t('donation.subtitle')}</p>
        </div>

        {/* 步骤1: 金额选择 */}
        {step === 'amount' && (
          <div className="donation-step">
            <h3>{t('donation.selectAmount')}</h3>

            <div className="preset-amounts">
              {presetAmounts.map((item) => (
                <Button
                  key={item.value}
                  type={amount === item.value && !presetLabel ? 'primary' : 'default'}
                  className="preset-btn"
                  onClick={() => handleAmountSelect(item.value)}
                >
                  <span className="icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Button>
              ))}
            </div>

            <div className="custom-amount">
              <label>{t('donation.customAmount')}</label>
              <InputNumber
                prefix="$"
                suffix="NZD"
                value={amount}
                onChange={handleCustomAmount}
                min={1}
                max={1000}
                className="amount-input"
              />
            </div>

            {amount > 100 && (
              <div className="amount-warning">
                <CheckCircleOutlined /> {t('donation.amountWarning')}
              </div>
            )}

            <Button
              type="primary"
              size="large"
              block
              onClick={() => setStep('payment')}
              disabled={amount < 1}
            >
              {t('donation.next')}
            </Button>
          </div>
        )}

        {/* 步骤2: 支付方式 */}
        {step === 'payment' && (
          <div className="donation-step">
            <h3>{t('donation.selectPayment')}</h3>

            <PaymentMethodSelect
              value={paymentMethod}
              onChange={setPaymentMethod}
            />

            <div className="privacy-settings">
              <h4>{t('donation.privacySettings')}</h4>

              <Checkbox
                checked={isAnonymous}
                onChange={(e) => {
                  setIsAnonymous(e.target.checked);
                  if (e.target.checked) setShowNickname(false);
                }}
              >
                {t('donation.anonymous')}
              </Checkbox>

              {!isAnonymous && (
                <Checkbox
                  checked={showNickname}
                  onChange={(e) => setShowNickname(e.target.checked)}
                >
                  {t('donation.showNickname')}
                </Checkbox>
              )}

              <Checkbox
                checked={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.checked)}
              >
                {t('donation.subscribeEmail')}
              </Checkbox>
            </div>

            <div className="donation-summary">
              <div className="total">
                <span>{t('donation.total')}</span>
                <span className="amount">${amount.toFixed(2)} NZD</span>
              </div>
            </div>

            <div className="action-buttons">
              <Button onClick={() => setStep('amount')}>
                {t('donation.back')}
              </Button>
              <Button
                type="primary"
                size="large"
                loading={loading}
                onClick={handleSubmit}
              >
                <DollarOutlined /> {t('donation.confirm')}
              </Button>
            </div>

            <p className="disclaimer">
              <CheckCircleOutlined /> {t('donation.disclaimer')}
            </p>
          </div>
        )}
      </Card>

      <style>{`
        .donation-page {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .donation-card {
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .donation-header {
          text-align: center;
          margin-bottom: 24px;
        }
        .heart-icon {
          font-size: 48px;
          color: #ff4d4f;
          margin-bottom: 16px;
        }
        .donation-header h2 {
          margin: 0;
          color: #1890ff;
        }
        .preset-amounts {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        .preset-btn {
          height: 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .preset-btn .icon {
          font-size: 20px;
        }
        .custom-amount {
          margin-bottom: 24px;
        }
        .custom-amount label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }
        .amount-input {
          width: 100%;
        }
        .amount-warning {
          color: #faad14;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .privacy-settings {
          margin: 24px 0;
          padding: 16px;
          background: #f5f5f5;
          border-radius: 8px;
        }
        .privacy-settings h4 {
          margin-bottom: 12px;
        }
        .privacy-settings .ant-checkbox-wrapper {
          display: block;
          margin-bottom: 8px;
        }
        .donation-summary {
          margin: 24px 0;
          padding: 16px;
          background: #e6f7ff;
          border-radius: 8px;
        }
        .donation-summary .total {
          display: flex;
          justify-content: space-between;
          font-size: 18px;
          font-weight: 600;
        }
        .donation-summary .amount {
          color: #1890ff;
        }
        .action-buttons {
          display: flex;
          gap: 12px;
        }
        .action-buttons button {
          flex: 1;
        }
        .disclaimer {
          margin-top: 16px;
          font-size: 12px;
          color: #999;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
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
// src/modules/donations/donations.service.test.ts
import { donationService } from './donations.service';
import { mockPutItem, mockGetItem, mockQueryItems } from '../../test/mocks';

// Mock DynamoDB
jest.mock('@shared/db/dynamodb', () => ({
  putItem: jest.fn(),
  getItem: jest.fn(),
  queryItems: jest.fn(),
  updateItem: jest.fn(),
}));

import { putItem, getItem, queryItems, updateItem } from '@shared/db/dynamodb';

describe('DonationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createDonation', () => {
    it('should create donation successfully', async () => {
      const userId = 'user-123';
      const dto = {
        amount: 10,
        paymentMethod: 'poli' as const,
        isAnonymous: true,
      };

      (putItem as jest.Mock).mockResolvedValue({});

      const result = await donationService.createDonation(userId, dto);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.amount).toBe(10);
      expect(result.paymentStatus).toBe('pending');
      expect(putItem).toHaveBeenCalled();
    });

    it('should reject amount below minimum', async () => {
      const userId = 'user-123';
      const dto = {
        amount: 0.5,
        paymentMethod: 'poli' as const,
      };

      await expect(donationService.createDonation(userId, dto))
        .rejects.toThrow('Minimum donation amount is $1 NZD');
    });

    it('should reject when daily limit exceeded', async () => {
      const userId = 'user-123';
      const dto = {
        amount: 300,
        paymentMethod: 'poli' as const,
      };

      // Mock daily limit exceeded
      (queryItems as jest.Mock).mockResolvedValue({
        items: [
          { amount: 100, paymentStatus: 'completed', createdAt: new Date().toISOString() },
          { amount: 100, paymentStatus: 'completed', createdAt: new Date().toISOString() },
        ],
      });

      await expect(donationService.createDonation(userId, dto))
        .rejects.toThrow('Daily donation limit exceeded');
    });
  });

  describe('getPublicDonationList', () => {
    it('should return public donations', async () => {
      const mockPublicDonations = [
        {
          id: 'pub-1',
          donationId: 'DNR-2026-001',
          displayNickname: '热心家长',
          amount: 10,
          amountRange: '6-10',
          isVisible: true,
          displayedAt: '2026-01-21T14:00:00Z',
          expiresAt: '2026-02-20T14:00:00Z',
        },
      ];

      (queryItems as jest.Mock).mockResolvedValue({
        items: mockPublicDonations,
      });

      const result = await donationService.getPublicDonationList();

      expect(result.totalDonations).toBe(1);
      expect(result.totalAmount).toBe(10);
      expect(result.donations[0].nickname).toBe('热心家长');
    });
  });
});
```

---

## 七、验收标准

- [ ] 捐款创建成功，返回正确的捐款编号
- [ ] 金额验证正确（最低$1，最高$100建议）
- [ ] 频率限制生效（每天最多3次）
- [ ] POLi支付流程顺畅
- [ ] 银行转账功能正常，显示参考号
- [ ] 感谢邮件正确发送
- [ ] 隐私设置生效（匿名/公开）
- [ ] 公开名单正确展示
- [ ] 我的捐款记录可查看
- [ ] 管理后台可确认捐款
- [ ] 统计数据准确
- [ ] 安全测试通过

---

## 八、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 法律合规风险 | 中 | 高 | 明确免责声明，使用"支持"而非"捐赠"措辞 |
| 支付安全问题 | 低 | 高 | 使用合规支付网关，PCI DSS合规 |
| 隐私泄露风险 | 低 | 高 | 默认匿名，数据加密 |
| 频率限制绕过 | 低 | 中 | 后端严格验证，IP限制 |
| 金额篡改攻击 | 低 | 高 | 后端验证金额与预设一致 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/phase-2/tech-donations.md`

**相关文档**:
- [产品设计](../../05-product-design/growth/donations.md)
- [支付集成](../phase-3/tech-payments.md)
- [用户中心](tech-user-center.md)
- [通知系统](tech-notifications.md)
