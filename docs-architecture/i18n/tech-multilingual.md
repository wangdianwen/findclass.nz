---
title: 技术实现 - 多语言支持
category: tech-architecture
created: 2026-01-21
author: linus-torvalds
version: 1.0
phase: 1
priority: P0
status: complete
related_feature: ../../05-product-design/mvp/feature-multilingual.md
---

# 技术实现: 多语言支持

> **对应产品文档**: [feature-multilingual.md](../../05-product-design/mvp/feature-multilingual.md) | **优先级**: P0 | **排期**: Phase 1 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                         技术架构层级                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [React/Taro Frontend]                                            │
│   ├── i18n (React i18next)                                         │
│   ├── 语言检测 (navigator.language)                                │
│   └── 语言切换组件                                                  │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway]                                                    │
│         │                                                           │
│         ▼                                                           │
│   [Lambda: course-translate]                                       │
│         │                                                           │
│         ▼                                                           │
│   [Translation API]                                                │
│   └── Google Translate                                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 技术选型

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| **前端国际化** | react-i18next | React 国际化 |
| **移动端国际化** | i18next + Taro | 微信小程序 |
| **后端翻译** | Google Translate API | 课程数据翻译 |
| **翻译缓存** | DynamoDB | 翻译结果缓存 |

---

## 二、前端国际化

### 2.1 i18n 配置

```typescript
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en.json';
import zhTranslation from './locales/zh.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      zh: { translation: zhTranslation }
    },
    lng: 'zh', // 默认语言
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator'],
      caches: ['localStorage', 'cookie']
    }
  });

export default i18n;
```

### 2.2 翻译资源文件

```json
// locales/zh.json
{
  "common": {
    "searchPlaceholder": "搜索课程、教师、机构",
    "search": "搜索",
    "filter": "筛选",
    "reset": "重置",
    "loading": "加载中...",
    "noResults": "未找到相关课程",
    "submit": "提交",
    "cancel": "取消"
  },
  "course": {
    "price": "价格",
    "rating": "评分",
    "reviews": "条评价",
    "region": "地区",
    "subject": "科目",
    "grade": "年级"
  },
  "trust": {
    "platform": "平台认证",
    "verified": "来源验证",
    "community": "社群来源"
  }
}

// locales/en.json
{
  "common": {
    "searchPlaceholder": "Search courses, tutors, institutes",
    "search": "Search",
    "filter": "Filter",
    "reset": "Reset",
    "loading": "Loading...",
    "noResults": "No courses found",
    "submit": "Submit",
    "cancel": "Cancel"
  },
  "course": {
    "price": "Price",
    "rating": "Rating",
    "reviews": "reviews",
    "region": "Region",
    "subject": "Subject",
    "grade": "Grade"
  },
  "trust": {
    "platform": "Platform Certified",
    "verified": "Source Verified",
    "community": "Community"
  }
}
```

### 2.3 组件使用

```typescript
import { useTranslation } from 'react-i18next';

function SearchBar() {
  const { t } = useTranslation();
  
  return (
    <div className="search-bar">
      <input 
        placeholder={t('common.searchPlaceholder')}
      />
      <button>{t('common.search')}</button>
    </div>
  );
}

// 语言切换组件
function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
    >
      <option value="zh">中文</option>
      <option value="en">English</option>
    </select>
  );
}
```

---

## 三、后端翻译

### 3.1 翻译服务

```typescript
interface TranslationRequest {
  texts: string[];
  sourceLanguage: string;  // 'auto' | 'zh' | 'en'
  targetLanguage: string;  // 'zh' | 'en'
}

interface TranslationResponse {
  translations: string[];
  fromCache: boolean;
}

class TranslationService {
  private cache: Map<string, string>;
  
  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    const cacheKey = this.getCacheKey(request);
    
    // 检查缓存
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return { translations: cached, fromCache: true };
    }
    
    // 调用 Google Translate API
    const translations = await this.callGoogleTranslate(
      request.texts,
      request.sourceLanguage,
      request.targetLanguage
    );
    
    // 存入缓存
    await this.saveToCache(cacheKey, translations);
    
    return { translations, fromCache: false };
  }
  
  private getCacheKey(request: TranslationRequest): string {
    return `trans:${request.sourceLanguage}:${request.targetLanguage}:${hash(request.texts)}`;
  }
}
```

