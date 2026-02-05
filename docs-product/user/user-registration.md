---
title: User Registration and Authentication
category: product-design
created: 2026-01-21
author: steve-jobs
version: 1.0
phase: 1
priority: P0
status: pending-development
---

# Feature: User Registration and Authentication - 用户注册与认证

> **功能模块**: 用户系统 | **优先级**: P0 | **排期**: Phase 1 | **状态**: 待开发

---

## 一、功能概述

### 1.1 功能描述

用户注册与认证系统是平台的基础设施层，为所有用户提供身份验证和访问控制能力。

**核心特点**：
- **邮箱验证码注册**：替代传统的手机验证码，降低成本
- **游客模式**：无需注册即可浏览，但功能受限
- **默认客户角色**：注册成功后自动获得 Customer（客户）角色
- **RBAC权限模型**：基于角色的访问控制，支持角色叠加

### 1.2 用户层级

| 层级 | 说明 | 权限 |
|------|------|------|
| **游客** | 无需注册 | 搜索、浏览详情 |
| **客户** | 注册后 | 完整功能（收藏、预约、评价） |
| **教师** | 申请获得 | 客户权限 + 发布课程 |
| **机构** | 申请获得 | 客户权限 + 机构管理 |

### 1.3 用户故事

```
作为 游客
我希望 浏览课程信息
以便 了解有哪些可选的培训课程

作为 潜在用户
我希望 通过邮箱注册账号
以便 获得完整功能（收藏、预约、评价）

作为 注册用户
我希望 通过邮箱验证码登录
以便 安全访问我的个人中心

作为 客户
我希望 申请成为教师
以便 发布自己的课程

作为 教师
我希望 上架/下架我的课程
以便 灵活控制服务状态

作为 用户
我希望 注销我的账号
以便 行使被遗忘权（法规合规）
```

---

## 二、用户角色体系（RBAC）

