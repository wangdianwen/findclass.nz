---
title: 技术实现 - 信任标识
category: tech-architecture
created: 2026-01-21
author: linus-torvalds
version: 1.0
phase: 1
priority: P0
status: complete
related_feature: ../../05-product-design/trust/trust-badges.md
---

# 技术实现: 信任标识

> **对应产品文档**: [trust-badges.md](../../05-product-design/trust/trust-badges.md) | **优先级**: P0 | **排期**: Phase 1 | **状态**: 已实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                         技术架构层级                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [数据源]                                                          │
│   ├── Gumtree (第三方)                                              │
│   ├── Facebook (社群)                                               │
│   └── 注册教师 (第一方)                                             │
│         │                                                           │
│         ▼                                                           │
│   [信任评估引擎]                                                    │
│   ├── 数据来源评分                                                  │
│   ├── 内容质量评分                                                  │
│   ├── 活跃度评分                                                    │
│   └── 综合信任评级                                                  │
│         │                                                           │
│         ▼                                                           │
│   [DynamoDB: courses]                                              │
│   └── trust_level, trust_badges 字段                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、信任评级算法

### 2.1 评分维度

```typescript
interface TrustScore {
  sourceScore: number;      // 数据来源评分 (0-40)
  qualityScore: number;     // 内容质量评分 (0-30)
  activityScore: number;    // 活跃度评分 (0-20)
  verifiedScore: number;    // 认证评分 (0-10)
  
  totalScore: number;       // 总分 (0-100)
  trustLevel: 'S' | 'A' | 'B' | 'C' | 'D';
  badges: string[];
}

function calculateTrustScore(course: Course): TrustScore {
  // 1. 数据来源评分 (0-40)
  const sourceScores = {
    'first_party': 40,      // 注册教师，最高信任
    'gumtree': 25,         // 主流平台，可信度中
    'facebook': 15,        // 社群来源，可信度低
    'other': 10            // 其他来源，信任度最低
  };
  const sourceScore = sourceScores[course.data_source] || 10;
  
  // 2. 内容质量评分 (0-30)
  const qualityScore = calculateQualityScore(course);
  
  // 3. 活跃度评分 (0-20)
  const activityScore = calculateActivityScore(course);
  
  // 4. 认证评分 (0-10)
  const verifiedScore = course.verified ? 10 : 0;
  
  // 计算总分
  const totalScore = sourceScore + qualityScore + activityScore + verifiedScore;
  
  // 确定信任等级
  const trustLevel = determineTrustLevel(totalScore);
  
  // 生成信任标识
  const badges = generateBadges(course, trustLevel);
  
  return {
    sourceScore,
    qualityScore,
    activityScore,
    verifiedScore,
    totalScore,
    trustLevel,
    badges
  };
}
```

### 2.2 质量评分算法

```typescript
function calculateQualityScore(course: Course): number {
  let score = 0;
  
  // 标题完整性 (0-8)
  if (course.title && course.title.length >= 10) score += 8;
  else if (course.title && course.title.length >= 5) score += 5;
  else score += 2;
  
  // 描述完整性 (0-8)
  if (course.description && course.description.length >= 50) score += 8;
  else if (course.description && course.description.length >= 20) score += 5;
  else if (course.description) score += 2;
  
  // 价格信息 (0-4)
  if (course.price && course.price > 0) score += 4;
  
  // 联系方式 (0-5)
  if (course.contact_phone || course.contact_wechat) score += 5;
  
  // 图片 (0-5)
  if (course.images && course.images.length > 0) score += 5;
  
  return score;
}
```

### 2.3 信任等级划分

```typescript
const TRUST_LEVELS = {
  'S': { minScore: 85, label: 'S级', color: '#FFD700', description: '平台认证，强烈推荐' },
  'A': { minScore: 70, label: 'A级', color: '#52C41A', description: '来源可信，内容完整' },
  'B': { minScore: 55, label: 'B级', color: '#1890FF', description: '基本信息完整' },
  'C': { minScore: 40, label: 'C级', color: '#FAAD14', description: '信息较少，需谨慎' },
  'D': { minScore: 0,  label: 'D级', color: '#FF4D4F', description: '信息缺失或存疑' }
};

function determineTrustLevel(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 85) return 'S';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}
```

---

## 三、信任标识

### 3.1 标识类型

