---
title: 技术实现 - Google Ads 广告系统
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 1
priority: P0
status: pending-implementation
related_feature: ../../05-product-design/ads/google-ads.md
---

# 技术实现: Google Ads 广告系统

> **对应产品文档**: [google-ads.md](../../05-product-design/ads/google-ads.md) | **优先级**: P0 | **排期**: Phase 1 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Google Ads 广告技术架构                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   │   └── Google AdSense Display Ads                                │
│   └── 微信小程序 (Taro)                                              │
│       └── Google Mobile Ads                                         │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── GET /api/v1/ads/display                                       │
│   └── GET /api/v1/ads/config                                        │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── AdService (广告配置服务)                                       │
│   ├── AdImpressionService (曝光服务)                                 │
│   └── AdAnalyticsService (分析服务)                                  │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   ├── DynamoDB (FindClass-MainTable)                                │
│   │   ├── AD_CONFIG#{configId}                                      │
│   │   ├── AD_IMPRESSION#{impressionId}                              │
│   │   └── AD_CLICK#{clickId}                                        │
│   └── DynamoDB (缓存)                                                │
│       ├── ad:config:{placement}                                     │
│       └── ad:stats:{date}                                           │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [外部服务]                                                         │
│   ├── Google AdSense API                                            │
│   ├── Google Analytics                                              │
│   └── S3 (广告素材存储)                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
06-tech-architecture/ads/
├── tech-google-ads.md                 # 本文档
└── anti-crawler-design.md             # 反爬虫设计

07-backend/src/modules/ads/
├── ads.types.ts                       # 类型定义
├── ads.service.ts                     # 广告服务
├── ads.controller.ts                  # 广告API控制器
├── ads.routes.ts                      # 广告路由
├── ad-impression.service.ts           # 曝光服务
├── ad-click.service.ts                # 点击服务
├── ad-analytics.service.ts            # 分析服务
└── index.ts                           # 模块导出

07-backend/src/lib/ads/
├── google-adsense.ts                  # Google AdSense 集成
├── google-analytics.ts                # Google Analytics 集成
└── ad-config.ts                       # 广告配置管理
```

---

## 二、数据模型设计 (DynamoDB)

### 2.1 广告配置

```typescript
// src/modules/ads/ads.types.ts

/**
 * 广告位置
 */
export enum AdPlacement {
  HEADER = 'header',
  SIDEBAR = 'sidebar',
  BANNER = 'banner',
  INTERSTITIAL = 'interstitial',
  FOOTER = 'footer',
  IN_FEED = 'in_feed',
}

/**
 * 广告尺寸
 */
export enum AdSize {
  RESPONSIVE = 'responsive',
  MEDIUM_RECTANGLE = '300x250',
  LEADERBOARD = '728x90',
  WIDE_SKYSCRAPER = '160x600',
  LARGE_RECTANGLE = '336x280',
  IN_FEED = 'native',
}

/**
 * 广告设备类型
 */
export enum AdDeviceType {
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  MOBILE = 'mobile',
  ALL = 'all',
}

/**
 * 广告展示规则
 */
export interface AdDisplayRule {
  minImpressionsPerUser?: number;      // 用户最小曝光次数后展示
  maxImpressionsPerDay?: number;        // 每天最大展示次数
  hideAfterClick?: boolean;             // 点击后隐藏
  hideAfterConversion?: boolean;        // 转化后隐藏
  excludePages?: string[];              // 排除页面
  targetPages?: string[];               // 目标页面（为空表示全部）
}

/**
 * 广告配置 DynamoDB 类型
 */
export interface AdConfig {
  // DynamoDB 主键
  PK: string;           // AD_CONFIG#{configId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'AD_CONFIG';
  dataCategory: 'ADS';
  id: string;
  
  // 基本信息
  name: string;
  description?: string;
  placement: AdPlacement;
  size: AdSize;
  deviceType: AdDeviceType;
  
