---
title: 技术实现 - 数据质量控制
category: tech-architecture
created: 2026-01-21
author: linus-torvalds
version: 1.0
phase: 1
priority: P0
status: pending-implementation
related_feature: ../../05-product-design/mvp/feature-data-quality.md
---

# 技术实现: 数据质量控制

> **对应产品文档**: [feature-data-quality.md](../../05-product-design/mvp/feature-data-quality.md) | **优先级**: P0 | **排期**: Phase 1 | **状态**: 待实现

---

## 一、技术架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         数据质量控制架构                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [数据入口]                                                        │
│   ├── 爬虫抓取                                                      │
│   ├── API 导入                                                      │
│   └── 手动录入                                                      │
│         │                                                           │
│         ▼                                                           │
│   [质量检查引擎]                                                    │
│   ├── 完整性检查                                                    │
│   ├── 准确性检查                                                    │
│   ├── 一致性检查                                                    │
│   └── 时效性检查                                                    │
│         │                                                           │
│         ▼                                                           │
│   [处理队列]                                                        │
│   ├── 自动修复                                                      │
│   ├── 人工审核                                                      │
│   └── 数据标记                                                      │
│         │                                                           │
│         ▼                                                           │
│   [DynamoDB: courses]                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、质量检查规则

### 2.1 检查规则配置

```typescript
interface QualityRule {
  id: string;
  name: string;
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  severity: 'error' | 'warning' | 'info';
  conditions: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    minValue?: number;
    maxValue?: number;
    required?: boolean;
  };
  autoFix?: boolean;
  fixValue?: any;
}

const QUALITY_RULES: QualityRule[] = [
  {
    id: 'title-required',
    name: '标题必填',
    field: 'title',
    type: 'required',
    severity: 'error',
    conditions: { required: true },
    autoFix: false
  },
  {
    id: 'title-length',
    name: '标题长度',
    field: 'title',
    type: 'range',
    severity: 'warning',
    conditions: { minLength: 5, maxLength: 100 },
    autoFix: false
  },
  {
    id: 'price-valid',
    name: '价格有效',
    field: 'price',
    type: 'range',
    severity: 'error',
    conditions: { minValue: 0, maxValue: 10000 },
    autoFix: true,
    fixValue: null
  },
  {
    id: 'email-format',
    name: '邮箱格式',
    field: 'contact_email',
    type: 'format',
    severity: 'warning',
    conditions: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    autoFix: false
  }
];
```

### 2.2 质量评分算法

```typescript
interface QualityResult {
  score: number;              // 0-100
  issues: QualityIssue[];
  level: 'excellent' | 'good' | 'fair' | 'poor';
}

function assessQuality(course: Course): QualityResult {
  let score = 100;
  const issues: QualityIssue[] = [];
  
  // 必填字段检查
  const requiredFields = ['title', 'price', 'region', 'subject'];
  for (const field of requiredFields) {
    if (!course[field]) {
      score -= 20;
      issues.push({
        field,
        severity: 'error',
        message: `${field} 为必填项`
      });
    }
  }
  
  // 长度检查
  if (course.title && course.title.length < 5) {
    score -= 10;
    issues.push({
      field: 'title',
      severity: 'warning',
      message: '标题长度不足5字符'
    });
  }
  
  // 格式检查
  if (course.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(course.contact_email)) {
    score -= 5;
    issues.push({
      field: 'contact_email',
      severity: 'warning',
      message: '邮箱格式不正确'
    });
  }
  
  // 计算质量等级
  let level: QualityResult['level'];
  if (score >= 90) level = 'excellent';
  else if (score >= 70) level = 'good';
  else if (score >= 50) level = 'fair';
  else level = 'poor';
  
  return { score: Math.max(0, score), issues, level };
}
```

---

## 三、数据验证服务

### 3.1 验证服务实现

```typescript
class DataQualityService {
  async validateCourse(course: Course): Promise<QualityResult> {
    const results = await Promise.all(
      QUALITY_RULES.map(rule => this.checkRule(course, rule))
    );
    
    return this.aggregateResults(results);
  }
  
  private async checkRule(course: Course, rule: QualityRule): Promise<QualityCheckResult> {
    const value = getNestedValue(course, rule.field);
    
    switch (rule.type) {
      case 'required':
        return this.checkRequired(value, rule);
      case 'format':
        return this.checkFormat(value, rule);
      case 'range':
        return this.checkRange(value, rule);
      default:
        return { passed: true };
    }
  }
  
  private checkRequired(value: any, rule: QualityRule): QualityCheckResult {
    const passed = value !== null && value !== undefined && value !== '';
    return {
      passed,
      rule: rule.id,
      severity: rule.severity,
      message: passed ? '通过' : `${rule.field} 为必填项`
    };
  }
  
  private checkRange(value: number, rule: QualityRule): QualityCheckResult {
    const passed = value >= (rule.conditions.minValue || 0) 
                && value <= (rule.conditions.maxValue || Infinity);
    return {
      passed,
      rule: rule.id,
      severity: rule.severity,
      message: passed ? '通过' : `${rule.field} 超出有效范围`
    };
  }
}
```

