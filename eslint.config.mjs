import nextConfig from 'eslint-config-next';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nextConfig,
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Baseline: disable rules with widespread pre-existing violations.
      // These should be re-enabled incrementally as the code is cleaned up.
      'react-hooks/error-boundaries': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/static-components': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      // Playwright fixtures use a parameter named `use`, which this rule
      // mistakes for a React Hook.
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    ignores: [
      '.next/',
      'node_modules/',
      'out/',
      'dist/',
      'build/',
      'native/rust/pkg/',
      'native/rust/target/',
      'docs/**',
      'packages/**',
      'examples/**',
      'coverage/',
      '*.config.js',
      '*.config.mjs',
      '*.config.ts',
    ],
  },
];
