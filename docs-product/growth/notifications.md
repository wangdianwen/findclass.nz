---
title: Email Notification System
category: product-design
created: 2026-01-21
author: steve-jobs
version: 1.0
phase: 2
priority: P0
status: pending-development
---

# Feature: Email Notification System - 邮件通知系统

> **功能模块**: 运营支撑 | **优先级**: P0 | **排期**: Phase 2 | **状态**: 待开发

---

## 一、功能概述

### 1.1 功能描述

邮件通知系统负责平台各类通知的邮件发送，包括用户通知、课程提醒、营销邮件等，支持模板化管理。

### 1.2 核心价值

- **用户触达**: 确保重要信息及时送达用户
- **自动化运营**: 减少人工通知工作量
- **营销支持**: 支持批量营销邮件发送
- **送达率保证**: 邮件发送和追踪

### 1.3 用户故事

```
作为 用户
我希望 收到课程更新的邮件提醒
以便 及时了解课程动态

作为 平台运营
我希望 发送营销邮件给目标用户
以便 进行用户召回和转化
```

---

## 二、通知类型

### 2.1 通知类型分类

| 类型 | 触发场景 | 优先级 | 发送时间 |
|------|----------|--------|----------|
| **交易通知** |
| 预约确认 | 用户预约课程后 | 高 | 立即 |
| 预约提醒 | 开课前24小时 | 高 | 定时 |
| 课程取消 | 课程取消时 | 高 | 立即 |
| **账户通知** |
| 注册验证 | 用户注册时 | 高 | 立即 |
| 密码重置 | 用户请求重置密码时 | 高 | 立即 |
| 账号异常 | 检测到异常登录时 | 高 | 立即 |
| **系统通知** |
| 课程更新 | 关注的课程有更新时 | 中 | 实时 |
| 新课程 | 符合用户兴趣的新课程 | 低 | 每天汇总 |
| 评价回复 | 教师回复评价后 | 中 | 立即 |
| **营销通知** |
| 活动推广 | 平台活动期间 | 低 | 按计划 |
| 用户召回 | 沉默用户召回 | 低 | 按计划 |

### 2.2 邮件模板

| 模板名称 | 用途 | 触发条件 |
|----------|------|----------|
| welcome | 注册欢迎邮件 | 用户注册成功 |
| verify_email | 邮箱验证 | 发送验证码 |
| password_reset | 密码重置 | 请求重置密码 |
| booking_confirm | 预约确认 | 预约成功后 |
| booking_reminder | 开课提醒 | 开课前24小时 |
| course_update | 课程更新 | 关注课程更新 |
| teacher_reply | 教师回复 | 教师回复评价 |
| promotion | 营销推广 | 活动期间 |

---

## 三、邮件模板设计

