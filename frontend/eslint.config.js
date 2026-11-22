import { dateSlicingRule } from '../date-lint-rule.mjs';

export default [
  { ignores: ['dist/**'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: { 'no-restricted-syntax': dateSlicingRule },
  },
];
