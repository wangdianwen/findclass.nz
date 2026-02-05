import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { typescriptRules, baseIgnorePatterns } from '../eslint.base.config.js';

export default [
  // Ignore patterns (extends base + frontend specific)
  {
    ignores: [
      ...baseIgnorePatterns,
      'dist',
      'node_modules',
      'storybook-static',
      '.storybook/*',
      'postcss.config.js',
      'playwright.config.ts',
      'vite.config.ts',
    ],
  },

  // JavaScript base config (non-TypeScript files)
  {
    files: ['**/*.{js,jsx}'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        browser: true,
        node: true,
      },
    },
  },

  // TypeScript files config
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        browser: true,
        es2022: true,
        node: true,
        React: 'writable',
      },
    },
    settings: {
      react: {
        version: '19',
      },
    },
    rules: {
      // Extend base TypeScript rules
      ...tseslint.configs.recommended.rules,
      ...typescriptRules,

      // React specific
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',

      // Frontend specific
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
