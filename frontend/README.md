# FindClass.nz Frontend

新西兰课程搜索与导师匹配平台前端项目。

## Tech Stack

| 类别       | 技术                                           |
| ---------- | ---------------------------------------------- |
| Framework  | React 19 + TypeScript                          |
| Build      | Vite                                           |
| UI Library | Ant Design 6 + Ant Design Mobile               |
| Styling    | Tailwind CSS + CSS Modules                     |
| State      | Zustand (global) + TanStack Query (server)     |
| Routing    | React Router 7                                 |
| Testing    | Storybook (交互测试 + A11y) + Playwright (E2E) |
| i18n       | react-i18next                                  |
| Storybook  | Component Development + Testing                |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run Storybook tests (main testing command)
npm run test

# Start Storybook UI
npm run storybook

# Build for production
npm run build

# Code quality
npm run lint
npm run format
```

## Project Structure

```
src/
├── components/              # Reusable components
│   ├── ui/                  # Base UI components (Loading, CourseCard)
│   ├── shared/              # Page-shared components (Header, Footer)
│   └── cookie/              # Feature modules (CookieConsent)
├── pages/                   # Page components
│   ├── HomePage/
│   │   ├── sections/        # Page-specific sections
│   │   └── index.tsx
│   └── NotFoundPage/
├── hooks/                   # Custom hooks
├── services/                # API services
├── stores/                  # Zustand stores
├── utils/                   # Utilities
├── styles/                  # Global styles
├── locales/                 # i18n files
├── types/                   # TypeScript types
└── data/                    # Static data

stories/                     # Storybook stories
├── UI/                      # Base UI components
├── Shared/                  # Shared components
├── Components/              # Page sections
└── Pages/                   # Page components
```

## Testing Strategy

本项目采用 **Storybook-Driven Testing**，所有组件测试都集成在 Storybook 中：

- **渲染测试** → Storybook Default story
- **交互测试** → Storybook `play` function
- **无障碍测试** → Storybook a11y addon

```bash
# 主要测试命令 - 运行所有测试
npm run test

# 启动 Storybook UI 进行手动测试
npm run storybook
```

**当前状态：27 Stories，137 Tests**

## Documentation

| 文档                                          | 说明                        |
| --------------------------------------------- | --------------------------- |
| [开发规范索引](docs/DEVELOPMENT_GUIDELINE.md) | 索引 + 问题排查指南         |
| [SCSS 规范](docs/SASS_GUIDELINES.md)          | CSS Modules、变量、嵌套规则 |
| [测试策略](docs/TESTING_STRATEGY.md)          | 测试工具、命令、文件结构    |
| [i18n 规范](docs/I18N_GUIDELINES.md)          | 国际化配置、命名空间        |
| [代码规范](docs/CODING_STANDARDS.md)          | Lint、TypeScript、Git       |
| [组件模式](docs/COMPONENT_PATTERN.md)         | 组件结构、Story 模板        |
| [功能清单](PAGE_FUNCTION_CHECKLIST.md)        | 页面/功能开发追踪           |

**快速导航：**

```
遇到问题？→ 先查 docs/DEVELOPMENT_GUIDELINE.md
```

## Current Status

| Category   | Status                          |
| ---------- | ------------------------------- |
| Pages      | 8 pages completed               |
| Components | 12 page components with stories |
| Stories    | 27 testable stories             |
| Tests      | 137 tests passing               |
| i18n       | English + Chinese               |