  // Google Ads 配置
  adUnitId: string;                         // AdSense 广告单元 ID
  adSlotId?: string;                        // 广告位 ID
  googleAdClient: string;                   // ca-pub-XXXXX
  
  // 展示规则
  displayRule: AdDisplayRule;
  priority: number;                         // 优先级（高优先级优先展示）
  
  // 状态
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  
  // 统计
  totalImpressions: number;
  totalClicks: number;
  totalRevenue: number;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI27PK?: string;  // PLACEMENT#{placement}
  GSI27SK?: string;  // PRIORITY#{priority}
}

/**
 * 广告位置配置
 */
export interface AdPlacementConfig {
  PK: string;           // PLACEMENT#{placement}
  SK: string;           // METADATA
  
  entityType: 'AD_PLACEMENT';
  dataCategory: 'ADS';
  id: string;
  
  placement: AdPlacement;
  pageType: string;                            // home, search, detail, etc.
  size: AdSize;
  
  // 配置的广告单元
  adConfigIds: string[];
  
  // 展示规则
  frequencyCap: number;                        // 每小时最大展示次数
  rotationEnabled: boolean;
  
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 2.2 广告曝光记录

```typescript
/**
 * 广告曝光 DynamoDB 类型
 */
export interface AdImpression {
  // DynamoDB 主键
  PK: string;           // AD_IMPRESSION#{impressionId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'AD_IMPRESSION';
  dataCategory: 'ADS';
  id: string;
  
  // 关联
  adConfigId: string;
  adUnitId: string;
  
  // 用户信息（可选，用于频次控制）
  userId?: string;
  sessionId?: string;
  
  // 上下文
  pageType: string;
  pageUrl: string;
  referrer?: string;
  
  // 设备信息
  deviceType: AdDeviceType;
  userAgent?: string;
  ipAddress?: string;
  
  // 地理位置（可选）
  country?: string;
  region?: string;
  
  // 时间
  displayedAt: string;
  
  // GSI 索引
  GSI28PK?: string;  // AD_CONFIG#{adConfigId}
  GSI28SK?: string;  // DISPLAYED_AT#{displayedAt}
  GSI29PK?: string;  // DATE#{date}
  GSI29SK?: string;  // HOUR#{hour}
}

/**
 * 广告点击记录
 */
export interface AdClick {
  // DynamoDB 主键
  PK: string;           // AD_CLICK#{clickId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'AD_CLICK';
  dataCategory: 'ADS';
  id: string;
  
  // 关联
  adConfigId: string;
  adUnitId: string;
  impressionId?: string;
  
  // 用户信息
  userId?: string;
  sessionId?: string;
  
  // 上下文
  pageType: string;
  pageUrl: string;
  clickPosition?: { x: number; y: number };
  
  // 设备信息
  deviceType: AdDeviceType;
  userAgent?: string;
  
  // 时间
  clickedAt: string;
  
  // 转化标记
  converted: boolean;
  convertedAt?: string;
  
  // GSI 索引
  GSI30PK?: string;  // AD_CONFIG#{adConfigId}
  GSI30SK?: string;  // CLICKED_AT#{clickedAt}
}
```

### 2.3 广告统计

```typescript
/**
 * 广告日统计
 */
export interface AdDailyStats {
  PK: string;           // AD_STATS#{adConfigId}
  SK: string;           // DATE#{date}
  
  entityType: 'AD_DAILY_STATS';
  dataCategory: 'ADS';
  id: string;
  
  adConfigId: string;
  date: string;
  
  // 曝光统计
  impressions: number;
  uniqueImpressions: number;
  
  // 点击统计
  clicks: number;
  uniqueClicks: number;
  
  // 收入统计
  revenue: number;
  ecpm: number;                    // 每千次展示收入
  
  // 转化统计
  conversions: number;
  conversionRate: number;
  
  // 设备分布
  deviceStats: {
    desktop: number;
    tablet: number;
    mobile: number;
  };
  
  // 时间戳
  calculatedAt: string;
}

/**
 * 广告位统计汇总
 */
export interface AdPlacementStats {
  PK: string;           // PLACEMENT_STATS#{placement}
  SK: string;           // DATE#{date}
  
  entityType: 'AD_PLACEMENT_STATS';
  dataCategory: 'ADS';
  id: string;
  
  placement: AdPlacement;
  date: string;
  
  impressions: number;
  clicks: number;
  revenue: number;
  
  calculatedAt: string;
}
```

---

## 三、业务逻辑实现

### 3.1 广告服务

```typescript
// src/modules/ads/ads.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  AdConfig,
  AdPlacementConfig,
  AdImpression,
  AdClick,
  AdDailyStats,
  AdPlacement,
  AdDeviceType,
  createAdConfigKey,
  createPlacementConfigKey,
  createImpressionKey,
  createClickKey,
} from './ads.types';
import { putItem, getItem, queryItems, updateItem } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache } from '@shared/db/cache';

/**
 * 广告服务类
 */
export class AdService {
  /**
   * 获取指定位置的广告配置
   */
  async getAdConfigForPlacement(
    placement: AdPlacement,
    pageType: string,
    deviceType: AdDeviceType,
    userId?: string
  ): Promise<AdConfig | null> {
    const cacheKey = `ad:config:${placement}:${pageType}:${deviceType}`;
    const cached = await getFromCache<AdConfig>(cacheKey, 'ADS');
    if (cached) return cached;

    // 获取该位置的活动配置
    const result = await queryItems<AdConfig>({
      indexName: 'GSI27-PlacementAds',
      keyConditionExpression: 'GSI27PK = :pk AND GSI27SK <= :maxPriority',
      expressionAttributeValues: {
        ':pk': `PLACEMENT#${placement}`,
        ':maxPriority': 'PRIORITY#999',
      },
      filterExpression: 'isActive = :active AND deviceType IN (:deviceType, :all)',
      expressionAttributeValues: {
        ':active': true,
        ':deviceType': deviceType,
        ':all': AdDeviceType.ALL,
      },
      limit: 10,
      scanIndexForward: false,  // 按优先级降序
    });

    // 应用展示规则过滤
    let availableAd = null;
    for (const config of result.items) {
      if (this.canDisplayAd(config, userId, pageType)) {
        availableAd = config;
        break;
      }
    }

    if (availableAd) {
      await setCache(cacheKey, 'ADS', availableAd, 300);
    }

    return availableAd;
  }

  /**
   * 检查是否可以展示广告
   */
  private canDisplayAd(config: AdConfig, userId?: string, pageType?: string): boolean {
    // 检查页面规则
    if (config.displayRule.excludePages?.includes(pageType || '')) {
      return false;
    }
    if (config.displayRule.targetPages?.length && !config.displayRule.targetPages.includes(pageType || '')) {
      return false;
    }

    // 检查时间范围
    const now = new Date();
    if (config.startDate && new Date(config.startDate) > now) {
      return false;
    }
    if (config.endDate && new Date(config.endDate) < now) {
      return false;
    }

    return true;
  }

  /**
   * 记录广告曝光
   */
  async recordImpression(params: {
    adConfigId: string;
    adUnitId: string;
    userId?: string;
    sessionId?: string;
    pageType: string;
    pageUrl: string;
    referrer?: string;
    deviceType: AdDeviceType;
    userAgent?: string;
    ipAddress?: string;
    country?: string;
    region?: string;
  }): Promise<AdImpression> {
    const impressionId = uuidv4();
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const hour = now.getHours().toString().padStart(2, '0');

    const impression: AdImpression = {
      ...createImpressionKey(impressionId),
      entityType: 'AD_IMPRESSION',
      dataCategory: 'ADS',
      id: impressionId,
      adConfigId: params.adConfigId,
      adUnitId: params.adUnitId,
      userId: params.userId,
      sessionId: params.sessionId,
      pageType: params.pageType,
      pageUrl: params.pageUrl,
      referrer: params.referrer,
      deviceType: params.deviceType,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      country: params.country,
      region: params.region,
      displayedAt: now.toISOString(),
      GSI28PK: `AD_CONFIG#${params.adConfigId}`,
      GSI28SK: `DISPLAYED_AT#${now.toISOString()}`,
      GSI29PK: `DATE#${date}`,
      GSI29SK: `HOUR#${hour}`,
    };

    await putItem(impression);

    // 更新广告统计
    await this.updateAdStats(params.adConfigId, date, 'impression');

    // 更新用户曝光计数（用于频次控制）
    if (params.userId) {
      await this.incrementUserImpressionCount(params.userId, params.adConfigId);
    }

    logger.info('Ad impression recorded', { impressionId, adConfigId: params.adConfigId });

    return impression;
  }

  /**
   * 记录广告点击
   */
  async recordClick(params: {
    adConfigId: string;
    adUnitId: string;
    impressionId?: string;
    userId?: string;
    sessionId?: string;
    pageType: string;
    pageUrl: string;
    clickPosition?: { x: number; y: number };
    deviceType: AdDeviceType;
    userAgent?: string;
  }): Promise<AdClick> {
    const clickId = uuidv4();
    const now = new Date();
    const date = now.toISOString().split('T')[0];

    const click: AdClick = {
      ...createClickKey(clickId),
      entityType: 'AD_CLICK',
      dataCategory: 'ADS',
      id: clickId,
      adConfigId: params.adConfigId,
      adUnitId: params.adUnitId,
      impressionId: params.impressionId,
      userId: params.userId,
      sessionId: params.sessionId,
      pageType: params.pageType,
      pageUrl: params.pageUrl,
      clickPosition: params.clickPosition,
      deviceType: params.deviceType,
      userAgent: params.userAgent,
      clickedAt: now.toISOString(),
      converted: false,
      GSI30PK: `AD_CONFIG#${params.adConfigId}`,
      GSI30SK: `CLICKED_AT#${now.toISOString()}`,
    };

    await putItem(click);

    // 更新广告统计
    await this.updateAdStats(params.adConfigId, date, 'click');

    // 清除用户广告点击冷却
    if (params.userId) {
      await deleteCache(`ad:clicked:${params.userId}:${params.adConfigId}`, 'ADS');
    }

    logger.info('Ad click recorded', { clickId, adConfigId: params.adConfigId });

    return click;
  }

  /**
   * 更新广告统计
   */
  private async updateAdStats(adConfigId: string, date: string, type: 'impression' | 'click'): Promise<void> {
    const statsKey = { PK: `AD_STATS#${adConfigId}`, SK: `DATE#${date}` };
    const existing = await getItem<AdDailyStats>(statsKey);

    const now = new Date().toISOString();
    const updateExpression = type === 'impression'
      ? 'SET impressions = if_not_exists(impressions, :zero) + :inc, calculatedAt = :now'
      : 'SET clicks = if_not_exists(clicks, :zero) + :inc, calculatedAt = :now';

    await updateItem(statsKey, updateExpression, {
      ':inc': 1,
      ':zero': 0,
      ':now': now,
    });
  }

  /**
   * 增加用户曝光计数
   */
  private async incrementUserImpressionCount(userId: string, adConfigId: string): Promise<void> {
    const cacheKey = `ad:impression:${userId}:${adConfigId}`;
    await setCache(cacheKey, 'ADS', true, 3600);  // 1小时过期
  }

  /**
   * 获取广告配置列表（管理）
   */
  async getAdConfigs(): Promise<AdConfig[]> {
    const result = await queryItems<AdConfig>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': 'AD_CONFIG',
        ':sk': 'METADATA',
      },
    });
    return result.items;
  }

  /**
   * 创建广告配置
   */
  async createAdConfig(data: Omit<AdConfig, 'PK' | 'SK' | 'entityType' | 'dataCategory' | 'id' | 'totalImpressions' | 'totalClicks' | 'totalRevenue' | 'createdAt' | 'updatedAt'>): Promise<AdConfig> {
    const configId = uuidv4();
    const now = new Date().toISOString();

    const config: AdConfig = {
      ...createAdConfigKey(configId),
      SK: 'METADATA',
      entityType: 'AD_CONFIG',
      dataCategory: 'ADS',
      id: configId,
      ...data,
      totalImpressions: 0,
      totalClicks: 0,
      totalRevenue: 0,
      createdAt: now,
      updatedAt: now,
      GSI27PK: `PLACEMENT#${data.placement}`,
      GSI27SK: `PRIORITY#${data.priority.toString().padStart(3, '0')}`,
    };

    await putItem(config);

    logger.info('Ad config created', { configId, placement: data.placement });

    return config;
  }
}

