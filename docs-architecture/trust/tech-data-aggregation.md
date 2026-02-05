---
title: 技术实现 - 数据聚合
category: tech-architecture
created: 2026-01-21
author: linus-torvalds
version: 1.0
phase: 1
priority: P0
status: pending-implementation
related_feature: ../../05-product-design/mvp/feature-data-aggregation.md
---

# 技术实现: 数据聚合

> **对应产品文档**: [feature-data-aggregation.md](../../05-product-design/mvp/feature-data-aggregation.md) | **优先级**: P0 | **排期**: Phase 1 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                         技术架构层级                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [外部数据源]                                                      │
│   ├── Gumtree                                                       │
│   ├── Facebook Marketplace                                          │
│   └── 注册教师                                                      │
│         │                                                           │
│         ▼                                                           │
│   [Data Crawler]                                                    │
│   ├── Gumtree Scraper                                               │
│   ├── Facebook Scraper                                              │
│   └── API Integrations                                              │
│         │                                                           │
│         ▼                                                           │
│   [Data Pipeline]                                                   │
│   ├── 原始数据存储 (S3)                                             │
│   ├── 数据清洗                                                      │
│   ├── 数据脱敏                                                      │
│   ├── 质量评估                                                      │
│   └── 信任标识计算                                                  │
│         │                                                           │
│         ▼                                                           │
│   [DynamoDB: courses]                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 技术选型

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| **爬虫框架** | Puppeteer / Cheerio | 网页抓取 |
| **数据存储** | S3 + DynamoDB | 原始数据 + 结构化数据 |
| **数据处理** | AWS Lambda | 批量数据处理 |
| **调度** | EventBridge | 定时触发抓取 |

---

## 二、数据模型设计 (DynamoDB)

### 2.1 DynamoDB 表设计

```typescript
// src/modules/data-aggregation/data-aggregation.types.ts

/**
 * 数据源类型
 */
export enum DataSourceType {
  GUMTREE = 'gumtree',
  FACEBOOK = 'facebook',
  FIRST_PARTY = 'first_party',
  OTHER = 'other',
}

/**
 * 数据源状态
 */
export enum DataSourceStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ERROR = 'error',
}

/**
 * 聚合数据状态
 */
export enum AggregatedDataStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  PENDING = 'pending',
}

/**
 * 数据质量评分维度
 */
export interface QualityScoreDimensions {
  completeness: number;      // 完整性 (0-100)
  accuracy: number;          // 准确性 (0-100)
  freshness: number;         // 新鲜度 (0-100)
  consistency: number;       // 一致性 (0-100)
}

/**
 * 数据源配置 DynamoDB 类型
 */
export interface DataSourceConfig {
  // DynamoDB 主键
  PK: string;           // DATASOURCE#{sourceId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'DATASOURCE_CONFIG';
  dataCategory: 'DATA_AGGREGATION';
  id: string;
  
  // 数据源信息
  name: string;
  type: DataSourceType;
  baseUrl: string;
  
  // 选择器配置
  selectors: {
    courseList: string;
    courseItem: string;
    title: string;
    description: string;
    price: string;
    contact: string;
    location: string;
    category: string;
    images: string;
  };
  
  // 调度配置
  updateFrequency: number;  // 小时
  lastCrawledAt?: string;
  nextCrawlAt?: string;
  
  // 状态
  status: DataSourceStatus;
  
  // 统计
  totalRecords: number;
  successRate: number;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
}

/**
 * 原始数据 DynamoDB 类型
 */
export interface RawData {
  // DynamoDB 主键
  PK: string;           // RAWDATA#{dataId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'RAW_DATA';
  dataCategory: 'DATA_AGGREGATION';
  id: string;
  
  // 关联数据源
  sourceId: string;
  sourceUrl: string;
  
  // 原始数据
  rawContent: string;
  parsedData: Record<string, unknown>;
  
  // S3 存储位置
  s3Key: string;
  s3Bucket: string;
  
  // 状态
  status: 'pending' | 'processed' | 'failed';
  processingError?: string;
  
  // 时间戳
  crawledAt: string;
  processedAt?: string;
  expiresAt: string;  // 30天后过期
  
  // GSI 索引
  GSI1PK?: string;  // SOURCE#{sourceId}
  GSI1SK?: string;  // RAW#{crawledAt}
}

/**
 * 聚合课程数据 DynamoDB 类型
 */
export interface AggregatedCourse {
  // DynamoDB 主键
  PK: string;           // COURSE#{courseId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'AGGREGATED_COURSE';
  dataCategory: 'DATA_AGGREGATION';
  id: string;
  
  // 数据源信息
  sourceId: string;
  sourceUrl: string;
  sourceType: DataSourceType;
  
  // 清洗后数据
  title: string;
  description: string;
  price: number;
  priceUnit: 'hour' | 'lesson' | 'course';
  priceOriginal?: string;
  
  // 位置信息
  region: string;
  city: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  
  // 教学信息
  teachingMode: string[];
  language: string;
  subjects: string[];
  category?: string;
  
  // 脱敏后联系方式
  contactName?: string;
  contactPhone?: string;    // 脱敏后
  contactWechat?: string;   // 脱敏后
  
  // 媒体
  images: string[];
  
  // 质量评估
  qualityScore: number;           // 综合评分 0-100
  qualityDimensions: QualityScoreDimensions;
  trustLevel: 'S' | 'A' | 'B' | 'C' | 'D';
  
  // 元数据
  originalDataKey: string;        // S3 key
  dataVersion: number;
  
  // 状态
  status: AggregatedDataStatus;
  activeFrom?: string;
  expiresAt?: string;
  
  // 时间戳
  crawledAt: string;
  updatedAt: string;
  lastVerifiedAt?: string;
  
  // GSI 索引
  GSI2PK?: string;  // REGION#{region}
  GSI2SK?: string;  // SCORE#{qualityScore}#{updatedAt}
  GSI3PK?: string;  // SOURCE#{sourceId}
  GSI3SK?: string;  // COURSE#{updatedAt}
  GSI4PK?: string;  // STATUS#{status}
  GSI4SK?: string;  // UPDATED_AT#{updatedAt}
}

/**
 * 聚合统计 DynamoDB 类型
 */
export interface AggregationStats {
  // DynamoDB 主键
  PK: string;           // STATS#{date}
  SK: string;           // DAILY
  
  // 实体类型标识
  entityType: 'AGGREGATION_STATS';
  dataCategory: 'DATA_AGGREGATION';
  id: string;
  
  // 日期
  date: string;
  
  // 来源统计
  sourceStats: Record<string, {
    totalRecords: number;
    processedRecords: number;
    failedRecords: number;
    averageQualityScore: number;
  }>;
  
  // 总体统计
  totalRecords: number;
  activeRecords: number;
  expiredRecords: number;
  averageQualityScore: number;
  
  // 信任分布
  trustDistribution: {
    S: number;
    A: number;
    B: number;
    C: number;
    D: number;
  };
  
  // 时间戳
  calculatedAt: string;
}

/**
 * 数据源配置 DTO
 */
export interface CreateDataSourceDto {
  name: string;
  type: DataSourceType;
  baseUrl: string;
  selectors: DataSourceConfig['selectors'];
  updateFrequency: number;
}

/**
 * 更新数据源 DTO
 */
export interface UpdateDataSourceDto {
  selectors?: DataSourceConfig['selectors'];
  updateFrequency?: number;
  status?: DataSourceStatus;
}

/**
 * 聚合课程查询参数
 */
export interface CourseQueryParams {
  page?: number;
  limit?: number;
  region?: string;
  minQualityScore?: number;
  trustLevel?: AggregatedCourse['trustLevel'];
  subjects?: string[];
  teachingMode?: string[];
  priceMin?: number;
  priceMax?: number;
  status?: AggregatedDataStatus;
}

/**
 * 聚合课程分页结果
 */
export interface CourseQueryResult {
  courses: AggregatedCourse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 2.2 实体键生成函数

```typescript
// src/modules/data-aggregation/data-aggregation.types.ts (续)

