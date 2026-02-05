---
title: Feature Overview - 功能架构总览
category: product-design
created: 2026-01-21
author: steve-jobs
version: 4.0
updated: 2026-01-26
---

# Feature Overview - 功能架构总览

> **版本**: 4.0 | **更新日期**: 2026-01-26 | **状态**: 最新版本

---

## 一、目录结构

```
05-product-design/
│
├── 📁 admin/                          # 管理模块
│   ├── admin-backend.md               # 管理员后台
│   └── analytics.md                   # 数据统计
│
├── 📁 ads/                            # 收入模块
│   └── google-ads.md                  # Google广告
│
├── 📁 course/                         # 课程模块
│   ├── course-search.md               # 课程搜索
│   ├── course-detail.md               # 课程详情
│   ├── course-management.md           # 课程管理
│   └── course-reviews.md              # 课程评价
│
├── 📁 docs/                           # 核心文档
│   ├── index.md                       # 文档索引
│   ├── rules.md                       # 文档规则
│   └── feature-overview.md            # 功能总览（本文档）
│
├── 📁 feedback/                       # 反馈模块
│   └── user-feedback.md               # 用户反馈
│
├── 📁 growth/                         # 增长模块
│   ├── donations.md                   # 捐赠系统
│   ├── notifications.md               # 消息通知
│   └── referral.md                    # 推荐奖励
│
├── 📁 i18n/                           # 国际化
│   └── multilingual.md                # 多语言支持
│
├── 📁 institution/                    # 机构模块
│   ├── institution-onboarding.md      # 机构入驻
│   └── institution-management.md      # 机构管理
│
├── 📁 pages/                          # 基础页面
│   ├── about-page.md                  # 关于页面
│   ├── contact-page.md                # 联系我们页面
│   ├── cookie-policy-page.md          # Cookie 政策页面
│   ├── feedback-page.md               # 反馈建议页面
│   ├── help-centre-page.md            # 帮助中心页面
│   └── privacy-policy-page.md         # 隐私政策页面
│
├── 📁 teacher/                        # 教师模块
│   ├── teacher-onboarding.md          # 教师入驻
│   └── teacher-replies.md             # 教师回复
│
├── 📁 transaction/                    # 交易模块
│   ├── booking.md                     # 预约系统
│   ├── payments.md                    # 支付集成
│   ├── packages.md                    # 套餐购买
│   └── refunds.md                     # 退款处理
│
├── 📁 trust/                          # 信任模块
│   ├── data-aggregation.md            # 数据聚合
│   ├── data-quality.md                # 数据质量
│   ├── desensitization.md             # 数据脱敏
│   └── trust-badges.md                # 信任标识
│
└── 📁 user/                           # 用户模块
    ├── parental-controls.md           # 家长监护
    ├── personal-teacher.md            # 个人教师
    ├── role-lifecycle.md              # 用户角色
    ├── user-center.md                 # 个人中心
    └── user-registration.md           # 用户注册
```

---

## 二、开发阶段总览

### MVP阶段 (3-4周)

| 模块 | 功能 | 优先级 | 技术文档 |
|------|------|--------|----------|
| 用户系统 | 用户注册与认证 | P0 | [tech-auth.md](../06-tech-architecture/mvp/tech-auth.md) |
| 课程搜索 | 搜索与筛选 | P0 | [tech-search.md](../06-tech-architecture/course/tech-search.md) |
| 课程详情 | 详情展示 | P0 | [tech-course-detail.md](../06-tech-architecture/course/tech-course-detail.md) |
| 信任系统 | 信任标识 | P0 | [tech-trust-badges.md](../06-tech-architecture/trust/tech-trust-badges.md) |
| 数据聚合 | 外部数据抓取 | P0 | [tech-data-aggregation.md](../06-tech-architecture/trust/tech-data-aggregation.md) |
| 数据脱敏 | 隐私保护 | P0 | [tech-desensitization.md](../06-tech-architecture/trust/tech-desensitization.md) |
| 数据质量 | 质量控制 | P0 | [tech-data-quality.md](../06-tech-architecture/trust/tech-data-quality.md) |
| 国际化 | 中英文支持 | P0 | [tech-multilingual.md](../06-tech-architecture/i18n/tech-multilingual.md) |
| 反馈系统 | 用户反馈 | P0 | [tech-feedback.md](../06-tech-architecture/feedback/tech-feedback.md) |
| 广告系统 | Google Ads | P1 | [google-ads.md](../06-tech-architecture/ads/anti-crawler-design.md) |

