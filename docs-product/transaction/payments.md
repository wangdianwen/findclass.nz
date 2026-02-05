---
title: Payment Integration
category: product-design
created: 2026-01-21
author: steve-jobs
version: 1.0
phase: 3
priority: P0
status: pending-development
---

# Feature: Payment Integration - 支付集成

> **功能模块**: 交易系统 | **优先级**: P0 | **排期**: Phase 3 | **状态**: 待开发

---

## 一、功能概述

### 1.1 功能描述

支付集成功能为平台提供在线支付能力，支持多种支付方式，实现订单支付、退款、佣金结算等交易流程。

### 1.2 核心价值

- **交易闭环**: 完成从预约到支付的完整交易流程
- **佣金收入**: 平台通过佣金获取收入
- **资金安全**: 资金托管，保障双方利益
- **本地适配**: 支持新西兰本地支付方式

### 1.3 用户故事

```
作为 家长
我希望 使用银行转账或POLi支付课程费用
以便 方便安全地完成付款

作为 平台运营
我希望 从每笔交易中收取一定佣金
以便 平台可持续运营
```

---

## 二、支付方式设计

### 2.1 支持的支付方式

| 支付方式 | 类型 | 说明 | 适用场景 |
|----------|------|------|----------|
| **Bank Transfer** | 银行转账 | 新西兰本地银行转账 | 主要支付方式 |
| **POLi** | 在线支付 | 新西兰在线支付服务 | 实时到账 |
| **Cash** | 线下支付 | 现金支付（教师直接收取） | 适用于线下课程 |

### 2.2 佣金模型

| 交易类型 | 佣金比例 | 说明 |
|----------|----------|------|
| 单次课程 | 15% | 平台收取15%佣金 |
| 套餐购买 | 12% | 批量购买，佣金较低 |
| 试用课程 | 10% | 吸引新用户 |

---

## 三、支付流程设计

### 3.1 支付流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                        支付流程                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  用户选择支付方式                                                   │
│      │                                                             │
│      ├── Bank Transfer ──▶ 生成付款信息                            │
│      │                   │                                         │
│      │                   ├── 用户转账                              │
│      │                   │    │                                    │
│      │                   │    └── 上传转账凭证 ──▶ 等待确认        │
│      │                   │                                          │
│      │                   └── 管理员确认到账 ──▶ 支付成功           │
│      │                                                              │
│      ├── POLi ──▶ 跳转到POLi支付                                   │
│      │         │                                                    │
│      │         └── 支付成功 ──▶ 自动确认                           │
│      │                                                              │
│      └── Cash ──▶ 标记为线下支付                                   │
│                  │                                                  │
│                  └── 完成后确认 ──▶ 支付成功                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 佣金结算流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                        佣金结算流程                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  订单支付完成                                                       │
│      │                                                             │
│      ▼                                                             │
│  记录订单信息（含佣金）                                             │
│      │                                                             │
│      ▼                                                             │
│  平台收入账户 (+佣金)                                               │
│      │                                                             │
│      ▼                                                             │
│  结算周期（每周/每月）                                              │
│      │                                                             │
│      ├── 生成结算单                                                │
│      ├── 提现申请（教师发起）                                       │
│      └── 转账到教师账户                                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 四、数据模型设计

### 4.1 订单表

