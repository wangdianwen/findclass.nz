---
title: Data Quality Control
category: product-design
created: 2026-01-21
author: steve-jobs
version: 1.0
phase: 1
priority: P0
status: pending-development
---

# Feature: Data Quality Control - 数据质量控制

> **功能模块**: 数据聚合 | **优先级**: P0 | **排期**: Phase 1 | **状态**: 待开发

---

## 一、功能概述

### 1.1 功能描述

数据质量控制系统负责监控、评估和维护平台课程数据的质量，包括数据完整性、准确性、新鲜度等维度，确保用户搜索到的课程信息可靠有效。

### 1.2 核心价值

- **数据可靠性**: 过滤低质量数据，提升平台公信力
- **用户体验**: 展示高质量、高相关性的搜索结果
- **运营效率**: 自动化数据质量监控，减少人工审核
- **持续优化**: 基于数据反馈持续改进质量标准

### 1.3 用户故事

```
作为 平台运营
我希望 自动检测过期或无效的课程信息
以便 及时清理低质量数据

作为 平台运营
我希望 查看数据质量统计报表
以便 了解整体数据质量状况

作为 用户
我希望 搜索到的课程信息都是有效且准确的
以便 节省筛选时间
```

---

## 二、质量评估体系

### 2.1 质量维度

| 维度 | 权重 | 说明 |
|------|------|------|
| **完整性** | 30% | 课程信息字段填充程度 |
| **准确性** | 25% | 信息格式正确、内容合理 |
| **新鲜度** | 20% | 信息发布/更新时间 |
| **可用性** | 15% | 联系方式是否有效 |
| **相关性** | 10% | 与用户搜索的匹配程度 |

### 2.2 各维度评分规则

#### 2.2.1 完整性评分 (0-100)

| 字段 | 分值 | 缺失扣分 |
|------|------|----------|
| 课程标题 | 20 | 无标题扣20分 |
| 课程描述 | 20 | 描述<50字扣10分，<20字扣20分 |
| 价格信息 | 15 | 无价格扣15分 |
| 教师信息 | 15 | 无教师信息扣15分 |
| 上课安排 | 15 | 无时间地点扣15分 |
| 联系方式 | 15 | 无联系方式扣15分 |

#### 2.2.2 准确性评分 (0-100)

| 检查项 | 规则 | 扣分 |
|--------|------|------|
| 价格格式 | 价格应为正数，有合理范围 | 不符合扣20分 |
| 邮箱格式 | 符合邮箱格式规范 | 不符合扣20分 |
| 电话格式 | 符合新西兰电话格式 | 不符合扣15分 |
| 日期格式 | 发布/更新时间有效 | 不符合扣10分 |
| 内容重复 | 与已有课程高度相似 | 扣30分 |

#### 2.2.3 新鲜度评分 (0-100)

| 时间范围 | 评分 |
|----------|------|
| 0-7天 | 100分 |
| 7-30天 | 90分 |
| 30-90天 | 70分 |
| 90-180天 | 50分 |
| 180天以上 | 30分 |

#### 2.2.4 可用性评分 (0-100)

| 检查项 | 规则 | 扣分 |
|--------|------|------|
| 电话有效性 | 拨打测试/格式验证 | 无效扣25分 |
| 邮箱有效性 | 发送测试/格式验证 | 无效扣25分 |
| 链接有效性 | 课程链接可访问 | 无效扣20分 |
| 位置有效性 | 地址可定位 | 无效扣20分 |

### 2.3 综合质量分计算

```
综合质量分 = 完整性×0.30 + 准确性×0.25 + 新鲜度×0.20 + 可用性×0.15 + 相关性×0.10
```

**质量等级划分**:

| 等级 | 分数范围 | 说明 |
|------|----------|------|
| **优秀** | 90-100 | 高质量，推荐展示 |
| **良好** | 70-89 | 质量较好，正常展示 |
| **一般** | 50-69 | 质量一般，降权展示 |
| **较差** | 30-49 | 质量较差，限制展示 |
| **劣质** | 0-29 | 质量很差，不予展示 |

---

## 三、数据质量规则引擎

### 3.1 规则定义

```typescript
interface QualityRule {
  id: string;
  name: string;
  dimension: 'completeness' | 'accuracy' | 'freshness' | 'usability';
  checkFunction: (data: CourseData) => RuleResult;
  severity: 'error' | 'warning' | 'info';
  autoFix?: boolean;
}

interface RuleResult {
  passed: boolean;
  score: number;
  message: string;
  details?: Record<string, any>;
}
```

### 3.2 规则实现示例

