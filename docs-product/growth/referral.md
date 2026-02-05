---
title: Referral Reward System
category: product-design
created: 2026-01-21
author: steve-jobs
version: 1.0
phase: 2
priority: P1
status: pending-development
---

# Feature: Referral Reward System - 推荐奖励系统

> **功能模块**: 运营支撑 | **优先级**: P1 | **排期**: Phase 2 | **状态**: 待开发

---

## 一、功能概述

### 1.1 功能描述

推荐奖励系统通过激励机制鼓励用户推荐新用户注册和消费，实现低成本获客。

### 1.2 核心价值

- **低成本获客**: 用户推荐比广告更便宜
- **信任传播**: 朋友推荐信任度更高
- **用户增长**: 激励用户主动拉新
- **活跃度提升**: 老用户推荐更活跃

### 1.3 用户故事

```
作为 老用户
我希望 分享我的推荐链接给朋友
以便 获得奖励优惠

作为 新用户
我希望 通过朋友的链接注册
以便 获得新人礼包

作为 平台运营
我希望 追踪推荐效果
以便 优化推荐策略
```

---

## 二、奖励设计

### 2.1 奖励类型

| 角色 | 奖励类型 | 奖励内容 | 说明 |
|------|----------|----------|------|
| **推荐人** | 现金奖励 | $10/人 | 新用户首次消费后发放 |
| **推荐人** | 积分奖励 | 100积分/人 | 新用户注册后发放 |
| **被推荐人** | 注册奖励 | $5优惠券 | 新用户注册即得 |
| **被推荐人** | 首单奖励 | 首单9折 | 首次消费可用 |

### 2.2 奖励规则

| 规则 | 说明 |
|------|------|
| 推荐有效期 | 被推荐人注册后30天内消费，推荐人可获奖励 |
| 奖励上限 | 每月最多获得$100奖励 |
| 提现规则 | 奖励满$50可提现 |
| 作弊防范 | 同一设备/账号不计入推荐 |

---

## 三、数据模型设计

### 3.1 推荐关系表

```sql
CREATE TABLE referrals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 推荐关系
    referrer_id     UUID NOT NULL REFERENCES users(id),
    referee_id      UUID REFERENCES users(id),
    
    -- 推荐信息
    referral_code   VARCHAR(20) NOT NULL,  -- 推荐码
    source          VARCHAR(50),  -- 分享来源：link/wechat/email
    
    -- 状态
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, registered, rewarded, expired
    
    -- 时间戳
    created_at      TIMESTAMP DEFAULT NOW(),
    registered_at   TIMESTAMP,  -- 被推荐人注册时间
    rewarded_at     TIMESTAMP   -- 推荐人获得奖励时间
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referee ON referrals(referee_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
```

### 3.2 奖励记录表

```sql
CREATE TABLE referral_rewards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 关联
    referral_id     UUID NOT NULL REFERENCES referrals(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    
    -- 奖励信息
    reward_type     VARCHAR(50) NOT NULL,  -- cash, coupon, points
    amount          DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(10) DEFAULT 'NZD',
    
    -- 状态
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, available, used, expired
    available_at    TIMESTAMP,
    expires_at      TIMESTAMP,
    
    -- 使用信息
    used_order_id   UUID REFERENCES orders(id),
    used_at         TIMESTAMP,
    
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_referral_rewards_user ON referral_rewards(user_id);
CREATE INDEX idx_referral_rewards_status ON referral_rewards(status);
```

### 3.3 用户奖励账户表

```sql
CREATE TABLE reward_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    
    -- 余额
    balance         DECIMAL(10,2) DEFAULT 0,
    
    -- 累计
    total_earned    DECIMAL(10,2) DEFAULT 0,
    total_used      DECIMAL(10,2) DEFAULT 0,
    
    -- 统计
    referral_count  INTEGER DEFAULT 0,
    
    updated_at      TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id)
);
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| GET | /api/v1/users/referral/code | 获取推荐码 | 用户获取推荐码 |
| POST | /api/v1/users/referral/claim | 绑定推荐码 | 新用户使用推荐码 |
| GET | /api/v1/users/referral/rewards | 获取奖励 | 查看奖励余额 |
| POST | /api/v1/users/referral/withdraw | 申请提现 | 奖励提现到银行 |
| GET | /api/v1/users/referral/history | 获取记录 | 查看奖励记录 |
| GET | /api/v1/admin/referral/stats | 统计报表 | 管理后台统计 |

### 4.2 API 详细设计

#### 4.2.1 GET /api/v1/users/referral/code

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "referralCode": "FNC2026ABC",
    "shareUrl": "https://findclass.co.nz/register?ref=FNC2026ABC",
    "qrcodeUrl": "/qrcode/FNC2026ABC.png",
    "totalReferrals": 5,
    "totalRewards": 50
  }
}
```