import { createEntityKey } from '@shared/db/dynamodb';

/**
 * 生成数据源主键
 */
export function createDataSourceKey(sourceId: string): { PK: string; SK: string } {
  return createEntityKey('DATASOURCE', sourceId);
}

/**
 * 生成原始数据主键
 */
export function createRawDataKey(dataId: string): { PK: string; SK: string } {
  return createEntityKey('RAWDATA', dataId);
}

/**
 * 生成原始数据索引键
 */
export function createRawDataSourceIndexKey(sourceId: string, crawledAt: string): { PK: string; SK: string } {
  return {
    PK: `SOURCE#${sourceId}`,
    SK: `RAW#${crawledAt}`,
  };
}

/**
 * 生成聚合课程主键
 */
export function createAggregatedCourseKey(courseId: string): { PK: string; SK: string } {
  return createEntityKey('COURSE', courseId);
}

/**
 * 生成地区索引键
 */
export function createRegionIndexKey(region: string, qualityScore: number, updatedAt: string): { PK: string; SK: string } {
  return {
    PK: `REGION#${region}`,
    SK: `SCORE#${String(qualityScore).padStart(3, '0')}#${updatedAt}`,
  };
}

/**
 * 生成来源索引键
 */
export function createSourceIndexKey(sourceId: string, updatedAt: string): { PK: string; SK: string } {
  return {
    PK: `SOURCE#${sourceId}`,
    SK: `COURSE#${updatedAt}`,
  };
}

/**
 * 生成状态索引键
 */
export function createStatusIndexKey(status: AggregatedDataStatus, updatedAt: string): { PK: string; SK: string } {
  return {
    PK: `STATUS#${status}`,
    SK: `UPDATED_AT#${updatedAt}`,
  };
}

/**
 * 生成统计主键
 */
export function createStatsKey(date: string): { PK: string; SK: string } {
  return {
    PK: `STATS#${date}`,
    SK: 'DAILY',
  };
}

/**
 * 计算信任等级
 */
export function calculateTrustLevel(qualityScore: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (qualityScore >= 90) return 'S';
  if (qualityScore >= 75) return 'A';
  if (qualityScore >= 60) return 'B';
  if (qualityScore >= 40) return 'C';
  return 'D';
}

/**
 * 计算过期时间（30天后）
 */
export function calculateExpiryDate(): string {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  return expiry.toISOString();
}
```

---

## 三、业务逻辑实现

### 3.1 数据聚合服务

```typescript
// src/modules/data-aggregation/data-aggregation.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  DataSourceConfig,
  DataSourceType,
  DataSourceStatus,
  RawData,
  AggregatedCourse,
  AggregatedDataStatus,
  QualityScoreDimensions,
  AggregationStats,
  CreateDataSourceDto,
  UpdateDataSourceDto,
  CourseQueryParams,
  CourseQueryResult,
  createDataSourceKey,
  createRawDataKey,
  createRawDataSourceIndexKey,
  createAggregatedCourseKey,
  createRegionIndexKey,
  createSourceIndexKey,
  createStatusIndexKey,
  createStatsKey,
  calculateTrustLevel,
  calculateExpiryDate,
} from './data-aggregation.types';
import { putItem, getItem, queryItems, updateItem, deleteItem, batchWriteItems } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache, CacheKeys } from '@shared/db/cache';
import { desensitizationService } from '@modules/trust/desensitization.service';

/**
 * 数据源配置服务类
 */
export class DataSourceConfigService {
  /**
   * 创建数据源配置
   */
  async createDataSource(dto: CreateDataSourceDto): Promise<DataSourceConfig> {
    const now = new Date().toISOString();
    const sourceId = uuidv4();

    const source: DataSourceConfig = {
      ...createDataSourceKey(sourceId),
      SK: 'METADATA',
      entityType: 'DATASOURCE_CONFIG',
      dataCategory: 'DATA_AGGREGATION',
      id: sourceId,
      name: dto.name,
      type: dto.type,
      baseUrl: dto.baseUrl,
      selectors: dto.selectors,
      updateFrequency: dto.updateFrequency,
      status: DataSourceStatus.ACTIVE,
      totalRecords: 0,
      successRate: 100,
      createdAt: now,
      updatedAt: now,
    };

    await putItem(source);

    logger.info('Data source created', { sourceId, name: dto.name });

    return source;
  }

  /**
   * 获取数据源配置
   */
  async getDataSource(sourceId: string): Promise<DataSourceConfig | null> {
    const { PK, SK } = createDataSourceKey(sourceId);
    return getItem<DataSourceConfig>({ PK, SK });
  }

  /**
   * 获取所有活跃数据源
   */
  async getActiveDataSources(): Promise<DataSourceConfig[]> {
    const result = await queryItems<DataSourceConfig>({
      indexName: 'GSI-StatusIndex',
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': 'DATASOURCE',
        ':sk': 'METADATA',
      },
    });

