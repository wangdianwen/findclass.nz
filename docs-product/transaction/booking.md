---
title: Online Booking System
category: product-design
created: 2026-01-21
author: steve-jobs
version: 1.0
phase: 3
priority: P0
status: pending-development
---

# Feature: Online Booking System - 在线预约系统

> **功能模块**: 交易系统 | **优先级**: P0 | **排期**: Phase 3 | **状态**: 待开发

---

## 一、功能概述

### 1.1 功能描述

在线预约系统是平台核心交易功能，允许学生/家长预约教师的课程时间槽，实现课程预约、确认、提醒的完整流程。

### 1.2 核心价值

- **交易闭环**: 从发现到预约完成，提升转化
- **时间管理**: 教师可管理可用时间，避免冲突
- **自动化提醒**: 自动提醒减少爽约
- **数据积累**: 预约数据支撑运营分析

### 1.3 用户故事

```
作为 家长
我希望 在线预约数学辅导课程
以便 方便地安排孩子的学习时间

作为 教师
我希望 设置我的可预约时间
以便 避免时间冲突并合理安排
```

---

## 二、预约流程设计

### 2.1 整体流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                        预约流程                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  用户选择课程                                                       │
│      │                                                             │
│      ▼                                                             │
│  选择时间槽                                                         │
│      │                                                             │
│      ▼                                                             │
│  确认预约信息                                                       │
│      │                                                             │
│      ├── 登录用户 ──▶ 直接确认                                     │
│      └── 未登录 ──▶ 提示登录/注册                                  │
│      │                                                             │
│      ▼                                                             │
│  提交预约请求                                                       │
│      │                                                             │
│      ▼                                                             │
│  教师确认（如果需要）                                               │
│      │                                                             │
│      ├── 直接确认 ──▶ 预约成功                                     │
│      └── 需要确认 ──▶ 等待教师确认                                 │
│      │                                                             │
│      ▼                                                             │
│  发送确认通知                                                       │
│      │                                                             │
│      ▼                                                             │
│  开课前提醒                                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 预约模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| **即时确认** | 预约后立即确认，无需教师操作 | 空闲时间多的教师 |
| **需确认** | 预约后需教师确认才生效 | 需要筛选学生的教师 |
| **试用模式** | 首次体验课特殊处理 | 吸引新学生 |

---

## 三、时间槽设计

### 3.1 时间槽结构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        时间槽结构                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  周一 - 周五                                                        │
│  ├── 09:00-10:00  可预约                                           │
│  ├── 10:00-11:00  已约满                                           │
│  ├── 11:00-12:00  休息                                             │
│  ├── 14:00-15:00  可预约                                           │
│  └── ...                                                           │
│                                                                     │
│  周六 - 周日                                                        │
│  ├── 10:00-12:00  可预约                                           │
│  └── ...                                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 教师可用时间设置

| 设置项 | 说明 |
|--------|------|
| 每周固定时间 | 设置每周固定的可用时间段 |
| 特殊日期 | 设置特定日期的可用/不可用 |
| 提前预约限制 | 最晚提前多少天可预约 |
| 预约间隔 | 每次最小预约时长 |
| 最大预约数 | 每个时间段最多容纳学生数 |

---

## 四、数据模型设计

### 4.1 时间槽表

```sql
CREATE TABLE time_slots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 关联
    teacher_id      UUID NOT NULL REFERENCES teachers(id),
    
    -- 时间信息
    date            DATE NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    duration        INTEGER NOT NULL,  -- 时长（分钟）
    
    -- 设置
    is_available    BOOLEAN DEFAULT TRUE,
    max_students    INTEGER DEFAULT 1,  -- 最大学生数
    current_bookings INTEGER DEFAULT 0,  -- 当前预约数
    
    -- 预约模式
    confirmation_required BOOLEAN DEFAULT FALSE,  -- 是否需要确认
    
    -- 锁定（防止冲突）
    is_locked       BOOLEAN DEFAULT FALSE,
    locked_reason   VARCHAR(100),
    
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(teacher_id, date, start_time)
);

CREATE INDEX idx_time_slots_teacher ON time_slots(teacher_id, date);
CREATE INDEX idx_time_slots_available ON time_slots(date, is_available);
```

### 4.2 预约表

```sql
CREATE TABLE bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 关联
    user_id         UUID NOT NULL REFERENCES users(id),
    teacher_id      UUID NOT NULL REFERENCES teachers(id),
    course_id       UUID REFERENCES courses(id),
    time_slot_id    UUID REFERENCES time_slots(id),
    
    -- 预约信息
    booking_type    VARCHAR(50) NOT NULL,  -- single, package, trial
    user_package_id UUID REFERENCES user_packages(id),
    
    -- 时间
    booking_date    DATE NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    duration        INTEGER NOT NULL,
    
    -- 状态
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, confirmed, completed, cancelled, no_show
    confirmation_required BOOLEAN DEFAULT FALSE,
    confirmed_at    TIMESTAMP,
    
    -- 取消信息
    cancelled_at    TIMESTAMP,
    cancel_reason   VARCHAR(50),
    cancel_note     TEXT,
    
    -- 上课信息
    completed_at    TIMESTAMP,
    notes           TEXT,
    
    -- 评价
    has_review      BOOLEAN DEFAULT FALSE,
    
    -- 时间戳
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bookings_user ON bookings(user_id, status);
CREATE INDEX idx_bookings_teacher ON bookings(teacher_id, booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
```

### 4.3 预约日志表

