# Analytics 测试指南

## 概述

本指南说明如何测试Google Analytics 4集成，包括单元测试、E2E测试和手动测试。

---

## 🔧 测试环境配置

### 1. 单元测试配置

**配置文件：** `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom', // 使用jsdom模拟浏览器环境
    globals: true,
  },
});
```

**环境变量：** `.env.test`

```bash
# 单元测试环境 - 不启用真实GA4
VITE_GA4_MEASUREMENT_ID=
VITE_GA4_ENABLED_DEV=false
```

### 2. E2E测试配置

**配置文件：** `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'http://localhost:3000',
  },
});
```

**环境变量：** `.env.test.e2e`

```bash
# E2E测试环境 - 使用测试专用GA4属性（可选）
VITE_GA4_MEASUREMENT_ID=G-TEST-XXXXXXXX
VITE_GA4_ENABLED_DEV=true
```

---

## 📝 单元测试

### Analytics Core 测试

**文件：** `src/services/analytics/__tests__/core.test.ts`

```bash
# 运行analytics核心模块测试
npm run test -- src/services/analytics/__tests__/core.test.ts
```

**测试覆盖：**
- ✅ GA4初始化
- ✅ 事件队列（同意前）
- ✅ 事件发送（同意后）
- ✅ 事件刷新（同意后刷新队列）
- ✅ User ID管理
- ✅ 页面浏览追踪
- ✅ 配置管理

**示例：**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { initAnalytics, trackEvent, resetAnalytics } from '@/services/analytics/core';