---

## 四、数据库设计

### 4.1 DynamoDB 字段

```typescript
interface CourseWithQuality {
  // ... 其他字段
  
  // 质量相关
  quality_score: number;      // 0-100
  quality_level: 'excellent' | 'good' | 'fair' | 'poor';
  quality_issues: QualityIssue[];
  quality_checked_at: string;
  
  // 审核相关
  reviewed: boolean;
  reviewed_at?: string;
  reviewed_by?: string;
  review_status: 'pending' | 'approved' | 'rejected';
  review_notes?: string;
}
```

---

## 五、业务逻辑实现

```typescript
// src/modules/data-quality/data-quality.service.ts
import { logger } from '@core/logger';
import { Course } from '../courses/courses.types';
import { QualityRule, QualityResult, QualityIssue, QualityCheckResult, QualityLevel } from './data-quality.types';
import { putItem, getItem, updateItem, queryItems } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache } from '@shared/db/dynamodb';

const DEFAULT_QUALITY_RULES: QualityRule[] = [
  { id: 'title-required', name: '标题必填', field: 'title', type: 'required', severity: 'error', conditions: { required: true }, autoFix: false },
  { id: 'title-length', name: '标题长度', field: 'title', type: 'range', severity: 'warning', conditions: { minLength: 5, maxLength: 100 }, autoFix: false },
  { id: 'price-valid', name: '价格有效', field: 'price', type: 'range', severity: 'error', conditions: { minValue: 0, maxValue: 10000 }, autoFix: true, fixValue: null },
  { id: 'email-format', name: '邮箱格式', field: 'contact_email', type: 'format', severity: 'warning', conditions: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }, autoFix: false },
];

export class DataQualityService {
  /**
   * 评估数据质量
   */
  async assessQuality(course: Course): Promise<QualityResult> {
    const cacheKey = `quality:${course.id}`;
    const cached = await getFromCache<QualityResult>(cacheKey, 'TRUST');
    if (cached) return cached;

    const results = await Promise.all(
      DEFAULT_QUALITY_RULES.map(rule => this.checkRule(course, rule))
    );

    const result = this.aggregateResults(results);

    // 缓存结果
    await setCache(cacheKey, 'TRUST', result, 3600);

    return result;
  }

  /**
   * 检查单条规则
   */
  private async checkRule(course: Course, rule: QualityRule): Promise<QualityCheckResult> {
    const value = this.getNestedValue(course, rule.field);

    switch (rule.type) {
      case 'required':
        return this.checkRequired(value, rule);
      case 'format':
        return this.checkFormat(value, rule);
      case 'range':
        return this.checkRange(value, rule);
      default:
        return { passed: true };
    }
  }

  private checkRequired(value: any, rule: QualityRule): QualityCheckResult {
    const passed = value !== null && value !== undefined && value !== '';
    return {
      passed,
      rule: rule.id,
      severity: rule.severity,
      message: passed ? '通过' : `${rule.field} 为必填项`
    };
  }

  private checkFormat(value: string, rule: QualityRule): QualityCheckResult {
    if (!value) return { passed: true, rule: rule.id, severity: 'info', message: '跳过' };
    const pattern = rule.conditions.pattern;
    const passed = pattern ? pattern.test(value) : true;
    return {
      passed,
      rule: rule.id,
      severity: rule.severity,
      message: passed ? '通过' : `${rule.field} 格式不正确`
    };
  }

  private checkRange(value: number, rule: QualityRule): QualityCheckResult {
    if (value === undefined || value === null) return { passed: true, rule: rule.id, severity: 'info', message: '跳过' };
    const passed = value >= (rule.conditions.minValue || 0) && value <= (rule.conditions.maxValue || Infinity);
    return {
      passed,
      rule: rule.id,
      severity: rule.severity,
      message: passed ? '通过' : `${rule.field} 超出有效范围`
    };
  }

  /**
   * 汇总检查结果
   */
  private aggregateResults(results: QualityCheckResult[]): QualityResult {
    let score = 100;
    const issues: QualityIssue[] = [];

    for (const result of results) {
      if (!result.passed) {
        // 根据严重程度扣分
        const deduction = result.severity === 'error' ? 20 : result.severity === 'warning' ? 10 : 5;
        score -= deduction;
        issues.push({
          field: result.rule,
          severity: result.severity,
          message: result.message,
          autoFixable: false,
        });
      }
    }

    let level: QualityLevel;
    if (score >= 90) level = 'excellent';
    else if (score >= 70) level = 'good';
    else if (score >= 50) level = 'fair';
    else level = 'poor';

    return {
      score: Math.max(0, score),
      issues,
      level,
    };
  }

  /**
   * 更新课程质量数据
   */
  async updateCourseQuality(courseId: string, course: Course): Promise<void> {
    const result = await this.assessQuality(course);
    const now = new Date().toISOString();

    await updateItem(
      { PK: `COURSE#${courseId}`, SK: 'METADATA' },
      `SET quality_score = :score,
             quality_level = :level,
             quality_issues = :issues,
             quality_checked_at = :now,
             updated_at = :now`,
      {
        ':score': result.score,
        ':level': result.level,
        ':issues': result.issues,
        ':now': now,
      }
    );

    await deleteCache(`quality:${courseId}`, 'TRUST');

    logger.info('Quality score updated', { courseId, level: result.level, score: result.score });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
  }
}

