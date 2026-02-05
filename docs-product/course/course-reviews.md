---
title: User Review System
category: product-design
created: 2026-01-21
author: steve-jobs
version: 1.0
phase: 3
priority: P0
status: pending-development
---

# Feature: User Review System - 用户评价系统

> **功能模块**: 用户系统 | **优先级**: P0 | **排期**: Phase 3 | **状态**: 待开发

---

## 一、功能概述

### 1.1 功能描述

用户评价系统允许完成课程的学生/家长对教师和课程进行评价，为其他用户提供参考，同时帮助教师改进教学质量。

### 1.2 核心价值

- **信任基础**: 真实评价帮助用户做决策
- **质量激励**: 评价促进教师提升质量
- **数据积累**: 评价数据支撑推荐算法
- **差异化**: 相比聚合数据，评价是差异化优势

### 1.3 用户故事

```
作为 家长
我希望 在孩子完成课程后给教师评价
以便 分享学习体验帮助其他家长

作为 家长
我希望 查看其他家长对教师的评价
以便 选择合适的教师

作为 教师
我希望 收到家长的评价反馈
以便 改进教学质量
```

---

## 二、评价设计

### 2.1 评价维度

| 维度 | 评分范围 | 说明 |
|------|----------|------|
| **综合评分** | 1-5星 | 整体满意度 |
| **教学能力** | 1-5星 | 教学水平 |
| **课程质量** | 1-5星 | 课程内容 |
| **沟通互动** | 1-5星 | 师生互动 |
| **时间守时** | 1-5星 | 上课守时 |

### 2.2 评价流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                        评价流程                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  课程完成                                                           │
│      │                                                             │
│      ▼                                                             │
│  发送评价邀请                                                       │
│      │                                                             │
│      ▼                                                             │
│  用户提交评价                                                       │
│      │                                                             │
│      ├── 有内容 ──▶ 进入审核                                       │
│      └── 无内容 ──▶ 提示补充                                       │
│      │                                                             │
│      ▼                                                             │
│  评价审核（可选）                                                   │
│      │                                                             │
│      ├── 通过 ──▶ 展示评价                                         │
│      └── 拒绝 ──▶ 通知用户                                         │
│      │                                                             │
│      ▼                                                             │
│  教师回复                                                           │
│      │                                                             │
│      ▼                                                             │
│  评价展示                                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 评价规则

| 规则 | 说明 |
|------|------|
| 评价资格 | 仅完成课程的用户可评价 |
| 评价时效 | 课程完成后14天内可评价 |
| 评价次数 | 每节课只能评价一次 |
| 评价修改 | 24小时内可修改 |
| 评价删除 | 不可删除，只能隐藏 |

---

## 三、数据模型设计

### 3.1 评价表

```sql
CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 关联
    user_id         UUID NOT NULL REFERENCES users(id),
    teacher_id      UUID NOT NULL REFERENCES teachers(id),
    course_id       UUID REFERENCES courses(id),
    booking_id      UUID REFERENCES bookings(id),
    
    -- 评分 (1-5)
    overall_rating  INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    teaching_rating INTEGER,
    course_rating   INTEGER,
    communication_rating INTEGER,
    punctuality_rating INTEGER,
    
    -- 评价内容
    title           VARCHAR(200),
    content         TEXT NOT NULL,
    
    -- 标签
    tags            TEXT[] DEFAULT '{}',  -- ['教学认真', '有耐心', '收获很大']
    
    -- 状态
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected, hidden
    is_public       BOOLEAN DEFAULT TRUE,
    
    -- 审核信息
    reviewed        BOOLEAN DEFAULT FALSE,
    reviewed_at     TIMESTAMP,
    reviewer_id     UUID REFERENCES admin_users(id),
    review_note     TEXT,
    
    -- 用户修改
    is_edited       BOOLEAN DEFAULT FALSE,
    edited_at       TIMESTAMP,
    
    -- 统计
    helpful_count   INTEGER DEFAULT 0,
    report_count    INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reviews_teacher ON reviews(teacher_id, status);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_booking ON reviews(booking_id);
CREATE INDEX idx_reviews_created ON reviews(created_at);
```

### 3.2 评价回复表

```sql
CREATE TABLE review_replies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 关联
    review_id       UUID NOT NULL REFERENCES reviews(id),
    teacher_id      UUID NOT NULL REFERENCES teachers(id),
    
    -- 回复内容
    content         TEXT NOT NULL,
    
    -- 状态
    is_public       BOOLEAN DEFAULT TRUE,
    
    -- 时间戳
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_review_replies_review ON review_replies(review_id);
```

### 3.3 评价统计表

