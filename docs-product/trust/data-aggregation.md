---
title: External Data Aggregation
category: product-design
created: 2026-01-21
author: steve-jobs
version: 1.0
phase: 1
priority: P0
status: pending-development
---

# Feature: External Data Aggregation - 外部数据抓取

> **功能模块**: 数据聚合 | **优先级**: P0 | **排期**: Phase 1 | **状态**: 待开发

---

## 一、功能概述

### 1.1 功能描述

外部数据抓取系统负责从Gumtree、Facebook等外部平台抓取课程信息，快速建立平台课程数据库，支持Phase 1阶段"信息聚合平台"的快速启动。

### 1.2 核心价值

- **快速启动**: 无需等待教师入驻，快速提供课程信息
- **内容丰富**: 聚合多平台数据，内容量充足
- **低成本**: 自动化抓取，节省人工成本
- **数据差异化**: 聚合数据vs注册用户数据形成分层

### 1.3 用户故事

```
作为 平台运营
我希望 从Gumtree自动抓取课程信息
以便 快速建立课程数据库

作为 平台运营
我希望 定期更新抓取的数据
以便 保持课程信息的新鲜度

作为 用户
我希望 搜索到的课程包含来自Gumtree的信息
以便 有更多选择
```

---

## 二、数据来源设计

### 2.1 支持的数据来源

| 来源 | 类型 | 优先级 | 权重 | 说明 |
|------|------|--------|------|------|
| **平台注册用户** | 第一方 | 最高 | 1.5x | 用户自主发布，数据质量最高 |
| **Gumtree** | 聚合 | 高 | 1.0x | 新西兰主流分类信息网站 |
| **Facebook** | 聚合 | 中 | 0.8x | 新西兰华人社群主要平台 |
| **其他来源** | 聚合 | 低 | 0.5x | 其他零散来源 |

### 2.2 抓取目标网站

#### 2.2.1 Gumtree

| 项目 | 说明 |
|------|------|
| URL | https://www.gumtree.co.nz |
| 分类 | Education & Tutoring |
| 数据字段 | 标题、描述、价格、联系方式、地区、发布时间 |
| 抓取频率 | 每天1次 |
| 预计数量 | 50-100条/周 |

#### 2.2.2 Facebook

| 项目 | 说明 |
|------|------|
| URL | Facebook Groups (新西兰华人社群) |
| 分类 | 教育相关群组 |
| 数据字段 | 帖子内容、评论、发布时间、群组信息 |
| 抓取频率 | 每天1次 |
| 预计数量 | 30-50条/周 |

---

## 三、抓取流程设计

### 3.1 整体流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                        数据抓取流程                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │ 定时触发 │───▶│ 访问网站 │───▶│ 解析页面 │───▶│ 数据清洗 │     │
│  │ (每天)   │    │ 获取HTML │    │ 提取信息 │    │ 格式化   │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│                                                           │        │
│                                                           ▼        │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │ 存入数据库│◀───│ 质量检查 │◀───│ 信任评估 │◀───│ 脱敏处理 │     │
│  │          │    │          │    │          │    │          │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 各阶段说明

| 阶段 | 说明 | 关键技术 |
|------|------|----------|
| 定时触发 | 每天凌晨2点执行 | Cron Job |
| 访问网站 | 模拟浏览器访问，获取页面 | Puppeteer/Cheerio |
| 解析页面 | 从HTML中提取结构化数据 | Cheerio/CSS选择器 |
| 数据清洗 | 格式化、验证、去重 | Node.js |
| 脱敏处理 | 敏感信息脱敏 | 正则表达式 |
| 信任评估 | 计算信任等级和权重 | 信任模型 |
| 质量检查 | 检查数据完整性 | 规则引擎 |
| 存入数据库 | 持久化存储 | Prisma/PostgreSQL |

---

## 四、数据模型设计

### 4.1 原始数据表

