const { typescriptRules, baseIgnorePatterns } = require('../eslint.base.config.js');
const path = require('path');

module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: path.join(__dirname, 'tsconfig.json'),
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    ...typescriptRules,
    'prettier/prettier': 'error',

    // Node.js best practices
    'no-console': 'warn',

    // Best practices
    'no-alert': 'error',
    'no-debugger': 'error',

    // Relax rules for test files
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/no-redundant-type-constituents': 'off',
    '@typescript-eslint/no-unnecessary-condition': 'off',
    '@typescript-eslint/no-unnecessary-optional-chain': 'off',
    '@typescript-eslint/only-throw-error': 'off',
  },
  ignorePatterns: [...baseIgnorePatterns, 'src/lambda/bundle.js', 'scripts/**/*', 'tests/**/*.ts'],
};
