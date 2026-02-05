const { typescriptRules, baseIgnorePatterns } = require('../eslint.base.config.js');

module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    ...typescriptRules,
    'prettier/prettier': 'error',
  },
  ignorePatterns: [...baseIgnorePatterns, 'src/lambda/bundle.js'],
};
