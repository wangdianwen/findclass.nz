# Storybook Guidelines

## API Calling Patterns (Storybook Compatible)

### Core Principle

**Storybook is for component testing, NOT page testing**

- Storybook best practice: **Test components only, not pages**
- Page testing: Use E2E tools (Playwright, Cypress)
- Component stories: Can be exported for Vitest/Testing Library tests

### Architecture Layers

```
┌─────────────────────────────────────────┐
│  Page Layer (UserCenterPage)             │  ← API calls HERE
│  • Data fetching (useQuery)
│  • State management
│  • Mutation callbacks
└─────────────────────────────────────────┘
                ↓ props
┌─────────────────────────────────────────┐
│  Component Layer (sections)             │  ← Props only
│  • UserProfile(profile)
│  • FavoritesList(favorites, onRemove)
│  • LearningHistory(history, children)
│  • NotificationList(notifications, ...)
│  • ChildrenManagement(children, onAdd, ...)
└─────────────────────────────────────────┘
```

### Rule: API Calls Must Be in Page Layer

#### ❌ Wrong: Component calls API internally

```typescript
// ❌ Component calls API internally, cannot test statically in Storybook
export const ChildrenManagement: React.FC = () => {
  const { data: children } = useQuery({
    queryKey: ['userChildren'],
    queryFn: () => userCenterApi.getChildren(),
  });  // Cannot mock this in Storybook

  return <ChildList items={children} />;
};
```

#### ✅ Correct: Page calls API, component receives props

```typescript
// ✅ Component receives props, doesn't care about data source
interface ChildrenManagementProps {
  children?: Child[];
  onAdd?: (data: Omit<Child, 'id'>) => void;
  onEdit?: (id: string, data: Partial<Child>) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

export const ChildrenManagement: React.FC<ChildrenManagementProps> = ({
  children = [],
  onAdd,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  // Only displays and handles interaction, no API calls
  return <ChildList items={children} onEdit={onEdit} onDelete={onDelete} />;
};

// ============================================
// Page Layer: API calls here
// ============================================
export const UserCenterPage: React.FC = () => {
  // API calls here
  const { data: childrenData, isLoading } = useQuery({
    queryKey: ['userChildren'],
    queryFn: () => userCenterApi.getChildren(),
  });

  // Pass to child components via props
  return (
    <ChildrenManagement
      children={childrenData?.data}
      isLoading={isLoading}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
};
```

### Testing Components in Storybook

Components receive props - Storybook passes static data directly:

```typescript
// stories/features/user/pages/UserCenterPage/sections/ChildrenManagement.stories.tsx

// ✅ Storybook passes static data directly, no API needed
export const Default: Story = {
  args: {
    children: [{ id: '1', name: '张小明', gender: 'male', grade: 'secondary-7' }],
    onAdd: fn(),
    onEdit: fn(),
    onDelete: fn(),
  },
};

export const Empty: Story = {
  args: {
    children: [],
  },
};

export const MultipleChildren: Story = {
  args: {
    children: [
      { id: '1', name: '张小明', gender: 'male', grade: 'secondary-7' },
      { id: '2', name: '张小红', gender: 'female', grade: 'primary-3' },
    ],
  },
};
```

### When Are Full Page Stories Needed?

**Usually NOT needed**

Full page stories require complex MSW or data simulation, prone to issues and high maintenance.

**Alternative:**

| Testing Type          | Tool               | Description                |
| --------------------- | ------------------ | -------------------------- |
| Component interaction | Storybook          | Pass static data via props |
| Page integration      | Playwright/Cypress | E2E tests for page flows   |
| API integration       | Vitest + MSW       | Unit tests for API layer   |

### Forbidden: Do NOT Call API in Components

| Practice                                       | Allowed?     |
| ---------------------------------------------- | ------------ |
| Page layer calls API, components receive props | ✅ Allowed   |
| Component internally calls API                 | ❌ Forbidden |
| Component uses useQuery/useMutation            | ❌ Forbidden |
| Component uses useState + props                | ✅ Allowed   |

### Violation Consequences

If a component calls API internally:

1. Storybook cannot test the component statically
2. Requires complex MSW data simulation
3. Component tightly coupled with API
4. Difficult to unit test

---

## Setup

```bash
npm run storybook    # Start dev server
npm run test:stories # Run tests
npm run test         # All tests
```

## Storybook Organization

### Folder Structure

Stories are organized to mirror the `src/features/` structure for consistency:

```
stories/
├── features/                    # Stories mirroring src/features/ structure
│   ├── user/
│   │   ├── pages/
│   │   │   ├── LoginPage/
│   │   │   ├── RegisterPage/
│   │   │   ├── ForgotPasswordPage/
│   │   │   └── UserCenterPage/
│   │   │       └── sections/
│   │   └── components/
│   ├── course/
│   │   ├── pages/
│   │   │   ├── CourseSearchPage/
│   │   │   ├── CourseDetailPage/
│   │   │   └── CourseManagementPage/
│   │   └── components/
│   ├── review/
│   │   ├── pages/
│   │   │   └── ReviewsPage/
│   │   └── components/
│   ├── teacher/
│   │   └── pages/
│   │       └── TeacherOnboardingPage/
│   ├── home/
│   │   └── pages/
│   │       └── HomePage/
│   └── static/
│       └── pages/
│           ├── AboutPage/
│           ├── ContactPage/
│           └── ...
├── components/                  # Shared components across features
│   ├── Header/
│   ├── Footer/
│   ├── AnnouncementBar/
│   └── ...
└── ui/                          # Base UI components
    ├── Button/
    ├── CourseCard/
    ├── Loading/
    └── ...
```

### Storybook Menu Structure

The Storybook sidebar displays stories in three main sections:

#### 1. Features (Page Stories)

Pages organized by feature domain:

```
Features/
├── User/
│   ├── Login Page
│   ├── Register Page
│   ├── Forgot Password Page
│   └── User Center/
│       ├── Overview
│       ├── My Reviews
│       ├── Favorites List
│       ├── Learning History
│       ├── Children Management
│       ├── Notification List
│       └── Settings Panel
├── Course/
│   ├── Course Search
│   ├── Course Detail
│   └── Course Management
├── Review/
│   └── Reviews Page
├── Teacher/
│   └── Teacher Onboarding
├── Home/
│   └── Home Page
└── Static/
    ├── About
    ├── Contact
    ├── Privacy Policy
    └── ...
```

#### 2. Components (Shared Components)

Components used across multiple features:

```
Components/
├── Header
├── Footer
├── AnnouncementBar
├── CookieConsent
├── ContactForm
└── SimpleForm
```

#### 3. UI (Base UI Components)

Base UI components in `components/ui/`:

```
UI/
├── Button
├── CourseCard
├── Loading
├── ErrorFallback
├── TrustBadge
├── DefaultAvatarSelector
├── EmailInput
├── GoogleIcon
├── PageBreadcrumb
├── PolicySection
├── SubmitButton
├── VerificationCodeButton
└── CopyableEmail
```

### Title Convention

Use feature-based titles for proper menu organization:

```typescript
// ✅ Correct - Feature-based titles
title: 'Features/User/Login Page';
title: 'Features/User/User Center/My Reviews';
title: 'Features/Course/Course Search';
title: 'Features/Teacher/Teacher Onboarding';

// ✅ Correct - Component titles
title: 'Components/Header';
title: 'Components/Footer';

// ✅ Correct - UI titles
title: 'UI/CourseCard';
title: 'UI/Button';

// ❌ Wrong - Non-hierarchical titles
title: 'Pages/Login';
title: 'TeacherOnboarding';
```

### File Path Convention

Stories should be in the same directory as the component they test:

```
src/features/user/pages/UserCenterPage/
├── index.tsx
├── UserCenterPage.module.scss
└── UserCenterPage.stories.tsx     # Stories alongside component

src/components/shared/Header/
├── index.tsx
├── Header.module.scss
└── Header.stories.tsx
```

## Storybook Config

### i18n in Stories

```typescript
// .storybook/preview.tsx
import { I18nextProvider } from 'react-i18next';
import i18n from '../src/locales/i18n';

const preview: Preview = {
  globalTypes: {
    locale: {
      name: 'Locale',
      defaultValue: 'en',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'en', right: 'EN', title: 'English' },
          { value: 'zh', right: 'ZH', title: '简体中文' },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const locale = context.globals.locale || 'en';
      if (i18n.language !== locale) {
        i18n.changeLanguage(locale).then(() => {
          i18n.loadNamespaces(['search', 'courseManagement', 'teacher', 'userCenter']);
        });
      }
      return (
        <I18nextProvider i18n={i18n}>
          <Story />
        </I18nextProvider>
      );
    },
  ],
};
```

### Story i18n Parameters

```typescript
parameters: {
  i18n: {
    locale: 'en',
    loadNamespaces: ['search'],
  },
},
```

### React Router

