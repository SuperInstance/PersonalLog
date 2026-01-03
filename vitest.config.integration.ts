/**
 * Vitest Configuration for Integration Tests
 * @see https://vitest.dev/config/
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/__tests__/integration/**/*.{test,spec}.{ts,tsx}'],
    testTimeout: 30000, // Longer timeout for integration tests
    maxConcurrency: 1, // Run integration tests serially
    teardownTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
