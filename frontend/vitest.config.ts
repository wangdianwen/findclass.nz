import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  test: {
    projects: [
      {
        name: 'unit',
        resolve: {
          alias: {
            '@': path.resolve(dirname, './src'),
          },
        },
        test: {
          include: ['src/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          globals: true,
        },
      },
    ],
  },
});