```sql
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 关联
    user_id         UUID NOT NULL REFERENCES users(id),
    teacher_id      UUID NOT NULL REFERENCES teachers(id),
    course_id       UUID REFERENCES courses(id),
    
    -- 订单信息
    order_type      VARCHAR(50) NOT NULL,  -- single, package, booking
    booking_id      UUID REFERENCES bookings(id),
    package_id      UUID REFERENCES user_packages(id),
    
    -- 金额信息
    amount          DECIMAL(10,2) NOT NULL,  -- 订单总额
    platform_fee    DECIMAL(10,2) NOT NULL,  -- 平台佣金
    teacher_amount  DECIMAL(10,2) NOT NULL,  -- 教师所得
    currency        VARCHAR(10) DEFAULT 'NZD',
    
    -- 支付信息
    payment_method  VARCHAR(50),  -- bank_transfer, poli, cash
    payment_status  VARCHAR(20) DEFAULT 'pending',  -- pending, paid, refunded, cancelled
    paid_at         TIMESTAMP,
    
    -- 银行转账信息
    bank_reference  VARCHAR(100),  -- 付款参考号
    payment_proof   VARCHAR(500),  -- 转账凭证图片URL
    
    -- 退款信息
    refunded_amount DECIMAL(10,2),
    refunded_at     TIMESTAMP,
    
    -- 佣金结算
    commission_rate DECIMAL(5,2),  -- 佣金比例
    settled         BOOLEAN DEFAULT FALSE,
    settled_at      TIMESTAMP,
    
    -- 时间戳
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id, payment_status);
CREATE INDEX idx_orders_teacher ON orders(teacher_id);
CREATE INDEX idx_orders_status ON orders(payment_status);
CREATE INDEX idx_orders_created ON orders(created_at);
```

### 4.2 结算表

```sql
CREATE TABLE settlements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 关联
    teacher_id      UUID NOT NULL REFERENCES teachers(id),
    
    -- 结算信息
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    
    -- 金额
    total_orders    INTEGER NOT NULL,
    gross_amount    DECIMAL(10,2) NOT NULL,  -- 总金额
    commission      DECIMAL(10,2) NOT NULL,  -- 平台佣金
    net_amount      DECIMAL(10,2) NOT NULL,  -- 教师所得
    
    -- 状态
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, processing, completed, cancelled
    
    -- 提现
    withdrawal_requested BOOLEAN DEFAULT FALSE,
    withdrawal_requested_at TIMESTAMP,
    withdrawn_at    TIMESTAMP,
    
    -- 时间戳
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_settlements_teacher ON settlements(teacher_id);
CREATE INDEX idx_settlements_period ON settlements(period_start, period_end);
```

### 4.3 支付日志表

```sql
CREATE TABLE payment_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id),
    
    action          VARCHAR(50) NOT NULL,  -- created, paid, refunded, failed
    amount          DECIMAL(10,2),
    payment_method  VARCHAR(50),
    status          VARCHAR(20),
    error_message   TEXT,
    
    -- 回调信息
    callback_data   JSONB,
    
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_logs_order ON payment_logs(order_id);
```

---

## 五、API 设计

### 5.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| POST | /api/v1/orders | 创建订单 | 生成订单 |
| GET | /api/v1/orders/:id | 获取订单详情 | 查看订单 |
| POST | /api/v1/orders/:id/pay/bank-transfer | 银行转账 | 标记银行转账 |
| POST | /api/v1/orders/:id/pay/poli | POLi支付 | 发起POLi支付 |
| POST | /api/v1/orders/:id/pay/cash | 线下支付 | 标记现金支付 |
| POST | /api/v1/orders/:id/confirm | 确认支付 | 管理员确认到账 |
| POST | /api/v1/orders/:id/refund | 申请退款 | 发起退款 |
| GET | /api/v1/teachers/settlements | 获取结算单 | 教师查看收入 |
| POST | /api/v1/teachers/withdraw | 申请提现 | 教师发起提现 |

### 5.2 API 详细设计

#### 5.2.1 POST /api/v1/orders

**请求示例**:

```json
{
  "courseId": "course-001",
  "bookingId": "booking-001",
  "paymentMethod": "bank_transfer"
}
```

**响应示例** (201):

```json
{
  "success": true,
  "message": "订单创建成功",
  "data": {
    "orderId": "order-001",
    "amount": 500,
    "platformFee": 75,
    "teacherAmount": 425,
    "paymentInfo": {
      "bankName": "ANZ",
      "accountName": "EduSearch NZ Ltd",
      "accountNumber": "01-1234-5678901-00",
      "reference": "ORD-2026-001234"
    }
  }
}
```

