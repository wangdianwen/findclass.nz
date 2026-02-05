---
title: Course Package Purchase
category: product-design
created: 2026-01-21
author: steve-jobs
version: 1.0
phase: 2
priority: P1
status: pending-development
---

# Feature: Course Package Purchase - 套餐购买

> **功能模块**: 交易系统 | **优先级**: P1 | **排期**: Phase 2 | **状态**: 待开发

---

## 一、功能概述

### 1.1 功能描述

套餐购买功能允许教师发布多课时套餐（如10节课套餐、20节课套餐），学生可以购买套餐获得优惠价格，提升复购率。

### 1.2 核心价值

- **提升客单价**: 套餐价格高于单次购买
- **提高复购**: 预付费模式锁定多次消费
- **优惠激励**: 通过折扣吸引用户购买套餐
- **现金流改善**: 提前收到款项

### 1.3 用户故事

```
作为 教师
我希望 发布10节课套餐
以便 学生一次性购买多节课

作为 家长
我希望 购买20节数学课套餐
以便 获得优惠价格并安排孩子长期学习
```

---

## 二、套餐设计

### 2.1 套餐类型

| 套餐类型 | 课时数 | 折扣 | 有效期 | 适用场景 |
|----------|--------|------|--------|----------|
| **小套餐** | 5节 | 5% | 2个月 | 短期尝试 |
| **中套餐** | 10节 | 10% | 4个月 | 常规学习 |
| **大套餐** | 20节 | 15% | 8个月 | 长期学习 |
| **年套餐** | 50节+ | 20% | 12个月 | 全年学习 |

### 2.2 套餐价格示例

| 单次价格 | 5节套餐 | 10节套餐 | 20节套餐 |
|----------|---------|----------|----------|
| $50/小时 | $237.5 (5%) | $450 (10%) | $850 (15%) |
| $60/小时 | $285 (5%) | $540 (10%) | $1020 (15%) |
| $80/小时 | $380 (5%) | $720 (10%) | $1360 (15%) |

---

## 三、套餐功能设计

### 3.1 教师端功能

| 功能 | 说明 |
|------|------|
| 创建套餐 | 设置套餐名称、课时数、价格、有效期 |
| 编辑套餐 | 修改套餐信息（下架旧套餐，上架新套餐） |
| 停售套餐 | 停止套餐销售 |
| 套餐使用记录 | 查看套餐购买和使用情况 |

### 3.2 用户端功能

| 功能 | 说明 |
|------|------|
| 套餐展示 | 在课程详情页展示可选套餐 |
| 套餐对比 | 展示不同套餐的优惠对比 |
| 购买套餐 | 选择套餐并完成支付 |
| 套餐管理 | 查看已购套餐和使用进度 |
| 转让限制 | 是否允许套餐转让 |

---

## 四、数据模型设计

### 4.1 套餐表

```sql
CREATE TABLE course_packages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 关联信息
    teacher_id      UUID NOT NULL REFERENCES teachers(id),
    course_id       UUID REFERENCES courses(id),  -- 可关联具体课程
    
    -- 套餐信息
    name            VARCHAR(100) NOT NULL,  -- "10节数学课套餐"
    description     TEXT,
    lesson_count    INTEGER NOT NULL,  -- 课时数
    price           DECIMAL(10,2) NOT NULL,  -- 套餐总价
    original_price  DECIMAL(10,2) NOT NULL,  -- 原价（单次×课时数）
    discount        DECIMAL(5,2) NOT NULL,  -- 折扣百分比
    
    -- 有效期
    validity_period INTEGER NOT NULL,  -- 有效期（天）
    validity_type   VARCHAR(20) DEFAULT 'fixed',  -- fixed:固定期限, rolling:滚动
    
    -- 转让设置
    transferable    BOOLEAN DEFAULT FALSE,
    transfer_fee    DECIMAL(5,2),  -- 转让手续费%
    
    -- 状态
    status          VARCHAR(20) DEFAULT 'active',  -- active, inactive, sold_out
    
    -- 销售统计
    sold_count      INTEGER DEFAULT 0,
    total_lessons   INTEGER DEFAULT 0,  -- 已消耗课时
    
    -- 时间戳
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_course_packages_teacher ON course_packages(teacher_id);
CREATE INDEX idx_course_packages_status ON course_packages(status);
```

### 4.2 用户套餐表

```sql
CREATE TABLE user_packages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 关联
    user_id         UUID NOT NULL REFERENCES users(id),
    package_id      UUID NOT NULL REFERENCES course_packages(id),
    
    -- 订单信息
    order_id        UUID NOT NULL REFERENCES orders(id),
    
    -- 使用情况
    total_lessons   INTEGER NOT NULL,  -- 总课时
    used_lessons    INTEGER DEFAULT 0,  -- 已使用课时
    remaining_lessons INTEGER GENERATED ALWAYS AS (total_lessons - used_lessons) STORED,
    
    -- 有效期
    start_at        TIMESTAMP NOT NULL,  -- 生效时间
    expires_at      TIMESTAMP NOT NULL,  -- 到期时间
    status          VARCHAR(20) DEFAULT 'active',  -- active, expired, completed, transferred
    
    -- 转让记录
    transferred_to  UUID REFERENCES users(id),
    transferred_at  TIMESTAMP,
    
    -- 时间戳
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, package_id)
);

CREATE INDEX idx_user_packages_user ON user_packages(user_id);
CREATE INDEX idx_user_packages_status ON user_packages(status);
CREATE INDEX idx_user_packages_expires ON user_packages(expires_at);
```

### 4.3 套餐使用记录表

