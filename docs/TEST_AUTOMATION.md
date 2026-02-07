# Test Automation Guide

This document describes the complete test automation setup for the FindClass.nz project.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Test Architecture](#test-architecture)
- [Staging Environment](#staging-environment)
- [Running Tests](#running-tests)
- [Test Types](#test-types)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The test automation system consists of:

1. **Unit Tests** - Fast function/component level tests
2. **Storybook Tests** - Component rendering tests
3. **E2E Tests** - End-to-end UI tests against dev server
4. **Integration Tests** - Tests against real staging environment

### Key Principles

- **No Mocks**: Integration and E2E tests use real backends
- **Docker-based**: Staging environment runs in Docker containers
- **Production Build**: Integration tests use production-optimized frontend
- **Real Data**: Tests use seeded PostgreSQL database

---

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ and npm
- Ports 3001, 3002, and 5432 available

### Verify Prerequisites

```bash
# Check Docker
docker --version
docker compose version

# Check Node
node --version  # Should be 18+
npm --version

# Check ports (should return nothing if ports are free)
lsof -ti:3001
lsof -ti:3002
lsof -ti:5432
```

---

## Test Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Environments                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Port 3000  │  │   Port 3001  │  │   Port 3002  │      │
│  │              │  │              │  │              │      │
│  │   Dev API    │  │ Staging API  │  │ Staging FE   │      │
│  │              │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                 │               │
│         │                 │                 │               │
│         └─────────────────┴─────────────────┘               │
│                           │                                 │
│                    ┌──────▼──────┐                         │
│                    │  PostgreSQL │                         │
│                    │   (5432)    │                         │
│                    └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### Environment Comparison

| Feature           | Unit Tests | Storybook | E2E Tests | Integration Tests |
| ----------------- | ---------- | --------- | --------- | ------------------ |
| **Config File**   | `vitest.config.ts` | `.storybook/test.ts` | `playwright.config.ts` | `playwright.integration.config.ts` |
| **Server**        | None       | None      | Dev Server (3001) | Staging API (3001) |
| **Frontend**      | None       | Storybook | Dev Server (3001) | Staging FE (3002) |
| **Database**      | Mocked     | Mocked    | Dev Server | PostgreSQL (seeded) |
| **Build**         | None       | Dev build | Dev build | Production build |
| **Execution**     | Vitest     | Vitest    | Playwright | Playwright |
| **Parallel**      | Yes        | Yes       | Yes        | No (sequential) |

---

## Staging Environment

The staging environment is a Docker-based local environment that mirrors production.

### Services

| Service        | Port  | Description                          |
| -------------- | ----- | ------------------------------------ |
| Staging API    | 3001  | Backend with sample data             |
| Staging FE     | 3002  | Production build connected to staging |
| PostgreSQL     | 5432  | Database with seeded data            |

### Test Accounts

| Email                 | Password      | Role    | Usage            |
| --------------------- | ------------- | ------- | ---------------- |
| demo@findclass.nz     | Password123   | User    | General testing  |
| teacher@findclass.nz  | Password123   | Teacher | Teacher features |

> **Note**: Password changed from `password123` to `Password123` (capital P)

### Sample Data

When `SEED_SAMPLE_DATA=true` (default for staging), the database is populated with:

- 30+ sample courses
- 10+ sample teachers
- Various subjects (Math, English, Music, etc.)
- Multiple cities (Auckland, Wellington, Christchurch)
- Sample reviews and ratings

---

## Running Tests

### Staging Environment Management

```bash
# Start staging environment
docker-compose up -d

# Rebuild and start (if code changed)
docker-compose up -d --build

# Check service status
docker-compose ps

# View logs
docker-compose logs -f staging-api staging-frontend

# Stop services
docker-compose stop

# Stop and remove all volumes (⚠️ deletes data)
docker-compose down -v

# Restart specific service
docker-compose restart staging-api
```

### Health Checks

```bash
# Check API health
curl http://localhost:3001/health

# Check frontend health
curl http://localhost:3002/health

# Wait for services to be ready
docker-compose up -d
# Wait for healthy status (docker handles this automatically)
```

---

## Test Types

### 1. Unit Tests

Fast, isolated tests for functions and components.

**Run**:
```bash
npm run test:unit
```

**Config**: `frontend/vitest.config.ts` (project: unit)

**What it tests**:
- Utility functions
- React components (in isolation)
- Business logic
- State management (Zustand)

**Features**:
- ✅ Fast execution (< 30 seconds)
- ✅ No external dependencies
- ✅ No network calls
- ✅ Full code coverage reporting

### 2. Storybook Tests

Component rendering and interaction tests using Storybook.

**Run**:
```bash
npm run test:stories
```

**Config**: `frontend/vitest.config.ts` (project: storybook)

**What it tests**:
- Component rendering
- User interactions (click, type, etc.)
- Component props
- Visual regression (manual)

**Features**:
- ✅ Isolated component testing
- ✅ Interactive UI testing
- ✅ No backend dependency
- ✅ Great for UI components

**View Storybook**:
```bash
npm run storybook
# Opens at http://localhost:6006
```

### 3. E2E Tests

End-to-end UI tests against the development server.

**Run**:
```bash
# Start dev server first
npm run dev

# In another terminal, run tests
npm run test:e2e

# With UI mode
npm run test:e2e:ui

# Debug mode
npm run test:e2e -- --debug
```

**Config**: `frontend/playwright.config.ts`

**Test Files**:
- `auth.spec.ts` - Authentication flows
- `courses.spec.ts` - Course listing and search
- `home.spec.ts` - Home page functionality
- `edge-cases.spec.ts` - Edge cases and error handling

**Features**:
- ✅ Full user flows
- ✅ Real browser automation
- ✅ Network requests handled by dev server
- ✅ Cross-browser support (Chrome, Firefox, Safari)
- ✅ Mobile device testing

**Test Accounts**:
```typescript
// Uses seeded demo account
const TEST_USER = {
  email: 'demo@findclass.nz',
  password: 'Password123'
};
```

### 4. Integration Tests

End-to-end tests against the **real staging environment** (production build).

**Run**:
```bash
# Ensure staging is running
docker-compose up -d

# Run tests
cd frontend
npm run test:e2e:integration

# With UI mode
npm run test:e2e:integration:ui

# Debug mode
npm run test:e2e:integration -- --debug

# Run specific test
npm run test:e2e:integration -- --grep "INT-001"
```

**Config**: `frontend/playwright.integration.config.ts`

**Test File**: `integration-flow.spec.ts`

**Test Scenarios**:

| ID     | Scenario                 | Description                              |
| ------ | ------------------------ | ---------------------------------------- |
| INT-001| User Registration        | Complete registration with email verify   |
| INT-002| User Login               | Login with demo credentials, validation   |
| INT-003| Course Search & Filter   | Search, filter by city/subject, pagination |
| INT-004| Course Detail View       | Navigate list → detail, related courses   |
| INT-005| Teacher Application      | Submit teacher application, status check   |
| INT-006| Favorites                | Add/remove favorites, view favorites list |

**Test Helpers**: `frontend/src/test/e2e/setup/integration-helpers.ts`

```typescript
// Available helpers
setupIntegrationTest()           // Verify staging, create API context
createTestUser(email, password)  // Register new test user
loginAsDemo(apiContext)          // Login with demo account
searchCourses(apiContext, params)// Search courses via API
teardownIntegrationTest()        // Cleanup test data
```

**Features**:
- ✅ Real backend (no mocks)
- ✅ Production build optimization
- ✅ Real database with seeded data
- ✅ Full user flow testing
- ✅ JWT authentication
- ✅ Sequential execution (avoids rate limits)

**Known Issues**:
- ⚠️ Favorite button rendering (2 skipped tests due to UI bug)
- ℹ️ Tests use direct API calls for setup (faster, more reliable)

---

## Best Practices

### Development Workflow

#### 1. Feature Development

```bash
# 1. Start development server
npm run dev

# 2. Write unit tests first
npm run test:unit

# 3. Write Storybook stories
npm run storybook

# 4. Run component tests
npm run test:stories

# 5. Test manually in browser
# Open http://localhost:3000
```

#### 2. Integration Testing

```bash
# 1. Start staging environment
docker-compose up -d

# 2. Wait for services to be healthy
# (automatic health checks in docker-compose)

# 3. Run integration tests
npm run test:e2e:integration

# 4. Check results
# View HTML report: frontend/playwright-report/integration/index.html

# 5. Stop staging when done
docker-compose stop
```

#### 3. Before Committing

```bash
# Backend tests
cd backend
npm run test:unit
npm run lint
npm run typecheck

# Frontend tests
cd frontend
npm run test:unit
npm run test:stories
npm run lint
npx tsc --noEmit

# Integration tests (optional, if backend changed)
docker-compose up -d
npm run test:e2e:integration
docker-compose stop
```

#### 4. Before Pushing

```bash
# Full test suite
npm run test:unit
npm run test:stories
npm run test:e2e
npm run test:e2e:integration

# Code quality checks
npm run lint
npm run typecheck
```

### Writing Tests

#### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule';

describe('myFunction', () => {
  it('should return correct result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

#### Integration Tests

```typescript
import { test, expect } from '@playwright/test';
import { setupIntegrationTest, loginAsDemo } from '@/test/e2e/setup/integration-helpers';

test('INT-XXX: should do something', async ({ page }) => {
  // Setup
  const apiContext = await setupIntegrationTest();
  const loginData = await loginAsDemo(apiContext);

  // Inject auth token
  await page.addInitScript((token: string) => {
    localStorage.setItem('auth_token', token);
  }, loginData.token);

  // Test
  await page.goto('/some-page');
  await expect(page.locator('h1')).toHaveText('Expected Title');

  // Cleanup
  await apiContext.dispose();
});
```

#### Test Guidelines

1. **Use data-testid attributes** for selectors (more stable than CSS classes)
2. **Add unique identifiers** to test data (timestamps, UUIDs) to avoid conflicts
3. **Clean up test data** in `afterEach` or `afterAll` hooks
4. **Use retry logic** for flaky network operations
5. **Write descriptive test names** that explain what is being tested
6. **Test user behavior**, not implementation details

---

## Troubleshooting

### Port Already in Use

**Error**: `Port 3001 is already in use`

**Solution**:
```bash
# Find process using port
lsof -ti:3001

# Kill process
lsof -ti:3001 | xargs kill -9

# Or stop docker services
docker-compose down
```

### Services Not Starting

**Symptoms**: Containers exit immediately

**Debug**:
```bash
# Check logs
docker-compose logs staging-api
docker-compose logs staging-frontend

# Check container status
docker-compose ps

# Restart specific service
docker-compose restart staging-api
```

### Test Failures

#### Backend Not Running

**Error**: `Staging backend is not healthy`

**Solution**:
```bash
# Check status
docker-compose ps

# Restart staging
docker-compose restart staging-api

# Verify health
curl http://localhost:3001/health
```

#### Test Data Missing

**Error**: `Demo account not found`

**Solution**:
```bash
# Reset database (re-seeds data)
docker-compose down -v
docker-compose up -d
```

#### Flaky Tests

**Symptoms**: Tests pass sometimes, fail sometimes

**Solutions**:

1. **Increase timeouts**:
```typescript
test.setTimeout(120000); // 2 minutes
```

2. **Run single test** for debugging:
```bash
npm run test:e2e:integration -- --grep "INT-001"
```

3. **Use debug mode**:
```bash
npm run test:e2e:integration -- --debug
```

4. **Add wait/retry logic**:
```typescript
await page.waitForSelector('[data-testid="element"]', { timeout: 10000 });
```

### Rate Limiting

**Error**: `429 Too Many Requests` (should not happen in staging)

**Solution**: Staging rate limits are set to 10,000 requests per 15 minutes (effectively unlimited). If you still see this error:

```bash
# Restart staging-api to apply config changes
docker-compose restart staging-api
```

### Docker Issues

#### Out of Disk Space

**Symptoms**: Build fails, "no space left on device"

**Solution**:
```bash
# Clean up unused Docker resources
docker system prune -a --volumes

# Remove old images
docker image prune -a
```

#### Container Cache Issues

**Symptoms**: Changes not reflected in running container

**Solution**:
```bash
# Force rebuild
docker-compose up -d --build --force-recreate

# Remove volumes and start fresh
docker-compose down -v
docker-compose up -d
```

---

## Test Files Reference

### Configuration Files

| File                                          | Purpose                             |
| --------------------------------------------- | ----------------------------------- |
| `frontend/vitest.config.ts`                   | Unit test configuration             |
| `frontend/playwright.config.ts`               | E2E test configuration              |
| `frontend/playwright.integration.config.ts`   | Integration test configuration       |
| `docker-compose.yml`                          | Staging environment definition      |

### Test Files

| File                                          | Purpose                     |
| --------------------------------------------- | --------------------------- |
| `frontend/src/test/unit/**/*.test.ts`         | Unit tests                  |
| `frontend/src/test/e2e/specs/*.spec.ts`       | E2E tests                   |
| `frontend/src/test/e2e/specs/integration-flow.spec.ts` | Integration tests    |
| `frontend/src/test/e2e/setup/integration-helpers.ts` | Test utilities     |
| `frontend/src/test/e2e/setup/test-data.ts`    | Test data generators       |
| `frontend/stories/**/*.stories.ts`            | Storybook stories           |
| `backend/tests/unit/**/*.test.ts`              | Backend unit tests         |
| `backend/tests/integration/**/*.test.ts`       | Backend integration tests  |

### Test Scripts

**Root package.json**:
```json
{
  "dev:backend": "npm run dev --workspace=backend",
  "dev:frontend": "npm run dev --workspace=frontend",
  "test:backend": "npm run test --workspace=backend",
  "test:frontend": "npm run test --workspace=frontend"
}
```

**Frontend package.json**:
```json
{
  "test": "NODE_ENV=test vitest run",
  "test:unit": "NODE_ENV=test vitest run --project unit",
  "test:stories": "NODE_ENV=test vitest run --project storybook",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:integration": "playwright test --config=playwright.integration.config.ts",
  "test:e2e:integration:ui": "playwright test --config=playwright.integration.config.ts --ui"
}
```

**Backend package.json**:
```json
{
  "test": "vitest run",
  "test:unit": "vitest run",
  "test:integration": "INTEGRATION_TESTS=true vitest run",
  "test:coverage": "vitest run --coverage"
}
```

---

## Quick Reference

### Common Commands

```bash
# === Staging Environment ===
docker-compose up -d                    # Start staging
docker-compose ps                        # Check status
docker-compose logs -f staging-api       # View logs
docker-compose stop                      # Stop services
docker-compose down -v                   # Remove everything

# === Unit Tests ===
npm run test:unit                        # Run all unit tests

# === Storybook ===
npm run test:stories                     # Run Storybook tests
npm run storybook                        # Start Storybook UI

# === E2E Tests ===
npm run dev                              # Start dev server first
npm run test:e2e                         # Run E2E tests
npm run test:e2e:ui                      # With UI

# === Integration Tests ===
docker-compose up -d                     # Start staging first
npm run test:e2e:integration             # Run integration tests
npm run test:e2e:integration:ui          # With UI
docker-compose stop                      # Stop staging
```

### Test Data

**Demo Account**:
```
Email: demo@findclass.nz
Password: Password123
```

**Sample Course IDs** (for testing):
```
20000000-0000-0000-0000-000000000001
20000000-0000-0000-0000-000000000002
20000000-0000-0000-0000-000000000003
```

---

## Changes from Previous Version

### Removed (Feb 2025)

- ❌ Root package.json staging scripts (use `docker-compose` directly)
- ❌ GitHub Actions workflow (deleted due to cost)
- ❌ MSW (Mock Service Worker) dependency
- ❌ `test:e2e:debug` scripts (use `--debug` flag)
- ❌ `test:e2e:integration:debug` scripts (use `--debug` flag)

### Added

- ✅ Direct Docker Compose workflow
- ✅ Simplified test scripts (removed redundant :debug variants)
- ✅ Updated test architecture (no MSW)
- ✅ Enhanced test documentation
- ✅ Integration test helpers with token caching

---

**Last Updated**: 2025-02-08
**Version**: 2.0.0
**Maintained By**: FindClass.nz Development Team
