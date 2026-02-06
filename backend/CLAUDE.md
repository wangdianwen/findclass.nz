# AGENTS.md - findclass.nz Backend Development Guide

> This guide provides essential information for AI agents working on this codebase.

## Quick Commands

| Command                       | Description                              |
| ----------------------------- | ---------------------------------------- |
| `npm run dev`                 | Start development server with hot reload |
| `npm run build`               | Build TypeScript + generate OpenAPI docs |
| `npm run start`               | Run production server                    |
| `npm run seed`                | Seed database with sample data           |
| `npm test`                    | Run all tests                            |
| `npm run test:unit`           | Run only unit tests                      |
| `npm run test:coverage`       | Run tests with coverage report           |
| `npx vitest run <file>`       | Run single test file                     |
| `npx vitest -t "<test-name>"` | Run tests matching pattern               |
| `npm run lint:fix`            | Run ESLint with auto-fix                 |
| `npm run format:fix`          | Format code with Prettier                |
| `npm run check`               | Run lint + format + typecheck            |
| `npm run typecheck`           | TypeScript type checking                 |
| `npm run lambda:build`        | Build Lambda bundle                      |

## Project Structure

```
src/
├── config/           # Configuration modules (env, schema)
├── core/             # Core (errors, helpers, logger)
├── modules/          # Feature modules (auth, courses, teachers, users)
├── shared/           # Shared (db, middleware, types, utils)
│   └── db/          # Database (PostgreSQL, cache, seeding)
├── app.ts            # Express app setup
├── server.ts         # Entry point
└── lambda/           # AWS Lambda handler
tests/
├── unit/             # Unit tests
└── integration/      # Integration tests
```

## Code Style Guidelines

### TypeScript

- **Strict mode enabled**: Enable all strict flags in TypeScript
- **No `any`**: Avoid `any` type; use `unknown` or specific types
- **Null checks**: Handle `null`/`undefined` explicitly; no non-null assertions
- **No unchecked indexed access**: Use `?.` and type guards
- **Unused code**: Prefix unused parameters with `_` (e.g., `_event`)

### Naming Conventions

| Type       | Convention       | Example                 |
| ---------- | ---------------- | ----------------------- |
| Files      | kebab-case       | `auth.service.ts`       |
| Classes    | PascalCase       | `AuthService`           |
| Functions  | camelCase        | `sendVerificationCode`  |
| Constants  | UPPER_SNAKE_CASE | `VERIFICATION_CODE_TTL` |
| Interfaces | PascalCase       | `UserResponse`          |
| Types      | PascalCase       | `AuthToken`             |
| Test files | `*.test.ts`      | `auth.service.test.ts`  |

### Imports

- Use path aliases: `@src/*`, `@core/*`, `@shared/*`, `@modules/*`
- Group imports: external → internal → relative
- No barrel exports from modules (export each file directly)

### Formatting (Prettier)

```javascript
{
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
  arrowParens: 'avoid'
}
```

### Error Handling

Use `createAppError` with `ErrorCode` enum from `@core/errors`:

```typescript
import { createAppError, ErrorCode } from '@core/errors';

throw createAppError('User not found', ErrorCode.USER_NOT_FOUND);
```

**Common ErrorCodes**: `AUTH_INVALID_TOKEN`, `AUTH_EMAIL_EXISTS`, `AUTH_INVALID_CODE`, `RATE_LIMIT_EXCEEDED`, `USER_NOT_FOUND`, `FORBIDDEN`

### Security

- **Passwords**: Minimum 12 chars, must contain uppercase, lowercase, number, special char
- **Random values**: Use `crypto.randomInt()`, never `Math.random()`
- **User enumeration**: Password reset/login return generic errors
- **Logging**: Never log passwords, tokens,验证码, or PII
- **Rate limiting**: Auth endpoints enforce rate limits (3-5 req/min)

### Testing

- Unit tests: `tests/unit/<module>/`
- Integration tests: `tests/integration/<module>/`
- Mock with Vitest: `vi.mock('@src/modules/auth/auth.service')`
- Use fixtures for test data
- Auth module coverage: 100%, other modules: 80%

## Database (PostgreSQL)

- **Primary database**: PostgreSQL 15
- **Connection**: via `DATABASE_URL` environment variable
- **Cache**: In-memory cache (Node-Redisman) with PostgreSQL fallback
- **Rate Limiting**: PostgreSQL-based sliding window counter

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://findclass:findclass_dev@localhost:5432/findclass` |
| `SEED_SAMPLE_DATA` | Whether to seed sample data | `false` |

### Environment Files

| File | Purpose |
|------|---------|
| `.env.base` | Base configuration (shared across all environments) |
| `.env.local` | Local development overrides |
| `.env.staging` | Staging environment (with seeded data) |
| `.env.test` | Test environment (TestContainers) |
| `.env.prod` | Production environment |

### Database Seeding

For staging/preview environments, run:

```bash
npm run seed
# or
SEED_SAMPLE_DATA=true npm run dev
```

## Git Commit Convention

```
<type>(<module>): <description>

Types: feat, fix, docs, refactor, test, chore
Example: feat(auth): implement password reset
```

## Environment

- Node.js 18+
- TypeScript 5.x
- Express.js + JWT + bcrypt
- PostgreSQL for persistence
