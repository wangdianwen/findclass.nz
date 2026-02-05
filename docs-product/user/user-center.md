---
title: User Center
category: product-design
created: 2026-01-21
author: steve-jobs
version: 1.0
phase: 2
priority: P0
status: pending-development
---

# Feature: User Center - 个人中心

> **功能模块**: 用户系统 | **优先级**: P0 | **排期**: Phase 2 | **状态**: 待开发

---

## 一、功能概述

### 1.1 功能描述

个人中心是用户管理个人资产和设置的核心功能区域，包含个人信息管理、收藏管理、学习记录、消息通知等功能模块。

### 1.2 核心价值

- **资产管理**: 用户集中管理收藏、预约、学习记录
- **个性化服务**: 基于用户数据提供个性化推荐
- **设置控制**: 用户自主控制隐私和通知设置
- **学习追踪**: 帮助用户追踪学习进度

### 1.3 用户故事

```
作为 注册客户
我希望 查看和管理我收藏的课程
以便 快速找到之前感兴趣的课程

作为 家长
我希望 查看孩子的学习记录
以便 了解孩子的学习情况

作为 用户
我希望 管理我的通知偏好
以便 控制接收哪些通知

作为 客户
我希望 申请成为教师
以便 发布自己的课程

作为 教师
我希望 上架/下架我的课程
以便 灵活控制服务状态
```

---

## 二、功能架构

### 2.1 功能模块

```
个人中心
│
├── 👤 个人信息
│   ├── 基本信息（头像、昵称、邮箱、手机）
│   ├── 实名认证
│   ├── 密码管理
│   └── 账号绑定
│
├── ⭐ 收藏管理
│   ├── 收藏的课程
│   ├── 收藏的比较
│   └── 收藏提醒设置
│
├── 📚 学习记录
│   ├── 浏览历史
│   ├── 预约记录
│   └── 学习进度
│
├── 🔔 消息通知
│   ├── 系统通知
│   ├── 课程提醒
│   └── 通知设置
│
└── ⚙️ 设置
    ├── 隐私设置
    ├── 通知偏好
    ├── 语言设置
    └── 账号安全
```

### 2.2 用户类型扩展

| 用户类型 | 获得方式 | 额外功能 | 说明 |
|----------|----------|----------|------|
| **Customer** | 注册即有 | 收藏、预约、学习记录 | 默认角色 |
| **Teacher** | 申请获得 | 课程管理、收入统计 | 可上架/下架 |
| **Institution** | 申请获得 | 机构管理、课程发布 | 可上架/下架 |

**核心规则**：
- 用户可同时拥有 Customer + Teacher 角色
- 角色一旦获得，永久保留，不能注销
- 只能上架/下架，不能彻底删除角色

---

## 三、详细功能设计

### 3.1 个人信息管理

#### 3.1.1 基本信息

| 字段 | 必填 | 验证规则 | 说明 |
|------|------|----------|------|
| 头像 | 否 | 图片格式，1MB内 | 圆形头像 |
| 昵称 | 否 | 2-20字符 | 展示名 |
| 真实姓名 | 否 | 2-20字符 | 用于预约 |
| 邮箱 | 是 | 有效邮箱 | 不可修改 |
| 手机 | 否 | 新西兰手机号 | 用于登录验证 |
| 微信 | 否 | 微信号 | 用于联系教师 |

### 3.2 收藏管理

#### 3.2.1 收藏的课程

| 功能 | 说明 |
|------|------|
| 列表展示 | 展示收藏的课程卡片 |
| 取消收藏 | 一键取消收藏 |
| 分组管理 | 按状态分组（想学/学习中/已学完） |
| 提醒设置 | 设置开课提醒 |
| 加入对比 | 将多个课程加入对比 |

### 3.3 学习记录

| 功能 | 说明 |
|------|------|
| 浏览历史 | 展示最近浏览的课程 |
| 预约记录 | 展示已预约的课程 |
| 学习进度 | 展示课程完成进度（如果适用） |

### 3.4 消息通知

| 类型 | 说明 |
|------|------|
| 系统通知 | 平台公告、活动通知 |
| 课程提醒 | 开课提醒、老师回复 |
| 互动通知 | 评价回复、收藏更新 |