### 3.2 课程翻译 Lambda

```typescript
async function translateCourseHandler(event: APIGatewayEvent) {
  const { courseId, targetLanguage } = JSON.parse(event.body);
  
  // 获取课程
  const course = await getCourseFromDynamoDB(courseId);
  
  // 需要翻译的字段
  const textsToTranslate = [
    course.title,
    course.description,
    course.curriculum,
    course.targetAudience
  ];
  
  // 翻译
  const translations = await translationService.translate({
    texts: textsToTranslate,
    sourceLanguage: course.originalLanguage || 'zh',
    targetLanguage
  });
  
  // 更新课程
  const updatedCourse = {
    ...course,
    translations: {
      ...course.translations,
      [targetLanguage]: {
        title: translations[0],
        description: translations[1],
        curriculum: translations[2],
        targetAudience: translations[3]
      }
    }
  };
  
  await saveCourseToDynamoDB(updatedCourse);
  
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, course: updatedCourse })
  };
}
```

### 3.3 翻译缓存表

```yaml
TableName: translations
KeySchema:
  - AttributeName: id
    KeyType: HASH
AttributeDefinitions:
  - AttributeName: id
    AttributeType: S
  - AttributeName: source_target
    AttributeType: S
GlobalSecondaryIndexes:
  - IndexName: source-target-index
    KeySchema:
      - AttributeName: source_target
        KeyType: HASH
    Projection:
      ProjectionType: ALL
BillingMode: PAY_PER_REQUEST
```

---

## 四、语言检测

### 4.1 前端语言检测

```typescript
// 检测用户首选语言
function detectLanguage(): string {
  // 1. 检查 URL 参数
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang');
  if (langParam && ['en', 'zh'].includes(langParam)) {
    return langParam;
  }
  
  // 2. 检查本地存储
  const storedLang = localStorage.getItem('i18nextLng');
  if (storedLang) {
    return storedLang;
  }
  
  // 3. 检测浏览器语言
  const browserLang = navigator.language?.split('-')[0];
  if (browserLang === 'zh' || browserLang === 'en') {
    return browserLang;
  }
  
  // 4. 默认中文
  return 'zh';
}

// 初始化
const userLang = detectLanguage();
i18n.changeLanguage(userLang);
```

### 4.2 后端语言检测

```typescript
function detectLanguageFromHeader(acceptLanguage: string): string {
  const languages = acceptLanguage
    .split(',')
    .map(lang => lang.split(';')[0].trim().toLowerCase());
  
  for (const lang of languages) {
    if (lang.startsWith('zh')) return 'zh';
    if (lang.startsWith('en')) return 'en';
  }
  
  return 'zh'; // 默认
}
```

---

## 五、URL 路由支持

### 5.1 多语言 URL

```
# 中文 (默认)
https://findclass.co.nz/courses/math-tutoring

# 英文
https://findclass.co.nz/en/courses/math-tutoring

# 带语言参数
https://findclass.co.nz/courses/math-tutoring?lang=en
```

### 5.2 Next.js 国际化路由

```typescript
// next.config.js
module.exports = {
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'zh',
    localeDetection: true
  }
}

// 页面组件
export async function getStaticPaths() {
  return {
    paths: [
      { params: { slug: 'math-tutoring' }, locale: 'zh' },
      { params: { slug: 'math-tutoring' }, locale: 'en' }
    ],
    fallback: true
  };
}
```

---

## 六、测试用例

### 6.1 前端翻译切换测试

