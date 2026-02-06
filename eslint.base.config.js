/**
 * Base ESLint Configuration - Strict TypeScript rules
 *
 * This file contains TypeScript-related rules for strict linting.
 * Each project should extend or reference these rules in their own eslint config.
 */

const typescriptRules = {
  // TypeScript specific - strict
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    },
  ],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/explicit-module-boundary-types': 'off',
  '@typescript-eslint/no-inferrable-types': 'off',
  '@typescript-eslint/no-namespace': 'off',
  '@typescript-eslint/no-empty-interface': 'off',
  '@typescript-eslint/ban-ts-comment': 'error',
  '@typescript-eslint/no-non-null-assertion': 'error',
  '@typescript-eslint/consistent-type-assertions': 'error',
  '@typescript-eslint/no-unnecessary-type-constraint': 'error',

  // Import sorting
  '@typescript-eslint/consistent-type-imports': 'warn',
  '@typescript-eslint/no-require-imports': 'error',

  // Function rules
  '@typescript-eslint/no-extraneous-class': 'error',
  '@typescript-eslint/no-misused-promises': 'error',

  // Array/object rules
  '@typescript-eslint/no-array-constructor': 'error',

  // Best practices
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/return-await': 'error',

  // Template expressions
  '@typescript-eslint/restrict-template-expressions': 'error',

  // Unsafe code
  '@typescript-eslint/no-unsafe-assignment': 'error',
  '@typescript-eslint/no-unsafe-call': 'error',
  '@typescript-eslint/no-unsafe-member-access': 'error',
  '@typescript-eslint/no-unsafe-return': 'error',
  '@typescript-eslint/no-unsafe-argument': 'error',
};

const baseIgnorePatterns = [
  'dist/',
  'node_modules/',
  'coverage/',
  'build/',
  '*.js',
  '*.d.ts',
  '.eslintcache',
];

module.exports = {
  typescriptRules,
  baseIgnorePatterns,
};
