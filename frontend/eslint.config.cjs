/**
 * ESLint Configuration - Modern Flat Config
 * For typescript-eslint v8 + React 19
 */

const js = require('@eslint/js');
const pluginReact = require('eslint-plugin-react');
const pluginReactHooks = require('eslint-plugin-react-hooks');
const pluginReactRefresh = require('eslint-plugin-react-refresh');
const parserTypeScript = require('@typescript-eslint/parser');
const pluginTypeScript = require('@typescript-eslint/eslint-plugin');

module.exports = [
  // Ignore patterns
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      'build/',
      '*.js',
      '*.d.ts',
      '.eslintcache',
      'storybook-static/',
      '.storybook/*',
      'postcss.config.js',
      'playwright.config.ts',
      'vite.config.ts',
      'src/mocks/**',
      'src/test/**',
    ],
  },

  // JavaScript base rules
  {
    files: ['**/*.{js,jsx}'],
    ...js.configs.recommended,
  },

  // TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': pluginTypeScript,
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      'react-refresh': pluginReactRefresh,
    },
    languageOptions: {
      parser: parserTypeScript,
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
      react: { version: '19' },
    },
    rules: {
      // TypeScript ESLint - relaxed for development
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',

      // React - relaxed for development
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      'react/display-name': 'off',
      'react/no-children-prop': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',

      // JSX runtime (React 17+)
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',

      // Allow console
      'no-console': 'off',

      // Allow prop-types with TypeScript
      'react/prop-types': 'off',
    },
  },

  // Test files - relaxed rules
  {
    files: ['**/*.test.{ts,tsx}', '**/*.stories.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react/display-name': 'off',
    },
  },
];
