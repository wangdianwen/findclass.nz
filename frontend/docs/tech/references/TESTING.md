# Testing Strategy

> Testing pyramid and practices for FindClass.nz frontend

## Three-Layer Testing

| Layer     | Tool               | Purpose                  | Location                    |
| --------- | ------------------ | ------------------------ | --------------------------- |
| Unit      | Vitest             | Utilities, hooks         | `src/**/*.test.{ts,tsx}`    |
| Component | Storybook + Vitest | Components, interactions | `stories/**/*.stories.tsx`  |
| E2E       | Playwright         | User flows               | `src/test/e2e/**/*.spec.ts` |

```
        /\
       /  Unit Tests \        src/**/*.test.{ts,tsx}
      /----------------\
     /                  \
    /   Storybook         \   stories/**/*.stories.tsx
   /   Component Tests     \
  /------------------------\
 /      Playwright          \  src/test/e2e/**/*.spec.ts
/       E2E Tests            \
----------------------------\
```

## E2E Testing with Playwright

### Project Configuration

E2E tests use Playwright with browser automation. Configuration is in `playwright.config.ts`:

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './src/test/e2e',
  baseURL: 'http://localhost:3001', // Dev server port
  projects: ['chromium', 'firefox', 'webkit', 'Mobile Chrome', 'Mobile Safari'],
  use: {
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
});
```

### Current Test Structure

```
src/test/e2e/
├── setup/
│   ├── msw-setup.ts         # MSW utilities and helpers
│   └── test-data.ts         # Test data generators
├── specs/
│   ├── home.spec.ts         # Home page tests (14 cases)
│   ├── auth.spec.ts          # Login/Register tests (12 cases)
│   ├── courses.spec.ts       # Course search tests (16 cases)
│   └── edge-cases.spec.ts   # Error scenarios tests (15 cases)
```

### Example E2E Test

```typescript
// src/test/e2e/specs/home.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('HOME-001: 页面正确加载', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('HOME-010: Featured Courses 显示', async ({ page }) => {
    const courseCards = page.locator('[data-testid="course-card"], .course-card');
    await expect(courseCards.first()).toBeVisible({ timeout: 10000 });
  });
});
```

### Using MSW in E2E Tests

MSW is already configured in `main.tsx` for development. For E2E tests, use `page.route()` for intercepting specific requests:

```typescript
// Simulate server error
test('shows error on 500', async ({ page }) => {
  await page.route('**/api/v1/courses', route => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR' } }),
    });
  });

  await page.goto('/courses');
  await expect(page.locator('text=加载失败')).toBeVisible();
});

// Set auth state for logged-in tests
test('logged in user sees avatar', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'user-test-001',
        name: 'Test User',
        email: 'test@example.com',
      })
    );
  });

  await page.goto('/');
  await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
});
```

### MSW Test Data

Extended mock data is available in `src/mocks/data/apiData.ts`:

- **30 courses** total (id: 1-30) for pagination testing
- **Pagination test courses** (id: 16-30) include:
  - Language courses (Japanese, Korean, French, Spanish)
  - Arts (Chinese calligraphy)
  - Sports (Yoga, Golf)
  - Programming for kids
  - And more...

See `src/test/e2e/setup/test-data.ts` for test data utilities.

### Error Scenario Handlers

Edge cases are documented in `docs/MSW/MSW-EDGE-CASES.md`:

| Scenario             | Trigger                                   |
| -------------------- | ----------------------------------------- |
| USER_NOT_FOUND       | User ID contains "deleted"                |
| USER_BANNED          | User ID contains "banned"                 |
| COURSE_NOT_FOUND     | Course ID = "not-found"                   |
| COURSE_NOT_PUBLISHED | Course ID = "course-draft-001"            |
| ACTION_NOT_ALLOWED   | Course ID = "course-nofavorite-001"       |
| RATE_LIMITED         | Authorization header contains "ratelimit" |

### Running E2E Tests

```bash
# Install browsers (first time only)
npx playwright install