```typescript
const TRUST_BADGES = {
  PLATFORM_CERTIFIED: {
    id: 'platform_certified',
    name: '平台认证',
    nameEn: 'Platform Certified',
    icon: '🏆',
    description: '已通过平台资质审核'
  },
  SOURCE_VERIFIED: {
    id: 'source_verified',
    name: '来源验证',
    nameEn: 'Source Verified',
    icon: '✅',
    description: '信息已核实'
  },
  HIGH_QUALITY: {
    id: 'high_quality',
    name: '优质内容',
    nameEn: 'High Quality',
    icon: '⭐',
    description: '内容完整详尽'
  },
  ACTIVE: {
    id: 'active',
    name: '近期活跃',
    nameEn: 'Recently Active',
    icon: '🟢',
    description: '7天内有更新'
  },
  COMMUNITY: {
    id: 'community',
    name: '社群来源',
    nameEn: 'Community',
    icon: '📱',
    description: '来自社区分享'
  }
};

function generateBadges(course: Course, trustLevel: string): string[] {
  const badges: string[] = [];
  
  // S级自动获得平台认证
  if (trustLevel === 'S') {
    badges.push(TRUST_BADGES.PLATFORM_CERTIFIED.id);
  }
  
  // 第一方数据获得来源验证
  if (course.data_source === 'first_party') {
    badges.push(TRUST_BADGES.SOURCE_VERIFIED.id);
  }
  
  // 高质量内容
  if (course.images?.length > 0 && course.description?.length > 50) {
    badges.push(TRUST_BADGES.HIGH_QUALITY.id);
  }
  
  // 近期活跃
  const daysSinceUpdate = (Date.now() - new Date(course.updated_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate <= 7) {
    badges.push(TRUST_BADGES.ACTIVE.id);
  }
  
  // 社群来源
  if (course.data_source === 'facebook') {
    badges.push(TRUST_BADGES.COMMUNITY.id);
  }
  
  return badges;
}
```

---

## 四、数据库设计

### 4.1 DynamoDB 字段

```typescript
interface CourseWithTrust {
  // ... 其他字段
  
  // 信任相关
  trust_level: 'S' | 'A' | 'B' | 'C' | 'D';
  trust_score: number;
  trust_badges: string[];
  trust_calculated_at: string;
  trust_updated_at: string;
  
  // 验证相关
  verified: boolean;
  verified_at?: string;
  verified_by?: string;
}
```

---

## 五、前端展示

### 5.1 信任标识组件

```typescript
function TrustBadge({ level, badges }: { level: string; badges: string[] }) {
  const levelConfig = TRUST_LEVELS[level];
  
  return (
    <div className="trust-badges">
      <span 
        className="trust-level"
        style={{ backgroundColor: levelConfig.color }}
      >
        {levelConfig.label}
      </span>
      
      {badges.map(badgeId => {
        const badge = TRUST_BADGES[badgeId];
        return (
          <Tooltip key={badge.id} title={badge.description}>
            <span className="trust-badge">
              {badge.icon} {badge.name}
            </span>
          </Tooltip>
        );
      })}
    </div>
  );
}

// 课程卡片中使用
function CourseCard({ course }: { course: Course }) {
  return (
    <div className="course-card">
      <TrustBadge 
        level={course.trust_level} 
        badges={course.trust_badges} 
      />
      {/* 其他内容 */}
    </div>
  );
}
```

### 5.2 信任等级说明

```typescript
const TRUST_LEVEL_INFO = {
  'S': {
    title: 'S级 - 平台认证',
    description: '最高信任等级，已通过平台资质审核，强烈推荐',
    recommendation: '首选'
  },
  'A': {
    title: 'A级 - 来源可信',
    description: '信息完整，来自可信来源，可以信任',
    recommendation: '推荐'
  },
  'B': {
    title: 'B级 - 基本可信',
    description: '基本信息完整，建议进一步核实',
    recommendation: '可选'
  },
  'C': {
    title: 'C级 - 需谨慎',
    description: '信息较少或存在不确定性，请谨慎选择',
    recommendation: '谨慎'
  },
  'D': {
    title: 'D级 - 不推荐',
    description: '信息缺失或存在疑问，不建议选择',
    recommendation: '避免'
  }
};
```

---

## 六、业务逻辑实现

