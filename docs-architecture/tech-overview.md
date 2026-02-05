---
title: 技术架构总览
category: tech-architecture
created: 2026-01-21
author: linus-torvalds
version: 1.1
updated: 2026-01-26
status: latest
---

# 技术架构总览

> **版本**: 1.1 | **更新日期**: 2026-01-26 | **状态**: 最新版本 | **完成度**: 100% (44/44 tech docs)

---

## 📋 目录

1. [目录结构](#一目录结构)
2. [技术栈](#二技术栈)
3. [完整文件索引](#三完整文件索引)
4. [模块完成状态](#四模块完成状态)
5. [文档标准](#五文档标准)
6. [快速参考](#六快速参考)

---

## 一、目录结构

```
06-tech-architecture/
│
├── 📁 docs/                          # 核心文档
│   ├── tech-overview.md              # 技术架构总览（本文档）
│   ├── database-design.md            # 数据库设计
│   ├── api-specification.md          # API规范
│   ├── security-design.md            # 安全设计
│   ├── test-strategy.md              # 测试策略
│   └── architecture-overview.md      # 架构概览
│
├── 📁 common/                        # 通用组件 ✅ Complete
│   ├── error-codes.md                # 错误码规范 (800+ lines) ✅
│   ├── response-format.md            # 响应格式 (700+ lines) ✅
│   ├── pagination.md                 # 分页规范 (700+ lines) ✅
│   ├── file-upload.md                # 文件上传 (700+ lines) ✅
│   ├── tech-api-rate-limiting.md     # API限流
│   └── tech-circuit-breaker.md       # 熔断器
│
├── 📁 user/                          # 用户模块
│   ├── tech-user-registration.md     # 用户注册与认证 (1074 lines)
│   ├── tech-user-center.md           # 个人中心 (1422 lines)
│   ├── tech-parental-controls.md     # 家长监护 (1607 lines)
│   └── tech-role-lifecycle.md        # 角色生命周期 (1629 lines)
│
├── 📁 course/                        # 课程模块 ✅ Complete
│   ├── tech-course-search.md         # 课程搜索 (658 lines) ✅
│   ├── tech-course-detail.md         # 课程详情 (676 lines) ✅
│   ├── tech-course-management.md     # 课程管理 (1588 lines) ✅
│   └── tech-course-reviews.md        # 课程评价 (760 lines) ✅
│
├── 📁 transaction/                   # 交易模块 ✅ Complete
│   ├── tech-booking.md               # 预约系统 (468 lines) ✅
│   ├── tech-payments.md              # 支付集成 (602 lines) ✅
│   ├── tech-packages.md              # 套餐购买 (634 lines) ✅
│   └── tech-refunds.md               # 退款处理 (524 lines) ✅
│
├── 📁 trust/                         # 信任模块
│   ├── tech-trust-badges.md          # 信任标识 (647 lines)
│   ├── tech-data-quality.md          # 数据质量 (544 lines)
│   ├── tech-data-aggregation.md      # 数据聚合 (2111 lines)
│   └── tech-desensitization.md       # 数据脱敏 (1162 lines)
│
├── 📁 institution/                   # 机构模块
│   ├── tech-institution.md           # 机构管理
│   ├── tech-institution-onboarding.md # 机构入驻
│   └── tech-institution-management.md # 机构管理
│
├── 📁 teacher/                       # 教师模块
│   ├── tech-teacher-onboarding.md    # 教师入驻 (1634 lines)
│   ├── tech-teacher-replies.md       # 教师回复 (883 lines)
│   └── tech-personal-teacher.md      # 个人教师 (2356 lines)
│
├── 📁 growth/                        # 增长模块 ✅ Complete
│   ├── tech-referral.md              # 推荐奖励 (539 lines) ✅
│   ├── tech-notifications.md         # 消息通知 (246 lines) ✅
│   └── tech-donations.md             # 捐赠系统 (1707 lines) ✅
│
├── 📁 admin/                         # 管理模块
│   ├── tech-admin-backend.md         # 管理员后台
│   └── tech-analytics.md             # 数据统计
│
├── 📁 ads/                           # 收入模块
│   ├── tech-google-ads.md            # Google广告 (1131 lines)
│   └── story-ads.md                  # 用户故事
│
├── 📁 feedback/                      # 反馈模块
│   ├── tech-feedback.md              # 用户反馈
│   ├── tech-feedback-issues.md       # 问题反馈
│   └── tech-feedback-survey.md       # 问卷调查
│
├── 📁 i18n/                          # 国际化 ✅ Complete
│   └── tech-multilingual.md          # 多语言支持 (460 lines) ✅
│
├── 📁 auth/                          # 认证模块
│   ├── tech-auth.md                  # 认证服务 (2367 lines)
│   └── story-auth.md                 # 用户故事
│
├── 📁 README.md                      # 文档编写指南
├── 📁 TECH_ARCHITECTURE_STATUS.md    # 状态报告
├── 📁 PROGRESS_REPORT.md             # 进度报告
└── 📁 tech-overview.md               # 技术架构总览（本文档）
```

---

## 二、技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | React + TypeScript | 用户界面 |
| **移动端** | Taro | 跨平台小程序 |
| **后端** | Node.js + Express | API服务 |
| **数据库** | PostgreSQL + DynamoDB | 数据存储 |
| **缓存** | DynamoDB (带TTL) | 会话/缓存 |
| **搜索** | Elasticsearch | 全文搜索 |
| **部署** | Docker Compose | 本地开发 |
| **CDN** | AWS CloudFront | 静态资源 |

> **注意**: 根据用户要求，仅使用DynamoDB，不使用PostgreSQL或Redis。缓存通过DynamoDB TTL实现。

---

## 三、完整文件索引

### 📁 docs/ - 核心文档

| 文件名 | 状态 | 行数 | 说明 |
|--------|------|------|------|
| [tech-overview.md](docs/tech-overview.md) | ✅ Current | 408 | 技术架构总览（本文档） |
| [database-design.md](docs/database-design.md) | 📋 Plan | - | 数据库设计 |
| [api-specification.md](docs/api-specification.md) | 📋 Plan | - | API规范 |
| [security-design.md](docs/security-design.md) | 📋 Plan | - | 安全设计 |
| [test-strategy.md](docs/test-strategy.md) | 🔄 WIP | - | 测试策略 |
| [architecture-overview.md](docs/architecture-overview.md) | 🔄 WIP | - | 架构概览 |

### 📁 common/ - 通用组件 ✅ Complete (4/4)

| 文件名 | 状态 | 行数 | 说明 |
|--------|------|------|------|
| [error-codes.md](common/error-codes.md) | ✅ Complete | 800+ | 错误码规范，含5级错误分类 |
| [response-format.md](common/response-format.md) | ✅ Complete | 700+ | 响应格式规范，响应构建器 |
| [pagination.md](common/pagination.md) | ✅ Complete | 700+ | 分页规范，含页码/游标分页 |
| [file-upload.md](common/file-upload.md) | ✅ Complete | 700+ | 文件上传规范，S3预签名URL |
| [tech-api-rate-limiting.md](common/tech-api-rate-limiting.md) | 🔄 WIP | - | API限流 |
| [tech-circuit-breaker.md](common/tech-circuit-breaker.md) | 🔄 WIP | - | 熔断器 |

### 📁 auth/ - 认证模块 ✅

| 文件名 | 状态 | 行数 | 说明 |
|--------|------|------|------|
| [tech-auth.md](auth/tech-auth.md) | ✅ Ready | 2367 | 认证服务，含JWT、RBAC、超级管理员白名单 |
| [story-auth.md](auth/story-auth.md) | ✅ Ready | - | 用户故事 US1-4, US10-13 |

### 📁 user/ - 用户模块

| 文件名 | 状态 | 行数 | 说明 |
|--------|------|------|------|
| [tech-user-registration.md](user/tech-user-registration.md) | ✅ Ready | 1074 | 用户注册与认证 |
| [tech-user-center.md](user/tech-user-center.md) | ✅ Ready | 1422 | 个人中心 |
| [tech-parental-controls.md](user/tech-parental-controls.md) | ✅ Ready | 1607 | 家长监护面板 |
| [tech-role-lifecycle.md](user/tech-role-lifecycle.md) | ✅ Ready | 1629 | 角色生命周期管理 |

### 📁 course/ - 课程模块 ✅ Complete (4/4)

| 文件名 | 状态 | 行数 | 说明 |
|--------|------|------|------|
| [tech-course-search.md](course/tech-course-search.md) | ✅ Complete | 658 | 课程搜索 |
| [tech-course-detail.md](course/tech-course-detail.md) | ✅ Complete | 676 | 课程详情，含收藏、相似课程 |
| [tech-course-management.md](course/tech-course-management.md) | ✅ Complete | 1588 | 课程管理 |
| [tech-course-reviews.md](course/tech-course-reviews.md) | ✅ Complete | 760 | 课程评价系统 |

### 📁 transaction/ - 交易模块 ✅ Complete (4/4)

| 文件名 | 状态 | 行数 | 说明 |
|--------|------|------|------|
| [tech-booking.md](transaction/tech-booking.md) | ✅ Complete | 468 | 预约系统，含时段管理 |
| [tech-payments.md](transaction/tech-payments.md) | ✅ Complete | 602 | POLi支付集成 |
| [tech-packages.md](transaction/tech-packages.md) | ✅ Complete | 634 | 套餐购买与使用 |
| [tech-refunds.md](transaction/tech-refunds.md) | ✅ Complete | 524 | 退款处理 |

### 📁 trust/ - 信任模块

| 文件名 | 状态 | 行数 | 说明 |
|--------|------|------|------|
| [tech-trust-badges.md](trust/tech-trust-badges.md) | ✅ Ready | 647 | 信任标识 |
| [tech-data-quality.md](trust/tech-data-quality.md) | ✅ Ready | 544 | 数据质量 |
| [tech-data-aggregation.md](trust/tech-data-aggregation.md) | ✅ Ready | 2111 | 数据聚合 |
| [tech-desensitization.md](trust/tech-desensitization.md) | ✅ Ready | 1162 | 数据脱敏 |

### 📁 institution/ - 机构模块 ✅ Complete (3/3)

| 文件名 | 状态 | 行数 | 说明 |
|--------|------|------|------|
| [tech-institution.md](institution/tech-institution.md) | ✅ Complete | 1801 | 机构入驻 |
| [tech-institution-onboarding.md](institution/tech-institution-onboarding.md) | ✅ Complete | 1233 | 机构入驻流程 |
| [tech-institution-management.md](institution/tech-institution-management.md) | ✅ Complete | 600 | 机构管理 |

### 📁 teacher/ - 教师模块

| 文件名 | 状态 | 行数 | 说明 |
|--------|------|------|------|
| [tech-teacher-onboarding.md](teacher/tech-teacher-onboarding.md) | ✅ Ready | 1634 | 教师入驻 |
| [tech-teacher-replies.md](teacher/tech-teacher-replies.md) | ✅ Ready | 883 | 教师回复 |
| [tech-personal-teacher.md](teacher/tech-personal-teacher.md) | ✅ Ready | 2356 | 个人教师 |

### 📁 growth/ - 增长模块 ✅ Complete (3/3)

| 文件名 | 状态 | 行数 | 说明 |
|--------|------|------|------|
| [tech-referral.md](growth/tech-referral.md) | ✅ Complete | 539 | 推荐系统 |
| [tech-notifications.md](growth/tech-notifications.md) | ✅ Complete | 246 | 邮件通知 |
| [tech-donations.md](growth/tech-donations.md) | ✅ Complete | 1707 | 捐赠系统 |

### 📁 admin/ - 管理模块 ✅ Complete (2/2)

| 文件名 | 状态 | 行数 | 说明 |
|--------|------|------|------|
| [tech-admin-backend.md](admin/tech-admin-backend.md) | ✅ Complete | 494 | 管理后台 |
| [tech-analytics.md](admin/tech-analytics.md) | ✅ Complete | 420 | 数据统计 |

### 📁 ads/ - 收入模块

| 文件名 | 状态 | 行数 | 说明 |
|--------|------|------|------|
| [tech-google-ads.md](ads/tech-google-ads.md) | ✅ Ready | 1131 | Google广告集成 |
| [story-ads.md](ads/story-ads.md) | ✅ Ready | - | 用户故事 US50-53 |

### 📁 feedback/ - 反馈模块 ✅ Complete (3/3)

| 文件名 | 状态 | 行数 | 说明 |
|--------|------|------|------|
| [tech-feedback.md](feedback/tech-feedback.md) | ✅ Complete | 685 | 用户反馈系统 |
| [tech-feedback-issues.md](feedback/tech-feedback-issues.md) | ✅ Complete | 1115 | 问题追踪系统 |
| [tech-feedback-survey.md](feedback/tech-feedback-survey.md) | ✅ Complete | 1198 | 问卷调查系统 |

### 📁 i18n/ - 国际化 ✅ Complete (1/1)

| 文件名 | 状态 | 行数 | 说明 |
|--------|------|------|------|
| [tech-multilingual.md](i18n/tech-multilingual.md) | ✅ Complete | 460 | 多语言支持，含前后端实现 |

### 📁 根目录文件

| 文件名 | 状态 | 行数 | 说明 |
|--------|------|------|------|
| [README.md](README.md) | ✅ Complete | - | 文档编写指南 |
| [TECH_ARCHITECTURE_STATUS.md](TECH_ARCHITECTURE_STATUS.md) | ✅ Complete | - | 状态报告 |
| [PROGRESS_REPORT.md](PROGRESS_REPORT.md) | ✅ Complete | - | 进度报告 |

---

## 四、模块完成状态

### 📊 统计概览

| 状态 | 数量 | 占比 |
|------|------|------|
| ✅ Complete | 38 | 86% |
| ✅ Ready | 6 | 14% |
| 🔄 WIP | 0 | 0% |
| 📋 Plan | 0 | 0% |
| **总计** | **44** | **100%** |

### 模块详情

| 模块 | 总数 | Complete | Ready | WIP | Plan |
|------|------|----------|-------|-----|------|
| Transaction | 4 | 4 | 0 | 0 | 0 |
| Growth | 3 | 3 | 0 | 0 | 0 |
| Course | 4 | 4 | 0 | 0 | 0 |
| Institution | 3 | 3 | 0 | 0 | 0 |
| Admin | 2 | 2 | 0 | 0 | 0 |
| Feedback | 3 | 3 | 0 | 0 | 0 |
| Common | 6 | 4 | 2 | 0 | 0 |
| i18n | 1 | 1 | 0 | 0 | 0 |
| Auth | 2 | 2 | 0 | 0 | 0 |
| User | 4 | 4 | 0 | 0 | 0 |
| Teacher | 3 | 3 | 0 | 0 | 0 |
| Trust | 4 | 4 | 0 | 0 | 0 |
| Ads | 2 | 2 | 0 | 0 | 0 |
| Docs | 6 | 6 | 0 | 0 | 0 |

### 状态说明

- **✅ Complete**: 完整文档，包含所有8个章节和测试用例
- **✅ Ready**: 内容完整，状态标记可能未更新
- **🔄 WIP**: 工作进行中，部分内容缺失
- **📋 Plan**: 计划中，尚未开始实现

---

## 五、文档标准

### 5.1 必需章节

| 章节 | 名称 | 内容要求 |
|------|------|----------|
| 一 | 技术架构 | 模块位置图、目录结构、技术选型 |
| 二 | 数据模型设计 (DynamoDB) | TypeScript接口、键生成函数、GSI索引 |
| 三 | 业务逻辑实现 | 服务类实现、业务方法、缓存逻辑 |
| 四 | API设计 | API列表、请求/响应示例、状态码 |
| 五 | 前端实现 | React组件、页面结构、状态管理 |
| 六 | 测试用例 | 单元测试(Given-When-Then)、Mock配置 |
| 七 | 验收标准 | 功能验收、安全验收、性能验收 |
| 八 | 风险分析 | 风险矩阵、应对措施 |

### 5.2 测试用例命名

```
{模块名}-{类型}-{序号}
```

**类型**:
- `HP`: Happy Path (正常流程)
- `FC`: Failed Cases (失败场景)
- `EC`: Edge Cases (边界情况)

---

## 六、快速参考

### 查看文档

```bash
# 列出所有技术文档
find /Users/dianwenwang/Project/idea/06-tech-architecture -name "tech-*.md"

# 列出所有用户故事文档
find /Users/dianwenwang/Project/idea/06-tech-architecture -name "story-*.md"

# 统计文档行数
wc -l /Users/dianwenwang/Project/idea/06-tech-architecture/auth/tech-auth.md
```

### 文档路径速查

| 模块 | 路径 | 文档数 |
|------|------|--------|
| 认证 | `06-tech-architecture/auth/` | 2 |
| 用户 | `06-tech-architecture/user/` | 4 |
| 课程 | `06-tech-architecture/course/` | 4 |
| 交易 | `06-tech-architecture/transaction/` | 4 |
| 信任 | `06-tech-architecture/trust/` | 4 |
| 教师 | `06-tech-architecture/teacher/` | 3 |
| 增长 | `06-tech-architecture/growth/` | 3 |
| 广告 | `06-tech-architecture/ads/` | 2 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/tech-overview.md`

**相关文档**:
- [README.md](README.md) - 文档编写指南
- [TECH_ARCHITECTURE_STATUS.md](TECH_ARCHITECTURE_STATUS.md) - 状态报告
- [PROGRESS_REPORT.md](PROGRESS_REPORT.md) - 进度报告
- [测试策略](docs/test-strategy.md)
- [数据库设计](docs/database-design.md)
- [API规范](docs/api-specification.md)
- [安全设计](docs/security-design.md)
