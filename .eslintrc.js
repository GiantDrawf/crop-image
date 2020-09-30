module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es6: true,
    // "jquery": true
    jest: true,
    'jsx-control-statements/jsx-control-statements': true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
      experimentalObjectRestSpread: true
    }
  },
  globals: {
    // "wx": "readonly",
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:jsx-control-statements/recommended',
    'prettier'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'jsx-control-statements',
    'prettier'
  ],
  rules: {
    'no-extra-semi': 0,
    quotes: ['error', 'single'],
    'no-unused-vars': 0,
    'jsx-control-statements/jsx-use-if-tag': 0,
    'prettier/prettier': 2
  }
};