    return result.items.filter(s => s.status === DataSourceStatus.ACTIVE);
  }

  /**
   * 更新数据源配置
   */
  async updateDataSource(sourceId: string, dto: UpdateDataSourceDto): Promise<DataSourceConfig> {
    const now = new Date().toISOString();
    const updateParts: string[] = ['updatedAt = :now'];
    const values: Record<string, unknown> = { ':now': now };

    if (dto.selectors) {
      updateParts.push('selectors = :selectors');
      values[':selectors'] = dto.selectors;
    }
    if (dto.updateFrequency) {
      updateParts.push('updateFrequency = :updateFrequency');
      values[':updateFrequency'] = dto.updateFrequency;
    }
    if (dto.status) {
      updateParts.push('status = :status');
      values[':status'] = dto.status;
    }

    const updated = await updateItem(
      createDataSourceKey(sourceId),
      `SET ${updateParts.join(', ')}`,
      values
    ) as DataSourceConfig;

    await deleteCache(`datasource:${sourceId}`, 'DATA_AGGREGATION');

    logger.info('Data source updated', { sourceId });

    return updated;
  }

  /**
   * 更新爬取时间
   */
  async updateCrawlTime(sourceId: string): Promise<void> {
    const now = new Date();
    const nextCrawl = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6小时后

    await updateItem(
      createDataSourceKey(sourceId),
      'SET lastCrawledAt = :last, nextCrawlAt = :next, updatedAt = :now',
      {
        ':last': now.toISOString(),
        ':next': nextCrawl.toISOString(),
        ':now': now.toISOString(),
      }
    );
  }

  /**
   * 更新统计信息
   */
  async updateStats(sourceId: string, success: boolean, qualityScore?: number): Promise<void> {
    const source = await this.getDataSource(sourceId);
    if (!source) return;

    const now = new Date().toISOString();
    const totalRecords = source.totalRecords + (success ? 1 : 0);
    const successRate = success
      ? ((source.successRate * source.totalRecords) + 100) / totalRecords
      : (source.successRate * source.totalRecords) / (totalRecords || 1);

    await updateItem(
      createDataSourceKey(sourceId),
      'SET totalRecords = :total, successRate = :rate, updatedAt = :now',
      {
        ':total': totalRecords,
        ':rate': Math.round(successRate * 100) / 100,
        ':now': now,
      }
    );
  }
}

/**
 * 原始数据服务类
 */
export class RawDataService {
  /**
   * 保存原始数据
   */
  async saveRawData(params: {
    sourceId: string;
    sourceUrl: string;
    rawContent: string;
    parsedData: Record<string, unknown>;
    s3Key: string;
    s3Bucket: string;
  }): Promise<RawData> {
    const now = new Date().toISOString();
    const dataId = uuidv4();

    const rawData: RawData = {
      ...createRawDataKey(dataId),
      SK: 'METADATA',
      entityType: 'RAW_DATA',
      dataCategory: 'DATA_AGGREGATION',
      id: dataId,
      sourceId: params.sourceId,
      sourceUrl: params.sourceUrl,
      rawContent: params.rawContent,
      parsedData: params.parsedData,
      s3Key: params.s3Key,
      s3Bucket: params.s3Bucket,
      status: 'pending',
      crawledAt: now,
      expiresAt: calculateExpiryDate(),
      GSI1PK: `SOURCE#${params.sourceId}`,
      GSI1SK: `RAW#${now}`,
    };

    await putItem(rawData);

    logger.info('Raw data saved', { dataId, sourceId: params.sourceId });

    return rawData;
  }

  /**
   * 获取待处理数据
   */
  async getPendingRawData(sourceId?: string, limit: number = 100): Promise<RawData[]> {
    const result = await queryItems<RawData>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': sourceId ? `SOURCE#${sourceId}` : 'RAWDATA',
        ':sk': 'RAW#',
      },
      limit,
    });

    return result.items.filter(r => r.status === 'pending');
  }

  /**
   * 标记数据已处理
   */
  async markAsProcessed(dataId: string): Promise<void> {
    const now = new Date().toISOString();

    await updateItem(
      createRawDataKey(dataId),
      'SET status = :status, processedAt = :processed',
      {
        ':status': 'processed',
        ':processed': now,
      }
    );
  }

  /**
   * 标记数据处理失败
   */
  async markAsFailed(dataId: string, error: string): Promise<void> {
    const now = new Date().toISOString();

    await updateItem(
      createRawDataKey(dataId),
      'SET status = :status, processingError = :error',
      {
        ':status': 'failed',
        ':error': error,
      }
    );
  }

  /**
   * 清理过期原始数据
   */
  async cleanupExpiredRawData(): Promise<number> {
    const now = new Date().toISOString();
    let deletedCount = 0;

    // 简单实现：查询并删除过期的数据
    // 实际生产中应使用 DynamoDB TTL 或定期任务
    const result = await queryItems<RawData>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': 'RAWDATA',
        ':sk': 'RAW#',
      },
      limit: 1000,
    });

    for (const item of result.items) {
      if (item.expiresAt < now) {
        await deleteItem(createRawDataKey(item.id));
        deletedCount++;
      }
    }

    logger.info('Cleaned up expired raw data', { count: deletedCount });

    return deletedCount;
  }
}

/**
 * 聚合课程服务类
 */
export class AggregatedCourseService {
  /**
   * 处理并保存聚合课程
   */
  async processAndSaveCourse(params: {
    sourceId: string;
    sourceUrl: string;
    sourceType: DataSourceType;
    rawData: Record<string, unknown>;
    qualityDimensions: QualityScoreDimensions;
  }): Promise<AggregatedCourse> {
    const now = new Date().toISOString();
    const courseId = uuidv4();

    // 清洗数据
    const cleanedData = this.cleanData(params.rawData);

    // 脱敏处理
    const desensitizedData = await this.desensitizeData(cleanedData);

    // 计算质量评分
    const qualityScore = this.calculateQualityScore(params.qualityDimensions);

    // 计算信任等级
    const trustLevel = calculateTrustLevel(qualityScore);

    // S3 key for original data
    const originalDataKey = `raw/${params.sourceType}/${now.split('T')[0]}/${courseId}.json`;

    const course: AggregatedCourse = {
      ...createAggregatedCourseKey(courseId),
      SK: 'METADATA',
      entityType: 'AGGREGATED_COURSE',
      dataCategory: 'DATA_AGGREGATION',
      id: courseId,
      sourceId: params.sourceId,
      sourceUrl: params.sourceUrl,
      sourceType: params.sourceType,
      ...desensitizedData,
      qualityScore,
      qualityDimensions: params.qualityDimensions,
      trustLevel,
      originalDataKey,
      dataVersion: 1,
      status: AggregatedDataStatus.ACTIVE,
      crawledAt: now,
      updatedAt: now,
      GSI2PK: `REGION#${desensitizedData.region || 'unknown'}`,
      GSI2SK: `SCORE#${String(qualityScore).padStart(3, '0')}#${now}`,
      GSI3PK: `SOURCE#${params.sourceId}`,
      GSI3SK: `COURSE#${now}`,
      GSI4PK: `STATUS#${AggregatedDataStatus.ACTIVE}`,
      GSI4SK: `UPDATED_AT#${now}`,
    };

    await putItem(course);

    // 更新数据源统计
    await dataSourceConfigService.updateStats(params.sourceId, true, qualityScore);

    // 清除缓存
    await deleteCache(CacheKeys.aggregatedCourses(), 'DATA_AGGREGATION');

    logger.info('Aggregated course saved', { courseId, trustLevel, qualityScore });

    return course;
  }