| ID | 测试类型 | 测试描述 | 预期结果 | 优先级 |
|----|----------|----------|----------|--------|
| I18-FC-01 | 功能测试 | 用户切换语言后界面翻译更新 | 界面所有文本立即更新为新语言 | P0 |
| I18-FC-02 | 功能测试 | 页面刷新后保持当前语言 | 语言设置持久化，刷新后不变 | P0 |
| I18-FC-03 | 功能测试 | URL带语言参数时自动切换 | ?lang=en时界面显示英文 | P0 |
| I18-FC-04 | 边界测试 | 翻译key不存在时显示key本身 | 未翻译的key显示为 `common.key` | P2 |
| I18-FC-05 | 性能测试 | 大量翻译key时加载性能 | 首屏渲染 < 200ms | P1 |

### 6.2 后端翻译服务测试

| ID | 测试类型 | 测试描述 | 预期结果 | 优先级 |
|----|----------|----------|----------|--------|
| I18-BE-01 | 功能测试 | 调用翻译API返回正确结果 | 中译英返回准确翻译 | P0 |
| I18-BE-02 | 功能测试 | 相同内容第二次请求返回缓存 | fromCache: true | P0 |
| I18-BE-03 | 功能测试 | 批量翻译多个文本 | 所有文本翻译正确返回 | P1 |
| I18-BE-04 | 异常测试 | 翻译API超时处理 | 返回降级提示，使用原文 | P1 |
| I18-BE-05 | 异常测试 | 不支持的语言对处理 | 返回错误提示，不崩溃 | P1 |

### 6.3 课程翻译测试

| ID | 测试类型 | 测试描述 | 预期结果 | 优先级 |
|----|----------|----------|----------|--------|
| I18-CR-01 | 功能测试 | 课程详情页显示翻译内容 | 用户语言与课程翻译匹配时显示 | P0 |
| I18-CR-02 | 功能测试 | 课程搜索支持多语言 | 搜索关键词匹配翻译后标题 | P1 |
| I18-CR-03 | 功能测试 | 课程翻译状态更新 | 翻译完成后状态变为 completed | P1 |
| I18-CR-04 | 性能测试 | 大量课程翻译时的处理 | 队列处理，不阻塞主流程 | P2 |

### 6.4 语言检测测试

| ID | 测试类型 | 测试描述 | 预期结果 | 优先级 |
|----|----------|----------|----------|--------|
| I18-LD-01 | 功能测试 | 浏览器语言检测 | zh-CN返回中文界面 | P0 |
| I18-LD-02 | 功能测试 | 优先级顺序检测 | URL参数 > 本地存储 > 浏览器语言 | P0 |
| I18-LD-03 | 异常测试 | 不支持语言的默认处理 | 默认回退到中文 | P1 |

---

## 七、验收标准

- [x] 前端界面支持中英文切换
- [x] 翻译内容准确、语义通顺
- [x] 语言切换即时生效
- [x] URL 支持多语言路由
- [x] 翻译结果有缓存，减少 API 调用
- [x] 课程数据支持翻译存储
- [x] 语言检测优先级正确：URL > 本地存储 > 浏览器
- [x] 未翻译内容优雅降级显示 key

---

## 八、风险分析

| 风险项 | 风险等级 | 影响范围 | 应对措施 |
|--------|----------|----------|----------|
| **翻译API成本高** | 中 | 运营成本 | 使用缓存减少调用，设置每日翻译限额 |
| **翻译质量不稳定** | 中 | 用户体验 | 人工审核关键内容，提供纠错反馈机制 |
| **多语言内容维护困难** | 低 | 开发效率 | 建立翻译管理后台，导入导出功能 |
| **语言切换闪屏** | 低 | 用户体验 | 预加载语言包，骨架屏过渡 |
| **翻译缓存过期** | 低 | 数据一致性 | TTL 设置 30 天，支持手动刷新 |
| **特定领域术语翻译不准** | 中 | 专业性 | 建立术语库，机器翻译+人工校对 |
