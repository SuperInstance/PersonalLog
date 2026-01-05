/**
 * Vitest Global Type Declarations
 *
 * Declares vitest globals for TypeScript to recognize.
 * These are imported in setup.ts but need explicit type declarations.
 */

// Simple global declarations - no complex types
declare var describe: any
declare var it: any
declare var test: any
declare var vi: any
declare var beforeEach: any
declare var afterEach: any
declare var beforeAll: any
declare var afterAll: any

// Reference jest-dom matchers for TypeScript
/// <reference types="@testing-library/jest-dom" />

// Extend jest matchers
declare namespace Vi {
  interface JestAssertion<T = any> extends jest.Matchers<void, T> {
    toBeInTheDocument(): T
  }
}

