---
title: Multilingual Support
category: product-design
created: 2026-01-21
author: steve-jobs
version: 1.0
phase: 1
priority: P0
status: pending-development
---

# Feature: Multilingual Support - 多语言支持

> **功能模块**: 搜索与发现 | **优先级**: P0 | **排期**: Phase 1 | **状态**: 待开发

---

## 一、功能概述

### 1.1 功能描述

多语言支持功能为平台提供中文和英文两种语言界面，支持用户切换语言，并按需翻译用户生成的内容（课程描述、评价等）。

### 1.2 核心价值

- **用户覆盖**: 覆盖新西兰华人（中文）和主流用户（英文）
- **零成本UI翻译**: 固定界面文案使用JSON语言包，无翻译API成本
- **可控内容翻译**: 用户生成内容按需翻译，控制成本在$10-25/月
- **本地化体验**: 提供符合目标用户习惯的界面语言

### 1.3 用户故事

```
作为 新西兰华人家长
我希望 使用中文界面浏览平台
以便 轻松理解课程信息

作为 成人学习者
我希望 查看课程的英文描述
以便 了解课程的英文术语
```

---

## 二、功能详细设计

### 2.1 语言支持范围

#### 2.1.1 支持语言

| 语言 | 代码 | 说明 | 用户群体 |
|------|------|------|----------|
| 简体中文 | zh-CN | 简体中文字符，简体中文习惯用语 | 大陆华人移民 |
| 繁体中文 | zh-TW | 繁体中文字符，港台习惯用语 | 港台移民 |
| 英文 | en-US | 美式英文，新西兰主流语言 | 本地人/英语用户 |

#### 2.1.2 翻译范围

| 内容类型 | 翻译方式 | 成本 | 说明 |
|----------|----------|------|------|
| 界面文案 | 固定JSON语言包 | $0 | 预翻译，无API调用 |
| 系统消息 | 固定JSON语言包 | $0 | 预翻译，无API调用 |
| 课程标题 | 按需翻译 | 低 | 仅当用户请求时翻译 |
| 课程描述 | 按需翻译 | 中 | 主要翻译成本来源 |
| 用户评价 | 按需翻译 | 低 | 仅当用户请求时翻译 |

### 2.2 语言切换机制