export const adService = new AdService();
```

---

## 四、Google AdSense 集成

### 4.1 AdSense 客户端

```typescript
// src/lib/ads/google-adsense.ts

interface GoogleAdSenseConfig {
  adClient: string;        // ca-pub-XXXXX
  adSlot: string;          // 广告位 ID
  adFormat: string;        // auto, rectangle, etc.
  fullWidthResponsive?: boolean;
}

/**
 * Google AdSense 集成类
 */
export class GoogleAdSenseClient {
  private config: GoogleAdSenseConfig;

  constructor(config: GoogleAdSenseConfig) {
    this.config = config;
  }

  /**
   * 生成 AdSense 脚本标签
   */
  generateAdScript(): string {
    return `
      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${this.config.adClient}"
           crossorigin="anonymous"></script>
    `;
  }

  /**
   * 生成广告位 HTML
   */
  generateAdUnit(adSize?: { width: number; height: number }): string {
    const sizeParams = adSize 
      ? `width="${adSize.width}" height="${adSize.height}"`
      : '';
    
    return `
      <ins class="adsbygoogle"
           style="display:block"
           data-ad-client="${this.config.adClient}"
           data-ad-slot="${this.config.adSlot}"
           data-ad-format="${this.config.adFormat}"
           data-full-width-responsive="${this.config.fullWidthResponsive ? 'true' : 'false'}"
           ${sizeParams}>
      </ins>
      <script>
           (adsbygoogle = window.adsbygoogle || []).push({});
      </script>
    `;
  }

