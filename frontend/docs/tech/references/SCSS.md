# SCSS Guidelines

## File Naming

```scss
// ✅ Correct
Button.module.scss
CourseCard.module.scss
TrustBadge.module.scss

// ❌ Wrong
styles.module.scss
common.module.scss
```

## Nesting Limit

Maximum 3 levels:

```scss
// ✅ Correct
.card {
  &-header {
    title {
      icon {
        // Level 3 - MAX
        // OK
      }
    }
  }
}
```

## Pseudo-elements

```scss
// ✅ Correct
.element {
  &::before {
    content: '';
    // ...
  }
}

// ❌ Wrong
.element:before { ... }
```

## Import Global Variables

### Page-level components (in `src/pages/PageName/`):

```scss
@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;
```

### Nested components (in `src/pages/PageName/components/ComponentName/`):

```scss
@use '../../../../styles/variables' as *;
@use '../../../../styles/mixins' as *;
```

### Deeply nested components (in `src/pages/PageName/components/Nested/ComponentName/`):

```scss
@use '../../../../../styles/variables' as *;
@use '../../../../../styles/mixins' as *;
```

### Quick Reference - Levels of nesting:

| Component Location                   | Path to styles        |
| ------------------------------------ | --------------------- |
| `src/pages/Component/`               | `../../styles/`       |
| `src/pages/Parent/Child/`            | `../../../styles/`    |
| `src/pages/Parent/Child/Grandchild/` | `../../../../styles/` |
| `src/components/ui/Component/`       | `../../../styles/`    |

## Class Naming

```scss
// Use kebab-case
.button-primary { ... }
.course-card { ... }
```

## Example Component SCSS

```scss
@use '../../../styles/variables' as *;
@use '../../../styles/mixins' as *;

.button {
  @include flex-center;
  border-radius: $radius-lg;
  font-weight: $font-weight-medium;
  transition: all $transition-fast;

  &.primary {
    background-color: $color-primary;
    &:hover {
      background-color: $color-primary-hover;
    }
  }

  &.secondary {
    background-color: $color-bg-secondary;
    color: $color-text-primary;
  }

  &.sm {
    padding: $spacing-2 $spacing-3;
  }
  &.md {
    padding: $spacing-3 $spacing-6;
  }
  &.lg {
    padding: $spacing-4 $spacing-8;
  }
}
```

## Forbidden

| Forbidden            | Reason            |
| -------------------- | ----------------- |
| `styles.module.scss` | Generic name      |
| Nesting > 3 levels   | Maintainability   |
| Hardcoded colors     | Use design tokens |
| `element { ... }`    | Always use class  |

## Design Variables

```scss
// Colors
$color-primary: #0ea5e9;
$color-primary-hover: #0284c7;
$color-success: #22c55e;
$color-warning: #f59e0b;
$color-error: #ef4444;
$color-text-primary: #0f172a;
$color-text-secondary: #64748b;
$color-border: #e2e8f0;

// Spacing (8px grid)
$spacing-1: 4px;
$spacing-2: 8px;
$spacing-3: 12px;
$spacing-4: 16px;
$spacing-6: 24px;
$spacing-8: 32px;

// Breakpoints
$breakpoint-sm: 576px;
$breakpoint-md: 768px;
$breakpoint-lg: 992px;
$breakpoint-xl: 1200px;

// Border radius
$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-full: 9999px;

// Transitions
$transition-fast: 0.15s ease;
$transition-base: 0.2s ease;
$transition-slow: 0.3s ease;
```

## Mixins

```scss
@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;

.card {
  @include card-base;
  @include flex-center;
  @include truncate;
}

.truncated-text {
  @include line-clamp(3);
}
```

## Responsive Breakpoints

```scss
.card {
  padding: $spacing-6;

  @include tablet {
    padding: $spacing-4;
  }

  @include mobile {
    padding: $spacing-3;
  }
}
```
