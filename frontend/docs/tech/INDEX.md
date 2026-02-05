---
name: frontend-dev-guidelines
description: |
  Universal frontend development guidelines covering project structure,
  coding standards, component patterns, SCSS, i18n, testing, and Storybook.
---

# Frontend Development Guidelines

## Quick Navigation

| Topic | Reference |
| ------ | ----------|
| Project structure | [PROJECT.md](./references/PROJECT.md) |
| Components & Stories | [COMPONENTS.md](./references/COMPONENTS.md) |
| Testing | [TESTING.md](./references/TESTING.md) |
| Storybook | [STORYBOOK.md](./references/STORYBOOK.md) |
| API + Storybook | [STORYBOOK.md#api-calling-patterns](./references/STORYBOOK.md#api-calling-patterns-storybook-compatible) |
| i18n | [I18N.md](./references/I18N.md) |
| SCSS | [SCSS.md](./references/SCSS.md) |
| Code quality | [CODE_QUALITY.md](./references/CODE_QUALITY.md) |
| Design | [DESIGN.md](./references/DESIGN.md) |

## Problem Solver

| Problem | Solution |
|---------|---------|
| SCSS errors | [SCSS.md](./references/SCSS.md) - nesting limit, naming |
| Test fails | [TESTING.md](./references/TESTING.md) - data-testid |
| i18n not working | [I18N.md](./references/I18N.md) - namespace prefix |
| Lint/TS errors | [CODE_QUALITY.md](./references/CODE_QUALITY.md) |
| Storybook issues | [STORYBOOK.md](./references/STORYBOOK.md) |
| Component needs API | [STORYBOOK.md#api-calling-patterns](./references/STORYBOOK.md#api-calling-patterns-storybook-compatible) |
| Component structure | [COMPONENTS.md](./references/COMPONENTS.md) |
| Design questions | [DESIGN.md](./references/DESIGN.md) |

## Tech Stack

- React + TypeScript + Vite
- SCSS Modules
- Component Library (Ant Design, shadcn/ui, etc.)
- Storybook + Vitest
- react-i18next

## Commands

```bash
npm run dev          # Dev server
npm run storybook    # Storybook
npm run lint         # ESLint (required)
npm run format       # Prettier auto-fix
npm run format:check  # Prettier check only
npm run test         # Tests (required)
npm run build        # Production
```

## Critical Rules

### i18n (Most Common Bug)

```typescript
// ✅ Correct
const { t } = useTranslation('namespace');
t('key.name'); // no prefix

// ❌ Wrong - namespace prefix
const { t } = useTranslation('namespace');
t('namespace.key.name'); // redundant!
```

### Testing

```typescript
// ✅ Use data-testid with canvasElement.querySelector
const button = canvasElement.querySelector('[data-testid="save-button"]') as HTMLButtonElement;

// ✅ Use role selector
const button = canvasElement.querySelector('button[type="submit"]') as HTMLButtonElement;

// ❌ Wrong - canvas.getByTestId may not work
const button = canvas.getByTestId('save-button');

// ❌ CSS selectors - hard to test, use data-testid
const button = canvasElement.querySelector('.component-class');
```

### SCSS Naming

```scss
// ✅ Correct
ComponentName.module.scss

// ❌ Wrong
styles.module.scss
```

## Project Structure

```
src/
├── features/              # Feature-based modules
│   ├── feature-name/
│   │   ├── pages/
│   │   │   └── PageName/
│   │   ├── components/
│   │   └── index.ts
├── components/            # Shared components
│   ├── ui/              # Base UI (Button, Card, Modal)
│   ├── shared/          # Cross-feature components
│   └── layout/          # Layout components
├── pages/                # Root page routes
├── styles/              # Global styles
├── hooks/
├── services/
├── stores/
├── utils/
├── locales/             # i18n (en/, zh/)
├── types/
└── data/

stories/
├── features/            # Mirrors src/features/ structure
├── components/          # Shared components
└── ui/                 # Base UI components
```

## Pre-Commit Checklist

**BEFORE COMMITTING CODE, YOU MUST ENSURE:**

1. **TypeScript Compilation** passes:
   ```bash
   npx tsc --noEmit
   ```

2. **Lint** passes:
   ```bash
   npm run lint
   ```

3. **Prettier** passes:
   ```bash
   npm run format:check
   ```

4. **All Tests** pass:
   ```bash
   npm run test
   ```

**Complete Validation:**
```bash
npm run format && npm run lint && npx tsc --noEmit && npm run test
```

## Forbidden

| Category | Forbidden |
|----------|-----------|
| i18n | Namespace prefix in key |
| SCSS | `styles.module.scss`, nesting > 3 |
| Testing | CSS selectors instead of data-testid |
| Components | No story |
| Testing | No interaction test |
| Components | Duplicate code (extract to shared) |
| Pages | Large index.tsx (use sections/ directory) |
| Exports | Default export (use named export only) |
| API Calls | Component calls API internally (see STORYBOOK.md) |

## Git Workflow

### 1. Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

**Branch naming:**
- `feature/` - New features
- `bugfix/` - Bug fixes
- `refactor/` - Code refactoring
- `tech/` - Technical tasks

### 2. Make Changes & Commit

```bash
git add .
git commit -m "feat: add feature description

- Change 1
- Change 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

**Commit message format:**
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code refactoring
- `chore:` Maintenance tasks
- `docs:` Documentation changes
- `style:` Code style changes
- `test:` Test additions/modifications

### 3. Push & Create Pull Request

```bash
git push -u origin feature/your-feature-name
gh pr create --title "feat: title" --body "Description"
```

### 4. PR Requirements

- All tests pass
- No TypeScript errors
- No linting issues
- Code is formatted
- New components have stories
- Changes documented in PR description