```sql
CREATE TABLE raw_course_data (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 来源信息
    source_type     VARCHAR(50) NOT NULL,  -- gumtree, facebook, etc.
    source_url      TEXT NOT NULL,
    source_id       VARCHAR(255),          -- 原始平台ID
    
    -- 原始数据
    raw_title       TEXT NOT NULL,
    raw_description  TEXT,
    raw_price       VARCHAR(100),
    raw_contact     JSONB,                 -- 原始联系方式
    raw_location    VARCHAR(255),
    raw_posted_at   TIMESTAMP,
    raw_html        TEXT,                  -- 原始HTML，保留用于复查
    
    -- 处理状态
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, processed, rejected
    processed_at    TIMESTAMP,
    
    -- 清洗后数据
    cleaned_data    JSONB,
    trust_level     VARCHAR(10),
    desensitized    BOOLEAN DEFAULT FALSE,
    
    -- 关联课程（处理后）
    course_id       UUID REFERENCES courses(id),
    
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_raw_course_data_source ON raw_course_data(source_type, source_id);
CREATE INDEX idx_raw_course_data_status ON raw_course_data(status);
CREATE INDEX idx_raw_course_data_created ON raw_course_data(created_at);
```

### 4.2 数据来源表

```sql
CREATE TABLE data_sources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type     VARCHAR(50) NOT NULL UNIQUE,
    source_name     VARCHAR(100) NOT NULL,
    source_url      TEXT,
    weight          DECIMAL(3,2) NOT NULL DEFAULT 1.0,  -- 搜索权重
    trust_level     VARCHAR(10) DEFAULT 'C',             -- 默认信任等级
    
    -- 抓取配置
    crawl_enabled   BOOLEAN DEFAULT TRUE,
    crawl_schedule  VARCHAR(100) DEFAULT '0 2 * * *',   -- Cron表达式
    last_crawl_at   TIMESTAMP,
    next_crawl_at   TIMESTAMP,
    
    -- 统计
    total_records   INTEGER DEFAULT 0,
    active_records  INTEGER DEFAULT 0,
    
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- 插入默认数据来源
INSERT INTO data_sources (source_type, source_name, source_url, weight, trust_level) VALUES
('first_party', '平台注册用户', NULL, 1.5, 'A'),
('gumtree', 'Gumtree', 'https://www.gumtree.co.nz', 1.0, 'C'),
('facebook', 'Facebook社群', NULL, 0.8, 'D'),
('other', '其他来源', NULL, 0.5, 'D');
```

---

## 五、抓取器设计

### 5.1 Gumtree抓取器

```typescript
// crawlers/gumtree.ts
import * as cheerio from 'cheerio';

interface GumtreeCourse {
  id: string;
  title: string;
  description: string;
  price: string;
  location: string;
  postedAt: Date;
  contact: {
    phone?: string;
    email?: string;
    name?: string;
  };
  url: string;
}

export async function crawlGumtreeEducation(): Promise<GumtreeCourse[]> {
  const courses: GumtreeCourse[] = [];
  const url = 'https://www.gumtree.co.nz/s-education-tutoring/v1z2z0z1z2003';
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EduSearchNZ/1.0)',
      },
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // 解析列表页
    $('.listing-item').each((_, element) => {
      const course = parseGumtreeItem($, element);
      if (course) {
        courses.push(course);
      }
    });
    
    return courses;
  } catch (error) {
    console.error('Gumtree crawl error:', error);
    return [];
  }
}

function parseGumtreeItem($: cheerio.CheerioAPI, element: cheerio.Element): GumtreeCourse | null {
  try {
    const $item = $(element);
    const url = $item.find('.listing-title a').attr('href');
    
    if (!url) return null;
    
    return {
      id: extractIdFromUrl(url),
      title: $item.find('.listing-title').text().trim(),
      description: $item.find('.listing-description').text().trim(),
      price: $item.find('.listing-price').text().trim(),
      location: $item.find('.listing-location').text().trim(),
      postedAt: parseDate($item.find('.listing-date').text().trim()),
      contact: parseContact($item),
      url: `https://www.gumtree.co.nz${url}`,
    };
  } catch (error) {
    console.error('Parse error:', error);
    return null;
  }
}
```

### 5.2 抓取调度器

```typescript
// crawlers/scheduler.ts
import { cron } from 'cron';

const crawlers = {
  gumtree: crawlGumtreeEducation,
  facebook: crawlFacebookGroups,
};

