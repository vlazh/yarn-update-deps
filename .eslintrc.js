/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: require.resolve('@js-toolkit/configs/eslint/common'),
  settings: {
    'import/core-modules': ['vscode'],
  },
};
