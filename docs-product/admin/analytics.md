---
title: Data Analytics and Statistics
category: product-design
created: 2026-01-21
author: steve-jobs
version: 1.0
phase: 2
priority: P1
status: pending-development
---

# Feature: Data Analytics and Statistics - 数据统计分析

> **功能模块**: 运营支撑 | **优先级**: P1 | **排期**: Phase 2 | **状态**: 待开发

---

## 一、功能概述

### 1.1 功能描述

数据统计分析功能为平台运营提供全面的数据报表和分析能力，支持用户行为分析、业务指标监控、趋势分析等。

### 1.2 核心价值

- **数据驱动**: 基于数据做运营决策
- **问题发现**: 通过数据发现业务问题
- **效果评估**: 评估运营活动效果
- **趋势预测**: 预测业务发展趋势

### 1.3 用户故事

```
作为 平台运营
我希望 查看每日活跃用户数
以便 了解平台增长情况

作为 平台运营
我希望 分析用户来源渠道
以便 优化推广策略

作为 平台运营
我希望 查看课程转化漏斗
以便 发现转化环节的问题
```

---

## 二、统计指标体系

### 2.1 核心指标

| 指标类别 | 指标项 | 说明 |
|----------|--------|------|
| **用户指标** |
| DAU | 日活跃用户数 | 每日独立访问用户 |
| MAU | 月活跃用户数 | 每月独立访问用户 |
| 新增用户 | 每日新增注册用户 | 每日新增用户数 |
| 留存率 | 次日/7日/30日留存 | 用户留存情况 |
| **课程指标** |
| 课程数量 | 平台课程总数 | 有效课程数 |
| 课程浏览 | 课程页面PV/UV | 课程热度 |
| 课程转化 | 浏览→收藏→预约转化率 | 转化漏斗 |
| **交易指标** |
| 订单量 | 每日/每周订单数 | 订单量统计 |
| 交易额 | 每日/每周/每月GMV | 交易金额 |
| 客单价 | 每单平均金额 | 客单价 |
| **教师指标** |
| 教师数量 | 认证教师总数 | 供给侧规模 |
| 教师活跃 | 活跃教师数 | 有课程/预约的教师 |
| 教师收入 | 教师收入统计 | 教师收益 |

### 2.2 分析维度

| 维度 | 说明 |
|------|------|
| 时间维度 | 按日/周/月/季度/年查看 |
| 地区维度 | 按城市/区域查看 |
| 课程分类 | 按科目/年级查看 |
| 来源渠道 | 按用户来源查看 |
| 设备类型 | 按PC/移动端查看 |

---

## 三、数据模型设计

### 3.1 统计数据表

```sql
-- 每日统计
CREATE TABLE daily_statistics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    stat_date       DATE NOT NULL UNIQUE,
    
    -- 用户统计
    dau             INTEGER DEFAULT 0,
    new_users       INTEGER DEFAULT 0,
    active_users    INTEGER DEFAULT 0,
    
    -- 课程统计
    total_courses   INTEGER DEFAULT 0,
    new_courses     INTEGER DEFAULT 0,
    course_views    INTEGER DEFAULT 0,
    course_favorites INTEGER DEFAULT 0,
    
    -- 交易统计
    total_orders    INTEGER DEFAULT 0,
    total_gmv       DECIMAL(12,2) DEFAULT 0,
    total_commission DECIMAL(12,2) DEFAULT 0,
    
    -- 教师统计
    total_teachers  INTEGER DEFAULT 0,
    active_teachers INTEGER DEFAULT 0,
    
    created_at      TIMESTAMP DEFAULT NOW()
);

-- 用户行为事件表
CREATE TABLE user_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id         UUID REFERENCES users(id),
    session_id      VARCHAR(100),
    
    event_type      VARCHAR(50) NOT NULL,  -- page_view, search, click, etc.
    event_data      JSONB DEFAULT '{}',
    
    page_url        VARCHAR(500),
    referrer_url    VARCHAR(500),
    
    device_type     VARCHAR(20),
    os              VARCHAR(50),
    browser         VARCHAR(50),
    ip_address      VARCHAR(45),
    
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_events_user ON user_events(user_id, created_at);
CREATE INDEX idx_user_events_type ON user_events(event_type, created_at);
CREATE INDEX idx_user_events_session ON user_events(session_id);
```

### 3.2 统计报表配置表

