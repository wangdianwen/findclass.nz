// Storybook MSW Worker Setup
// This file configures MSW for Storybook stories
// Note: msw-storybook-addon handles worker initialization automatically

import { handlers } from '../src/mocks/handlers';

// Re-export handlers for Storybook MSW addon
// The msw-storybook-addon will automatically pick up these handlers
export { handlers };

// Note: In Storybook 7+, MSW is configured via parameters.msw in preview.ts
// This file is kept for reference and potential custom usage
