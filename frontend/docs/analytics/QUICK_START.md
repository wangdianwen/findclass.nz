# GA4测试环境配置 - 快速指南

## 📌 你的问题解答

### 1️⃣ 测试环境需要enable GA配置吗？

**答案：分情况**

| 测试类型 | 是否启用GA4 | 原因 |
|---------|------------|------|
| **单元测试** | ❌ 不启用 | 使用Mock，快速且隔离 |
| **集成测试** | ❌ 不启用 | 使用Mock，避免外部依赖 |
| **E2E测试** | ✅ 可选 | 使用测试专用GA4属性验证完整流程 |

**推荐配置：**

```bash
# .env.test (单元/集成测试)
VITE_GA4_MEASUREMENT_ID=          # 空字符串 = 禁用
VITE_GA4_ENABLED_DEV=false        # 开发模式禁用

# .env.test.e2e (E2E测试)
VITE_GA4_MEASUREMENT_ID=G-TEST-XXX  # 使用测试属性（可选）
VITE_GA4_ENABLED_DEV=true
```

---

### 2️⃣ 什么是Best Practice？

**核心原则：**

1. **测试隔离** - 测试不应该产生真实的analytics数据
2. **环境分离** - 每个环境使用独立的GA4属性
3. **GDPR优先** - 只有用户明确同意后才追踪
4. **数据清理** - 测试数据定期清理

---

## 🎯 各环境配置推荐

### 开发环境 (Development)

**目的：** 本地开发和调试

```bash
# .env.development 或 .env.local
VITE_GA4_MEASUREMENT_ID=G-DEV-XXXXXXXX
VITE_GA4_ENABLED_DEV=true
```

**Best Practice:**
- ✅ 使用独立的开发属性
- ✅ 启用DebugView进行调试
- ✅ 在控制台查看事件日志
- ⚠️ 开发数据不用于业务决策

**验证方法：**
```javascript
// 浏览器控制台
window.dataLayer  // 查看所有事件
```

---

### 测试环境 (Testing)

**目的：** 自动化测试

```bash
# .env.test
VITE_GA4_MEASUREMENT_ID=
VITE_GA4_ENABLED_DEV=false
```

**Best Practice:**
- ✅ 单元测试使用Mock
- ✅ 不发送真实事件到GA4
- ✅ 测试快速、可重复
- ✅ 无外部依赖

**示例：**
```typescript
// 测试中Mock window.gtag
beforeEach(() => {
  window.gtag = vi.fn();
  window.dataLayer = [];
});

it('should track search', () => {
  trackSearch('math', {}, 10);
  expect(window.gtag).toHaveBeenCalledWith('event', 'search', {
    search_term: 'math',
    result_count: 10,
  });
});
```

---

### E2E测试环境

**目的：** 端到端测试

```bash
# .env.test.e2e
VITE_GA4_MEASUREMENT_ID=G-TEST-XXXXXXXX  # 测试专用属性
VITE_GA4_ENABLED_DEV=true
```

**Best Practice:**
- ✅ 使用独立的测试GA4属性
- ✅ 验证完整用户流程
- ✅ 测试Cookie consent合规
- ⚠️ 定期清理测试数据（保留2天）

---

### Staging环境

**目的：** 预发布验证

```bash
# .env.staging
VITE_GA4_MEASUREMENT_ID=G-STAGING-XXXXXXXX
VITE_GA4_ENABLED_DEV=true
```

**Best Practice:**
- ✅ 使用独立属性（与生产分离）
- ✅ 模拟真实用户行为
- ✅ 验证所有事件正确
- ✅ 上线前最后检查

**检查清单：**
- [ ] Cookie consent正常
- [ ] 所有关键事件触发
- [ ] User ID正确设置
- [ ] IP地址已匿名化
- [ ] 无性能影响

---

### 生产环境 (Production)

**目的：** 正式业务

```bash
# .env.production
VITE_GA4_MEASUREMENT_ID=G-PROD-XXXXXXXX
VITE_GA4_ENABLED_DEV=false
```

