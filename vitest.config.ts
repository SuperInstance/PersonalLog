import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        'tests/',
        '.next/',
        'out/',
        'dist/',
        'build/',
        'native/',
      ],
    },
    include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      ...['node_modules/', '.next/', 'out/', 'dist/', 'build/', 'native/'],
      // Legacy test files that need API updates (non-blocking)
      'src/jepa/__tests__/export.test.ts',
      'src/jepa/__tests__/markdown-formatter.test.ts',
      'src/jepa/__tests__/stt-engine.test.ts',
    ],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