```
┌─────────────────────────────────────────────────────────────────┐
│                      用户角色体系                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐                                              │
│   │   Customer  │  客户（默认角色）                             │
│   │   (客户)    │  - 注册即拥有                                │
│   │             │  - 搜索、浏览、收藏、预约、评价               │
│   └─────────────┘                                              │
│          │                                                      │
│          │ 申请                                                 │
│          ▼                                                      │
│   ┌─────────────┐     下架      ┌─────────────┐               │
│   │   Teacher   │─────────────►│   Teacher   │               │
│   │   (教师)    │              │ (已下架)    │               │
│   │             │              └──────┬──────┘               │
│   └─────────────┘                     │ 上架                  │
│                                        ▼                       │
│                                   ┌─────────────┐              │
│                                   │   Teacher   │              │
│                                   │   (上架中)  │              │
│                                   └─────────────┘              │
│                                                                 │
│   关键规则：                                                    │
│   - 角色一旦获得，永不注销                                      │
│   - 只能下架/上架，不能彻底删除角色                             │
│   - 用户可同时拥有 Customer + Teacher 角色                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 权限矩阵

| 权限 | 游客 | 客户 | 教师 | 机构 |
|------|:----:|:----:|:----:|:----:|
| 搜索课程 | ✅ | ✅ | ✅ | ✅ |
| 浏览课程 | ✅ | ✅ | ✅ | ✅ |
| 收藏课程 | ❌ | ✅ | ✅ | ✅ |
| 预约课程 | ❌ | ✅ | ✅ | ✅ |
| 评价课程 | ❌ | ✅ | ✅ | ✅ |
| 个人中心 | ❌ | ✅ | ✅ | ✅ |
| 发布课程 | ❌ | ❌ | ✅ | ✅ |
| 管理课程 | ❌ | ❌ | ✅ | ✅ |
| 机构管理 | ❌ | ❌ | ❌ | ✅ |

---

## 三、游客升级流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      游客升级流程                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   游客状态                                                       │
│       │                                                         │
│       │ 点击"收藏"                                              │
│       ▼                                                         │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  登录/注册提示                                           │  │
│   │  ─────────────────────────────────────────────────────  │  │
│   │  ⚠️ 收藏功能需要登录后使用                               │  │
│   │                                                         │  │
│   │  ┌─────────────────────┐  ┌─────────────────────┐       │  │
│   │  │ [免费注册]          │  │ [暂不登录，继续浏览]│       │  │
│   │  └─────────────────────┘  └─────────────────────┘       │  │
│   └─────────────────────────────────────────────────────────┘  │
│       │                                                         │
│       │ 点击"免费注册"                                         │
│       ▼                                                         │
│   ┌─────────────┐                                              │
│   │  输入邮箱   │                                              │
│   └─────────────┘                                              │
│       │                                                         │
│       ▼                                                         │
│   ┌─────────────┐                                              │
│   │  发送验证码 │                                              │
│   └─────────────┘                                              │
│       │                                                         │
│       ▼                                                         │
│   ┌─────────────┐                                              │
│   │  验证验证码 │                                              │
│   └─────────────┘                                              │
│       │                                                         │
│       ▼                                                         │
│   ┌─────────────┐                                              │
│   │  注册成功   │  ◄── 自动获得 Customer 角色                  │
│   └─────────────┘                                              │
│       │                                                         │
│       ▼                                                         │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  完整功能已解锁                                          │  │
│   │  ⭐ 收藏    📅 预约    ✍️ 评价    👤 个人中心           │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 四、注册流程

### 4.1 注册流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户注册流程                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │  进入    │───▶│  输入    │───▶│  点击    │───▶│  发送    │ │
│  │ 注册页面 │    │ 邮箱地址 │    │ 获取验证码│    │ 验证码   │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│       │              │                │                │        │
│       │              │                │                ▼        │
│       │              │                │         ┌──────────┐    │
│       │              │                │         │ 验证码    │    │
│       │              │                │         │ 有效期    │    │
│       │              │                │         │ 10分钟    │    │
│       │              │                │         └──────────┘    │
│       │              │                │                │        │
│       ▼              ▼                ▼                ▼        │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │ 展示注册 │    │ 前端格式 │    │ 倒计时   │    │ 用户输入 │ │
│  │ 页面     │    │ 验证     │    │ 60秒     │    │ 验证码   │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│                                                           │     │
│                                                           ▼     │
│                                                    ┌──────────┐ │
│                                                    │ 验证     │ │
│                                                    │ 验证码   │ │
│                                                    └──────────┘ │
│                                                          │      │
│                            ┌─────────────────────────────┘      │
│                            │                                    │
│                            ▼                                    │
│                     ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│                     │ 验证失败 │───▶│ 重新     │    │ 验证成功 │ │
│                     │ 提示错误 │    │ 输入     │    │ 创建账号 │ │
│                     └──────────┘    └──────────┘    └──────────┘ │
│                                                          │      │
│                                                          ▼      │
│                                                    ┌──────────┐ │
│                                                    │ 跳转     │ │
│                                                    │ 首页/引导│ │
│                                                    └──────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 注册流程步骤

| 步骤 | 页面 | 交互 | 验证规则 |
|------|------|------|----------|
| 1 | 注册页 | 用户输入邮箱 | 正则验证：`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$` |
| 2 | 注册页 | 点击"获取验证码" | 检查邮箱格式、是否已注册 |
| 3 | 后端 | 生成6位数字验证码 | 验证码存入Redis，10分钟有效期 |
| 4 | 后端 | 发送验证码邮件 | 使用Nodemailer，支持HTML模板 |
| 5 | 注册页 | 用户输入验证码 | 检查验证码是否正确、是否过期 |
| 6 | 后端 | 验证通过 | 创建用户账号 |
| 7 | 注册页 | 注册成功 | 跳转到首页或引导页 |

---

## 五、登录流程

```
用户进入登录页
      │
      ▼
用户输入邮箱地址
      │
      ▼
点击"获取验证码"
      │
      ▼
