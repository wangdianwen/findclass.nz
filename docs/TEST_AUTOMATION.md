# Test Automation Guide

This document describes the test automation setup for the FindClass.nz project, including deployment automation and integration testing.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Staging Environment](#staging-environment)
- [Deployment Scripts](#deployment-scripts)
- [Integration Tests](#integration-tests)
- [Troubleshooting](#troubleshooting)
- [CI/CD Integration](#cicd-integration)

---

## Overview

The test automation system consists of:

1. **Staging Deployment** - Automated local staging environment setup
2. **Integration Tests** - End-to-end tests against a real backend (no mocks)
3. **Health Checks** - Automated service readiness verification
4. **Data Cleanup** - Test data management and cleanup utilities

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Local Development                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Port 3000  │  │   Port 3001  │  │   Port 3002  │      │
│  │              │  │              │  │              │      │
│  │ Dev API      │  │ Staging API  │  │ Staging FE   │      │
│  │              │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                 │               │
│         └─────────────────┴─────────────────┘               │
│                           │                                 │
│                    ┌──────▼──────┐                         │
│                    │  PostgreSQL │                         │
│                    │   (5432)    │                         │
│                    └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ and npm
- Bash shell (for deployment scripts)
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

## Staging Environment

The staging environment is a Docker-based local environment that closely mirrors production.

### Services

| Service        | Port  | Description                     |
| -------------- | ----- | ------------------------------- |
| Staging API    | 3001  | Backend with sample data        |
| Staging FE     | 3002  | Frontend connected to staging   |
| PostgreSQL     | 5432  | Database with seeded data       |

### Test Accounts

The staging environment includes pre-configured test accounts:

| Email                 | Password      | Role  | Usage            |
| --------------------- | ------------- | ----- | ---------------- |
| demo@findclass.nz     | password123   | User  | General testing  |
| teacher@findclass.nz  | password123   | Teacher | Teacher features |

### Sample Data

When `SEED_SAMPLE_DATA=true` (default for staging), the database is populated with:

- 30+ sample courses
- 10+ sample teachers
- Various subjects and cities
- Sample reviews and ratings

---

## Deployment Scripts

### Quick Start

```bash
# Deploy staging (start all services)
npm run staging:deploy

# Check status
npm run staging:status

# View logs
npm run staging:logs

# Stop staging
npm run staging:stop
```

### Available Commands

From the root directory:

| Command                           | Description                                        |
| --------------------------------- | -------------------------------------------------- |
| `npm run staging:deploy`          | Deploy staging environment                         |
| `npm run staging:deploy:build`    | Rebuild images and deploy                          |
| `npm run staging:stop`            | Stop staging services                              |
| `npm run staging:clean`           | Stop and remove all volumes (⚠️ deletes data)      |
| `npm run staging:reset`           | Reset database (⚠️ deletes all data)               |
| `npm run staging:status`          | Show service status and URLs                       |
| `npm run staging:logs`            | Show service logs (follow mode)                    |

### Deployment Process

The `deploy-staging.sh` script performs:

1. **Prerequisites Check** - Verify Docker and available ports
2. **Build Images** (optional) - Build Docker images
3. **Stop Old Containers** - Clean up previous deployment
4. **Start Services** - Start PostgreSQL, API, Frontend
5. **Health Checks** - Verify all services are ready
6. **Status Report** - Display access URLs and test accounts

### Health Checks

The script waits for services to be ready:

- **API Health**: `GET http://localhost:3001/health`
- **Frontend Health**: `GET http://localhost:3002/health`

Max wait time: 60 seconds per service.

### Example Output

```
========================================
FindClass.nz Staging Deployment
========================================

[INFO] Starting staging services...
[SUCCESS] Staging services started

========================================
Health Checks
========================================
[INFO] Waiting for API to be ready...
..........
[SUCCESS] API is ready!
[INFO] Waiting for Frontend to be ready...
[SUCCESS] Frontend is ready!

========================================
Staging Environment Status
========================================

Service URLs:
  - API:        http://localhost:3001
  - Frontend:   http://localhost:3002
  - PostgreSQL: localhost:5432

Test Accounts:
  - Demo User:    demo@findclass.nz / password123
  - Teacher:      teacher@findclass.nz / password123

Health Status:
  - API:         ✓ Running
  - Frontend:    ✓ Running

[SUCCESS] Staging deployment completed successfully!
```

---

## Integration Tests

Integration tests verify end-to-end user flows against a **real backend** (no MSW mocks).

### Test Scenarios

| ID  | Scenario                  | Description                                   |
| --- | ------------------------- | --------------------------------------------- |
| INT-001 | User Registration    | Complete registration flow with email verify  |
| INT-002 | User Login           | Login with demo credentials, validation       |
| INT-003 | Course Search & Filter | Search, filter by city/subject, pagination    |
| INT-004 | Course Detail View    | Navigate list → detail, show related courses  |
| INT-005 | Teacher Application  | Submit teacher application, check status      |
| INT-006 | Favorites            | Add/remove favorites, view favorites list     |

### Running Integration Tests

```bash
# Deploy staging + run tests + cleanup
npm run test:integration

# Run tests only (staging must be running)
npm run test:e2e:integration

# UI mode (interactive)
npm run test:e2e:integration:ui

# Debug mode (with inspector)
npm run test:e2e:integration:debug

# CI mode (JUnit reports)
npm run test:integration:ci
```

### Configuration

Integration tests use `frontend/playwright.integration.config.ts`:

```typescript
{
  baseURL: 'http://localhost:3001',
  fullyParallel: false,  // Sequential execution
  workers: 1,            // Single worker
  retries: 1,            // Retry on failure
}
```

### Test Helpers

Integration tests use `frontend/src/test/e2e/setup/integration-helpers.ts`:

| Function                  | Description                          |
| ------------------------- | ------------------------------------ |
| `setupIntegrationTest()`  | Verify staging, create API context   |
| `createTestUser()`        | Register new test user               |
| `loginAsDemo()`           | Login with demo account              |
| `applyForTeacherRole()`   | Submit teacher application           |
| `addFavorite()`           | Add course to favorites              |
| `searchCourses()`         | Search courses via API               |
| `teardownIntegrationTest()` | Cleanup test data                   |

### Example Test

```typescript
test('should login with demo credentials', async ({ page }) => {
  // Navigate to login
  await page.goto('/login');

  // Fill form
  await page.fill('input[type="email"]', TEST_ACCOUNTS.demo.email);
  await page.fill('input[type="password"]', TEST_ACCOUNTS.demo.password);

  // Submit
  await page.click('button[type="submit"]');

  // Verify success
  const logoutButton = page.locator('button:has-text("Logout")');
  await expect(logoutButton).toBeVisible();
});
```

---

## Troubleshooting

### Deployment Issues

#### Port Already in Use

**Error**: `Port 3001 is already in use`

**Solution**:

```bash
# Find process using port
lsof -ti:3001

# Kill process
lsof -ti:3001 | xargs kill -9

# Or use a different port (edit docker-compose.yml)
```

#### Services Not Starting

**Symptoms**: Containers exit immediately

**Debug**:

```bash
# Check logs
npm run staging:logs

# Check specific container
docker logs findclass-staging-api
docker logs findclass-staging-frontend

# Check container status
docker ps -a
```

#### Health Check Timeout

**Error**: `API failed to start within 60 seconds`

**Solution**:

```bash
# Manual health check
curl http://localhost:3001/health

# Check API logs
docker logs findclass-staging-api --tail 100

# Restart service
docker restart findclass-staging-api
```

### Test Failures

#### Backend Not Running

**Error**: `Staging backend is not healthy`

**Solution**:

```bash
# Check status
npm run staging:status

# Restart staging
npm run staging:deploy
```

#### Test Data Missing

**Error**: `Demo account not found`

**Solution**:

```bash
# Reset database (re-seeds data)
npm run staging:reset
```

#### Flaky Tests

**Symptoms**: Tests pass sometimes, fail sometimes

**Solutions**:

1. **Increase timeouts** in test file:

```typescript
test.setTimeout(120000); // 2 minutes
```

2. **Run single test** for debugging:

```bash
npm run test:e2e:integration -- --grep "INT-001"
```

3. **Use debug mode**:

```bash
npm run test:e2e:integration:debug
```

#### Leftover Test Data

**Problem**: Test users/courses remain in database

**Solution**:

```bash
# Reset entire database
npm run staging:reset

# Or manually clean via API (requires admin token)
curl -X DELETE http://localhost:3001/api/v1/users/{userId} \
  -H "Authorization: Bearer {adminToken}"
```

### Performance Issues

#### Slow Deployment

**Symptoms**: Deployment takes > 2 minutes

**Solutions**:

1. **Skip rebuild** (use cached images):

```bash
npm run staging:deploy  # (without --build flag)
```

2. **Pre-build images**:

```bash
docker build -t findclass-backend:latest ./backend
docker build -t findclass-frontend:latest ./frontend
```

#### Slow Tests

**Symptoms**: Integration tests take > 5 minutes

**Solutions**:

1. **Run specific test** instead of full suite:

```bash
npm run test:e2e:integration -- --grep "INT-003"
```

2. **Increase workers** (if tests are independent):

Edit `playwright.integration.config.ts`:
```typescript
workers: 2,  // Instead of 1
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: findclass
          POSTGRES_PASSWORD: findclass_test
          POSTGRES_DB: findclass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Start staging
        run: npm run staging:deploy
        env:
          CI: true

      - name: Run integration tests
        run: npm run test:e2e:integration
        env:
          CI: true

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: frontend/test-results/

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: screenshots
          path: frontend/test-results/integration/

      - name: Stop staging
        if: always()
        run: npm run staging:stop
```

### GitLab CI Example

```yaml
integration-test:
  stage: test
  image: node:18
  services:
    - postgres:15
  variables:
    POSTGRES_USER: findclass
    POSTGRES_PASSWORD: findclass_test
    POSTGRES_DB: findclass
  script:
    - npm ci
    - npm run staging:deploy
    - npm run test:e2e:integration
  artifacts:
    when: always
    paths:
      - frontend/test-results/
    reports:
      junit: frontend/test-results/junit-integration.xml
  after_script:
    - npm run staging:stop
```

### Environment Variables for CI

| Variable          | Description                              | Default                |
| ----------------- | ---------------------------------------- | ---------------------- |
| `CI`              | Enable CI mode (no auto-reuse server)    | `false`                |
| `API_BASE_URL`    | Backend API URL                          | `http://localhost:3001/api/v1` |
| `SEED_SAMPLE_DATA` | Enable sample data seeding               | `true`                 |

---

## Best Practices

### Development Workflow

1. **Start staging** once per work session:

```bash
npm run staging:deploy
```

2. **Run integration tests** frequently during development:

```bash
npm run test:e2e:integration
```

3. **Stop staging** when done (saves resources):

```bash
npm run staging:stop
```

### Before Committing

Run full test suite:

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Linting and type checking
npm run lint && npm run typecheck
```

### Before Pushing

```bash
# Full check
npm run check           # Backend
cd frontend && npm run lint && npx tsc --noEmit  # Frontend
npm run test:integration  # Integration tests
```

### Writing New Integration Tests

1. **Use test helpers** from `integration-helpers.ts`
2. **Clean up test data** in `afterEach` or `afterAll`
3. **Add unique identifiers** (timestamps, UUIDs) to avoid conflicts
4. **Use data-testid** attributes for selectors (more stable than CSS)
5. **Add retry logic** for flaky network operations

Example:

```typescript
test('should create and delete favorite', async ({ page }) => {
  const apiContext = await setupIntegrationTest();
  const { token } = await loginAsDemo(apiContext);

  const courseId = 'test-course-' + Date.now();

  try {
    // Add favorite
    await addFavorite(apiContext, token, courseId);

    // Verify via UI
    await page.goto(`/user/favorites`);
    await expect(page.locator(`[data-course-id="${courseId}"]`)).toBeVisible();
  } finally {
    // Cleanup
    await removeFavorite(apiContext, token, courseId);
    await apiContext.dispose();
  }
});
```

---

## Summary

### Quick Reference

```bash
# Deploy staging
npm run staging:deploy

# Run integration tests
npm run test:integration

# Cleanup
npm run staging:stop

# Full workflow (deploy + test + cleanup)
npm run test:integration
```

### Key Files

| File                                          | Purpose                              |
| --------------------------------------------- | ------------------------------------ |
| `scripts/deploy-staging.sh`                   | Deployment automation script         |
| `docker-compose.yml`                          | Staging service definitions          |
| `frontend/playwright.integration.config.ts`   | Integration test configuration       |
| `frontend/src/test/e2e/setup/integration-helpers.ts` | Test utilities             |
| `frontend/src/test/e2e/specs/integration-flow.spec.ts` | Integration test suite |
| `package.json` (root)                         | Deployment npm scripts                |
| `frontend/package.json`                       | Test npm scripts                     |

---

## Support

For issues or questions:

1. Check this documentation first
2. Review test logs in `frontend/test-results/`
3. Check service logs with `npm run staging:logs`
4. Try resetting: `npm run staging:reset`

---

**Last Updated**: 2025-02-07
**Version**: 1.0.0
