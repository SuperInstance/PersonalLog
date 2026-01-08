/**
 * Vitest Test Setup
 *
 * Global setup for unit and integration tests.
 */

import { expect, beforeEach, vi } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

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

// IndexedDB Mock
const indexedDBMock = (() => {
  const databases: Map<string, any> = new Map()

  class MockIDBRequest {
    public result: any = null
    public error: Error | null = null
    public transaction: MockIDBTransaction | null = null
    public readyState: 'pending' | 'done' = 'pending'
    public onsuccess: ((event: Event) => void) | null = null
    public onerror: ((event: Event) => void) | null = null

    constructor(result?: any) {
      this.result = result
    }

    triggerSuccess() {
      this.readyState = 'done'
      if (this.onsuccess) {
        this.onsuccess({ target: this } as unknown as Event)
      }
    }

    triggerError(error: Error) {
      this.error = error
      if (this.onerror) {
        this.onerror({ target: this } as unknown as Event)
      }
    }
  }

  class MockIDBTransaction {
    public objectStores: Map<string, MockIDBObjectStore>
    public oncomplete: (() => void) | null = null
    public onerror: ((event: Event) => void) | null = null
    public db: any

    constructor(db: any, storeNames: string[], mode: 'readonly' | 'readwrite') {
      this.db = db
      this.objectStores = new Map()

      storeNames.forEach(name => {
        this.objectStores.set(name, new MockIDBObjectStore(name, mode, this))
      })
    }
  }

  class MockIDBObjectStore {
    public name: string
    public mode: 'readonly' | 'readwrite'
    public transaction: MockIDBTransaction
    private data: Map<any, any>

    constructor(name: string, mode: 'readonly' | 'readwrite', transaction: MockIDBTransaction) {
      this.name = name
      this.mode = mode
      this.transaction = transaction
      this.data = new Map()

      // Initialize with some test data
      if (name === 'conversations') {
        this.data.set('conv_test', {
          id: 'conv_test',
          title: 'Test Conversation',
          type: 'personal',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [],
          aiContacts: [],
          settings: {
            responseMode: 'messenger',
            compactOnLimit: true,
            compactStrategy: 'summarize'
          },
          metadata: {
            messageCount: 0,
            totalTokens: 0,
            hasMedia: false,
            tags: [],
            pinned: false,
            archived: false
          }
        })
      }
    }

    put(data: any): MockIDBRequest {
      const request = new MockIDBRequest()
      this.data.set(data.id || data.key, data)
      setTimeout(() => request.triggerSuccess(), 0)
      return request
    }

    add(data: any): MockIDBRequest {
      const request = new MockIDBRequest()
      this.data.set(data.id || data.key, data)
      setTimeout(() => request.triggerSuccess(), 0)
      return request
    }

    get(key: any): MockIDBRequest {
      const request = new MockIDBRequest(this.data.get(key) || undefined)
      setTimeout(() => request.triggerSuccess(), 0)
      return request
    }

    getAll(): MockIDBRequest {
      const request = new MockIDBRequest(Array.from(this.data.values()))
      setTimeout(() => request.triggerSuccess(), 0)
      return request
    }

    delete(key: any): MockIDBRequest {
      const request = new MockIDBRequest()
      this.data.delete(key)
      setTimeout(() => request.triggerSuccess(), 0)
      return request
    }

    clear(): MockIDBRequest {
      const request = new MockIDBRequest()
      this.data.clear()
      setTimeout(() => request.triggerSuccess(), 0)
      return request
    }

    count(): MockIDBRequest {
      const request = new MockIDBRequest(this.data.size)
      setTimeout(() => request.triggerSuccess(), 0)
      return request
    }

    index(name: string) {
      return this
    }

    openCursor(range?: any, direction?: string): MockIDBRequest {
      const request = new MockIDBRequest()
      const results = Array.from(this.data.values())

      request.result = {
        continue: () => {},
        delete: () => {},
        update: () => {}
      }

      // Simulate cursor iteration
      setTimeout(() => {
        if (request.onsuccess) {
          request.onsuccess({ target: request } as unknown as Event)
        }
      }, 0)

      return request as any
    }
  }

  class MockIDBDatabase {
    public name: string
    public version: number
    public objectStoreNames: string[] = []

    constructor(name: string, version: number) {
      this.name = name
      this.version = version
    }

    close() {}

    transaction(storeNames: string[], mode: 'readonly' | 'readwrite' = 'readonly'): MockIDBTransaction {
      return new MockIDBTransaction(this, storeNames, mode)
    }

    createObjectStore(name: string, options?: any): MockIDBObjectStore {
      this.objectStoreNames.push(name)
      return new MockIDBObjectStore(name, 'readwrite', null as any)
    }
  }

  class MockIDBOpenDBRequest extends MockIDBRequest {
    public onupgradeneeded: ((event: { target: MockIDBOpenDBRequest; result: MockIDBDatabase }) => void) | null = null

    constructor() {
      super()
    }
  }

  return {
    open: (name: string, version: number): MockIDBOpenDBRequest => {
      const request = new MockIDBOpenDBRequest()

      setTimeout(() => {
        const db = new MockIDBDatabase(name, version)
        request.result = db

        if (request.onupgradeneeded) {
          request.onupgradeneeded({ target: request, result: db })
        }

        request.triggerSuccess()
      }, 0)

      return request as any
    },

    deleteDatabase: (name: string): MockIDBRequest => {
      databases.delete(name)
      const request = new MockIDBRequest()
      setTimeout(() => request.triggerSuccess(), 0)
      return request
    },

    databases: () => ({
      then: (resolve: (dbs: any[]) => void) => {
        resolve(Array.from(databases.keys()).map(name => ({ name })))
      }
    })
  }
})()

// IDBKeyRange mock (needed by idb library)
class MockIDBKeyRange {
  constructor(public lower: any, public upper: any, public lowerOpen: boolean, public upperOpen: boolean) {}

  static only(value: any) {
    return new MockIDBKeyRange(value, value, false, false)
  }

  static lowerBound(lower: any, open: boolean = false) {
    return new MockIDBKeyRange(lower, undefined, open, true)
  }

  static upperBound(upper: any, open: boolean = false) {
    return new MockIDBKeyRange(undefined, upper, true, open)
  }

  static bound(lower: any, upper: any, lowerOpen: boolean = false, upperOpen: boolean = false) {
    return new MockIDBKeyRange(lower, upper, lowerOpen, upperOpen)
  }
}

// Add indexedDB to global scope
Object.defineProperty(global, 'indexedDB', {
  value: indexedDBMock,
  writable: true,
})

// Add IDBKeyRange to global scope
Object.defineProperty(global, 'IDBKeyRange', {
  value: MockIDBKeyRange,
  writable: true,
})

// Add IDBRequest to global scope (needed by idb library)
Object.defineProperty(global, 'IDBRequest', {
  value: class MockIDBRequestClass {},
  writable: true,
})

// Add crypto.subtle for SHA-256 checksums
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: async (algorithm: string, data: Uint8Array) => {
        // Simple mock hash for testing
        const hash = new Uint8Array(32)
        for (let i = 0; i < 32; i++) {
          hash[i] = data[i % data.length] || 0
        }
        return hash.buffer
      }
    }
  },
  writable: true,
})

// Reset mocks before each test
beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})