export function startCrawlScheduler() {
  // Gumtree: 每天凌晨2点
  cron.schedule('0 2 * * *', async () => {
    console.log('Starting Gumtree crawl...');
    await crawlers.gumtree();
  });
  
  // Facebook: 每天凌晨3点
  cron.schedule('0 3 * * *', async () => {
    console.log('Starting Facebook crawl...');
    await crawlers.facebook();
  });
  
  console.log('Crawl scheduler started');
}
```

---

## 六、数据处理流程

### 6.1 数据清洗规则

| 字段 | 清洗规则 |
|------|----------|
| 标题 | 去除多余空格，限制100字符 |
| 描述 | 去除HTML标签，限制2000字符 |
| 价格 | 提取数字，单位标准化为NZD |
| 地区 | 映射到标准地区代码 |
| 时间 | 转换为ISO 8601格式 |
| 联系方式 | 提取并存储原始值（后续脱敏） |

### 6.2 数据去重规则

| 去重维度 | 说明 |
|----------|------|
| 标题相似度 | 标题相似度>80%视为重复 |
| 价格+地区+描述 | 三者都相同视为重复 |
| 联系方式 | 联系方式相同视为重复 |

### 6.3 质量评分规则

| 评分维度 | 评分规则 |
|----------|----------|
| 完整性 | 字段填充率 |
| 准确性 | 价格格式正确、地区有效 |
| 新鲜度 | 发布时间距今时间 |
| 可信度 | 来源可信度 |

---

## 七、API 设计

### 7.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| GET | /api/v1/admin/crawl/status | 抓取状态 | 返回各来源抓取状态 |
| POST | /api/v1/admin/crawl/trigger | 手动触发 | 触发指定来源抓取 |
| GET | /api/v1/admin/crawl/logs | 抓取日志 | 返回抓取历史 |
| GET | /api/v1/admin/sources | 数据来源管理 | 返回/更新来源配置 |

### 7.2 API 详细设计

#### 7.2.1 GET /api/v1/admin/crawl/status

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "gumtree": {
      "enabled": true,
      "lastCrawlAt": "2026-01-15T02:00:00Z",
      "nextCrawlAt": "2026-01-16T02:00:00Z",
      "totalRecords": 1250,
      "activeRecords": 890,
      "status": "idle"
    },
    "facebook": {
      "enabled": true,
      "lastCrawlAt": "2026-01-15T03:00:00Z",
      "nextCrawlAt": "2026-01-16T03:00:00Z",
      "totalRecords": 680,
      "activeRecords": 420,
      "status": "idle"
    }
  }
}
```

---

## 八、测试用例

### 8.1 功能测试用例

| 测试场景 | 操作步骤 | 预期结果 |
|----------|----------|----------|
| 正常抓取 | 触发Gumtree抓取 | 正确解析并返回数据 |
| 数据清洗 | 提交原始数据 | 按规则清洗完成 |
| 去重 | 提交重复数据 | 识别并跳过 |
| 脱敏 | 处理联系方式 | 敏感信息已脱敏 |
| 调度 | 等待定时任务 | 按计划自动执行 |

---

## 九、实现计划

### 9.1 开发任务分解

| 任务 | 描述 | 预估工时 | 依赖 |
|------|------|----------|------|
| 数据库设计 | 创建raw_course_data表 | 4h | - |
| Gumtree抓取器 | 实现Gumtree数据抓取 | 12h | 数据库 |
| Facebook抓取器 | 实现Facebook数据抓取 | 12h | 数据库 |
| 数据清洗服务 | 实现数据清洗逻辑 | 8h | 抓取器 |
| 去重服务 | 实现数据去重 | 4h | 数据清洗 |
| 脱敏服务 | 实现数据脱敏 | 4h | 数据清洗 |
| 调度器 | 实现定时抓取任务 | 4h | 抓取器 |
| 管理API | 实现抓取管理API | 8h | 全部 |
| 单元测试 | 抓取功能测试 | 8h | 全部 |

### 9.2 验收标准

- [ ] Gumtree数据正确抓取
- [ ] Facebook数据正确抓取
- [ ] 数据自动清洗
- [ ] 重复数据正确识别
- [ ] 联系方式正确脱敏
- [ ] 定时任务正常执行
- [ ] 管理界面可查看状态

---

## 十、风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 网站反爬 | 中 | 高 | 控制频率，使用代理 |
| 页面结构变化 | 高 | 中 | 监控解析错误，及时调整 |
| 数据质量问题 | 中 | 中 | 质量检查，人工抽检 |
| 法律合规 | 低 | 高 | 仅抓取公开信息 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/05-product-design/feature-data-aggregation.md`

**相关文档**:
- [功能概览](feature-overview.md)
- [数据脱敏处理](feature-desensitization.md)
- [数据质量控制](feature-data-quality.md)
