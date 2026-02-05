---
title: Refund Processing
category: product-design
created: 2026-01-21
author: steve-jobs
version: 1.0
phase: 2
priority: P1
status: pending-development
---

# Feature: Refund Processing - 退款处理

> **功能模块**: 交易系统 | **优先级**: P1 | **排期**: Phase 2 | **状态**: 待开发

---

## 一、功能概述

### 1.1 功能描述

退款处理功能为用户提供退款申请渠道，为教师提供退款审核能力，为平台提供退款管理和统计功能。

### 1.2 核心价值

- **消费者保障**: 退款政策提升用户信任
- **合规要求**: 符合消费者权益保护法规
- **风险控制**: 合理的退款政策平衡用户和教师利益
- **争议处理**: 提供争议解决机制

### 1.3 用户故事

```
作为 家长
我希望 购买套餐后能申请退款
以便 在孩子无法继续学习时挽回损失

作为 教师
我希望 审核退款申请
以便 合理处理退款请求

作为 平台运营
我希望 管理退款争议
以便 维护平台公平
```

---

## 二、退款政策设计

### 2.1 退款政策

#### 2.1.1 单次课程退款

| 场景 | 退款比例 | 说明 |
|------|----------|------|
| 开课前48小时以上 | 100% | 全额退款 |
| 开课前24-48小时 | 80% | 扣除20%手续费 |
| 开课前24小时内 | 50% | 扣除50%手续费 |
| 开课后 | 0% | 不可退款 |

#### 2.1.2 套餐退款

| 场景 | 退款比例 | 说明 |
|------|----------|------|
| 未使用任何课时 | 95% | 扣除5%手续费 |
| 使用1-20%课时 | 80% | 扣除20% |
| 使用21-50%课时 | 50% | 扣除50% |
| 使用超过50%课时 | 0% | 不可退款 |
| 超过有效期 | 0% | 不可退款 |

#### 2.1.3 特殊情况

| 情况 | 处理方式 |
|------|----------|
| 教师取消课程 | 全额退款+额外补偿券 |
| 课程质量问题 | 视情况部分/全额退款 |
| 技术问题导致无法上课 | 全额退款 |
| 不可抗力 | 协商处理 |

### 2.2 退款流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                        退款流程                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  用户发起退款申请                                                   │
│           │                                                        │
│           ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  自动审核                                                     │   │
│  │  ├─ 检查退款条件                                              │   │
│  │  ├─ 计算退款金额                                              │   │
│  │  └─ 通过/拒绝                                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│           │                                                        │
│           ├── 自动通过 ──▶ 进入退款处理                            │
│           │                                                        │
│           ├── 需要审核 ──▶ 通知教师                                │
│           │           │                                            │
│           │           ├── 教师同意 ──▶ 退款处理                    │
│           │           │                                            │
│           │           ├── 教师拒绝 ──▶ 用户申诉 ──▶ 平台介入       │
│           │           │                                            │
│           │           └── 教师超时未处理 ──▶ 自动退款              │
│           │                                                            │
│           └── 拒绝 ──▶ 通知用户拒绝原因                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  退款处理                                                     │   │
│  │  ├─ 原路退回（Bank Transfer）                                │   │
│  │  ├─ 记录退款日志                                              │   │
│  │  └─ 通知用户退款结果                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 三、数据模型设计

### 3.1 退款申请表

```sql
CREATE TABLE refund_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 关联信息
    user_id         UUID NOT NULL REFERENCES users(id),
    order_id        UUID NOT NULL REFERENCES orders(id),
    course_id       UUID REFERENCES courses(id),
    package_id      UUID REFERENCES user_packages(id),
    
    -- 退款信息
    refund_type     VARCHAR(50) NOT NULL,  -- single, package
    amount          DECIMAL(10,2) NOT NULL,  -- 申请退款金额
    actual_amount   DECIMAL(10,2),  -- 实际退款金额
    currency        VARCHAR(10) DEFAULT 'NZD',
    
    -- 原因
    reason          VARCHAR(50) NOT NULL,  -- schedule_conflict, quality_issue, etc.
    description     TEXT,
    evidence        TEXT[],  -- 证据截图等
    
    -- 审核信息
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, reviewing, approved, rejected, processed, cancelled
    reviewer_id     UUID REFERENCES admin_users(id),
    review_note     TEXT,
    reviewed_at     TIMESTAMP,
    
    -- 教师处理
    teacher_response VARCHAR(50),  -- agree, reject
    teacher_note     TEXT,
    teacher_responded_at TIMESTAMP,
    
    -- 退款信息
    refund_method   VARCHAR(50),  -- bank_transfer, original_payment
    refund_account  TEXT,
    refunded_at     TIMESTAMP,
    
    -- 时间戳
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refund_requests_user ON refund_requests(user_id);
CREATE INDEX idx_refund_requests_order ON refund_requests(order_id);
CREATE INDEX idx_refund_requests_status ON refund_requests(status);
CREATE INDEX idx_refund_requests_created ON refund_requests(created_at);
```

### 3.2 退款记录表

