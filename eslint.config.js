/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  ...require('@js-toolkit/configs/eslint/common'),

  {
    settings: {
      'import/core-modules': ['vscode'],
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