  /**
   * 生成响应式广告位
   */
  generateResponsiveAdUnit(): string {
    return `
      <ins class="adsbygoogle"
           style="display:block"
           data-ad-client="${this.config.adClient}"
           data-ad-slot="${this.config.adSlot}"
           data-ad-format="auto"
           data-full-width-responsive="true">
      </ins>
      <script>
           (adsbygoogle = window.adsbygoogle || []).push({});
      </script>
    `;
  }
}

/**
 * 创建 AdSense 客户端实例
 */
export function createAdSenseClient(adConfig: {
  googleAdClient: string;
  adUnitId: string;
}): GoogleAdSenseClient {
  return new GoogleAdSenseClient({
    adClient: adConfig.googleAdClient,
    adSlot: adConfig.adUnitId,
    adFormat: 'auto',
    fullWidthResponsive: true,
  });
}
```

### 4.2 前端广告组件

```typescript
// src/components/ads/GoogleAdBanner.tsx
import React, { useEffect, useRef } from 'react';

interface GoogleAdBannerProps {
  adClient: string;        // ca-pub-XXXXX
  adSlot: string;          // 广告位 ID
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  style?: React.CSSProperties;
  className?: string;
}

export const GoogleAdBanner: React.FC<GoogleAdBannerProps> = ({
  adClient,
  adSlot,
  format = 'auto',
  style,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 加载 AdSense 脚本
    const script = document.createElement('script');
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
    script.async = true;
    script.setAttribute('data-ad-client', adClient);
    document.head.appendChild(script);

    return () => {
      // 清理脚本
      const existingScript = document.querySelector(`script[src="${script.src}"]`);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [adClient]);

  return (
    <div 
      ref={containerRef} 
      className={`ad-banner ${className || ''}`}
      style={style}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: '(adsbygoogle = window.adsbygoogle || []).push({});',
        }}
      />
    </div>
  );
};