# Run E2E tests (port 3001)
npx playwright test --project=chromium

# Run with UI mode
npx playwright test --ui

# Run specific test file
npx playwright test src/test/e2e/specs/home.spec.ts

# Run in headed mode
npx playwright test --project=chromium --headed

# Debug mode
npx playwright test --project=chromium --debug

# View HTML report
npx playwright test --project=chromium --reporter=html
```

## Storybook Testing

### Story Requirements

| Type               | Required | Location                           |
| ------------------ | -------- | ---------------------------------- |
| UI Base components | ✅       | `stories/UI/*.stories.tsx`         |
| Shared components  | ✅       | `stories/Shared/*.stories.tsx`     |
| Page sections      | ✅       | `stories/Components/*.stories.tsx` |
| Pages              | ✅       | `stories/Pages/*.stories.tsx`      |

### Interaction Tests Required

| Component              | Interaction            | Test Name       |
| ---------------------- | ---------------------- | --------------- |
| Header                 | City/Language dropdown | ✅              |
| HeroSection            | Search input           | ✅              |
| FeaturedCoursesSection | Filter                 | ✅              |
| CookieConsent          | Accept/Decline         | ✅              |
| AnnouncementBar        | Close                  | ✅              |
| Display-only           | None                   | ❌ Default only |

### data-testid Rule

```typescript
// ✅ Correct
const button = canvas.getByTestId('submit-button');
await userEvent.click(button);

// ❌ Wrong - CSS selectors
const button = canvasElement.querySelector('.ant-btn');

// ❌ Wrong - text content
const button = canvas.getByText('Submit');
```

### Naming Convention

| Element | Example                        |
| ------- | ------------------------------ |
| Button  | `submit-button`, `save-button` |
| Input   | `search-input`, `name-input`   |
| Card    | `course-card-123`              |
| Tab     | `about-tab`                    |

## Commands

```bash
# All tests
npm run test

# Storybook only
npm run test:stories

# Vitest once
npx vitest run

# View coverage report
npm run test:coverage

# E2E tests
npx playwright test --project=chromium
```

## Unit Test Examples

```typescript
// src/utils/__tests__/formatDate.test.ts
describe('formatDate', () => {
  it('formats date with locale', () => {
    expect(formatDate('2024-01-15', 'en')).toBe('Jan 15, 2024');
  });

  it('formats date in Chinese', () => {
    expect(formatDate('2024-01-15', 'zh')).toBe('2024年1月15日');
  });
});

// src/hooks/__tests__/useCity.test.ts
describe('useCity', () => {
  it('returns current city', () => {
    const { result } = renderHook(() => useCity());
    expect(result.current.selectedCity).toBe('Auckland');
  });
});
```

## Test Priorities

| Priority   | What to Test                                  |
| ---------- | --------------------------------------------- |
| **High**   | Utility functions, custom hooks, API services |
| **Medium** | Complex form validation, filtering logic      |
| **Low**    | Simple props passing, UI rendering details    |

## Common Issues

| Issue                   | Solution                                         |
| ----------------------- | ------------------------------------------------ |
| `getByTestId` not found | Add `data-testid` to element                     |
| `getByText` fails       | Check i18n namespace, use `data-testid`          |
| A11y test fails         | Fix issue or disable specific rule in parameters |
| Router component fails  | Add `reactRouter` parameters                     |
| MSW not intercepting    | Check dev server port (3001)                     |
| Tests timing out        | Increase `actionTimeout`/`navigationTimeout`     |

## Production Build

`data-testid` attributes are automatically removed in production build via `vite.config.ts`.

## See Also

- [STORYBOOK.md](./STORYBOOK.md) - Storybook writing guidelines
- [MOCKING.md](./MOCKING.md) - MSW mocking guidelines
- `docs/MSW/MSW-EDGE-CASES.md` - Error scenarios documentation
- `docs/tests-report/ALL_PAGES.md` - Test cases documentation
