# Code Quality

## Pre-Commit Checks

```bash
npm run lint              # ESLint (0 warnings)
npx tsc --noEmit          # TypeScript
npm run test              # Tests
npm run build             # Production build
```

## ESLint Rules

### Common Fixes

```typescript
// ❌ setState in useEffect
useEffect(() => {
  setValue(newValue);
}, []);

// ✅ Lazy initialization
const [value, setValue] = useState(() => initialValue);

// ❌ Ref update in render
const ref = useRef(value);
ref.current = value;

// ✅ Ref update in useEffect
const ref = useRef(value);
useEffect(() => {
  ref.current = value;
}, [value]);
```

## TypeScript

### Type Definitions

```typescript
// ✅ interface for objects
interface User { id: string; name: string; }

// ✅ type for unions
type ButtonVariant = 'primary' | 'secondary' | 'outline';

// ❌ any - avoid
function handleData(data: any) { ... }
```

### Function Types

```typescript
// ✅ Explicit types
type Props = { title: string; onClick: () => void };

export const Button = ({ title, onClick }: Props) => {
  return <button onClick={onClick}>{title}</button>;
};
```

## Git Workflow

### Branch Names

```
✅ Correct
feature/header-refactor
fix/login-validation
docs/update-readme
hotfix/critical-bug

❌ Wrong
fix-1
my-branch
HEADEREFACTOR
```

### Commit Format

```
<type>(<scope>): <subject>

Types:
feat, fix, docs, style, refactor, test, chore
```

### Examples

```
feat(header): add city dropdown
fix(search): fix sorting issue
docs(readme): update install guide
```

## Prettier

```bash
npm run format            # Auto-format
npm run format:check      # Check only
```

## VSCode Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

## Forbidden

| Forbidden               | Reason                      |
| ----------------------- | --------------------------- |
| Code without lint pass  | `npm run lint` required     |
| Code without type check | `npx tsc --noEmit` required |
| Code without tests      | `npm run test` required     |
| Using `any`             | Type safety                 |
| `console.log`           | Use logger                  |