/**
 * 首页横幅广告
 */
export const HomePageBanner: React.FC = () => {
  return (
    <div className="ad-banner-container">
      <GoogleAdBanner
        adClient={process.env.REACT_APP_GOOGLE_AD_CLIENT || ''}
        adSlot={process.env.REACT_APP_GOOGLE_AD_SLOT_HOME || ''}
        format="horizontal"
        style={{ minHeight: '90px', margin: '20px 0' }}
      />
    </div>
  );
};

/**
 * 侧边栏广告
 */
export const SidebarAd: React.FC = () => {
  return (
    <div className="sidebar-ad-container">
      <GoogleAdBanner
        adClient={process.env.REACT_APP_GOOGLE_AD_CLIENT || ''}
        adSlot={process.env.REACT_APP_GOOGLE_AD_SLOT_SIDEBAR || ''}
        format="rectangle"
        style={{ minHeight: '250px' }}
      />
    </div>
  );
};
```

---

## 五、API 设计

### 5.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| **广告获取** |
| GET | /api/v1/ads/config | 获取广告配置 | 获取指定位置的广告配置 |
| GET | /api/v1/ads/impression | 记录曝光 | 记录广告曝光 |
| GET | /api/v1/ads/click | 记录点击 | 记录广告点击 |
| **管理功能** |
| GET | /api/v1/admin/ads | 广告配置列表 | 管理员 |
| POST | /api/v1/admin/ads | 创建广告配置 | 管理员 |
| PUT | /api/v1/admin/ads/:id | 更新广告配置 | 管理员 |
| GET | /api/v1/admin/ads/stats | 广告统计 | 管理员 |

### 5.2 API 详细设计

#### 5.2.1 GET /api/v1/ads/config

**查询参数**:
- `placement`: 广告位置 (header, sidebar, banner, etc.)
- `pageType`: 页面类型 (home, search, detail, etc.)
- `deviceType`: 设备类型 (desktop, tablet, mobile)

**响应示例** (200):
```json
{
  "success": true,
  "data": {
    "adConfigId": "550e8400-e29b-41d4-a716-446655440000",
    "adUnitId": "1234567890",
    "googleAdClient": "ca-pub-123456789",
    "placement": "header",
    "size": "responsive"
  }
}
```

#### 5.2.2 GET /api/v1/ads/impression

**查询参数**:
- `adConfigId`: 广告配置 ID
- `adUnitId`: 广告单元 ID
- `pageType`: 页面类型
- `deviceType`: 设备类型

**响应示例** (200):
```json
{
  "success": true,
  "data": {
    "impressionId": "impression-123"
  }
}
```

---

## 六、反爬虫设计

### 6.1 防护措施

```typescript
// src/lib/ads/anti-crawler.ts