---

## 四、数据模型设计

### 4.1 用户扩展表

```sql
CREATE TABLE user_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    
    -- 基本信息
    avatar_url      VARCHAR(500),
    nickname        VARCHAR(50),
    real_name       VARCHAR(50),
    wechat          VARCHAR(100),
    
    -- 偏好设置
    notification_settings JSONB DEFAULT '{
      "course_reminder": true,
      "teacher_reply": true,
      "system_announcement": true,
      "marketing": false
    }',
    privacy_settings JSONB DEFAULT '{
      "show_history": true,
      "show_favorites": false
    }',
    
    -- 统计信息
    total_favorites INTEGER DEFAULT 0,
    total_views     INTEGER DEFAULT 0,
    total_bookings  INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id)
);
```

### 4.2 收藏表

```sql
CREATE TABLE favorites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    course_id       UUID NOT NULL REFERENCES courses(id),
    
    -- 分组
    folder          VARCHAR(50) DEFAULT 'default',  -- default, learning, completed
    
    -- 设置
    reminder_enabled BOOLEAN DEFAULT FALSE,
    reminder_time    TIMESTAMP,
    
    -- 备注
    note             TEXT,
    
    -- 时间戳
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, course_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_course ON favorites(course_id);
```

### 4.3 浏览历史表

```sql
CREATE TABLE browsing_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    course_id       UUID NOT NULL REFERENCES courses(id),
    
    viewed_at       TIMESTAMP DEFAULT NOW(),
    view_duration   INTEGER,  -- 停留时长（秒）
    
    -- 用于去重，同一课程只保留最近一次
    UNIQUE(user_id, course_id)
);

CREATE INDEX idx_browsing_history_user ON browsing_history(user_id);
CREATE INDEX idx_browsing_history_viewed ON browsing_history(viewed_at);
```

### 4.4 消息表

```sql
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    
    -- 消息内容
    type            VARCHAR(50) NOT NULL,  -- system, course, interaction
    title           VARCHAR(200) NOT NULL,
    content         TEXT NOT NULL,
    link            VARCHAR(500),  -- 点击跳转链接
    
    -- 状态
    is_read         BOOLEAN DEFAULT FALSE,
    read_at         TIMESTAMP,
    
    -- 元数据
    metadata        JSONB,
    
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
```

---

## 五、API 设计

### 5.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| GET | /api/v1/users/profile | 获取个人信息 | 返回用户资料 |
| PUT | /api/v1/users/profile | 更新个人信息 | 更新基本资料 |
| PUT | /api/v1/users/avatar | 更新头像 | 上传新头像 |
| GET | /api/v1/users/favorites | 获取收藏列表 | 返回收藏的课程 |
| POST | /api/v1/users/favorites | 添加收藏 | 收藏课程 |
| DELETE | /api/v1/users/favorites/:id | 取消收藏 | 删除收藏 |
| GET | /api/v1/users/history | 获取浏览历史 | 返回浏览记录 |
| DELETE | /api/v1/users/history | 清空浏览历史 | 清空所有记录 |
| GET | /api/v1/users/notifications | 获取消息列表 | 返回通知 |
| PUT | /api/v1/users/notifications/:id/read | 标记已读 | 标记单条已读 |
| PUT | /api/v1/users/notifications/read-all | 全部已读 | 标记全部已读 |
| GET | /api/v1/users/settings | 获取设置 | 返回用户设置 |
| PUT | /api/v1/users/settings | 更新设置 | 更新通知/隐私设置 |

### 5.2 API 详细设计

#### 5.2.1 GET /api/v1/users/favorites

**响应示例** (200):

```json
{
  "success": true,
  "data": [
    {
      "id": "fav-001",
      "course": {
        "id": "course-001",
        "title": "高中数学提高班",
        "price": 50,
        "rating": 4.9,
        "teacherName": "张老师",
        "trustLevel": "S"
      },
      "folder": "default",
      "reminderEnabled": true,
      "addedAt": "2026-01-10T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 5
  }
}
```

---