```sql
CREATE TABLE review_statistics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    teacher_id      UUID NOT NULL REFERENCES teachers(id),
    
    -- 统计信息
    total_reviews   INTEGER DEFAULT 0,
    average_rating  DECIMAL(3,2) DEFAULT 0,
    
    -- 各维度平均
    teaching_avg    DECIMAL(3,2) DEFAULT 0,
    course_avg      DECIMAL(3,2) DEFAULT 0,
    communication_avg DECIMAL(3,2) DEFAULT 0,
    punctuality_avg DECIMAL(3,2) DEFAULT 0,
    
    -- 评分分布
    rating_5_count  INTEGER DEFAULT 0,
    rating_4_count  INTEGER DEFAULT 0,
    rating_3_count  INTEGER DEFAULT 0,
    rating_2_count  INTEGER DEFAULT 0,
    rating_1_count  INTEGER DEFAULT 0,
    
    updated_at      TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(teacher_id)
);
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| GET | /api/v1/teachers/:id/reviews | 获取教师评价 | 公开接口 |
| POST | /api/v1/reviews | 提交评价 | 用户提交评价 |
| PUT | /api/v1/reviews/:id | 修改评价 | 用户修改评价 |
| GET | /api/v1/reviews/:id | 获取评价详情 | 查看评价 |
| POST | /api/v1/reviews/:id/reply | 教师回复 | 教师回复评价 |
| POST | /api/v1/reviews/:id/helpful | 标记有用 | 其他用户标记 |
| POST | /api/v1/reviews/:id/report | 举报评价 | 举报违规评价 |

### 4.2 API 详细设计

#### 4.2.1 GET /api/v1/teachers/:id/reviews

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "teacherId": "teacher-001",
    "statistics": {
      "totalReviews": 128,
      "averageRating": 4.9,
      "ratingDistribution": {
        "5": 100,
        "4": 22,
        "3": 5,
        "2": 1,
        "1": 0
      }
    },
    "reviews": [
      {
        "id": "review-001",
        "userName": "李女士",
        "userAvatar": "avatar.jpg",
        "overallRating": 5,
        "teachingRating": 5,
        "courseRating": 5,
        "title": "非常推荐张老师！",
        "content": "老师讲解清晰，孩子成绩有明显提升...",
        "tags": ["教学认真", "有耐心"],
        "createdAt": "2026-01-10T10:00:00Z",
        "helpfulCount": 15,
        "reply": {
          "content": "感谢李女士的认可！",
          "createdAt": "2026-01-10T14:00:00Z"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 128
    }
  }
}
```

---

## 五、前端设计

### 5.1 评价提交页面

```
┌─────────────────────────────────────────────────────────────────────┐
│  课程评价                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  您对这次课程满意吗？                                               │
│                                                                     │
│  综合评分                                                           │
│  ⭐⭐⭐⭐⭐                                                          │
│                                                                     │
│  分项评分                                                           │
│  教学能力: ⭐⭐⭐⭐⭐                                                │
│  课程质量: ⭐⭐⭐⭐⭐                                                │
│  沟通互动: ⭐⭐⭐⭐⭐                                                │
│  时间守时: ⭐⭐⭐⭐⭐                                                │
│                                                                     │
│  评价标题                                                           │
│  [__________________________________]                              │
│                                                                     │
│  详细评价                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [                                                 ]        │   │
│  │ [           分享您的学习体验...                           ]  │   │
│  │ [                                                 ]        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  选择标签（可多选）                                                 │
│  [✓] 教学认真  [✓] 有耐心  [ ] 收获很大  [ ] 通俗易懂              │
│  [ ] 作业负责  [ ] 时间观念强  [ ] 亲和力强                        │
│                                                                     │
│  ──────────────────────────────────────────────────────────────    │
│  [取消]  [提交评价]                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 教师评价页

```
┌─────────────────────────────────────────────────────────────────────┐
│  教师评价 (128条)                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ⭐ 4.9  ·  128条评价                                              │
│  ──────────────────────────────────────────────────────────────    │
│  [全部] [5星] [4星] [3星] [2星] [1星]                              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ⭐⭐⭐⭐⭐ 李女士                                             │   │
│  │ "非常推荐张老师！"                                          │   │
│  │ ─────────────────────────────────────────────────────────  │   │
│  │ 老师讲解清晰，孩子成绩有明显提升。教学方法生动有趣，       │   │
│  │ 孩子很喜欢上张老师的课。每次课后都有明确的进步。          │   │
│  │ ─────────────────────────────────────────────────────────  │   │
│  │ 标签: 教学认真、有耐心、收获很大                          │   │
│  │ 1月10日 ·  👍 15人觉得有帮助                               │   │
│  │                                                             │   │
│  │ 💬 张老师回复:                                              │   │
│  │ "感谢李女士的认可！孩子的进步是对我最大的鼓励。"          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 六、测试用例

### 6.1 功能测试用例

| 测试场景 | 操作步骤 | 预期结果 |
|----------|----------|----------|
| 提交评价 | 完成评价并提交 | 评价创建成功 |
| 修改评价 | 24小时内修改 | 评价更新成功 |
| 查看评价 | 访问教师评价页 | 评价列表展示 |
| 回复评价 | 教师回复评价 | 回复展示 |
| 标记有用 | 用户标记评价有用 | 计数增加 |
| 举报评价 | 举报违规评价 | 举报提交成功 |

---

## 七、实现计划

### 7.1 开发任务分解

| 任务 | 描述 | 预估工时 | 依赖 |
|------|------|----------|------|
| 数据库设计 | 创建review相关表 | 4h | - |
| 评价API | 实现评价CRUD接口 | 16h | 数据库 |
| 评价统计API | 实现统计接口 | 8h | 数据库 |
| 回复API | 实现回复接口 | 8h | 数据库 |
| 评价前端 | 实现评价提交页面 | 12h | API设计 |
| 评价展示前端 | 实现评价列表页面 | 8h | API设计 |
| 评价审核 | 实现审核功能 | 8h | 评价API |
| 单元测试 | 评价功能测试 | 8h | 全部 |

### 7.2 验收标准

- [ ] 评价提交成功
- [ ] 评分计算正确
- [ ] 评价展示正常
- [ ] 回复功能正常
- [ ] 统计准确

---

## 八、风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 虚假评价 | 中 | 高 | 订单关联，审核机制 |
| 恶意差评 | 中 | 中 | 审核机制，申诉渠道 |
| 刷分行为 | 低 | 中 | 异常监控 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/05-product-design/feature-reviews.md`

**相关文档**:
- [功能概览](feature-overview.md)
- [评价回复功能](feature-teacher-replies.md)
- [信任标识系统](feature-trust-badges.md)
</parameter>
</invoke>
<parameter name="filePath">/Users/dianwenwang/Project/idea/05-product-design/feature-reviews.md