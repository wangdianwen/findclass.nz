---
title: 技术实现 - 数据统计
category: tech-architecture
created: 2026-01-21
author: linus-torvalds
version: 1.0
phase: 2
priority: P0
status: complete
related_feature: ../../05-product-design/admin/analytics.md
---

# 技术实现: 数据统计

> **对应产品文档**: [feature-analytics.md](../../05-product-design/phase-2/feature-analytics.md) | **优先级**: P0 | **排期**: Phase 2 | **状态**: 待实现

---

## 一、技术架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         数据统计架构                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [数据采集]                                                        │
│   ├── 用户行为埋点                                                  │
│   ├── 业务数据同步                                                  │
│   └── 定时任务汇总                                                  │
│         │                                                           │
│         ▼                                                           │
│   [Lambda: analytics-collector]                                     │
│         │                                                           │
│         ▼                                                           │
│   [DynamoDB: daily_stats]                                          │
│   [DynamoDB: realtime_stats]                                        │
│         │                                                           │
│         ▼                                                           │
│   [Lambda: analytics-api]                                          │
│         │                                                           │
│         ▼                                                           │
│   [前端图表]                                                        │
│   └── Chart.js / Recharts                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、数据模型 (DynamoDB)

### 2.1 UserEvents 表

```typescript
interface UserEvent {
  PK: string;                  // EVENT#{eventId}
  SK: string;                  // METADATA
  entityType: 'USER_EVENT';
  dataCategory: 'ANALYTICS';
  id: string;
  userId?: string;             // 可选 (匿名用户)
  sessionId: string;
  eventType: string;           // page_view, search, click, etc.
  eventData: Record<string, any>;
  pageUrl: string;
  referrerUrl?: string;
  deviceType: string;
  os: string;
  browser: string;
  ipAddress: string;
  createdAt: string;

  GSI1PK?: string;             // USER#{userId}
  GSI1SK?: string;             // EVENT_TYPE#{eventType}
  GSI2PK?: string;             // SESSION#{sessionId}
  GSI2SK?: string;             // CREATED_AT#{createdAt}
}
```

### 2.2 DailyStats 表

```typescript
interface DailyStat {
  PK: string;                  // STATS#{statDate}
  SK: string;                  // DAILY
  entityType: 'DAILY_STAT';
  dataCategory: 'ANALYTICS';
  id: string;
  statDate: string;            // YYYY-MM-DD

  // 用户统计
  dau: number;
  newUsers: number;
  activeUsers: number;

  // 课程统计
  totalCourses: number;
  newCourses: number;
  courseViews: number;

  // 交易统计
  totalOrders: number;
  totalGmv: number;

  // 教师统计
  totalTeachers: number;
  activeTeachers: number;

  // 时间戳
  createdAt: string;
  updatedAt: string;
}
```

### 2.3 RealtimeStats 表

```typescript
interface RealtimeStat {
  PK: string;                  // REALTIME#{statDate}
  SK: string;                  // TYPE#{type}
  entityType: 'REALTIME_STAT';
  dataCategory: 'ANALYTICS';
  id: string;
  statDate: string;
  statType: string;            // dau, pageviews, bookings, etc.
  value: number;
  userId?: string;
  sessionId?: string;
  pagePath?: string;
  expiresAt: string;
  createdAt: string;
}
```

---

## 三、API 设计

### 3.1 API 列表

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /stats/overview | 获取概览数据 |
| GET | /stats/users | 用户统计 |
| GET | /stats/courses | 课程统计 |
| GET | /stats/revenue | 收入统计 |
| GET | /stats/trends | 趋势数据 |
| GET | /stats/export | 导出报表 |

---

## 四、实时统计

### 4.1 DynamoDB 计数器