```typescript
// rules/completeness.rules.ts

export const completenessRules: QualityRule[] = [
  {
    id: 'TITLE_REQUIRED',
    name: '标题必填',
    dimension: 'completeness',
    checkFunction: (data) => {
      const hasTitle = data.title && data.title.trim().length > 0;
      return {
        passed: hasTitle,
        score: hasTitle ? 20 : 0,
        message: hasTitle ? '标题已填写' : '标题缺失',
      };
    },
    severity: 'error',
  },
  {
    id: 'DESCRIPTION_LENGTH',
    name: '描述长度',
    dimension: 'completeness',
    checkFunction: (data) => {
      const length = data.description?.trim().length || 0;
      let score = 0;
      let message = '';
      
      if (length >= 200) {
        score = 20;
        message = '描述完整';
      } else if (length >= 50) {
        score = 10;
        message = '描述较短';
      } else if (length > 0) {
        score = 5;
        message = '描述过短';
      } else {
        score = 0;
        message = '描述缺失';
      }
      
      return { passed: length >= 50, score, message };
    },
    severity: 'warning',
  },
  {
    id: 'PRICE_VALID',
    name: '价格有效',
    dimension: 'accuracy',
    checkFunction: (data) => {
      const hasPrice = data.price && data.price > 0;
      const reasonable = data.price && data.price < 1000; // 单价不超过1000
      const score = hasPrice && reasonable ? 15 : 0;
      
      return {
        passed: hasPrice && reasonable,
        score,
        message: hasPrice 
          ? (reasonable ? '价格合理' : '价格过高，请检查') 
          : '价格缺失',
      };
    },
    severity: 'error',
  },
];
```

### 3.3 质量评估服务

```typescript
// services/quality.service.ts

export class QualityService {
  private rules: QualityRule[] = [];
  
  constructor() {
    this.rules = [
      ...completenessRules,
      ...accuracyRules,
      ...freshnessRules,
      ...usabilityRules,
    ];
  }
  
  /**
   * 评估课程数据质量
   */
  async evaluateQuality(courseData: CourseData): Promise<QualityResult> {
    const results: RuleResult[] = [];
    let totalScore = 0;
    const dimensionScores = {
      completeness: 0,
      accuracy: 0,
      freshness: 0,
      usability: 0,
      relevance: 0,
    };
    
    for (const rule of this.rules) {
      const result = rule.checkFunction(courseData);
      results.push(result);
      totalScore += result.score;
      
      if (dimensionScores[rule.dimension] !== undefined) {
        dimensionScores[rule.dimension] += result.score;
      }
    }
    
    // 归一化各维度分数
    const maxScores = {
      completeness: 100,
      accuracy: 100,
      freshness: 100,
      usability: 100,
      relevance: 100,
    };
    
    const normalizedDimensions = {
      completeness: dimensionScores.completeness,
      accuracy: dimensionScores.accuracy,
      freshness: dimensionScores.freshness,
      usability: dimensionScores.usability,
      relevance: dimensionScores.relevance,
    };
    
    return {
      overallScore: totalScore,
      dimensions: normalizedDimensions,
      results,
      grade: this.calculateGrade(totalScore),
      evaluatedAt: new Date(),
    };
  }
  
  private calculateGrade(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'average';
    if (score >= 30) return 'poor';
    return 'bad';
  }
}
```

---

## 四、数据生命周期管理

### 4.1 状态流转

```
┌─────────────────────────────────────────────────────────────────────┐
│                        数据状态流转                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │  新数据  │───▶│  检测中  │───▶│  有效    │───▶│  过期    │     │
│  │  (New)   │    │  (Check) │    │  (Valid) │    │  (Expired)│    │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│       │              │               │               │              │
│       │              │               │               │              │
│       ▼              ▼               ▼               ▼              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │  无效    │    │  无效    │    │  待更新  │    │  待清理  │     │
│  │ (Invalid)│    │ (Invalid)│    │(Pending) │    │ (Cleanup)│     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│                                                                     │
│  状态说明:                                                          │
│  - New: 新抓取/新发布的数据                                         │
│  - Check: 质量检测中                                                │
│  - Valid: 通过检测，展示中                                          │
│  - Expired: 超过90天未更新                                          │
│  - Invalid: 检测不通过                                              │
│  - Pending: 需要人工审核                                            │
│  - Cleanup: 待删除                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 定时任务

| 任务 | 执行频率 | 说明 |
|------|----------|------|
| 质量检测 | 每小时 | 检测新增数据 |
| 过期检测 | 每天凌晨 | 标记过期数据 |
| 低分清理 | 每天凌晨 | 清理劣质数据 |
| 重新检测 | 每周 | 重新检测所有数据 |
| 统计报表 | 每天凌晨 | 生成质量统计 |

---

## 五、数据模型设计

### 5.1 质量检测结果表

```sql
CREATE TABLE quality_checks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID NOT NULL REFERENCES courses(id),
    
    -- 总体评分
    overall_score   INTEGER NOT NULL DEFAULT 0,
    grade           VARCHAR(20) NOT NULL,  -- excellent, good, average, poor, bad
    
    -- 各维度评分
    completeness    INTEGER DEFAULT 0,
    accuracy        INTEGER DEFAULT 0,
    freshness       INTEGER DEFAULT 0,
    usability       INTEGER DEFAULT 0,
    relevance       INTEGER DEFAULT 0,
    
    -- 检测详情
    check_results   JSONB DEFAULT '[]',
    issues          JSONB DEFAULT '[]',  -- [{ruleId, message, severity}]
    
    -- 状态
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, passed, failed
    checked_at      TIMESTAMP DEFAULT NOW(),
    next_check_at   TIMESTAMP,
    
    UNIQUE(course_id)
);