发送验证码到邮箱（倒计时60秒）
      │
      ▼
用户输入验证码
      │
      ▼
验证验证码
      │
      ├── 失败 ──▶ 提示错误，可重新获取
      │
      └── 成功 ──▶ 生成JWT Token，存储到Cookie
                    │
                    ▼
              登录成功，跳转首页
```

#### 2.2.2 登录方式说明

| 登录方式 | 说明 | 适用场景 |
|----------|------|----------|
| 邮箱+验证码 | 发送验证码到邮箱，输入验证码登录 | 主要登录方式，默认推荐 |
| 邮箱+密码 | 传统密码登录方式 | 备用选项，用户可自行设置密码 |

### 2.3 密码重置流程

#### 2.3.1 密码重置流程图

```
忘记密码页面
      │
      ▼
输入注册邮箱
      │
      ▼
点击"发送重置链接"
      │
      ▼
后端生成重置Token（有效期1小时）
      │
      ▼
发送重置邮件（包含重置链接）
      │
      ▼
用户点击链接，进入重置密码页面
      │
      ├── Token过期 ──▶ 提示过期，引导重新申请
      │
      └── Token有效 ──▶ 输入新密码
                           │
                           ▼
                      确认新密码
                           │
                           ▼
                      密码重置成功
                           │
                           ▼
                      跳转登录页
```

---

## 六、数据模型设计

### 6.1 用户表 (users)

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255),  -- 密码（可选，未设置时为NULL）
    email_verified  BOOLEAN DEFAULT FALSE,
    email_verify_token VARCHAR(255),  -- 邮箱验证token
    email_verify_expires TIMESTAMP,  -- 验证token过期时间
    status          VARCHAR(20) DEFAULT 'active',  -- active, inactive, suspended
    user_type       VARCHAR(20) DEFAULT 'student',  -- student, parent, teacher, admin
    profile         JSONB DEFAULT '{}',  -- 用户资料
    settings        JSONB DEFAULT '{"language": "zh-CN", "notifications": true}',  -- 设置
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    last_login_at   TIMESTAMP,
    login_count     INTEGER DEFAULT 0
);

-- 索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_user_type ON users(user_type);
```

### 6.2 验证码表 (verification_codes)

```sql
CREATE TABLE verification_codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL,
    code            VARCHAR(10) NOT NULL,
    code_type       VARCHAR(20) NOT NULL,  -- register, login, password_reset
    expires_at      TIMESTAMP NOT NULL,
    used_at         TIMESTAMP,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_verification_codes_email ON verification_codes(email);
CREATE INDEX idx_verification_codes_code ON verification_codes(code);
CREATE INDEX idx_verification_codes_expires ON verification_codes(expires_at);
```

### 6.3 密码重置表 (password_resets)

```sql
CREATE TABLE password_resets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    reset_token     VARCHAR(255) UNIQUE NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    used_at         TIMESTAMP,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_password_resets_token ON password_resets(reset_token);
CREATE INDEX idx_password_resets_expires ON password_resets(expires_at);
```

### 6.4 登录日志表 (login_logs)

```sql
CREATE TABLE login_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    email           VARCHAR(255),
    login_method    VARCHAR(20) NOT NULL,  -- email_code, password
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    success         BOOLEAN NOT NULL,
    failure_reason  VARCHAR(100),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX idx_login_logs_created_at ON login_logs(created_at);
```

---

## 七、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| POST | /api/v1/auth/register | 用户注册 | 发送验证码，创建账号 |
| POST | /api/v1/auth/verify-code | 验证验证码 | 注册/登录验证码验证 |
| POST | /api/v1/auth/login | 用户登录 | 验证码或密码登录 |
| POST | /api/v1/auth/logout | 用户登出 | 清除Token |
| POST | /api/v1/auth/password/reset-request | 请求重置密码 | 发送重置邮件 |
| POST | /api/v1/auth/password/reset | 重置密码 | 使用Token重置 |
| GET | /api/v1/auth/me | 获取当前用户 | 需要认证 |
| PUT | /api/v1/auth/me | 更新当前用户 | 需要认证 |

