---
title: Feedback Page - 反馈建议页面
category: product-design
created: 2026-02-01
author: claude
version: 1.0
phase: 1
priority: P0
status: completed
---

# Feature: Feedback Page - 反馈建议页面

> **功能模块**: 反馈模块 | **优先级**: P0 | **排期**: Phase 1 | **状态**: 已完成

---

## 一、功能概述

### 1.1 功能描述

反馈建议页面允许用户举报过时或错误的课程信息，帮助平台维护数据质量。

### 1.2 用户故事

```
作为 用户
我希望 举报课程信息中的错误
以便 帮助平台提供更准确的信息

作为 用户
我希望 选择问题类型并填写详情
以便 平台能够快速理解问题并处理
```

### 1.3 页面结构

```
┌─────────────────────────────────────────────────────────────────────┐
│  面包屑: 首页 > 举报问题                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  举报问题                                                   │   │
│  │                                                             │   │
│  │  通过举报过时或错误的课程信息，                             │   │
│  │  帮助我们维护一个高质量的平台。                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  提交举报                                                   │   │
│  │  ────────────────────────────────────────────────────────  │   │
│  │  请填写以下表格举报课程列表中的问题。                       │   │
│  │                                                             │   │
│  │  [姓名 (可选)]                                              │   │
│  │  [电子邮箱 *]                                               │   │
│  │  [问题类型 *]                                               │   │
│  │  [详细内容 *]                                               │   │
│  │  [提交举报]                                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、国际化支持

### 2.1 中文文案

| 场景 | 中文文案 |
|------|----------|
| 页面标题 | 举报问题 |
| 面包屑 | 首页 > 举报问题 |
| 描述 | 通过举报过时或错误的课程信息，帮助我们维护一个高质量的平台。 |
| 表单标题 | 提交举报 |
| 表单描述 | 请填写以下表格举报课程列表中的问题。 |
| 姓名 | 姓名 |
| 姓名占位符 | 您的姓名（可选） |
| 电子邮箱 | 电子邮箱 |
| 邮箱占位符 | your@email.com |
| 问题类型 | 问题类型 |
| 占位符 | 选择问题类型 |
| 信息已过期 | 信息已过期 |
| 信息错误 | 信息错误 |
| 可疑信息 | 可疑/虚假信息 |
| 联系方式无效 | 联系方式无效 |
| 不当内容 | 不当内容 |
| 其他 | 其他 |
| 详细内容 | 详细内容 |
| 内容占位符 | 请详细描述问题... |
| 提交 | 提交举报 |
| 必填提示 | 此项为必填 |
| 邮箱格式提示 | 请输入有效的电子邮箱地址 |
| 成功消息 | 感谢您的举报！我们会在7个工作日内处理。 |
| 错误消息 | 提交失败，请稍后重试。 |

### 2.2 英文文案

| 场景 | 英文文案 |
|------|----------|
| 页面标题 | Report Issue |
| 面包屑 | Home > Report Issue |
| 描述 | Help us maintain a quality platform by reporting outdated or incorrect course information. |
| 表单标题 | Submit Report |
| 表单描述 | Fill out the form below to report an issue with a course listing. |
| 姓名 | Name |
| 姓名占位符 | Your name (optional) |
| 电子邮箱 | Email |
| 邮箱占位符 | your@email.com |
| 问题类型 | Issue Type |
| 占位符 | Select an issue type |
| 信息已过期 | Information Expired |
| 信息错误 | Incorrect Information |
| 可疑信息 | Suspicious/Fake Information |
| 联系方式无效 | Invalid Contact |
| 不当内容 | Inappropriate Content |
| 其他 | Other |
| 详细内容 | Details |
| 内容占位符 | Please describe the issue in detail... |
| 提交 | Submit Report |
| 必填提示 | This field is required |
| 邮箱格式提示 | Please enter a valid email address |
| 成功消息 | Thank you for your report! We'll review it within 7 working days. |
| 错误消息 | Failed to submit report. Please try again later. |

---

## 三、表单验证

### 3.1 验证规则

| 字段 | 必填 | 格式验证 | 说明 |
|------|------|----------|------|
| 姓名 | 否 | - | 可选字段 |
| 邮箱 | 是 | 邮箱格式 | 必填，格式验证 |
| 问题类型 | 是 | - | 必填 |
| 详细内容 | 是 | 最小长度 | 必填，至少10字符 |

---

## 四、组件与实现

### 4.1 页面组件

| 组件 | 状态 | 说明 |
|------|------|------|
| FeedbackPage | ✅ 已完成 | 主页面组件 |
| ContactForm | ✅ 已完成 | 联系表单组件（复用） |

### 4.2 测试状态

| 测试类型 | 状态 | 说明 |
|----------|------|------|
| 单元测试 | ✅ 已完成 | - |
| Storybook | ✅ 已完成 | FeedbackPage.stories.tsx |
| 测试通过数 | 1 | interaction test |

---

## 五、文件位置

```
src/pages/FeedbackPage/
├── index.tsx              # 主组件
├── FeedbackPage.module.scss  # 样式
└── index.ts               # 导出

src/components/contact/ContactForm/  # 复用 ContactForm
├── index.tsx
├── ContactForm.module.scss
└── index.ts

stories/Pages/
└── FeedbackPage.stories.tsx  # Storybook

src/locales/
├── en/feedback.json       # 英文翻译
└── zh/feedback.json       # 中文翻译
```

---

## 六、验收标准

- [x] 页面正确渲染
- [x] 中英文切换正常
- [x] 面包屑导航正确
- [x] 表单验证正确
- [x] 反馈提交成功提示
- [x] Storybook 正常展示
- [x] 测试通过

---

## 七、后续优化

| 功能 | 状态 | 说明 |
|------|------|------|
| 反馈历史 | ❌ 未开发 | 用户查看历史反馈记录 |
| 反馈状态跟踪 | ❌ 未开发 | 跟踪举报处理状态 |