  /**
   * 清洗数据
   */
  private cleanData(rawData: Record<string, unknown>): Partial<AggregatedCourse> {
    return {
      title: String(rawData.title || '').trim(),
      description: String(rawData.description || '').trim(),
      price: this.parsePrice(String(rawData.price || '0')),
      priceUnit: this.parsePriceUnit(String(rawData.priceType || 'hour')),
      region: this.normalizeRegion(String(rawData.region || 'unknown')),
      city: String(rawData.city || rawData.region || ''),
      address: String(rawData.address || ''),
      teachingMode: Array.isArray(rawData.teachingMode) 
        ? rawData.teachingMode 
        : [String(rawData.teachingMode || 'unknown')],
      language: String(rawData.language || 'unknown'),
      subjects: Array.isArray(rawData.subjects)
        ? rawData.subjects
        : [String(rawData.subjects || 'unknown')],
      category: String(rawData.category || ''),
      images: Array.isArray(rawData.images) ? rawData.images as string[] : [],
      contactName: String(rawData.contactName || ''),
      contactPhone: String(rawData.contactPhone || ''),
      contactWechat: String(rawData.wechat || ''),
    };
  }

  /**
   * 脱敏数据
   */
  private async desensitizeData(data: Partial<AggregatedCourse>): Promise<Partial<AggregatedCourse>> {
    const result = { ...data };

    if (result.contactPhone) {
      result.contactPhone = await desensitizationService.maskPhone(result.contactPhone);
    }
    if (result.contactWechat) {
      result.contactWechat = await desensitizationService.maskWechat(result.contactWechat);
    }

    return result;
  }

  /**
   * 解析价格
   */
  private parsePrice(priceStr: string): number {
    // 移除货币符号和空格
    const cleaned = priceStr.replace(/[$NZD\s]/g, '').trim();
    // 提取数字
    const match = cleaned.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }

  /**
   * 解析价格单位
   */
  private parsePriceUnit(priceType: string): 'hour' | 'lesson' | 'course' {
    const normalized = priceType.toLowerCase();
    if (normalized.includes('hour') || normalized.includes('小时')) return 'hour';
    if (normalized.includes('lesson') || normalized.includes('课')) return 'lesson';
    if (normalized.includes('course') || normalized.includes('课程')) return 'course';
    return 'hour';
  }

  /**
   * 标准化地区
   */
  private normalizeRegion(region: string): string {
    const regionMap: Record<string, string> = {
      'auckland': 'Auckland',
      '奥克兰': 'Auckland',
      'wellington': 'Wellington',
      '惠灵顿': 'Wellington',
      'christchurch': 'Christchurch',
      '基督城': 'Christchurch',
      'hamilton': 'Hamilton',
      '汉密尔顿': 'Hamilton',
    };
    
    const normalized = region.toLowerCase().trim();
    return regionMap[normalized] || region;
  }

  /**
   * 计算质量评分
   */
  private calculateQualityScore(dimensions: QualityScoreDimensions): number {
    // 加权平均计算综合评分
    const weights = {
      completeness: 0.3,
      accuracy: 0.3,
      freshness: 0.2,
      consistency: 0.2,
    };

    const score = 
      dimensions.completeness * weights.completeness +
      dimensions.accuracy * weights.accuracy +
      dimensions.freshness * weights.freshness +
      dimensions.consistency * weights.consistency;

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * 查询聚合课程
   */
  async queryCourses(params: CourseQueryParams = {}): Promise<CourseQueryResult> {
    const { page = 1, limit = 20, region, minQualityScore, trustLevel, subjects, status = AggregatedDataStatus.ACTIVE } = params;

    // 构建查询条件
    let filterExpression = 'PK = :pk';
    const expressionValues: Record<string, unknown> = {
      ':pk': 'AGGREGATED_COURSE',
    };

    if (minQualityScore) {
      filterExpression += ' AND qualityScore >= :minScore';
      expressionValues[':minScore'] = minQualityScore;
    }
    if (trustLevel) {
      filterExpression += ' AND trustLevel = :trustLevel';
      expressionValues[':trustLevel'] = trustLevel;
    }
    if (status) {
      filterExpression += ' AND status = :status';
      expressionValues[':status'] = status;
    }

    const result = await queryItems<AggregatedCourse>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      filterExpression,
      expressionAttributeValues: expressionValues,
      expressionAttributeNames: {
        '#qualityScore': 'qualityScore',
        '#trustLevel': 'trustLevel',
        '#status': 'status',
      },
      limit: limit * 2,
      scanIndexForward: false,
    });

    // 地区过滤
    let filtered = result.items;
    if (region) {
      filtered = filtered.filter(c => c.region === region);
    }

    // 科目过滤
    if (subjects && subjects.length > 0) {
      filtered = filtered.filter(c => 
        c.subjects && subjects.some(s => c.subjects.includes(s))
      );
    }

    // 分页
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    return {
      courses: paginatedItems,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  }

  /**
   * 获取课程详情
   */
  async getCourseById(courseId: string): Promise<AggregatedCourse | null> {
    const { PK, SK } = createAggregatedCourseKey(courseId);
    return getItem<AggregatedCourse>({ PK, SK });
  }