## 六、前端设计

### 6.1 个人中心首页

```
┌─────────────────────────────────────────────────────────────────────┐
│  个人中心                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │   👤 头像        张小明                                     │   │
│  │                                                             │   │
│  │   📧 teacher@example.com  📱 021-***-4567                  │   │
│  │                                                             │   │
│  │   [编辑资料]  [账号设置]                                    │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐   │
│  │ ⭐ 收藏          │ │ 📚 预约          │ │ 🔔 消息          │   │
│  │ ─────────────    │ │ ─────────────    │ │ ─────────────    │   │
│  │ 5 门课程         │ │ 2 个预约         │ │ 3 条未读         │   │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📖 最近浏览                                                  │   │
│  │ ─────────────────────────────────────────────────────────  │   │
│  │ 高中数学提高班 - 1天前                                       │   │
│  │ 钢琴一对一课程 - 3天前                                       │   │
│  │ 游泳私教课程 - 1周前                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 设置页面

```
┌─────────────────────────────────────────────────────────────────────┐
│  账号设置                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [个人信息]                                                         │
│  ──────────────────────────────────────────────────────────────    │
│  头像: [👤] [更换]                                                 │
│  昵称: [____________________] [保存]                               │
│  真实姓名: [____________________]                                  │
│  微信: [____________________]                                      │
│                                                                     │
│  [账号安全]                                                         │
│  ──────────────────────────────────────────────────────────────    │
│  登录密码: [*******] [修改]                                        │
│  绑定手机: 021-***-4567 [更换]                                     │
│  绑定邮箱: te***@example.com [更换]                                │
│                                                                     │
│  [通知设置]                                                         │
│  ──────────────────────────────────────────────────────────────    │
│  ☑ 开课提醒                                                        │
│  ☑ 老师回复                                                        │
│  ☑ 系统公告                                                        │
│  ☐ 营销活动                                                        │
│                                                                     │
│  [隐私设置]                                                         │
│  ──────────────────────────────────────────────────────────────    │
│  ☑ 允许教师查看我的学习记录                                        │
│  ☐ 允许展示我的收藏                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 七、测试用例

### 7.1 功能测试用例

| 测试场景 | 操作步骤 | 预期结果 |
|----------|----------|----------|
| 更新头像 | 上传新头像 | 头像更新成功 |
| 添加收藏 | 在课程详情页收藏 | 收藏添加成功 |
| 取消收藏 | 在个人中心取消收藏 | 收藏移除成功 |
| 浏览历史 | 浏览课程 | 历史记录增加 |
| 消息已读 | 点击消息 | 消息标记已读 |
| 通知设置 | 修改通知偏好 | 设置保存成功 |

---

## 八、实现计划

### 8.1 开发任务分解

| 任务 | 描述 | 预估工时 | 依赖 |
|------|------|----------|------|
| 数据库设计 | 创建profile、favorites等表 | 4h | - |
| 个人信息API | 实现资料CRUD接口 | 8h | 数据库 |
| 收藏功能API | 实现收藏增删查接口 | 8h | 数据库 |
| 消息通知API | 实现消息管理接口 | 8h | 数据库 |
| 设置API | 实现设置CRUD接口 | 4h | 数据库 |
| 个人中心前端 | 实现个人中心首页 | 12h | API设计 |
| 设置页面前端 | 实现设置页面 | 8h | API设计 |
| 单元测试 | 个人中心功能测试 | 8h | 全部 |

### 8.2 验收标准

- [ ] 个人信息可编辑
- [ ] 收藏功能正常
- [ ] 浏览历史记录正确
- [ ] 消息通知正常
- [ ] 设置保存成功
- [ ] 前端交互流畅

---

## 九、风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 隐私泄露 | 低 | 高 | 数据加密，权限控制 |
| 数据量大 | 中 | 中 | 分页，清理机制 |
| 并发问题 | 低 | 中 | 乐观锁 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/05-product-design/feature-usercenter.md`

**相关文档**:
- [功能概览](../feature-overview.md)
- [用户注册与认证](../mvp/feature-auth.md)
- [用户角色生命周期](../role-lifecycle.md)