### Phase 2 (2-3个月)

| 模块 | 功能 | 优先级 | 技术文档 |
|------|------|--------|----------|
| 用户中心 | 个人中心 | P0 | [tech-user-center.md](../06-tech-architecture/user/tech-user-center.md) |
| 机构入驻 | 机构认证 | P0 | [tech-institution-onboarding.md](../06-tech-architecture/institution/tech-institution.md) |
| 机构管理 | 机构后台 | P0 | [tech-institution-management.md](../06-tech-architecture/institution/tech-institution-management.md) |
| 套餐系统 | 套餐购买 | P0 | [tech-packages.md](../06-tech-architecture/transaction/tech-packages.md) |
| 退款处理 | 退款流程 | P1 | [tech-refunds.md](../06-tech-architecture/transaction/tech-refunds.md) |
| 推荐系统 | 推荐奖励 | P1 | [tech-referral.md](../06-tech-architecture/growth/tech-referral.md) |
| 通知系统 | 邮件通知 | P0 | [tech-notifications.md](../06-tech-architecture/growth/tech-notifications.md) |
| 捐赠系统 | 用户捐赠 | P1 | [tech-donations.md](../06-tech-architecture/growth/tech-donations.md) |
| 管理后台 | 管理员后台 | P0 | [tech-admin-backend.md](../06-tech-architecture/admin/tech-admin-backend.md) |

### Phase 3 (3-6个月)

| 模块 | 功能 | 优先级 | 技术文档 |
|------|------|--------|----------|
| 预约系统 | 在线预约 | P0 | [tech-booking.md](../06-tech-architecture/transaction/tech-booking.md) |
| 支付集成 | 支付闭环 | P0 | [tech-payments.md](../06-tech-architecture/transaction/tech-payments.md) |
| 课程评价 | 用户评价 | P0 | [tech-course-reviews.md](../06-tech-architecture/course/tech-course-reviews.md) |
| 教师入驻 | 教师认证 | P0 | [tech-teacher-onboarding.md](../06-tech-architecture/teacher/tech-teacher-onboarding.md) |
| 教师回复 | 回复功能 | P1 | [tech-teacher-replies.md](../06-tech-architecture/teacher/tech-teacher-replies.md) |
| 家长监护 | 监护面板 | P0 | [tech-parental-controls.md](../06-tech-architecture/user/tech-parental-controls.md) |
| 数据分析 | 统计分析 | P0 | [tech-analytics.md](../06-tech-architecture/admin/tech-analytics.md) |

---

## 三、模块与文档映射

### user/ - 用户模块

| 功能 | 产品文档 | 技术文档 | 阶段 |
|------|----------|----------|------|
| 用户角色生命周期 | [user/role-lifecycle.md](user/role-lifecycle.md) | - | - |
| 用户注册与认证 | [user/user-registration.md](user/user-registration.md) | [tech-auth.md](../06-tech-architecture/mvp/tech-auth.md) | mvp |
| 个人中心 | [user/user-center.md](user/user-center.md) | [tech-user-center.md](../06-tech-architecture/user/tech-user-center.md) | phase-2 |
| 个人教师 | [user/personal-teacher.md](user/personal-teacher.md) | [tech-personal-teacher.md](../06-tech-architecture/teacher/tech-personal-teacher.md) | mvp |
| 家长监护 | [user/parental-controls.md](user/parental-controls.md) | [tech-parental-controls.md](../06-tech-architecture/user/tech-parental-controls.md) | phase-3 |