```typescript
// src/modules/trust/trust-badges.service.ts
import { logger } from '@core/logger';
import { Course } from '../courses/courses.types';
import { TrustScore, TrustLevel, TrustBadge, createTrustKey } from './trust.types';
import { putItem, getItem, updateItem, queryItems } from '@shared/db/dynamodb';
import { getFromCache, setCache } from '@shared/db/cache';

export class TrustBadgeService {
  private readonly sourceScores: Record<string, number> = {
    'first_party': 40,   // 注册教师，最高信任
    'gumtree': 25,       // 主流平台，可信度中
    'facebook': 15,      // 社群来源，可信度低
    'other': 10          // 其他来源，信任度最低
  };

  /**
   * 计算课程信任评分
   */
  calculateTrustScore(course: Course): TrustScore {
    // 1. 数据来源评分 (0-40)
    const sourceScore = this.sourceScores[course.data_source] || 10;

    // 2. 内容质量评分 (0-30)
    const qualityScore = this.calculateQualityScore(course);

    // 3. 活跃度评分 (0-20)
    const activityScore = this.calculateActivityScore(course);

    // 4. 认证评分 (0-10)
    const verifiedScore = course.verified ? 10 : 0;

    // 计算总分
    const totalScore = sourceScore + qualityScore + activityScore + verifiedScore;

    // 确定信任等级
    const trustLevel = this.determineTrustLevel(totalScore);

    // 生成信任标识
    const badges = this.generateBadges(course, trustLevel);

    return {
      sourceScore,
      qualityScore,
      activityScore,
      verifiedScore,
      totalScore,
      trustLevel,
      badges
    };
  }

  /**
   * 计算质量评分
   */
  private calculateQualityScore(course: Course): number {
    let score = 0;

    // 标题完整性 (0-8)
    if (course.title && course.title.length >= 10) score += 8;
    else if (course.title && course.title.length >= 5) score += 5;
    else score += 2;

    // 描述完整性 (0-8)
    if (course.description && course.description.length >= 50) score += 8;
    else if (course.description && course.description.length >= 20) score += 5;
    else if (course.description) score += 2;

    // 价格信息 (0-4)
    if (course.price && course.price > 0) score += 4;

    // 联系方式 (0-5)
    if (course.contact_phone || course.contact_wechat) score += 5;

    // 图片 (0-5)
    if (course.images && course.images.length > 0) score += 5;

    return score;
  }

  /**
   * 计算活跃度评分
   */
  private calculateActivityScore(course: Course): number {
    const daysSinceUpdate = (Date.now() - new Date(course.updated_at).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate <= 1) return 20;
    if (daysSinceUpdate <= 7) return 15;
    if (daysSinceUpdate <= 30) return 10;
    if (daysSinceUpdate <= 90) return 5;
    return 0;
  }

  /**
   * 确定信任等级
   */
  private determineTrustLevel(score: number): TrustLevel {
    if (score >= 85) return 'S';
    if (score >= 70) return 'A';
    if (score >= 55) return 'B';
    if (score >= 40) return 'C';
    return 'D';
  }

  /**
   * 生成信任标识
   */
  generateBadges(course: Course, trustLevel: string): string[] {
    const badges: string[] = [];

    // S级自动获得平台认证
    if (trustLevel === 'S') {
      badges.push('platform_certified');
    }

    // 第一方数据获得来源验证
    if (course.data_source === 'first_party') {
      badges.push('source_verified');
    }

    // 高质量内容
    if (course.images?.length > 0 && course.description?.length > 50) {
      badges.push('high_quality');
    }

    // 近期活跃
    const daysSinceUpdate = (Date.now() - new Date(course.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate <= 7) {
      badges.push('active');
    }

    return badges;
  }

  /**
   * 更新课程信任评分
   */
  async updateCourseTrustScore(courseId: string, course: Course): Promise<void> {
    const score = this.calculateTrustScore(course);
    const now = new Date().toISOString();

    await updateItem(
      { PK: `COURSE#${courseId}`, SK: 'METADATA' },
      `SET trust_level = :level,
             trust_score = :score,
             trust_badges = :badges,
             trust_calculated_at = :now,
             updated_at = :now`,
      {
        ':level': score.trustLevel,
        ':score': score.totalScore,
        ':badges': score.badges,
        ':now': now,
      }
    );

    // 清除缓存
    await deleteCache(`course:${courseId}:trust`, 'COURSE');

    logger.info('Trust score updated', { courseId, level: score.trustLevel, score: score.totalScore });
  }
}

export const trustBadgeService = new TrustBadgeService();
```

---

## 七、测试用例

### 7.1 单元测试

```typescript
// src/modules/trust/trust-badges.service.test.ts
import { trustBadgeService } from './trust-badges.service';