### 3.1 通用模板结构

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #1890ff; padding: 20px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; }
    .content { padding: 30px 20px; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999; }
    .button { display: inline-block; padding: 12px 30px; background: #1890ff; color: #fff; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>EduSearch NZ</h1>
    </div>
    <div class="content">
      {{content}}
    </div>
    <div class="footer">
      <p>EduSearch NZ - 新西兰课程搜索平台</p>
      <p>您收到此邮件是因为您在 EduSearch NZ 注册了账号。</p>
      <p><a href="{{unsubscribeUrl}}">取消订阅</a></p>
    </div>
  </div>
</body>
</html>
```

### 3.2 预约确认邮件模板

```html
<h2>您好，{{userName}}！</h2>
<p>您的课程预约已确认，以下是预约详情：</p>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr>
    <td style="padding: 10px; border-bottom: 1px solid #eee;">课程名称</td>
    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>{{courseName}}</strong></td>
  </tr>
  <tr>
    <td style="padding: 10px; border-bottom: 1px solid #eee;">上课时间</td>
    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>{{scheduleTime}}</strong></td>
  </tr>
  <tr>
    <td style="padding: 10px; border-bottom: 1px solid #eee;">授课教师</td>
    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>{{teacherName}}</strong></td>
  </tr>
  <tr>
    <td style="padding: 10px; border-bottom: 1px solid #eee;">上课地点</td>
    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>{{location}}</strong></td>
  </tr>
</table>

<p>如有疑问，请联系教师：{{teacherContact}}</p>

<p style="margin-top: 30px;">
  <a href="{{courseDetailUrl}}" class="button">查看课程详情</a>
</p>
```

---

## 四、技术架构

### 4.1 邮件发送流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                        邮件发送流程                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  业务触发                                                           │
│      │                                                             │
│      ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  邮件服务 API                                                 │   │
│  │  ├─ 参数验证                                                  │   │
│  │  ├─ 模板渲染                                                  │   │
│  │  └─ 队列入队                                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│      │                                                             │
│      ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  消息队列 (Redis/Bull)                                        │   │
│  │  - 优先级队列                                                 │   │
│  │  - 重试机制                                                   │   │
│  │  - 延迟发送                                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│      │                                                             │
│      ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  邮件发送器                                                   │   │
│  │  - Nodemailer                                                 │   │
│  │  - 失败重试                                                   │   │
│  │  - 发送日志                                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│      │                                                             │
│      ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  邮件服务提供商                                                │   │
│  │  - SendGrid / Mailgun / AWS SES                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 邮件服务配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| 发送服务 | SendGrid/Mailgun/SMTP | 邮件发送服务商 |
| 发送频率限制 | 100封/小时/用户 | 防止用户被骚扰 |
| 重试次数 | 3次 | 发送失败重试 |
| 重试间隔 | 5分钟 | 重试间隔时间 |

---

## 五、数据模型设计

### 5.1 邮件模板表

```sql
CREATE TABLE email_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 模板信息
    name            VARCHAR(100) NOT NULL UNIQUE,
    subject         VARCHAR(200) NOT NULL,
    content         TEXT NOT NULL,
    content_html    TEXT NOT NULL,
    
    -- 变量定义
    variables       JSONB DEFAULT '[]',  -- ['userName', 'courseName', 'scheduleTime']
    
    -- 配置
    is_active       BOOLEAN DEFAULT TRUE,
    category        VARCHAR(50),  -- system, transaction, marketing
    
    -- 统计
    send_count      INTEGER DEFAULT 0,
    open_count      INTEGER DEFAULT 0,
    click_count     INTEGER DEFAULT 0,
    
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

### 5.2 邮件发送记录表

```sql
CREATE TABLE email_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 关联
    user_id         UUID REFERENCES users(id),
    
    -- 邮件信息
    template_id     UUID REFERENCES email_templates(id),
    to_email        VARCHAR(255) NOT NULL,
    subject         VARCHAR(200) NOT NULL,
    content         TEXT,
    
    -- 发送状态
    status          VARCHAR(20) NOT NULL,  -- pending, sent, failed, bounced
    send_at         TIMESTAMP,
    delivered_at    TIMESTAMP,
    opened_at       TIMESTAMP,
    
    -- 错误信息
    error_message   TEXT,
    error_code      VARCHAR(50),
    
    -- 元数据
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_logs_user ON email_logs(user_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created ON email_logs(created_at);
```

---

## 六、API 设计

### 6.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| POST | /api/v1/notifications/email/send | 发送邮件 | 触发邮件发送 |
| POST | /api/v1/notifications/email/template | 批量发送 | 使用模板批量发送 |
| GET | /api/v1/notifications/email/logs | 获取发送日志 | 查询发送记录 |
| POST | /api/v1/notifications/email/webhook | 邮件回调 | 处理打开/点击 |

### 6.2 邮件发送服务

```typescript
// services/email.service.ts

interface SendEmailParams {
  to: string;
  templateName: string;
  variables: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
}

export class EmailService {
  async send(params: SendEmailParams): Promise<void> {
    // 1. 获取模板
    const template = await this.getTemplate(params.templateName);
    
    // 2. 渲染模板
    const { subject, content } = this.renderTemplate(template, params.variables);
    
    // 3. 发送到队列
    await this.queue.add('email-send', {
      to: params.to,
      subject,
      content,
      templateId: template.id,
      variables: params.variables,
    }, {
      priority: params.priority || 'normal',
    });
    
    // 4. 记录日志
    await this.logSend(params.to, template.id);
  }
  
  async sendBatch(params: {
    users: { email: string; variables: Record<string, any> }[];
    templateName: string;
  }): Promise<void> {
    // 批量发送
  }
}
```

---

## 七、测试用例

### 7.1 功能测试用例

| 测试场景 | 操作步骤 | 预期结果 |
|----------|----------|----------|
| 发送邮件 | 触发邮件发送 | 邮件发送成功 |
| 模板渲染 | 替换变量 | 变量正确替换 |
| 发送失败 | 模拟发送失败 | 错误记录，重试触发 |
| 批量发送 | 发送营销邮件 | 全部发送成功 |
| 邮件打开 | 用户打开邮件 | 打开率统计增加 |

---

## 八、实现计划

### 8.1 开发任务分解

| 任务 | 描述 | 预估工时 | 依赖 |
|------|------|----------|------|
| 数据库设计 | 创建模板和日志表 | 4h | - |
| 邮件服务 | 集成Nodemailer | 8h | - |
| 模板系统 | 实现模板渲染引擎 | 8h | - |
| 消息队列 | 集成消息队列 | 8h | - |
| 发送API | 实现邮件发送API | 8h | 数据库 |
| 管理后台 | 模板管理界面 | 8h | API设计 |
| 单元测试 | 邮件服务测试 | 4h | 全部 |

### 8.2 验收标准

- [ ] 邮件发送成功
- [ ] 模板渲染正确
- [ ] 发送失败重试
- [ ] 统计功能正常
- [ ] 管理后台可用

---

## 九、风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 邮件进垃圾箱 | 中 | 中 | 规范发送，SPF/DKIM |
| 发送延迟 | 中 | 中 | 队列处理，监控告警 |
| 发送失败 | 低 | 中 | 重试机制 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/05-product-design/feature-notifications.md`

**相关文档**:
- [功能概览](feature-overview.md)
- [用户系统](feature-usercenter.md)
- [在线预约](feature-booking.md)
</parameter>
</invoke>
<parameter name="filePath">/Users/dianwenwang/Project/idea/05-product-design/feature-notifications.md