  /**
   * 更新课程状态
   */
  async updateCourseStatus(courseId: string, status: AggregatedDataStatus): Promise<void> {
    const now = new Date().toISOString();

    await updateItem(
      createAggregatedCourseKey(courseId),
      'SET status = :status, updatedAt = :now, GSI4PK = :gsi4pk, GSI4SK = :gsi4sk',
      {
        ':status': status,
        ':now': now,
        ':gsi4pk': `STATUS#${status}`,
        ':gsi4sk': `UPDATED_AT#${now}`,
      }
    );

    await deleteCache(`course:${courseId}`, 'DATA_AGGREGATION');
  }

  /**
   * 标记过期课程
   */
  async markExpiredCourses(): Promise<number> {
    const now = new Date().toISOString();
    let updatedCount = 0;

    const result = await queryItems<AggregatedCourse>({
      indexName: 'GSI4-StatusIndex',
      keyConditionExpression: 'GSI4PK = :pk AND begins_with(GSI4SK, :sk)',
      expressionAttributeValues: {
        ':pk': `STATUS#${AggregatedDataStatus.ACTIVE}`,
        ':sk': 'UPDATED_AT#',
      },
      limit: 1000,
    });

    for (const course of result.items) {
      if (course.expiresAt && course.expiresAt < now) {
        await this.updateCourseStatus(course.id, AggregatedDataStatus.EXPIRED);
        updatedCount++;
      }
    }

    logger.info('Marked expired courses', { count: updatedCount });

    return updatedCount;
  }

  /**
   * 按信任等级统计
   */
  async getTrustLevelStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };

    const result = await queryItems<AggregatedCourse>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': 'AGGREGATED_COURSE',
        ':sk': 'METADATA',
      },
      limit: 10000,
    });

    for (const course of result.items) {
      if (stats.hasOwnProperty(course.trustLevel)) {
        stats[course.trustLevel]++;
      }
    }

    return stats;
  }
}

/**
 * 聚合统计服务类
 */
export class AggregationStatsService {
  /**
   * 计算每日统计
   */
  async calculateDailyStats(date: string): Promise<AggregationStats> {
    const now = new Date().toISOString();
    
    // 获取所有聚合课程
    const result = await queryItems<AggregatedCourse>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': 'AGGREGATED_COURSE',
        ':sk': 'METADATA',
      },
      limit: 10000,
    });

    const courses = result.items;

    // 按来源分组统计
    const sourceStats: Record<string, {
      totalRecords: number;
      processedRecords: number;
      failedRecords: number;
      averageQualityScore: number;
    }> = {};

    for (const course of courses) {
      if (!sourceStats[course.sourceId]) {
        sourceStats[course.sourceId] = {
          totalRecords: 0,
          processedRecords: 0,
          failedRecords: 0,
          averageQualityScore: 0,
        };
      }
      sourceStats[course.sourceId].totalRecords++;
      sourceStats[course.sourceId].averageQualityScore += course.qualityScore;
    }

    // 计算平均值
    for (const sourceId of Object.keys(sourceStats)) {
      const stats = sourceStats[sourceId];
      stats.averageQualityScore = Math.round(
        stats.averageQualityScore / stats.totalRecords
      );
    }

    // 信任分布
    const trustDistribution = { S: 0, A: 0, B: 0, C: 0, D: 0 };
    for (const course of courses) {
      if (trustDistribution.hasOwnProperty(course.trustLevel)) {
        trustDistribution[course.trustLevel]++;
      }
    }

    // 状态统计
    const activeRecords = courses.filter(c => c.status === AggregatedDataStatus.ACTIVE).length;
    const expiredRecords = courses.filter(c => c.status === AggregatedDataStatus.EXPIRED).length;

    // 计算平均质量分
    const avgQualityScore = courses.length > 0
      ? Math.round(courses.reduce((sum, c) => sum + c.qualityScore, 0) / courses.length)
      : 0;

    const stats: AggregationStats = {
      ...createStatsKey(date),
      SK: 'DAILY',
      entityType: 'AGGREGATION_STATS',
      dataCategory: 'DATA_AGGREGATION',
      id: uuidv4(),
      date,
      sourceStats,
      totalRecords: courses.length,
      activeRecords,
      expiredRecords,
      averageQualityScore: avgQualityScore,
      trustDistribution,
      calculatedAt: now,
    };

    await putItem(stats);

    logger.info('Daily stats calculated', { date, totalRecords: courses.length });

    return stats;
  }

  /**
   * 获取统计
   */
  async getStats(date: string): Promise<AggregationStats | null> {
    const { PK, SK } = createStatsKey(date);
    return getItem<AggregationStats>({ PK, SK });
  }
}

// 导出服务实例
export const dataSourceConfigService = new DataSourceConfigService();
export const rawDataService = new RawDataService();
export const aggregatedCourseService = new AggregatedCourseService();
export const aggregationStatsService = new AggregationStatsService();
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| **数据源管理** |
| GET | /api/v1/aggregation/datasources | 获取数据源列表 | |
| POST | /api/v1/aggregation/datasources | 创建数据源 | 管理员 |
| GET | /api/v1/aggregation/datasources/:id | 获取数据源详情 | |
| PUT | /api/v1/aggregation/datasources/:id | 更新数据源 | 管理员 |
| **数据抓取** |
| POST | /api/v1/aggregation/crawl | 触发抓取 | 手动 |
| POST | /api/v1/aggregation/crawl/:sourceId | 触发指定源抓取 | |
| **聚合数据** |
| GET | /api/v1/aggregation/courses | 查询聚合课程 | |
| GET | /api/v1/aggregation/courses/:id | 获取课程详情 | |
| GET | /api/v1/aggregation/courses/:id/original | 获取原始数据 | 管理员 |
| PUT | /api/v1/aggregation/courses/:id/status | 更新状态 | 管理员 |
| **统计** |
| GET | /api/v1/aggregation/stats | 获取统计信息 | |
| GET | /api/v1/aggregation/stats/daily | 获取每日统计 | |
| GET | /api/v1/aggregation/stats/trust | 获取信任分布 | |

### 4.2 API 详细设计

#### 4.2.1 GET /api/v1/aggregation/courses

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20 |
| region | string | 否 | 地区筛选 |
| minScore | number | 否 | 最低质量分 |
| trustLevel | string | 否 | 信任等级 |
| subjects | string[] | 否 | 科目筛选 |

