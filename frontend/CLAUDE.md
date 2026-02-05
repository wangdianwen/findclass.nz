# CLAUDE.md

本文档为 Claude Code (claude.ai/code) 提供在此代码库中工作的指导。

## Claude Code 标准工作流程 | Workflow ⭐

本项目采用 **Claude Code 最佳实践** 工作流程：

### 工作流程步骤

| 步骤 | 说明 |
|------|------|
| **1. 理解需求** | 先理解任务范围和目标，必要时询问澄清问题 |
| **2. 查找文档** | 查阅 `frontend/docs/tech/INDEX.md` 和 CLAUDE.md |
| **3. 探索代码库** | 找到相关文件，阅读理解现有实现 |
| **4. 规划任务** | 小任务直接做，复杂任务用 **Plan Mode** (`Shift+Tab`)；用 `TodoWrite` 拆解 |
| **5. 实现代码** | 遵循项目规范，**提供验证标准**（测试、截图、命令输出） |
| **6. 验证** | `npm run format && npm run lint && npx tsc --noEmit && npm run test` |
| **7. 先行自审** | 创建 PR 前自行审查变更，构建确认无错误 |
| **8. 提交** | 向用户展示变更，经确认后执行提交（可用 `/commit-push-pr`） |
| **9. 复盘总结** | 回顾特殊情况、解决方案，判断是否需要更新文档 |

### 核心原则

| 原则 | 说明 |
|------|------|
| **给验证方式** | 提供测试、截图或预期输出，让 Claude 能自检 |
| **先探索后规划** | 复杂任务用 Plan Mode 分离研究和执行 |
| **精确上下文** | 越具体的指令，需要纠正的次数越少 |
| **及时纠正** | 两次纠正后仍出错？用 `/clear` 重置对话 |
| **双会话模式** | 会话 A 写代码，会话 B 审查，互不干扰 |
| **小型 PR** | 变更尽量小而专注，减少审查负担 |

### Claude Code 技巧

| 操作 | 方式 |
|------|------|
| 进入 Plan Mode | `Shift+Tab` 切换，或 `claude --permission-mode plan` |
| 重置对话 | `/clear` |
| 回溯 | `/rewind` 或双击 `Esc` |
| 子代理探索 | `"use subagents to investigate X"` |
| 重命名会话 | `/rename session-name` |
| 一键提交 | `/commit-push-pr` |
| 恢复会话 | `claude --continue` |

---

## 通用规范 | General Guidelines

本项目遵循 **frontend-dev-guidelines** 规范，包含：

- 项目结构与组件开发
- SCSS 样式规范
- i18n 国际化
- 测试与 Storybook
- Git 工作流

> **Quick Ref** 见下方章节。**详细规范** 见 `frontend/docs/tech/INDEX.md`。

---

## 核心速查 | Quick Reference ⭐

### 组件开发 | Component Development

| 场景       | Action                                                           |
| ---------- | ---------------------------------------------------------------- |
| 创建新组件 | `ComponentName/` 目录，包含 `.tsx`、`.module.scss`、`index.ts`   |
| 添加测试   | 组件添加 `data-testid`，Story 使用 `canvasElement.querySelector` |
| i18n key   | `t('key.name')` - **无命名空间前缀**                             |
| SCSS 文件  | `ComponentName.module.scss` - **禁止** `styles.module.scss`      |
| 嵌套限制   | SCSS 最多 3 层                                                   |

### Git 工作流 | Git Workflow

| 操作     | Command                                                              |
| -------- | -------------------------------------------------------------------- |
| 创建分支 | `git checkout -b feature/xxx`                                        |
| 提交信息 | `feat: description`、`fix: description`、`refactor: description`     |
| 验证     | `npm run format && npm run lint && npx tsc --noEmit && npm run test` |

### 禁止事项 | Forbidden

| 类别 | 禁止                              |
| ---- | --------------------------------- |
| i18n | key 使用命名空间前缀              |
| SCSS | `styles.module.scss`，嵌套 > 3 层 |
| 测试 | CSS 选择器代替 `data-testid`      |
| 组件 | 无对应 Story                      |
| 导出 | 默认导出                          |
| API  | 组件内部直接调用 API              |

---

## 常用命令 | Commands

```bash
# 开发 | Development
npm run dev              # 启动 Vite 开发服务器 (端口 3000)

# 测试 | Testing
npm run test            # 运行所有测试 (Vitest + Storybook)
npm run test:unit       # 仅运行 Vitest 单元测试
npm run test:stories    # 仅运行 Storybook 组件测试
npm run storybook       # 启动 Storybook UI (端口 6006)
npx playwright test     # 运行 E2E 测试
npx playwright test --ui # E2E 测试 UI 模式

# 构建 | Build
npm run build           # TypeScript 检查 + Vite 构建
npm run preview         # 预览生产构建

# 代码质量 | Code Quality
npm run lint            # ESLint 检查 TypeScript/TSX
npm run format          # Prettier 格式化所有文件
npm run format:check    # 仅检查格式
```

---

