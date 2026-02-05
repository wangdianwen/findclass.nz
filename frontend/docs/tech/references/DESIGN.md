# Design System

Based on Ant Design with custom branding.

## Core Values

| Value      | Description                       |
| ---------- | --------------------------------- |
| Natural    | Intuitive, follows user intuition |
| Consistent | Predictable interactions          |
| Meaningful | Every element has purpose         |
| Scalable   | Reusable, extensible components   |

## Design Principles

| Principle           | Practice                                  |
| ------------------- | ----------------------------------------- |
| Proximity           | Group related content with `Space`        |
| Alignment           | Use Flexbox/Grid                          |
| Contrast            | Brand color `#0ea5e9` for primary actions |
| Consistency         | Reuse component patterns                  |
| Direct manipulation | Use Ant Design interactive components     |
| Feedback            | Loading, Message for responses            |

## Colors

```scss
// Primary
$color-primary: #0ea5e9;
$color-primary-hover: #0284c7;

// Semantic
$color-success: #22c55e;
$color-warning: #f59e0b;
$color-error: #ef4444;

// Text
$color-text-primary: #0f172a;
$color-text-secondary: #64748b;

// Other
$color-border: #e2e8f0;
$color-bg-secondary: #f8fafc;
```

## Spacing (8px Grid)

```scss
$spacing-1: 4px;
$spacing-2: 8px;
$spacing-3: 12px;
$spacing-4: 16px;
$spacing-6: 24px;
$spacing-8: 32px;
```

## Breakpoints

```scss
$breakpoint-sm: 576px;
$breakpoint-md: 768px;
$breakpoint-lg: 992px;
```

## Typography

```scss
$font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
$font-size-xs: 12px;
$font-size-sm: 14px;
$font-size-base: 16px;
$font-size-lg: 18px;
$font-size-xl: 20px;
```

## Border Radius

```scss
$radius-sm: 4px;
$radius-base: 8px;
$radius-lg: 12px;
$radius-full: 9999px;
```

## Transitions

```scss
$transition-fast: 150ms ease;
$transition-base: 300ms ease;
$transition-slow: 500ms ease;
```

## Trust Badge Levels (S/A/B/C/D)

```scss
// S level - gradient
$trust-s-gradient: linear-gradient(135deg, #fbbf24, #f59e0b);

// A level - green
$trust-a-bg: #dcfce7;
$trust-a-text: #166534;

// B level - blue
$trust-b-bg: #dbeafe;
$trust-b-text: #1e40af;

// C level - yellow
$trust-c-bg: #fef9c3;
$trust-c-text: #854d0e;

// D level - gray
$trust-d-bg: #f3f4f6;
$trust-d-text: #374151;
```

## Icons

Use Ant Design Icons - no emoji:

```tsx
// ✅ Correct
<StarOutlined style={{ color: '#f59e0b' }} />

// ❌ Wrong
<span>⭐</span>
```

## Accessibility

- Color contrast ≥ 4.5:1 (WCAG AA)
- Keyboard navigation support
- Focus states clearly visible