### course/ - 课程模块

| 功能 | 产品文档 | 技术文档 | 阶段 |
|------|----------|----------|------|
| 课程搜索 | [course/course-search.md](course/course-search.md) | [tech-search.md](../06-tech-architecture/course/tech-search.md) | mvp |
| 课程详情 | [course/course-detail.md](course/course-detail.md) | [tech-course-detail.md](../06-tech-architecture/course/tech-course-detail.md) | mvp |
| 课程管理 | [course/course-management.md](course/course-management.md) | - | phase-2 |
| 课程评价 | [course/course-reviews.md](course/course-reviews.md) | [tech-course-reviews.md](../06-tech-architecture/course/tech-course-reviews.md) | phase-3 |

### transaction/ - 交易模块

| 功能 | 产品文档 | 技术文档 | 阶段 |
|------|----------|----------|------|
| 预约系统 | [transaction/booking.md](transaction/booking.md) | [tech-booking.md](../06-tech-architecture/transaction/tech-booking.md) | phase-3 |
| 支付集成 | [transaction/payments.md](transaction/payments.md) | [tech-payments.md](../06-tech-architecture/transaction/tech-payments.md) | phase-3 |
| 套餐购买 | [transaction/packages.md](transaction/packages.md) | [tech-packages.md](../06-tech-architecture/transaction/tech-packages.md) | phase-2 |
| 退款处理 | [transaction/refunds.md](transaction/refunds.md) | [tech-refunds.md](../06-tech-architecture/transaction/tech-refunds.md) | phase-2 |

### trust/ - 信任模块

| 功能 | 产品文档 | 技术文档 | 阶段 |
|------|----------|----------|------|
| 信任标识 | [trust/trust-badges.md](trust/trust-badges.md) | [tech-trust-badges.md](../06-tech-architecture/trust/tech-trust-badges.md) | mvp |
| 数据质量 | [trust/data-quality.md](trust/data-quality.md) | [tech-data-quality.md](../06-tech-architecture/trust/tech-data-quality.md) | mvp |
| 数据聚合 | [trust/data-aggregation.md](trust/data-aggregation.md) | [tech-data-aggregation.md](../06-tech-architecture/trust/tech-data-aggregation.md) | mvp |
| 数据脱敏 | [trust/desensitization.md](trust/desensitization.md) | [tech-desensitization.md](../06-tech-architecture/trust/tech-desensitization.md) | mvp |

### institution/ - 机构模块

| 功能 | 产品文档 | 技术文档 | 阶段 |
|------|----------|----------|------|
| 机构入驻 | [institution/institution-onboarding.md](institution/institution-onboarding.md) | [tech-institution-onboarding.md](../06-tech-architecture/institution/tech-institution.md) | phase-2 |
| 机构管理 | [institution/institution-management.md](institution/institution-management.md) | [tech-institution-management.md](../06-tech-architecture/institution/tech-institution-management.md) | phase-2 |

### teacher/ - 教师模块

| 功能 | 产品文档 | 技术文档 | 阶段 |
|------|----------|----------|------|
| 教师入驻 | [teacher/teacher-onboarding.md](teacher/teacher-onboarding.md) | [tech-teacher-onboarding.md](../06-tech-architecture/teacher/tech-teacher-onboarding.md) | phase-3 |
| 教师回复 | [teacher/teacher-replies.md](teacher/teacher-replies.md) | [tech-teacher-replies.md](../06-tech-architecture/teacher/tech-teacher-replies.md) | phase-3 |

### growth/ - 增长模块

| 功能 | 产品文档 | 技术文档 | 阶段 |
|------|----------|----------|------|
| 推荐奖励 | [growth/referral.md](growth/referral.md) | [tech-referral.md](../06-tech-architecture/growth/tech-referral.md) | phase-2 |
| 消息通知 | [growth/notifications.md](growth/notifications.md) | [tech-notifications.md](../06-tech-architecture/growth/tech-notifications.md) | phase-2 |
| 捐赠系统 | [growth/donations.md](growth/donations.md) | [tech-donations.md](../06-tech-architecture/growth/tech-donations.md) | phase-2 |