CREATE INDEX idx_quality_checks_course ON quality_checks(course_id);
CREATE INDEX idx_quality_checks_grade ON quality_checks(grade);
CREATE INDEX idx_quality_checks_score ON quality_checks(overall_score);
```

### 5.2 数据过期表

```sql
CREATE TABLE data_expiration (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID NOT NULL REFERENCES courses(id),
    
    published_at    TIMESTAMP NOT NULL,
    last_updated    TIMESTAMP NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    
    status          VARCHAR(20) DEFAULT 'active',  -- active, expired, archived
    notification_sent BOOLEAN DEFAULT FALSE,
    
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_data_expiration_expires ON data_expiration(expires_at);
CREATE INDEX idx_data_expiration_status ON data_expiration(status);
```

---

## 六、API 设计

### 6.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| GET | /api/v1/courses/:id/quality | 获取质量检测结果 | 返回课程质量信息 |
| GET | /api/v1/admin/quality/stats | 获取质量统计 | 返回整体统计 |
| POST | /api/v1/admin/quality/recheck | 重新检测 | 触发重新检测 |
| GET | /api/v1/admin/quality/issues | 获取问题数据 | 返回需要处理的数据 |

### 6.2 API 详细设计

#### 6.2.1 GET /api/v1/courses/:id/quality

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "courseId": "course-001",
    "overallScore": 85,
    "grade": "good",
    
    "dimensions": {
      "completeness": 90,
      "accuracy": 95,
      "freshness": 80,
      "usability": 85,
      "relevance": 75
    },
    
    "issues": [
      {
        "ruleId": "DESCRIPTION_LENGTH",
        "message": "描述较短，建议补充更多信息",
        "severity": "warning",
        "suggestion": "请添加至少200字的课程描述"
      }
    ],
    
    "checkedAt": "2026-01-15T10:30:00Z",
    "nextCheckAt": "2026-01-16T10:30:00Z"
  }
}
```

#### 6.2.2 GET /api/v1/admin/quality/stats

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "totalCourses": 1250,
    
    "gradeDistribution": {
      "excellent": 120,
      "good": 680,
      "average": 320,
      "poor": 100,
      "bad": 30
    },
    
    "averageScore": 72,
    
    "issues": {
      "total": 450,
      "bySeverity": {
        "error": 120,
        "warning": 280,
        "info": 50
      }
    },
    
    "expiredCount": 85,
    
    "trend": [
      {"date": "2026-01-14", "avgScore": 71},
      {"date": "2026-01-15", "avgScore": 72}
    ]
  }
}
```

---

## 七、测试用例

### 7.1 功能测试用例

| 测试场景 | 输入 | 预期结果 |
|----------|------|----------|
| 完整数据 | 所有字段完整填写 | 质量分90+ |
| 缺失标题 | 无标题 | 质量分下降20分 |
| 价格缺失 | 无价格信息 | 质量分下降15分 |
| 过期数据 | 180天未更新 | 新鲜度30分 |
| 格式错误 | 邮箱格式错误 | 准确性扣分 |
| 重复数据 | 与现有数据重复 | 整体降级 |

---

## 八、实现计划

### 8.1 开发任务分解

| 任务 | 描述 | 预估工时 | 依赖 |
|------|------|----------|------|
| 质量规则设计 | 设计各维度质量规则 | 8h | PRD |
| 规则引擎 | 实现规则引擎 | 12h | 质量规则 |
| 检测服务 | 实现质量检测服务 | 8h | 规则引擎 |
| 过期管理 | 实现数据过期管理 | 8h | - |
| 定时任务 | 实现定时检测任务 | 8h | 检测服务 |
| 统计报表 | 实现质量统计API | 8h | 检测服务 |
| 管理界面 | 实现质量管理后台 | 12h | API设计 |
| 单元测试 | 质量检测测试 | 8h | 全部 |

### 8.2 验收标准

- [ ] 质量评分准确
- [ ] 规则可配置
- [ ] 过期数据自动标记
- [ ] 统计报表正确
- [ ] 管理界面可用
- [ ] 定时任务正常执行

---

## 九、风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 规则误判 | 中 | 中 | 人工复核机制 |
| 规则不足 | 中 | 低 | 持续迭代优化 |
| 检测性能 | 低 | 中 | 异步检测，缓存结果 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/05-product-design/feature-data-quality.md`

**相关文档**:
- [功能概览](feature-overview.md)
- [信任标识系统](feature-trust-badges.md)
- [外部数据抓取](feature-data-aggregation.md)
