import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendSrc = path.resolve(__dirname, 'src');

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    root: '.',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      reportsDirectory: 'coverage',
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    projects: [
      {
        test: {
          include: ['tests/unit/**/*.test.ts'],
          setupFiles: ['tests/unit/setup.unit.ts'],
        },
        resolve: {
          alias: {
            '@src/': backendSrc,
            '@core/': path.join(backendSrc, 'core'),
            '@shared/': path.join(backendSrc, 'shared'),
            '@modules/': path.join(backendSrc, 'modules'),
            '@lambda/': path.join(backendSrc, 'lambda'),
            '@config/': path.join(backendSrc, 'config'),
          },
        },
        plugins: [tsconfigPaths()],
      },
      {
        test: {
          include: ['tests/integration/**/*.test.ts'],
          setupFiles: ['tests/integration/setup.integration.ts'],
        },
        plugins: [tsconfigPaths()],
      },
    ],
  },
});