describe('Analytics Core', () => {
  beforeEach(() => {
    resetAnalytics();
    window.gtag = vi.fn();
    window.dataLayer = [];
  });

  it('should queue events before consent', () => {
    trackEvent('search', { search_term: 'math' });

    // 事件应该被队列，不发送
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('should send events after consent', () => {
    initAnalytics();
    trackEvent('search', { search_term: 'math' });

    // 事件应该被发送
    expect(window.gtag).toHaveBeenCalledWith('event', 'search', {
      search_term: 'math',
    });
  });
});
```

### useAnalytics Hook 测试

**文件：** `src/hooks/__tests__/useAnalytics.test.ts`

```bash
# 运行hook测试
npm run test -- src/hooks/__tests__/useAnalytics.test.ts
```

**测试覆盖：**
- ✅ Hook返回所有追踪函数
- ✅ 函数可调用且类型正确
- ✅ Consent gating正常工作

---

## 🎭 E2E测试

### Analytics E2E 测试

**文件：** `src/test/e2e/specs/analytics.spec.ts`

```bash
# 运行E2E测试
npx playwright test analytics.spec.ts

# 运行E2E测试（UI模式）
npx playwright test analytics.spec.ts --ui
```

**测试场景：**

1. **Cookie Consent合规测试**
   ```typescript
   test('should not track events before cookie consent', async ({ page }) => {
     await page.goto('/');

     // 同意前没有事件
     const dataLayerLength = await page.evaluate(() => window.dataLayer.length);
     expect(dataLayerLength).toBe(0);
   });
   ```

2. **页面浏览追踪**
   ```typescript
   test('should track page views after consent', async ({ page }) => {
     await page.goto('/');
     await page.click('[data-testid="accept-cookies"]');
     await page.goto('/courses');

     const pageViewEvents = await page.evaluate(() => {
       return window.dataLayer.filter(args => args[1] === 'page_view');
     });

     expect(pageViewEvents.length).toBeGreaterThan(0);
   });
   ```

3. **搜索事件追踪**
   ```typescript
   test('should track search events', async ({ page }) => {
     await page.goto('/');
     await page.click('[data-testid="accept-cookies"]');
     await page.goto('/courses');

     await page.fill('[data-testid="search-input"]', 'math');
     await page.press('Enter');

     const searchEvents = await page.evaluate(() => {
       return window.dataLayer.filter(args => args[1] === 'search');
     });

     expect(searchEvents.length).toBeGreaterThan(0);
   });
   ```

4. **课程详情浏览**
   ```typescript
   test('should track course detail views', async ({ page }) => {
     await page.goto('/');
     await page.click('[data-testid="accept-cookies"]');
     await page.goto('/courses/1');

     const viewItemEvents = await page.evaluate(() => {
       return window.dataLayer.filter(args => args[1] === 'view_item');
     });

     expect(viewItemEvents.length).toBeGreaterThan(0);
   });
   ```

---

## 🧪 手动测试

### 准备工作

1. **设置环境变量**
   ```bash
   # .env.local
   VITE_GA4_MEASUREMENT_ID=G-DEV-XXXXXXXX
   VITE_GA4_ENABLED_DEV=true
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   ```

3. **打开DebugView**
   - 访问 [GA4 DebugView](https://analytics.google.com/debugview)
   - 或安装Chrome扩展：[GA4 DebugView](https://chrome.google.com/webstore/detail/ga4-debug-view)

### 测试步骤

#### 1. Cookie Consent测试

**步骤：**
1. 打开应用（无Cookie状态）
2. 检查`localStorage.getItem('analytics_enabled')`为`null`
3. 打开浏览器控制台，输入`window.dataLayer`
4. 验证：`window.dataLayer`为空数组

**预期：** ✅ 未同意前没有任何事件

#### 2. 同意Cookie后测试

**步骤：**
1. 点击"Accept"按钮
2. 检查`localStorage.getItem('analytics_enabled')`为`"true"`
3. 检查控制台有`[GA4] Initialized`日志
4. 检查`window.gtag`函数已定义

**预期：** ✅ GA4已初始化

#### 3. 页面浏览测试

**步骤：**
1. 导航到不同页面
2. 在DebugView中查看`page_view`事件
3. 或在控制台检查`window.dataLayer`

**控制台命令：**
```javascript
// 查看所有事件
window.dataLayer

// 查看page_view事件
window.dataLayer.filter(e => e[1] === 'page_view')

// 查看最新事件
window.dataLayer[window.dataLayer.length - 1]
```

**预期：** ✅ 每次路由变化都触发`page_view`事件

#### 4. 搜索事件测试

**步骤：**
1. 访问课程搜索页
2. 输入搜索关键词（如"math"）
3. 按Enter或点击搜索按钮
4. 查看DebugView中的`search`事件

**验证参数：**
```javascript
// 查看搜索事件参数
window.dataLayer
  .filter(e => e[1] === 'search')
  .map(e => e[2])
```

**预期：** ✅ `search`事件包含：
- `search_term`: 搜索关键词
- `search_filters`: JSON格式的筛选条件
- `result_count`: 结果数量

#### 5. 课程详情测试

**步骤：**
1. 在搜索结果中点击课程卡片
2. 访问课程详情页
3. 查看DebugView中的`select_item`和`view_item`事件

**预期：** ✅ 两个事件都被触发：
- `select_item`: 点击课程卡片
- `view_item`: 查看课程详情

#### 6. 收藏测试

**步骤：**
1. 访问课程详情页
2. 点击收藏按钮（心形图标）
3. 查看DebugView中的`add_to_wishlist`事件

**预期：** ✅ `add_to_wishlist`事件包含课程信息

#### 7. 登录测试

**步骤：**
1. 访问登录页
2. 输入邮箱和密码
3. 点击登录
4. 查看DebugView中的`login`事件

**预期：** ✅ `login`事件包含：
- `method`: "email" | "google" | "wechat"

**验证User ID：**
```javascript
// 登录后，User ID应该被设置
// 在控制台查看gtag调用
```

---

## 🐛 调试技巧

### 检查GA4是否加载

```javascript
// 在浏览器控制台
typeof window.gtag  // 应该是 "function"
window.dataLayer    // 应该是数组
```

### 检查Consent状态

```javascript
// 检查localStorage
localStorage.getItem('analytics_enabled')  // "true" 或 "false" 或 null
localStorage.getItem('cookie_consent')      // JSON字符串或null
```

### 查看所有事件

```javascript
// 查看所有事件
window.dataLayer

// 查看事件名称
window.dataLayer.map(e => e[1])

// 统计事件数量
window.dataLayer.filter(e => e[1] === 'search').length
```

### 清除测试数据

```javascript
// 清除localStorage
localStorage.clear()

// 清除dataLayer
window.dataLayer = []

// 刷新页面
location.reload()
```

---

## ✅ 测试检查清单

### 单元测试

- [ ] Analytics核心模块测试通过
- [ ] useAnalytics hook测试通过
- [ ] 事件队列测试通过
- [ ] Consent gating测试通过
- [ ] User ID管理测试通过
- [ ] 覆盖率 > 80%

### E2E测试

- [ ] Cookie consent合规测试通过
- [ ] 页面浏览追踪测试通过
- [ ] 搜索事件测试通过
- [ ] 课程详情测试通过
- [ ] 登录/注册测试通过
- [ ] 收藏操作测试通过
- [ ] 分享操作测试通过

### 手动测试

- [ ] DebugView正常工作
- [ ] 所有关键事件正确触发
- [ ] 事件参数完整
- [ ] Cookie consent正常
- [ ] User ID正确设置
- [ ] 性能无影响

---

## 🚀 CI/CD集成

### GitHub Actions示例

```yaml
name: Test Analytics

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test -- --run

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

---

## 📊 覆盖率目标

| 模块 | 覆盖率目标 | 状态 |
|------|-----------|------|
| Analytics Core | > 90% | ✅ |
| Analytics Events | > 90% | ✅ |
| useAnalytics Hook | > 90% | ✅ |
| AnalyticsProvider | > 80% | ✅ |

---

## 🆘 常见问题

### Q: 单元测试失败"Cannot find module 'jsdom'"

**A:** 运行`npm install`确保jsdom已安装。

### Q: E2E测试中事件没有被触发

**A:**
1. 确保已接受Cookie consent
2. 检查VITE_GA4_MEASUREMENT_ID已设置
3. 查看控制台是否有错误

### Q: DebugView中没有事件

**A:**
1. 确保已启用DebugView
2. 确保已接受Cookie consent
3. 检查是否使用正确的Measurement ID
4. 刷新DebugView页面

### Q: 事件参数不正确

**A:**
1. 检查事件函数调用是否正确
2. 查看控制台日志
3. 使用`window.dataLayer`检查实际发送的参数

---

## 📖 相关文档

- [GA4最佳实践](./BEST_PRACTICES.md)
- [Analytics README](./README.md)
- [GA4官方文档](https://developers.google.com/analytics/devguides/collection/ga4)
