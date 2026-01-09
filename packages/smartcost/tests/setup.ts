/**
 * Test Setup File
 *
 * Global test configuration and utilities
 */

import { vi } from 'vitest';

// Mock performance API for Node.js environment
global.performance = {
  ...global.performance,
  now: vi.fn(() => Date.now()),
} as Performance;

// Suppress console output during tests unless debugging
const originalConsole = global.console;

beforeEach(() => {
  // Restore console before each test
  global.console = originalConsole;
});

// Clean up mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