### admin/ - 管理模块

| 功能 | 产品文档 | 技术文档 | 阶段 |
|------|----------|----------|------|
| 管理员后台 | [admin/admin-backend.md](admin/admin-backend.md) | [tech-admin-backend.md](../06-tech-architecture/admin/tech-admin-backend.md) | phase-2 |
| 数据统计 | [admin/analytics.md](admin/analytics.md) | [tech-analytics.md](../06-tech-architecture/admin/tech-analytics.md) | phase-3 |

### ads/ - 收入模块

| 功能 | 产品文档 | 技术文档 | 阶段 |
|------|----------|----------|------|
| Google广告 | [ads/google-ads.md](ads/google-ads.md) | [google-ads.md](../06-tech-architecture/ads/anti-crawler-design.md) | mvp |

### feedback/ - 反馈模块

| 功能 | 产品文档 | 技术文档 | 阶段 |
|------|----------|----------|------|
| 用户反馈 | [feedback/user-feedback.md](feedback/user-feedback.md) | [tech-feedback.md](../06-tech-architecture/feedback/tech-feedback.md) | mvp |

### i18n/ - 国际化

| 功能 | 产品文档 | 技术文档 | 阶段 |
|------|----------|----------|------|
| 多语言支持 | [i18n/multilingual.md](i18n/multilingual.md) | [tech-multilingual.md](../06-tech-architecture/i18n/tech-multilingual.md) | mvp |

---

## 四、商业模式

### 收入策略

| 阶段 | 收入来源 | 月度目标 | 说明 |
|------|----------|----------|------|
| **MVP** | Google Ads | $150-600 | 纯广告收入，验证流量价值 |
| **Phase 2** | Ads + 机构入驻 | $2,000-5,000 | 引入机构付费用户 |
| **Phase 3** | Ads + 机构 + 佣金 | $5,000-15,000 | 完整双边市场 |

### 用户侧 - 完全免费

- ✅ 免费搜索
- ✅ 免费浏览
- ✅ 免费收藏
- ✅ 免费预约
- ✅ 免费评价

---

## 五、当前开发任务

### MVP阶段 - 进行中

| 优先级 | 功能 | 所属模块 | 状态 |
|--------|------|----------|------|
| **P0** | 课程搜索与筛选 | 课程模块 | 待开发 |
| **P0** | 课程详情页 | 课程模块 | 待开发 |
| **P0** | 多语言支持 | i18n | 待开发 |
| **P0** | 信任标识系统 | 信任模块 | 待开发 |
| **P0** | 用户注册与认证 | 用户模块 | 待开发 |
| **P0** | 外部数据抓取 | 信任模块 | 待开发 |
| **P0** | 数据脱敏处理 | 信任模块 | 待开发 |
| **P0** | 数据质量控制 | 信任模块 | 待开发 |
| **P0** | 用户反馈系统 | 反馈模块 | 待开发 |
| **P1** | Google Ads集成 | 收入模块 | 待开发 |

---

## 六、文档版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0 | 2026-01-21 | 初始版本 |
| 2.0 | 2026-01-21 | 新增机构入驻、广告收入 |
| 3.0 | 2026-01-21 | **重构**: 移除MVP收费，按排期整理文档 |
| 3.1 | 2026-01-26 | **新增**: 用户角色生命周期、游客模式、注销限制 |
| 4.0 | 2026-01-26 | **重构**: 添加技术文档映射，成为指引文件 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/05-product-design/feature-overview.md`

**相关文档**:
- [技术架构总览](../06-tech-architecture/tech-overview.md)
- [文档索引](docs/index.md)
- [文档管理规则](docs/rules.md)
- [用户角色生命周期](user/role-lifecycle.md)