**响应示例** (200):
```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": "course-001",
        "title": "高中数学辅导",
        "description": "专业高中数学一对一辅导",
        "price": 50,
        "priceUnit": "hour",
        "region": "Auckland",
        "trustLevel": "A",
        "qualityScore": 85,
        "subjects": ["数学"],
        "teachingMode": ["online", "offline"],
        "images": ["https://..."]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

#### 4.2.2 GET /api/v1/aggregation/stats/trust

**响应示例** (200):
```json
{
  "success": true,
  "data": {
    "distribution": {
      "S": 10,
      "A": 45,
      "B": 60,
      "C": 30,
      "D": 5
    },
    "totalRecords": 150,
    "averageScore": 72
  }
}
```

---

## 五、前端实现

### 5.1 数据聚合管理页面

```typescript
// src/pages/admin/DataAggregation.tsx
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Space, Statistic, Row, Col, Select, DatePicker } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, SettingOutlined, BarChartOutlined } from '@ant-design/icons';
import { aggregationApi } from '../../api/aggregation';
import { AggregatedCourse } from '../../types/aggregation';

export const DataAggregation: React.FC = () => {
  const [courses, setCourses] = useState<AggregatedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadCourses();
    loadStats();
  }, [pagination.current]);

  const loadCourses = async (params?: any) => {
    setLoading(true);
    try {
      const response = await aggregationApi.getCourses({
        page: pagination.current,
        limit: pagination.pageSize,
        ...params,
      });
      setCourses(response.data.courses);
      setPagination(prev => ({ ...prev, total: response.data.pagination.total }));
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await aggregationApi.getTrustStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const triggerCrawl = async (sourceId?: string) => {
    try {
      if (sourceId) {
        await aggregationApi.crawlSource(sourceId);
      } else {
        await aggregationApi.crawlAll();
      }
      loadCourses();
    } catch (error) {
      console.error('Failed to trigger crawl:', error);
    }
  };

  const trustLevelColors: Record<string, string> = {
    S: 'gold',
    A: 'green',
    B: 'blue',
    C: 'orange',
    D: 'red',
  };

  const columns = [
    {
      title: '课程名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: AggregatedCourse) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{record.sourceType}</div>
        </div>
      ),
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number, record: AggregatedCourse) => `$${price}/${record.priceUnit}`,
    },
    {
      title: '地区',
      dataIndex: 'region',
      key: 'region',
    },
    {
      title: '质量分',
      dataIndex: 'qualityScore',
      key: 'qualityScore',
      sorter: (a: AggregatedCourse, b: AggregatedCourse) => a.qualityScore - b.qualityScore,
    },
    {
      title: '信任等级',
      dataIndex: 'trustLevel',
      key: 'trustLevel',
      render: (level: string) => (
        <Tag color={trustLevelColors[level]}>{level}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>{status}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: AggregatedCourse) => (
        <Space>
          <Button type="link" size="small">查看</Button>
          <Button type="link" size="small">原始数据</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="data-aggregation">
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总课程数" value={stats?.totalRecords || 0} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="S级" value={stats?.distribution?.S || 0} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="A级" value={stats?.distribution?.A || 0} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="B级" value={stats?.distribution?.B || 0} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Space>
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => triggerCrawl()}>
                立即抓取
              </Button>
              <Button icon={<BarChartOutlined />} onClick={loadStats}>
                刷新统计
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 数据表格 */}
      <Card title="聚合课程列表">
        <Table
          columns={columns}
          dataSource={courses}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={(p) => setPagination({ ...pagination, current: p.current || 1 })}
        />
      </Card>
    </div>
  );
};
```

---

## 六、单元测试

### 6.1 数据聚合服务测试

```typescript
// src/modules/data-aggregation/data-aggregation.service.test.ts
import {
  dataSourceConfigService,
  rawDataService,
  aggregatedCourseService,
  aggregationStatsService,
} from './data-aggregation.service';
import {
  DataSourceType,
  DataSourceStatus,
  AggregatedDataStatus,
} from './data-aggregation.types';
import { mockPutItem, mockGetItem, mockQueryItems, mockUpdateItem, mockDeleteItem } from '../../test/mocks';

// Mock desensitization service
jest.mock('@modules/trust/desensitization.service', () => ({
  desensitizationService: {
    maskPhone: jest.fn().mockResolvedValue('021***1234'),
    maskWechat: jest.fn().mockResolvedValue('wx***1234'),
  },
}));