---

## 六、前端设计

### 6.1 订单确认页

```
┌─────────────────────────────────────────────────────────────────────┐
│  确认订单                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  订单详情                                                           │
│  ──────────────────────────────────────────────────────────────    │
│  课程: 高中数学提高班                                               │
│  教师: 张老师                                                       │
│  时间: 1月20日 14:00-15:00                                         │
│  课时: 1节 (60分钟)                                                 │
│                                                                     │
│  费用明细                                                           │
│  ──────────────────────────────────────────────────────────────    │
│  课程费用: $50                                                      │
│  平台服务费: $7.5 (15%)                                             │
│  ──────────────────────────────────────────────────────────────    │
│  合计: $57.50                                                       │
│                                                                     │
│  支付方式                                                           │
│  ──────────────────────────────────────────────────────────────    │
│  [○] 银行转账 (推荐)                                               │
│      支付后需上传转账凭证，24小时内确认                             │
│                                                                     │
│  [○] POLi在线支付                                                  │
│      实时到账，立即确认                                             │
│                                                                     │
│  [○] 现金支付                                                      │
│      上课时直接支付给教师                                          │
│                                                                     │
│  ──────────────────────────────────────────────────────────────    │
│  [取消]  [确认支付 $57.50]                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 银行转账页面

```
┌─────────────────────────────────────────────────────────────────────┐
│  银行转账支付                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  请转账到以下账户:                                                   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  银行: ANZ                                                   │   │
│  │  账户名: EduSearch NZ Ltd                                   │   │
│  │  账号: 01-1234-5678901-00                                   │   │
│  │  参考号: ORD-2026-001234  ← 请在转账时填写此参考号           │   │
│  │  金额: $57.50                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  上传转账凭证（可选，可加快确认速度）                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [ 📷 点击上传转账截图 ]                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ⚠️ 转账完成后请保留凭证，平台会在24小时内确认                     │
│                                                                     │
│  [我已完成转账]  [返回修改支付方式]                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 七、测试用例

### 7.1 功能测试用例

| 测试场景 | 操作步骤 | 预期结果 |
|----------|----------|----------|
| 创建订单 | 选择课程和支付方式 | 订单创建成功 |
| 银行转账 | 完成转账并上传凭证 | 订单待确认 |
| POLi支付 | 跳转到POLi完成支付 | 订单已支付 |
| 确认到账 | 管理员确认转账 | 订单完成 |
| 申请退款 | 用户申请退款 | 退款申请创建 |
| 查看收入 | 教师查看结算单 | 显示正确收入 |

---

## 八、实现计划

### 8.1 开发任务分解

| 任务 | 描述 | 预估工时 | 依赖 |
|------|------|----------|------|
| 数据库设计 | 创建订单和结算表 | 4h | - |
| 订单API | 实现订单CRUD接口 | 16h | 数据库 |
| 支付API | 实现支付接口 | 16h | 数据库 |
| 结算API | 实现结算和提现接口 | 12h | 数据库 |
| POLi集成 | 集成POLi支付 | 12h | POLi API |
| 订单前端 | 实现订单确认页面 | 12h | API设计 |
| 支付前端 | 实现支付页面 | 8h | API设计 |
| 管理后台 | 实现订单管理 | 12h | API设计 |
| 单元测试 | 支付功能测试 | 8h | 全部 |

### 8.2 验收标准

- [ ] 订单创建成功
- [ ] 支付流程顺畅
- [ ] 佣金计算正确
- [ ] 结算功能正常
- [ ] 退款处理正确

---

## 九、风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 支付安全问题 | 低 | 高 | 集成正规支付渠道 |
| 佣金争议 | 中 | 中 | 透明佣金规则 |
| 提现纠纷 | 低 | 中 | 明确结算周期 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/05-product-design/feature-payments.md`

**相关文档**:
- [功能概览](feature-overview.md)
- [在线预约](feature-booking.md)
- [退款处理](feature-refunds.md)
