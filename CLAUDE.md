# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mono repo for FindClass.nz - a course search and management platform serving the New Zealand market. Contains:

- **Backend**: Express.js 5 + TypeScript API with AWS SDK (DynamoDB, Lambda, S3, SES, SQS)
- **Frontend**: React 19 + TypeScript SPA with Ant Design 6
- **Documentation**: Architecture and product docs

## Common Commands

### Backend (run from `backend/` directory)

```bash
# Development (port 3000)
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format:fix

# Full check (lint + format + typecheck)
npm run check

# Unit tests
npm run test:unit

# Integration tests (requires Docker for DynamoDB Local)
npm run test:integration

# Tests with coverage
npm run test:coverage

# Build
npm run build

# Build Lambda bundle
npm run lambda:build

# Start production server
npm run start

# OpenAPI docs generation
ts-node scripts/generate-openapi.ts
```

### Frontend (run from `frontend/` directory)

```bash
# Development (port 3000)
npm run dev

# Type checking & build
npm run build

# Unit tests
npm run test:unit

# Storybook component tests (port 6006)
npm run test:stories

# Storybook UI
npm run storybook

# Build Storybook
npm run build-storybook

# Playwright E2E tests
npx playwright test

# Linting
npm run lint

# Formatting
npm run format
```

### Docker Development

```bash
# Start all services (DynamoDB Local, LocalStack, API, Frontend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Architecture

### Backend Structure

```
backend/src/
├── app.ts              # Express app configuration, middleware setup
├── server.ts           # Server entry point
├── config/             # Environment schema, validation, Swagger
├── core/               # Errors, helpers, logger
├── modules/            # Feature modules (auth, users, courses, teachers)
│   └── {module}/
│       ├── controller.ts
│       ├── service.ts
│       ├── routes.ts
│       └── types.ts
├── shared/             # DB (DynamoDB), middleware (auth), SMTP, types
└── lambda/             # AWS Lambda handlers
```

**Key Patterns:**
- Custom `AppError` class with `ErrorCode` enum in `src/core/errors.ts`
- `createSuccessResponse()` wrapper for API responses
- JWT authentication with token blacklist
- Single-table DynamoDB design with entity keys
- Path aliases: `@src/*`, `@core/*`, `@shared/*`, `@modules/*`, `@config/*`

### Frontend Structure

```
frontend/src/
├── App.tsx             # React Router routes
├── config/             # App config, languages
├── components/         # Shared UI components (ui/, auth/, cookie/, layout/)
├── features/           # Feature-based modules (course/, home/, review/, teacher/, user/)
│   └── {feature}/
│       └── pages/{PageName}/
├── hooks/              # Custom hooks (useAuth, useCity, useSearch)
├── locales/            # i18n (en/, zh/)
├── services/           # API client, cookie service
├── stores/             # Zustand stores (userStore)
└── types/              # TypeScript types
```

**Key Patterns:**
- React Query for server state
- Zustand for client state
- i18next for internationalization (EN/ZH)
- Feature-based routing with `react-router-dom`
- MSW (Mock Service Worker) for API mocking in tests

### API Response Format

All backend responses use:

```typescript
interface ApiResponse<T> {
  success: boolean;
  code: number;
  message: string;
  data?: T;
  meta: { requestId: string; timestamp: string; locale?: string };
}
```

### Environment Configuration

Backend uses Zod schemas for env validation:
- `src/config/env-schema.ts` - Env variable types
- `src/config/env-loader.ts` - Loads from `src/config/env/.env.*`

Required env vars (see `.env.base`):
- `AWS_REGION`, `DYNAMODB_ENDPOINT`, `DYNAMODB_TABLE_NAME`
- `JWT_SECRET`, `JWT_EXPIRY`
- Email/SES settings

## Testing

- **Backend**: Vitest with 80% coverage threshold, DynamoDB Local via testcontainers
- **Frontend**: Vitest + React Testing Library + MSW, Playwright for E2E
- Tests follow pattern: `tests/unit/{module}/{file}.test.ts`

## Frontend Guidelines

**IMPORTANT**: When working on any frontend code, you MUST refer to `frontend/CLAUDE.md` for detailed guidelines including:

- React + TypeScript coding standards
- SCSS styling conventions
- i18n (internationalization) patterns
- Component structure and Storybook requirements
- Testing requirements (data-testid, etc.)
- Git workflow specific to frontend

Always check `frontend/CLAUDE.md` before making changes to frontend code.

## Backend Guidelines

**IMPORTANT**: When working on any backend code, you MUST refer to `backend/CLAUDE.md` for detailed guidelines including:

- Express.js + TypeScript coding standards
- Error handling with `ErrorCode` enum
- DynamoDB single-table design patterns
- JWT authentication and security practices
- API response format (`createSuccessResponse`)
- Testing requirements (80% coverage, auth module 100%)
- Path aliases: `@src/*`, `@core/*`, `@shared/*`, `@modules/*`, `@config/*`

Always check `backend/CLAUDE.md` before making changes to backend code.

## Notes

- All imports use path aliases (configured in `tsconfig.json`)
- Frontend uses ES modules (`"type": "module"`), Backend uses CommonJS
- Frontend code must be run from `frontend/` directory to resolve paths correctly
- Frontend API calls to `http://localhost:3000/api/v1` in development
