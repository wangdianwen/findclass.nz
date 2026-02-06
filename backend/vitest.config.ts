import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isIntegration = process.env.INTEGRATION_TESTS === 'true';
const isPostgresIntegration = process.env.POSTGRES_INTEGRATION_TESTS === 'true';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    root: __dirname,
    include: isIntegration
      ? isPostgresIntegration
        ? ['tests/integration/**/*.postgres.test.ts']
        : ['tests/integration/**/*.test.ts']
      : ['tests/unit/**/*.test.ts'],
    exclude: ['node_modules'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    setupFiles: [
      isIntegration
        ? isPostgresIntegration
          ? path.resolve(__dirname, 'tests/integration/setup.postgres.ts')
          : path.resolve(__dirname, 'tests/integration/setup.integration.ts')
        : path.resolve(__dirname, 'tests/unit/setup.unit.ts'),
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
      reportsDirectory: 'coverage',
    },
  },
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@modules': path.resolve(__dirname, 'src/modules'),
      '@lambda': path.resolve(__dirname, 'src/lambda'),
      '@config': path.resolve(__dirname, 'src/config'),
    },
  },
  plugins: [tsconfigPaths()],
});