```
┌─────────────────────────────────────────────────────────────────────┐
│  语言切换入口                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  方案A: 顶部固定入口                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  [🇨🇳 中文 ▼]  [🔍 搜索...]                        [登录]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  方案B: 设置菜单                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  [设置] ▼                                                  │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │ 🌐 语言: [中文 ▼]                                 │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 翻译服务架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        翻译服务架构                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│  │  前端       │    │  翻译服务   │    │  翻译API   │            │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘            │
│         │                  │                  │                     │
│         ▼                  ▼                  ▼                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│  │ 语言包      │    │ 翻译缓存    │    │ Google/     │            │
│  │ (JSON)      │    │ (Redis)     │    │ DeepL API  │            │
│  └─────────────┘    └─────────────┘    └─────────────┘            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  翻译策略                                                     │   │
│  │  ├─ 界面文案 → 语言包直接读取（零成本）                      │   │
│  │  ├─ 标题/描述 → 首次请求调用API → 存入缓存                  │   │
│  │  └─ 缓存命中 → 直接返回缓存（零成本）                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 三、语言包设计

### 3.1 语言包结构

```
src/
├── locales/
│   ├── zh-CN.json    # 简体中文
│   ├── zh-TW.json    # 繁体中文
│   └── en-US.json    # 英文
```

### 3.2 简体中文语言包 (zh-CN.json)

```json
{
  "common": {
    "appName": "EduSearch NZ",
    "appNameFull": "新西兰课程搜索平台",
    "loading": "加载中...",
    "noResults": "未找到结果",
    "error": "出错了，请重试",
    "retry": "重试",
    "save": "保存",
    "cancel": "取消",
    "confirm": "确认",
    "delete": "删除",
    "edit": "编辑",
    "close": "关闭",
    "search": "搜索",
    "filter": "筛选",
    "sort": "排序",
    "more": "更多",
    "less": "收起"
  },
  "nav": {
    "home": "首页",
    "courses": "课程",
    "tutors": "教师",
    "categories": "分类",
    "about": "关于我们",
    "contact": "联系我们",
    "login": "登录",
    "register": "注册",
    "logout": "退出"
  },
  "search": {
    "placeholder": "搜索课程、教师、机构",
    "searchButton": "搜索",
    "noResults": "未找到相关课程",
    "resultsCount": "找到 {count} 个课程",
    "popularSearches": "热门搜索"
  },
  "course": {
    "detail": "课程详情",
    "price": "价格",
    "priceUnit": {
      "hour": "/小时",
      "lesson": "/节",
      "month": "/月"
    },
    "rating": "评分",
    "reviews": "条评价",
    "location": "地区",
    "teacher": "教师",
    "schedule": "上课时间",
    "language": "授课语言",
    "contact": "联系方式",
    "save": "收藏",
    "saved": "已收藏",
    "share": "分享"
  },
  "trust": {
    "verified": "平台认证",
    "highQuality": "高质量",
    "sourceVerified": "来源验证",
    "community": "社群来源"
  },
  "auth": {
    "login": "登录",
    "register": "注册",
    "email": "邮箱",
    "password": "密码",
    "verifyCode": "验证码",
    "getCode": "获取验证码",
    "forgotPassword": "忘记密码"
  }
}
```

### 3.3 英文语言包 (en-US.json)

```json
{
  "common": {
    "appName": "EduSearch NZ",
    "appNameFull": "New Zealand Course Platform",
    "loading": "Loading...",
    "noResults": "No results found",
    "error": "Something went wrong, please try again",
    "retry": "Retry",
    "save": "Save",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "delete": "Delete",
    "edit": "Edit",
    "close": "Close",
    "search": "Search",
    "filter": "Filter",
    "sort": "Sort",
    "more": "More",
    "less": "Less"
  },
  "nav": {
    "home": "Home",
    "courses": "Courses",
    "tutors": "Tutors",
    "categories": "Categories",
    "about": "About Us",
    "contact": "Contact",
    "login": "Sign In",
    "register": "Sign Up",
    "logout": "Sign Out"
  },
  "search": {
    "placeholder": "Search courses, tutors, institutes",
    "searchButton": "Search",
    "noResults": "No courses found",
    "resultsCount": "{count} courses found",
    "popularSearches": "Popular Searches"
  },
  "course": {
    "detail": "Course Details",
    "price": "Price",
    "priceUnit": {
      "hour": "/hour",
      "lesson": "/lesson",
      "month": "/month"
    },
    "rating": "Rating",
    "reviews": "reviews",
    "location": "Location",
    "teacher": "Tutor",
    "schedule": "Schedule",
    "language": "Language",
    "contact": "Contact",
    "save": "Save",
    "saved": "Saved",
    "share": "Share"
  },
  "trust": {
    "verified": "Verified",
    "highQuality": "High Quality",
    "sourceVerified": "Source Verified",
    "community": "Community"
  },
  "auth": {
    "login": "Sign In",
    "register": "Sign Up",
    "email": "Email",
    "password": "Password",
    "verifyCode": "Verification Code",
    "getCode": "Get Code",
    "forgotPassword": "Forgot Password"
  }
}
```

---

## 四、翻译服务设计

### 4.1 翻译缓存策略

```typescript
interface TranslationCache {
  key: string;        // 内容ID + 语言
  original: string;   // 原文
  translated: string; // 译文
  sourceLang: string; // 源语言
  targetLang: string; // 目标语言
  createdAt: Date;    // 创建时间
  expiresAt: Date;    // 过期时间（30天）
}