## 目录结构 | Directory Structure

```
src/
├── features/           # 功能模块 (stories/ 中有对应目录)
│   ├── course/        # 课程搜索、详情、管理
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── index.ts
│   ├── user/          # 登录、注册、个人中心
│   ├── review/        # 评价、评分
│   ├── teacher/       # 教师入驻、仪表盘
│   ├── home/          # 首页
│   └── static/        # 静态页面 (关于、联系、隐私)
├── components/        # 可复用组件
│   ├── ui/           # 基础 UI 组件 (Button, Loading, CourseCard)
│   ├── shared/        # 跨功能组件 (Header, Footer)
│   └── layout/        # 布局组件
├── hooks/             # 自定义 Hooks
├── services/          # API 服务 (Axios)
├── stores/            # Zustand 全局状态
├── utils/             # 工具函数
├── styles/            # 全局样式 + SCSS 变量
├── locales/           # i18n 资源文件 (en/, zh/)
├── types/            # TypeScript 类型定义
└── data/             # 静态数据

stories/              # Storybook 故事 (与 src/features/ 结构对应)
├── UI/               # 基础 UI 组件故事
├── Shared/           # 共享组件故事
└── features/         # 功能组件故事

src/test/e2e/        # E2E 测试 (Playwright)
├── setup/            # 测试配置和工具
│   ├── msw-setup.ts         # MSW 测试工具
│   └── test-data.ts         # 测试数据生成器
└── specs/            # 测试用例
    ├── home.spec.ts         # 首页测试
    ├── auth.spec.ts         # 认证测试
    ├── courses.spec.ts      # 课程搜索测试
    └── edge-cases.spec.ts   # 边缘场景测试
```

---

## 项目特定配置 | Project Config

### 设计令牌 | Design Tokens

颜色变量位于 `src/styles/_variables.scss`：

```scss
// 主要颜色 | Primary Colors
$color-primary: #1677ff; // 主色
$color-success: #52c41a; // 成功色
$color-warning: #faad14; // 警告色
$color-error: #ff4d4f; // 错误色

// 中性色 | Neutral Colors
$color-white: #ffffff;
$color-bg-base: #f5f5f5;
$color-text-primary: #262626;
$color-text-secondary: #8c8c8c;
$color-border: #d9d9d9;

// 信任等级颜色 | Trust Level Colors
$color-trust-s: #52c41a; // S级 - 绿色
$color-trust-a: #1677ff; // A级 - 蓝色
$color-trust-b: #722ed1; // B级 - 紫色
$color-trust-c: #faad14; // C级 - 黄色
$color-trust-d: #ff4d4f; // D级 - 红色
```

### 圆角 | Border Radius

```scss
$radius-sm: 4px;
$radius-base: 6px;
$radius-lg: 8px;
$radius-round: 9999px; // 胶囊/圆形
```

### 间距 | Spacing

```scss
$spacing-1: 4px;
$spacing-2: 8px;
$spacing-3: 12px;
$spacing-4: 16px;
// ... 递增 4px
```

### 字体大小 | Font Size

```scss
$font-size-xs: 12px;
$font-size-sm: 14px;
$font-size-base: 14px;
$font-size-lg: 16px;
$font-size-xl: 20px;
```

### 状态管理 | State Management

| 类型       | 工具                                     | 用途                  |
| ---------- | ---------------------------------------- | --------------------- |
| 全局状态   | Zustand (`src/stores/`)                  | 用户登录状态、UI 状态 |
| 服务端状态 | TanStack Query (`@tanstack/react-query`) | API 数据缓存、同步    |
| 客户端状态 | React local state                        | 临时 UI 状态          |

### Mock 数据 | Mock Data

- 开发/测试使用 MSW (Mock Service Worker)
- 位于 `src/mocks/` 目录
- Storybook 自动加载 MSW 处理器
- E2E 测试使用 `src/test/e2e/setup/msw-setup.ts` 中的工具

### 测试数据 | Test Data

**E2E 测试使用 30 个课程数据** (id: 1-30):

| ID 范围 | 用途         |
| ------- | ------------ |
| 1-15    | 基础课程数据 |
| 16-30   | 分页测试数据 |

详见 `src/mocks/data/apiData.ts`

### i18n 命名空间 | i18n Namespaces

| 命名空间 | 文件                   | 用途     |
| -------- | ---------------------- | -------- |
| home     | locales/en/home.json   | 首页     |
| search   | locales/en/search.json | 课程搜索 |
| about    | locales/en/about.json  | 关于页面 |
| common   | locales/en/common.json | 共享文本 |

**i18n 注意事项 | i18n Notes**:

```typescript
// ✅ Correct - 无前缀
const { t } = useTranslation('search');
t('course.perLesson');

// ❌ Wrong - 命名空间前缀多余
const { t } = useTranslation('about');
t('about.hero.title');
```

### 路径别名 | Path Aliases

```typescript
'@/' 映射到 'src/'
// 导入示例: import { Button } from '@/components/ui/Button';
```

---

## API 规范 | API Standards