**Best Practice:**
- ✅ 使用正式GA4属性
- ✅ 启用Cookie consent
- ✅ 设置数据保留策略（2个月）
- ✅ 配置告警（数据异常时）
- ✅ 定期审计数据质量

---

## 📊 环境对比总结

| 环境 | GA4属性 | VITE_GA4_ENABLED_DEV | 用途 | 数据保留 |
|------|---------|---------------------|------|----------|
| **单元测试** | 无 | false | Mock测试 | N/A |
| **E2E测试** | 测试属性 | true | 完整流程验证 | 2天 |
| **开发** | 开发属性 | true | 本地调试 | 14天 |
| **Staging** | Staging属性 | true | 预发布验证 | 14天 |
| **生产** | 生产属性 | false | 正式业务 | 2个月 |

---

## ✅ 实施步骤

### 步骤1: 创建GA4属性

1. 访问 [Google Analytics](https://analytics.google.com/)
2. 为每个环境创建独立的GA4属性：
   - `G-DEV-XXXXXXXX` (开发)
   - `G-TEST-XXXXXXXX` (测试)
   - `G-STAGING-XXXXXXXX` (Staging)
   - `G-PROD-XXXXXXXX` (生产)

### 步骤2: 配置环境变量

```bash
# .env.development
VITE_GA4_MEASUREMENT_ID=G-DEV-XXXXXXXX
VITE_GA4_ENABLED_DEV=true

# .env.test
VITE_GA4_MEASUREMENT_ID=
VITE_GA4_ENABLED_DEV=false

# .env.staging
VITE_GA4_MEASUREMENT_ID=G-STAGING-XXXXXXXX
VITE_GA4_ENABLED_DEV=true

# .env.production
VITE_GA4_MEASUREMENT_ID=G-PROD-XXXXXXXX
VITE_GA4_ENABLED_DEV=false
```

### 步骤3: 测试验证

```bash
# 1. 单元测试（不发送真实数据）
npm run test

# 2. 本地开发（使用DebugView）
npm run dev
# 打开 https://analytics.google.com/debugview

# 3. Staging测试
npm run dev:staging
# 访问Staging URL，验证事件

# 4. 生产部署
npm run build
# 检查生产GA4数据
```

---

## 🔒 关键注意事项

### 1. 数据分离

**❌ 错误做法：**
- 所有环境使用同一个GA4属性
- 测试数据污染生产数据

**✅ 正确做法：**
- 每个环境独立属性
- 定期清理测试数据

### 2. Cookie Consent

**❌ 错误做法：**
- 测试中跳过consent检查
- 强制启用analytics

**✅ 正确做法：**
- 测试consent流程
- 只有同意后才发送事件

### 3. 测试Mock

**❌ 错误做法：**
- 单元测试发送真实事件
- 依赖外部服务

**✅ 正确做法：**
- Mock window.gtag
- 验证调用参数
- 快速、可靠、隔离

---

## 📖 参考文档

- [完整最佳实践](./BEST_PRACTICES.md)
- [测试详细指南](./TESTING.md)
- [Analytics README](./README.md)

---

## 🎓 快速决策树

```
需要测试analytics？
│
├─ 单元/集成测试？
│  └─ ❌ 不启用GA4，使用Mock
│
├─ E2E测试？
│  └─ ✅ 使用测试专用GA4属性
│
├─ 本地开发？
│  └─ ✅ 启用GA4，使用DebugView
│
├─ Staging测试？
│  └─ ✅ 使用独立GA4属性
│
└─ 生产环境？
   └─ ✅ 使用正式GA4属性
```

---

## 💡 总结

**记住这个黄金法则：**

> **测试环境Mock它，开发环境调试它，Staging验证它，生产环境信任它。**

- **单元测试**：Mock，不发送真实数据
- **开发环境**：启用，用于调试
- **E2E测试**：测试属性，验证完整流程
- **Staging**：独立属性，预发布验证
- **生产**：正式属性，业务数据

这样既能保证测试质量，又能避免数据污染，同时满足GDPR要求。