const TRANSLATION_CACHE_TTL = 30 * 24 * 60 * 60; // 30天
```

### 4.2 翻译API调用策略

| 场景 | 调用策略 |
|------|----------|
| 用户浏览课程列表 | 默认展示原始语言 |
| 用户点击"翻译"按钮 | 调用API翻译，返回后展示 |
| 翻译API调用失败 | 显示原文，提示翻译失败 |
| 重复请求相同内容 | 命中缓存，不调用API |

### 4.3 成本控制

| 成本项 | 月成本估算 | 控制措施 |
|--------|------------|----------|
| 翻译API | $5-15 | 缓存机制，按需翻译 |
| 课程描述翻译 | $3-10 | 用户触发才翻译 |
| 评价翻译 | $2-5 | 用户触发才翻译 |
| **总计** | **$10-25/月** | 缓存命中率>80% |

---

## 五、API 设计

### 5.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| GET | /api/v1/i18n/:lang | 获取语言包 | 返回指定语言包 |
| POST | /api/v1/i18n/translate | 内容翻译 | 调用翻译API |
| GET | /api/v1/i18n/translations/:contentId | 获取译文 | 获取已翻译内容 |

### 5.2 API 详细设计

#### 5.2.1 GET /api/v1/i18n/:lang

**响应示例** (200):

```json
{
  "success": true,
  "data": {
    "lang": "zh-CN",
    "translations": {
      "common": {
        "appName": "EduSearch NZ",
        "loading": "加载中..."
      },
      "nav": {
        "home": "首页",
        "courses": "课程"
      }
    }
  }
}
```

---

## 六、前端实现

### 6.1 国际化Hook

```typescript
// useTranslation.ts
import { useState, useEffect, createContext, useContext } from 'react';

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
}

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState('zh-CN');
  const [translations, setTranslations] = useState({});
  
  useEffect(() => {
    // 加载语言包
    fetch(`/api/v1/i18n/${language}`)
      .then(res => res.json())
      .then(data => setTranslations(data.translations));
  }, [language]);
  
  const t = (key: string) => {
    const keys = key.split('.');
    let value = translations;
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };
  
  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}
```

### 6.2 语言切换组件

```tsx
// LanguageSwitcher.tsx
export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();
  
  const languages = [
    { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
    { code: 'zh-TW', name: '繁體', flag: '🇹🇼' },
    { code: 'en-US', name: 'English', flag: '🇺🇸' },
  ];
  
  return (
    <div className="language-switcher">
      {languages.map(lang => (
        <button
          key={lang.code}
          className={language === lang.code ? 'active' : ''}
          onClick={() => setLanguage(lang.code)}
        >
          {lang.flag} {lang.name}
        </button>
      ))}
    </div>
  );
}
```

---

## 七、测试用例

### 7.1 功能测试用例

| 测试场景 | 操作步骤 | 预期结果 |
|----------|----------|----------|
| 语言切换 | 切换到英文 | 界面文案变为英文 |
| 语言持久化 | 切换语言后刷新页面 | 语言设置保持 |
| 翻译按钮 | 点击课程描述的翻译按钮 | 显示英文翻译 |
| 翻译缓存 | 再次点击翻译按钮 | 快速返回缓存结果 |
| 内容缺失 | 翻译键不存在 | 返回键名 |

---

## 八、实现计划

### 8.1 开发任务分解

| 任务 | 描述 | 预估工时 | 依赖 |
|------|------|----------|------|
| 语言包设计 | 设计中英文语言包结构 | 4h | - |
| 语言包创建 | 创建zh-CN和en-US语言包 | 8h | 语言包设计 |
| 国际化框架 | 前端i18n框架集成 | 8h | - |
| 语言切换组件 | 实现语言切换UI | 4h | 国际化框架 |
| 翻译服务 | 实现翻译API和缓存 | 8h | 翻译API |
| 按需翻译 | 实现用户内容按需翻译 | 8h | 翻译服务 |
| 单元测试 | 国际化功能测试 | 4h | 全部 |

### 8.2 验收标准

- [ ] 中英文界面切换正常
- [ ] 语言设置持久化
- [ ] 翻译功能正常
- [ ] 翻译缓存生效
- [ ] 月翻译成本<$25
- [ ] 翻译失败时有回退

---

## 九、风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 翻译API成本超支 | 中 | 中 | 严格缓存，用户触发才翻译 |
| 翻译质量差 | 中 | 低 | 人工抽检，优化提示词 |
| 语言包缺失 | 低 | 中 | 兜底显示键名 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/05-product-design/feature-multilingual.md`

**相关文档**:
- [功能概览](feature-overview.md)
- [课程搜索与筛选](feature-search.md)
- [课程详情页](feature-course-detail.md)