/**
 * 广告请求验证
 */
export function validateAdRequest(request: {
  headers: Record<string, string>;
  ip: string;
  userAgent?: string;
}): boolean {
  // 1. 检查 User-Agent
  if (!request.userAgent || request.userAgent.length < 10) {
    return false;
  }

  // 2. 检查常见爬虫特征
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scrapy/i,
    /puppeteer/i,
    /headless/i,
  ];

  if (botPatterns.some(pattern => pattern.test(request.userAgent || ''))) {
    return false;
  }

  // 3. 检查 IP 频率
  const ipCacheKey = `ad:ip:${request.ip}`;
  const ipCount = getFromCache(ipCacheKey, 'ADS') || 0;
  
  if (ipCount > 100) {  // 每分钟最多 100 次请求
    return false;
  }

  setCache(ipCacheKey, 'ADS', ipCount + 1, 60);
  return true;
}

/**
 * 广告展示频率控制
 */
export function checkAdFrequencyCap(
  userId: string,
  placement: string,
  maxPerHour: number = 10
): boolean {
  const cacheKey = `ad:freq:${userId}:${placement}`;
  const count = getFromCache(cacheKey, 'ADS') || 0;

  if (count >= maxPerHour) {
    return false;
  }

  setCache(cacheKey, 'ADS', count + 1, 3600);  // 1小时
  return true;
}
```

---

## 七、测试用例

### 7.1 单元测试

```typescript
// src/modules/ads/ads.service.test.ts
import { adService } from './ads.service';
import { mockPutItem, mockGetItem, mockQueryItems, mockUpdateItem } from '../../test/mocks';