export const dataQualityService = new DataQualityService();
```

---

## 六、测试用例

### 6.1 单元测试

```typescript
// src/modules/data-quality/data-quality.service.test.ts
import { dataQualityService } from './data-quality.service';

describe('DataQualityService', () => {
  describe('assessQuality', () => {
    it('should return excellent for complete course data', async () => {
      const mockCourse = {
        id: 'course-123',
        title: '高质量数学课程',  // >= 5
        description: '这是一门完整的数学辅导课程。',  // 存在
        price: 50,  // 0-10000
        contact_email: 'teacher@example.com',  // 有效格式
      };

      const result = await dataQualityService.assessQuality(mockCourse);

      expect(result.level).toBe('excellent');
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.issues.filter(i => !i.passed).length).toBe(0);
    });

    it('should detect missing title', async () => {
      const mockCourse = {
        id: 'course-456',
        title: '',  // 缺失
        description: '有描述',
        price: 50,
      };

      const result = await dataQualityService.assessQuality(mockCourse);

      const titleIssue = result.issues.find(i => i.field === 'title-required');
      expect(titleIssue).toBeDefined();
      expect(titleIssue?.severity).toBe('error');
      expect(result.level).not.toBe('excellent');
    });

    it('should detect invalid price', async () => {
      const mockCourse = {
        id: 'course-789',
        title: '课程标题',
        description: '描述',
        price: 15000,  // 超出范围
      };

      const result = await dataQualityService.assessQuality(mockCourse);

      const priceIssue = result.issues.find(i => i.field === 'price-valid');
      expect(priceIssue).toBeDefined();
      expect(result.score).toBeLessThan(100);
    });

    it('should handle missing optional fields', async () => {
      const mockCourse = {
        id: 'course-101',
        title: '课程',
        description: '',  // 空但可接受
        price: 0,  // 有效
      };

      const result = await dataQualityService.assessQuality(mockCourse);

      expect(result.score).toBeGreaterThan(50);
    });
  });

  describe('checkRequired', () => {
    it('should pass for non-empty value', () => {
      const rule = { id: 'test', field: 'test', type: 'required' as const, severity: 'error' as const, conditions: { required: true } };
      const result = dataQualityService['checkRequired']('value', rule);
      expect(result.passed).toBe(true);
    });

    it('should fail for empty value', () => {
      const rule = { id: 'test', field: 'test', type: 'required' as const, severity: 'error' as const, conditions: { required: true } };
      const result = dataQualityService['checkRequired']('', rule);
      expect(result.passed).toBe(false);
    });

    it('should fail for null value', () => {
      const rule = { id: 'test', field: 'test', type: 'required' as const, severity: 'error' as const, conditions: { required: true } };
      const result = dataQualityService['checkRequired'](null, rule);
      expect(result.passed).toBe(false);
    });
  });

  describe('checkRange', () => {
    it('should pass for value in range', () => {
      const rule = { id: 'test', field: 'price', type: 'range' as const, severity: 'error' as const, conditions: { minValue: 0, maxValue: 10000 } };
      const result = dataQualityService['checkRange'](5000, rule);
      expect(result.passed).toBe(true);
    });

    it('should fail for value below range', () => {
      const rule = { id: 'test', field: 'price', type: 'range' as const, severity: 'error' as const, conditions: { minValue: 0, maxValue: 10000 } };
      const result = dataQualityService['checkRange'](-100, rule);
      expect(result.passed).toBe(false);
    });

    it('should fail for value above range', () => {
      const rule = { id: 'test', field: 'price', type: 'range' as const, severity: 'error' as const, conditions: { minValue: 0, maxValue: 10000 } };
      const result = dataQualityService['checkRange'](20000, rule);
      expect(result.passed).toBe(false);
    });
  });
});
```

---

## 七、验收标准

- [ ] 数据质量检查规则完整
- [ ] 质量评分客观，有评分依据
- [ ] 问题数据能够被识别和标记
- [ ] 支持自动修复和人工审核
- [ ] 质量数据定期更新
- [ ] 单元测试覆盖核心逻辑

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/trust/tech-data-quality.md`

**相关文档**:
- [产品设计](../../05-product-design/trust/feature-data-quality.md)
- [数据聚合](tech-data-aggregation.md)