### 4.2 API 详细设计

#### 4.2.1 POST /api/v1/auth/register

**请求参数**:

```json
{
  "email": "user@example.com"
}
```

**响应成功 (201)**:

```json
{
  "success": true,
  "message": "验证码已发送至邮箱",
  "data": {
    "expires_in": 600,
    "can_resend_after": 60
  }
}
```

**响应错误 (400)**:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_EMAIL",
    "message": "邮箱格式不正确"
  }
}
```

#### 4.2.2 POST /api/v1/auth/verify-code

**请求参数**:

```json
{
  "email": "user@example.com",
  "code": "123456",
  "code_type": "register"
}
```

**响应成功 (200)**:

```json
{
  "success": true,
  "message": "验证成功",
  "data": {
    "user_id": "uuid-xxxx-xxxx",
    "is_new_user": true,
    "token": "jwt-token-here",
    "expires_in": 86400
  }
}
```

#### 7.2.3 POST /api/v1/auth/login

**请求参数**:

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**响应成功 (200)**:

```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "uuid-xxxx-xxxx",
      "email": "user@example.com",
      "user_type": "student"
    },
    "token": "jwt-token-here",
    "expires_in": 86400
  }
}
```

---

## 八、邮件模板设计

### 5.1 注册/登录验证码邮件

**邮件主题**: 【EduSearch NZ】您的验证码是：{code}

**邮件内容**:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1890ff; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>您好！</h2>
        <p>您的验证码是：</p>
        <p class="code">{code}</p>
        <p>验证码将在 <strong>10分钟</strong> 后过期，请尽快使用。</p>
        <p>如果这不是您的操作，请忽略此邮件。</p>
        <div class="footer">
            <p>EduSearch NZ - 新西兰课程搜索平台</p>
            <p>此邮件由系统自动发送，请勿回复。</p>
        </div>
    </div>
</body>
</html>
```

### 5.2 密码重置邮件

**邮件主题**: 【EduSearch NZ】重置您的密码