describe('AdService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAdConfigForPlacement', () => {
    it('should return active ad config for placement', async () => {
      const mockConfig = {
        id: 'config-123',
        placement: 'header',
        isActive: true,
        deviceType: 'all',
        displayRule: {},
      };

      (queryItems as jest.Mock).mockResolvedValueOnce({ items: [mockConfig] });

      const result = await adService.getAdConfigForPlacement(
        'header',
        'home',
        'desktop'
      );

      expect(result).toBeDefined();
      expect(result?.placement).toBe('header');
    });

    it('should exclude ads with page restrictions', async () => {
      const mockConfig = {
        id: 'config-123',
        placement: 'header',
        isActive: true,
        deviceType: 'all',
        displayRule: {
          excludePages: ['checkout', 'payment'],
        },
      };

      (queryItems as jest.Mock).mockResolvedValueOnce({ items: [mockConfig] });

      const result = await adService.getAdConfigForPlacement(
        'header',
        'checkout',  // 排除页面
        'desktop'
      );

      expect(result).toBeNull();
    });

    it('should return null when no ads available', async () => {
      (queryItems as jest.Mock).mockResolvedValueOnce({ items: [] });

      const result = await adService.getAdConfigForPlacement(
        'header',
        'home',
        'desktop'
      );

      expect(result).toBeNull();
    });
  });

  describe('recordImpression', () => {
    it('should record impression successfully', async () => {
      (putItem as jest.Mock).mockResolvedValue({});
      (updateItem as jest.Mock).mockResolvedValue({});

      const result = await adService.recordImpression({
        adConfigId: 'config-123',
        adUnitId: 'slot-456',
        pageType: 'home',
        pageUrl: 'https://findclass.co.nz/',
        deviceType: 'desktop',
      });

      expect(result).toBeDefined();
      expect(result.adConfigId).toBe('config-123');
      expect(result.entityType).toBe('AD_IMPRESSION');
    });
  });

  describe('recordClick', () => {
    it('should record click successfully', async () => {
      (putItem as jest.Mock).mockResolvedValue({});
      (updateItem as jest.Mock).mockResolvedValue({});

      const result = await adService.recordClick({
        adConfigId: 'config-123',
        adUnitId: 'slot-456',
        pageType: 'home',
        pageUrl: 'https://findclass.co.nz/',
        deviceType: 'desktop',
      });

      expect(result).toBeDefined();
      expect(result.adConfigId).toBe('config-123');
      expect(result.entityType).toBe('AD_CLICK');
    });
  });
});
```

---

## 八、验收标准

- [ ] 广告配置正确创建和管理
- [ ] 广告曝光正确记录
- [ ] 广告点击正确记录
- [ ] 频次控制正常工作
- [ ] 反爬虫机制有效
- [ ] 广告收入统计准确
- [ ] 前端广告组件正常展示

---

## 九、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 广告展示过多影响用户体验 | 中 | 中 | 限制广告数量，监听用户反馈 |
| 违反 AdSense 政策 | 低 | 高 | 严格遵守政策，定期审查 |
| 广告加载慢影响页面性能 | 中 | 中 | 异步加载，懒加载 |
| 爬虫攻击 | 中 | 中 | 反爬虫机制，IP 限制 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/ads/tech-google-ads.md`

**相关文档**:
- [产品设计](../../05-product-design/ads/google-ads.md)
- [反爬虫设计](anti-crawler-design.md)