---

## 五、前端设计

### 5.1 推荐中心

```
┌─────────────────────────────────────────────────────────────────────┐
│  推荐好友                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  您的推荐码                                                   │   │
│  │  ─────────────────────────────────────────────────────────  │   │
│  │  EDU2026ABC                                                  │   │
│  │  [复制链接]  [分享二维码]                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  分享到                                                       │   │
│  │  ─────────────────────────────────────────────────────────  │   │
│  │  [💬 微信] [📧 邮件] [📱短信] [📋 复制链接]                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ──────────────────────────────────────────────────────────────    │
│                                                                     │
│  奖励统计                                                           │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐   │
│  │ 👥 推荐人数      │ │ 💰 累计奖励      │ │ 💵 可用余额      │   │
│  │ ─────────────    │ │ ─────────────    │ │ ─────────────    │   │
│  │ 5 人            │ │ $50             │ │ $35             │   │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘   │
│                                                                     │
│  ──────────────────────────────────────────────────────────────    │
│                                                                     │
│  推荐记录                                                           │
│  ✓ 张三 - 1月10日注册 - 已奖励 $10                                 │
│  ✓ 李四 - 1月8日注册 - 已奖励 $10                                 │
│  ✓ 王五 - 1月5日注册 - 已奖励 $10                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 新用户注册页

```
┌─────────────────────────────────────────────────────────────────────┐
│  注册 FindNZClass                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🎁 有推荐码？                                                │   │
│  │  ─────────────────────────────────────────────────────────  │   │
│  │  输入推荐码可获得注册礼包                                     │   │
│  │  [ FNC2026ABC ] [ 使用 ]                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  注册礼包:                                                          │
│  ✓ $5 优惠券                                                       │
│  ✓ 首单9折                                                         │
│  ✓ 100积分                                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 六、测试用例

### 6.1 功能测试用例

| 测试场景 | 操作步骤 | 预期结果 |
|----------|----------|----------|
| 获取推荐码 | 用户获取推荐码 | 推荐码生成成功 |
| 使用推荐码 | 新用户注册时使用推荐码 | 绑定成功 |
| 奖励发放 | 被推荐人首次消费 | 推荐人获得奖励 |
| 查看奖励 | 用户查看奖励余额 | 余额正确 |
| 提现奖励 | 用户申请提现 | 提现申请创建 |
| 作弊检测 | 同一设备多次注册 | 不计入推荐 |

---

## 七、实现计划

### 7.1 开发任务分解

| 任务 | 描述 | 预估工时 | 依赖 |
|------|------|----------|------|
| 数据库设计 | 创建推荐相关表 | 4h | - |
| 推荐API | 实现推荐码、绑定接口 | 12h | 数据库 |
| 奖励API | 实现奖励发放、查询接口 | 12h | 数据库 |
| 提现API | 实现提现接口 | 8h | 数据库 |
| 推荐前端 | 实现推荐中心页面 | 12h | API设计 |
| 分享组件 | 实现分享功能 | 8h | API设计 |
| 管理后台 | 实现统计报表 | 8h | API设计 |
| 单元测试 | 推荐功能测试 | 8h | 全部 |

### 7.2 验收标准

- [ ] 推荐码生成正确
- [ ] 推荐关系绑定成功
- [ ] 奖励发放正确
- [ ] 提现流程正常
- [ ] 防作弊机制有效

---

## 八、风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 刷奖励 | 中 | 高 | 设备指纹，行为检测 |
| 奖励成本 | 中 | 中 | 预算控制，动态调整 |
| 投诉纠纷 | 低 | 中 | 规则透明，客服支持 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/05-product-design/feature-referral.md`

**相关文档**:
- [功能概览](feature-overview.md)
- [用户系统](feature-usercenter.md)
- [邮件通知](feature-notifications.md)