**邮件内容**:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #1890ff; color: white; text-decoration: none; border-radius: 4px; }
        .footer { color: #999; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>您好！</h2>
        <p>您 requested 重置您的密码。请点击下方按钮重置密码：</p>
        <p style="margin: 30px 0;">
            <a href="{reset_link}" class="button">重置密码</a>
        </p>
        <p>此链接将在 <strong>1小时</strong> 后过期。</p>
        <p>如果这不是您的操作，请忽略此邮件。</p>
        <div class="footer">
            <p>EduSearch NZ - 新西兰课程搜索平台</p>
            <p>此邮件由系统自动发送，请勿回复。</p>
        </div>
    </div>
</body>
</html>
```

---

## 六、安全设计

### 6.1 安全措施

| 安全措施 | 说明 | 实现方式 |
|----------|------|----------|
| 验证码过期 | 验证码10分钟有效 | Redis TTL |
| 发送频率限制 | 同一邮箱60秒内只能发送一次 | Redis计数 |
| IP限制 | 同一IP每分钟最多10次请求 | Redis计数 |
| 暴力破解防护 | 同一邮箱连续5次错误，锁定15分钟 | Redis |
| Token安全 | JWT Token，24小时有效期 | HttpOnly Cookie |
| 密码加密 | bcrypt加密存储 | bcrypt库 |
| SQL注入防护 | 参数化查询 | Prisma/PostgreSQL |

### 6.2 验证码发送限制规则

| 限制项 | 限制值 | 超过后处理 |
|--------|--------|------------|
| 发送频率 | 60秒/次 | 返回错误提示 |
| 每日上限 | 20次/天/邮箱 | 返回错误提示 |
| 连续错误 | 5次/小时 | 锁定1小时 |
| IP请求 | 100次/小时 | 返回429错误 |

---

## 七、前端页面设计

### 7.1 注册页面

#### 7.1.1 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  EduSearch NZ                                              │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │   免费注册                                           │   │
│  │                                                     │   │
│  │   ┌─────────────────────────────────────────────┐   │   │
│  │   │  邮箱地址                                   │   │   │
│  │   │  [ user@example.com                  ]      │   │   │
│  │   └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │   ┌─────────────────────────────────────────────┐   │   │
│  │   │ [        获取验证码              ]           │   │   │
│  │   └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │   ┌─────────────────────────────────────────────┐   │   │
│  │   │  验证码           [ 123456           ]       │   │   │
│  │   └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │   ┌─────────────────────────────────────────────┐   │   │
│  │   │ [           注  册                     ]     │   │   │
│  │   └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │   已有账号？<u>立即登录</u>                          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 登录页面

#### 7.2.1 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  EduSearch NZ                                              │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │   登录                                               │   │
│  │                                                     │   │
│  │   ┌─────────────────────────────────────────────┐   │   │
│  │   │  邮箱地址                                   │   │   │
│  │   │  [ user@example.com                  ]      │   │   │
│  │   └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │   ┌─────────────────────────────────────────────┐   │   │
│  │   │  验证码                                   │   │   │
│  │   │  [ 123456                     ][获取验证码] │   │   │
│  │   └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │   ┌─────────────────────────────────────────────┐   │   │
│  │   │ [           登  录                     ]     │   │   │
│  │   └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │   <u>忘记密码？</u>  <u>免费注册</u>                  │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 八、国际化支持

### 8.1 中文文案

| 场景 | 中文文案 |
|------|----------|
| 注册按钮 | 免费注册 |
| 登录按钮 | 登录 |
| 获取验证码 | 获取验证码 |
| 重新获取 | 重新获取 ({time}s) |
| 验证码已发送 | 验证码已发送至 {email} |
| 验证码错误 | 验证码错误，请重新输入 |
| 验证码过期 | 验证码已过期，请重新获取 |
| 邮箱已注册 | 该邮箱已注册，请直接登录 |
| 登录成功 | 登录成功 |
| 邮箱格式错误 | 请输入有效的邮箱地址 |

### 8.2 英文文案

| 场景 | 英文文案 |
|------|----------|
| 注册按钮 | Sign Up Free |
| 登录按钮 | Sign In |
| 获取验证码 | Get Code |
| 重新获取 | Resend ({time}s) |
| 验证码已发送 | Verification code sent to {email} |
| 验证码错误 | Invalid verification code |
| 验证码过期 | Code expired, please request again |
| 邮箱已注册 | This email is already registered |
| 登录成功 | Welcome back! |
| 邮箱格式错误 | Please enter a valid email address |

---

## 九、测试用例

### 9.1 功能测试用例

| 测试场景 | 前置条件 | 操作步骤 | 预期结果 |
|----------|----------|----------|----------|
| 正常注册 | 无 | 输入有效邮箱 → 获取验证码 → 输入正确验证码 → 提交 | 注册成功，跳转首页 |
| 邮箱已注册 | 邮箱已注册 | 输入已注册邮箱 → 获取验证码 | 提示"邮箱已注册" |
| 邮箱格式错误 | 无 | 输入错误格式邮箱 | 提示"邮箱格式不正确" |
| 验证码错误 | 获取验证码成功 | 输入错误验证码 | 提示"验证码错误" |
| 验证码过期 | 等待10分钟+ | 输入已过期验证码 | 提示"验证码已过期" |
| 发送频率限制 | 60秒内已发送 | 点击获取验证码 | 提示"请稍后再试" |
| 正常登录 | 已注册 | 输入邮箱 → 获取验证码 → 输入正确验证码 → 登录 | 登录成功 |
| 密码重置 | 已注册 | 输入邮箱 → 发送重置链接 → 点击链接 → 设置新密码 | 密码重置成功 |

### 9.2 安全测试用例

| 测试场景 | 操作步骤 | 预期结果 |
|----------|----------|----------|
| 暴力破解 | 连续5次错误验证码 | 账号锁定15分钟 |
| Token泄露 | 使用过期Token请求 | 返回401未授权 |
| IP限制 | 同一IP大量请求 | 返回429过多请求 |

---

## 十、实现计划

### 10.1 开发任务分解

| 任务 | 描述 | 预估工时 | 依赖 |
|------|------|----------|------|
| 数据库设计 | 创建users、verification_codes等表 | 2h | - |
| 后端API | 实现注册、登录、密码重置接口 | 8h | 数据库 |
| 邮件服务 | 集成Nodemailer，配置邮件模板 | 4h | 后端API |
| 验证码服务 | Redis存储验证码，实现发送限制 | 4h | Redis |
| 前端页面 | 实现注册、登录、密码重置页面 | 8h | UI设计 |
| 单元测试 | API接口测试，覆盖率80%+ | 4h | 后端API |
| 安全加固 | 实现限流、锁定等安全措施 | 4h | 安全设计 |

### 10.2 验收标准

- [ ] 注册流程完整，无阻断性Bug
- [ ] 登录流程顺畅，用户体验良好
- [ ] 密码重置功能正常
- [ ] 验证码发送限制生效
- [ ] 暴力破解防护生效
- [ ] 邮件模板显示正常
- [ ] 中英文切换正常
- [ ] 单元测试覆盖率80%+
- [ ] API文档完整（Swagger）

---

## 十一、风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 邮件发送失败 | 中 | 高 | 实现重试机制，失败时提示用户 |
| 验证码被暴力破解 | 低 | 高 | 限流、锁定机制 |
| 用户收不到邮件 | 中 | 中 | 提供"未收到邮件"重发选项 |
| JWT Token泄露 | 低 | 高 | HttpOnly Cookie，24小时过期 |

---

## 十二、用户角色生命周期

### 12.1 角色状态说明

| 状态 | 说明 | 用户操作 | 影响 |
|------|------|----------|------|
| **Customer** | 默认角色 | 注册即有 | 完整客户权限 |
| **Teacher Active** | 教师上架中 | 申请通过 | 可发布课程 |
| **Teacher Inactive** | 教师已下架 | 主动下架 | 课程隐藏，不可预约 |
| **User Closed** | 账号已注销 | 申请注销 | 30天冷静期后删除 |

### 12.2 关键规则

```
规则1: Customer 是默认角色
├── 注册成功后自动获得
└── 不可被撤销或下架

规则2: 角色可叠加
├── 用户可同时是 Customer + Teacher
├── 注销账号影响所有角色
└── 下架一个角色不影响其他角色

规则3: 角色不可注销，只能下架
├── 教师身份一旦获得，永久保留
├── 只能上架/下架，不能彻底删除
└── 保护学员权益，防止教师注销跑路

规则4: 用户注销有冷静期
├── 注销后30天内可撤回
├── 冷静期内账号不可访问
└── 30天后彻底删除
```

### 12.3 角色状态流程

```
用户注册 ──────────────▶ Customer (默认)
                                     │
                                     │ 申请成为教师
                                     ▼
                             Teacher Active (上架中)
                                     │
                                     │ 下架
                                     ▼
                             Teacher Inactive (已下架)
                                     │
                                     │ 上架
                                     ▼
                             Teacher Active (上架中)
                                     │
                                     │ 注销账号
                                     ▼
                             User Closed (已注销)
                                     │
                                     │ 30天冷静期
                                     ▼
                             账号彻底删除
```

详细流程请参考 [用户角色生命周期](../role-lifecycle.md)

---

**文档路径**: `/Users/dianwenwang/Project/idea/05-product-design/mvp/feature-auth.md`

**相关文档**:
- [功能概览](../feature-overview.md)
- [用户角色生命周期](../role-lifecycle.md)
- [用户流程](../legacy/user-flows.md)
