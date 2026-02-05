# Components & Stories

## Component Structure

### Single File

```
ComponentName/
├── ComponentName.tsx
├── ComponentName.module.scss
└── index.ts
```

### Page Section (Use sections/ directory)

```
PageName/
├── index.tsx              # Main page (keep small, delegate to sections)
└── sections/
    └── SectionName/
        ├── index.tsx
        ├── SectionName.module.scss
        └── index.ts
```

## Component Template

```tsx
// src/components/ui/Button/Button.tsx
import React from 'react';
import styles from './Button.module.scss';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button = ({ variant = 'primary', size = 'md', children, onClick }: ButtonProps) => {
  return (
    <button className={`${styles.button} ${styles[variant]} ${styles[size]}`} onClick={onClick}>
      {children}
    </button>
  );
};
```

## Story Structure

Stories mirror `src/features/` structure:

```
stories/
├── features/                    # Stories mirroring src/features/ structure
│   ├── user/
│   │   ├── pages/
│   │   │   ├── LoginPage/
│   │   │   ├── RegisterPage/
│   │   │   └── UserCenterPage/
│   │   │       └── sections/
│   │   └── components/
│   ├── course/
│   │   ├── pages/
│   │   │   ├── CourseSearchPage/
│   │   │   ├── CourseDetailPage/
│   │   │   └── CourseManagementPage/
│   │   └── components/
│   └── review/
│       ├── pages/
│       └── components/
├── components/                  # Shared components
│   ├── Header/
│   ├── Footer/
│   └── CookieConsent/
└── ui/                          # Base UI components
    ├── Button/
    └── CourseCard/
```

## Story Title Convention

```typescript
// ✅ Correct - Feature-based titles
title: 'Features/User/Login Page';
title: 'Features/User/User Center/My Reviews';
title: 'Features/Course/Course Search';

// ✅ Correct - Shared component titles
title: 'Components/Header';
title: 'Components/Footer';

// ✅ Correct - UI titles
title: 'UI/Button';
title: 'UI/CourseCard';
```

## When to Create Multiple Stories

| Scenario           | Example                        |
| ------------------ | ------------------------------ |
| Different states   | Default, Loading, Error, Empty |
| Different variants | Primary, Secondary, Danger     |
| Different data     | WithData, EmptyData            |
| Different sizes    | Small, Medium, Large           |

## NO Redundant Stories

Storybook toolbar handles these - no separate stories needed:

- Mobile view (use toolbar)
- Chinese/English (use toolbar)
- Dark mode (use theme)

## data-testid for Testing

```tsx
export const Component: React.FC = () => {
  return (
    <button data-testid="submit-button" onClick={handleSubmit}>
      Submit
    </button>
  );
};

// Dynamic test IDs
{
  courses.map(course => (
    <div key={course.id} data-testid={`course-card-${course.id}`}>
      {course.title}
    </div>
  ));
}
```

## Testing with canvasElement

### Use canvasElement.querySelector for Element Selection

```typescript
// ✅ Correct - Use canvasElement.querySelector
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const button = canvasElement.querySelector(
      '[data-testid="submit-button"]'
    ) as HTMLButtonElement;
    await userEvent.click(button);
    await expect(args.onSubmit).toHaveBeenCalled();
  },
};

// ❌ Wrong - canvas.getByTestId may not work in all contexts
export const Default: Story = {
  play: async ({ canvas, args }) => {
    const button = canvas.getByTestId('submit-button');
    await userEvent.click(button);
  },
};

// ✅ Query by data-testid
const element = canvasElement.querySelector('[data-testid="my-element"]');

// ✅ Query by placeholder (for form inputs)
const input = canvasElement.querySelector('input[placeholder*="Name"]');

// ✅ Query by role
const button = canvasElement.querySelector('button[type="submit"]');

// ✅ Query by aria-label
const link = canvasElement.querySelector('[aria-label="Close"]');
```

## Complete Story Interaction Example

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, fn } from '@storybook/test';

const meta = {
  title: 'Components/MyComponent',
  component: MyComponent,
  tags: ['autodocs', 'a11y'],
  parameters: { docs: { description: { component: 'My component' } } },
  args: { onSubmit: fn() },
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    // Find elements
    const submitButton = canvasElement.querySelector(
      '[data-testid="submit-button"]'
    ) as HTMLButtonElement;
    const input = canvasElement.querySelector('input[placeholder*="Email"]') as HTMLInputElement;

    // Interact
    expect(submitButton).not.toBeNull();
    await userEvent.type(input, 'test@example.com');
    await userEvent.click(submitButton);

    // Assert
    await expect(args.onSubmit).toHaveBeenCalled();
  },
};
```

## Component Deduplication

### Check Before Creating New Components

1. **Search existing components** - Is there something similar?
2. **Check shared folder** - Should it be in `components/shared/`?
3. **Check ui folder** - Should it be a base component?
4. **Extract if used 2+ times**

```tsx
// ❌ Duplicate code
// In Header.tsx
<button className="close-button" onClick={handleClose}>×</button>

