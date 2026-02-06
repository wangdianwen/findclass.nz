import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    root: __dirname,
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['node_modules'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    setupFiles: [path.resolve(__dirname, 'tests/integration/setup.integration.ts')],
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