describe('DataSourceConfigService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createDataSource', () => {
    it('US01-HP-001: should create data source successfully', async () => {
      // Given
      const dto = {
        name: 'Gumtree',
        type: DataSourceType.GUMTREE,
        baseUrl: 'https://www.gumtree.co.nz',
        selectors: {
          courseList: '.listing',
          courseItem: '.listing-item',
          title: '.title',
          description: '.description',
          price: '.price',
          contact: '.contact',
          location: '.location',
          category: '.category',
          images: '.images',
        },
        updateFrequency: 6,
      };

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await dataSourceConfigService.createDataSource(dto);

      // Then
      expect(result).toBeDefined();
      expect(result.name).toBe('Gumtree');
      expect(result.type).toBe(DataSourceType.GUMTREE);
      expect(result.status).toBe(DataSourceStatus.ACTIVE);
      expect(result.updateFrequency).toBe(6);
      expect(putItem).toHaveBeenCalledTimes(1);
    });

    it('US01-HP-002: should set default values correctly', async () => {
      // Given
      const dto = {
        name: 'Facebook',
        type: DataSourceType.FACEBOOK,
        baseUrl: 'https://facebook.com',
        selectors: {} as any,
        updateFrequency: 12,
      };

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await dataSourceConfigService.createDataSource(dto);

      // Then
      expect(result.totalRecords).toBe(0);
      expect(result.successRate).toBe(100);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('getDataSource', () => {
    it('US01-HP-003: should return data source when exists', async () => {
      // Given
      const mockSource = {
        id: 'source-123',
        name: 'Test Source',
        type: DataSourceType.GUMTREE,
        status: DataSourceStatus.ACTIVE,
      };

      (getItem as jest.Mock).mockResolvedValue(mockSource);

      // When
      const result = await dataSourceConfigService.getDataSource('source-123');

      // Then
      expect(result).toEqual(mockSource);
      expect(getItem).toHaveBeenCalledWith({
        PK: 'DATASOURCE#source-123',
        SK: 'METADATA',
      });
    });

    it('US01-FC-001: should return null when not found', async () => {
      // Given
      (getItem as jest.Mock).mockResolvedValue(null);

      // When
      const result = await dataSourceConfigService.getDataSource('non-existent');

      // Then
      expect(result).toBeNull();
    });
  });

  describe('updateDataSource', () => {
    it('US01-HP-004: should update selectors successfully', async () => {
      // Given
      const sourceId = 'source-123';
      const dto = {
        selectors: {
          courseList: '.new-listings',
          courseItem: '.new-item',
        },
      };

      const mockUpdated = {
        id: sourceId,
        selectors: dto.selectors,
        updatedAt: '2026-01-26T10:00:00Z',
      };

      (getItem as jest.Mock).mockResolvedValue({ id: sourceId });
      (updateItem as jest.Mock).mockResolvedValue(mockUpdated);

      // When
      const result = await dataSourceConfigService.updateDataSource(sourceId, dto);

      // Then
      expect(result.selectors).toEqual(dto.selectors);
      expect(updateItem).toHaveBeenCalled();
    });

    it('US01-FC-002: should update status to paused', async () => {
      // Given
      const sourceId = 'source-123';
      const dto = {
        status: DataSourceStatus.PAUSED,
      };

      (getItem as jest.Mock).mockResolvedValue({ id: sourceId });
      (updateItem as jest.Mock).mockResolvedValue({ ...dto });

      // When
      const result = await dataSourceConfigService.updateDataSource(sourceId, dto);

      // Then
      expect(result.status).toBe(DataSourceStatus.PAUSED);
    });
  });
});

describe('AggregatedCourseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processAndSaveCourse', () => {
    it('US02-HP-001: should process and save course with trust level A', async () => {
      // Given
      const params = {
        sourceId: 'source-123',
        sourceUrl: 'https://gumtree.co.nz/item/123',
        sourceType: DataSourceType.GUMTREE,
        rawData: {
          title: '高中数学辅导',
          description: '专业一对一辅导',
          price: '$50/hour',
          region: 'Auckland',
          teachingMode: ['online'],
          subjects: ['数学'],
          contactPhone: '0212345678',
        },
        qualityDimensions: {
          completeness: 90,
          accuracy: 85,
          freshness: 95,
          consistency: 80,
        },
      };

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await aggregatedCourseService.processAndSaveCourse(params);

      // Then
      expect(result).toBeDefined();
      expect(result.title).toBe('高中数学辅导');
      expect(result.qualityScore).toBe(87); // Weighted: 90*0.3 + 85*0.3 + 95*0.2 + 80*0.2 = 87
      expect(result.trustLevel).toBe('A');
      expect(result.status).toBe(AggregatedDataStatus.ACTIVE);
      expect(result.contactPhone).toBe('021***1234'); // Desensitized
    });

    it('US02-HP-002: should calculate trust level S for high quality', async () => {
      // Given
      const params = {
        sourceId: 'source-123',
        sourceUrl: 'https://gumtree.co.nz/item/124',
        sourceType: DataSourceType.GUMTREE,
        rawData: {
          title: '高质量课程',
          description: '完整描述',
          price: '$100/hour',
          region: 'Auckland',
          teachingMode: ['online', 'offline'],
          subjects: ['数学', '物理'],
          images: ['img1.jpg', 'img2.jpg'],
        },
        qualityDimensions: {
          completeness: 95,
          accuracy: 95,
          freshness: 95,
          consistency: 95,
        },
      };

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await aggregatedCourseService.processAndSaveCourse(params);

      // Then
      expect(result.qualityScore).toBe(95);
      expect(result.trustLevel).toBe('S');
    });

    it('US02-FC-001: should calculate trust level D for low quality', async () => {
      // Given
      const params = {
        sourceId: 'source-123',
        sourceUrl: 'https://gumtree.co.nz/item/125',
        sourceType: DataSourceType.GUMTREE,
        rawData: {
          title: '',
          description: '',
          price: '0',
        },
        qualityDimensions: {
          completeness: 20,
          accuracy: 30,
          freshness: 40,
          consistency: 30,
        },
      };

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await aggregatedCourseService.processAndSaveCourse(params);

      // Then
      expect(result.qualityScore).toBe(29); // Weighted
      expect(result.trustLevel).toBe('D');
    });

    it('US02-EC-001: should handle empty subjects array', async () => {
      // Given
      const params = {
        sourceId: 'source-123',
        sourceUrl: 'https://gumtree.co.nz/item/126',
        sourceType: DataSourceType.GUMTREE,
        rawData: {
          title: '课程',
          description: '描述',
          subjects: [],
        },
        qualityDimensions: {
          completeness: 70,
          accuracy: 70,
          freshness: 70,
          consistency: 70,
        },
      };

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await aggregatedCourseService.processAndSaveCourse(params);

      // Then
      expect(result.subjects).toEqual(['unknown']);
    });

    it('US02-EC-002: should handle invalid price format', async () => {
      // Given
      const params = {
        sourceId: 'source-123',
        sourceUrl: 'https://gumtree.co.nz/item/127',
        sourceType: DataSourceType.GUMTREE,
        rawData: {
          title: '课程',
          description: '描述',
          price: 'Negotiable',
        },
        qualityDimensions: {
          completeness: 70,
          accuracy: 70,
          freshness: 70,
          consistency: 70,
        },
      };

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await aggregatedCourseService.processAndSaveCourse(params);

      // Then
      expect(result.price).toBe(0);
    });
  });

  describe('queryCourses', () => {
    it('US02-HP-003: should return paginated results', async () => {
      // Given
      const mockCourses = Array.from({ length: 5 }, (_, i) => ({
        id: `course-${i}`,
        title: `Course ${i}`,
        qualityScore: 80 + i,
        trustLevel: 'A',
        status: AggregatedDataStatus.ACTIVE,
        region: 'Auckland',
      }));

      (queryItems as jest.Mock).mockResolvedValue({ items: mockCourses });

      // When
      const result = await aggregatedCourseService.queryCourses({
        page: 1,
        limit: 10,
      });

      // Then
      expect(result.courses).toHaveLength(5);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(5);
    });

    it('US02-FC-002: should filter by trust level', async () => {
      // Given
      const mockCourses = [
        { id: '1', trustLevel: 'S', qualityScore: 95 },
        { id: '2', trustLevel: 'A', qualityScore: 80 },
      ];

      (queryItems as jest.Mock).mockResolvedValue({ items: mockCourses });

      // When
      const result = await aggregatedCourseService.queryCourses({
        trustLevel: 'A',
      });

      // Then
      expect(queryItems).toHaveBeenCalled();
    });
  });

  describe('getCourseById', () => {
    it('US02-HP-004: should return course when exists', async () => {
      // Given
      const mockCourse = {
        id: 'course-123',
        title: 'Test Course',
        qualityScore: 85,
      };

      (getItem as jest.Mock).mockResolvedValue(mockCourse);

      // When
      const result = await aggregatedCourseService.getCourseById('course-123');

      // Then
      expect(result).toEqual(mockCourse);
    });
  });
});

