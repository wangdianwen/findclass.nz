/**
 * Base ESLint Configuration - Common rules for TypeScript projects
 *
 * This file contains TypeScript-related rules that apply to both backend and frontend.
 * Each project should extend or reference these rules in their own eslint config.
 */

export const typescriptRules = {
  // TypeScript specific
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    },
  ],
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/explicit-module-boundary-types': 'off',
  '@typescript-eslint/no-inferrable-types': 'off',
  '@typescript-eslint/no-namespace': 'off',
  '@typescript-eslint/no-empty-interface': 'off',
  '@typescript-eslint/ban-ts-comment': 'off',
  '@typescript-eslint/ban-types': 'off',
  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/consistent-type-assertions': 'error',
  '@typescript-eslint/no-unnecessary-type-constraint': 'error',

  // Import sorting (can be handled by prettier, but eslint helps too)
  '@typescript-eslint/consistent-type-imports': 'warn',
  '@typescript-eslint/no-require-imports': 'warn',
};

export const baseIgnorePatterns = [
  'dist/',
  'node_modules/',
  'coverage/',
  'build/',
  '*.js',
  '*.d.ts',
  '.eslintcache',
];
