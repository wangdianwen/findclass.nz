# E2E Integration Testing Guide

## Overview

Integration tests connect to a **real staging backend** (no MSW mocks) to verify end-to-end user journeys.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Playwright     │────▶│ Staging         │────▶│ Staging API     │
│  Test Runner    │     │ Frontend :3002  │     │ :3001           │
│                 │     │ (nginx proxy)   │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Key Differences from Regular E2E Tests

| Aspect | Regular E2E | Integration Tests |
|--------|-------------|-------------------|
| Backend | MSW mocks | Real staging API |
| Frontend | Dev server (npm run dev) | Production build (Docker) |
| API URL | http://localhost:3000/api/v1 | http://localhost:3002/api/v1 (proxied) |
| data-testid | ✅ Preserved | ✅ Preserved (staging mode) |
| Test Data | MSW handlers | Database seed data |

## Setup

### 1. Start Staging Environment

```bash
# Deploy all staging services
npm run staging:deploy

# Check health status
npm run staging:status

# View logs
npm run staging:logs
```

### 2. Run Integration Tests

```bash
# Run all integration tests
npm run test:e2e:integration

# Run with UI (Playwright Inspector)
npm run test:e2e:integration:ui

# Debug mode
npm run test:e2e:integration:debug

# CI mode (with JUnit report)
npm run test:integration:ci
```

### 3. Stop Staging Environment

```bash
# Stop containers (keeps data)
npm run staging:stop

# Stop and remove data
npm run staging:clean

# Reset database
npm run staging:reset
```

## Configuration

### Playwright Config: `playwright.integration.config.ts`

- **baseURL**: `http://localhost:3002` (staging-frontend)
- **Timeout**: 30s (optimized for speed)
- **Workers**: 1 (sequential to avoid rate limiting)
- **Retries**: 0 (fast feedback)

### Environment: `.env.staging`

```env
VITE_API_URL=/api/v1           # Relative for nginx proxy
VITE_APP_ENV=staging           # Enable staging mode
VITE_ENABLE_MSW=false          # Disable MSW
```

### Vite Config: `vite.config.ts`

**IMPORTANT**: `data-testid` attributes are preserved in staging mode:

```typescript
const isDevOrTest = ['development', 'test', 'staging', 'storybook'].includes(mode);
if (isDevOrTest) return null; // Keep data-testid
```

This allows selectors like `input[data-testid="email-input"]` to work in integration tests.

## Test Data

### Seed Data

Staging database is seeded with sample data when `SEED_SAMPLE_DATA=true`:

```bash
# Check if seeding is enabled
docker-compose exec staging-api printenv | grep SEED
# Output: SEED_SAMPLE_DATA=true
```

### Test Accounts

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| `demo@findclass.nz` | `Password123` | STUDENT | Login tests |
| `teacher@findclass.nz` | `Password123` | TEACHER | Teacher features |

## Writing Integration Tests

### API-First Approach (Recommended)

For tests that don't require UI interaction, use API helpers:

```typescript
import { setupIntegrationTest, loginAsDemo, searchCourses } from '../setup/integration-helpers';

test('should load courses from API', async ({ page }) => {
  const apiContext = await setupIntegrationTest();

  // Direct API call
  const result = await searchCourses(apiContext);
  expect(result.data?.courses?.length).toBeGreaterThan(0);

  await apiContext.dispose();
});
```

### UI Tests with Known Limitations

**IMPORTANT**: Ant Design Form submission has issues in production builds. The `onFinish` handler may not trigger with Playwright's input filling.

**Current Workaround**: Use API-based setup for authentication:

```typescript
test('should show user profile', async ({ page, request }) => {
  const apiContext = await setupIntegrationTest();
  const { token } = await loginAsDemo(apiContext);

  // Set auth state directly
  await page.goto('/user/profile');
  await page.evaluate((authToken) => {
    localStorage.setItem('auth_token', authToken);
  }, token);

  // Reload page with auth
  await page.reload();
  await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();

  await apiContext.dispose();
});
```

### Selector Guidelines

Since `data-testid` is preserved in staging:

```typescript
// ✅ Good - stable in staging
await page.fill('input[data-testid="email-input"]', 'test@example.com');

// ✅ Good - alternative when data-testid unavailable
await page.fill('input[placeholder="Enter password"]', 'password');

// ❌ Avoid - CSS selectors may change
await page.fill('.ant-input', 'value');
```

## Troubleshooting

### Issue: "Demo account not found"

**Cause**: Database not seeded or API not healthy

**Solution**:
```bash
# Check API health
curl http://localhost:3001/health

# Reset database
npm run staging:reset

# Restart staging
npm run staging:deploy
```

### Issue: "Login API was not called"

**Cause**: Ant Design Form not submitting in production build

**Solution**: Use API-based login instead of UI form submission (see example above)

### Issue: Rate limit errors (429)

**Cause**: Too many API requests in short time

**Solution**: Rate limits are relaxed in `.env.staging`:
```env
RATE_LIMIT_MAX_ATTEMPTS=1000
RATE_LIMIT_LOCKOUT_SECONDS=1
```

### Issue: Tests timeout

**Cause**: Services not ready or network issues

**Solution**:
```bash
# Wait for services to be healthy
npm run staging:status

# Increase timeout in test
await page.waitForTimeout(5000);
```

## Known Issues

### 1. Ant Design Form Submission

**Problem**: `onFinish` handler not triggered in production builds

**Affected Tests**:
- INT-001: User registration flow
- INT-002: User login flow (UI-based)
- INT-005: Teacher application flow

**Workaround**: Use API helpers for authentication, then test UI state

**Future Fix**: Investigate alternatives:
- Use `@testing-library/react` with `userEvent`
- Test with dev build instead of production
- Add custom event dispatching

### 2. Google Sign-In Errors

**Problem**: Console errors about invalid client ID

**Impact**: Not blocking - Google login not tested in integration tests

**Console Output**:
```
[GSI_LOGGER]: The given client ID is not found.
```

**Solution**: These errors are expected and can be ignored

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Deploy staging
  run: npm run staging:deploy

- name: Wait for health
  run: |
    npm run staging:status
    # Wait up to 60s for services to be healthy

- name: Run integration tests
  run: npm run test:integration:ci

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: integration-test-results
    path: |
      test-results/integration-results.json
      test-results/junit-integration.xml
      playwright-report/integration/
```

## Best Practices

1. **Use API helpers** for authentication and data setup
2. **Avoid flaky selectors** - prefer `data-testid` over CSS classes
3. **Clean up test data** after each test (use helper functions)
4. **Run sequentially** (`workers: 1`) to avoid rate limiting
5. **Set short timeouts** for fast feedback loop
6. **Check service health** before running tests

## References

- [Playwright Integration Config](../../playwright.integration.config.ts)
- [Integration Test Helpers](../setup/integration-helpers.ts)
- [Integration Test Specs](../specs/integration-flow.spec.ts)
- [Staging Deployment Scripts](../../../../scripts/deploy-staging.sh)
