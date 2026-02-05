// MSW Mock Server Entry Point
// Import this file in main.tsx to enable mock API in development

// Only enable mock server in development
if (import.meta.env.DEV) {
  console.log('[MSW] Starting initialization...');
  // Dynamically import the worker to avoid affecting production build
  import('./browser')
    .then((module) => {
      console.log('[MSW] Browser module loaded successfully');
      if (typeof module.initMockServer === 'function') {
        module.initMockServer().then(() => {
          console.log('[MSW] Mock server initialized');
        }).catch((error) => {
          console.error('[MSW] Failed to initialize mock server:', error);
        });
      } else {
        console.warn('[MSW] initMockServer is not a function');
      }
    })
    .catch((error) => {
      console.error('[MSW] Failed to load browser module:', error);
    });
} else {
  console.log('[MSW] Not in DEV mode, skipping initialization');
}

// Re-export handlers for Storybook
export { handlers } from './handlers';
export { worker } from './browser';