describe('TrustBadgeService', () => {
  describe('calculateTrustScore', () => {
    it('should calculate S level for first party verified course', () => {
      const mockCourse = {
        id: 'course-123',
        title: '高质量数学辅导课程',  // 长度 >= 10
        description: '这是一门非常完整的数学辅导课程，包含了从基础到高级的所有知识点。',  // 长度 >= 50
        price: 50,
        data_source: 'first_party',
        verified: true,
        images: ['img1.jpg', 'img2.jpg'],
        contact_phone: '021-123-4567',
        updated_at: new Date().toISOString(),
      };

      const result = trustBadgeService.calculateTrustScore(mockCourse);

      expect(result.trustLevel).toBe('S');
      expect(result.totalScore).toBeGreaterThanOrEqual(85);
      expect(result.badges).toContain('platform_certified');
      expect(result.badges).toContain('source_verified');
      expect(result.badges).toContain('high_quality');
    });

    it('should calculate A level for gumtree course with good content', () => {
      const mockCourse = {
        id: 'course-456',
        title: '钢琴课程',  // 长度 >= 5
        description: '专业钢琴教师一对一辅导',  // 长度 >= 20
        price: 40,
        data_source: 'gumtree',
        verified: false,
        images: ['piano.jpg'],
        updated_at: new Date().toISOString(),
      };

      const result = trustBadgeService.calculateTrustScore(mockCourse);

      expect(result.trustLevel).toBe('A');
      expect(result.sourceScore).toBe(25);  // gumtree
    });

    it('should calculate C level for incomplete course', () => {
      const mockCourse = {
        id: 'course-789',
        title: '课程',  // 长度 < 5
        description: '',  // 空描述
        price: 0,
        data_source: 'other',
        verified: false,
        images: [],
        updated_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),  // 100天前
      };

      const result = trustBadgeService.calculateTrustScore(mockCourse);

      expect(result.trustLevel).toBe('C');
      expect(result.badges).not.toContain('high_quality');
      expect(result.badges).not.toContain('active');
    });
  });

  describe('generateBadges', () => {
    it('should generate platform_certified for S level', () => {
      const mockCourse = { data_source: 'first_party' } as any;
      const badges = trustBadgeService.generateBadges(mockCourse, 'S');

      expect(badges).toContain('platform_certified');
    });

    it('should generate source_verified for first party', () => {
      const mockCourse = { data_source: 'first_party', images: [], description: '' } as any;
      const badges = trustBadgeService.generateBadges(mockCourse, 'B');

      expect(badges).toContain('source_verified');
    });

    it('should not generate badges for D level', () => {
      const mockCourse = { data_source: 'other', images: [], description: '' } as any;
      const badges = trustBadgeService.generateBadges(mockCourse, 'D');

      expect(badges.length).toBe(0);
    });
  });

  describe('determineTrustLevel', () => {
    it('should return S for score >= 85', () => {
      expect(trustBadgeService['determineTrustLevel'](100)).toBe('S');
      expect(trustBadgeService['determineTrustLevel'](85)).toBe('S');
    });

    it('should return A for score >= 70', () => {
      expect(trustBadgeService['determineTrustLevel'](84)).toBe('A');
      expect(trustBadgeService['determineTrustLevel'](70)).toBe('A');
    });

    it('should return B for score >= 55', () => {
      expect(trustBadgeService['determineTrustLevel'](69)).toBe('B');
      expect(trustBadgeService['determineTrustLevel'](55)).toBe('B');
    });

    it('should return C for score >= 40', () => {
      expect(trustBadgeService['determineTrustLevel'](54)).toBe('C');
      expect(trustBadgeService['determineTrustLevel'](40)).toBe('C');
    });

    it('should return D for score < 40', () => {
      expect(trustBadgeService['determineTrustLevel'](39)).toBe('D');
      expect(trustBadgeService['determineTrustLevel'](0)).toBe('D');
    });
  });
});
```

---

## 八、验收标准

- [ ] 信任评分算法合理，评分有依据
- [ ] 信任等级划分清晰，S/A/B/C/D 各有标准
- [ ] 信任标识显示正确，与评分一致
- [ ] 评分计算及时，数据更新后重新计算
- [ ] 前端展示美观，用户易于理解
- [ ] 单元测试覆盖核心逻辑

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/trust/tech-trust-badges.md`

**相关文档**:
- [产品设计](../../05-product-design/trust/trust-badges.md)
- [数据聚合](tech-data-aggregation.md)
- [数据质量](tech-data-quality.md)
