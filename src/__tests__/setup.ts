/**
 * Vitest Test Setup
 *
 * Global setup for unit and integration tests.
 */

import { expect, beforeEach, vi } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

// Spec-compliant in-memory IndexedDB (indexedDB, IDBKeyRange, IDBRequest, ...).
// MUST come before any code that touches the database at import time.
// Replaces the previous hand-rolled IndexedDB mock, which was missing
// createIndex, never fired transaction.oncomplete, could not iterate cursors,
// and did not persist data between transactions — its callbacks threw inside
// setTimeout(0) slots, leaving never-settling promises that deadlocked every
// IndexedDB-backed test at the 10s hook timeout (see fix/test-env-deadlocks).
import 'fake-indexeddb/auto'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => {
      return Object.keys(store)[index] || null
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 16) as unknown as number
}

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id)
}

// crypto.subtle mock for SHA-256 checksums (keeps the rest of Node's crypto,
// e.g. randomUUID/getRandomValues, intact)
const realCrypto = global.crypto
Object.defineProperty(global, 'crypto', {
  value: {
    ...realCrypto,
    subtle: {
      digest: async (algorithm: string, data: Uint8Array) => {
        // Simple deterministic mock hash for testing
        const hash = new Uint8Array(32)
        for (let i = 0; i < 32; i++) {
          hash[i] = data[i % data.length] || 0
        }
        return hash.buffer
      },
    },
  },
  writable: true,
})

// Reset mocks before each test
beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})
