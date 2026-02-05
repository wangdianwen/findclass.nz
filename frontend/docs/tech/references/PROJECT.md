# Project Structure

## Directory Layout

```
src/
├── features/              # Feature-based modules
│   ├── feature-name/
│   │   ├── pages/
│   │   │   └── PageName/
│   │   ├── components/
│   │   └── index.ts
├── components/           # Shared components
│   ├── ui/              # Base UI (Button, Card, Modal)
│   ├── shared/          # Cross-feature components
│   └── layout/          # Layout components
├── pages/               # Root page routes
├── styles/              # Global styles
├── hooks/
├── services/
├── stores/
├── utils/
├── locales/             # i18n (en/, zh/)
├── types/
└── data/

stories/
├── features/           # Mirrors src/features/ structure
├── components/         # Shared components
└── ui/                # Base UI components
```

## Feature-Based Organization

### Why Features Directory?

Group related functionality by domain:

| Pattern | Reusable Location |
| ------- | ----------------- |
| Used in 2+ features | `components/shared/` |
| Used in 2+ sections | `components/ui/` |
| Used across many | `components/ui/` (base) |
| Page-specific | `pages/PageName/sections/` |

### When to Create a New Feature

Create a new feature folder when:
- Components are tightly coupled to a specific domain
- Pages share significant logic
- Components are only used within that feature

### When to Use Shared

Use shared components when:
- Components are used across 2+ features
- Components are generic (Header, Footer, Layout)
- Components are base UI elements (Button, Card)

## Component Deduplication

### When to Create Reusable Components

If you notice duplicate code, extract it:

```tsx
// ❌ Duplicate - CTA section in multiple pages
const CTASection = () => <div className="cta">...</div>;

// ✅ Extracted to shared component
export const CTASection = () => <div className="cta">...</div>;
```

### Deduplication Checklist

Before writing new code, check:
1. Is there a similar component already?
2. Can the logic be extracted to a hook?
3. Should styles be in a shared mixin?
4. Can utility functions be reused?

## Page Sections Pattern

Keep page `index.tsx` small:

```tsx
// ✅ Correct
export const HomePage = () => (
  <main>
    <HeroSection />
    <FeaturesSection />
  </main>
);
```

**Section structure:**
```
pages/PageName/sections/SectionName/
├── index.tsx
├── SectionName.module.scss
└── index.ts (optional)
```

## Barrel Exports

```typescript
// ✅ Correct
export { Button } from './Button';
export { HeroSection } from './HeroSection';

// Import like:
import { Button, HeroSection } from '@/components/ui';
```

## File Naming Conventions

| Category | Pattern | Example |
|----------|---------|---------|
| Component | PascalCase | `CourseCard.tsx` |
| Page | PascalCase | `HomePage.tsx` |
| Section | PascalCase | `HeroSection.tsx` |
| Hook | camelCase + 'use' | `useCity.ts` |
| Utility | camelCase | `formatDate.ts` |
| SCSS module | Same as component | `Button.module.scss` |