### API 调用模式 | API Calling Patterns

```typescript
// ✅ Correct - 组件通过 props 接收数据，Storybook 可直接模拟
interface Props {
  courseId: string;
  onSuccess?: () => void;
}
function CourseDetail({ courseId, onSuccess }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => fetchCourse(courseId),
  });
  // ...
}

// ❌ Wrong - 组件内部直接调用 API
function CourseDetail({ courseId }: { courseId: string }) {
  const { data } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => services.course.getCourse(courseId), // 难以在 Storybook 中模拟
  });
}
```

### API 文件结构 | API File Structure

```
src/services/
├── api.ts              # Axios 实例配置
├── course.ts          # 课程相关 API
├── user.ts            # 用户相关 API
└── ...
```

---

## 核心依赖 | Core Dependencies

- React 19 + TypeScript 5
- Vite 7 构建工具
- Ant Design 6 + Ant Design Mobile 5
- Zustand 状态管理
- TanStack Query 服务端状态
- React Router 7 路由
- react-i18next 国际化
- Axios HTTP 客户端
- MSW (Mock Service Worker) API Mock

---

## Git 工作流规范 | Git Workflow

### 分支命名 | Branch Naming

| 前缀        | 用途     | 示例                          |
| ----------- | -------- | ----------------------------- |
| `feature/`  | 新功能   | `feature/course-search`       |
| `bugfix/`   | Bug 修复 | `bugfix/fix-loading-issue`    |
| `refactor/` | 代码重构 | `refactor/refactor-api-layer` |
| `tech/`     | 技术任务 | `tech/add-e2e-tests`          |

### 提交信息格式 | Commit Message Format

```
<type>: <subject>

- Change 1
- Change 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

**Type 类型 | Type**:

- `feat:` 新功能
- `fix:` Bug 修复
- `refactor:` 重构
- `chore:` 维护任务
- `docs:` 文档修改
- `style:` 代码格式
- `test:` 测试相关

### Pull Request 要求 | PR Requirements

- 所有测试通过
- 无 TypeScript 错误
- 无 lint 问题
- 代码已格式化
- 新组件有对应 Story
- PR 描述包含变更说明

---

## 详细规范 | Detailed Guidelines

需要深入了解？请查阅 **frontend-dev-guidelines** (`frontend/docs/tech/INDEX.md`)：

| 主题         | 文件                         |
| ------------ | ---------------------------- |
| 组件拆分原则 | `references/COMPONENTS.md`   |
| Story 编写   | `references/STORYBOOK.md`    |
| i18n 进阶    | `references/I18N.md`         |
| SCSS 进阶    | `references/SCSS.md`         |
| 测试模式     | `references/TESTING.md`      |
| Mock 模式    | `references/MOCKING.md`      |
| 代码质量     | `references/CODE_QUALITY.md` |
| 设计规范     | `references/DESIGN.md`       |

---

## 问题排查 | Troubleshooting

### 开发问题

| 问题 | 解决方案 |
| ---- | -------- |
| 颜色/样式 | 参考 `_variables.scss` |
| SCSS 错误 | 见 `frontend/docs/tech/INDEX.md` → SCSS 章节 |
| 测试失败 | 添加 `data-testid`，使用 `canvasElement.querySelector` |
| E2E 测试失败 | 运行 `npx playwright test --project=chromium --debug` |
| E2E 端口问题 | 检查 dev server 端口 (默认 3001) |
| E2E 超时 | 增加 `actionTimeout`/`navigationTimeout` |
| i18n 不工作 | 检查命名空间前缀 (无前缀) |
| Lint/TS 错误 | 运行 `npm run lint && npx tsc --noEmit` |
| Storybook 问题 | 见 `frontend/docs/tech/INDEX.md` → Storybook 章节 |
| 组件结构 | 见 `frontend/docs/tech/INDEX.md` → Components 章节 |
| 设计问题 | 参考 DESIGN.md |
| MSW Mock 不工作 | 检查 `src/mocks/handlers.ts` |
| E2E 数据不足 | 参考 `src/test/e2e/setup/test-data.ts` |

### Claude Code 问题

| 问题 | 解决方案 |
| ---- | -------- |
| Claude 多次纠正无效 | `/clear` 重置对话，更精确描述需求 |
| 上下文混乱 | 不同任务间 `/clear` 重置 |
| 忘记会话内容 | `claude --continue` 恢复最近会话 |
| 需要并行工作 | 用 Git worktree 创建独立目录 |
| 想深入探索代码 | 进入 **Plan Mode** (`Shift+Tab`) |
| 需要特定专家审查 | 开启新会话专门审查 |

---

## 参考资源 | References

**Claude Code 官方文档**：

- [Claude Code Overview](https://code.claude.com/docs/en/overview)
- [Common Workflows](https://code.claude.com/docs/en/common-workflows)
- [Best Practices](https://code.claude.com/docs/en/best-practices)

**GitHub 最佳实践**：

- [PR Best Practices](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/getting-started/best-practices-for-pull-requests)
