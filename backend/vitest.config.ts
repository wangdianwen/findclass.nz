import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isIntegration = process.env.VITEST_INTEGRATION === 'true';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    root: __dirname,
    // Integration tests: only run integration tests
    // Unit tests: run all tests except integration
    include: isIntegration
      ? ['tests/integration/**/*.test.ts']
      : ['tests/unit/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: isIntegration ? ['node_modules'] : ['node_modules', 'tests/integration'],
    ...(isIntegration && {
      pool: 'forks',
      poolOptions: {
        forks: {
          singleFork: true,
        },
      },
      setupFiles: [path.resolve(__dirname, 'tests/integration/setup.integration.ts')],
    }),
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
