---
title: Data Desensitization
category: product-design
created: 2026-01-21
author: steve-jobs
version: 1.0
phase: 1
priority: P0
status: pending-development
---

# Feature: Data Desensitization - 数据脱敏处理

> **功能模块**: 数据聚合 | **优先级**: P0 | **排期**: Phase 1 | **状态**: 待开发

---

## 一、功能概述

### 1.1 功能描述

数据脱敏处理功能用于保护用户隐私，对课程信息中的个人敏感数据进行脱敏展示，确保符合GDPR、PIPL等数据保护法规要求。

### 1.2 核心价值

- **合规必需**: 满足GDPR、PIPL等数据保护法规要求
- **隐私保护**: 防止用户个人信息泄露
- **信任建设**: 展示平台对用户隐私的重视
- **灵活展示**: 不同场景展示不同程度的联系方式

### 1.3 用户故事

```
作为 平台运营
我希望 展示在平台上的联系方式是脱敏的
以便 保护教师和机构的隐私

作为 家长
我希望 在联系教师前能看到部分联系方式
以便 确认是否是自己认识的人

作为 教师
我希望 我发布的联系方式被适当脱敏
以便 在保护隐私的同时方便学生联系
```

---

## 二、脱敏规则设计

### 2.1 脱敏类型与规则

| 信息类型 | 脱敏方式 | 原始示例 | 脱敏后示例 | 展示场景 |
|----------|----------|----------|------------|----------|
| **手机号** | 隐藏中间4位 | 021-123-4567 | 021-***-4567 | 详情页/列表页 |
| **固定电话** | 隐藏中间4位 | 09-1234-5678 | 09-****-5678 | 详情页/列表页 |
| **邮箱** | 隐藏前2位 | teacher@example.com | te***@example.com | 详情页/列表页 |
| **微信号** | 隐藏后4位 | wx12345678 | wx******5678 | 详情页（点击显示） |
| **QQ号** | 隐藏中间4位 | 12345678 | 12****78 | 详情页（点击显示） |
| **姓名** | 仅保留姓氏 | 张老师 | 张** | 列表页/详情页 |
| **详细地址** | 仅保留城市 | 123 Queen St, Auckland | Auckland | 列表页/详情页 |
| **详细地址** | 显示完整 | 123 Queen St, Auckland | **需登录后查看** | 详情页 |
| **身份证号** | 隐藏中间8位 | 430101199001011234 | 4301**********34 | 后台（不公开展示） |

### 2.2 脱敏级别

| 级别 | 说明 | 适用场景 |
|------|------|----------|
| **Level 1 - 轻脱敏** | 仅隐藏部分字符 | 列表页展示 |
| **Level 2 - 中脱敏** | 隐藏大部分字符 | 详情页基础展示 |
| **Level 3 - 重脱敏** | 完全隐藏 | 需登录后查看 |
| **Level 4 - 隐藏** | 完全不展示 | 敏感信息 |

### 2.3 分级展示规则

```
┌─────────────────────────────────────────────────────────────────────┐
│                        联系方式分级展示                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  课程列表页:                                                        │
│  ├─ 电话: 021-***-4567                                             │
│  ├─ 邮箱: te***@example.com                                        │
│  └─ 微信: (详情页查看)                                              │
│                                                                     │
│  课程详情页（未登录）:                                               │
│  ├─ 电话: 021-***-4567 [点击显示完整]                              │
│  ├─ 邮箱: te***@example.com [点击显示完整]                         │
│  ├─ 微信: [点击申请查看] → 登录/注册提示                           │
│  └─ 地址: Auckland CBD [点击查看完整地址] → 登录提示               │
│                                                                     │
│  课程详情页（已登录）:                                               │
│  ├─ 电话: 021-123-4567 [已验证]                                    │
│  ├─ 邮箱: teacher@example.com [已验证]                             │
│  ├─ 微信: wx12345678 [点击复制]                                    │
│  └─ 地址: 123 Queen Street, Auckland CBD                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 三、脱敏算法实现

### 3.1 脱敏函数

```typescript
// utils/desensitization.ts