```typescript
class RealtimeStats {
  private dynamoDB: DynamoDBDocumentClient;

  private getRealtimeKey(statDate: string, statType: string): { PK: string; SK: string } {
    return {
      PK: `REALTIME#${statDate}`,
      SK: `TYPE#${statType}`,
    };
  }

  // 增加 DAU
  async incrementDAU(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const key = this.getRealtimeKey(today, 'dau');

    const existing = await getItem<RealtimeStat>(key);
    if (existing) {
      await updateItem(key, 'SET #value = #value + :inc, updatedAt = :now', {
        ':inc': 1,
        ':now': new Date().toISOString(),
      }, { '#value': 'value' });
    } else {
      await putItem({
        ...key,
        entityType: 'REALTIME_STAT',
        dataCategory: 'ANALYTICS',
        id: uuidv4(),
        statDate: today,
        statType: 'dau',
        value: 1,
        userId,
        expiresAt: Math.floor(Date.now() / 1000) + 86400 * 7,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 获取今日 DAU
  async getTodayDAU(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const { PK, SK } = this.getRealtimeKey(today, 'dau');
    const stat = await getItem<RealtimeStat>({ PK, SK });
    return stat?.value || 0;
  }

  // 增加页面浏览
  async incrementPageViews(page: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const key = this.getRealtimeKey(today, `pageviews:${page}`);

    const existing = await getItem<RealtimeStat>(key);
    if (existing) {
      await updateItem(key, 'SET #value = #value + :inc, updatedAt = :now', {
        ':inc': 1,
        ':now': new Date().toISOString(),
      }, { '#value': 'value' });
    } else {
      await putItem({
        ...key,
        entityType: 'REALTIME_STAT',
        dataCategory: 'ANALYTICS',
        id: uuidv4(),
        statDate: today,
        statType: `pageviews:${page}`,
        value: 1,
        pagePath: page,
        expiresAt: Math.floor(Date.now() / 1000) + 86400,
        createdAt: new Date().toISOString(),
      });
    }
  }
}
```

---

## 五、前端实现

### 5.1 统计仪表盘

```typescript
// src/pages/admin/AnalyticsPage.tsx
import React, { useEffect, useState } from 'react';
import { Row, Col, Card, DatePicker, Select, Table, Tabs } from 'antd';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { analyticsApi } from '../../api/analytics';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

export const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<[moment.Moment, moment.Moment]>([
    moment().subtract(7, 'days'),
    moment(),
  ]);
  const [overview, setOverview] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [overviewRes, trendRes] = await Promise.all([
        analyticsApi.getOverview({ start: dateRange[0], end: dateRange[1] }),
        analyticsApi.getTrends({ start: dateRange[0], end: dateRange[1] }),
      ]);
      setOverview(overviewRes.data);
      setTrendData(trendRes.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h1>数据统计</h1>
        <RangePicker
          value={dateRange}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setDateRange([dates[0], dates[1]]);
            }
          }}
        />
      </div>

      <Tabs defaultActiveKey="overview">
        <TabPane tab="概览" key="overview">
          <Row gutter={16}>
            <Col span={6}>
              <Card>
                <Statistic title="日活用户" value={overview?.dau || 0} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="新增用户" value={overview?.newUsers || 0} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="课程浏览量" value={overview?.courseViews || 0} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="收入" value={overview?.revenue || 0} prefix="$" precision={2} />
              </Card>
            </Col>
          </Row>

          <Card title="用户增长趋势" style={{ marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="dau" name="日活" stroke="#8884d8" fill="#8884d8" />
                <Area type="monotone" dataKey="newUsers" name="新增" stroke="#82ca9d" fill="#82ca9d" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </TabPane>

        <TabPane tab="课程" key="courses">
          <Card title="课程统计">
            <Table
              columns={[
                { title: '课程', dataIndex: 'title', key: 'title' },
                { title: '浏览量', dataIndex: 'views', key: 'views' },
                { title: '收藏数', dataIndex: 'favorites', key: 'favorites' },
                { title: '预约数', dataIndex: 'bookings', key: 'bookings' },
              ]}
              dataSource={overview?.courseStats || []}
              rowKey="id"
            />
          </Card>
        </TabPane>

        <TabPane tab="收入" key="revenue">
          <Card title="收入趋势">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" name="收入" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};
```

---

## 六、测试用例

### 6.1 单元测试

```typescript
// src/modules/analytics/analytics.service.test.ts
import { analyticsService } from './analytics.service';
import { mockPutItem, mockGetItem, mockUpdateItem } from '../../test/mocks';

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('incrementDAU', () => {
    it('AN-HP-01: should increment DAU counter', async () => {
      // Given
      const userId = 'user-123';
      (getItem as jest.Mock).mockResolvedValue(null);
      (putItem as jest.Mock).mockResolvedValue({});

      // When
      await analyticsService.incrementDAU(userId);

      // Then
      expect(putItem).toHaveBeenCalled();
    });
  });

  describe('getTodayDAU', () => {
    it('AN-HP-02: should return DAU count', async () => {
      // Given
      (getItem as jest.Mock).mockResolvedValue({ value: 100 });

      // When
      const result = await analyticsService.getTodayDAU();

      // Then
      expect(result).toBe(100);
    });
  });
});
```

---

## 七、验收标准

- [x] 统计数据准确
- [x] 支持多维度统计
- [x] 实时数据更新
- [x] 支持数据导出
- [x] 图表展示正常

---

## 八、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 数据延迟 | 中 | 低 | 实时统计与批量统计结合 |
| 存储成本 | 低 | 低 | 数据生命周期策略 |
| 数据丢失 | 低 | 高 | 多区域备份 |
| 查询性能 | 中 | 中 | 预聚合统计 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/admin/tech-analytics.md`

**相关文档**:
- [产品设计](../../05-product-design/admin/analytics.md)