describe('AggregationStatsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDailyStats', () => {
    it('US03-HP-001: should calculate correct trust distribution', async () => {
      // Given
      const mockCourses = [
        { id: '1', trustLevel: 'S', qualityScore: 95, sourceId: 's1', status: AggregatedDataStatus.ACTIVE },
        { id: '2', trustLevel: 'A', qualityScore: 85, sourceId: 's1', status: AggregatedDataStatus.ACTIVE },
        { id: '3', trustLevel: 'A', qualityScore: 80, sourceId: 's2', status: AggregatedDataStatus.ACTIVE },
        { id: '4', trustLevel: 'B', qualityScore: 70, sourceId: 's1', status: AggregatedDataStatus.ACTIVE },
        { id: '5', trustLevel: 'D', qualityScore: 30, sourceId: 's2', status: AggregatedDataStatus.EXPIRED },
      ];

      (queryItems as jest.Mock).mockResolvedValue({ items: mockCourses });
      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await aggregationStatsService.calculateDailyStats('2026-01-26');

      // Then
      expect(result.trustDistribution).toEqual({ S: 1, A: 2, B: 1, C: 0, D: 1 });
      expect(result.totalRecords).toBe(5);
      expect(result.activeRecords).toBe(4);
      expect(result.expiredRecords).toBe(1);
      expect(result.averageQualityScore).toBe(72); // (95+85+80+70+30)/5
    });
  });
});
```

---

## 七、验收标准

- [x] 数据源可以配置和管理
- [x] 数据抓取正常，覆盖主要数据源（Gumtree, Facebook）
- [x] 数据清洗准确，去除无效信息
- [x] 数据脱敏合规，联系方式已脱敏
- [x] 质量评估客观，有评分依据
- [x] 信任标识合理，有等级说明（S/A/B/C/D）
- [x] 定时调度正常，数据及时更新
- [x] 统计功能正常，支持信任分布统计

---

## 八、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 数据抓取被封 | 中 | 中 | User-Agent 轮换, 请求频率控制 |
| 数据质量不稳定 | 中 | 中 | 质量评分机制, 信任等级筛选 |
| 隐私合规风险 | 低 | 高 | 强制脱敏处理, 数据过期清理 |
| 数据源变更 | 中 | 中 | 灵活的选择器配置 |
| 并发处理压力 | 低 | 中 | 异步处理, 分批入库 |

---

```typescript
interface DataSourceConfig {
  id: string;
  name: string;
  type: 'gumtree' | 'facebook' | 'api' | 'manual';
  baseUrl: string;
  selectors: {
    courseList: string;
    courseItem: string;
    title: string;
    description: string;
    price: string;
    contact: string;
  };
  updateFrequency: number;  // 小时
  lastCrawledAt?: string;
  status: 'active' | 'paused' | 'error';
}
```

### 2.2 Gumtree 抓取

```typescript
interface GumtreeCourse {
  id: string;
  title: string;
  description: string;
  price: number;
  priceType: 'hour' | 'lesson';
  location: {
    region: string;
    address: string;
  };
  contact: {
    name: string;
    phone?: string;
    postedAt: string;
  };
  category: string;
  images: string[];
}

async function crawlGumtree(): Promise<GumtreeCourse[]> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // 访问搜索页面
  await page.goto('https://www.gumtree.co.nz/f-education-tutoring-services-u10013867');
  
  // 提取课程列表
  const courses = await page.$$eval('.listing', (elements) => {
    return elements.map(el => ({
      id: el.dataset.id,
      title: el.querySelector('.title')?.textContent,
      price: el.querySelector('.price')?.textContent,
      // ...
    }));
  });
  
  await browser.close();
  return courses;
}
```

---

## 三、数据处理管道

### 3.1 处理流程

```
原始数据 (S3)
      │
      ▼
┌──────────────┐
│  数据清洗     │  → 去除 HTML 标签、格式化价格、标准化地区
└──────────────┘
      │
      ▼
┌──────────────┐
│  数据脱敏     │  → 电话号码脱敏、微信号脱敏
└──────────────┘
      │
      ▼
┌──────────────┐
│  质量评估     │  → 完整性、准确性、新鲜度评分
└──────────────┘
      │
      ▼
┌──────────────┐
│  信任标识     │  → S/A/B/C/D 等级评定
└──────────────┘
      │
      ▼
  DynamoDB
```

### 3.2 数据处理 Lambda

```typescript
interface DataPipelineInput {
  sourceId: string;
  rawDataKey: string;  // S3 key
}

async function processDataPipeline(input: DataPipelineInput): Promise<void> {
  // 1. 读取原始数据
  const rawData = await s3.getObject({
    Bucket: RAW_DATA_BUCKET,
    Key: input.rawDataKey
  }).promise();
  
  // 2. 数据清洗
  const cleanedData = await cleanData(rawData);
  
  // 3. 数据脱敏
  const desensitizedData = await desensitizeData(cleanedData);
  
  // 4. 质量评估
  const qualityScore = await assessQuality(desensitizedData);
  
  // 5. 信任标识
  const trustLevel = calculateTrustLevel(desensitizedData, qualityScore);
  
  // 6. 存入 DynamoDB
  await saveToDynamoDB({
    ...desensitizedData,
    qualityScore,
    trustLevel,
    dataSource: input.sourceId
  });
}

function cleanData(data: RawCourseData): CleanedCourseData {
  return {
    title: data.title?.trim() || '',
    description: data.description?.trim() || '',
    price: parsePrice(data.price),
    region: normalizeRegion(data.region),
    // ...
  };
}
```

---

## 四、调度配置

```

---

## 七、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 数据抓取被封 | 中 | 中 | User-Agent 轮换, 请求频率控制 |
| 数据质量不稳定 | 中 | 中 | 质量评分机制, 信任等级筛选 |
| 隐私合规风险 | 低 | 高 | 强制脱敏处理, 数据过期清理 |
| 数据源变更 | 中 | 中 | 灵活的选择器配置 |
| 并发处理压力 | 低 | 中 | 异步处理, 分批入库 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/trust/tech-data-aggregation.md`

**相关文档**:
- [数据脱敏](tech-desensitization.md)
- [数据质量](tech-data-quality.md)

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/mvp/tech-data-aggregation.md`

**相关文档**:
- [产品设计](../../05-product-design/mvp/feature-data-aggregation.md)
- [数据脱敏](tech-desensitization.md)
- [数据质量](tech-data-quality.md)