/**
 * 手机号脱敏
 * 021-123-4567 -> 021-***-4567
 */
export function desensitizePhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  const cleanPhone = phone.replace(/\D/g, '');
  const prefix = cleanPhone.substring(0, 3);
  const suffix = cleanPhone.substring(cleanPhone.length - 4);
  return `${prefix}-***-${suffix}`;
}

/**
 * 固定电话脱敏
 * 09-1234-5678 -> 09-****-5678
 */
export function desensitizeLandline(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  const cleanPhone = phone.replace(/\D/g, '');
  const prefix = cleanPhone.substring(0, 2);
  const suffix = cleanPhone.substring(cleanPhone.length - 4);
  return `${prefix}-****-${suffix}`;
}

/**
 * 邮箱脱敏
 * teacher@example.com -> te***@example.com
 */
export function desensitizeEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.substring(0, 2)}***@${domain}`;
}

/**
 * 微信脱敏
 * wx12345678 -> wx******78
 */
export function desensitizeWechat(wechat: string): string {
  if (!wechat || wechat.length < 4) return wechat;
  const prefix = wechat.substring(0, 2);
  const suffix = wechat.substring(wechat.length - 2);
  return `${prefix}******${suffix}`;
}

/**
 * QQ号脱敏
 * 12345678 -> 12****78
 */
export function desensitizeQQ(qq: string): string {
  if (!qq || qq.length < 4) return qq;
  const prefix = qq.substring(0, 2);
  const suffix = qq.substring(qq.length - 2);
  return `${prefix}****${suffix}`;
}

/**
 * 姓名脱敏
 * 张老师 -> 张**
 */
export function desensitizeName(name: string): string {
  if (!name || name.length <= 1) return name;
  return `${name[0]}**`;
}

/**
 * 地址脱敏
 * 123 Queen St, Auckland -> Auckland
 */
export function desensitizeAddress(address: string): string {
  if (!address) return address;
  // 提取城市（假设地址最后部分为城市）
  const parts = address.split(',');
  return parts[parts.length - 1].trim();
}

/**
 * 身份证脱敏
 * 430101199001011234 -> 4301**********34
 */
export function desensitizeIDCard(idCard: string): string {
  if (!idCard || idCard.length < 8) return idCard;
  const prefix = idCard.substring(0, 4);
  const suffix = idCard.substring(idCard.length - 2);
  return `${prefix}**********${suffix}`;
}
```

### 3.2 批量脱敏服务

```typescript
// services/desensitization.service.ts

interface ContactInfo {
  phone?: string;
  landline?: string;
  email?: string;
  wechat?: string;
  qq?: string;
  wechatQrcode?: string;
}

interface DesensitizedContact {
  phone?: string;
  phoneFull?: string;  // 完整号码（需权限）
  landline?: string;
  landlineFull?: string;
  email?: string;
  emailFull?: string;
  wechat?: string;
  wechatFull?: string;
  qq?: string;
  qqFull?: string;
}

export class DesensitizationService {
  /**
   * 脱敏联系方式（基础脱敏）
   */
  desensitizeBasic(contact: ContactInfo): DesensitizedContact {
    return {
      phone: contact.phone ? desensitizePhone(contact.phone) : undefined,
      landline: contact.landline ? desensitizeLandline(contact.landline) : undefined,
      email: contact.email ? desensitizeEmail(contact.email) : undefined,
      wechat: contact.wechat ? desensitizeWechat(contact.wechat) : undefined,
      qq: contact.qq ? desensitizeQQ(contact.qq) : undefined,
    };
  }
  
  /**
   * 脱敏联系方式（完整脱敏）
   */
  desensitizeFull(contact: ContactInfo): DesensitizedContact {
    return {
      phone: contact.phone ? desensitizePhone(contact.phone) : undefined,
      phoneFull: contact.phone,
      landline: contact.landline ? desensitizeLandline(contact.landline) : undefined,
      landlineFull: contact.landline,
      email: contact.email ? desensitizeEmail(contact.email) : undefined,
      emailFull: contact.email,
      wechat: contact.wechat ? desensitizeWechat(contact.wechat) : undefined,
      wechatFull: contact.wechat,
      qq: contact.qq ? desensitizeQQ(contact.qq) : undefined,
      qqFull: contact.qq,
    };
  }
  
  /**
   * 脱敏用户姓名
   */
  desensitizeUserName(name: string): string {
    return desensitizeName(name);
  }
  
  /**
   * 脱敏地址
   */
  desensitizeUserAddress(address: string): string {
    return desensitizeAddress(address);
  }
}

export const desensitizationService = new DesensitizationService();
```