```sql
CREATE TABLE refund_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 关联
    refund_request_id UUID NOT NULL REFERENCES refund_requests(id),
    order_id        UUID NOT NULL REFERENCES orders(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    
    -- 退款信息
    amount          DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(10) DEFAULT 'NZD',
    refund_method   VARCHAR(50) NOT NULL,
    bank_name       VARCHAR(100),
    account_number  VARCHAR(50),  -- 脱敏
    
    -- 状态
    status          VARCHAR(20) NOT NULL,  -- processing, completed, failed
    processed_at    TIMESTAMP,
    completed_at    TIMESTAMP,
    
    -- 错误信息
    error_message   TEXT,
    
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refund_records_order ON refund_records(order_id);
CREATE INDEX idx_refund_records_status ON refund_records(status);
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| POST | /api/v1/orders/:id/refund | 申请退款 | 用户发起退款 |
| GET | /api/v1/users/refunds | 获取我的退款 | 用户查看退款列表 |
| GET | /api/v1/teachers/refunds | 获取退款申请 | 教师查看收到的退款 |
| PUT | /api/v1/teachers/refunds/:id/respond | 教师响应 | 教师同意/拒绝 |
| GET | /api/v1/admin/refunds | 管理所有退款 | 管理员视图 |
| PUT | /api/v1/admin/refunds/:id/process | 处理退款 | 管理员处理 |
| POST | /api/v1/admin/refunds/:id/execute | 执行退款 | 实际退款操作 |

### 4.2 API 详细设计

#### 4.2.1 POST /api/v1/orders/:id/refund

**请求示例**:

```json
{
  "reason": "schedule_conflict",
  "description": "孩子学校课程时间冲突",
  "evidence": ["screenshot1.jpg"]
}
```

**响应示例** (201):

```json
{
  "success": true,
  "message": "退款申请已提交",
  "data": {
    "refundId": "refund-001",
    "status": "pending",
    "estimatedAmount": 200,
    "processTime": "24小时内处理"
  }
}
```

---

## 五、前端设计

### 5.1 退款申请页面

```
┌─────────────────────────────────────────────────────────────────────┐
│  申请退款                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  订单: 高中数学提高班 - 10节套餐                                     │
│  订单金额: $450                                                     │
│  可退款金额: $360 (80%)                                             │
│                                                                     │
│  ──────────────────────────────────────────────────────────────    │
│                                                                     │
│  * 退款原因                                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [☐] 时间冲突 - 上课时间与安排冲突                           │   │
│  │ [☐] 质量问题 - 课程质量不符合预期                           │   │
│  │ [☐] 教师变更 - 授课教师发生变化                             │   │
│  │ [☐] 个人原因 - 其他个人原因                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  详细说明（可选）                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [                                                 ]        │   │
│  │ [           请详细描述退款原因...                          │   │
│  │ [                                                 ]        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  上传证据（可选）                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [ 📷 点击上传截图 ]                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ──────────────────────────────────────────────────────────────    │
│  预计退款金额: $360                                                 │
│  预计到账时间: 3-5个工作日                                          │
│                                                                     │
│  [取消]  [确认申请]                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 退款列表

```
┌─────────────────────────────────────────────────────────────────────┐
│  退款记录                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📦 退款申请 - 高中数学提高班                                 │   │
│  │ ─────────────────────────────────────────────────────────  │   │
│  │ 申请时间: 2026-01-15                                        │   │
│  │ 退款金额: $360                                               │   │
│  │ 状态: 🕐 处理中                                              │   │
│  │                                                             │   │
│  │ [查看详情]                                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ✅ 退款完成 - 钢琴一对一课程                                 │   │
│  │ ─────────────────────────────────────────────────────────  │   │
│  │ 完成时间: 2026-01-10                                        │   │
│  │ 退款金额: $200                                               │   │
│  │ 状态: ✅ 已退款到原账户                                      │   │
│  │                                                             │   │
│  │ [查看详情]                                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 六、测试用例

### 6.1 功能测试用例

| 测试场景 | 操作步骤 | 预期结果 |
|----------|----------|----------|
| 申请退款 | 用户提交退款申请 | 退款申请创建 |
| 自动审核 | 系统自动审核 | 根据条件判断是否通过 |
| 教师响应 | 教师同意退款 | 状态更新，进入退款处理 |
| 执行退款 | 管理员执行退款 | 退款完成，状态更新 |
| 查看进度 | 用户查看退款进度 | 显示正确状态 |

---

## 七、实现计划

### 7.1 开发任务分解

| 任务 | 描述 | 预估工时 | 依赖 |
|------|------|----------|------|
| 数据库设计 | 创建退款相关表 | 4h | - |
| 退款申请API | 实现退款申请接口 | 8h | 数据库 |
| 退款审核API | 实现审核接口 | 8h | 数据库 |
| 退款处理API | 实现退款执行接口 | 8h | 数据库 |
| 退款前端 | 实现申请和列表页面 | 12h | API设计 |
| 审核前端 | 实现教师审核界面 | 8h | API设计 |
| 单元测试 | 退款功能测试 | 8h | 全部 |

### 7.2 验收标准

- [ ] 退款申请流程顺畅
- [ ] 自动审核逻辑正确
- [ ] 教师审核功能正常
- [ ] 退款金额计算正确
- [ ] 退款记录完整

---

## 八、风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 退款滥用 | 中 | 高 | 条件限制，异常监控 |
| 金额计算错误 | 低 | 中 | 双重计算验证 |
| 争议处理困难 | 中 | 中 | 保留证据，平台介入 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/05-product-design/feature-refunds.md`

**相关文档**:
- [功能概览](feature-overview.md)
- [套餐购买](feature-packages.md)
- [支付集成](feature-payments.md)