```sql
CREATE TABLE report_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(50) NOT NULL,  -- daily, weekly, monthly, custom
    
    metrics         TEXT[] NOT NULL,  -- 指标列表
    dimensions      TEXT[],  -- 维度
    filters         JSONB,  -- 筛选条件
    
    schedule        VARCHAR(100),  -- 定时生成
    recipients      TEXT[],  -- 邮件接收人
    
    is_active       BOOLEAN DEFAULT TRUE,
    
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| GET | /api/v1/stats/overview | 获取概览数据 | 核心指标概览 |
| GET | /api/v1/stats/users | 用户统计 | 用户相关指标 |
| GET | /api/v1/stats/courses | 课程统计 | 课程相关指标 |
| GET | /api/v1/stats/revenue | 收入统计 | 交易相关指标 |
| GET | /api/v1/stats/trends | 趋势数据 | 时间序列数据 |
| GET | /api/v1/stats/export | 导出报表 | 导出数据 |
| POST | /api/v1/reports/schedule | 定时报表 | 配置定时报表 |

### 4.2 API 详细设计

#### 4.2.1 GET /api/v1/stats/overview

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "date": "2026-01-15",
    "period": "today",
    
    "users": {
      "dau": 1250,
      "dauChange": "+5.2%",
      "newUsers": 45,
      "newUsersChange": "+12.3%",
      "retentionRate": 68.5
    },
    
    "courses": {
      "totalCourses": 2500,
      "totalCoursesChange": "+2.1%",
      "courseViews": 8500,
      "courseViewsChange": "+8.5%",
      "favorites": 320
    },
    
    "revenue": {
      "gmv": 12500,
      "gmvChange": "+15.2%",
      "orders": 85,
      "ordersChange": "+10.4%",
      "commission": 1875,
      "commissionChange": "+15.2%"
    },
    
    "teachers": {
      "totalTeachers": 180,
      "activeTeachers": 125,
      "newTeachers": 8
    }
  }
}
```

---

## 五、前端设计

### 5.1 数据概览页

```
┌─────────────────────────────────────────────────────────────────────┐
│  数据概览                                                           │
├─────────────────────────────────────────────────────────────────────┤
│  📅 2026年1月15日  [◀]  [今天 ▼]  [▶]                              │
│                                                                     │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐   │
│  │ 👥 用户          │ │ 📚 课程          │ │ 💰 收入          │   │
│  │ ─────────────    │ │ ─────────────    │ │ ─────────────    │   │
│  │ DAU: 1,250      │ │ 课程: 2,500      │ │ GMV: $12,500    │   │
│  │ ↑5.2%           │ │ ↑2.1%            │ │ ↑15.2%          │   │
│  │ 新增: 45        │ │ 浏览: 8,500      │ │ 订单: 85        │   │
│  │ 留存: 68.5%     │ │ 收藏: 320        │ │ 佣金: $1,875    │   │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘   │
│                                                                     │
│  ──────────────────────────────────────────────────────────────    │
│                                                                     │
│  📈 趋势图表                                                        │
│  ──────────────────────────────────────────────────────────────    │
│  [DAU趋势图]                                                       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │     │                                                              │
│  │     │      /\                                                      │
│  │     │     /  \    /\                                              │
│  │     │    /    \  /  \                                            │
│  │     └──-/------\/----\----------------------------------------  │   │
│  │      1月10  1月11  1月12  1月13  1月14  1月15                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ──────────────────────────────────────────────────────────────    │
│                                                                     │
│  [导出数据]  [生成报表]  [设置定时报表]                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 详细报表页

```
┌─────────────────────────────────────────────────────────────────────┐
│  详细报表                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [用户分析] [课程分析] [收入分析] [转化分析]                        │
│                                                                     │
│  筛选条件:                                                          │
│  日期范围: [2026-01-01 ▼] 至 [2026-01-15 ▼]                        │
│  地区: [全部 ▼]  |  课程分类: [全部 ▼]  |  [查询]                  │
│                                                                     │
│  ──────────────────────────────────────────────────────────────    │
│                                                                     │
│  数据表格                                                           │
│  ──────────────────────────────────────────────────────────────    │
│  日期      | DAU  | 新增用户 | 课程浏览 | 订单数 | GMV             │
│  ──────────────────────────────────────────────────────────────    │
│  1月15日  | 1,250 |   45     |  8,500  |   85   | $12,500          │
│  1月14日  | 1,188 |   38     |  7,820  |   77   | $11,550          │
│  1月13日  | 1,125 |   42     |  7,450  |   72   | $10,800          │
│  ...      | ...   |   ...    |   ...   |  ...   | ...              │
│                                                                     │
│  ──────────────────────────────────────────────────────────────    │
│                                                                     │
│  [导出CSV]  [导出Excel]  [发送报表]                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 六、实现计划

### 6.1 开发任务分解

| 任务 | 描述 | 预估工时 | 依赖 |
|------|------|----------|------|
| 数据采集 | 实现用户行为埋点 | 16h | - |
| 统计服务 | 实现统计计算 | 16h | 数据库 |
| 报表API | 实现统计接口 | 16h | 统计服务 |
| 统计图表 | 实现数据可视化 | 16h | API设计 |
| 报表管理 | 实现报表配置 | 12h | API设计 |
| 管理后台 | 实现统计后台 | 16h | API设计 |
| 单元测试 | 统计功能测试 | 8h | 全部 |

### 6.2 验收标准

- [ ] 统计指标准确
- [ ] 图表展示正常
- [ ] 报表导出正常
- [ ] 定时报表发送正常

---

## 七、风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 数据延迟 | 中 | 中 | 实时+离线双链路 |
| 数据不准确 | 低 | 高 | 数据校验，异常监控 |
| 查询慢 | 中 | 中 | 预计算，分表分库 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/05-product-design/feature-analytics.md`

**相关文档**:
- [功能概览](feature-overview.md)
- [数据统计](feature-analytics.md)