---

## 四、数据模型设计

### 4.1 脱敏配置表

```sql
CREATE TABLE desensitization_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_name      VARCHAR(100) NOT NULL UNIQUE,
    field_type      VARCHAR(50) NOT NULL,  -- phone, email, name, address, etc.
    desensitize_type VARCHAR(50) NOT NULL,  -- partial, full, hidden
    display_level   INTEGER DEFAULT 1,       -- 1: 列表, 2: 详情未登录, 3: 详情已登录
    enabled         BOOLEAN DEFAULT TRUE,
    
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- 插入默认配置
INSERT INTO desensitization_config (field_name, field_type, desensitize_type, display_level) VALUES
('phone', 'phone', 'partial', 1),
('landline', 'phone', 'partial', 1),
('email', 'email', 'partial', 1),
('wechat', 'string', 'partial', 2),
('qq', 'string', 'partial', 2),
('teacher_name', 'name', 'partial', 1),
('address', 'address', 'city_only', 1),
('full_address', 'address', 'hidden', 2);
```

### 4.2 脱敏日志表

```sql
CREATE TABLE desensitization_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID REFERENCES courses(id),
    user_id         UUID REFERENCES users(id),  -- 查看完整信息的用户
    
    field_name      VARCHAR(100) NOT NULL,
    action          VARCHAR(50) NOT NULL,  -- view_full, copy, etc.
    
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_desensitization_logs_course ON desensitization_logs(course_id);
CREATE INDEX idx_desensitization_logs_user ON desensitization_logs(user_id);
CREATE INDEX idx_desensitization_logs_created ON desensitization_logs(created_at);
```

---

## 五、API 设计

### 5.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| GET | /api/v1/courses/:id/contact | 获取脱敏联系方式 | 返回基础脱敏信息 |
| POST | /api/v1/courses/:id/contact/request | 申请查看完整信息 | 登录用户申请 |
| GET | /api/v1/courses/:id/contact/full | 获取完整联系方式 | 需权限验证 |
| POST | /api/v1/courses/:id/contact/copy | 复制联系方式 | 记录日志 |

### 5.2 API 详细设计

#### 5.2.1 GET /api/v1/courses/:id/contact

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "phone": "021-***-4567",
    "phoneVisible": true,
    "email": "te***@example.com",
    "emailVisible": true,
    "wechat": null,
    "wechatVisible": false,
    "wechatRequestable": true,
    "address": "Auckland CBD",
    "fullAddressVisible": false,
    "fullAddressRequestable": true
  }
}
```

#### 5.2.2 POST /api/v1/courses/:id/contact/full

**请求头**: Authorization: Bearer \<token\>

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "phone": "021-123-4567",
    "phoneVerified": true,
    "email": "teacher@example.com",
    "emailVerified": true,
    "wechat": "wx12345678",
    "address": "123 Queen Street, Auckland CBD"
  },
  "message": "您已查看完整联系方式，请合理使用"
}
```

---

## 六、前端设计

### 6.1 联系方式展示组件