```typescript
parameters: {
  reactRouter: {
    routePath: '/courses/:id',
    routeParams: { id: '1' },
  },
},
```

### Accessibility

```typescript
parameters: {
  a11y: {
    test: 'error', // A11y violations will fail tests and block CI/CD
    config: {
      rules: [
        { id: 'color-contrast', enabled: false },
        { id: 'aria-input-field-name', enabled: false },
      ],
    },
  },
},
```

**Note:** We use `test: 'error'` to enforce a11y compliance in CI/CD. Known false positives from Ant Design are disabled.

## Story Count Control

### How Many Stories?

| Component Type        | Count | Reason                          |
| --------------------- | ----- | ------------------------------- |
| Display-only          | 1     | Default only                    |
| Complex component     | 2-3   | Default + Empty state           |
| Page with interaction | 3-4   | Default + key interaction tests |

### Component Stories (No Interaction Tests)

Component stories should be simple - just Default and necessary states:

```typescript
// ✅ Correct - Simple component stories
export const Default: Story = {};

export const Empty: Story = {
  args: {
    items: [],
  },
};

export const WithData: Story = {
  args: {
    items: [...],
  },
};

// ❌ Wrong - Too many stories for simple components
// Don't create stories for every variant
// Use Storybook toolbar for locale/viewport testing
```

### Page Stories (With Interaction Tests)

Page stories should include interaction tests for critical flows:

```typescript
export const Default: Story = {};

export const CreateCourseMode: Story = {
  args: {
    initialMode: 'form',
  },
  play: async ({ canvasElement }) => {
    // Interaction test for form submission
  },
};
```

### Avoid Redundant Stories

```typescript
// ❌ Don't create these - use Storybook toolbar instead
// export const MobileView: Story = {
//   parameters: { viewport: { defaultViewport: 'mobile1' } },
// };
//
// export const ChineseLocale: Story = {
//   parameters: { i18n: { locale: 'zh' } },
// };
```

**Why?** Storybook has built-in toolbars for:

- **Viewport** - Toggle mobile/tablet/desktop in the bottom toolbar
- **Locale** - Switch languages in the toolbar

Creating dedicated stories for these adds no value and bloats test count.

## Interaction Test Example

```typescript
export const FavoriteInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const saveButton = canvas.getByTestId('save-button');
    await userEvent.click(saveButton);
    await expect(canvas.getByTestId('save-button')).toHaveTextContent(/saved/i);
  },
};
```

## Required Stories

| Component Type     | Required | Location                      |
| ------------------ | -------- | ----------------------------- |
| Feature pages      | ✅       | `stories/features/{feature}/` |
| Feature components | ✅       | `stories/features/{feature}/` |
| Shared components  | ✅       | `stories/components/`         |
| Base UI            | ✅       | `stories/ui/`                 |

## Required Interaction Tests

| Component     | Interaction       | Test |
| ------------- | ----------------- | ---- |
| Pages         | Core user flows   | ✅   |
| Forms         | Submit/validation | ✅   |
| Header        | City/Language     | ✅   |
| CookieConsent | Accept/Decline    | ✅   |

**Note:** Simple display components (CourseCard, CourseList, etc.) do NOT need interaction tests.

## Complete Story Template

```typescript
// stories/Features/Course/CourseDetailPage.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, expect, fn, within } from '@storybook/test';
import CourseDetailPage from '../../src/pages/CourseDetailPage';

const meta = {
  title: 'Features/Course/Course Detail',
  component: CourseDetailPage,
  tags: ['autodocs', 'a11y'],
  parameters: {
    layout: 'fullscreen',
    reactRouter: {
      routePath: '/courses/:id',
      routeParams: { id: '1' },
    },
    i18n: {
      locale: 'en',
      loadNamespaces: ['search'],
    },
    a11y: {
      test: 'error',
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
  },
  args: {
    onContact: fn(),
    onSave: fn(),
  },
} satisfies Meta<typeof CourseDetailPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SaveInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const saveButton = canvas.getByTestId('save-button') as HTMLButtonElement;
    await userEvent.click(saveButton);
    await expect(canvas.getByTestId('save-button')).toHaveTextContent(/saved/i);
  },
};

export const MobileView: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};
```

## Common Issues

| Issue                   | Solution                        |
| ----------------------- | ------------------------------- |
| `getByTestId` not found | Add `data-testid` to element    |
| `getByText` fails       | Check i18n namespace            |
| Color contrast fails    | Design decision or disable rule |
| Router fails            | Add `reactRouter` parameters    |