// In Modal.tsx
<button className="close-button" onClick={handleClose}>×</button>

// In Drawer.tsx
<button className="close-button" onClick={handleClose}>×</button>

// ✅ Extracted to shared CloseButton
// components/shared/CloseButton/
export const CloseButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button className="close-button" onClick={onClick}>×</button>
);
```

### Variants in Same Folder

If components are **logically the same but display differently**, they belong in the same folder:

```
CourseCard/
├── CourseCard.tsx           # Full version
├── CourseCardLite.tsx       # Simplified version
├── CourseCardBrief.tsx      # Brief summary version
├── CourseCard.module.scss   # Shared styles
└── index.ts                 # Export all variants
```

**DO NOT create separate folders for variants:**

```
❌ Wrong:
├── CourseCard/
├── CourseCardLite/
└── CourseCardBrief/
```

### When to Create Separate Folders

Create a new folder only when components have **fundamentally different purposes**:

| Same Folder (Variants)         | Separate Folders (Different Components) |
| ------------------------------ | --------------------------------------- |
| CourseCard + CourseCardLite    | Button + Modal                          |
| ReviewCard + ReviewCardCompact | Header + Footer                         |
| UserProfile + UserProfileEdit  | Hero + Features                         |

---

## Export Convention

### Named Exports Only

```typescript
// ✅ Correct - Named export
export const LoginPage: React.FC = () => {
  return <div>Login</div>;
};

// ❌ Wrong - Default export (redundant)
export const LoginPage: React.FC = () => {
  return <div>Login</div>;
};
export default LoginPage;
```

### File Structure for Pages

```
src/features/user/pages/LoginPage/
├── index.tsx              # Component with named export
├── LoginPage.module.scss
└── index.ts               # Optional barrel export
```

### Barrel Exports

```typescript
// src/features/user/index.ts
export { LoginPage } from './pages/LoginPage';
export { RegisterPage } from './pages/RegisterPage';
export { UserCenterPage } from './pages/UserCenterPage';
```

## Story States

### Create Separate Stories for Different States

If a component has meaningful states, create dedicated stories:

```typescript
// stories/UI/Button.stories.tsx
export const Default: Story = { args: { variant: 'primary' } };
export const Pending: Story = { args: { variant: 'primary', loading: true } };
export const Success: Story = { args: { variant: 'primary', children: 'Saved!' } };
export const Rejected: Story = { args: { variant: 'danger', children: 'Failed' } };
```

**States that need separate stories:**

- `loading` / `pending`
- `success` / `completed`
- `error` / `rejected` / `failed`
- `empty` / `noData`
- `disabled` / `readonly`

### Small Story Pattern

For simple state variations, use small named exports:

```typescript
// stories/UI/StatusBadge.stories.tsx
export const Default: Story = { args: { status: 'default', children: 'Pending' } };
export const Pending: Story = { args: { status: 'pending', children: 'Pending' } };
export const Success: Story = { args: { status: 'success', children: 'Success' } };
export const Error: Story = { args: { status: 'error', children: 'Error' } };
```

### When NOT to Create Separate Stories

Use Storybook controls instead of separate stories:

- Different text content
- Different sizes (use controls)
- Different colors (use controls)

## Component Splitting Principles

### When to Split Components

| Scenario                  | Action   | Reason                 |
| ------------------------- | -------- | ---------------------- |
| > 200 lines               | ✅ Split | Single responsibility  |
| Multiple responsibilities | ✅ Split | Separate concerns      |
| Duplicate code            | ✅ Split | Extract common logic   |
| Simple props passing      | ❌ Wait  | Avoid over-engineering |

### Splitting Example

```tsx
// ❌ Wrong - Component with multiple responsibilities
export const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);

  useEffect(() => {
    fetchUser();
    fetchPosts();
    fetchFollowers();
  }, []);

  return (
    <div>
      <UserInfo user={user} />
      <UserPosts posts={posts} />
      <UserFollowers followers={followers} />
    </div>
  );
};

// ✅ Correct - Split into focused components
export const UserProfile: React.FC = () => (
  <div>
    <UserInfoSection />
    <UserPostsSection />
    <UserFollowersSection />
  </div>
);
```