```tsx
// ContactDisplay.tsx
interface ContactDisplayProps {
  contact: {
    phone?: string;
    phoneFull?: string;
    email?: string;
    emailFull?: string;
    wechat?: string;
    wechatFull?: string;
    address?: string;
    fullAddress?: string;
  };
  isLoggedIn: boolean;
  onRequestFull: () => void;
}

export function ContactDisplay({ contact, isLoggedIn, onRequestFull }: ContactDisplayProps) {
  return (
    <div className="contact-display">
      {/* 电话 */}
      <div className="contact-item">
        <span className="contact-icon">📞</span>
        <span>{contact.phone}</span>
        {isLoggedIn && contact.phoneFull && (
          <span className="contact-full">{contact.phoneFull}</span>
        )}
      </div>
      
      {/* 邮箱 */}
      <div className="contact-item">
        <span className="contact-icon">📧</span>
        <span>{contact.email}</span>
        {isLoggedIn && contact.emailFull && (
          <a href={`mailto:${contact.emailFull}`} className="contact-action">
            发送邮件
          </a>
        )}
      </div>
      
      {/* 微信 */}
      <div className="contact-item">
        <span className="contact-icon">💬</span>
        {isLoggedIn && contact.wechatFull ? (
          <>
            <span>{contact.wechat}</span>
            <button onClick={() => navigator.clipboard.writeText(contact.wechatFull!)}>
              复制
            </button>
          </>
        ) : (
          <button onClick={onRequestFull} className="contact-request">
            点击查看微信
          </button>
        )}
      </div>
      
      {/* 地址 */}
      <div className="contact-item">
        <span className="contact-icon">📍</span>
        <span>{contact.address}</span>
        {isLoggedIn && contact.fullAddress && (
          <span className="contact-full">{contact.fullAddress}</span>
        )}
      </div>
    </div>
  );
}
```

---

## 七、测试用例

### 7.1 功能测试用例

| 测试场景 | 输入 | 预期输出 |
|----------|------|----------|
| 手机号脱敏 | 021-123-4567 | 021-***-4567 |
| 邮箱脱敏 | teacher@example.com | te***@example.com |
| 微信脱敏 | wx12345678 | wx******78 |
| 姓名脱敏 | 张老师 | 张** |
| 地址脱敏 | 123 Queen St, Auckland | Auckland |
| 空值处理 | null/undefined | 返回原值 |

---

## 八、实现计划

### 8.1 开发任务分解

| 任务 | 描述 | 预估工时 | 依赖 |
|------|------|----------|------|
| 脱敏规则设计 | 设计各类型脱敏规则 | 4h | 合规要求 |
| 脱敏函数实现 | 实现各类型脱敏函数 | 8h | 脱敏规则 |
| 脱敏服务 | 封装脱敏服务 | 4h | 脱敏函数 |
| API集成 | 集成脱敏到课程API | 8h | API设计 |
| 前端展示 | 实现脱敏信息展示组件 | 8h | UI设计 |
| 权限控制 | 实现完整信息查看权限 | 8h | 用户系统 |
| 脱敏日志 | 记录脱敏查看日志 | 4h | 脱敏服务 |
| 单元测试 | 脱敏功能测试 | 4h | 全部 |

### 8.2 验收标准

- [ ] 各类型数据正确脱敏
- [ ] 分级展示规则正确
- [ ] 登录用户可查看完整信息
- [ ] 敏感操作记录日志
- [ ] 前端展示美观易用
- [ ] 脱敏规则可配置

---

## 九、风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 脱敏规则漏洞 | 低 | 高 | 代码审查，安全测试 |
| 绕过脱敏 | 低 | 高 | 后端统一脱敏，前端不存原始数据 |
| 合规要求变化 | 中 | 中 | 脱敏规则可配置 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/05-product-design/feature-desensitization.md`

**相关文档**:
- [功能概览](feature-overview.md)
- [课程详情页](feature-course-detail.md)
- [外部数据抓取](feature-data-aggregation.md)