```sql
CREATE TABLE package_usage (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 关联
    user_package_id UUID NOT NULL REFERENCES user_packages(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    teacher_id      UUID NOT NULL REFERENCES teachers(id),
    course_id       UUID REFERENCES courses(id),
    
    -- 使用信息
    lesson_date     DATE NOT NULL,
    lesson_count    INTEGER NOT NULL DEFAULT 1,
    note            TEXT,
    
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_package_usage_user_package ON package_usage(user_package_id);
CREATE INDEX idx_package_usage_lesson_date ON package_usage(lesson_date);
```

---

## 五、API 设计

### 5.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| GET | /api/v1/courses/:id/packages | 获取课程套餐 | 用户查看套餐 |
| GET | /api/v1/teachers/packages | 获取教师套餐 | 教师管理套餐 |
| POST | /api/v1/teachers/packages | 创建套餐 | 教师创建套餐 |
| PUT | /api/v1/teachers/packages/:id | 更新套餐 | 教师更新套餐 |
| POST | /api/v1/packages/:id/purchase | 购买套餐 | 用户购买套餐 |
| GET | /api/v1/users/packages | 获取我的套餐 | 用户查看已购套餐 |
| POST | /api/v1/users/packages/:id/use | 使用套餐 | 核销课时 |
| POST | /api/v1/users/packages/:id/transfer | 转让套餐 | 套餐转让 |

### 5.2 API 详细设计

#### 5.2.1 GET /api/v1/courses/:id/packages

**响应示例** (200):

```json
{
  "success": true,
  "data": [
    {
      "id": "pkg-001",
      "name": "10节数学课套餐",
      "lessonCount": 10,
      "price": 450,
      "originalPrice": 500,
      "discount": 10,
      "savings": 50,
      "validityPeriod": 120,
      "perLessonPrice": 45
    },
    {
      "id": "pkg-002",
      "name": "20节数学课套餐",
      "lessonCount": 20,
      "price": 850,
      "originalPrice": 1000,
      "discount": 15,
      "savings": 150,
      "validityPeriod": 240,
      "perLessonPrice": 42.5
    }
  ]
}
```

---

## 六、前端设计

### 6.1 套餐展示

```
┌─────────────────────────────────────────────────────────────────────┐
│  可选套餐                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  💡 购买套餐更优惠                                                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🏆 推荐                                                      │   │
│  │ 10节数学课套餐                                              │   │
│  │ ─────────────────────────────────────────────────────────  │   │
│  │ 💰 $450  [原价$500]  省$50                                  │   │
│  │ 📚 10节课  |  ⏱️ 4个月内有效                                 │   │
│  │ 💡 每节课仅 $45                                              │   │
│  │                                                             │   │
│  │ [立即购买]                                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 20节数学课套餐                                               │   │
│  │ ─────────────────────────────────────────────────────────  │   │
│  │ 💰 $850  [原价$1000]  省$150                                 │   │
│  │ 📚 20节课  |  ⏱️ 8个月内有效                                 │   │
│  │ 💡 每节课仅 $42.5                                            │   │
│  │                                                             │   │
│  │ [立即购买]                                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 单次购买                                                     │   │
│  │ ─────────────────────────────────────────────────────────  │   │
│  │ 💰 $50/小时                                                  │   │
│  │ 📚 灵活安排                                                  │   │
│  │                                                             │   │
│  │ [预约试听]                                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 我的套餐

```
┌─────────────────────────────────────────────────────────────────────┐
│  我的套餐                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📦 10节数学课套餐                                            │   │
│  │ ─────────────────────────────────────────────────────────  │   │
│  │ 有效期至: 2026-05-15 (还有113天)                            │   │
│  │                                                             │   │
│  │  📊 进度                                                    │   │
│  │  [████████░░] 7/10 已使用                                   │   │
│  │                                                             │   │
│  │  剩余3节课                                                   │   │
│  │                                                             │   │
│  │ [预约上课]  [查看详情]  [再次购买]                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 七、测试用例

### 7.1 功能测试用例

| 测试场景 | 操作步骤 | 预期结果 |
|----------|----------|----------|
| 创建套餐 | 教师创建套餐 | 套餐创建成功 |
| 查看套餐 | 用户查看课程套餐 | 套餐列表展示 |
| 购买套餐 | 用户购买套餐 | 订单创建，套餐生效 |
| 使用套餐 | 用户预约并使用套餐 | 课时核销 |
| 套餐过期 | 超过有效期 | 套餐状态变为expired |
| 查看进度 | 用户查看套餐使用进度 | 显示正确进度 |

---

## 八、实现计划

### 8.1 开发任务分解

| 任务 | 描述 | 预估工时 | 依赖 |
|------|------|----------|------|
| 数据库设计 | 创建套餐相关表 | 4h | - |
| 套餐管理API | 实现套餐CRUD接口 | 12h | 数据库 |
| 套餐购买API | 实现套餐购买接口 | 12h | 套餐管理 |
| 套餐使用API | 实现套餐使用接口 | 8h | 套餐管理 |
| 套餐展示前端 | 实现套餐展示组件 | 8h | API设计 |
| 套餐管理前端 | 实现教师套餐管理 | 8h | API设计 |
| 单元测试 | 套餐功能测试 | 8h | 全部 |

### 8.2 验收标准

- [ ] 套餐创建成功
- [ ] 套餐购买流程顺畅
- [ ] 课时核销正确
- [ ] 过期处理正确
- [ ] 套餐统计正确

---

## 九、风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 套餐超卖 | 低 | 高 | 库存控制 |
| 课时核销错误 | 中 | 中 | 事务控制，双向校验 |
| 过期纠纷 | 低 | 中 | 提前提醒 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/05-product-design/feature-packages.md`

**相关文档**:
- [功能概览](feature-overview.md)
- [退款处理](feature-refunds.md)
- [支付集成](feature-payments.md)
