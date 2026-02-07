# Google Analytics 4 (GA4) 最佳实践 | Best Practices

## 环境配置策略 | Environment Strategy

### 📋 各环境GA4配置总结

| 环境 | GA4状态 | Measurement ID | 用途 | 数据保留 |
|------|---------|---------------|------|----------|
| **单元/集成测试** | ❌ 禁用 | N/A | Mock GA4，不发送真实事件 | N/A |
| **E2E测试** | ✅ 启用（测试属性） | `G-TEST-XXXXXXXX` | 使用独立测试属性验证事件 | 2天 |
| **开发环境** | ✅ 可选（DebugView） | `G-DEV-XXXXXXXX` | 本地开发时验证事件 | 14天 |
| **Staging环境** | ✅ 启用（独立属性） | `G-STAGING-XXXXXXXX` | 预发布测试，模拟真实用户行为 | 14天 |
| **生产环境** | ✅ 启用（正式属性） | `G-PROD-XXXXXXXX` | 正式业务数据 | 保留策略 |

---

## 1️⃣ 单元/集成测试环境

### ❌ 不启用真实GA4

**原因：**
- 测试应该快速、隔离、可重复
- 不应该产生真实的analytics数据
- 使用mock避免外部依赖

**配置：**
```bash
# .env.test (测试环境)
VITE_GA4_MEASUREMENT_ID=
VITE_GA4_ENABLED_DEV=false
```

**测试策略：**
```typescript
// ✅ 推荐：Mock window.gtag
import { vi } from 'vitest';

beforeEach(() => {
  // Mock gtag函数
  window.gtag = vi.fn();
  window.dataLayer = [];

  // 禁用GA4
  Object.defineProperty(import.meta.env, 'VITE_GA4_MEASUREMENT_ID', {
    value: '',
    writable: true,
  });
});

it('should call gtag with correct parameters', () => {
  trackEvent('search', { search_term: 'math' });

  expect(window.gtag).toHaveBeenCalledWith('event', 'search', {
    search_term: 'math',
  });
});
```

**最佳实践：**
- ✅ Mock `window.gtag`
- ✅ 验证调用参数
- ✅ 测试队列逻辑
- ❌ 不发送真实事件到GA4

---

## 2️⃣ E2E测试环境

### ✅ 使用独立的测试GA4属性

**原因：**
- E2E测试需要验证完整的事件流程
- 使用测试属性避免污染生产数据
- 可以在GA4 DebugView中实时查看事件

**配置：**
```bash
# .env.test.e2e (E2E测试环境)
VITE_GA4_MEASUREMENT_ID=G-TEST-XXXXXXXX  # 测试专用属性
VITE_GA4_ENABLED_DEV=true
```

**测试策略：**
```typescript
// ✅ E2E测试：验证真实事件
test('should track search events', async ({ page }) => {
  // Mock window.gtag用于验证
  await page.addInitScript(() => {
    window.gtag = function(...args) {
      window.dataLayer.push(args);
    };
    window.dataLayer = [];
  });

  await page.goto('/courses');
  await page.fill('[data-testid="search-input"]', 'math');
  await page.press('[data-testid="search-input"]', 'Enter');

  // 验证事件被触发
  const events = await page.evaluate(() => {
    return window.dataLayer.filter(args => args[1] === 'search');
  });

  expect(events.length).toBeGreaterThan(0);
});
```

**最佳实践：**
- ✅ 使用独立的测试GA4属性
- ✅ 在测试前初始化`window.dataLayer`
- ✅ 验证事件参数正确
- ✅ 测试后清理数据
- ⚠️ 定期清理测试数据（数据保留2天）

---

## 3️⃣ 开发环境 (Development)

### ✅ 可选：启用GA4 + DebugView

**原因：**
- 开发者需要实时验证事件是否正确触发
- 使用DebugView查看事件参数
- 帮助调试analytics问题

**配置：**
```bash
# .env.development 或 .env.local (开发环境)
VITE_GA4_MEASUREMENT_ID=G-DEV-XXXXXXXX
VITE_GA4_ENABLED_DEV=true
```

