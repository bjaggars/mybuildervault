// Scoped lint gate: ONLY the two hook laws (LEARNINGS #18 — a conditional
// early return before a hook white-screens the whole app in production).
// Not a style linter; errors here are real crashes waiting to happen.
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    files: ['src/**/*.jsx', 'src/**/*.js'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',   // deliberate deps are annotated inline
    },
  },
];