```sql
CREATE TABLE booking_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID NOT NULL REFERENCES bookings(id),
    
    action          VARCHAR(50) NOT NULL,  -- created, confirmed, cancelled, completed
    actor_type      VARCHAR(20) NOT NULL,  -- user, teacher, system
    actor_id        UUID,
    note            TEXT,
    
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_booking_logs_booking ON booking_logs(booking_id);
```

---

## 五、API 设计

### 5.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| GET | /api/v1/teachers/:id/time-slots | 获取可用时间槽 | 查看教师可预约时间 |
| PUT | /api/v1/teachers/time-slots | 设置可用时间 | 批量设置时间槽 |
| POST | /api/v1/bookings | 创建预约 | 用户提交预约 |
| GET | /api/v1/bookings | 获取我的预约 | 用户查看预约列表 |
| GET | /api/v1/teachers/bookings | 获取预约请求 | 教师查看待确认 |
| PUT | /api/v1/bookings/:id/confirm | 确认预约 | 教师确认预约 |
| PUT | /api/v1/bookings/:id/cancel | 取消预约 | 用户/教师取消 |
| PUT | /api/v1/bookings/:id/complete | 完成预约 | 标记已完成 |

### 5.2 API 详细设计

#### 5.2.1 GET /api/v1/teachers/:id/time-slots

**请求参数**:
- `date`: 查询日期（可选，默认本周）

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "teacherId": "teacher-001",
    "date": "2026-01-20",
    "slots": [
      {
        "id": "slot-001",
        "date": "2026-01-20",
        "startTime": "14:00",
        "endTime": "15:00",
        "duration": 60,
        "isAvailable": true,
        "currentBookings": 0,
        "maxStudents": 1
      },
      {
        "id": "slot-002",
        "date": "2026-01-20",
        "startTime": "15:00",
        "endTime": "16:00",
        "duration": 60,
        "isAvailable": false,
        "currentBookings": 1
      }
    ]
  }
}
```

---

## 六、前端设计

### 6.1 时间选择器

```
┌─────────────────────────────────────────────────────────────────────┐
│  选择上课时间                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📅 2026年1月 [◀ 1月 ▶]  20日 周一                                 │
│                                                                     │
│  一    二    三    四    五    六    日                             │
│  15    16    17    18    19    20    21                            │
│  ─    ─    ─    ─    ─    ─    ─                                  │
│  [ ]  [ ]  [ ]  [ ]  [ ]  [✓]  [ ]  ← 选择日期                     │
│                                                                     │
│  ──────────────────────────────────────────────────────────────    │
│                                                                     │
│  周一 1月20日                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [14:00-15:00]  可预约  [选择]                                │   │
│  │ [15:00-16:00]  已约满                                        │   │
│  │ [16:00-17:00]  可预约  [选择]                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  已选择: 1月20日 14:00-15:00 (60分钟)                              │
│                                                                     │
│  [取消]  [确认预约]                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 预约列表

```
┌─────────────────────────────────────────────────────────────────────┐
│  我的预约                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [全部] [待确认] [已确认] [已完成] [已取消]                         │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📅 1月20日 14:00-15:00  🕐 待确认                           │   │
│  │ ─────────────────────────────────────────────────────────  │   │
│  │ 高中数学提高班 - 张老师                                      │   │
│  │                                                             │   │
│  │ [取消预约]  [联系老师]                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ✅ 1月22日 10:00-11:00  📅 已确认                           │   │
│  │ ─────────────────────────────────────────────────────────  │   │
│  │ 钢琴一对一课程 - 李老师                                      │   │
│  │                                                             │   │
│  │ [上课提醒已设置]  [联系老师]                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 七、测试用例

### 7.1 功能测试用例

| 测试场景 | 操作步骤 | 预期结果 |
|----------|----------|----------|
| 查看时间槽 | 查看教师可用时间 | 显示可用时间 |
| 创建预约 | 选择时间并提交 | 预约创建成功 |
| 取消预约 | 在待确认状态取消 | 预约取消成功 |
| 确认预约 | 教师确认预约 | 预约状态更新 |
| 重复预约 | 预约已满的时间段 | 提示已约满 |
| 过期处理 | 预约时间已过 | 状态自动更新 |

---

## 八、实现计划

### 8.1 开发任务分解

| 任务 | 描述 | 预估工时 | 依赖 |
|------|------|----------|------|
| 数据库设计 | 创建时间槽和预约表 | 4h | - |
| 时间槽API | 实现时间槽CRUD接口 | 12h | 数据库 |
| 预约API | 实现预约管理接口 | 16h | 数据库 |
| 预约冲突检测 | 实现冲突检测逻辑 | 8h | 预约API |
| 时间槽前端 | 实现时间槽选择组件 | 12h | API设计 |
| 预约列表前端 | 实现预约列表页面 | 8h | API设计 |
| 预约提醒 | 实现预约提醒功能 | 8h | 通知系统 |
| 单元测试 | 预约功能测试 | 8h | 全部 |

### 8.2 验收标准

- [ ] 时间槽显示正确
- [ ] 预约创建成功
- [ ] 冲突检测正确
- [ ] 取消/确认流程正常
- [ ] 提醒功能正常

---

## 九、风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 预约冲突 | 低 | 高 | 事务控制，乐观锁 |
| 爽约率高 | 中 | 中 | 提前提醒，信用体系 |
| 时间槽管理复杂 | 中 | 中 | 提供批量设置 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/05-product-design/feature-booking.md`

**相关文档**:
- [功能概览](feature-overview.md)
- [支付集成](feature-payments.md)
- [用户评价系统](feature-reviews.md)