**使用方法：**
1. 启用DebugView：
   - 打开 [GA4 DebugView](https://analytics.google.com/debugview)
   - 或使用浏览器扩展：[GA4 DebugView Chrome Extension](https://chrome.google.com/webstore/detail/ga4-debug-view/)

2. 检查控制台日志：
   ```javascript
   // 在浏览器控制台查看事件
   window.dataLayer

   // 查看最新事件
   window.dataLayer[window.dataLayer.length - 1]
   ```

3. 验证事件参数：
   ```javascript
   // 查看特定事件
   window.dataLayer.filter(args => args[1] === 'search')
   ```

**最佳实践：**
- ✅ 使用开发专用GA4属性（与生产分离）
- ✅ 启用DebugView进行实时调试
- ✅ 检查控制台日志
- ✅ 验证事件命名和参数
- ⚠️ 开发数据不用于业务决策

---

## 4️⃣ Staging环境

### ✅ 必须启用：独立GA4属性

**原因：**
- Staging是预发布环境，需要模拟真实用户行为
- 验证事件在类生产环境中的正确性
- 测试不同场景和边缘情况
- 避免影响生产数据

**配置：**
```bash
# .env.staging
VITE_GA4_MEASUREMENT_ID=G-STAGING-XXXXXXXX  # Staging专用属性
VITE_GA4_ENABLED_DEV=true
```

**测试清单：**
- [ ] 所有页面浏览事件正确触发
- [ ] 搜索事件包含正确参数
- [ ] 课程详情页事件正确
- [ ] 登录/注册事件正确
- [ ] 收藏操作事件正确
- [ ] 联系表单事件正确
- [ ] 分享事件正确
- [ ] Cookie consent正常工作（同意后才发送事件）
- [ ] User ID正确设置（登录用户）
- [ ] IP地址已匿名化

**数据管理：**
- 定期清理Staging数据（数据保留14天）
- 在GA4中设置数据流过滤器
- 监控Staging数据量

---

## 5️⃣ 生产环境 (Production)

### ✅ 必须启用：正式GA4属性

**配置：**
```bash
# .env.production
VITE_GA4_MEASUREMENT_ID=G-PROD-XXXXXXXX  # 正式属性
VITE_GA4_ENABLED_DEV=false
```

**上线前检查：**
- [ ] Cookie consent横幅正常工作
- [ ] 用户同意后才加载gtag.js
- [ ] 所有关键事件已实现
- [ ] User ID正确设置
- [ ] IP地址已匿名化
- [ ] 数据保留策略已设置（推荐2个月）
- [ ] 转化事件已配置
- [ ] 自定义维度已设置（如需要）
- [ ] 实时Dashboard正常

**数据管理：**
- 设置数据保留期（2个月）
- 配置数据删除API调用（如需要）
- 定期审计数据质量
- 设置告警（数据异常时）

---

## 🔒 GDPR & 隐私最佳实践

### Cookie Consent

```typescript
// ✅ 正确：只在用户同意后初始化
useEffect(() => {
  if (isAnalyticsEnabled() && !isAnalyticsInitialized()) {
    initAnalytics(); // 用户同意后才加载gtag.js
  }
}, [isAnalyticsEnabled()]);
```

### IP匿名化

```typescript
// ✅ 已在core.ts中配置
window.gtag('config', measurementId, {
  anonymize_ip: true, // IP地址自动匿名化
});
```

### 数据保留

**推荐配置：**
- **用户数据**：2个月
- **事件数据**：2个月
- **转化数据**：根据业务需求

在GA4中配置：
1. Admin > Data Settings > Data Retention
2. 选择 retention period（2 months）
3. 保存

---

## 🧪 测试策略

### 单元测试

```typescript
// ✅ Mock window.gtag
import { vi } from 'vitest';

beforeEach(() => {
  window.gtag = vi.fn();
  window.dataLayer = [];
});

it('should track search events', () => {
  trackSearch('math', { city: 'Auckland' }, 10);

  expect(window.gtag).toHaveBeenCalledWith('event', 'search', {
    search_term: 'math',
    search_filters: JSON.stringify({ city: 'Auckland' }),
    result_count: 10,
  });
});
```

### E2E测试

```typescript
// ✅ 验证完整流程
test('complete user journey', async ({ page }) => {
  // 1. 首页
  await page.goto('/');
  await page.waitForTimeout(1000);

  // 2. 搜索
  await page.click('[data-testid="search-button"]');
  await page.fill('[data-testid="search-input"]', 'math');
  await page.press('Enter');

  // 3. 查看课程详情
  await page.click('[data-testid="course-card-1"]');

  // 4. 验证所有事件
  const events = await page.evaluate(() => window.dataLayer);
  expect(events.some(e => e[1] === 'page_view')).toBe(true);
  expect(events.some(e => e[1] === 'search')).toBe(true);
  expect(events.some(e => e[1] === 'view_item')).toBe(true);
});
```

### 手动测试

**使用DebugView：**
1. 打开 [GA4 DebugView](https://analytics.google.com/debugview)
2. 在开发环境中操作应用
3. 实时查看事件

**检查清单：**
- [ ] 事件命名符合GA4规范
- [ ] 参数完整且类型正确
- [ ] User ID正确设置
- [ ] 事件在DebugView中显示
- [ ] 时间戳正确
- [ ] 无重复事件

---

## 📊 监控与告警

### 关键指标

| 指标 | 说明 | 目标 |
|------|------|------|
| **事件总数/天** | 日活跃事件数 | 稳定增长 |
| **Unique Users** | 日活跃用户 | 稳定增长 |
| **Page Views** | 页面浏览数 | 稳定增长 |
| **Conversion Rate** | 转化率 | 持续优化 |
| **Event Error Rate** | 事件错误率 | < 1% |

### 告警设置

**在GA4中设置：**
1. Admin > Custom Alerts
2. 创建告警：
   - 事件数突降 > 20%
   - 零事件（配置问题）
   - 异常流量峰值

---

## 🚀 部署检查清单

### Pre-deployment

- [ ] 所有测试通过（单元 + E2E）
- [ ] 代码审查完成
- [ ] TypeScript类型检查通过
- [ ] ESLint无错误
- [ ] GA4事件已验证
- [ ] DebugView测试完成

### Staging部署

- [ ] Staging GA4配置正确
- [ ] 手动测试所有关键流程
- [ ] 验证事件在GA4中显示
- [ ] 检查数据质量
- [ ] 性能测试（无影响）

### Production部署

- [ ] Production GA4配置正确
- [ ] 启用Cookie consent
- [ ] 验证实时Dashboard
- [ ] 检查数据流正常
- [ ] 设置告警
- [ ] 监控24小时

---

## 📖 参考资料

- [GA4 Event Reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
- [GA4 Setup Guide](https://developers.google.com/analytics/devguides/collection/ga4)
- [GDPR Compliance](https://developers.google.com/analytics/devguides/collection/ga4/user-privacy)
- [GA4 DebugView](https://support.google.com/analytics/answer/7209852)

---

## ❓ 常见问题

### Q: 测试环境需要启用GA吗？

**A:** 单元/集成测试不需要，应该Mock。E2E测试可以使用独立的测试属性。

### Q: 开发环境需要启用GA吗？

**A:** 可选。推荐启用以便使用DebugView调试，但使用开发专用属性。

### Q: Staging和Production可以使用同一个GA4属性吗？

**A:** 不推荐。应该使用独立属性以避免数据混淆和污染。

### Q: 如何验证GA4事件正确？

**A:** 使用DebugView实时查看，或检查`window.dataLayer`数组。

### Q: Cookie consent失败时GA会工作吗？

**A:** 不会。我们的实现是GDPR合规的，只有用户同意后才加载gtag.js和发送事件。

---

## 💡 总结

| 环境 | GA4状态 | 原因 |
|------|---------|------|
| 单元测试 | ❌ Mock | 快速、隔离、无外部依赖 |
| E2E测试 | ✅ 测试属性 | 验证完整流程 |
| 开发 | ✅ DebugView | 调试和验证 |
| Staging | ✅ 独立属性 | 预发布验证 |
| 生产 | ✅ 正式属性 | 业务数据 |

**关键原则：**
- 测试环境使用Mock，不发送真实数据
- 每个环境使用独立的GA4属性
- Staging严格测试，确保生产质量
- GDPR合规，用户同意后才追踪
